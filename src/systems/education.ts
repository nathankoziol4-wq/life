/**
 * Système scolaire : progression automatique dans les cycles, notes,
 * redoublement, diplômes, et actions du joueur (§9, §10).
 */

import { clampStat, toward } from '../engine/rng.ts';
import { computeGrade, scholarshipChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { createPerson } from './npc.ts';
import type { ActionResult, Degree, EducationLevel, EducationStage, GameState, StatKey } from '../engine/types.ts';
import { getCountry } from '../data/countries.ts';
import { SCHOOL_NAMES, UNIVERSITY_NAMES } from '../data/names.ts';
import { GRADUATE_PROGRAMS, MAJORS, VOCATIONAL_COURSES, getMajor } from '../data/degrees.ts';
import { buildSchool, SCHOOL_MAP, schoolName, schoolWeights } from '../data/schools.ts';
import { buildSchoolClass } from './school.ts';
import { buildCohort, graduateCohort } from './cohort.ts';
import { peopleByRelation } from '../engine/context.ts';
import { cognitiveCeilingOf, shiftStats } from './stats.ts';
import { advanceClubs, settleSchoolYear } from './schoolActions.ts';
import { applyExperience } from './psyche.ts';
import { getEducationContext, getPsycheContext, invalidateContexts } from './contexts.ts';
import { nationalIncome } from './originGen.ts';
import { hasSportScholarship } from './schoolSport.ts';
import { vowActive } from './vows.ts';
import { examDue, openExam, resetMarks, updateMarks } from './exams.ts';

interface StageDef {
  stage: EducationStage;
  label: string;
  startAge: number;
  length: number;
  difficulty: number;
}

/** Cycles obligatoires, enchaînés automatiquement. */
export const SCHOOL_STAGES: StageDef[] = [
  { stage: 'nursery', label: 'Maternelle', startAge: 3, length: 3, difficulty: 0.7 },
  { stage: 'primary', label: 'École primaire', startAge: 6, length: 5, difficulty: 0.85 },
  { stage: 'middle', label: 'Collège', startAge: 11, length: 4, difficulty: 1.0 },
  { stage: 'high', label: 'Lycée', startAge: 15, length: 3, difficulty: 1.2 },
];

export const STAGE_LABELS: Record<EducationStage, string> = {
  none: 'Aucune scolarité',
  nursery: 'Maternelle',
  primary: 'École primaire',
  middle: 'Collège',
  high: 'Lycée',
  university: 'Université',
  graduate: 'Cycle supérieur',
  vocational: 'Formation professionnelle',
  graduated: 'Études terminées',
  dropout: 'Études abandonnées',
};

export const CLUBS = [
  { id: 'theatre', name: 'Théâtre', emoji: '🎭', effects: { happiness: 6, reputation: 5, intelligence: 2 } },
  { id: 'chess', name: 'Club d’échecs', emoji: '♟️', effects: { intelligence: 7, discipline: 4, reputation: -1 } },
  { id: 'sport', name: 'Association sportive', emoji: '🏅', effects: { fitness: 9, health: 3, reputation: 4 } },
  { id: 'music', name: 'Orchestre', emoji: '🎻', effects: { intelligence: 4, discipline: 6, happiness: 5 } },
  { id: 'debate', name: 'Club de débat', emoji: '🗣️', effects: { intelligence: 6, reputation: 6, discipline: 3 } },
  { id: 'journal', name: 'Journal du lycée', emoji: '📰', effects: { intelligence: 5, reputation: 5, discipline: 3 } },
  { id: 'science', name: 'Club scientifique', emoji: '🔬', effects: { intelligence: 8, discipline: 4 } },
  { id: 'volunteer', name: 'Association caritative', emoji: '🤝', effects: { karma: 9, happiness: 4, reputation: 4 } },
];

function schoolNameFor(ctx: Ctx, stage: EducationStage): string {
  const school = ctx.state.player.origin.school;
  if (school) return schoolName(school.archetypeId, stage, (arr) => ctx.rng.pick(arr));
  const base = ctx.rng.pick(SCHOOL_NAMES);
  switch (stage) {
    case 'nursery': return `Maternelle ${base}`;
    case 'primary': return `École ${base}`;
    case 'middle': return `Collège ${base}`;
    case 'high': return `Lycée ${base}`;
    default: return base;
  }
}

/**
 * À chaque changement de cycle, l'établissement est reconstruit à partir du
 * quartier *actuel*. Un déménagement entre le collège et le lycée change donc
 * réellement d'école — c'est l'un des leviers de mobilité sociale du jeu.
 */
function refreshSchool(ctx: Ctx, stage: EducationStage): void {
  const { state, rng } = ctx;
  const o = state.player.origin;
  const country = getCountry(state.player.countryId);
  const income = nationalIncome(country);
  const rurality = Math.max(0, Math.min(100, 100 - o.city.density * 0.6 - o.neighborhood.density * 0.4));

  const weights = schoolWeights({
    educationAccess: o.neighborhood.educationAccess,
    schoolQuality: o.neighborhood.schoolQuality,
    incomeRatio: Math.max(0, o.finance.disposableIncome) / income,
    schoolValue: o.values.school,
    rurality,
    countryEducation: country.education,
  });
  // On reste dans le même établissement quand c'est possible : changer d'école
  // à chaque cycle sans raison n'aurait aucun sens.
  const keep = o.school && weights.some((w) => w.id === o.school!.archetypeId) && rng.chance(0.72);
  const archetypeId = keep ? o.school!.archetypeId : rng.weighted(weights, (w) => w.weight).id;

  o.school = buildSchool({
    archetypeId,
    stage,
    name: schoolName(archetypeId, stage, (arr) => rng.pick(arr)),
    neighborhoodQuality: o.neighborhood.schoolQuality,
    countryEducation: country.education,
    nationalIncome: income,
    jitter: (spread) => rng.float(-spread, spread),
    roll: (a, b) => rng.float(a, b),
    clubs: rollOfferedClubs(ctx, archetypeId),
  });
  // Nouvelle école, nouvelle classe : les camarades ne suivent pas.
  o.schoolClass = buildSchoolClass(ctx, `${stage}_${state.year}`);
  invalidateContexts(state);
}

/**
 * Clubs réellement proposés par l'établissement cette année.
 *
 * Un petit lycée rural n'a ni orchestre ni club scientifique. La liste est
 * tirée une fois par établissement, pas à chaque affichage.
 */
function rollOfferedClubs(ctx: Ctx, archetypeId: string): string[] {
  const { rng } = ctx;
  const a = SCHOOL_MAP[archetypeId];
  const richness = (a?.clubs ?? 45) / 100;
  return CLUBS.filter(() => rng.chance(0.15 + richness * 0.75)).map((c) => c.id);
}

/** Étape scolaire attendue pour un âge donné (cycles obligatoires). */
function stageForAge(age: number): StageDef | null {
  for (let i = SCHOOL_STAGES.length - 1; i >= 0; i--) {
    const s = SCHOOL_STAGES[i];
    if (age >= s.startAge && age < s.startAge + s.length) return s;
  }
  return null;
}

function difficultyOf(ctx: Ctx): number {
  const edu = ctx.state.player.education;
  if (edu.stage === 'university' || edu.stage === 'graduate') {
    const major = getMajor(edu.majorId);
    return 1.35 * (major?.difficulty ?? 1);
  }
  if (edu.stage === 'vocational') return 1.05;
  return SCHOOL_STAGES.find((s) => s.stage === edu.stage)?.difficulty ?? 1;
}

/** Progression annuelle. Appelée par le moteur à chaque passage d'année. */
export function advanceEducation(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const edu = p.education;

  // Un séjour en prison suspend la scolarité.
  if (p.prison) return;

  // Entrée automatique dans le cycle obligatoire suivant.
  if (edu.stage === 'none' || SCHOOL_STAGES.some((s) => s.stage === edu.stage)) {
    const expected = stageForAge(p.age);
    const currentIsSchool = SCHOOL_STAGES.some((s) => s.stage === edu.stage);
    if (expected && (!currentIsSchool || edu.stage !== expected.stage)) {
      if (!currentIsSchool || edu.yearInStage >= edu.stageLength) {
        enterStage(ctx, expected);
      }
    }
  }

  if (edu.stage === 'none' || edu.stage === 'graduated' || edu.stage === 'dropout') return;

  edu.yearInStage += 1;
  const env = getEducationContext(state);
  const base = computeGrade({
    intelligence: p.stats.intelligence,
    discipline: p.stats.discipline,
    effort: edu.effort,
    absences: edu.absences,
    happiness: p.stats.happiness,
    stress: p.stats.stress,
    difficulty: difficultyOf(ctx),
  });
  // L'établissement, le logement et les parents ajoutent (ou retirent)
  // quelques points chaque année. Modeste sur un an, décisif sur douze.
  const grade = Math.max(0, Math.min(20, base + env.gradeBonus));
  edu.grades = edu.yearInStage <= 1 ? grade : Math.round((edu.grades * 0.55 + grade * 0.45) * 10) / 10;
  p.flags.gradeExplain = env.explain;
  // Le bulletin, matière par matière. La moyenne reste ce qu'elle était — tout
  // le jeu la lit — mais elle devient un résumé plutôt que la seule vérité.
  updateMarks(ctx, edu.grades);
  // Une session s'ouvre quand le cycle se termine. Le solde des sessions en
  // attente, lui, vit dans `simulateYear` : `advanceEducation` sort tôt pour
  // qui a quitté l'école, et une session laissée ouverte le jour du départ
  // n'aurait jamais été soldée.
  if (examDue(state)) openExam(ctx);

  // L'école fait progresser l'intelligence, d'autant plus qu'on s'investit.
  const country = getCountry(p.countryId);
  const gain = (edu.effort === 'hard' ? 3.4 : edu.effort === 'none' ? 0.3 : 1.9)
    * (0.6 + country.education * 0.8)
    * env.effortMultiplier
    * getPsycheContext(state).studyEffect
    * (1 + env.gradeBonus / 14);
  // Vers *son* plafond, pas vers 100 : l'école développe quelqu'un, elle ne
  // le remplace pas.
  p.stats.intelligence = toward(p.stats.intelligence, cognitiveCeilingOf(state), gain);
  if (edu.effort === 'hard') {
    p.stats.stress = clampStat(p.stats.stress + 5);
    p.stats.discipline = clampStat(p.stats.discipline + 2);
  } else if (edu.effort === 'none') {
    p.stats.discipline = clampStat(p.stats.discipline - 3);
  }
  // Un établissement exigeant use, un établissement sans pression laisse filer.
  if (SCHOOL_STAGES.some((s) => s.stage === edu.stage)) {
    p.stats.stress = clampStat(p.stats.stress + env.pressure);
  }
  edu.absences = 0;

  advanceClubs(ctx);
  settleSchoolYear(ctx);

  // Une exclusion définitive coupe la scolarité là où elle en est : soit un
  // autre établissement accepte l'élève, soit le parcours s'arrête.
  if (edu.discipline.expelled) {
    edu.discipline.expelled = false;
    if (p.age < 16 || ctx.rng.chance(0.55)) {
      ctx.log('school', 'Un autre établissement a fini par t’accepter.', 'neutral');
      enterStage(ctx, SCHOOL_STAGES.find((x) => x.stage === edu.stage) ?? SCHOOL_STAGES[0]);
    } else {
      edu.stage = 'dropout';
      edu.schoolName = null;
      p.stats.happiness = clampStat(p.stats.happiness - 8);
      ctx.log('school', 'Aucun établissement n’a voulu te reprendre.', 'bad');
      return;
    }
  }

  // Décrochage : les mauvaises notes seules n'y suffisent pas, il faut aussi
  // un contexte qui ne rattrape pas — c'est là que l'environnement pèse.
  if (edu.stage === 'high' && edu.grades < 8.5 && p.age >= 16) {
    const risk = 0.05 * env.dropoutRisk * (1 + (8.5 - edu.grades) / 6);
    if (ctx.rng.chance(Math.min(0.3, risk))) {
      edu.stage = 'dropout';
      edu.schoolName = null;
      p.stats.happiness = clampStat(p.stats.happiness - 6);
      ctx.log('school', 'Tu as quitté le lycée sans le terminer.', 'bad');
      return;
    }
  }

  // Redoubler, avant la fin de cycle : c'est ce qui manquait pour qu'un
  // mauvais dossier ait une suite. Sans cela, on pouvait traverser douze ans
  // d'école à 4/20 et sortir en même temps que tout le monde.
  if (repeatYear(ctx)) return;

  // Fin de cycle.
  if (edu.yearInStage >= edu.stageLength) {
    completeStage(ctx);
  } else if (edu.yearInStage === 1) {
    ctx.log('school', `Tu es entré${p.sex === 'F' ? 'e' : ''} à ${edu.schoolName}.`, 'neutral');
  }
}

/**
 * Décide si l'année est à refaire, et la refait.
 *
 * Ce qui pèse : la moyenne d'abord, l'assiduité ensuite, et surtout ce que
 * l'établissement fait des élèves en difficulté. Un établissement qui
 * accompagne fait passer ; un établissement débordé laisse redoubler. C'est
 * la même inégalité que partout ailleurs ici, et elle se paie en années.
 *
 * Redoubler n'est pas seulement une année de plus : la classe monte sans
 * vous, et les camarades qu'on avait ne sont plus là.
 */
function repeatYear(ctx: Ctx): boolean {
  const { state, rng } = ctx;
  const p = state.player;
  const edu = p.education;
  const school = p.origin.school;
  // Ni en maternelle — on n'y redouble pas — ni dans le supérieur, où l'échec
  // prend d'autres formes déjà gérées ailleurs.
  if (edu.stage !== 'primary' && edu.stage !== 'middle' && edu.stage !== 'high') return false;
  if (edu.grades >= 8) return false;
  // Deux fois d'affilée n'arrive pas : l'établissement pousse dehors ou
  // pousse en avant, il ne bloque pas indéfiniment.
  if (Number(p.flags.repeatedYear ?? 0) === state.year - 1) return false;

  const risk = Math.min(0.75,
    (8 - edu.grades) / 11
    + edu.absences * 0.02
    // Un établissement qui accompagne rattrape ; un établissement débordé non.
    - ((school?.tutoring ?? 45) - 45) / 260,
  );
  if (!rng.chance(Math.max(0, risk))) return false;

  p.flags.repeatedYear = state.year;
  p.flags.repeatedYears = Number(p.flags.repeatedYears ?? 0) + 1;
  edu.yearInStage = Math.max(1, edu.yearInStage - 1);
  edu.absences = 0;
  p.stats.happiness = clampStat(p.stats.happiness - 10);
  p.psyche.self.selfEsteem = clampStat(p.psyche.self.selfEsteem - 7);
  applyExperience(ctx, 'échecScolaire');
  // La classe monte sans vous : c'est le vrai coût, et il est social.
  p.origin.schoolClass = buildSchoolClass(ctx, `${edu.stage}_redouble_${state.year}`);
  invalidateContexts(state);
  ctx.log('school',
    `Tu redoubles. Ceux avec qui tu étais passent dans la classe au-dessus.`, 'bad');
  return true;
}

/* ------------------------------------------------------------------ */
/* Changer d'établissement                                             */
/* ------------------------------------------------------------------ */

/**
 * Les trois façons de partir d'une école.
 *
 * L'audit relevait : « ni déménagement scolaire, ni privé/public, ni
 * internat ». L'établissement était subi de bout en bout, alors que c'est
 * l'un des rares leviers de mobilité sociale qu'un adolescent puisse actionner
 * — ou que ses parents puissent lui payer.
 */
export type TransferKind = 'secteur' | 'privé' | 'internat';

export interface TransferOption {
  id: TransferKind;
  label: string;
  what: string;
  emoji: string;
  /** Frais annuels, 0 pour le secteur public. */
  cost: number;
  /** Ce qui empêche, ou null. */
  blocked: string | null;
}

/** Ce que coûte un établissement d'un type donné, à l'échelle du pays. */
function transferCost(state: GameState, archetypeId: string): number {
  const country = getCountry(state.player.countryId);
  const ratio = SCHOOL_MAP[archetypeId]?.tuitionRatio ?? 0;
  return Math.round(ratio * nationalIncome(country) * state.world.inflation);
}

export function transferOptions(state: GameState): TransferOption[] {
  const p = state.player;
  const o = p.origin;
  const inSchool = SCHOOL_STAGES.some((s) => s.stage === p.education.stage);
  const common = !inSchool ? 'Tu n’es pas dans un cycle où l’on change d’établissement.'
    : p.prison ? 'Pas depuis une cellule.'
      : p.yearActions.transfer ? 'Tu as déjà changé cette année.'
        : null;

  // Ce que la famille peut payer. C'est le père et la mère qui règlent, pas
  // l'enfant : le privé n'est pas un choix quand il n'y a pas d'argent.
  const household = Math.max(0, o.finance.disposableIncome);
  const privateCost = transferCost(state, 'privateContract');
  const boardingCost = transferCost(state, 'boarding');

  return [
    {
      id: 'secteur', label: 'Demander un autre public', emoji: '🏫',
      what: 'Une dérogation, un autre quartier, les mêmes moyens',
      cost: 0,
      blocked: common ?? (o.school?.archetypeId === 'publicSelective'
        ? 'Tu es déjà dans le meilleur public du coin.' : null),
    },
    {
      id: 'privé', label: 'Passer dans le privé', emoji: '📗',
      what: 'Des classes plus petites, un réseau, et une facture chaque année',
      cost: privateCost,
      blocked: common ?? (household < privateCost * 1.6
        ? 'Tes parents n’en ont pas les moyens.' : null),
    },
    {
      id: 'internat', label: 'Partir en internat', emoji: '🛏️',
      what: 'Tout ton temps sur place, et la maison à distance',
      cost: boardingCost,
      blocked: common ?? (p.age < 12 ? 'Tu es trop jeune.'
        : household < boardingCost * 1.4 ? 'Tes parents n’en ont pas les moyens.' : null),
    },
  ];
}

/**
 * Changer d'établissement.
 *
 * Ce n'est jamais gratuit, même quand c'est gratuit : on perd la classe, les
 * amitiés qu'on y avait et la place qu'on s'y était faite. C'est le pari
 * central du système — un meilleur cadre contre tout ce qu'on avait construit
 * dedans.
 */
export function changeSchool(ctx: Ctx, kind: TransferKind): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const o = p.origin;
  const option = transferOptions(state).find((x) => x.id === kind);
  if (!option) return { ok: false, message: 'Ce n’est pas une option.' };
  if (option.blocked) return { ok: false, title: 'Impossible', message: option.blocked };
  p.yearActions.transfer = 1;

  // La dérogation se demande, elle ne s'obtient pas. Le dossier compte, et le
  // quartier aussi : c'est ce qui rend le levier inégal.
  if (kind === 'secteur') {
    const chance = Math.min(0.85,
      0.2 + p.education.grades / 42 + o.neighborhood.educationAccess / 320
      + Math.max(0, p.education.discipline.behaviour - 50) / 220,
    );
    if (!rng.chance(chance)) {
      p.stats.happiness = clampStat(p.stats.happiness - 4);
      return {
        ok: false, title: 'Dérogation refusée', tone: 'bad',
        message: 'On te répond que la carte scolaire est la carte scolaire.',
      };
    }
  }

  const archetypeId = kind === 'privé' ? 'privateContract'
    : kind === 'internat' ? 'boarding'
      : 'publicSelective';
  const country = getCountry(p.countryId);
  const income = nationalIncome(country);

  const previous = o.school?.name;
  /*
   * **On ne change pas d'école pour retomber dans la même.**
   *
   * Le nom se tirait d'une liste sans regarder celui qu'on quittait : le
   * message annonçait « Fini, Collège Simon-Delaure » et l'on arrivait au
   * Collège Simon-Delaure. C'est rare — une chance sur la longueur de la
   * liste — donc invisible jusqu'à ce qu'un changement sans rapport décale le
   * tirage et fasse tomber dessus. Trois essais suffisent à rendre le cas
   * négligeable sans jamais boucler.
   */
  let name = schoolName(archetypeId, p.education.stage, (arr) => rng.pick(arr));
  for (let attempt = 0; attempt < 3 && name === previous; attempt++) {
    name = schoolName(archetypeId, p.education.stage, (arr) => rng.pick(arr));
  }
  o.school = buildSchool({
    archetypeId,
    stage: p.education.stage,
    name,
    neighborhoodQuality: o.neighborhood.schoolQuality,
    countryEducation: country.education,
    nationalIncome: income,
    jitter: (spread) => rng.float(-spread, spread),
    roll: (a, b) => rng.float(a, b),
    clubs: rollOfferedClubs(ctx, archetypeId),
  });
  p.education.schoolName = o.school.name;
  // Nouvelle école, nouvelle classe. Tout ce qu'on avait construit dedans
  // reste derrière : c'est le prix, et il n'est pas petit.
  o.schoolClass = buildSchoolClass(ctx, `${p.education.stage}_${kind}_${state.year}`);
  p.education.clubs = [];
  p.origin.popularity = {
    known: 0, liked: 0, respected: 0, influential: 0, intimidating: 0, funny: 0,
  };
  // Une situation de harcèlement s'arrête quand on part — et pas parce qu'on
  // l'a réglée. C'est la sortie la plus fréquente dans la vraie vie.
  if (p.education.harassment && !p.education.harassment.resolvedYear) {
    p.education.harassment.resolvedYear = state.year;
    p.education.harassment.outcome = 'Tu as changé d’établissement. Ça s’est arrêté comme ça.';
  }
  // Le sport scolaire ne suit pas : l'équipe était celle de l'autre école.
  if (p.education.sport && !p.education.sport.cutYear) p.education.sport = null;

  if (kind === 'internat') {
    // L'internat rend du temps et éloigne la famille : les deux comptent.
    o.time.commute = 0;
    o.time.free = Math.max(o.time.free, o.time.free + 4);
    for (const npc of peopleByRelation(state, ['father', 'mother', 'brother', 'sister'])) {
      npc.relationship = clampStat(npc.relationship - rng.float(4, 12));
    }
    applyExperience(ctx, 'déménagementForcé', { scale: 0.5 });
  }
  p.stats.stress = clampStat(p.stats.stress + rng.float(6, 14));
  invalidateContexts(state);
  ctx.log('school', `Tu changes d’établissement : ${o.school.name}.`, 'neutral');
  return {
    ok: true,
    title: o.school.name,
    message: `Fini, ${previous ?? 'l’ancienne école'}. Nouvelle classe, personne que tu connais, et tout à refaire.${
      option.cost > 0 ? ' Tes parents paieront chaque année.' : ''}`,
    tone: 'neutral',
  };
}

