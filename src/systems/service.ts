/**
 * Servir.
 *
 * Le catalogue avait sept feuilles absentes qui disaient toutes la même
 * chose : « Militaire / Engagement » était une ligne dans `degrees.ts`, et
 * « Astronaute » comme « Agent secret » n'existaient pas. Un seul cadre les
 * sert tous les trois, parce qu'ils ont la même forme.
 *
 * Quatre principes, et ce sont eux qui distinguent servir d'exercer un
 * métier — sans quoi ce fichier ne serait qu'un `stage.ts` repeint.
 *
 * **1. On ne s'embauche pas, on est pris.** Postuler ne suffit pas : il y a
 * une sélection, on peut la rater, et l'on peut la retenter — mais chaque
 * échec compte. Le service de renseignement va plus loin : on n'y postule
 * jamais, on y est approché, et seulement si l'on a déjà le profil.
 *
 * **2. Le grade ne s'achète pas.** Il demande la réputation *et*
 * l'ancienneté. Un joueur brillant ne finit pas général en quatre ans ; un
 * joueur médiocre n'y arrive pas en restant assis.
 *
 * **3. On y risque quelque chose.** Une mission peut blesser, écarter
 * plusieurs années, ou tuer. C'est la vraie différence avec une carrière de
 * scène : là-bas on rate, ici on ne revient pas toujours.
 *
 * **4. On en sort.** Avec les honneurs, au terme, ou réformé — et ce qu'on
 * en garde (grade, pension, décorations, blessures) reste dans la vie après.
 *
 * **Tout est fictif et abstrait.** Les missions ne portent ni lieu réel, ni
 * camp, ni méthode ; les épreuves jouées sont une jauge d'inertie et une
 * jauge d'attention. Il n'y a rien à en tirer d'applicable, et c'est voulu.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type {
  ActionResult, GameState, ServiceDuty, ServiceState,
} from '../engine/types.ts';
import {
  CORPS, DECORATIONS, dischargeFor, dutiesFor, getCorps, getDuty, ranksFor,
  standingLabel, type Corps, type Duty, type Rank,
} from '../data/service.ts';
import { getCountry } from '../data/countries.ts';
import { autoResolve, blend, type MiniGameContext, type MiniGameResult } from '../engine/minigame.ts';
import { shiftStat, shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';
import { killPlayer } from '../engine/simulateYear.ts';

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function serviceOf(state: GameState): ServiceState | null {
  return state.player.service;
}

export function corpsOf(state: GameState): Corps | null {
  const service = state.player.service;
  return service ? getCorps(service.corpsId) ?? null : null;
}

/** Borne 0-100 sans arrondir : la préparation progresse par fractions. */
function fine(value: number): number {
  return clamp(value, 0, 100);
}

export function rankOf(state: GameState): Rank | null {
  const service = state.player.service;
  if (!service) return null;
  return ranksFor(service.corpsId).find((r) => r.id === service.rankId) ?? null;
}

/** Le grade suivant, s'il y en a un. */
export function nextRank(state: GameState): Rank | null {
  const service = state.player.service;
  if (!service) return null;
  const ladder = ranksFor(service.corpsId);
  const index = ladder.findIndex((r) => r.id === service.rankId);
  return index >= 0 && index + 1 < ladder.length ? ladder[index + 1] : null;
}

/** Années de service accomplies. */
export function servedYears(state: GameState): number {
  const service = state.player.service;
  return service ? Math.max(0, state.year - service.since) : 0;
}

/** Ce qui manque encore pour le grade suivant, en une phrase. */
export function promotionGap(state: GameState): string | null {
  const service = state.player.service;
  const next = nextRank(state);
  if (!service || !next) return null;
  const missing: string[] = [];
  if (service.standing < next.standing) {
    missing.push(`${Math.ceil(next.standing - service.standing)} de réputation`);
  }
  if (servedYears(state) < next.years) {
    missing.push(`${next.years - servedYears(state)} an(s) d’ancienneté`);
  }
  return missing.length > 0 ? missing.join(' et ') : null;
}

