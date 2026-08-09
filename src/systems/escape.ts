/**
 * L'évasion, branchée sur la simulation — et ce qu'elle coûte ensuite.
 *
 * Trois idées structurent ce fichier.
 *
 * **On ne s'évade pas sur un coup de tête.** Une tentative sans préparation
 * est perdue d'avance, et c'est dit avant de cliquer. Préparer prend des
 * années : chaque préparatif consomme une action de détention, apporte
 * quelque chose de précis au mini-jeu, et fait monter ce que la direction
 * soupçonne. C'est un compte à rebours dans les deux sens.
 *
 * **Sortir n'est pas la fin.** Franchir le périmètre ouvre une course
 * (`chase`, décor prison), exactement comme un cambriolage qui tourne mal.
 * Le mini-jeu de fuite n'a jamais été rattaché à un délit, mais à un moment.
 *
 * **Être dehors n'est pas être libre.** La cavale est un état durable :
 * pas d'emploi déclaré, pas de crédit, une reprise possible chaque année,
 * des proches qui s'éloignent. Elle se termine de trois façons — repris,
 * rendu, ou prescrit après très longtemps.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { peopleByRelation } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import type { MiniGameContext, MiniGameResult } from '../engine/minigame.ts';
import { autoResolve, blend, miniGameContext } from '../engine/minigame.ts';
import type { EscapeOutcome, EscapeSetup } from './minigames/escape.ts';
import type { ChaseSetup } from './minigames/chase.ts';
import { fire } from './careers.ts';

/* ------------------------------------------------------------------ */
/* Se préparer                                                         */
/* ------------------------------------------------------------------ */

/**
 * Un préparatif.
 *
 * Tout est délibérément abstrait : « observer », « s'entendre avec
 * quelqu'un », « faire en sorte qu'on regarde ailleurs ». Aucune de ces
 * lignes ne décrit un procédé, et aucune n'est transposable.
 */
export interface Preparation {
  id: string;
  label: string;
  emoji: string;
  hint: string;
  /** Ce que ça apporte au plan, 0-100. */
  gain: number;
  /** Ce que ça éveille, 0-100. */
  risk: number;
  /** Pourquoi c'est indisponible, le cas échéant. */
  blocker?: (state: GameState) => string | null;
}

export const PREPARATIONS: Preparation[] = [
  {
    id: 'observe',
    label: 'Observer les rondes',
    emoji: '👁️',
    hint: 'Longtemps, sans rien faire d’autre. Le plus sûr, et le plus lent.',
    gain: 16,
    risk: 3,
  },
  {
    id: 'ally',
    label: 'S’entendre avec quelqu’un',
    emoji: '🤝',
    hint: 'Il faut d’abord qu’on te respecte, sinon la conversation se répète ailleurs',
    gain: 22,
    risk: 12,
    blocker: (state) => {
      const prison = state.player.prison;
      if (prison && prison.respect < 45) return 'Personne ne te parlerait de ça.';
      if (peopleByRelation(state, ['inmate']).length === 0) {
        return 'Tu ne connais personne ici.';
      }
      return null;
    },
  },
  {
    id: 'trade',
    label: 'Échanger des services',
    emoji: '🎟️',
    hint: 'Ce qui circule ici ne s’achète pas avec de l’argent',
    gain: 20,
    risk: 16,
    blocker: (state) => (state.player.prison && state.player.prison.behavior > 80
      ? 'Tu es bien trop en vue pour ce genre d’arrangement.'
      : null),
  },
  {
    id: 'diversion',
    label: 'Faire regarder ailleurs',
    emoji: '🎭',
    hint: 'Il faut quelqu’un dans la confidence pour que ça tienne',
    gain: 26,
    risk: 22,
    blocker: (state) => {
      const prison = state.player.prison;
      if (!prison?.prepared.includes('ally')) return 'Tout seul, ça ne trompe personne.';
      return null;
    },
  },
];

export function preparationBlocker(state: GameState, prep: Preparation): string | null {
  const prison = state.player.prison;
  if (!prison) return 'Tu n’es pas en détention.';
  if (prison.prepared.includes(prep.id)) return 'C’est déjà fait.';
  if (Number(state.player.yearActions.prisonActions ?? 0) >= 2) {
    return 'Tu as déjà occupé ton temps ainsi cette année.';
  }
  return prep.blocker?.(state) ?? null;
}

/**
 * Prépare quelque chose.
 *
 * Le résultat n'est pas acquis : un préparatif peut échouer, et un échec
 * coûte plus cher en méfiance qu'une réussite ne rapporte de plan.
 */