function enterStage(ctx: Ctx, def: StageDef): void {
  const edu = ctx.state.player.education;
  edu.stage = def.stage;
  refreshSchool(ctx, def.stage);
  edu.schoolName = ctx.state.player.origin.school?.name ?? schoolNameFor(ctx, def.stage);
  edu.yearInStage = 0;
  edu.stageLength = def.length;
  edu.grades = 0;
  edu.clubs = [];
  edu.effort = edu.effort === 'none' ? 'normal' : edu.effort;
  // Nouveau cycle, nouvelles matières : le bulletin repart. Ce qu'on savait
  // faire reste dans les statistiques et les goûts, pas dans les notes.
  resetMarks(ctx.state);

  // Quelques camarades persistants apparaissent au collège et au lycée.
  if (def.stage === 'middle' || def.stage === 'high') {
    const count = ctx.rng.int(1, 3);
    for (let i = 0; i < count; i++) {
      createPerson(ctx, {
        relation: 'classmate',
        age: ctx.state.player.age + ctx.rng.int(-1, 1),
        withJob: false,
        relationship: ctx.rng.int(35, 70),
        opinion: ctx.rng.int(35, 70),
      });
    }
  }
}

function completeStage(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const edu = p.education;
  const passed = edu.grades >= 8;

  switch (edu.stage) {
    case 'nursery':
    case 'primary':
    case 'middle': {
      ctx.log('school', `Tu as terminé ${STAGE_LABELS[edu.stage].toLowerCase()} avec ${edu.grades.toFixed(1)}/20 de moyenne.`, passed ? 'good' : 'neutral');
      break;
    }
    case 'high': {
      if (passed) {
        addDegree(ctx, {
          id: `deg_${state.idCounter + 1}`,
          name: 'Diplôme du secondaire',
          majorId: null,
          level: 1,
          year: state.year,
          honors: edu.grades >= 16,
        });
        ctx.log('school', `Tu as obtenu ton diplôme du secondaire (${edu.grades.toFixed(1)}/20)${edu.grades >= 16 ? ' avec mention' : ''}.`, 'good');
        p.stats.happiness = clampStat(p.stats.happiness + 8);
        if (edu.grades >= 16) applyExperience(ctx, 'réussiteScolaire');
      } else {
        ctx.log('school', `Tu as échoué au diplôme du secondaire (${edu.grades.toFixed(1)}/20).`, 'bad');
        p.stats.happiness = clampStat(p.stats.happiness - 10);
        applyExperience(ctx, 'échecScolaire');
      }
      edu.stage = 'graduated';
      edu.schoolName = null;
      break;
    }
    case 'vocational': {
      const courseId = String(p.flags.vocationalCourse ?? '');
      const course = VOCATIONAL_COURSES.find((c) => c.id === courseId);
      addDegree(ctx, {
        id: `deg_${state.idCounter + 1}`,
        name: course ? course.name : 'Formation professionnelle',
        majorId: null,
        level: 2,
        year: state.year,
        honors: edu.grades >= 16,
      });
      p.flags.vocationalDone = `${p.flags.vocationalDone ?? ''}${courseId},`;
      ctx.log('school', `Tu as validé ta formation : ${course?.name ?? 'formation professionnelle'}.`, 'good');
      edu.stage = 'graduated';
      edu.schoolName = null;
      break;
    }
    case 'university': {
      const major = getMajor(edu.majorId);
      // Reçu ou non, la promotion se disperse : ceux qu'on a gardés entrent
      // dans le métier, les autres s'effacent comme des camarades de lycée.
      graduateCohort(ctx, edu.majorId);
      if (passed) {
        addDegree(ctx, {
          id: `deg_${state.idCounter + 1}`,
          name: `Diplôme en ${major?.name ?? 'études générales'}`,
          majorId: edu.majorId,
          level: 3,
          year: state.year,
          honors: edu.grades >= 15,
        });
        ctx.log('school', `Tu es diplômé${p.sex === 'F' ? 'e' : ''} en ${major?.name ?? 'études générales'} (${edu.grades.toFixed(1)}/20).`, 'good');
        p.stats.happiness = clampStat(p.stats.happiness + 12);
        p.stats.reputation = clampStat(p.stats.reputation + 6);
      } else {
        ctx.log('school', `Tu n’as pas validé ton cursus en ${major?.name ?? 'études générales'}.`, 'bad');
        p.stats.happiness = clampStat(p.stats.happiness - 12);
      }
      edu.stage = 'graduated';
      edu.schoolName = null;
      break;
    }
    case 'graduate': {
      const programId = String(p.flags.graduateProgram ?? '');
      const program = GRADUATE_PROGRAMS.find((g) => g.id === programId);
      if (passed) {
        addDegree(ctx, {
          id: `deg_${state.idCounter + 1}`,
          name: program?.name ?? 'Diplôme supérieur',
          majorId: edu.majorId,
          level: 4,
          year: state.year,
          honors: edu.grades >= 15,
        });
        ctx.log('school', `Tu as obtenu ton diplôme supérieur : ${program?.name ?? 'cycle supérieur'}.`, 'good');
        p.stats.reputation = clampStat(p.stats.reputation + 10);
        p.stats.happiness = clampStat(p.stats.happiness + 12);
      } else {
        ctx.log('school', `Tu as échoué en ${program?.name ?? 'cycle supérieur'}.`, 'bad');
      }
      edu.stage = 'graduated';
      edu.schoolName = null;
      break;
    }
    default:
      break;
  }
  edu.yearInStage = 0;
  edu.stageLength = 0;
}

