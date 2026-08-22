/**
 * Tenir quelque chose dans la durée.
 *
 * **Le manque que ce fichier comble.** Le jeu proposait « Arts martiaux » dans
 * le menu Sport et « Rééquilibrage alimentaire » et « Année de lecture » dans
 * le menu Bien-être. Les trois faisaient exactement la même chose : on paie,
 * une poignée de statistiques bougent, l'année est finie. Mesuré sur le code,
 * pas sur une impression : `doSport` et `doWellness` ne lisent **rien** de ce
 * qui a été fait les années précédentes. Vingt ans de karaté valaient vingt
 * fois un an de karaté, et l'on pouvait obtenir la même chose en alternant
 * vingt disciplines différentes.
 *
 * Ce fichier n'y touche pas — les deux actions ponctuelles restent, elles ont
 * leur usage. Il ajoute à côté ce qui manquait : **l'engagement**.
 *
 * Quatre règles le tiennent, et chacune existe pour créer une décision.
 *
 * **1. L'attention est bornée, et la réussite en reprend.** Cent points, moins
 * ce que la vie prend déjà : un emploi, l'école, des enfants à la maison, la
 * maladie. Sous soixante pour cent du rythme, on n'avance plus du tout — on
 * entretient. Et **la charge d'une pratique grandit avec son grade** : une
 * ceinture noire s'entraîne plus qu'une ceinture blanche, si bien que
 * l'arbitrage revient au moment où l'on a le plus investi.
 *
 * Mesuré sur des vies entières autopilotées, en tenant tout ce qu'on peut de
 * dix ans à la mort :
 *
 *     une seule pratique  → 6,2 grades sur 7 · 2 % des années à l'arrêt
 *     deux                → 5,8/7 et 4,8/5 · 12 %
 *     trois               → 4,9/7, 4,6/5, 3,9/4 · 43 %
 *     les cinq            → tout autour de 3,4 · 58 %
 *
 * **Se disperser ne coûte pas du temps, cela coûte le sommet.** Trois
 * disciplines font une vie complète sans aucun sommet ; une seule fait une
 * ceinture noire.
 *
 * **2. Le grade se va chercher.** L'avancée s'accumule ; à cent, on **peut**
 * tenter le passage — on n'y est jamais poussé. Tenter tôt est risqué, et
 * l'échec coûte un tiers de l'avancée ; attendre est sûr, mais l'avancée
 * plafonne à cent quarante-cinq et les années passent. Un passage raté
 * apprend quelque chose : la fois suivante est plus facile.
 *
 * **3. Lâcher coûte.** Une année sans pratiquer ne remet pas à zéro — mais
 * l'avancée fond de moitié, et au bout de trois années lâchées d'affilée, un
 * grade s'en va. On ne perd jamais le premier : avoir su reste. Lâcher rend en
 * revanche immédiatement sa place aux autres, ce qui fait de l'abandon une
 * décision et non une punition.
 *
 * **4. Le grade paie ailleurs.** C'est la règle qui empêche tout cela d'être
 * une jauge de plus. Les arts martiaux changent les chances de tenir tête à
 * quelqu'un (`bullying.ts`), la lecture relève le bulletin (`exams.ts`), le
 * régime freine le déclin du corps (`aging.ts`), la méditation desserre ce qui
 * vous tient (`recovery.ts`), le jardin finit par rapporter de l'argent.
 *
 * **5. Avant seize ans, c'est le foyer qui paie** — et c'est un foyer qui
 * décide. Sans cette règle, la règle 4 était morte : mesuré, **zéro** enfant
 * de sept ans sur quarante pouvait s'inscrire au club, parce qu'un enfant n'a
 * pas d'argent, et le lien le plus long du jeu partait donc d'une porte
 * fermée. Avec elle, 59 % des enfants entrent au club — et aucun dans un foyer
 * modeste, où il ne reste que la lecture et la méditation. Le club est devenu
 * un marqueur d'origine, ce qui vaut mieux que la correction elle-même.
 *
 * Rien ici ne décrit de technique : un grade est un nom, un entraînement est
 * un nombre d'heures. Ce que le jeu simule est l'engagement, pas la discipline
 * elle-même.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, PracticeState, StatKey } from '../engine/types.ts';
import {
  ATTENTION, BASE, CAP, FAIL_COST, FAIL_LEARNS, GRADE_CHARGE, HOLDING,
  HOME_BUDGET, HOME_PAYS, LAPSE_GRACE, LAPSE_KEEP, NEED, PRACTICES, RESIST,
  STREAK, STREAK_CAP, getPractice, gradeLabel, type Practice,
} from '../data/practices.ts';
import { getCountry } from '../data/countries.ts';
import { getFinancialContext } from './contexts.ts';
import { diseaseBurden } from './health.ts';
import { shiftStats } from './stats.ts';

/**
 * Est-on scolarisé ?
 *
 * Recopié de `education.ts#isInSchool` plutôt qu'importé, et pour une raison
 * précise : `exams.ts` lit ce module (la lecture relève le bulletin) et
 * `education.ts` lit `exams.ts`. L'importer fermerait un cycle
 * education → exams → practices → education. Deux lignes valent mieux qu'un
 * cycle — c'est déjà l'arbitrage retenu par `skills.ts#priceOf`.
 */