export function prepareEscape(ctx: Ctx, prepId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  const prep = PREPARATIONS.find((x) => x.id === prepId);
  if (!prison || !prep) return { ok: false, message: 'Rien à préparer.' };
  const blocker = preparationBlocker(state, prep);
  if (blocker) return { ok: false, title: prep.label, message: blocker };

  p.yearActions.prisonActions = Number(p.yearActions.prisonActions ?? 0) + 1;
  prison.prepared.push(prep.id);

  // Discret veut dire : personne ne comprend ce que tu fabriques. Cela tient
  // au sang-froid autant qu'à la place qu'on occupe parmi les autres.
  const discretion = 0.35
    + p.psyche.emotion.stability / 320
    + prison.respect / 400
    + p.stats.intelligence / 400;

  if (rng.chance(discretion)) {
    prison.escapePlan = clampStat(prison.escapePlan + prep.gain);
    prison.suspicion = clampStat(prison.suspicion + prep.risk * 0.4);
    return {
      ok: true, title: prep.label, tone: 'good',
      message: `${prep.hint.split(',')[0]}. Personne n’a rien remarqué.`,
    };
  }

  prison.suspicion = clampStat(prison.suspicion + prep.risk);
  prison.escapePlan = clampStat(prison.escapePlan + prep.gain * 0.3);
  prison.behavior = clampStat(prison.behavior - 6);
  return {
    ok: true, title: prep.label, tone: 'bad',
    message: 'Quelqu’un a vu quelque chose. Rien de prouvé, mais on te regarde autrement.',
  };
}

/* ------------------------------------------------------------------ */
/* Tenter                                                              */
/* ------------------------------------------------------------------ */

export function escapeBlocker(state: GameState): string | null {
  const p = state.player;
  if (!p.prison) return 'Tu n’es pas en détention.';
  if (p.yearActions.escape) return 'Une tentative par an suffit largement.';
  if (p.prison.yearsLeft <= 1) {
    return 'Il te reste moins d’un an. Ce serait absurde.';
  }
  return null;
}

/**
 * L'avertissement affiché avant de tenter, quand la préparation est mince.
 *
 * Ce n'est pas un blocage : le joueur a le droit de tenter n'importe quoi.
 * Mais il doit savoir ce qu'il fait, sinon l'échec ressemble à une injustice.
 */
export function escapeWarning(state: GameState): string | null {
  const prison = state.player.prison;
  if (!prison) return null;
  if (prison.escapePlan < 25) {
    return 'Tu n’as rien préparé. La cour est grande et ils sont nombreux.';
  }
  if (prison.suspicion > 55) {
    return 'On te surveille déjà. Ce n’est pas le bon moment.';
  }
  return null;
}

export function escapeSetup(state: GameState): EscapeSetup {
  const prison = state.player.prison;
  return {
    security: prison?.security ?? 'medium',
    plan: prison?.escapePlan ?? 0,
    suspicion: prison?.suspicion ?? 0,
  };
}

export function escapeContext(state: GameState): MiniGameContext {
  const p = state.player;
  // S'évader tient au sang-froid et à la patience bien plus qu'à la force.
  const skill = p.psyche.emotion.stability * 0.35
    + p.stats.intelligence * 0.25
    + p.stats.fitness * 0.2
    + p.stats.criminality * 0.2;
  const setup = escapeSetup(state);
  // La préparation entre ici *et* dans le mini-jeu, et il faut les deux.
  // Sans cette ligne, « Laisser faire » ignorait purement et simplement les
  // années passées à préparer : le joueur qui ne voulait pas jouer le trajet
  // n'aurait rien retiré de ce qu'il avait mis en place.
  const difficulty = Math.max(15, Math.min(95,
    (setup.security === 'maximum' ? 78 : setup.security === 'medium' ? 60 : 42)
    + setup.suspicion / 5
    - setup.plan / 2.5));
  return miniGameContext({ skill, difficulty, setup });
}

/**
 * Ce que devient une tentative.
 *
 * Sortir du périmètre n'est pas s'évader : il reste la course, que l'appelant
 * enchaîne s'il le peut. Comme pour le cambriolage, le système dit qu'une
 * course est due, il ne décide pas de l'interface.
 */
