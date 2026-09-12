/**
 * Les matières et l'examen.
 *
 * Deux manques du catalogue, qui n'en font qu'un : « une seule moyenne : ni
 * matières, ni points forts, ni orientation par les notes » et « les notes se
 * calculent seules : passer un examen n'est jamais un moment ». Douze ans
 * d'école produisaient un nombre qui montait tout seul, et rien à décider.
 *
 * **Les matières d'abord.** Chacune se calcule à part, avec son propre mélange
 * de talent brut et de travail régulier. Un élève doué et un élève appliqué
 * finissent avec la même moyenne et un bulletin opposé — et c'est le bulletin
 * que regardent les filières, pas la moyenne.
 *
 * **L'examen ensuite.** Il se joue (`minigames/exam.ts`), il ne remplace pas
 * l'année mais la corrige, et il porte sur les matières réellement suivies. Ce
 * qui s'y joue n'est pas le savoir — ce serait un questionnaire — mais le
 * temps : quelles questions on attaque, et quand on lâche celle sur laquelle
 * on s'acharne.
 *
 * **Tricher enfin.** C'est un raccourci qui relève ce que rend chaque
 * question, et une jauge d'attention qui monte pendant qu'on l'utilise. Rien
 * n'y décrit de méthode : c'est un compteur qui monte et un surveillant qui
 * finit par se lever. Se faire prendre annule la copie et va au dossier.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, ExamRun, GameState } from '../engine/types.ts';
import {
  EXAM_WEIGHT, MAJOR_SUBJECTS, SUBJECTS, getSubject, markWord, sessionFor,
  subjectsAt, type Subject,
} from '../data/subjects.ts';
import type { MiniGameContext, MiniGameResult } from '../engine/minigame.ts';
import { blend } from '../engine/minigame.ts';
import { applyExperience } from './psyche.ts';
import { discipline } from './schoolActions.ts';
import { readingEdge } from './practices.ts';

/* ------------------------------------------------------------------ */
/* Le bulletin                                                         */
/* ------------------------------------------------------------------ */

/** Les matières suivies cette année. */
export function currentSubjects(state: GameState): Subject[] {
  return subjectsAt(state.player.age);
}

export function markIn(state: GameState, subjectId: string): number {
  return state.player.education.marks[subjectId] ?? 0;
}

/** Le bulletin, trié du meilleur au pire. */
export function report(state: GameState): { subject: Subject; mark: number }[] {
  return currentSubjects(state)
    .map((subject) => ({ subject, mark: markIn(state, subject.id) }))
    .sort((a, b) => b.mark - a.mark);
}

/** Les matières où l'on est franchement au-dessus de sa propre moyenne. */
export function strengths(state: GameState): Subject[] {
  const rows = report(state).filter((r) => r.mark > 0);
  if (rows.length === 0) return [];
  const mean = rows.reduce((s, r) => s + r.mark, 0) / rows.length;
  return rows.filter((r) => r.mark >= mean + 2).map((r) => r.subject);
}

export function weaknesses(state: GameState): Subject[] {
  const rows = report(state).filter((r) => r.mark > 0);
  if (rows.length === 0) return [];
  const mean = rows.reduce((s, r) => s + r.mark, 0) / rows.length;
  return rows.filter((r) => r.mark <= mean - 2).map((r) => r.subject);
}

/**
 * La moyenne dans les matières d'une filière.
 *
 * C'est la moitié utile du système : sans elle, avoir des points forts ne
 * changerait rien. Une école de médecine ne lit pas la moyenne générale, elle
 * lit trois lignes du bulletin.
 */
export function majorFit(state: GameState, majorId: string): number | null {
  const wanted = MAJOR_SUBJECTS[majorId];
  if (!wanted) return null;
  const marks = wanted.map((id) => markIn(state, id)).filter((m) => m > 0);
  if (marks.length === 0) return null;
  return marks.reduce((s, m) => s + m, 0) / marks.length;
}

/** Ce que le dossier dit à cette filière-là, en mots. */
export function majorVerdict(state: GameState, majorId: string): string | null {
  const fit = majorFit(state, majorId);
  if (fit === null) return null;
  const general = state.player.education.grades;
  const gap = fit - general;
  const word = markWord(fit);
  if (gap > 1.5) return `Ton dossier est meilleur ici qu’ailleurs (${word}).`;
  if (gap < -1.5) return `Ce n’est pas là que tu es le meilleur (${word}).`;
  return `Dans tes matières habituelles (${word}).`;
}

