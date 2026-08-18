/**
 * La dépendance, et comment on en sort.
 *
 * Mesuré sur soixante vies qui font ce que le jeu propose — cinq passages à
 * la table par an, ce que le moteur autorise :
 *
 *     pic de dépendance : médiane 100 · maximum 100
 *     franchit 65 (la mort peut la nommer) : 100 % des vies
 *     ce qui redescend tout seul : 1,21 point par an
 *     ce qu'on peut faire pour en sortir : rien
 *
 * Le jeu savait donc faire tomber quelqu'un et ne savait pas le relever. Ce
 * fichier ajoute la remontée, et trois choses la gouvernent.
 *
 * **1. Ça se décide.** Quatre façons d'arrêter, du plus gratuit au plus cher,
 * et le même arbitrage partout : ce qui ne coûte rien ne tient rien.
 *
 * **2. Ça ne tient pas tout seul.** Chaque année dans un programme se joue :
 * le stress pousse, la rigueur retient, et **retourner jouer double la
 * pression**. Une rechute ne remet pas tout, mais elle remet.
 *
 * **3. Le dire compte.** Quelqu'un au courant réduit la rechute d'un cinquième
 * — et il faut choisir à qui. Quelqu'un de chaleureux le prend bien ; quelqu'un
 * de distant s'éloigne. Le joueur ne sait qui est qui que s'il a pris la peine
 * de le découvrir (`systems/dates.ts`), ce qui donne enfin un prix à connaître
 * ses proches.
 *
 * Rien ici ne nomme de substance ni ne décrit quoi que ce soit d'applicable au
 * monde réel : la dépendance du jeu est un nombre que le jeu fait monter, et
 * ce qui est décrit ce sont des façons d'en sortir.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, peopleByRelation } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  CLEAN_YEARS, DEEP, DISCIPLINE_HELPS, GRIP, HELD_DRIFT, PROGRAMS,
  RELAPSE_BASE, RELAPSE_COST, STRESS_WEIGHT, TELL_BOND, TELL_COLD, TELL_WARM,
  TEMPTED, WITNESS_HELPS, getProgram, type Program,
} from '../data/recovery.ts';
import { formatMoney, getCountry } from '../data/countries.ts';
import { noteHistory } from './npc.ts';
import { learn } from './dates.ts';

export { CLEAN_YEARS, DEEP, GRIP, PROGRAMS, getProgram };
export type { Program };

/** Où l'on en est. */
export type Grip = 'libre' | 'pris' | 'enfoncé';

