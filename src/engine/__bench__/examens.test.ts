/**
 * Vérifications des matières et de l'examen.
 *
 * Deux manques du catalogue, qui n'en font qu'un : « une seule moyenne : ni
 * matières, ni points forts, ni orientation par les notes » et « les notes se
 * calculent seules : passer un examen n'est jamais un moment ».
 *
 * 1. **on ne peut pas être bon partout** — le bulletin s'écarte de la moyenne,
 *    et deux élèves de même moyenne n'ont pas le même bulletin ;
 * 2. **le talent et le travail ne rendent pas la même chose** — une matière
 *    qui repose sur le talent brut ne se rattrape pas en s'y mettant ;
 * 3. **les points forts orientent** — une filière lit ses matières à elle,
 *    pas la moyenne générale ;
 * 4. **l'examen corrige l'année sans la remplacer** — ni décoratif, ni
 *    souverain ;
 * 5. **ce qui se joue est le temps** — la copie récompense de choisir ses
 *    questions et punit de s'acharner ;
 * 6. **tricher est un raccourci qui se paie** — il relève ce que rend chaque
 *    question et fait monter l'attention pendant qu'on l'utilise.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { Rng } from '../rng.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { playHeadless } from '../minigame.ts';
import {
  EXAM_SESSIONS, EXAM_WEIGHT, MAJOR_SUBJECTS, SUBJECTS, getSubject, markWord,
  sessionFor, subjectsAt,
} from '../../data/subjects.ts';
import { EXAM, type ExamState } from '../../systems/minigames/exam.ts';
import {
  advanceExams, cheatBlocker, currentSubjects, examBlocker, examContext,
  examDue, examOf, majorFit, majorVerdict, markIn, openExam, report,
  resetMarks, setCheating, settleExam, strengths, updateMarks, weaknesses,
} from '../../systems/exams.ts';
import { MAJORS } from '../../data/degrees.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un élève avec un bulletin déjà constitué. */
function pupil(seed: number, age = 15): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (Object.keys(state.player.education.marks).length === 0) return null;
  state.player.yearActions = {};
  return state;
}

/** Un élève avec une session ouverte. */
function candidate(seed: number, age = 15): GameState | null {
  const state = pupil(seed, age);
  if (!state) return null;
  state.player.education.exam = null;
  if (!openExam(createCtx(state))) return null;
  return state;
}

/** Un résultat de mini-jeu fabriqué, pour isoler la règle testée. */
function played(quality: number) {
  return {
    success: quality > 0.45,
    score: Math.round(quality * 100),
    quality,
    mistakes: Math.round((1 - quality) * 5),
    time: 20_000,
  };
}

/* ------------------------------------------------------------------ */

describe('les matières tiennent debout', () => {
  it('couvre de quoi être bon quelque part et mauvais ailleurs', () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(8);
    const talents = SUBJECTS.map((s) => s.talent);
    // Si toutes reposaient sur la même chose, avoir un bulletin ne dirait rien.
    expect(Math.max(...talents) - Math.min(...talents)).toBeGreaterThan(0.4);
    const drivers = new Set(SUBJECTS.map((s) => s.driver));
    expect(drivers.size).toBeGreaterThanOrEqual(2);
    for (const s of SUBJECTS) expect(getSubject(s.id)).toBeDefined();
  });

  it('n’enseigne pas tout au même âge', () => {
    expect(subjectsAt(7).length).toBeLessThan(subjectsAt(17).length);
    expect(subjectsAt(7).length).toBeGreaterThan(0);
    // La philosophie n'arrive pas à l'école primaire.
    expect(subjectsAt(7).some((s) => s.id === 'pensée')).toBe(false);
    expect(subjectsAt(17).some((s) => s.id === 'pensée')).toBe(true);
  });

  it('donne à chaque filière des matières à elle', () => {
    // Sans cela, avoir des points forts ne changerait rien.
    for (const major of MAJORS) {
      const wanted = MAJOR_SUBJECTS[major.id];
      expect(wanted, `filière ${major.id}`).toBeDefined();
      expect(wanted.length).toBeGreaterThanOrEqual(2);
      for (const id of wanted) expect(getSubject(id), `${major.id} → ${id}`).toBeDefined();
    }
    // Et deux filières ne regardent pas les mêmes.
    expect(MAJOR_SUBJECTS.medicine).not.toEqual(MAJOR_SUBJECTS.law);
  });

  it('nomme une note à tous les niveaux', () => {
    expect(markWord(20)).not.toBe(markWord(0));
    for (const mark of [0, 4, 7, 10, 13, 16, 20]) expect(markWord(mark)).toBeTruthy();
  });

  it('prévoit une session par cycle qui en mérite une', () => {
    expect(EXAM_SESSIONS.length).toBeGreaterThanOrEqual(4);
    for (const s of EXAM_SESSIONS) expect(sessionFor(s.stage)).toBeDefined();
    // Pas de session à l'école primaire : le moment doit rester rare.
    expect(sessionFor('primary')).toBeUndefined();
    expect(sessionFor('high')).toBeDefined();
  });
});