function addDegree(ctx: Ctx, degree: Degree): void {
  const edu = ctx.state.player.education;
  // Qui a juré de n'avoir aucun titre ne va pas chercher le papier. Le niveau
  // atteint compte quand même — ce qu'on a appris ne s'annule pas — mais rien
  // ne l'atteste. Sans cette sortie, le serment était rompu par le moteur
  // dans trente-deux vies sur quarante.
  if (vowActive(ctx.state, 'sansDiplome')) {
    if (degree.level > edu.level) edu.level = degree.level as EducationLevel;
    ctx.log('school', 'Tu ne vas pas chercher le diplôme. Tu t’y étais engagé.', 'neutral');
    return;
  }
  edu.degrees.push(degree);
  if (degree.level > edu.level) edu.level = degree.level as EducationLevel;
}

/* ------------------------------------------------------------------ */
/* Actions du joueur                                                  */
/* ------------------------------------------------------------------ */

export function isInSchool(state: GameState): boolean {
  const s = state.player.education.stage;
  return ['nursery', 'primary', 'middle', 'high', 'university', 'graduate', 'vocational'].includes(s);
}

export function setEffort(ctx: Ctx, effort: 'none' | 'normal' | 'hard'): ActionResult {
  const edu = ctx.state.player.education;
  if (!isInSchool(ctx.state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };
  edu.effort = effort;
  const labels = { none: 'le minimum syndical', normal: 'un rythme normal', hard: 'un travail intensif' };
  return { ok: true, title: 'Rythme de travail', message: `Tu adoptes ${labels[effort]} pour l’année à venir.`, tone: 'neutral' };
}

/**
 * Clubs réellement proposés par l'établissement. Un petit lycée rural n'a ni
 * orchestre ni club scientifique — le menu ne doit donc pas les afficher.
 * Le tirage est déterministe : il ne change pas d'un affichage à l'autre.
 */
export function availableClubs(state: GameState): typeof CLUBS {
  const offered = state.player.origin.school?.offeredClubs;
  if (!offered) return [];
  return CLUBS.filter((club) => offered.includes(club.id));
}

export function joinClub(ctx: Ctx, clubId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Il faut être scolarisé pour rejoindre une activité.' };
  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) return { ok: false, message: 'Activité inconnue.' };
  if (p.education.clubs.includes(clubId)) return { ok: false, message: `Tu fais déjà partie du club « ${club.name} ».` };
  if (!availableClubs(state).some((c) => c.id === clubId)) {
    return { ok: false, message: `Aucun club « ${club.name} » n’existe dans ton établissement.` };
  }
  p.education.clubs.push(clubId);
  shiftStats(state, club.effects as Partial<Record<StatKey, number>>);
  ctx.log('school', `Tu as rejoint le club « ${club.name} ».`, 'good');
  return { ok: true, title: club.name, message: `Tu rejoins l’activité. ${club.emoji}`, tone: 'good' };
}