/**
 * Le penchant propre à quelqu'un pour une matière, -1 à +1.
 *
 * Sans lui, le bulletin était plat : huit matières sur dix reposent sur
 * l'intelligence, et l'écart entre elles se réduisait à la différence entre
 * l'esprit et la rigueur du personnage — un point et demi au mieux. Or ce
 * n'est pas ainsi que ça marche : certains sont simplement bons en langues et
 * mauvais en géométrie, à esprit égal.
 *
 * Le penchant est tiré **une fois par vie et par matière**, puis conservé dans
 * la sauvegarde. C'est ce qui rend les points forts stables — un élève bon en
 * langues à douze ans l'est encore à dix-sept, et c'est ce qui permet de
 * décider de son orientation.
 */
export function aptitudeFor(ctx: Ctx, subjectId: string): number {
  const edu = ctx.state.player.education;
  const known = edu.aptitudes[subjectId];
  if (known !== undefined) return known;
  const rolled = Math.round(ctx.rng.float(-1, 1) * 100) / 100;
  edu.aptitudes[subjectId] = rolled;
  return rolled;
}

/**
 * Recalcule le bulletin de l'année.
 *
 * Chaque matière part de la note générale et s'en écarte selon trois choses :
 * ce qu'elle demande (du talent brut ou du travail régulier), le penchant
 * propre de la personne, et le goût qu'elle y a pris. Deux élèves de même
 * moyenne n'ont donc pas le même bulletin, et c'est tout le propos.
 */
export function updateMarks(ctx: Ctx, general: number): void {
  const { state, rng } = ctx;
  const p = state.player;
  const edu = p.education;

  for (const subject of currentSubjects(state)) {
    // Ce que la matière demande, rapporté à ce que la personne a.
    const raw = p.stats[subject.driver];
    const work = p.stats.discipline * (edu.effort === 'hard' ? 1.15 : edu.effort === 'none' ? 0.75 : 1);
    const aptitude = raw * subject.talent + work * (1 - subject.talent);
    // L'écart à la moyenne générale : c'est lui qui crée les points forts.
    const tilt = (aptitude - 50) / 11;
    // Un goût entretenu fait gagner des points là où on aime aller.
    const liking = subject.interest
      ? (p.psyche.interests.find((i) => i.id === subject.interest)?.level ?? 0) / 55
      : 0;
    // La sévérité **décale**, elle ne multiplie pas : diviser par 0.7 faisait
    // d'un 16 un 23, et diviser par 1.18 en faisait un 13,6. Un correcteur
    // indulgent donne un point de plus, pas quarante pour cent.
    // Le penchant propre : c'est lui qui fait l'essentiel des points forts.
    const bent = aptitudeFor(ctx, subject.id) * 4.5;
    /*
     * Et ce qu'on lit chez soi. C'est le seul terme du bulletin qui ne dépende
     * ni de la matière, ni du penchant, ni de l'école : quelqu'un qui tient
     * une pratique de lecture depuis des années est meilleur partout à la
     * fois, d'un peu moins de deux points au dernier grade. Assez pour qu'un
     * élève ordinaire qui lit dépasse un élève doué qui ne lit pas ; jamais
     * assez pour remplacer le travail.
     */
    const delta = tilt + bent + liking + readingEdge(state)
      - (subject.severity - 1) * 5 + rng.float(-1.1, 1.1);
    // L'écart se réduit **près des bornes seulement**. Sans compression du
    // tout, un bon élève voyait cinq matières bloquées à 20,0 ; en comprimant
    // proportionnellement à toute l'échelle, le bulletin s'aplatissait et ne
    // disait plus rien non plus. On ne freine donc que dans les deux derniers
    // points.
    const room = delta >= 0 ? 20 - general : general;
    const mark = clamp(general + delta * Math.min(1, room / 9), 0, 20);
    // La note d'une matière est lissée comme la moyenne : une mauvaise année
    // ne fait pas de vous un cancre, ni l'inverse.
    const previous = edu.marks[subject.id];
    edu.marks[subject.id] = previous === undefined
      ? Math.round(mark * 10) / 10
      : Math.round((previous * 0.5 + mark * 0.5) * 10) / 10;

    // Réussir quelque part entretient le goût correspondant : c'est ainsi que
    // l'école décide de ce qu'on aimera.
    if (subject.interest && edu.marks[subject.id] >= 15) {
      const key = `exposé:${subject.interest}`;
      p.flags[key] = Math.min(6, Number(p.flags[key] ?? 0) + 1);
    }
  }
}

