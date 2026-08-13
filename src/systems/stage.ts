/**
 * Les carrières qui se jouent.
 *
 * L'audit classait les cinq métiers de scène `PLACEHOLDER` : « un métier
 * comédien comme un autre ». Il y avait une échelle de salaires et rien
 * derrière. Ce fichier est ce qu'il y a derrière.
 *
 * **Un seul cadre pour cinq métiers.** Comédien, musicien, sportif,
 * mannequin et politique ont la même forme : on passe une épreuve pour être
 * pris, on choisit un engagement parmi ceux qu'on nous propose, on le tient
 * plus ou moins bien, et l'accueil décide de ce qu'on nous proposera ensuite.
 * Écrire cinq systèmes parallèles aurait produit cinq versions médiocres de
 * la même chose.
 *
 * Trois principes.
 *
 * **1. On ne choisit pas ce qu'on veut, on choisit parmi ce qu'on vous
 * propose.** Ce qui arrive sur la table dépend du métier acquis et du nom
 * qu'on s'est fait. Le rôle qui paie le mieux n'est presque jamais celui qui
 * fait le plus pour la suite, et c'est là qu'est l'arbitrage.
 *
 * **2. L'épreuve est jouée.** Chaque engagement se tient devant un public
 * (`minigames/performance.ts`). Le personnage donne de la marge ; le joueur
 * décide s'il ose. Une prestation propre où l'on n'a rien tenté est le pire
 * des résultats — dans ces métiers, passer inaperçu coûte plus cher que
 * rater.
 *
 * **3. Le corps et l'âge comptent.** Un sportif a dix bonnes années, un
 * mannequin moins, un politique n'en a pas de limite. La discipline le dit,
 * et le métier se met à décliner quand le moment arrive.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, GameState, Person, StageState,
} from '../engine/types.ts';
import {
  ACCOLADES, DISCIPLINES, JOB_TEMPLATES, getDiscipline, receptionLabel,
  templatesFor, type Discipline, type JobTemplate,
} from '../data/stage.ts';
import { getCountry } from '../data/countries.ts';
import { autoResolve, blend, type MiniGameContext, type MiniGameResult } from '../engine/minigame.ts';
import { createPerson } from './npc.ts';
import { applyExperience } from './psyche.ts';
import { getLocalOpportunities } from './contexts.ts';
import { sportHeadStart } from './schoolSport.ts';

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function stageOf(state: GameState): StageState | null {
  return state.player.stage;
}

export function disciplineOf(state: GameState): Discipline | null {
  const stage = state.player.stage;
  return stage ? getDiscipline(stage.disciplineId) ?? null : null;
}

/** Comment se situe le personnage dans son métier. */
/**
 * Borne 0-100 **sans arrondir**.
 *
 * `clampStat` arrondit, ce qui convient à une statistique affichée mais pas
 * ici : un engagement peu formateur fait progresser le métier de moins d'un
 * point, et l'arrondi le ramenait à zéro. Le métier stagnait alors pour de
 * bon sur les engagements modestes — exactement ceux par lesquels on commence.
 */
function fine(value: number): number {
  return clamp(value, 0, 100);
}

export function craftLabel(craft: number): string {
  if (craft < 15) return 'Débutant';
  if (craft < 35) return 'On te laisse essayer';
  if (craft < 55) return 'Tu sais faire';
  if (craft < 75) return 'On te réclame';
  if (craft < 90) return 'Une référence';
  return 'On apprend en te regardant';
}

/** Le cachet de référence, à l'échelle du pays et de l'époque. */
export function feeUnit(state: GameState, discipline: Discipline): number {
  const country = getCountry(state.player.countryId);
  return discipline.baseFee * country.salaryIndex * state.world.inflation
    * (0.8 + getLocalOpportunities(state).salary * 0.25);
}

/**
 * Ce que l'âge fait au métier.
 *
 * Un sportif ne décline pas comme un comédien, et un politique ne décline
 * pas du tout. Sans cela, les cinq carrières se joueraient de la même façon
 * à soixante ans qu'à vingt.
 */