export function dropOut(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };
  if (p.age < 16) return { ok: false, message: 'La scolarité est obligatoire à ton âge.' };
  const stage = STAGE_LABELS[p.education.stage];
  p.education.stage = 'dropout';
  p.education.schoolName = null;
  p.education.yearInStage = 0;
  p.stats.happiness = clampStat(p.stats.happiness + 4);
  p.stats.reputation = clampStat(p.stats.reputation - 8);
  p.stats.discipline = clampStat(p.stats.discipline - 6);
  ctx.log('school', `Tu as abandonné : ${stage.toLowerCase()}.`, 'bad');
  return { ok: true, title: 'Abandon', message: `Tu quittes ${stage.toLowerCase()}. Les portes qui se ferment ne se rouvrent pas toutes.`, tone: 'bad' };
}

export function applyScholarship(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.education.stage !== 'university' && p.education.stage !== 'graduate') {
    return { ok: false, message: 'Les bourses concernent les études supérieures.' };
  }
  if (p.education.scholarship) return { ok: false, message: 'Tu bénéficies déjà d’une bourse.' };
  if (p.yearActions.scholarship) return { ok: false, message: 'Tu as déjà déposé un dossier cette année.' };
  p.yearActions.scholarship = 1;
  const familyWealth = Number(p.flags.familyWealth ?? 0);
  // Un lycée réputé sait monter un dossier ; un foyer aisé en a moins besoin.
  const chance = scholarshipChance(p.education.grades, p.stats.intelligence, familyWealth)
    * getEducationContext(state).scholarship;
  if (rng.chance(chance)) {
    p.education.scholarship = true;
    ctx.log('school', 'Tu as obtenu une bourse d’études.', 'good');
    return { ok: true, title: 'Bourse accordée', message: 'Ton dossier est retenu : tes frais de scolarité sont pris en charge.', tone: 'good' };
  }
  return { ok: true, title: 'Bourse refusée', message: 'Ton dossier n’a pas été retenu cette année.', tone: 'bad' };
}