describe('le bulletin n’est pas la moyenne', () => {
  it('se remplit réellement au fil de la scolarité', () => {
    let built = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = pupil(seed);
      if (!state) continue;
      built += 1;
      const rows = report(state);
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows) {
        expect(r.mark).toBeGreaterThanOrEqual(0);
        expect(r.mark).toBeLessThanOrEqual(20);
      }
    }
    // Garde-fou : sans lui, ce fichier pourrait passer sans rien tester.
    expect(built).toBeGreaterThan(20);
  });

  it('s’écarte de la moyenne générale au lieu de la répéter', () => {
    let spread = 0;
    let n = 0;
    for (let seed = 40; seed < 80; seed++) {
      const state = pupil(seed);
      if (!state) continue;
      const marks = report(state).map((r) => r.mark).filter((m) => m > 0);
      if (marks.length < 4) continue;
      n += 1;
      spread += Math.max(...marks) - Math.min(...marks);
    }
    if (n === 0) return;
    // Un bulletin où tout est à la même note n'apprendrait rien.
    expect(spread / n).toBeGreaterThan(2.5);
  });

  it('donne à chacun ses propres facilités, et elles ne bougent pas', () => {
    // Le penchant est tiré une fois par vie : sans lui, huit matières sur dix
    // reposant sur l'intelligence, les bulletins étaient plats.
    const state = pupil(81);
    if (!state) return;
    const before = { ...state.player.education.aptitudes };
    expect(Object.keys(before).length).toBeGreaterThan(3);
    // Un élève bon en langues à douze ans l'est encore à dix-sept.
    resetMarks(state);
    updateMarks(createCtx(state), 12);
    expect(state.player.education.aptitudes).toEqual(before);
    // Et deux vies n'ont pas les mêmes facilités.
    const other = pupil(82);
    if (!other) return;
    expect(other.player.education.aptitudes).not.toEqual(before);
  });

  it('donne des bulletins opposés à deux élèves de même moyenne', () => {
    const gifted = pupil(83);
    const diligent = pupil(83);
    if (!gifted || !diligent) return;
    // Même moyenne, deux façons opposées d'y arriver.
    const general = 13;
    gifted.player.education.grades = general;
    diligent.player.education.grades = general;
    gifted.player.stats.intelligence = 92;
    gifted.player.stats.discipline = 25;
    diligent.player.stats.intelligence = 40;
    diligent.player.stats.discipline = 95;
    resetMarks(gifted); resetMarks(diligent);
    updateMarks(createCtx(gifted), general);
    updateMarks(createCtx(diligent), general);

    // Les mathématiques reposent sur le talent, l'histoire sur le travail.
    expect(markIn(gifted, 'calcul')).toBeGreaterThan(markIn(diligent, 'calcul'));
    expect(markIn(diligent, 'monde')).toBeGreaterThan(markIn(gifted, 'monde'));
  });

  it('sait dire où l’on est fort et où l’on est faible', () => {
    const state = pupil(85);
    if (!state) return;
    // On force un bulletin très contrasté.
    for (const subject of currentSubjects(state)) {
      state.player.education.marks[subject.id] = subject.id === 'calcul' ? 19
        : subject.id === 'lettres' ? 3 : 11;
    }
    expect(strengths(state).map((s) => s.id)).toContain('calcul');
    expect(weaknesses(state).map((s) => s.id)).toContain('lettres');
    expect(strengths(state).map((s) => s.id)).not.toContain('lettres');
  });

  it('repart à zéro à chaque nouveau cycle', () => {
    const state = pupil(87, 13);
    if (!state) return;
    expect(Object.keys(state.player.education.marks).length).toBeGreaterThan(0);
    resetMarks(state);
    expect(report(state).every((r) => r.mark === 0)).toBe(true);
  });
});