const AT_SCHOOL = [
  'nursery', 'primary', 'middle', 'high', 'university', 'graduate', 'vocational',
];

export { PRACTICES, getPractice, gradeLabel };
export type { Practice };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

const EMPTY: PracticeState = Object.freeze({
  keeping: false, grade: 0, progress: 0, years: 0, lapsed: 0, failed: 0, since: 0,
});

/** Où l'on en est de cette pratique-là. */
export function stateOf(state: GameState, id: string): PracticeState {
  return state.player.practices?.[id] ?? EMPTY;
}

/** Le grade atteint, de 0 (débutant) au nombre de grades du catalogue. */
export function gradeOf(state: GameState, id: string): number {
  return stateOf(state, id).grade;
}

/**
 * Le grade **utile**, de 0 à 1.
 *
 * C'est la forme sous laquelle les autres systèmes lisent une pratique : une
 * ceinture noire sur sept grades et un potager sur quatre valent tous deux 1,
 * ce qui évite d'avoir à connaître le catalogue pour s'en servir.
 */
export function standing(state: GameState, id: string): number {
  const practice = getPractice(id);
  if (!practice) return 0;
  return clamp(gradeOf(state, id) / practice.grades.length, 0, 1);
}

/** Celles qu'on tient en ce moment. */
export function kept(state: GameState): Practice[] {
  return PRACTICES.filter((practice) => stateOf(state, practice.id).keeping);
}

/** Celles qu'on a l'âge de prendre. */
export function availablePractices(state: GameState): Practice[] {
  return PRACTICES.filter((practice) => state.player.age >= practice.from);
}

/** Ce qu'une année de cette pratique coûte ici. */
export function priceOf(state: GameState, practice: Practice): number {
  const country = getCountry(state.player.countryId);
  return Math.round(practice.cost * country.costIndex * state.world.inflation);
}

/** Ce qu'un passage coûte ici. */
export function feeOf(state: GameState, practice: Practice): number {
  const country = getCountry(state.player.countryId);
  return Math.round(practice.fee * country.costIndex * state.world.inflation);
}

/** Est-ce le foyer qui paie, plutôt que le personnage ? */
export function paidByHome(state: GameState): boolean {
  return state.player.age < HOME_PAYS;
}

/**
 * Ce que le foyer accepte de mettre dans une activité, par an.
 *
 * Deux choses, et pas une : les moyens réels (`disposableRatio`) **et** ce que
 * les parents financent volontiers (`familySupport`). Un foyer aisé et pingre
 * n'est pas un foyer aisé, et c'est déjà ce que dit l'argent de poche du même
 * fichier de contextes.
 */
export function homeBudget(state: GameState): number {
  const country = getCountry(state.player.countryId);
  const home = getFinancialContext(state);
  const means = Math.max(0, home.disposableRatio) * (0.55 + home.familySupport * 0.55);
  return HOME_BUDGET * country.costIndex * state.world.inflation * means;
}