export function enrollUniversity(ctx: Ctx, majorId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const edu = p.education;
  const major = MAJORS.find((m) => m.id === majorId);
  if (!major) return { ok: false, message: 'Filière inconnue.' };
  if (isInSchool(state)) return { ok: false, message: 'Tu es déjà en cours de scolarité.' };
  if (edu.level < 1) return { ok: false, message: 'Il faut un diplôme du secondaire pour entrer à l’université.' };
  if (p.age < 17) return { ok: false, message: 'Tu es trop jeune.' };

  // Admission : intelligence, moyenne au secondaire et mentions obtenues.
  // Le lycée d'origine compte aussi : à dossier égal, il ne pèse pas pareil.
  const score = (0.3
    + (p.stats.intelligence - major.minIntelligence) / 80
    + (edu.degrees.some((d) => d.honors) ? 0.18 : 0))
    * getEducationContext(state).universityAccess;
  if (!rng.chance(Math.max(0.05, Math.min(0.97, score)))) {
    return { ok: true, title: 'Candidature refusée', message: `${major.name} ne retient pas ton dossier cette année.`, tone: 'bad' };
  }

  edu.stage = 'university';
  edu.majorId = majorId;
  // Une promotion, et pas une classe : on a choisi cette filière, donc ces
  // gens-là entreront dans le même métier. C'est ce qui les rend utiles bien
  // après le diplôme.
  buildCohort(ctx, majorId);
  edu.schoolName = rng.pick(UNIVERSITY_NAMES);
  edu.yearInStage = 0;
  edu.stageLength = major.years;
  edu.grades = 0;
  edu.clubs = [];
  edu.scholarship = false;
  ctx.log('school', `Tu es admis${p.sex === 'F' ? 'e' : ''} en ${major.name} à ${edu.schoolName}.`, 'good');
  return { ok: true, title: 'Admission', message: `Tu intègres ${edu.schoolName} en ${major.name} pour ${major.years} ans.`, tone: 'good' };
}