export const GRIP_LABEL: Record<Grip, string> = {
  libre: 'Rien qui te tienne',
  pris: 'Ça te tient',
  enfoncé: 'Ça décide à ta place',
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function gripOf(state: GameState): Grip {
  const a = state.player.stats.addiction;
  return a >= DEEP ? 'enfoncé' : a >= GRIP ? 'pris' : 'libre';
}

/** Le programme en cours, s'il y en a un. */
export function currentProgram(state: GameState): Program | undefined {
  return getProgram(String(state.player.flags.program ?? ''));
}

/** Depuis quelle année on tient. */
export function heldSince(state: GameState): number | null {
  const since = state.player.flags.programSince;
  return since === undefined ? null : Number(since);
}

/** Combien d'années on a passées sous le seuil, d'affilée. */
export function cleanYears(state: GameState): number {
  const since = state.player.flags.cleanSince;
  if (since === undefined) return 0;
  return Math.max(0, state.year - Number(since));
}

/** A-t-on tenu assez longtemps pour que ça compte ? */
export function isClean(state: GameState): boolean {
  return gripOf(state) === 'libre' && cleanYears(state) >= CLEAN_YEARS;
}

/** Combien de fois on est retombé. */
export function relapses(state: GameState): number {
  return Number(state.player.flags.relapses ?? 0);
}

/** Ce qu'un programme coûte ici et maintenant. */
export function programCost(state: GameState, program: Program): number {
  const country = getCountry(state.player.countryId);
  // La prise en charge du pays vaut aussi pour cela : c'est le même système
  // de santé que pour les maladies, et l'ignorer aurait fait de la remontée
  // un privilège de la même manière partout.
  const covered = 1 - country.healthcare * 0.55;
  return Math.round(program.cost * country.costIndex * state.world.inflation * covered);
}

/** Les programmes ouverts à quelqu'un dans cet état. */
export function programsFor(state: GameState): Program[] {
  return PROGRAMS.filter((p) => state.player.stats.addiction >= p.from);
}

/* ------------------------------------------------------------------ */
/* Ceux qui savent                                                     */
/* ------------------------------------------------------------------ */

/** Ceux à qui l'on a dit. */
export function witnesses(state: GameState): Person[] {
  return Object.values(state.npcs).filter((n) => n.alive && n.flags.knowsAbout === true);
}

/** Ceux à qui l'on pourrait le dire. */
export function couldTell(state: GameState): Person[] {
  return peopleByRelation(state, [
    'mother', 'father', 'brother', 'sister', 'son', 'daughter',
    'spouse', 'partner', 'bestFriend', 'friend',
  ]).filter((n) => n.alive && !n.estranged && !n.flags.knowsAbout && n.relationship >= TELL_BOND);
}

export function tellBlocker(state: GameState, person: Person): string | null {
  if (!person.alive) return `${person.firstName} n’est plus là.`;
  if (person.flags.knowsAbout === true) return `${person.firstName} est déjà au courant.`;
  if (person.estranged) return `Tu as coupé les ponts avec ${person.firstName}.`;
  if (person.relationship < TELL_BOND) return `Tu n’es pas assez proche de ${person.firstName} pour ça.`;
  if (gripOf(state) === 'libre' && cleanYears(state) === 0) return 'Il n’y a rien à dire.';
  return null;
}

/**
 * Le dire à quelqu'un.
 *
 * C'est le geste qui coûte le plus cher pour ce qu'il rapporte, et le seul du
 * jeu où connaître quelqu'un se paie comptant : une personne chaleureuse
 * s'approche, une personne distante recule. Qui n'a jamais cherché à savoir
 * lequel des deux il a en face joue à pile ou face.
 */
export function tell(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const person = state.npcs[personId];
  if (!person) return { ok: false, message: 'Personne.' };
  const why = tellBlocker(state, person);
  if (why) return { ok: false, title: 'En parler', message: why };

  person.flags.knowsAbout = true;
  // On apprend forcément quelque chose de quelqu'un à qui l'on dit cela.
  learn(person, 'warmth');

  const warm = person.personality.warmth >= 56;
  person.opinion = clampStat(person.opinion + (warm ? TELL_WARM : TELL_COLD));
  person.relationship = clampStat(person.relationship + (warm ? 4 : -6));
  state.player.stats.stress = clampStat(state.player.stats.stress + (warm ? -6 : 5));

  noteHistory(state, person, `${state.player.firstName} lui en a parlé.`);
  ctx.log('health', `Tu en as parlé à ${fullName(person)}.`, warm ? 'good' : 'neutral');
  return {
    ok: true,
    title: warm ? 'Quelqu’un sait' : 'C’est dit',
    tone: warm ? 'good' : 'neutral',
    message: warm
      ? `${person.firstName} écoute jusqu’au bout, sans rien dire, puis demande ce qu’il ou elle peut faire.`
      : `${person.firstName} hoche la tête, change de sujet, et met un peu de distance. C’est dit quand même.`,
  };
}

/* ------------------------------------------------------------------ */
/* S'y mettre                                                          */
/* ------------------------------------------------------------------ */

export function enrolBlocker(state: GameState, programId: string): string | null {
  const program = getProgram(programId);
  if (!program) return 'Rien de tel.';
  const p = state.player;
  if (p.prison) return 'Pas d’ici.';
  if (p.stats.addiction < program.from) {
    return program.from >= DEEP
      ? 'On n’y entre pas pour si peu.'
      : 'Ce n’est pas pour toi.';
  }
  if (currentProgram(state)?.id === programId) return 'Tu y es déjà.';
  const cost = programCost(state, program);
  if (p.money < cost) return `Il te faudrait ${formatMoney(cost, p.countryId)}.`;
  if (program.needsWitness && witnesses(state).length === 0) {
    return 'Il faudrait que quelqu’un soit au courant.';
  }
  return null;
}

/** Commencer. */
export function enrol(ctx: Ctx, programId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const program = getProgram(programId);
  if (!program) return { ok: false, message: 'Rien de tel.' };
  const why = enrolBlocker(state, programId);
  if (why) return { ok: false, title: program.label, message: why };

  p.money -= programCost(state, program);
  p.flags.program = program.id;
  p.flags.programSince = state.year;
  p.stats.stress = clampStat(p.stats.stress + program.toll);

  // Une cure prend l'année : on n'y travaille pas, et le salaire ne tombe pas.
  if (program.takesYear && p.job) {
    p.flags.onLeave = true;
    ctx.log('work', 'Tu t’es mis en congé pour la durée de la cure.', 'neutral');
  }

  ctx.log('health', `Tu commences : ${program.label.toLowerCase()}.`, 'good');
  return {
    ok: true,
    title: program.label,
    tone: 'good',
    message: `${program.note} Ça ne tiendra pas tout seul : ce qui te pousse te poussera encore.`,
  };
}

/** Arrêter le programme, sans que ce soit une rechute. */
export function quitProgram(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const program = currentProgram(state);
  if (!program) return { ok: false, message: 'Tu ne suis rien.' };
  delete state.player.flags.program;
  delete state.player.flags.programSince;
  delete state.player.flags.onLeave;
  ctx.log('health', `Tu as arrêté : ${program.label.toLowerCase()}.`, 'neutral');
  return { ok: true, title: 'Arrêté', tone: 'neutral', message: 'Tu n’y retournes plus.' };
}

/* ------------------------------------------------------------------ */
/* Ce que l'année fait                                                 */
/* ------------------------------------------------------------------ */

/**
 * Marquer qu'on est retourné là où ça a commencé.
 *
 * Il faut un marqueur qui survive à l'année : `yearActions` est vidé au
 * premier pas de `simulateYear`, bien avant que la remontée se joue. La
 * première version lisait `yearActions.casino` depuis `advanceRecovery` et
 * n'y trouvait donc **jamais rien** — l'écran annonçait « retourner jouer
 * doublerait la pression » et le moteur ne regardait pas.
 */
export function tempt(state: GameState): void {
  state.player.flags.temptedYear = state.year;
}

/** Est-on retourné jouer ou sortir, cette année ou la précédente ? */
export function tempted(state: GameState): boolean {
  return Number(state.player.flags.temptedYear ?? -99) >= state.year - 1;
}

/**
 * La part qui rechute cette année, telle qu'elle est vraiment.
 *
 * Exposée parce que l'écran doit pouvoir la montrer : décider de retourner
 * jouer en sachant que ça double la pression est une décision ; le découvrir
 * après coup n'en est pas une.
 */
export function relapseOdds(state: GameState): number {
  const program = currentProgram(state);
  if (!program) return 0;
  const p = state.player;
  return clamp(
    RELAPSE_BASE * (1 - program.holds)
    + (tempted(state) ? TEMPTED : 0)
    + (p.stats.stress / 100) * STRESS_WEIGHT
    - (p.stats.discipline / 100) * DISCIPLINE_HELPS
    - (witnesses(state).length > 0 ? WITNESS_HELPS : 0),
    0.02, 0.92,
  );
}

/** Ce que le programme retire cette année. */
export function yearlyDrop(state: GameState): number {
  const program = currentProgram(state);
  if (!program) return 0;
  // La rigueur fait la différence entre suivre et être inscrit.
  return program.drop * (0.7 + (state.player.stats.discipline / 100) * 0.6);
}

/**
 * Une année de plus.
 *
 * Appelé par le déroulé de l'année, après le vieillissement : c'est lui qui
 * applique la dérive naturelle, et l'on veut agir sur ce qu'elle a laissé.
 */
export function advanceRecovery(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  // Le compte des années propres. Il se remet à zéro dès qu'on repasse
  // au-dessus, sans quoi « trois ans » ne voudrait rien dire.
  if (p.stats.addiction < GRIP) {
    if (p.flags.cleanSince === undefined) p.flags.cleanSince = state.year;
  } else {
    delete p.flags.cleanSince;
  }

  const program = currentProgram(state);
  if (!program) return;

  // Sorti d'affaire : le programme s'arrête de lui-même.
  if (p.stats.addiction <= 0) {
    quitProgram(ctx);
    return;
  }

  p.money -= programCost(state, program);
  p.stats.stress = clampStat(p.stats.stress + program.toll * 0.5);

  if (rng.chance(relapseOdds(state))) {
    p.stats.addiction = clampStat(p.stats.addiction + RELAPSE_COST);
    p.stats.happiness = clampStat(p.stats.happiness - 12);
    p.flags.relapses = relapses(state) + 1;
    delete p.flags.program;
    delete p.flags.programSince;
    delete p.flags.onLeave;
    ctx.log('health', 'Tu as replongé. Il faudra recommencer.', 'bad');
    return;
  }

  p.stats.addiction = clampStat(p.stats.addiction - yearlyDrop(state));
  p.stats.happiness = clampStat(p.stats.happiness + 2);

  if (program.takesYear) {
    // Une cure ne dure qu'une année : on en sort, et l'on continue seul.
    delete p.flags.program;
    delete p.flags.programSince;
    delete p.flags.onLeave;
    ctx.log('health', 'Tu es rentré. Le plus dur commence maintenant.', 'neutral');
  }
}

/**
 * Ce que la dépendance perd toute seule.
 *
 * Remplace la dérive uniforme de `aging`, qui retirait de 0,5 à 2,5 points par
 * an quel que soit le niveau : on sortait donc d'une dépendance grave en ne
 * faisant rien pendant quarante ans, et décider d'arrêter n'aurait servi qu'à
 * gagner du temps. Au-dessus du seuil, la dérive est divisée.
 */
export function naturalDrift(state: GameState, base: number): number {
  return state.player.stats.addiction >= GRIP ? base * HELD_DRIFT : base;
}