/** Est-on en état de partir ? */
export function operational(state: GameState): boolean {
  const service = state.player.service;
  if (!service) return false;
  return service.trainingLeft <= 0
    && state.year >= service.sidelinedUntil
    && !state.player.prison;
}

/** La solde annuelle, grade et pays compris. */
export function servicePay(state: GameState): number {
  const service = state.player.service;
  const corps = corpsOf(state);
  const rank = rankOf(state);
  if (!service || !corps || !rank) return 0;
  const country = getCountry(state.player.countryId);
  const training = service.trainingLeft > 0 ? 0.6 : 1;
  return Math.round(
    corps.basePay * rank.pay * training * country.salaryIndex * state.world.inflation,
  );
}

/** Le titre affiché dans le parcours : le grade, ou la couverture. */
export function serviceTitle(state: GameState): string | null {
  const service = state.player.service;
  const corps = corpsOf(state);
  const rank = rankOf(state);
  if (!service || !corps || !rank) return null;
  return corps.cover ?? rank.label;
}

export { standingLabel };

/* ------------------------------------------------------------------ */
/* Entrer                                                              */
/* ------------------------------------------------------------------ */

/**
 * A-t-on un diplôme du supérieur ?
 *
 * Lu localement plutôt qu'importé d'`education.ts` : ce module est appelé
 * depuis `simulateYear`, et le cycle d'import coûterait plus cher que ces
 * deux lignes.
 */
function graduated(state: GameState): boolean {
  return state.player.education.degrees.length > 0;
}

/** Ce qui interdit d'entrer, s'il y a quelque chose. */
export function entryBlocker(state: GameState, corps: Corps): string | null {
  const p = state.player;
  if (p.service) {
    return p.service.corpsId === corps.id
      ? 'C’est déjà là que tu sers.'
      : 'On ne sert pas dans deux maisons.';
  }
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Il faudrait donner son nom.';
  if (p.age < corps.minAge) return `Il faut avoir ${corps.minAge} ans.`;
  if (p.age > corps.maxAge) return `On ne prend plus personne après ${corps.maxAge} ans.`;
  if (corps.cleanRecord && p.criminalRecord.convictions.length > 0) {
    return 'Le casier ferme cette porte.';
  }
  if (corps.needsDegree && !graduated(state)) return 'Il faut un diplôme du supérieur.';
  if (corps.recruitedOnly && !approached(state, corps)) {
    return 'On n’y postule pas. On y est approché.';
  }
  return null;
}

/**
 * A-t-on été remarqué par une maison qui ne recrute pas au guichet ?
 *
 * Le service ne publie pas d'offre : il regarde qui a déjà, sans le savoir,
 * ce qu'il cherche — de la tête, du sang-froid, un casier vide et une vie
 * qu'on peut refaire ailleurs. Cette fonction est donc la porte elle-même.
 */
export function approached(state: GameState, corps: Corps): boolean {
  if (!corps.recruitedOnly) return true;
  const p = state.player;
  return p.stats.intelligence >= corps.needs.intelligence
    && p.stats.health >= corps.needs.health
    && p.traits.discipline >= corps.needs.discipline
    && p.criminalRecord.convictions.length === 0
    && p.stats.karma >= 35;
}

/**
 * Les chances d'être pris.
 *
 * Chaque exigence manquée coûte, et l'écart compte : rater la condition
 * physique de deux points n'est pas la rater de trente. On ne descend jamais
 * tout à fait à zéro — la sélection reste une sélection, pas un calcul.
 */