export function enrollVocational(ctx: Ctx, courseId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const course = VOCATIONAL_COURSES.find((c) => c.id === courseId);
  if (!course) return { ok: false, message: 'Formation inconnue.' };
  if (isInSchool(state)) return { ok: false, message: 'Tu es déjà en cours de scolarité.' };
  if (p.age < course.minAge) return { ok: false, message: `Il faut avoir ${course.minAge} ans.` };
  const country = getCountry(p.countryId);
  const cost = Math.round(course.cost * country.costIndex);
  if (p.money < cost) return { ok: false, message: `Il te faut ${cost} pour t’inscrire.` };

  p.money -= cost;
  p.education.stage = 'vocational';
  p.education.schoolName = course.name;
  p.education.yearInStage = 0;
  p.education.stageLength = course.years;
  p.education.grades = 0;
  p.flags.vocationalCourse = courseId;
  ctx.log('school', `Tu commences la formation « ${course.name} ».`, 'neutral');
  void rng;
  return { ok: true, title: course.name, message: `Inscription validée pour ${course.years} an(s). ${cost} déboursés.`, tone: 'good' };
}

export function enrollGraduate(ctx: Ctx, programId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const program = GRADUATE_PROGRAMS.find((g) => g.id === programId);
  if (!program) return { ok: false, message: 'Programme inconnu.' };
  if (isInSchool(state)) return { ok: false, message: 'Tu es déjà en cours de scolarité.' };
  if (p.education.level < 3) return { ok: false, message: 'Un diplôme universitaire est requis.' };
  const hasMajor = p.education.degrees.some((d) => d.majorId && program.requiresMajor.includes(d.majorId));
  if (!hasMajor) {
    return { ok: false, message: `Ce programme exige un diplôme en : ${program.requiresMajor.map((m) => getMajor(m)?.name ?? m).join(', ')}.` };
  }
  p.education.stage = 'graduate';
  p.education.schoolName = program.name;
  p.education.yearInStage = 0;
  p.education.stageLength = program.years;
  p.education.grades = 0;
  p.flags.graduateProgram = programId;
  ctx.log('school', `Tu entames : ${program.name}.`, 'good');
  return { ok: true, title: program.name, message: `Tu es inscrit pour ${program.years} an(s).`, tone: 'good' };
}