/** Ce qui empêche de payer l'année, ou rien — selon qui paie. */
function cannotPay(state: GameState, practice: Practice): string | null {
  const price = priceOf(state, practice);
  if (paidByHome(state)) {
    return price <= homeBudget(state)
      ? null
      : 'Chez toi, on ne met pas cet argent-là dans une activité.';
  }
  return state.player.money >= price
    ? null
    : `L’année coûte ${price.toLocaleString('fr-FR')} $.`;
}

/* ------------------------------------------------------------------ */
/* L'attention                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'il reste d'attention cette année.
 *
 * **La pièce maîtresse.** Sans elle, prendre les cinq pratiques serait
 * évidemment juste et il n'y aurait aucune décision. Chaque retrait
 * correspond à quelque chose que le joueur a décidé ou subi ailleurs, ce qui
 * fait que le budget bouge tout seul : accepter une promotion, avoir un
 * enfant ou tomber malade retire de la place à ce qu'on tenait, sans qu'aucun
 * écran ne l'annonce comme une punition.
 */
export function attention(state: GameState): number {
  const p = state.player;
  let left = ATTENTION;

  /*
   * Le travail, à hauteur des heures réellement faites — c'est `hours` qui
   * décide, donc un mi-temps rend de la place et les heures supplémentaires en
   * prennent.
   *
   * Le coefficient était 0,72, et il laissait un actif sans enfants à 71
   * d'attention : il pouvait tenir les cinq pratiques à 0,66 du rythme, juste
   * au-dessus du mur. La règle « on ne tient pas tout » dépendait donc d'avoir
   * des enfants, ce qui n'est pas ce qu'elle dit. À 0,95, un emploi à plein
   * temps laisse 62, et les cinq passent sous le seuil pour tout le monde.
   */
  if (p.job && !p.retired) left -= clamp(p.job.hours * 0.95, 10, 52);
  if (p.freelance) left -= 22;
  if (p.business) left -= 26;
  if (AT_SCHOOL.includes(p.education.stage)) left -= p.education.effort === 'hard' ? 24 : 17;

  // Les enfants encore à la maison. Au-delà de trois, la maison ne devient pas
  // trois fois plus lourde : elle est déjà pleine.
  const home = Object.values(state.npcs)
    .filter((n) => n.alive && (n.relation === 'son' || n.relation === 'daughter') && n.age < 18)
    .length;
  left -= Math.min(27, home * 9);

  // Ce que le corps prend.
  left -= diseaseBurden(state) * 0.4;

  // Ce qui en rend : la retraite libère des journées entières.
  if (p.retired) left += 20;

  /*
   * Et le tempérament — **celui de naissance, pas la discipline acquise.**
   *
   * La première version lisait `stats.discipline` et `stats.stress`. C'était
   * joli à écrire (« savoir tenir ses engagements fait durer les heures ») et
   * c'était un défaut de conception : les pratiques *augmentent* la discipline
   * et *baissent* le stress, chaque année, toutes les cinq. Mesuré sur des
   * vies entières, l'attention moyenne montait à 81 au lieu de rester autour
   * de 50 — la contrainte se finançait elle-même, et tenir cinq pratiques
   * devenait possible **parce qu'on en tenait cinq**.
   *
   * Le tempérament de naissance ne bouge pas, lui. Certains portent plus que
   * d'autres, cela vient du berceau, et rien de ce qu'on fait ici ne le
   * change.
   */
  left += (p.psyche.temperament.persistence - 50) / 5;

  // Un enfant n'a pas d'emploi et pas d'enfants : sans plancher, l'enfance
  // serait le moment où l'on peut tout tenir, et l'arbitrage n'existerait
  // qu'après trente ans.
  if (p.age < 14) left -= (14 - p.age) * 2.2;

  return Math.round(clamp(left, 12, ATTENTION));
}

/**
 * Ce que cette pratique-là demande, au grade où l'on en est.
 *
 * Pas la charge du catalogue : celle-ci grandit avec le grade. Voir
 * `GRADE_CHARGE` — c'est ce qui fait qu'une pratique réussie reprend de la
 * place et force à choisir de nouveau.
 */
export function chargeOf(state: GameState, practice: Practice): number {
  return practice.charge * (1 + stateOf(state, practice.id).grade * GRADE_CHARGE);
}