export function selectionOdds(state: GameState, corps: Corps): number {
  const p = state.player;
  const gaps = [
    (p.stats.fitness - corps.needs.fitness) / 40,
    (p.stats.health - corps.needs.health) / 40,
    (p.stats.intelligence - corps.needs.intelligence) / 40,
    (p.traits.discipline - corps.needs.discipline) / 40,
  ];
  const shortfall = gaps.reduce((sum, gap) => sum + Math.min(0, gap), 0);
  const surplus = gaps.reduce((sum, gap) => sum + Math.max(0, gap), 0);
  // Les tentatives précédentes laissent une trace au dossier.
  const tries = Number(state.player.flags[`servicetries_${corps.id}`] ?? 0);
  return clamp(0.52 + shortfall * 0.55 + surplus * 0.14 - tries * 0.07, 0.04, 0.93);
}

/** Se présenter. On peut être refusé. */
export function enlist(ctx: Ctx, corpsId: string): ActionResult {
  const { state, rng } = ctx;
  const corps = getCorps(corpsId);
  if (!corps) return { ok: false, message: 'Cette maison n’existe pas.' };
  const blocker = entryBlocker(state, corps);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const key = `servicetries_${corps.id}`;
  const odds = selectionOdds(state, corps);
  if (!rng.chance(odds)) {
    state.player.flags[key] = Number(state.player.flags[key] ?? 0) + 1;
    ctx.log('work', `Candidature refusée par ${corps.house}.`, 'bad');
    shiftStat(state, 'happiness', -3);
    return {
      ok: false,
      title: 'Refusé',
      tone: 'bad',
      message: `${corps.house.replace(/^./, (c) => c.toUpperCase())} ne t’a pas retenu${
        state.player.sex === 'F' ? 'e' : ''}. On te dira pourquoi, ou pas.`,
    };
  }

  const ladder = ranksFor(corps.id);
  const service: ServiceState = {
    corpsId: corps.id,
    since: state.year,
    trainingLeft: corps.trainingYears,
    // Ce qu'on vaut au départ vient de ce qu'on est, pas de rien.
    readiness: fine(
      (state.player.stats.fitness * 0.3 + state.player.stats.intelligence * 0.3
        + state.player.traits.discipline * 0.4) * 0.35,
    ),
    standing: 0,
    rankId: ladder[0].id,
    offers: [],
    current: null,
    done: 0,
    failed: 0,
    wounded: false,
    sidelinedUntil: 0,
    decorations: [],
    earnedThisYear: 0,
  };
  state.player.service = service;
  state.player.flags[key] = 0;
  ctx.log('work', `Tu entres dans ${corps.house}. ${corps.trainingName.replace(/^./, (c) => c.toUpperCase())} commence.`, 'good');
  applyExperience(ctx, 'engagement');
  return {
    ok: true,
    title: 'Pris',
    tone: 'good',
    message: `${corps.house.replace(/^./, (c) => c.toUpperCase())} te prend. ${
      corps.trainingYears > 0
        ? `${corps.trainingName.replace(/^./, (c) => c.toUpperCase())} dure ${corps.trainingYears} an(s) — avant, tu n’es bon à rien.`
        : 'Tu es opérationnel tout de suite.'}`,
  };
}

/** Les maisons qu'on peut envisager aujourd'hui. */
export function availableCorps(state: GameState): Corps[] {
  return CORPS.filter((c) => entryBlocker(state, c) === null);
}

/* ------------------------------------------------------------------ */
/* Se former                                                           */
/* ------------------------------------------------------------------ */

export function trainBlocker(state: GameState): string | null {
  const service = state.player.service;
  if (!service) return 'Tu ne sers nulle part.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (Number(state.player.yearActions.serviceTrain ?? 0) >= 1) {
    return 'Tu t’es déjà entraîné cette année.';
  }
  return null;
}

/**
 * S'entraîner.
 *
 * Le seul levier volontaire sur la préparation. Il coûte du temps et de la
 * forme, il rend de la préparation — et il en rend d'autant moins qu'on est
 * déjà bon, sans quoi il suffirait de le presser vingt fois.
 */