/** Frais de scolarité annuels dus par le joueur. */
export function annualTuition(state: GameState): number {
  const p = state.player;
  const edu = p.education;
  const country = getCountry(p.countryId);
  if (edu.scholarship) return 0;
  // La bourse sportive paie l'université au même titre que la bourse au
  // mérite : c'est ce qui donne son sens à dix ans de filière scolaire.
  if (hasSportScholarship(state) && (edu.stage === 'university' || edu.stage === 'graduate')) {
    return 0;
  }
  if (edu.stage === 'university') {
    const major = getMajor(edu.majorId);
    return Math.round((major?.tuition ?? 2000) * country.costIndex * state.world.inflation);
  }
  if (edu.stage === 'graduate') {
    const program = GRADUATE_PROGRAMS.find((g) => g.id === String(p.flags.graduateProgram ?? ''));
    return Math.round((program?.cost ?? 4000) * country.costIndex * state.world.inflation);
  }
  // Établissement privé : la scolarité obligatoire n'est gratuite que dans le
  // public. Avant la majorité, c'est la famille qui règle la facture.
  if (SCHOOL_STAGES.some((s) => s.stage === edu.stage) && p.age >= 18) {
    return Math.round(p.origin.school?.tuition ?? 0);
  }
  return 0;
}

/** Frais de scolarité que la famille assume pour l'enfant mineur. */
export function familyTuition(state: GameState): number {
  const p = state.player;
  if (p.age >= 18) return 0;
  if (!SCHOOL_STAGES.some((s) => s.stage === p.education.stage)) return 0;
  return Math.round(p.origin.school?.tuition ?? 0);
}

/** Formations professionnelles déjà validées. */
export function completedCourses(state: GameState): string[] {
  return String(state.player.flags.vocationalDone ?? '').split(',').filter(Boolean);
}