/** Ce que les pratiques tenues demandent. */
export function load(state: GameState): number {
  return kept(state).reduce((sum, practice) => sum + chargeOf(state, practice), 0);
}

/**
 * À quel régime on avance, de 0 à 1.
 *
 * En dessous du budget, plein régime. Au-dessus, tout ralentit **dans la même
 * proportion** : on ne perd pas une pratique parce qu'on en a pris une de
 * trop, on les mène toutes moins loin. C'est ce qui rend l'erreur récupérable.
 *
 * Puis, sous `HOLDING`, plus rien n'avance : on entretient. C'est le seul mur
 * du système, et il est annoncé sur l'écran avec les deux nombres qui le
 * produisent.
 */
export function pace(state: GameState): number {
  const demanded = load(state);
  if (demanded <= 0) return 1;
  return clamp(attention(state) / demanded, 0.2, 1);
}

/** Ce que l'année coûtera, toutes pratiques tenues confondues. */
/**
 * Avance-t-on, ou se contente-t-on d'entretenir ?
 *
 * La question que l'écran doit poser avant toute autre : une année passée
 * sous le seuil coûte son argent et son attention sans rien faire monter.
 */
export function stalled(state: GameState): boolean {
  return kept(state).length > 0 && pace(state) < HOLDING;
}

export function yearlyCost(state: GameState): number {
  return kept(state).reduce((sum, practice) => sum + priceOf(state, practice), 0);
}

/* ------------------------------------------------------------------ */
/* Prendre et lâcher                                                   */
/* ------------------------------------------------------------------ */

function put(state: GameState, id: string): PracticeState {
  const p = state.player;
  p.practices ??= {};
  p.practices[id] ??= { ...EMPTY };
  return p.practices[id];
}

/** Pourquoi on ne peut pas s'y mettre, ou rien. */
export function takeBlocker(state: GameState, id: string): string | null {
  const practice = getPractice(id);
  if (!practice) return 'Rien de tel.';
  const p = state.player;
  if (p.prison) return 'Pas depuis la détention.';
  if (p.age < practice.from) return `Trop tôt. À partir de ${practice.from} ans.`;
  if (stateOf(state, id).keeping) return 'Tu t’y tiens déjà.';
  return cannotPay(state, practice);
}

/**
 * S'y mettre.
 *
 * On ne paie pas ici : l'année qui commence sera facturée au bilan, comme
 * toutes les pratiques tenues. Prendre un engagement ne coûte rien — c'est le
 * tenir qui coûte, et c'est exactement ce que le système raconte.
 */
export function takePractice(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const practice = getPractice(id);
  if (!practice) return { ok: false, message: 'Rien de tel.' };
  const why = takeBlocker(state, id);
  if (why) return { ok: false, title: practice.label, message: why };

  const held = put(state, id);
  held.keeping = true;
  held.lapsed = 0;
  held.since = state.year;
  ctx.log('life', `${practice.label} — tu t’y mets.`, 'good');

  const room = attention(state) - load(state);
  return {
    ok: true,
    title: practice.label,
    tone: 'good',
    message: room >= 0
      ? `${practice.line} ${priceOf(state, practice).toLocaleString('fr-FR')} $ par an.`
      : `${practice.line} Mais ton année est déjà pleine : tout ce que tu tiens va avancer plus lentement.`,
  };
}

/**
 * Lâcher.
 *
 * Volontairement, et ça ne coûte rien sur le coup — c'est plus tard que ça se
 * paie, quand l'avancée a fondu et qu'un grade s'en va. Une décision dont le
 * prix arrive trois ans après est une bonne décision de jeu.
 */
export function dropPractice(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const practice = getPractice(id);
  if (!practice) return { ok: false, message: 'Rien de tel.' };
  const held = stateOf(state, id);
  if (!held.keeping) return { ok: false, title: practice.label, message: 'Tu ne t’y tiens pas.' };

  put(state, id).keeping = false;
  ctx.log('life', `${practice.label} — tu arrêtes.`, 'neutral');
  return {
    ok: true,
    title: practice.label,
    tone: 'neutral',
    message: held.grade > 0
      ? `Tu gardes « ${gradeLabel(practice, held.grade).toLowerCase()} » pour l’instant. `
        + `Trois années sans y revenir et tu en perdras un cran.`
      : 'Tu n’étais pas encore allé bien loin.',
  };
}