describe('les points forts orientent', () => {
  it('lit les matières de la filière et non la moyenne', () => {
    const state = pupil(89, 17);
    if (!state) return;
    state.player.education.grades = 10;
    for (const subject of currentSubjects(state)) {
      state.player.education.marks[subject.id] = 10;
    }
    // Excellent exactement là où le droit regarde.
    for (const id of MAJOR_SUBJECTS.law) state.player.education.marks[id] = 18;
    const law = majorFit(state, 'law');
    const cs = majorFit(state, 'cs');
    expect(law).not.toBeNull();
    expect(cs).not.toBeNull();
    expect(law!).toBeGreaterThan(cs!);
    expect(majorVerdict(state, 'law')).toContain('meilleur');
  });

  it('le dit aussi quand ce n’est pas là qu’on est bon', () => {
    const state = pupil(91, 17);
    if (!state) return;
    state.player.education.grades = 15;
    for (const subject of currentSubjects(state)) {
      state.player.education.marks[subject.id] = 15;
    }
    for (const id of MAJOR_SUBJECTS.medicine) state.player.education.marks[id] = 5;
    expect(majorVerdict(state, 'medicine')).toContain('pas là');
  });

  it('ne dit rien d’une filière inconnue ou d’un bulletin vide', () => {
    const state = pupil(93);
    if (!state) return;
    expect(majorFit(state, 'inexistant')).toBeNull();
    expect(majorVerdict(state, 'inexistant')).toBeNull();
    resetMarks(state);
    expect(majorFit(state, 'law')).toBeNull();
  });
});