export function resolveEscapeAttempt(ctx: Ctx, opts: {
  outcome: EscapeOutcome;
  result: MiniGameResult;
  context: MiniGameContext;
}): ActionResult & { chase?: ChaseSetup } {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return { ok: false, message: 'Tu n’es pas en détention.' };

  p.yearActions.escape = 1;
  p.stats.stress = clampStat(p.stats.stress + 20);
  const mastery = blend(opts.context, opts.result);

  /* --- Repris à l'intérieur --- */
  if (opts.outcome !== 'dehors') {
    const extra = opts.outcome === 'appel' ? rng.int(1, 3) : rng.int(2, 5);
    prison.yearsLeft += extra;
    prison.totalSentence += extra;
    prison.behavior = clampStat(prison.behavior - 35);
    prison.suspicion = clampStat(prison.suspicion + 40);
    prison.escapePlan = Math.round(prison.escapePlan * 0.2);
    prison.prepared = [];
    prison.security = prison.security === 'minimum' ? 'medium' : 'maximum';
    p.stats.health = clampStat(p.stats.health - rng.int(4, 14));
    ctx.log('crime', `Tentative d’évasion manquée : ${extra} an(s) de plus.`, 'bad');
    return {
      ok: true,
      title: opts.outcome === 'appel' ? 'L’appel' : 'Repéré',
      tone: 'bad',
      message: opts.outcome === 'appel'
        ? `Tu n’es pas allé assez vite. Une cellule vide à l’appel, et tout le monde sait qui manque. ${extra} an(s) de plus, et un régime plus strict.`
        : `Une torche, une voix, et tout s’arrête là. ${extra} an(s) de plus, et un régime plus strict.`,
    };
  }

  /* --- Dehors, mais pas encore loin --- */
  // Bien joué jusque-là, on a de l'avance ; sinon ils sont déjà derrière.
  const pursuers = prison.security === 'maximum' ? 3 : prison.security === 'medium' ? 2 : 1;
  return {
    ok: true, title: 'De l’autre côté', tone: 'neutral',
    message: 'Le périmètre est derrière toi. Ce n’est pas fini : il faut être loin avant le prochain comptage.',
    chase: {
      place: 'prison',
      pursuers,
      speed: 3.3 + (1 - mastery) * 0.6,
    },
  };
}

/**
 * Ce qui arrive au bout de la course d'évasion.
 *
 * Séparé de `resolveEscape` (les délits) parce que les conséquences n'ont
 * rien à voir : ici il n'y a pas de procès, il y a une peine qui reprend.
 */
export function resolveEscapeChase(ctx: Ctx, escaped: boolean): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return { ok: false, message: 'Tu n’es plus en détention.' };

  if (!escaped) {
    const extra = rng.int(3, 6);
    prison.yearsLeft += extra;
    prison.totalSentence += extra;
    prison.behavior = clampStat(prison.behavior - 45);
    prison.security = 'maximum';
    prison.suspicion = 100;
    prison.escapePlan = 0;
    prison.prepared = [];
    p.stats.health = clampStat(p.stats.health - rng.int(8, 20));
    ctx.log('crime', `Repris après une évasion : ${extra} ans de plus, régime maximum.`, 'bad');
    return {
      ok: true, title: 'Repris', tone: 'bad',
      message: `Ils étaient plus rapides. Tu rentres avec ${extra} ans de plus et le régime le plus strict.`,
    };
  }

  goOnTheRun(ctx);
  return {
    ok: true, title: 'Dehors', tone: 'neutral',
    message: 'Le bruit derrière toi s’éteint. Tu es libre au sens le plus étroit du terme : personne ne te tient, et personne ne peut plus t’employer.',
  };
}

/** Passe le personnage en cavale. Utilisable par tout ce qui la déclenche. */
export function goOnTheRun(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const prison = p.prison;

  p.criminalRecord.escapedFrom = prison
    ? { facilityName: prison.facilityName, yearsLeft: prison.yearsLeft }
    : null;
  p.prison = null;
  p.criminalRecord.wanted = true;
  p.criminalRecord.wantedSince = state.year;
  p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 30);
  p.stats.criminality = clampStat(p.stats.criminality + 15);
  p.stats.stress = clampStat(p.stats.stress + 25);
  ctx.log('crime', 'Tu t’es évadé. Tu es désormais recherché.', 'neutral');

  // Les codétenus restent à l'intérieur : ils ne sont plus rien pour toi.
  for (const inmate of peopleByRelation(state, ['inmate'])) {
    inmate.relation = 'acquaintance';
  }
}

/** Résolution automatique, pour qui ne veut pas jouer. */
export function autoEscape(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const context = escapeContext(state);
  const result = autoResolve(rng, context);
  const outcome: EscapeOutcome = result.quality > 0.62 ? 'dehors'
    : result.quality > 0.35 ? 'appel' : 'repéré';

  const attempt = resolveEscapeAttempt(ctx, { outcome, result, context });
  if (!attempt.chase) return attempt;

  const chase = autoResolve(rng, context);
  const after = resolveEscapeChase(ctx, chase.success);
  return { ...after, message: `${attempt.message} ${after.message}` };
}