/* ------------------------------------------------------------------ */
/* Le passage                                                          */
/* ------------------------------------------------------------------ */

/** Peut-on tenter le grade suivant ? */
export function passageBlocker(state: GameState, id: string): string | null {
  const practice = getPractice(id);
  if (!practice) return 'Rien de tel.';
  const held = stateOf(state, id);
  if (!held.keeping) return 'Il faut s’y tenir pour y prétendre.';
  if (held.grade >= practice.grades.length) return 'Tu es allé au bout.';
  /*
   * La limite annuelle **avant** l'avancée, et l'ordre n'est pas indifférent :
   * après un passage décroché, l'avancée est repartie de zéro et « pas encore
   * prêt » est vrai — mais c'est une réponse qui laisse croire qu'il faudrait
   * travailler davantage, alors que la seule chose à faire est d'attendre
   * l'année prochaine. Une raison exacte et trompeuse est pire qu'une raison
   * approximative.
   */
  if (Number(state.player.yearActions[`passage_${id}`] ?? 0) > 0) {
    return 'Une tentative par an.';
  }
  if (held.progress < NEED) {
    return `Pas encore prêt : ${Math.round(held.progress)} sur ${NEED}.`;
  }
  const fee = feeOf(state, practice);
  if (state.player.money < fee) return `Il faut ${fee.toLocaleString('fr-FR')} $.`;
  return null;
}

/**
 * Les chances de décrocher le grade suivant.
 *
 * L'avancée au-delà de cent est ce qui décide : à cent tout juste, un peu
 * moins d'une chance sur deux ; au plafond, quatre sur cinq. Le reste module —
 * la discipline aide un peu, les grades hauts résistent, et **chaque échec
 * rapproche** : on a vu ce qu'on attendait de vous.
 */
export function passageOdds(state: GameState, id: string): number {
  const practice = getPractice(id);
  if (!practice) return 0;
  const held = stateOf(state, id);
  const ready = clamp((held.progress - NEED) / (CAP - NEED), 0, 1);
  const height = held.grade / Math.max(1, practice.grades.length);
  return clamp(
    0.44 + ready * 0.36
    + (state.player.stats.discipline - 50) / 420
    - height * 0.22
    + held.failed * FAIL_LEARNS,
    0.05, 0.93,
  );
}