describe('la session', () => {
  it('n’ouvre qu’en fin de cycle, et pas à l’école primaire', () => {
    const state = pupil(95, 13);
    if (!state) return;
    const edu = state.player.education;
    edu.stage = 'middle';
    edu.yearInStage = 1;
    edu.stageLength = 4;
    expect(examDue(state)).toBe(false);
    edu.yearInStage = 4;
    expect(examDue(state)).toBe(true);
    edu.stage = 'primary';
    expect(examDue(state)).toBe(false);
  });

  it('porte sur les matières réellement suivies', () => {
    const state = candidate(97);
    if (!state) return;
    const exam = examOf(state)!;
    expect(exam.subjectIds.length).toBeGreaterThan(0);
    const taught = currentSubjects(state).map((s) => s.id);
    for (const id of exam.subjectIds) expect(taught).toContain(id);
  });

  it('donne plus de marge à qui maîtrise les matières examinées', () => {
    const strong = candidate(99);
    const weak = candidate(99);
    if (!strong || !weak) return;
    for (const id of examOf(strong)!.subjectIds) strong.player.education.marks[id] = 19;
    for (const id of examOf(weak)!.subjectIds) weak.player.education.marks[id] = 3;
    const a = examContext(strong)!;
    const b = examContext(weak)!;
    expect(a.skill).toBeGreaterThan(b.skill);
    expect(a.grace.time).toBeGreaterThan(b.grace.time);
    // Et surtout : le fort voit ce que chaque question demande vraiment.
    expect(a.grace.insight).toBe(true);
    expect(b.grace.insight).toBe(false);
  });

  it('corrige l’année sans la remplacer', () => {
    const good = candidate(101);
    const bad = candidate(101);
    if (!good || !bad) return;
    const before = good.player.education.grades;
    settleExam(createCtx(good), played(1));
    settleExam(createCtx(bad), played(0));
    // Une bonne session tire vers le haut, une mauvaise vers le bas.
    expect(good.player.education.grades).toBeGreaterThan(before);
    expect(bad.player.education.grades).toBeLessThan(before);
    // Mais aucune des deux n'efface l'année : le poids est borné.
    const swing = Math.abs(good.player.education.grades - before);
    expect(swing).toBeLessThanOrEqual(20 * EXAM_WEIGHT + 0.01);
  });

  it('touche aussi les matières examinées', () => {
    const state = candidate(103);
    if (!state) return;
    const exam = examOf(state)!;
    for (const id of exam.subjectIds) state.player.education.marks[id] = 4;
    settleExam(createCtx(state), played(1));
    for (const id of exam.subjectIds) {
      expect(markIn(state, id)).toBeGreaterThan(4);
    }
  });

  it('ne se passe qu’une fois', () => {
    const state = candidate(105);
    if (!state) return;
    expect(examBlocker(state)).toBeNull();
    expect(settleExam(createCtx(state), played(0.6)).ok).toBe(true);
    expect(examBlocker(state)).not.toBeNull();
    expect(settleExam(createCtx(state), played(1)).ok).toBe(false);
  });

  it('compte une session manquée comme un zéro', () => {
    const state = candidate(107);
    if (!state) return;
    const before = state.player.education.grades;
    // L'année suivante, sans s'être présenté.
    state.year += 1;
    advanceExams(createCtx(state));
    expect(examOf(state)!.done).toBe(true);
    expect(examOf(state)!.mark).toBe(0);
    expect(state.player.education.grades).toBeLessThan(before);
  });

  it('finit par s’effacer une fois passée', () => {
    const state = candidate(109);
    if (!state) return;
    settleExam(createCtx(state), played(0.6));
    state.year += 3;
    advanceExams(createCtx(state));
    expect(examOf(state)).toBeNull();
  });
});