/**
 * Efface le bulletin : nouveau cycle, nouvelles matières.
 *
 * Les penchants, eux, restent : on ne devient pas mauvais en langues en
 * changeant d'établissement.
 */
export function resetMarks(state: GameState): void {
  state.player.education.marks = {};
}

/* ------------------------------------------------------------------ */
/* L'examen                                                            */
/* ------------------------------------------------------------------ */

export function examOf(state: GameState): ExamRun | null {
  return state.player.education.exam ?? null;
}

/**
 * Y a-t-il une session cette année ?
 *
 * En fin de cycle seulement. Un examen tous les ans banaliserait le moment,
 * et c'est précisément ce que l'audit reprochait au reste du système.
 */
export function examDue(state: GameState): boolean {
  const edu = state.player.education;
  if (state.player.prison) return false;
  if (!sessionFor(edu.stage)) return false;
  return edu.yearInStage >= edu.stageLength;
}

export function examBlocker(state: GameState): string | null {
  const exam = examOf(state);
  if (!exam) return 'Aucune session en ce moment.';
  if (exam.done) return 'Tu l’as passé.';
  return null;
}

/** Ouvre la session. Appelée par le moteur en fin de cycle. */
export function openExam(ctx: Ctx): ExamRun | null {
  const { state } = ctx;
  const edu = state.player.education;
  const session = sessionFor(edu.stage);
  if (!session) return null;
  const subjects = currentSubjects(state).map((s) => s.id);
  if (subjects.length === 0) return null;

  const exam: ExamRun = {
    stage: edu.stage,
    year: state.year,
    subjectIds: subjects,
    cheated: false,
    caught: false,
    done: false,
    mark: 0,
  };
  edu.exam = exam;
  ctx.log('school', `${session.label} : c’est cette année.`, 'neutral');
  return exam;
}

/**
 * Ce que le personnage apporte à la copie.
 *
 * La compétence est la moyenne des matières examinées, pas la moyenne
 * générale : quelqu'un de bon partout sauf là où il est interrogé n'a aucune
 * marge. Elle donne du temps, une zone de travail plus large — et surtout la
 * **vraie difficulté** des questions, ce qu'un élève faible ne voit pas.
 */
export function examContext(state: GameState, cheating = false): MiniGameContext | null {
  const exam = examOf(state);
  if (!exam) return null;
  const marks = exam.subjectIds.map((id) => markIn(state, id)).filter((m) => m > 0);
  const level = marks.length > 0
    ? (marks.reduce((s, m) => s + m, 0) / marks.length) * 5
    : state.player.education.grades * 5;
  const skill = clampStat(level * 0.7 + state.player.stats.intelligence * 0.3);
  const session = sessionFor(exam.stage);
  return {
    skill,
    // La difficulté vient du cycle, pas de l'élève.
    difficulty: clampStat(
      { middle: 34, high: 52, university: 70, graduate: 82, vocational: 44 }[exam.stage] ?? 50,
    ),
    mode: 'normal',
    grace: {
      time: 1 + (skill / 100) * 0.4,
      pressure: 1 - (skill / 100) * 0.25,
      tolerance: skill * 0.4,
      // Le seuil qui décide si l'on voit ce qu'une question demande vraiment.
      insight: skill > 58,
    },
    setup: { label: session?.label ?? 'Examen', cheating },
  };
}

/**
 * Solder l'examen.
 *
 * Le résultat mêle ce que vaut l'élève et ce que le joueur a fait de sa copie,
 * puis **corrige** la moyenne de l'année sans la remplacer. Une session ratée
 * par quelqu'un de bon reste une mauvaise nouvelle, pas une catastrophe ; une
 * session réussie par quelqu'un de faible ne le transforme pas en major.
 */