/** Aller le chercher. */
export function attemptPassage(ctx: Ctx, id: string): ActionResult {
  const { state, rng } = ctx;
  const practice = getPractice(id);
  if (!practice) return { ok: false, message: 'Rien de tel.' };
  const why = passageBlocker(state, id);
  if (why) return { ok: false, title: practice.passage, message: why };

  const p = state.player;
  const held = put(state, id);
  const fee = feeOf(state, practice);
  p.money -= fee;
  p.yearActions[`passage_${id}`] = 1;

  if (!rng.chance(passageOdds(state, id))) {
    held.progress = Math.max(0, held.progress - FAIL_COST);
    held.failed += 1;
    shiftStats(state, { happiness: -5, stress: 6 });
    ctx.log('life', `${practice.label} — ce n’était pas cette année.`, 'bad');
    return {
      ok: true,
      title: practice.passage,
      tone: 'bad',
      message: 'Refusé. Tu sais maintenant ce qu’on attend de toi, ce qui n’est '
        + 'pas rien — mais il va falloir remonter la pente.',
    };
  }

  held.grade += 1;
  held.progress = 0;
  held.failed = 0;
  shiftStats(state, { happiness: 9, discipline: 2.5 });
  const done = held.grade >= practice.grades.length;
  ctx.log('life', `${practice.label} — ${gradeLabel(practice, held.grade).toLowerCase()}.`, 'good');
  return {
    ok: true,
    title: gradeLabel(practice, held.grade),
    tone: 'good',
    message: done
      ? `Tu es allé au bout. ${practice.opens}`
      : `${practice.opens} Il en reste ${practice.grades.length - held.grade}.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/** Ce qu'une année de cette pratique fait avancer, au régime actuel. */
export function yearlyGain(state: GameState, id: string): number {
  const practice = getPractice(id);
  if (!practice) return 0;
  // En dessous du seuil, on entretient sans avancer. C'est ce qui force à
  // choisir plutôt qu'à tout prendre et attendre : voir `HOLDING`.
  if (stalled(state)) return 0;
  const held = stateOf(state, id);
  const driver = 0.72 + (state.player.stats[practice.driver] / 100) * 0.56;
  // Multiplicatif : chaque grade laisse 76 % de la vitesse du précédent. Voir
  // `RESIST` — la version soustractive rendait les derniers grades aussi
  // faciles que les premiers, et le sommet cessait d'en être un.
  const resistance = RESIST ** held.grade;
  // La continuité : c'est la seule chose du jeu qui récompense de n'avoir
  // rien changé pendant longtemps.
  const streak = 1 + Math.min(STREAK_CAP, held.years * STREAK);
  // On apprend mieux jeune, et l'on apprend quand même vieux.
  const age = state.player.age < 20 ? 1.15 : state.player.age > 62 ? 0.78 : 1;
  return BASE * pace(state) * driver * resistance * streak * age;
}

/**
 * Une année de pratiques.
 *
 * L'ordre compte : on facture d'abord, parce qu'une pratique qu'on ne peut
 * plus payer se lâche toute seule — et c'est l'une des façons dont une année
 * difficile mange ce qu'on avait construit ailleurs.
 */
export function advancePractices(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  if (!p.practices) return;

  const running = kept(state);
  const stride = pace(state);
  // Une fois par an, pas une fois par pratique : cinq lignes identiques dans
  // le journal d'une même année ne se lisent pas.
  if (running.length > 0 && stalled(state)) {
    ctx.log('life',
      `Tu tiens trop de choses à la fois : cette année ne fait qu’entretenir ce que tu as (${Math.round(stride * 100)} % du rythme).`,
      'bad');
  }

  for (const practice of running) {
    const held = put(state, practice.id);
    const price = priceOf(state, practice);

    // La détention interrompt tout ce qui se pratique dehors, sans qu'on
    // l'ait décidé. C'est la seule interruption que le joueur ne choisit pas.
    if (p.prison) {
      held.keeping = false;
      ctx.log('life', `${practice.label} — la détention y met fin.`, 'bad');
      continue;
    }
    /*
     * Qui paie décide de qui lâche. Un enfant dont le foyer se serre la
     * ceinture perd son club sans avoir rien décidé — c'est la même chose que
     * de perdre un voyage scolaire, et c'est l'une des rares façons dont le
     * milieu d'origine se rappelle à quelqu'un année après année.
     */
    if (cannotPay(state, practice) !== null) {
      held.keeping = false;
      ctx.log('life', paidByHome(state)
        ? `${practice.label} — chez toi, on ne peut plus payer ça.`
        : `${practice.label} — tu ne peux plus la payer.`, 'bad');
      continue;
    }
    if (!paidByHome(state)) p.money -= price;
    held.years += 1;
    held.lapsed = 0;
    held.progress = Math.min(CAP, held.progress + yearlyGain(state, practice.id));

    // Ce qu'une année donne, à hauteur du grade et du régime : une pratique
    // menée à moitié donne à moitié.
    const scale = (1 + held.grade * 0.45) * stride;
    const deltas: Partial<Record<StatKey, number>> = {};
    for (const [key, value] of Object.entries(practice.yearly)) {
      deltas[key as StatKey] = value * scale;
    }
    shiftStats(state, deltas);

    // Le jardin est la seule pratique qui rend de l'argent, et seulement une
    // fois qu'elle a pris : c'est ce que promet son dernier grade.
    if (practice.id === 'garden' && held.grade >= 2) {
      const yield_ = Math.round(price * (0.35 + held.grade * 0.34));
      p.money += yield_;
    }

    if (held.progress >= NEED && passageBlocker(state, practice.id) === null) {
      ctx.log('life',
        `${practice.label} — tu peux tenter ${practice.passage.toLowerCase()}.`, 'good');
    }
  }

  // Et ce qui a été lâché fond. On ne descend jamais sous le premier grade :
  // avoir su reste, même vingt ans après.
  for (const practice of PRACTICES) {
    const held = p.practices[practice.id];
    if (!held || held.keeping) continue;
    if (held.progress <= 0 && held.grade <= 1) continue;
    held.lapsed += 1;
    held.progress = Math.round(held.progress * LAPSE_KEEP);
    if (held.lapsed >= LAPSE_GRACE && held.grade > 1) {
      held.grade -= 1;
      held.lapsed = 0;
      ctx.log('life',
        `${practice.label} — sans y revenir, tu n’es plus que « ${gradeLabel(practice, held.grade).toLowerCase()} ».`,
        'bad');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Ce que ça change ailleurs                                           */
/* ------------------------------------------------------------------ */

/**
 * Ce que les arts martiaux ajoutent quand il faut tenir tête.
 *
 * Lu par `bullying.ts#responseOdds`. C'est le lien le plus long du jeu : un
 * enfant de sept ans qu'on inscrit au club voit la différence à treize, et
 * seulement s'il y est resté. Rien d'autre dans le jeu ne demande six ans
 * d'avance.
 */
export function standingUp(state: GameState): number {
  return standing(state, 'martial');
}

/** Ce que la lecture ajoute au bulletin, en points de note. */
export function readingEdge(state: GameState): number {
  return standing(state, 'reading') * 1.9;
}

/**
 * Ce que le régime retire au déclin du corps.
 *
 * Un multiplicateur appliqué à la dérive de `aging.ts` : au dernier grade, le
 * corps se défait environ un tiers moins vite. Assez pour changer une
 * vieillesse, jamais assez pour l'annuler.
 */
export function bodyKeeping(state: GameState): number {
  return 1 - standing(state, 'diet') * 0.34;
}

/** Ce que la méditation retire à la reprise d'une dépendance. */
export function steadiness(state: GameState): number {
  return standing(state, 'meditate');
}

/** Ce qu'on tient, du plus avancé au reste — pour le bilan d'une vie. */
export function heldPractices(state: GameState): { practice: Practice; held: PracticeState }[] {
  return PRACTICES
    .map((practice) => ({ practice, held: stateOf(state, practice.id) }))
    .filter((row) => row.held.years > 0 || row.held.grade > 0)
    .sort((a, b) => b.held.grade - a.held.grade || b.held.years - a.held.years);
}

/** La plus avancée, s'il y en a une qui vaille d'être nommée. */
export function bestPractice(state: GameState): { practice: Practice; held: PracticeState } | null {
  const all = heldPractices(state);
  return all.length > 0 && all[0].held.grade > 0 ? all[0] : null;
}

/** Ce qu'on tient et à quel rythme, en une phrase — pour l'écran et le bilan. */
export function summary(state: GameState): string {
  const running = kept(state);
  // La pastille du menu dit déjà « rien » : répéter le mot ne servirait à
  // rien. La ligne dit donc à quoi ça sert, puisque c'est le seul endroit où
  // quelqu'un lira cette phrase sans avoir jamais ouvert l'écran.
  if (running.length === 0) {
    return 'Rien en ce moment — ce qu’on tient des années compte plus qu’une bonne année.';
  }
  const stride = pace(state);
  const names = running.map((x) => x.label.replace(/^L[ea]s? /i, '').toLowerCase()).join(', ');
  if (stalled(state)) {
    return `${names} — trop à la fois : tu entretiens sans avancer (${Math.round(stride * 100)} % du rythme).`;
  }
  return stride >= 0.99
    ? `${names} — tu tiens tout ce que tu as pris.`
    : `${names} — ton année est trop pleine : ${Math.round(stride * 100)} % du rythme.`;
}

/**
 * L'état brut, créé s'il n'existe pas — réservé aux tests et aux instruments.
 *
 * `stateOf` rend un objet **gelé** quand la pratique n'a jamais été touchée :
 * sans cela, un appelant qui écrirait dedans modifierait l'état par défaut de
 * toutes les pratiques de toutes les parties, et le défaut ne se verrait
 * qu'ailleurs, longtemps après. Gelé, l'écriture lève tout de suite.
 */
export function raw(state: GameState, id: string): PracticeState {
  return put(state, id);
}