describe('la copie', () => {
  const context = (skill: number, difficulty = 50, cheating = false) => ({
    skill,
    difficulty,
    mode: 'normal' as const,
    grace: {
      time: 1 + (skill / 100) * 0.4,
      pressure: 1 - (skill / 100) * 0.25,
      tolerance: skill * 0.4,
      insight: skill > 58,
    },
    setup: { label: 'Épreuve', cheating },
  });

  /** Ce qu'une question demande, pour ne jamais dépasser inutilement. */
  const need = (q: { hardness: number }) => 1200 + q.hardness * 5200;

  /**
   * Traite les questions dans un ordre donné, en donnant à chacune exactement
   * ce qu'elle demande.
   *
   * On ne dépasse jamais : sinon on mesurerait l'acharnement, qui est testé
   * juste après. Ici on ne compare que l'ordre.
   */
  const work = (order: (s: ExamState) => typeof s.questions) =>
    (s: ExamState, elapsed: number) => {
      const list = order(s);
      let clock = 0;
      let target = list[list.length - 1];
      for (const q of list) {
        clock += need(q);
        if (elapsed < clock) { target = q; break; }
      }
      return {
        x: ((target.id % 3) + 0.5) / 3,
        y: (Math.floor(target.id / 3) + 0.5) / 3,
        hold: true,
      };
    };

  it('récompense de choisir au rendement plutôt qu’à la valeur affichée', () => {
    // Le temps est la vraie ressource : une question qui rapporte beaucoup et
    // coûte encore plus n'est pas un bon choix. Attaquer dans l'ordre du
    // rendement — points par seconde — doit battre l'ordre de la valeur brute.
    const byYield = playHeadless(EXAM, new Rng({ rngState: 7 }), context(50),
      work((s) => [...s.questions].sort((a, b) => b.worth / need(b) - a.worth / need(a))));
    const byWorth = playHeadless(EXAM, new Rng({ rngState: 7 }), context(50),
      work((s) => [...s.questions].sort((a, b) => b.worth - a.worth)));
    expect(byYield.result.quality).toBeGreaterThan(byWorth.result.quality);
  });

  it('punit de s’acharner sur une seule question', () => {
    const spread = playHeadless(EXAM, new Rng({ rngState: 11 }), context(50),
      work((s) => [...s.questions].sort((a, b) => a.hardness - b.hardness)));
    const stuck = playHeadless(EXAM, new Rng({ rngState: 11 }), context(50),
      () => ({ x: 0.16, y: 0.16, hold: true }));
    expect(spread.result.quality).toBeGreaterThan(stuck.result.quality);
    expect(stuck.result.notes?.join(' ')).toContain('acharné');
  });

  it('ne rend rien à qui ne touche à rien', () => {
    const idle = playHeadless(EXAM, new Rng({ rngState: 13 }), context(50), () => ({}));
    expect(idle.result.quality).toBe(0);
    expect(idle.result.success).toBe(false);
    expect(idle.state.questions.every((q) => !q.touched)).toBe(true);
  });

  it('montre la vraie difficulté à qui maîtrise, et pas aux autres', () => {
    const expert = playHeadless(EXAM, new Rng({ rngState: 17 }), context(90), () => ({}));
    const novice = playHeadless(EXAM, new Rng({ rngState: 17 }), context(20), () => ({}));
    expect(expert.state.questions.every((q) => q.seen === q.hardness)).toBe(true);
    expect(novice.state.questions.some((q) => q.seen !== q.hardness)).toBe(true);
  });

  it('donne plus de temps à qui maîtrise', () => {
    const expert = playHeadless(EXAM, new Rng({ rngState: 19 }), context(90), () => ({}));
    const novice = playHeadless(EXAM, new Rng({ rngState: 19 }), context(20), () => ({}));
    expect(expert.state.limit).toBeGreaterThan(novice.state.limit);
  });

  it('laisse rendre avant la fin, et le dit', () => {
    const early = playHeadless(EXAM, new Rng({ rngState: 23 }), context(60),
      (_s, elapsed) => (elapsed > 4000 ? { quit: true } : { x: 0.16, y: 0.16, hold: true }));
    expect(early.state.handedIn).toBe(true);
    expect(early.result.notes?.join(' ')).toContain('rendu avant');
  });

  it('rejoue à l’identique à graine égale', () => {
    const a = playHeadless(EXAM, new Rng({ rngState: 29 }), context(55),
      work((s) => [...s.questions]));
    const b = playHeadless(EXAM, new Rng({ rngState: 29 }), context(55),
      work((s) => [...s.questions]));
    expect(a.result).toEqual(b.result);
  });
});