export function settleExam(ctx: Ctx, result: MiniGameResult): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const edu = p.education;
  const exam = examOf(state);
  const context = examContext(state);
  if (!exam || !context) return { ok: false, message: 'Aucune session en ce moment.' };
  if (exam.done) return { ok: false, message: 'Tu l’as déjà passé.' };

  exam.done = true;
  const session = sessionFor(exam.stage);

  // Se faire prendre annule tout, et va au dossier.
  if (exam.cheated && result.quality === 0) {
    exam.caught = true;
    exam.mark = 0;
    const sanction = discipline(ctx, 2.2, `Fraude — ${session?.label ?? 'examen'}`);
    edu.grades = clamp(edu.grades - 4, 0, 20);
    for (const id of exam.subjectIds) {
      edu.marks[id] = clamp((edu.marks[id] ?? 10) - 4, 0, 20);
    }
    applyExperience(ctx, 'échecScolaire');
    ctx.log('school', `${session?.label ?? 'Examen'} : copie annulée pour fraude.`, 'bad');
    return {
      ok: false,
      title: 'Copie annulée',
      message: `Il s’est arrêté devant ta table et a pris ta feuille. ${
        sanction === 'aucune' ? 'Rien d’officiel, mais tout le monde a vu.' : `Et l’établissement a tranché : ${sanction}.`}`,
      tone: 'bad',
    };
  }

  const performance = blend(context, result, 0.4);
  const mark = clamp(performance * 21, 0, 20);
  exam.mark = Math.round(mark * 10) / 10;

  // L'examen corrige l'année, il ne l'efface pas.
  edu.grades = clamp(edu.grades * (1 - EXAM_WEIGHT) + mark * EXAM_WEIGHT, 0, 20);
  for (const id of exam.subjectIds) {
    const before = edu.marks[id] ?? edu.grades;
    edu.marks[id] = Math.round(
      clamp(before * (1 - EXAM_WEIGHT) + mark * EXAM_WEIGHT, 0, 20) * 10,
    ) / 10;
  }

  if (mark >= 16) applyExperience(ctx, 'réussiteScolaire');
  else if (mark < 7) applyExperience(ctx, 'échecScolaire', { scale: 0.7 });
  p.stats.stress = clampStat(p.stats.stress + (mark < 9 ? 12 : -6));

  ctx.log('school', `${session?.label ?? 'Examen'} — ${exam.mark}/20 (${markWord(mark)}).`,
    mark >= 12 ? 'good' : mark < 8 ? 'bad' : 'neutral');
  return {
    ok: true,
    title: `${exam.mark}/20`,
    message: `${markWord(mark)}.${exam.cheated ? ' Personne n’a rien vu.' : ''}${
      result.notes?.length ? ` ${result.notes.join(' ')}` : ''}`,
    tone: mark >= 12 ? 'good' : mark < 8 ? 'bad' : 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Tricher                                                             */
/* ------------------------------------------------------------------ */

export function cheatBlocker(state: GameState): string | null {
  const exam = examOf(state);
  if (!exam) return 'Aucune session en ce moment.';
  if (exam.done) return 'C’est passé.';
  const school = state.player.origin.school;
  if (school && school.discipline > 88) {
    return 'Cet établissement-là surveille trop. Personne n’essaie.';
  }
  return null;
}

/**
 * Décider de tricher, avant d'entrer.
 *
 * C'est un choix qu'on fait la veille, pas au milieu de l'épreuve : le
 * marquer ici plutôt que dans le mini-jeu rend l'arbitrage lisible et évite
 * de transformer la salle d'examen en tableau de bord.
 */
export function setCheating(ctx: Ctx, on: boolean): ActionResult {
  const { state } = ctx;
  const exam = examOf(state);
  if (!exam) return { ok: false, message: 'Aucune session en ce moment.' };
  const blocker = cheatBlocker(state);
  if (on && blocker) return { ok: false, title: 'Impossible', message: blocker };
  exam.cheated = on;
  return {
    ok: true,
    title: on ? 'Tu as préparé quelque chose' : 'Tu y vas honnêtement',
    message: on
      ? 'Tes réponses rendront davantage. Et il y aura quelqu’un au fond de la salle qui regarde.'
      : 'Rien dans les poches. Ce sera ce que tu vaux.',
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une session non passée devient.
 *
 * Ne pas s'y présenter n'est pas neutre : c'est la note de l'année qui décide
 * seule, amputée. Sans cela, ignorer l'examen serait la stratégie sûre.
 */
export function advanceExams(ctx: Ctx): void {
  const { state } = ctx;
  const edu = state.player.education;
  const exam = examOf(state);
  if (!exam) return;
  if (exam.done) {
    // On garde la trace un an, le temps que l'écran la montre.
    if (state.year - exam.year > 1) edu.exam = null;
    return;
  }
  if (state.year === exam.year) return;

  const session = sessionFor(exam.stage);
  exam.done = true;
  exam.mark = 0;
  edu.grades = clamp(edu.grades - 3.5, 0, 20);
  applyExperience(ctx, 'échecScolaire', { scale: 0.8 });
  ctx.log('school',
    `${session?.label ?? 'L’examen'} : tu ne t’es pas présenté. Ça compte comme un zéro.`, 'bad');
}

/** Utilisé par les tests et l'audit : toutes les matières connues. */
export function allSubjects(): Subject[] {
  return SUBJECTS;
}

export { getSubject, markWord };