export function train(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps) return { ok: false, message: 'Tu ne sers nulle part.' };
  const blocker = trainBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  state.player.yearActions.serviceTrain = 1;

  const room = (100 - service.readiness) / 100;
  const gain = (3.5 + state.player.traits.discipline * 0.045) * Math.pow(room, 0.7)
    + rng.float(-0.6, 1.2);
  service.readiness = fine(service.readiness + Math.max(0, gain));
  shiftStats(state, { fitness: 2, happiness: -1 });
  return {
    ok: true,
    title: 'Entraînement',
    tone: 'neutral',
    message: `Une année de plus à faire ce qu’on te dit. Préparation : ${
      Math.round(service.readiness)}/100.`,
  };
}

/* ------------------------------------------------------------------ */
/* Les missions                                                        */
/* ------------------------------------------------------------------ */

/** L'unité de prime, à l'échelle du pays et de l'époque. */
export function bountyUnit(state: GameState, corps: Corps): number {
  const country = getCountry(state.player.countryId);
  return corps.basePay / 12 * country.salaryIndex * state.world.inflation;
}

export function dutyPay(state: GameState, duty: Duty): number {
  const corps = corpsOf(state);
  if (!corps) return 0;
  return Math.round(duty.bounty * bountyUnit(state, corps));
}

/**
 * Ce qu'on vous propose.
 *
 * Deux filtres et rien d'autre : l'habilitation du grade, et un écart de
 * difficulté raisonnable avec la préparation. On ne confie pas une
 * exfiltration à quelqu'un qui sort des classes, et l'on ne fait pas monter
 * la garde à un chef de poste.
 */
export function rollDuties(ctx: Ctx): void {
  const { state, rng } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  const rank = rankOf(state);
  if (!service || !corps || !rank) return;
  if (service.current || service.trainingLeft > 0) return;
  if (state.year < service.sidelinedUntil) return;

  const pool = dutiesFor(corps.id).filter(
    (d) => d.clearance <= rank.clearance && d.demands <= service.readiness + 26,
  );
  if (pool.length === 0) { service.offers = []; return; }

  const offers: ServiceDuty[] = [];
  const picked = new Set<string>();
  for (let i = 0; i < 3 && picked.size < pool.length; i++) {
    let duty = pool[rng.int(0, pool.length - 1)];
    for (let guard = 0; guard < 6 && picked.has(duty.id); guard++) {
      duty = pool[rng.int(0, pool.length - 1)];
    }
    if (picked.has(duty.id)) continue;
    picked.add(duty.id);
    offers.push({
      id: `duty_${state.year}_${i}`,
      dutyId: duty.id,
      bounty: Math.round(dutyPay(state, duty) * rng.float(0.85, 1.2)),
      demands: clampStat(duty.demands + rng.int(-7, 9)),
      danger: clamp(duty.danger * corps.peril * rng.float(0.8, 1.25), 0, 0.97),
      yearsLeft: duty.span,
    });
  }
  service.offers = offers;
}

export function acceptBlocker(state: GameState): string | null {
  const service = state.player.service;
  if (!service) return 'Tu ne sers nulle part.';
  if (service.trainingLeft > 0) return 'Tu es encore en formation.';
  if (state.year < service.sidelinedUntil) return 'Tu n’es pas en état.';
  if (service.current) return 'Tu en as déjà une sur les bras.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  return null;
}

export function acceptDuty(ctx: Ctx, offerId: string): ActionResult {
  const { state } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps) return { ok: false, message: 'Tu ne sers nulle part.' };
  const blocker = acceptBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const offer = service.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette mission n’est plus là.' };
  const duty = getDuty(offer.dutyId);
  if (!duty) return { ok: false, message: 'Cette mission n’existe pas.' };

  service.current = offer;
  service.offers = [];
  ctx.log('work', `${duty.label} — ${corps.dutyName} accepté.`, 'neutral');
  return {
    ok: true,
    title: duty.label,
    tone: 'neutral',
    message: `${duty.note} Il faudra y aller.`,
  };
}

