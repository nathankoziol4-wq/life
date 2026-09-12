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

import { Rng, clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { agreed, fullName, person, they } from '../engine/context.ts';
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
import { advanceRecords } from './records.ts';
import {
  addToBook, advanceCasting, bookStrength, consumeTryoutBonus,
} from './casting.ts';

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
    crewIds: [],
    tryout: null,
    book: [],
    releases: [],
    tour: null,
    deal: null,
    coachId: null,
    cohesion: 55,
    contract: null,
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
  // Et de ceux qui jouent avec vous. C'est ce qui sépare un métier collectif
  // d'un métier solitaire une fois qu'on est dedans : un musicien de groupe ne
  // vaut que ce que vaut son groupe, un mannequin est seul devant l'objectif.
  const crew = (crewQuality(state) - 50) * discipline.crewWeight * 0.35;
  const reception = clampStat(performance * 100 * (0.65 + stakes * 0.4)
    + crew + rng.float(-7, 7));

  stage.lastReception = reception;
  stage.bestReception = Math.max(stage.bestReception, reception);
  stage.done += 1;
  stage.current = null;

  // L'argent. Un engagement raté paie quand même : on a signé. Et l'entourage
  // prend sa part de chaque cachet — un grand groupe joue mieux et laisse
  // moins.
  const paid = Math.round(
    job.fee * (0.65 + (reception / 100) * 0.5) * (1 - crewCut(state)),
  );
  p.money += paid;
  stage.earnedThisYear += Math.max(0, paid);

  // Ce qu'un rôle décroché à l'essai vaut de plus. Consommé ici : un rôle
  // pris contre son type ne rend pas tous les suivants exceptionnels.
  const won = consumeTryoutBonus(state);

  // Le métier progresse d'autant plus que l'engagement était exigeant.
  const stretch = clamp((template.demands - stage.craft) / 30 + 1, 0.4, 2.1);
  stage.craft = fine(
    stage.craft + template.growth * stretch * won.growth * (0.5 + performance * 0.9)
    * (1 - stage.craft / 130),
  );
  stage.fatigue = fine(stage.fatigue + template.toll * 0.55);
  p.stats.stress = clampStat(p.stats.stress + template.toll * 0.4);

  // Le nom. Un engagement bien reçu fait connaître, un engagement raté aussi
  // — mais pas pour les mêmes raisons.
  const fame = template.fame * (0.4 + (reception / 100) * 1.1) * won.worth;
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

  // Le book : ce qu'un engagement laisse à montrer. La table décide de ce qui
  // produit une image et de ce que ça vaut ; ici on se contente de le poser.
  addToBook(state, template.id, reception);

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
  // Au podium, on ne se présente pas les mains vides : une agence regarde le
  // book avant de regarder la personne. C'est le seul métier où la porte
  // s'ouvre sur ce qu'on peut montrer plutôt que sur ce qu'on a déjà fait.
  if (discipline.id === 'podium' && bookStrength(state) < 18) {
    return {
      ok: false,
      title: 'Reviens avec des images',
      message: 'Une agence regarde le book avant de regarder la personne, et le tien est presque vide.',
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
/* Les gens avec qui on exerce                                         */
/* ------------------------------------------------------------------ */

/**
 * L'entourage.
 *
 * Le catalogue relevait deux manques qui n'en font qu'un : « ni auditions de
 * musiciens, ni répétitions, ni départs » et « aucun vestiaire, aucun
 * entraîneur ». On exerçait cinq métiers collectifs entièrement seul, avec
 * pour seul autre humain un agent qui négociait des chiffres.
 *
 * Un seul système pour les cinq, comme le mini-jeu : ce sont les mêmes gens
 * sous des noms différents — un groupe, une équipe, une troupe, un cabinet.
 *
 * Trois choses le rendent autre chose qu'un carnet d'adresses.
 *
 * **1. Ils comptent, et inégalement.** `crewWeight` dit combien : un musicien
 * de groupe ne vaut que ce que vaut son groupe, un mannequin est seul devant
 * l'objectif. C'est ce qui distingue les cinq métiers une fois qu'on est
 * dedans.
 *
 * **2. Ils s'en vont.** Quelqu'un de bon qu'on ne fait pas jouer part ailleurs ;
 * un groupe qui ne s'entend plus se défait. On ne garde pas les gens en les
 * recrutant, on les garde en travaillant.
 *
 * **3. Ils coûtent.** Chacun prend sa part du cachet. Un grand groupe joue
 * mieux et laisse moins.
 */

/** Ce que quelqu'un vaut, et ce qu'il fait au reste du groupe. */
export interface CrewMember {
  person: Person;
  /** Niveau propre, 0-100. */
  level: number;
  /** Ce qu'il apporte à l'entente du groupe, -1 à +1. */
  temper: number;
  /** Années passées ensemble. */
  years: number;
}

export function crewOf(state: GameState): CrewMember[] {
  const stage = state.player.stage;
  if (!stage) return [];
  return stage.crewIds
    .map((id) => person(state, id))
    .filter((x): x is Person => Boolean(x?.alive))
    .map((npc) => ({
      person: npc,
      level: Number(npc.flags.crewLevel ?? 40),
      temper: Number(npc.flags.crewTemper ?? 0),
      years: Number(npc.flags.crewYears ?? 0),
    }));
}

export function coachOf(state: GameState): Person | null {
  const id = state.player.stage?.coachId;
  if (!id) return null;
  const npc = person(state, id);
  return npc?.alive ? npc : null;
}

/**
 * Ce que le groupe apporte à une prestation, 0-100.
 *
 * Le niveau moyen, corrigé par l'entente : cinq très bons musiciens qui se
 * détestent jouent moins bien que trois moyens qui s'écoutent. Un groupe
 * incomplet vaut moins qu'un groupe au complet, parce qu'il manque quelqu'un.
 */
export function crewQuality(state: GameState): number {
  const discipline = disciplineOf(state);
  const stage = state.player.stage;
  if (!discipline || !stage) return 50;
  const members = crewOf(state);
  if (members.length === 0) return 30;
  const level = members.reduce((s, m) => s + m.level, 0) / members.length;
  // Les places vides comptent : on ne joue pas à trois ce qui se joue à cinq.
  const complete = Math.min(1, members.length / Math.max(1, discipline.crewSize));
  const coach = coachOf(state) ? 8 : 0;
  return clampStat(
    level * (0.55 + complete * 0.35) + (stage.cohesion - 50) * 0.25 + coach,
  );
}

/** Ce que l'entourage prend sur chaque cachet. */
export function crewCut(state: GameState): number {
  const discipline = disciplineOf(state);
  if (!discipline) return 0;
  const heads = crewOf(state).length + (coachOf(state) ? 1 : 0);
  // Un grand groupe joue mieux et laisse moins : c'est tout l'arbitrage.
  return clamp(heads * discipline.crewWeight * 0.06, 0, 0.45);
}

/* --- Recruter --- */

export function recruitBlocker(state: GameState): string | null {
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return 'Tu n’as pas de carrière de ce genre.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (crewOf(state).length >= discipline.crewSize) {
    return `${discipline.crewName} est au complet.`;
  }
  if (Number(p.yearActions.crewHire ?? 0) >= 2) {
    return 'Tu as déjà passé assez d’auditions cette année.';
  }
  return null;
}

/**
 * Les gens qui se présentent.
 *
 * Trois profils, et l'arbitrage est toujours le même : quelqu'un de bon qui
 * tire le groupe vers le haut et l'use, ou quelqu'un de moyen qui le tient
 * ensemble. Ce que vaut ce qui se présente dépend du nom qu'on s'est fait —
 * on n'auditionne pas les mêmes gens à vingt de métier qu'à quatre-vingts.
 */
/**
 * Les trois étages d'une audition, en écart au niveau qu'on peut espérer.
 *
 * En dessous : quelqu'un de moyen, facile, qui tient le groupe. Au-dessus :
 * quelqu'un de meilleur que vous, qui tire tout le monde vers le haut et use
 * tout le monde. Entre les deux, un choix sans relief — il en faut un.
 */
const CANDIDATE_TIERS = [-16, -2, 14];

export function crewCandidates(
  state: GameState,
  seed: number,
): { id: string; level: number; temper: number; note: string }[] {
  // Un tirage local, pas celui de la partie : consulter qui se présente ne
  // doit pas décaler le hasard de la sauvegarde. Rien n'est décidé ici.
  const rng = new Rng({ rngState: seed >>> 0 });
  const stage = state.player.stage;
  if (!stage) return [];
  const reach = stage.craft * 0.5 + state.player.fame.level * 0.35 + 20;
  const out: { id: string; level: number; temper: number; note: string }[] = [];
  for (let i = 0; i < 3; i++) {
    // Trois profils étagés, et non trois tirages autour de la même moyenne.
    // Tirés indépendamment, ils sortaient tous les trois du même côté : à
    // soixante-dix de métier, les trois candidats étaient excellents et les
    // trois insupportables, et l'arbitrage annoncé n'existait plus.
    const level = clampStat(reach + CANDIDATE_TIERS[i] + rng.float(-5, 5));
    // Le caractère se lit par rapport à ce qu'on peut espérer, pas dans
    // l'absolu : celui qui vous dépasse se fait payer en patience, et cela
    // reste vrai à quatre-vingts de métier comme à vingt.
    const temper = clamp((reach - level) / 22 + rng.float(-0.3, 0.3), -1, 1);
    out.push({
      id: `cand_${i}`,
      level,
      temper,
      note: temper > 0.25 ? 'S’entend avec tout le monde'
        : temper < -0.25 ? 'Difficile, et le sait'
          : 'Ni facile ni pénible',
    });
  }
  return out.sort((a, b) => b.level - a.level);
}

/** Faire entrer quelqu'un. */
export function recruit(ctx: Ctx, level: number, temper: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const blocker = recruitBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.crewHire = Number(p.yearActions.crewHire ?? 0) + 1;

  // Quelqu'un de bien meilleur que vous ne vous suit pas : il a mieux à faire.
  if (level > stage.craft + 22 && !rng.chance(0.25)) {
    return {
      ok: false, title: 'Il a dit non', tone: 'bad',
      message: `À ce niveau-là, on ne rejoint pas ${discipline.crewName}. Pas la tienne, en tout cas.`,
    };
  }

  const npc = createPerson(ctx, {
    relation: 'coworker',
    age: state.player.age + rng.int(-6, 8),
    withJob: false,
    relationship: rng.int(42, 66),
    opinion: rng.int(45, 70),
  });
  npc.jobTitle = discipline.crewRole;
  npc.flags.crewLevel = Math.round(level);
  npc.flags.crewTemper = Math.round(temper * 100) / 100;
  npc.flags.crewYears = 0;
  stage.crewIds.push(npc.id);
  stage.cohesion = clampStat(stage.cohesion + temper * 8 - 4);
  ctx.log('work', `${fullName(npc)} rejoint ${discipline.crewName}.`, 'good');
  return {
    ok: true,
    title: `${discipline.crewRole} recruté`,
    message: `${fullName(npc)} entre dans ${discipline.crewName}. ${
      temper < -0.25
        ? `${they(npc) === 'elle' ? 'Elle' : 'Il'} est ${agreed(npc, 'bon')}. Il faudra ${
          npc.sex === 'F' ? 'la' : 'le'} supporter.`
        : 'Reste à jouer ensemble.'}`,
    tone: 'good',
  };
}

export function dismissMember(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const npc = person(state, personId);
  if (!npc || !stage.crewIds.includes(personId)) {
    return { ok: false, message: 'Cette personne n’en fait pas partie.' };
  }
  stage.crewIds = stage.crewIds.filter((id) => id !== personId);
  npc.opinion = clampStat(npc.opinion - 30);
  npc.relationship = clampStat(npc.relationship - 20);
  // Écarter quelqu'un se voit, et le reste du groupe le sait.
  stage.cohesion = clampStat(stage.cohesion - 10);
  return {
    ok: true,
    title: 'Tu l’écartes',
    message: `${fullName(npc)} ne fait plus partie de ${discipline.crewName}. Les autres l’ont vu.`,
    tone: 'neutral',
  };
}

/* --- Travailler ensemble --- */

export function rehearseBlocker(state: GameState): string | null {
  const p = state.player;
  const stage = p.stage;
  if (!stage) return 'Tu n’as pas de carrière de ce genre.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (crewOf(state).length === 0) return 'Il n’y a personne avec qui travailler.';
  if (Number(p.yearActions.crewWork ?? 0) >= 2) {
    return 'Vous avez déjà passé assez d’heures ensemble cette année.';
  }
  return null;
}

/**
 * Répéter, s'entraîner, préparer.
 *
 * La seule façon de garder les gens : on ne les retient pas en les
 * recrutant. Ça monte l'entente, ça fait progresser les autres, et ça prend
 * du temps qu'on n'a pas.
 */
export function rehearse(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const blocker = rehearseBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.crewWork = Number(p.yearActions.crewWork ?? 0) + 1;

  const members = crewOf(state);
  const lead = coachOf(state) ? 1.5 : 1;
  stage.cohesion = clampStat(stage.cohesion + rng.float(5, 12) * lead);
  for (const member of members) {
    // Ils progressent d'autant plus qu'ils sont loin de votre niveau : on
    // apprend en jouant avec meilleur que soi.
    const gap = clamp((stage.craft - member.level) / 40, -0.5, 1.2);
    member.person.flags.crewLevel = clampStat(member.level + (0.8 + gap) * rng.float(0.6, 1.8));
    member.person.relationship = clampStat(member.person.relationship + rng.float(1, 4));
  }
  p.stats.stress = clampStat(p.stats.stress + rng.float(2, 6));
  stage.fatigue = fine(stage.fatigue + 5);
  return {
    ok: true,
    title: 'Vous avez travaillé',
    message: stage.cohesion > 75
      ? `${discipline.crewName} tourne. Ça s’entend.`
      : `Des heures ensemble. C’est comme ça que ça se construit.`,
    tone: 'good',
  };
}

/* --- Celui qui dirige --- */

export function coachBlocker(state: GameState): string | null {
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return 'Tu n’as pas de carrière de ce genre.';
  if (coachOf(state)) return 'Tu en as déjà un.';
  if (crewOf(state).length < 2) return `Il faut d’abord réunir ${discipline.crewName}.`;
  if (stage.craft < 30) return 'Personne ne prend en main un projet qui n’existe pas encore.';
  return null;
}

export function hireCoach(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const blocker = coachBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const npc = createPerson(ctx, {
    relation: 'boss',
    age: rng.int(38, 66),
    withJob: false,
    relationship: rng.int(40, 60),
    opinion: rng.int(45, 70),
  });
  npc.jobTitle = discipline.coachName;
  npc.flags.coach = true;
  stage.coachId = npc.id;
  stage.cohesion = clampStat(stage.cohesion + 6);
  return {
    ok: true,
    title: `${discipline.coachName} recruté`,
    message: `${fullName(npc)} prend ${discipline.crewName} en main. Vous progresserez plus vite, et il prendra sa part.`,
    tone: 'good',
  };
}


/* ------------------------------------------------------------------ */
/* L'engagement pluriannuel                                            */
/* ------------------------------------------------------------------ */

/**
 * S'attacher à une maison pour plusieurs années.
 *
 * Le catalogue notait : « chaque saison est un engagement isolé ». On ne
 * pouvait ni s'installer quelque part, ni s'y enfermer — donc rien à
 * arbitrer. Un contrat garantit un cachet chaque année et **interdit de
 * prendre mieux ailleurs** : c'est la sécurité contre la liberté, et le bon
 * choix dépend de ce qu'on croit valoir bientôt.
 */
export function contractOffer(state: GameState): { from: string; yearly: number; years: number } | null {
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline || stage.contract) return null;
  // On ne propose un contrat qu'à quelqu'un qu'on veut garder.
  if (stage.craft < 45 || stage.done < 4) return null;
  const years = stage.craft > 70 ? 4 : 3;
  // Le garanti est en dessous de ce qu'on toucherait au coup par coup : c'est
  // le prix de la sécurité, et c'est ce qui rend le choix réel.
  const yearly = Math.round(
    feeUnit(state, discipline) * (0.6 + stage.craft / 90) * ageFactor(state, discipline) * 0.82,
  );
  return { from: 'une maison qui te veut', yearly, years };
}

export function signContract(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const stage = state.player.stage;
  const discipline = disciplineOf(state);
  const offer = contractOffer(state);
  if (!stage || !discipline) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  if (!offer) return { ok: false, title: 'Rien sur la table', message: 'Personne ne te propose de t’attacher.' };
  stage.contract = {
    from: offer.from, yearly: offer.yearly, yearsLeft: offer.years, total: offer.years,
  };
  ctx.log('work', `Tu signes pour ${offer.years} ans.`, 'neutral');
  return {
    ok: true,
    title: `${offer.years} ans`,
    message: `Tu es payé quoi qu’il arrive. Et si tu exploses d’ici là, tu le seras au même tarif.`,
    tone: 'neutral',
  };
}

export function breakContract(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const stage = p.stage;
  if (!stage?.contract) return { ok: false, message: 'Tu n’es engagé nulle part.' };
  // Partir avant terme se paie : l'indemnité, et ce que ça dit de vous.
  const penalty = Math.round(stage.contract.yearly * stage.contract.yearsLeft * 0.55);
  p.money -= penalty;
  p.fame.controversy = clampStat(p.fame.controversy + 9);
  stage.contract = null;
  return {
    ok: true,
    title: 'Tu romps',
    message: `Il faut payer pour partir : ${penalty}. Et on retiendra que tu es parti.`,
    tone: 'bad',
  };
}

function advanceContract(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const stage = p.stage;
  if (!stage?.contract) return;
  // Le garanti tombe, qu'on ait joué ou non. C'est tout l'intérêt d'un
  // contrat, et tout son coût.
  p.money += stage.contract.yearly;
  stage.earnedThisYear += stage.contract.yearly;
  stage.contract.yearsLeft -= 1;
  if (stage.contract.yearsLeft <= 0) {
    ctx.log('work', 'Ton contrat arrive à son terme. Tu es libre.', 'neutral');
    stage.contract = null;
  }
}

/* ------------------------------------------------------------------ */
/* Ce que devient l'entourage                                          */
/* ------------------------------------------------------------------ */

/**
 * Une année avec les autres.
 *
 * Ils vieillissent ensemble, ou se défont. Deux départs possibles, et ils ne
 * disent pas la même chose : on **perd** quelqu'un de bon qu'on ne fait pas
 * jouer, et on **use** un groupe qu'on ne fait pas travailler.
 */
function advanceCrew(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);
  if (!stage || !discipline) return;

  // L'entente retombe quand rien ne l'entretient : c'est ce qui oblige à y
  // consacrer du temps plutôt qu'à recruter une fois pour toutes.
  const worked = Number(p.yearActions.crewWork ?? 0) > 0;
  stage.cohesion = clampStat(stage.cohesion + (worked ? 0 : -7)
    + crewOf(state).reduce((s, m) => s + m.temper, 0) * 1.5);

  for (const member of crewOf(state)) {
    member.person.flags.crewYears = member.years + 1;
    // Quelqu'un de meilleur que la maison finit par partir ailleurs.
    const outgrown = member.level > stage.craft + 18;
    const unhappy = stage.cohesion < 30;
    const leaves = (outgrown && rng.chance(0.28))
      || (unhappy && rng.chance(0.22))
      || rng.chance(0.03);
    if (!leaves) continue;
    stage.crewIds = stage.crewIds.filter((id) => id !== member.person.id);
    member.person.flags.crewLevel = 0;
    ctx.log('work',
      outgrown
        ? `${fullName(member.person)} part pour mieux. On ne le retient pas.`
        : `${fullName(member.person)} s’en va. ${discipline.crewName} se défait.`,
      'bad');
  }

  // Celui qui dirige s'en va aussi si plus personne ne le suit.
  if (stage.coachId && crewOf(state).length === 0) {
    const coach = coachOf(state);
    stage.coachId = null;
    if (coach) ctx.log('work', `${fullName(coach)} n’a plus personne à diriger.`, 'neutral');
  }
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

  advanceCrew(ctx);
  advanceContract(ctx);
  // Le catalogue : ce qu'on a enregistré vit après avoir été enregistré, et
  // continue de payer. Avant les distinctions, parce qu'un numéro un compte
  // pour les obtenir.
  advanceRecords(ctx);
  // L'essai qu'on n'est pas allé passer s'efface, et le book vieillit.
  advanceCasting(ctx);
  awardAccolades(ctx);
  rollOffers(ctx);
  if (stage.offers.length === 0 && rng.chance(0.4)) {
    ctx.log('work', 'Le téléphone n’a pas sonné cette année.', 'bad');
  }
}