export function ageFactor(state: GameState, discipline: Discipline): number {
  const age = state.player.age;
  if (discipline.peakAge === 0) return age < 40 ? 0.82 + age / 220 : 1;
  if (age <= discipline.peakAge) return 1;
  const over = age - discipline.peakAge;
  // La pente dépend du métier : brutale pour le sport, douce ailleurs.
  const slope = discipline.id === 'sport' ? 0.075
    : discipline.id === 'podium' ? 0.055 : 0.022;
  return Math.max(0.12, 1 - over * slope);
}

/* ------------------------------------------------------------------ */
/* Se lancer                                                           */
/* ------------------------------------------------------------------ */

export function disciplineBlocker(state: GameState, discipline: Discipline): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Il faudrait se montrer, et donner son nom.';
  if (p.age < discipline.minAge) return `Il faut avoir ${discipline.minAge} ans.`;
  if (p.stage?.disciplineId === discipline.id) return 'C’est déjà ce que tu fais.';
  if (ageFactor(state, discipline) < 0.25) {
    return 'On ne commence plus ce métier à ton âge.';
  }
  return null;
}

export function availableDisciplines(state: GameState): Discipline[] {
  return DISCIPLINES.filter((d) => disciplineBlocker(state, d) === null);
}

/** Commencer un métier de scène. */
export function startDiscipline(ctx: Ctx, disciplineId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const discipline = getDiscipline(disciplineId);
  if (!discipline) return { ok: false, message: 'Cette discipline n’existe pas.' };
  const blocker = disciplineBlocker(state, discipline);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  if (p.yearActions.stageSwitch) {
    return { ok: false, message: 'Tu as déjà changé de voie cette année.' };
  }
  p.yearActions.stageSwitch = 1;

  const previous = p.stage;
  const stats = p.stats;
  p.stage = {
    disciplineId,
    since: state.year,
    // Ce qu'on vaut au départ vient de ce qu'on est, et un peu de ce qu'on
    // a fait avant : changer de métier ne remet pas tout à zéro.
    //
    // Et pour le sport, dix ans de filière scolaire comptent pleinement : un
    // joueur passé par la sélection de son lycée ne débute pas au même endroit
    // que quelqu'un qui n'a jamais joué. C'est le raccord qui manquait — le
    // catalogue notait « rien ne relie le club du lycée à la sélection ».
    craft: fine(
      stats[discipline.driver] * 0.22 + stats[discipline.second] * 0.1
      + (previous ? previous.craft * 0.2 : 0) + 4
      + (disciplineId === 'sport' ? sportHeadStart(state) : 0),
    ),
    offers: [],
    current: null,
    done: 0,
    bestReception: 0,
    lastReception: 0,
    earnedThisYear: 0,
    agentId: null,
    accolades: [],
    fatigue: 0,
    injuredUntil: 0,
  };
  rollOffers(ctx);
  ctx.log('work', `Tu te lances : ${discipline.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: discipline.label,
    message: previous
      ? `Tu laisses tomber ce que tu faisais. ${discipline.tryoutName}s, refus, et tout à reprendre.`
      : `Personne ne t’attend. Il va falloir passer des ${discipline.tryoutName.toLowerCase()}s.`,
    tone: 'neutral',
  };
}

export function quitDiscipline(ctx: Ctx): ActionResult {
  const p = ctx.state.player;
  if (!p.stage) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const discipline = disciplineOf(ctx.state);
  p.stage = null;
  return {
    ok: true,
    title: 'Tu arrêtes',
    message: `Fini, ${discipline?.label.toLowerCase() ?? 'tout ça'}. Ce que tu as fait reste, mais on cessera vite de t’appeler.`,
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Ce qu'on vous propose                                               */
/* ------------------------------------------------------------------ */

const HOUSES = [
  'une petite maison', 'une équipe qui monte', 'un nom qu’on connaît',
  'une grande maison', 'un projet dont personne ne parle encore',
  'quelqu’un qui te veut depuis longtemps',
];

/** Ce qu'un engagement rapporterait, tout compris. */
export function jobFee(state: GameState, template: JobTemplate): number {
  const discipline = getDiscipline(template.discipline);
  if (!discipline) return 0;
  const stage = state.player.stage;
  const standing = stage ? 0.6 + (stage.craft / 100) * 0.8 : 1;
  // L'agent négocie mieux que vous, et prend sa part ailleurs.
  const agent = agentOf(state) ? 1.18 : 1;
  return Math.round(
    feeUnit(state, discipline) * template.pay * standing * agent
    * ageFactor(state, discipline),
  );
}

/**
 * Les engagements du moment.
 *
 * Ce qui arrive sur la table dépend du métier et du nom. On ne voit pas ce
 * qu'on ne mérite pas encore, et on ne voit plus ce qu'on a dépassé — un
 * comédien connu ne se voit plus proposer de la figuration.
 */
export function rollOffers(ctx: Ctx): void {
  const { state, rng } = ctx;
  const stage = state.player.stage;
  if (!stage) return;
  const discipline = getDiscipline(stage.disciplineId);
  if (!discipline) return;
  const fame = state.player.fame.level;

  const eligible = templatesFor(discipline.id).filter((t) => {
    if (fame < t.minFame) return false;
    // Trop facile pour vous : on cesse de vous le proposer.
    if (t.demands < stage.craft - 42) return false;
    // Hors de portée : on ne vous appelle pas non plus.
    if (t.demands > stage.craft + 26 + (agentOf(state) ? 10 : 0)) return false;
    return true;
  });
  if (eligible.length === 0) { stage.offers = []; return; }

  const count = Math.min(eligible.length, 2 + (agentOf(state) ? 1 : 0)
    + (rng.chance(0.35) ? 1 : 0));
  stage.offers = rng.sample(eligible, count).map((t) => ({
    id: ctx.id('eng'),
    templateId: t.id,
    from: rng.pick(HOUSES),
    fee: jobFee(state, t),
    // La difficulté d'un engagement varie : le même rôle est plus dur avec
    // une équipe qui se cherche.
    difficulty: clampStat(t.demands + rng.float(-9, 12)),
  }));
}

export function templateOf(offerOrJob: { templateId: string }): JobTemplate | undefined {
  return JOB_TEMPLATES.find((t) => t.id === offerOrJob.templateId);
}

export function offerBlocker(state: GameState): string | null {
  const p = state.player;
  if (!p.stage) return 'Tu n’as pas de carrière de ce genre.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.stage.current) return 'Tu as déjà un engagement en cours.';
  if (p.stage.injuredUntil > state.year) return 'Tu n’es pas en état.';
  if (Number(p.yearActions.stageJob ?? 0) >= 2) {
    return 'Tu as déjà pris ce que tu pouvais tenir cette année.';
  }
  return null;
}

/**
 * Accepter un engagement.
 *
 * L'engagement est pris mais pas encore tenu : c'est la prestation qui
 * décidera de ce qu'il vaut. C'est ce décalage qui rend le choix risqué —
 * accepter au-dessus de son niveau paie mieux et se voit davantage.
 */
export function acceptOffer(ctx: Ctx, offerId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const stage = p.stage;
  if (!stage) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const blocker = offerBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const offer = stage.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette proposition n’est plus là.' };
  const template = templateOf(offer);
  if (!template) return { ok: false, message: 'Engagement inconnu.' };

  stage.current = { ...offer };
  stage.offers = stage.offers.filter((o) => o.id !== offerId);
  p.yearActions.stageJob = Number(p.yearActions.stageJob ?? 0) + 1;
  const gap = template.demands - stage.craft;
  return {
    ok: true,
    title: 'C’est signé',
    message: gap > 15
      ? `${template.label} — c’est au-dessus de ton niveau. Si tu tiens, ça change tout ; sinon, on s’en souviendra.`
      : gap < -18
        ? `${template.label} — tu es largement au-dessus. Facile, et personne n’en parlera.`
        : `${template.label}. À ta portée, si tu es bon ce jour-là.`,
    tone: 'neutral',
  };
}

export function declineOffer(ctx: Ctx, offerId: string): ActionResult {
  const stage = ctx.state.player.stage;
  if (!stage) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const offer = stage.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette proposition n’est plus là.' };
  stage.offers = stage.offers.filter((o) => o.id !== offerId);
  return {
    ok: true,
    title: 'Tu passes',
    message: 'Refuser n’est pas gratuit : on appelle quelqu’un d’autre, et parfois on ne rappelle plus.',
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Tenir l'engagement                                                  */
/* ------------------------------------------------------------------ */

/** Le contexte du mini-jeu pour l'engagement en cours. */
export function performanceContext(state: GameState): MiniGameContext | null {
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  if (!stage?.current || !discipline) return null;
  const p = state.player;
  // Le métier acquis compte le plus, la statistique du métier ensuite, la
  // fatigue en retranche.
  const skill = clampStat(
    stage.craft * 0.6 + p.stats[discipline.driver] * 0.25
    + p.stats[discipline.second] * 0.15 - stage.fatigue * 0.25,
  );
  return {
    skill,
    difficulty: stage.current.difficulty,
    mode: 'normal',
    grace: {
      time: 1 + (skill / 100) * 0.35,
      pressure: 1 - (skill / 100) * 0.3,
      tolerance: skill * 0.45,
      insight: skill > 62,
    },
    setup: {
      label: templateOf(stage.current)?.label ?? discipline.jobName,
      lineName: discipline.id === 'musique' ? 'la note'
        : discipline.id === 'jeu' ? 'l’émotion'
          : discipline.id === 'sport' ? 'l’effort'
            : discipline.id === 'podium' ? 'la ligne du corps' : 'le ton',
      beatName: discipline.id === 'musique' ? 'une envolée'
        : discipline.id === 'jeu' ? 'une réplique'
          : discipline.id === 'sport' ? 'une action'
            : discipline.id === 'podium' ? 'un passage' : 'une formule',
    },
  };
}

/**
 * Solder l'engagement en cours à partir d'une prestation.
 *
 * `result` vient du mini-jeu joué, ou d'une simulation. Les deux passent par
 * ici : la simulation ne doit jamais emprunter un chemin plus favorable que
 * le jeu, sans quoi jouer serait une punition.
 */
export function settleJob(ctx: Ctx, result: MiniGameResult): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage?.current || !discipline) {
    return { ok: false, message: 'Aucun engagement en cours.' };
  }
  const job = stage.current;
  const template = templateOf(job);
  if (!template) return { ok: false, message: 'Engagement inconnu.' };
  const context = performanceContext(state);
  if (!context) return { ok: false, message: 'Aucun engagement en cours.' };

  // Ce que vaut la prestation : le métier du personnage pour l'essentiel, ce
  // que le joueur a fait pour le reste.
  const performance = blend(context, result, 0.4);
  // Ce qu'on en dit dépend aussi de ce qu'on en attendait : réussir un rôle
  // facile n'impressionne personne, tenir un rôle trop grand fait un nom.
  const stakes = clamp((template.demands - stage.craft + 30) / 60, 0.55, 1.5);
  const reception = clampStat(performance * 100 * (0.65 + stakes * 0.4)
    + rng.float(-7, 7));

  stage.lastReception = reception;
  stage.bestReception = Math.max(stage.bestReception, reception);
  stage.done += 1;
  stage.current = null;

  // L'argent. Un engagement raté paie quand même : on a signé.
  const paid = Math.round(job.fee * (0.65 + (reception / 100) * 0.5));
  p.money += paid;
  stage.earnedThisYear += Math.max(0, paid);

  // Le métier progresse d'autant plus que l'engagement était exigeant.
  const stretch = clamp((template.demands - stage.craft) / 30 + 1, 0.4, 2.1);
  stage.craft = fine(
    stage.craft + template.growth * stretch * (0.5 + performance * 0.9)
    * (1 - stage.craft / 130),
  );
  stage.fatigue = fine(stage.fatigue + template.toll * 0.55);
  p.stats.stress = clampStat(p.stats.stress + template.toll * 0.4);

  // Le nom. Un engagement bien reçu fait connaître, un engagement raté aussi
  // — mais pas pour les mêmes raisons.
  const fame = template.fame * (0.4 + (reception / 100) * 1.1);
  p.fame.level = clampStat(p.fame.level + fame * (1 - p.fame.level / 135));
  p.fame.peak = Math.max(p.fame.peak, p.fame.level);
  if (p.fame.field === 'aucun' || p.fame.level > 12) p.fame.field = discipline.fameField;
  if (reception < 40) {
    p.fame.controversy = clampStat(p.fame.controversy + template.risk * 22);
    p.fame.goodwill = clampStat(p.fame.goodwill - 5);
  } else if (reception > 72) {
    p.fame.goodwill = clampStat(p.fame.goodwill + 6);
  }
  p.followers += Math.round(discipline.visibility * (reception / 100) * rng.float(90, 900));

  // Le corps, pour les métiers qui l'usent.
  if (discipline.id === 'sport' && rng.chance(clamp(template.toll / 260 + stage.fatigue / 400, 0.02, 0.3))) {
    const months = rng.int(1, 3);
    stage.injuredUntil = state.year + months;
    p.stats.health = clampStat(p.stats.health - rng.int(5, 16));
    ctx.log('health', `Blessure : tu es écarté ${months} an(s).`, 'bad');
  }

  if (discipline.interest) {
    const key = `exposé:${discipline.interest}`;
    p.flags[key] = Math.min(6, Number(p.flags[key] ?? 0) + 1);
  }
  if (reception > 85) applyExperience(ctx, 'grandeRéussite');

  const band = receptionLabel(reception);
  ctx.log('work', `${template.label} — ${band.label.toLowerCase()} (${paid}).`,
    reception > 60 ? 'good' : reception < 42 ? 'bad' : 'neutral');
  return {
    ok: true,
    title: band.label,
    message: `${band.note} Cachet : ${paid}.${result.notes?.length ? ` ${result.notes.join(' ')}` : ''}`,
    tone: reception > 60 ? 'good' : reception < 42 ? 'bad' : 'neutral',
  };
}

/** Tenir l'engagement sans jouer : le résultat suit le niveau du personnage. */
export function autoPerform(ctx: Ctx): ActionResult {
  const context = performanceContext(ctx.state);
  if (!context) return { ok: false, message: 'Aucun engagement en cours.' };
  return settleJob(ctx, autoResolve(ctx.rng, context));
}

/* ------------------------------------------------------------------ */
/* L'agent                                                             */
/* ------------------------------------------------------------------ */

export function agentOf(state: GameState): Person | null {
  const id = state.player.stage?.agentId;
  if (!id) return null;
  const npc = person(state, id);
  return npc?.alive ? npc : null;
}

/** Ce que l'agent prend. */
export function agentCut(state: GameState): number {
  return agentOf(state) ? 0.15 : 0;
}

/**
 * Prendre un agent.
 *
 * Il apporte des propositions qu'on n'aurait pas eues et négocie mieux ; il
 * prend une part de tout. Le calcul n'est favorable qu'au-dessus d'un
 * certain niveau, et c'est au joueur de voir quand.
 */
export function hireAgent(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  if (agentOf(state)) return { ok: false, message: 'Tu en as déjà un.' };
  if (stage.craft < 20) {
    return {
      ok: false,
      title: 'Personne ne te rappelle',
      message: `Aucun ${discipline.agentName.toLowerCase()} ne prend quelqu’un qu’on ne connaît pas encore.`,
    };
  }
  const npc = createPerson(ctx, {
    relation: 'coworker',
    age: rng.int(30, 62),
    withJob: false,
    relationship: rng.int(40, 62),
    opinion: rng.int(45, 70),
  });
  npc.jobTitle = discipline.agentName;
  npc.flags.agent = true;
  stage.agentId = npc.id;
  return {
    ok: true,
    title: `${discipline.agentName} recruté`,
    message: `${fullName(npc)} te représente. Plus de propositions, mieux payées, et quinze pour cent de tout.`,
    tone: 'good',
  };
}

export function dismissAgent(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const stage = state.player.stage;
  if (!stage) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const npc = agentOf(state);
  if (!npc) return { ok: false, message: 'Tu n’as pas d’agent.' };
  stage.agentId = null;
  npc.opinion = clampStat(npc.opinion - 25);
  return {
    ok: true,
    title: 'Séparation',
    message: `${fullName(npc)} ne te représente plus. Le carnet d’adresses part avec lui.`,
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Les récompenses                                                     */
/* ------------------------------------------------------------------ */

/** Les distinctions à portée, non encore obtenues. */
export function pendingAccolades(state: GameState) {
  const stage = state.player.stage;
  if (!stage) return [];
  return ACCOLADES.filter(
    (a) => a.discipline === stage.disciplineId && !stage.accolades.includes(a.id),
  );
}

function awardAccolades(ctx: Ctx): void {
  const { state } = ctx;
  const stage = state.player.stage;
  if (!stage) return;
  for (const accolade of pendingAccolades(state)) {
    const n = accolade.needs;
    if (n.craft !== undefined && stage.craft < n.craft) continue;
    if (n.fame !== undefined && state.player.fame.level < n.fame) continue;
    if (n.jobs !== undefined && stage.done < n.jobs) continue;
    if (n.bestReception !== undefined && stage.bestReception < n.bestReception) continue;
    stage.accolades.push(accolade.id);
    state.player.fame.level = clampStat(state.player.fame.level + accolade.fame);
    state.player.fame.peak = Math.max(state.player.fame.peak, state.player.fame.level);
    state.player.stats.reputation = clampStat(state.player.stats.reputation + 6);
    applyExperience(ctx, 'grandeRéussite');
    ctx.log('work', `${accolade.label}. ${accolade.note}`, 'good');
  }
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/** Ce que la carrière a rapporté, pour l'assiette imposable. */
export function stageEarnings(state: GameState): number {
  const stage = state.player.stage;
  if (!stage) return 0;
  // L'agent prend sa part sur tout ce qui est encaissé.
  return Math.max(0, Math.round(stage.earnedThisYear * (1 - agentCut(state))));
}

export function clearStageYear(state: GameState): void {
  if (state.player.stage) state.player.stage.earnedThisYear = 0;
}

export function advanceStage(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const stage = p.stage;
  if (!stage) return;
  const discipline = getDiscipline(stage.disciplineId);
  if (!discipline) { p.stage = null; return; }

  // L'agent prend sa part au moment du bilan.
  const cut = Math.round(stage.earnedThisYear * agentCut(state));
  if (cut > 0) {
    p.money -= cut;
    ctx.log('money', `${agentOf(state)?.firstName ?? 'Ton agent'} prend sa part : ${cut}.`, 'neutral');
  }

  // Un engagement pris et jamais tenu se solde tout seul, mal.
  if (stage.current) {
    ctx.log('work', 'Tu n’as pas honoré ton engagement. On l’a donné à quelqu’un d’autre.', 'bad');
    stage.current = null;
    stage.craft = fine(stage.craft - 4);
    p.fame.controversy = clampStat(p.fame.controversy + 8);
  }

  if (p.prison) {
    stage.craft = fine(stage.craft - 6);
    stage.offers = [];
    return;
  }

  // Le métier s'entretient : on perd la main quand on ne travaille pas.
  const worked = stage.done > 0 && Number(p.yearActions.stageJob ?? 0) > 0;
  if (!worked) stage.craft = fine(stage.craft - 2.5);
  stage.fatigue = fine(stage.fatigue - 22);
  if (stage.injuredUntil > 0 && state.year >= stage.injuredUntil) stage.injuredUntil = 0;

  // Le corps rattrape ceux dont c'est le métier.
  const decline = ageFactor(state, discipline);
  if (decline < 1) {
    stage.craft = fine(stage.craft - (1 - decline) * 9);
    if (decline < 0.4 && rng.chance(0.3)) {
      ctx.log('work', `On te propose de moins en moins. C’est l’âge, et tout le monde le sait sauf toi.`, 'bad');
    }
  }

  awardAccolades(ctx);
  rollOffers(ctx);
  if (stage.offers.length === 0 && rng.chance(0.4)) {
    ctx.log('work', 'Le téléphone n’a pas sonné cette année.', 'bad');
  }
}