/**
 * Refuser.
 *
 * On peut, mais pas gratuitement : une maison retient qui recule. C'est le
 * pendant du choix — sans coût, refuser jusqu'à tomber sur la mission facile
 * serait la stratégie évidente.
 */
export function declineDuty(ctx: Ctx, offerId: string): ActionResult {
  const { state } = ctx;
  const service = state.player.service;
  if (!service) return { ok: false, message: 'Tu ne sers nulle part.' };
  const offer = service.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette mission n’est plus là.' };
  service.offers = service.offers.filter((o) => o.id !== offerId);
  service.standing = fine(service.standing - 2.5);
  ctx.log('work', 'Tu as décliné une affectation.', 'bad');
  return {
    ok: true,
    title: 'Décliné',
    tone: 'bad',
    message: 'On note. On ne dit rien, mais on note.',
  };
}

/** Ce que le personnage apporte à l'épreuve. */
export function dutyContext(state: GameState): MiniGameContext | null {
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps || !service.current) return null;
  const p = state.player;
  // La préparation d'abord, mais la tête et le corps comptent : une mission
  // n'est pas qu'un savoir-faire.
  const skill = clampStat(
    service.readiness * 0.6 + p.stats.intelligence * 0.16 + p.stats.fitness * 0.14
    + p.traits.discipline * 0.1,
  );
  return {
    skill,
    difficulty: service.current.demands,
    mode: 'normal',
    grace: {
      time: 1 + (skill / 100) * 0.35,
      pressure: 1 - (skill / 100) * 0.3,
      tolerance: skill * 0.5,
      insight: skill > 55,
    },
  };
}

/** Le mini-jeu de la maison. */
export function dutyGame(state: GameState): string | null {
  return corpsOf(state)?.game ?? null;
}

/**
 * Régler une mission.
 *
 * L'ordre compte : on calcule le résultat, on en tire les conséquences
 * matérielles, **puis** on tire le sort du personnage. Une mission peut
 * rapporter et coûter en même temps, et le récit doit dire les deux.
 */