/* ------------------------------------------------------------------ */
/* La cavale                                                           */
/* ------------------------------------------------------------------ */

/** Depuis combien d'années le personnage est-il en fuite ? */
export function yearsOnTheRun(state: GameState): number {
  const since = state.player.criminalRecord.wantedSince;
  return since === null ? 0 : Math.max(0, state.year - since);
}

/**
 * Se rendre.
 *
 * C'est presque toujours le bon choix, et c'est pour ça qu'il faut qu'il
 * existe : une cavale sans issue serait une impasse déguisée en liberté.
 */
export function surrender(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (!p.criminalRecord.wanted) return { ok: false, message: 'Tu n’es pas recherché.' };

  const owed = p.criminalRecord.escapedFrom?.yearsLeft ?? 3;
  const years = Math.max(1, Math.round(owed + 1 - yearsOnTheRun(state) * 0.15));
  p.prison = {
    yearsLeft: years,
    totalSentence: years,
    security: 'medium',
    behavior: 65,
    respect: 30,
    paroleDenials: 0,
    facilityName: p.criminalRecord.escapedFrom?.facilityName ?? 'Centre de détention',
    escapePlan: 0,
    suspicion: 30,
    prepared: [],
  };
  clearWanted(ctx);
  p.stats.stress = clampStat(p.stats.stress - 30);
  ctx.log('justice', 'Tu t’es rendu.', 'neutral');
  return {
    ok: true, title: 'Rendu', tone: 'neutral',
    message: `Tu te présentes de toi-même. Le tribunal en tient compte : ${years} an${years > 1 ? 's' : ''}, et l’affaire est close.`,
  };
}

function clearWanted(ctx: Ctx): void {
  const p = ctx.state.player;
  p.criminalRecord.wanted = false;
  p.criminalRecord.wantedSince = null;
  p.criminalRecord.escapedFrom = null;
}

/**
 * Une année de cavale.
 *
 * Trois choses s'y jouent : le risque d'être repris, l'usure, et la
 * prescription. Le risque décroît avec le temps — on cesse d'être une
 * priorité — mais il ne tombe jamais à zéro avant très longtemps.
 */
export function advanceFugitive(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.criminalRecord.wanted || p.prison) return;

  const years = yearsOnTheRun(state);

  // Vivre caché coûte : pas d'emploi déclaré, pas de tranquillité.
  if (p.job) fire(ctx, 'situation irrégulière');
  p.stats.stress = clampStat(p.stats.stress + 6);
  p.stats.happiness = clampStat(p.stats.happiness - 4);
  p.stats.reputation = clampStat(p.stats.reputation - 3);

  // Les proches s'éloignent : on ne donne pas de nouvelles quand on se cache.
  if (rng.chance(0.3)) {
    const close = peopleByRelation(state, ['friend', 'bestFriend', 'partner', 'spouse', 'brother', 'sister']);
    const someone = close[Math.floor(rng.next() * close.length)];
    if (someone) {
      someone.relationship = clampStat(someone.relationship - rng.int(5, 14));
    }
  }

  // Repris : très probable la première année, de moins en moins ensuite.
  const risk = Math.max(0.03, 0.34 * Math.exp(-years / 4))
    * (1 + p.criminalRecord.notoriety / 220)
    * (1 - p.stats.intelligence / 350);
  if (rng.chance(risk)) {
    const owed = p.criminalRecord.escapedFrom?.yearsLeft ?? 3;
    const years2 = Math.max(2, Math.round(owed + rng.int(2, 5)));
    p.prison = {
      yearsLeft: years2,
      totalSentence: years2,
      security: 'maximum',
      behavior: 35,
      respect: 40,
      paroleDenials: 1,
      facilityName: p.criminalRecord.escapedFrom?.facilityName ?? 'Centre de détention',
      escapePlan: 0,
      suspicion: 90,
      prepared: [],
    };
    clearWanted(ctx);
    ctx.log('justice', `Ta cavale s’arrête ici : ${years2} ans, régime maximum.`, 'bad');
    return;
  }

  // La prescription : au bout d'une vie entière, on cesse d'être cherché.
  if (years >= 20 && rng.chance(0.25)) {
    clearWanted(ctx);
    p.stats.stress = clampStat(p.stats.stress - 25);
    ctx.log('justice', 'Plus personne ne te cherche. C’était il y a une vie.', 'good');
    return;
  }

  if (years === 1) {
    ctx.log('crime', 'Une année entière sans papiers, sans adresse, sans nom.', 'neutral');
  }
}