describe('tricher', () => {
  const context = (cheating: boolean) => ({
    skill: 40,
    difficulty: 50,
    mode: 'normal' as const,
    grace: { time: 1, pressure: 1, tolerance: 20, insight: false },
    setup: { label: 'Épreuve', cheating },
  });
  const glued = () => ({ x: 0.16, y: 0.16, hold: true });

  it('rend davantage, à travail égal', () => {
    const honest = playHeadless(EXAM, new Rng({ rngState: 31 }), context(false), glued);
    const cheating = playHeadless(EXAM, new Rng({ rngState: 31 }), context(true), glued);
    // Tant qu'on n'est pas pris, le raccourci paie.
    if (cheating.state.caught) return;
    expect(cheating.state.filled).toBeGreaterThan(honest.state.filled);
  });

  it('fait monter l’attention pendant qu’on s’en sert, et retomber sinon', () => {
    const used = playHeadless(EXAM, new Rng({ rngState: 37 }), context(true), glued);
    expect(used.state.attention).toBeGreaterThan(0);
    // Ne rien faire ne réveille personne.
    const idle = playHeadless(EXAM, new Rng({ rngState: 37 }), context(true), () => ({}));
    expect(idle.state.attention).toBe(0);
  });

  it('finit par se faire prendre quand on ne lâche jamais', () => {
    const long = playHeadless(EXAM, new Rng({ rngState: 41 }), {
      ...context(true),
      grace: { time: 4, pressure: 1, tolerance: 20, insight: false },
    }, glued);
    expect(long.state.caught).toBe(true);
    expect(long.result.quality).toBe(0);
    expect(long.result.success).toBe(false);
  });

  it('ne monte jamais l’attention chez qui ne triche pas', () => {
    const honest = playHeadless(EXAM, new Rng({ rngState: 43 }), context(false), glued);
    expect(honest.state.attention).toBe(0);
    expect(honest.state.caught).toBe(false);
  });

  it('annule la copie et va au dossier quand on est pris', () => {
    const state = candidate(111);
    if (!state) return;
    const exam = examOf(state)!;
    exam.cheated = true;
    const incidents = state.player.education.discipline.incidentsThisYear;
    const before = state.player.education.grades;
    const result = settleExam(createCtx(state), played(0));
    expect(result.ok).toBe(false);
    expect(exam.caught).toBe(true);
    expect(exam.mark).toBe(0);
    expect(state.player.education.discipline.incidentsThisYear).toBeGreaterThan(incidents);
    expect(state.player.education.grades).toBeLessThan(before);
  });

  it('se décide avant d’entrer, et pas partout', () => {
    const state = candidate(113);
    if (!state) return;
    state.player.origin.school!.discipline = 40;
    expect(cheatBlocker(state)).toBeNull();
    expect(setCheating(createCtx(state), true).ok).toBe(true);
    expect(examOf(state)!.cheated).toBe(true);
    expect(setCheating(createCtx(state), false).ok).toBe(true);
    expect(examOf(state)!.cheated).toBe(false);
    // Un établissement qui surveille trop ferme la porte.
    state.player.origin.school!.discipline = 95;
    expect(cheatBlocker(state)).not.toBeNull();
    expect(setCheating(createCtx(state), true).ok).toBe(false);
  });
});

describe('l’année et la sauvegarde', () => {
  it('n’a rien à faire pour qui n’est pas scolarisé', () => {
    const state = createNewLife({ seed: 121 });
    playTo(state, 40);
    if (state.gameOver || !state.player.alive) return;
    expect(examOf(state)).toBeNull();
    expect(examDue(state)).toBe(false);
    expect(examBlocker(state)).not.toBeNull();
    expect(examContext(state)).toBeNull();
  });

  it('survit à la sauvegarde avec tout ce qu’il faut', () => {
    const state = candidate(123);
    if (!state) return;
    simulateYear(state);
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(Object.keys(copy.player.education.marks).length).toBeGreaterThan(0);
    const exam = examOf(copy);
    if (!exam) return;
    expect(Array.isArray(exam.subjectIds)).toBe(true);
    for (const id of exam.subjectIds) expect(getSubject(id)).toBeDefined();
  });

  it('ne fait pas dériver la moyenne d’une vie entière', () => {
    // Garde-fou d'équilibrage : le bulletin et l'examen ne doivent pas
    // pousser toutes les moyennes vers un extrême.
    let sum = 0;
    let n = 0;
    for (let seed = 130; seed < 170; seed++) {
      const state = createNewLife({ seed });
      playTo(state, 17);
      if (state.gameOver || !state.player.alive) continue;
      n += 1;
      sum += state.player.education.grades;
    }
    if (n === 0) return;
    const mean = sum / n;
    expect(mean).toBeGreaterThan(6);
    expect(mean).toBeLessThan(16);
  });
});