export function settleDuty(ctx: Ctx, result: MiniGameResult): ActionResult {
  const { state } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps || !service.current) {
    return { ok: false, message: 'Tu n’as pas de mission en cours.' };
  }
  const assignment = service.current;
  const duty = getDuty(assignment.dutyId);
  if (!duty) return { ok: false, message: 'Cette mission n’existe pas.' };
  const context = dutyContext(state);
  if (!context) return { ok: false, message: 'Tu n’as pas de mission en cours.' };

  // `blend` rend une fraction 0-1 : on la met à l'échelle du reste du
  // fichier, où tout se compte sur cent.
  const outcome = clampStat(blend(context, result, 0.42) * 100);
  // Ce qui décide n'est pas la performance seule mais l'écart à ce qu'on
  // demandait : mener une garde et mener une exfiltration ne se jugent pas au
  // même barème.
  //
  // La pente compte plus que le point de départ. À 0,28, un personnage arrivé
  // au bout de sa préparation franchissait toutes les barres, y compris les
  // plus hautes : la fixture montrait dix-neuf missions menées sur dix-neuf,
  // dont les plus exigeantes du catalogue. À 0,62, une mission au sommet reste
  // un vrai test même pour quelqu'un au sommet, et une mission très au-dessus
  // de soi ne se tient pas.
  const bar = 20 + assignment.demands * 0.62;
  const done = outcome >= bar;

  // La préparation progresse avec ce qu'on a fait, et d'autant plus que la
  // mission dépassait ce qu'on savait faire.
  const stretch = Math.max(0, assignment.demands - service.readiness) / 100;
  service.readiness = fine(
    service.readiness + (outcome / 100) * (1.6 + stretch * 6) * (done ? 1 : 0.45),
  );

  // La réputation : ce qu'on rapporte, moins ce qu'on a coûté.
  const standingDelta = done
    ? duty.standing * (0.55 + outcome / 140)
    : -duty.standing * 0.42;
  service.standing = fine(service.standing + standingDelta);

  // La prime : versée en entier si la mission est menée, en partie sinon.
  const paid = Math.round(assignment.bounty * (done ? 1 : 0.45));
  service.earnedThisYear += Math.max(0, paid);
  if (done) service.done += 1; else service.failed += 1;

  if (corps.renown > 0 && done && duty.standing >= 20) {
    state.player.fame.level = clampStat(
      state.player.fame.level + duty.standing * 0.12 * corps.renown,
    );
  }

  shiftStats(state, done
    ? { happiness: 3 }
    : { happiness: -5 });

  service.current = null;
  const notes = result.notes ?? [];

  // Le sort du personnage. C'est ici, et seulement ici, qu'on risque quelque
  // chose : la mission est finie, la prime est versée, et la suite dépend du
  // danger propre à cette occurrence-là.
  const harm = harmRoll(ctx, assignment, done, outcome);

  ctx.log(
    'work',
    `${duty.label} — ${done ? 'menée' : 'ratée'}${harm.label ? `, ${harm.label}` : ''}.`,
    done && !harm.label ? 'good' : 'bad',
  );

  return {
    ok: true,
    title: done ? 'Mission menée' : 'Mission ratée',
    tone: done ? 'good' : 'bad',
    message: [
      done
        ? `Tu l’as menée. ${paid > 0 ? `Prime : ${paid}.` : ''}`
        : `Ça n’a pas tenu. On te verse quand même ${paid}.`,
      harm.message,
      notes[0],
      `Réputation : ${standingLabel(service.standing)}.`,
    ].filter(Boolean).join(' '),
  };
}

/**
 * Ce que la mission coûte au personnage.
 *
 * Trois issues, dans cet ordre de gravité : rien, une blessure qui écarte, et
 * ne pas revenir. Le danger de l'occurrence décide, et rater la mission
 * double le risque — c'est ce qui empêche de jouer n'importe comment sous
 * prétexte que la prime tombe quand même.
 */
function harmRoll(
  ctx: Ctx,
  assignment: ServiceDuty,
  done: boolean,
  outcome: number,
): { label: string; message: string } {
  const { state, rng } = ctx;
  const service = state.player.service;
  if (!service) return { label: '', message: '' };
  // La qualité du passage protège : c'est le seul endroit où bien jouer
  // sauve la peau plutôt que de rapporter des points.
  const shield = 0.35 + (outcome / 100) * 0.5;
  const exposure = assignment.danger * (done ? 1 : 2) * (1 - shield * 0.8);

  if (!rng.chance(clamp(exposure, 0, 0.85))) return { label: '', message: '' };

  // Une part des accidents est mortelle, et elle grandit avec le danger.
  if (rng.chance(clamp(assignment.danger * 0.22, 0.01, 0.28))) {
    const corps = corpsOf(state);
    killPlayer(ctx, `en ${corps?.dutyName ?? 'mission'}`);
    return { label: 'sans retour', message: '' };
  }

  const years = 1 + (rng.chance(assignment.danger * 0.5) ? 1 : 0);
  service.wounded = true;
  service.sidelinedUntil = state.year + years;
  shiftStats(state, {
    health: -(6 + Math.round(assignment.danger * 16)),
    fitness: -(4 + Math.round(assignment.danger * 10)),
    happiness: -6,
  });
  applyExperience(ctx, 'blessureEnMission');
  return {
    label: 'blessé',
    message: `Tu en es revenu${state.player.sex === 'F' ? 'e' : ''} abîmé${
      state.player.sex === 'F' ? 'e' : ''}. Écarté${
      state.player.sex === 'F' ? 'e' : ''} ${years} an(s).`,
  };
}

