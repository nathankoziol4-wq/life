/**
 * Système scolaire : progression automatique dans les cycles, notes,
 * redoublement, diplômes, et actions du joueur (§9, §10).
 */

import { clampStat, gainStat } from '../engine/rng.ts';
import { computeGrade, scholarshipChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { createPerson } from './npc.ts';
import type { ActionResult, Degree, EducationLevel, EducationStage, GameState } from '../engine/types.ts';
import { getCountry } from '../data/countries.ts';
import { SCHOOL_NAMES, UNIVERSITY_NAMES } from '../data/names.ts';
import { GRADUATE_PROGRAMS, MAJORS, VOCATIONAL_COURSES, getMajor } from '../data/degrees.ts';

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
  const base = ctx.rng.pick(SCHOOL_NAMES);
  switch (stage) {
    case 'nursery': return `Maternelle ${base}`;
    case 'primary': return `École ${base}`;
    case 'middle': return `Collège ${base}`;
    case 'high': return `Lycée ${base}`;
    default: return base;
  }
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
  const grade = computeGrade({
    intelligence: p.stats.intelligence,
    discipline: p.stats.discipline,
    effort: edu.effort,
    absences: edu.absences,
    happiness: p.stats.happiness,
    stress: p.stats.stress,
    difficulty: difficultyOf(ctx),
  });
  // Moyenne lissée sur le cycle.
  edu.grades = edu.yearInStage <= 1 ? grade : Math.round((edu.grades * 0.55 + grade * 0.45) * 10) / 10;

  // L'école fait progresser l'intelligence, d'autant plus qu'on s'investit.
  const country = getCountry(p.countryId);
  const gain = (edu.effort === 'hard' ? 3.4 : edu.effort === 'none' ? 0.3 : 1.9) * (0.6 + country.education * 0.8);
  p.stats.intelligence = gainStat(p.stats.intelligence, gain);
  if (edu.effort === 'hard') {
    p.stats.stress = clampStat(p.stats.stress + 5);
    p.stats.discipline = clampStat(p.stats.discipline + 2);
  } else if (edu.effort === 'none') {
    p.stats.discipline = clampStat(p.stats.discipline - 3);
  }
  edu.absences = 0;

  // Fin de cycle.
  if (edu.yearInStage >= edu.stageLength) {
    completeStage(ctx);
  } else if (edu.yearInStage === 1) {
    ctx.log('school', `Tu es entré${p.sex === 'F' ? 'e' : ''} à ${edu.schoolName}.`, 'neutral');
  }
}

function enterStage(ctx: Ctx, def: StageDef): void {
  const edu = ctx.state.player.education;
  edu.stage = def.stage;
  edu.schoolName = schoolNameFor(ctx, def.stage);
  edu.yearInStage = 0;
  edu.stageLength = def.length;
  edu.grades = 0;
  edu.clubs = [];
  edu.effort = edu.effort === 'none' ? 'normal' : edu.effort;

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
      } else {
        ctx.log('school', `Tu as échoué au diplôme du secondaire (${edu.grades.toFixed(1)}/20).`, 'bad');
        p.stats.happiness = clampStat(p.stats.happiness - 10);
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

export function skipClass(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };
  p.education.absences += 1;
  p.stats.happiness = clampStat(p.stats.happiness + 4);
  p.stats.discipline = clampStat(p.stats.discipline - 4);
  if (rng.percent(28 + p.education.absences * 6)) {
    p.stats.reputation = clampStat(p.stats.reputation - 5);
    ctx.log('school', 'Tu as séché les cours et tu t’es fait prendre.', 'bad');
    return { ok: true, title: 'Absence remarquée', message: 'Tu as été repéré. Convocation et mot dans le dossier.', tone: 'bad' };
  }
  return { ok: true, title: 'Journée buissonnière', message: 'Personne n’a rien vu. La journée était agréable.', tone: 'good' };
}

export function talkToTeacher(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };
  const success = rng.percent(35 + p.stats.intelligence / 3 + p.stats.discipline / 4 - p.education.absences * 5);
  if (success) {
    p.education.grades = Math.min(20, p.education.grades + rng.float(0.4, 1.4));
    p.stats.intelligence = clampStat(p.stats.intelligence + 2);
    return { ok: true, title: 'Entretien avec un professeur', message: 'Il prend le temps de reprendre les points que tu ne maîtrisais pas. Ta moyenne progresse.', tone: 'good' };
  }
  p.stats.happiness = clampStat(p.stats.happiness - 3);
  return { ok: true, title: 'Entretien avec un professeur', message: 'Il t’écoute d’une oreille distraite et te renvoie à tes fiches.', tone: 'bad' };
}

export function joinClub(ctx: Ctx, clubId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Il faut être scolarisé pour rejoindre une activité.' };
  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) return { ok: false, message: 'Activité inconnue.' };
  if (p.education.clubs.includes(clubId)) return { ok: false, message: `Tu fais déjà partie du club « ${club.name} ».` };
  p.education.clubs.push(clubId);
  for (const [key, value] of Object.entries(club.effects)) {
    const k = key as keyof typeof p.stats;
    p.stats[k] = clampStat(p.stats[k] + (value as number));
  }
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
  const chance = scholarshipChance(p.education.grades, p.stats.intelligence, familyWealth);
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
  const score = 0.3
    + (p.stats.intelligence - major.minIntelligence) / 80
    + (edu.degrees.some((d) => d.honors) ? 0.18 : 0);
  if (!rng.chance(Math.max(0.05, Math.min(0.97, score)))) {
    return { ok: true, title: 'Candidature refusée', message: `${major.name} ne retient pas ton dossier cette année.`, tone: 'bad' };
  }

  edu.stage = 'university';
  edu.majorId = majorId;
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
  if (edu.stage === 'university') {
    const major = getMajor(edu.majorId);
    return Math.round((major?.tuition ?? 2000) * country.costIndex * state.world.inflation);
  }
  if (edu.stage === 'graduate') {
    const program = GRADUATE_PROGRAMS.find((g) => g.id === String(p.flags.graduateProgram ?? ''));
    return Math.round((program?.cost ?? 4000) * country.costIndex * state.world.inflation);
  }
  return 0;
}

/** Formations professionnelles déjà validées. */
export function completedCourses(state: GameState): string[] {
  return String(state.player.flags.vocationalDone ?? '').split(',').filter(Boolean);
}