/** Laisser le personnage faire, sans jouer. */
export function autoRun(ctx: Ctx): ActionResult {
  const context = dutyContext(ctx.state);
  if (!context) return { ok: false, message: 'Tu n’as pas de mission en cours.' };
  return settleDuty(ctx, autoResolve(ctx.rng, context));
}

/* ------------------------------------------------------------------ */
/* Monter, et sortir                                                   */
/* ------------------------------------------------------------------ */

/**
 * L'avancement.
 *
 * Automatique : on ne demande pas une promotion, on la reçoit quand les deux
 * conditions sont réunies. Un seul échelon par an, pour que la montée se
 * sente.
 */
function promote(ctx: Ctx): void {
  const { state } = ctx;
  const service = state.player.service;
  const next = nextRank(state);
  if (!service || !next) return;
  if (service.standing < next.standing || servedYears(state) < next.years) return;
  service.rankId = next.id;
  ctx.log('work', `Tu passes ${next.label.toLowerCase()}.`, 'good');
  shiftStats(state, { happiness: 5 });

}

/** Les distinctions dues et pas encore reçues. */
export function pendingDecorations(state: GameState): string[] {
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps) return [];
  const rank = rankOf(state);
  const ladder = ranksFor(corps.id);
  const rankIndex = ladder.findIndex((r) => r.id === rank?.id);
  return DECORATIONS.filter((d) => {
    if (d.corps !== corps.id || service.decorations.includes(d.id)) return false;
    const needs = d.needs;
    if (needs.standing !== undefined && service.standing < needs.standing) return false;
    if (needs.duties !== undefined && service.done < needs.duties) return false;
    if (needs.years !== undefined && servedYears(state) < needs.years) return false;
    if (needs.wounded && !service.wounded) return false;
    if (needs.danger !== undefined
      && Number(state.player.flags.serviceTopDanger ?? 0) < needs.danger) return false;
    if (needs.rank !== undefined) {
      const wanted = ladder.findIndex((r) => r.id === needs.rank);
      if (rankIndex < 0 || wanted < 0 || rankIndex < wanted) return false;
    }
    return true;
  }).map((d) => d.id);
}

function awardDecorations(ctx: Ctx): void {
  const { state } = ctx;
  const service = state.player.service;
  if (!service) return;
  for (const id of pendingDecorations(state)) {
    const decoration = DECORATIONS.find((d) => d.id === id);
    if (!decoration) continue;
    service.decorations.push(id);
    ctx.log('work', `${decoration.label} — ${decoration.note}`, 'good');
    shiftStats(state, { happiness: 4 });
  }
}

export function leaveBlocker(state: GameState): string | null {
  const service = state.player.service;
  if (!service) return 'Tu ne sers nulle part.';
  if (service.current) return 'Pas avec une mission sur les bras.';
  if (service.trainingLeft > 0 && servedYears(state) < 1) {
    return 'On ne part pas la première année.';
  }
  return null;
}

/**
 * Quitter.
 *
 * Ce qu'on emporte dépend de ce qu'on laisse : les honneurs et une vraie
 * pension pour qui a servi, un adieu poli pour les autres. Le dossier
 * survit à la sortie — c'est ce qui distingue un ancien de quelqu'un qui n'a
 * jamais servi.
 */
export function leaveService(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  const rank = rankOf(state);
  if (!service || !corps || !rank) return { ok: false, message: 'Tu ne sers nulle part.' };
  const blocker = leaveBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const years = servedYears(state);
  const discharge = dischargeFor(service.standing);
  // La pension se gagne à l'ancienneté autant qu'au mérite : vingt ans de
  // service valent plus que trois années brillantes.
  const pension = Math.round(
    servicePay(state) * discharge.pension * clamp(years / 20, 0.15, 1.4),
  );
  state.player.veteran = {
    corpsId: corps.id,
    rankId: rank.id,
    years,
    duties: service.done,
    decorations: [...service.decorations],
    dischargeId: discharge.id,
    pension,
    wounded: service.wounded,
  };
  state.player.pension += pension;
  state.player.service = null;
  ctx.log('work', `Tu quittes ${corps.house} — ${discharge.label.toLowerCase()}.`,
    discharge.id === 'honneur' ? 'good' : 'neutral');
  applyExperience(ctx, 'finDeService');
  return {
    ok: true,
    title: discharge.label,
    tone: discharge.id === 'reforme' ? 'bad' : 'good',
    message: `${discharge.note} ${years} an(s), ${rank.label.toLowerCase()}, ${
      service.done} ${corps.dutyName}(s). Pension : ${pension} par an.`,
  };
}

/* ------------------------------------------------------------------ */
/* Argent et année                                                     */
/* ------------------------------------------------------------------ */

export function serviceEarnings(state: GameState): number {
  const service = state.player.service;
  return service ? Math.max(0, Math.round(service.earnedThisYear)) : 0;
}

export function clearServiceYear(state: GameState): void {
  if (state.player.service) state.player.service.earnedThisYear = 0;
}

/**
 * Une année de service.
 *
 * L'ordre est celui du calendrier : on finit sa formation, on encaisse la
 * solde, on subit ce que le métier fait à un corps et à une tête, on avance
 * une mission longue, on monte en grade s'il y a lieu, et l'on regarde enfin
 * ce qu'on vous propose.
 */
export function advanceService(ctx: Ctx): void {
  const { state, rng } = ctx;
  const service = state.player.service;
  const corps = corpsOf(state);
  if (!service || !corps) return;

  if (service.trainingLeft > 0) {
    service.trainingLeft -= 1;
    // La formation prépare toute seule : c'est à cela qu'elle sert.
    service.readiness = fine(
      service.readiness + 9 + state.player.traits.discipline * 0.07,
    );
    if (service.trainingLeft === 0) {
      ctx.log('work', `${corps.trainingName.replace(/^./, (c) => c.toUpperCase())} est terminé. Tu es opérationnel.`, 'good');
    }
  }

  service.earnedThisYear += servicePay(state);

  // Ce que le métier prélève, tous les ans, sans qu'il se passe rien.
  shiftStats(state, {
    happiness: -corps.strain * 0.35,
    fitness: service.trainingLeft > 0 ? 2 : 0.5,
  });

  // La mission longue court même sans qu'on y touche : c'est ce qui la rend
  // différente d'une mission d'un an.
  if (service.current && service.current.yearsLeft > 1) {
    service.current.yearsLeft -= 1;
  }

  // Ce qu'on a affronté de pire, pour les distinctions qui le demandent.
  if (service.current) {
    state.player.flags.serviceTopDanger = Math.max(
      Number(state.player.flags.serviceTopDanger ?? 0),
      service.current.danger,
    );
  }

  promote(ctx);
  awardDecorations(ctx);

  // Une maison ne garde pas indéfiniment quelqu'un qui ne fait plus rien.
  if (service.standing < 8 && servedYears(state) > 6 && service.done === 0
    && rng.chance(0.35)) {
    ctx.log('work', `${corps.house.replace(/^./, (c) => c.toUpperCase())} met fin à ton engagement.`, 'bad');
    leaveService(ctx);
    return;
  }

  // L'âge : on ne reste pas en service toute une vie.
  const rank = rankOf(state);
  const ceiling = corps.id === 'armee' ? 60 : corps.id === 'orbite' ? 58 : 62;
  if (state.player.age >= ceiling && !service.current) {
    ctx.log('work', `L’âge te sort de ${corps.house}.`, 'neutral');
    leaveService(ctx);
    return;
  }
  if (!rank) return;

  rollDuties(ctx);
}
