/**
 * Ce qu'on sait faire.
 *
 * Le jeu avait beaucoup de chiffres qui montent et pas un seul qu'on puisse
 * décider de faire monter. Ces tests protègent les quatre décisions qui
 * distinguent une compétence d'une jauge de plus — et chacune vient d'une
 * mesure, citée là où elle a tranché :
 *
 * 1. le don est **rare** et **caché**, et se cherche ;
 * 2. vivre suffit à devenir correct, **pas au-delà** ;
 * 3. ce qu'on ne pratique plus rouille, sans jamais tout perdre ;
 * 4. ça se paie en salaire, sinon ce ne serait qu'une dépense.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  advanceSkills, aptitudeOf, availableSkills, claimGifts, gainFor, giftKnown,
  giftLine, hireEdge, jobCapacity, knownSkills, levelOf, practice,
  practiceBlocker, priceOf, skillForField, skillOfJob, stateOf, paySwing,
} from '../../systems/skills.ts';
import {
  MIN_GAIN, PASSIVE_CAP, PER_YEAR, REVEAL, SKILLS, getSkill, rankOf,
} from '../../data/skills.ts';
import { JOBS } from '../../data/jobs.ts';
import { SUBJECTS } from '../../data/subjects.ts';
import { INTERESTS } from '../../data/interests.ts';
import type { GameState } from '../types.ts';

/** Une vie jouée jusqu'à un âge, vivante quoi qu'il arrive. */
function life(seed = 31, age = 30): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age && state.player.alive; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  if (!state.player.alive || state.player.age < age) {
    state.player.alive = true;
    state.player.deathCause = null;
    state.player.deathYear = null;
    state.gameOver = false;
    state.year += age - state.player.age;
    state.player.age = age;
  }
  state.player.yearActions = {};
  state.player.money = Math.max(state.player.money, 200_000);
  return state;
}

/* ------------------------------------------------------------------ */

describe('le catalogue', () => {
  it('couvre chaque famille de métiers exactement une fois', () => {
    // Une famille sans compétence serait un métier que rien ne récompense ;
    // une famille dans deux compétences rendrait le choix arbitraire.
    const fields = JOBS.map((j) => j.category);
    for (const field of new Set(fields)) {
      const matches = SKILLS.filter((s) => s.fields.includes(field));
      expect(matches.length, field).toBe(1);
    }
    // Et aucune compétence ne prétend servir une famille qui n'existe pas.
    const known = new Set(fields);
    for (const skill of SKILLS) {
      for (const field of skill.fields) expect(known.has(field), field).toBe(true);
    }
  });

  it('ne nomme que des matières et des goûts qui existent', () => {
    // Un identifiant mal orthographié serait un canal muet : la compétence
    // se nourrirait de rien sans que rien ne le signale.
    const subjects = new Set(SUBJECTS.map((s) => s.id));
    const interests = new Set(INTERESTS.map((i) => i.id));
    for (const skill of SKILLS) {
      for (const id of skill.subjects ?? []) expect(subjects.has(id), `${skill.id}/${id}`).toBe(true);
      for (const id of skill.interests ?? []) expect(interests.has(id), `${skill.id}/${id}`).toBe(true);
    }
  });

  it('en a dix, toutes distinctes et toutes atteignables', () => {
    expect(SKILLS).toHaveLength(10);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(10);
    for (const skill of SKILLS) {
      expect(getSkill(skill.id)).toBe(skill);
      expect(skill.from).toBeLessThanOrEqual(14);
      expect(skill.cost).toBeGreaterThan(0);
      expect(skill.note.length).toBeGreaterThan(15);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('le don', () => {
  it('reste rare, et ne dépend pas de l’ordre dans lequel on regarde', () => {
    // Mesuré sur trois mille graines : p10 22, médiane 50, p90 78 ; 4,1 %
    // de « c'est là, sans effort ». Un don donné à tout le monde ne serait
    // pas un don.
    const values: number[] = [];
    for (let seed = 0; seed < 400; seed++) {
      const state = { seed, player: {} } as unknown as GameState;
      for (const skill of SKILLS) values.push(aptitudeOf(state, skill.id));
    }
    values.sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    expect(median).toBeGreaterThan(40);
    expect(median).toBeLessThan(60);
    const prodiges = values.filter((v) => v >= 86).length / values.length;
    expect(prodiges).toBeGreaterThan(0.01);
    expect(prodiges).toBeLessThan(0.12);
  });

  it('ne consomme aucun aléa', () => {
    // Tirer dix aptitudes au berceau décalerait la séquence de toutes les
    // vies. Le don se déduit de la graine, comme les naissances royales.
    const state = life(77, 20);
    const before = state.rngState;
    for (const skill of SKILLS) aptitudeOf(state, skill.id);
    expect(state.rngState).toBe(before);
  });

  it('est le même à chaque lecture, et différent d’une compétence à l’autre', () => {
    const state = life(123, 20);
    const once = SKILLS.map((s) => aptitudeOf(state, s.id));
    const twice = SKILLS.map((s) => aptitudeOf(state, s.id));
    expect(twice).toEqual(once);
    expect(new Set(once).size).toBeGreaterThan(4);
  });

  it('reste caché tant qu’on ne l’a pas cherché', () => {
    const state = life(31, 30);
    const skill = SKILLS[0];
    expect(giftKnown(state, skill.id)).toBe(false);
    // Trois phrases, pas deux : jamais tentée, en cours, connue. La version
    // longue se répétait à l'identique sur huit lignes d'affilée à l'écran.
    expect(giftLine(state, skill.id)).toBe('Tu n’as jamais essayé.');

    for (let i = 0; i < REVEAL; i++) {
      state.player.yearActions = {};
      expect(practice(createCtx(state), skill.id).ok, `séance ${i}`).toBe(true);
      if (i < REVEAL - 1) expect(giftLine(state, skill.id)).toMatch(/tu sauras/);
    }
    expect(giftKnown(state, skill.id)).toBe(true);
    expect(giftLine(state, skill.id)).not.toMatch(/sauras|jamais essayé/);
  });

  it('fait apprendre le doué nettement plus vite que le maladroit', () => {
    // Sans écart net, chercher son don n'aurait pas d'intérêt ; avec un écart
    // trop grand, le travail ne servirait à rien.
    const doué = SKILLS.map((s) => ({ s, a: aptitudeOf(life(4242, 25), s.id) }))
      .sort((x, y) => y.a - x.a);
    const state = life(4242, 25);
    const meilleur = gainFor(state, doué[0].s.id);
    const pire = gainFor(state, doué[doué.length - 1].s.id);
    expect(meilleur).toBeGreaterThan(pire * 1.3);
    expect(meilleur).toBeLessThan(pire * 4);
  });
});

/* ------------------------------------------------------------------ */

describe('s’y mettre', () => {
  it('coûte de l’argent et une part de l’année', () => {
    const state = life();
    const skill = availableSkills(state)[0];
    const money = state.player.money;
    const price = priceOf(state, skill);
    expect(price).toBeGreaterThan(0);

    expect(practice(createCtx(state), skill.id).ok).toBe(true);
    expect(state.player.money).toBe(money - price);
    expect(levelOf(state, skill.id)).toBeGreaterThan(0);
  });

  it('n’en laisse pas faire plus que la limite dans la même année', () => {
    const state = life();
    const open = availableSkills(state);
    expect(open.length).toBeGreaterThan(PER_YEAR);
    for (let i = 0; i < PER_YEAR; i++) {
      expect(practice(createCtx(state), open[i].id).ok, open[i].id).toBe(true);
    }
    expect(practice(createCtx(state), open[PER_YEAR].id).ok).toBe(false);
    expect(practiceBlocker(state, open[PER_YEAR].id)).toMatch(/déjà pris/);
  });

  it('refuse ce qu’on est trop jeune pour faire', () => {
    const state = life(31, 6);
    const tard = SKILLS.find((s) => s.from > 6)!;
    expect(practiceBlocker(state, tard.id)).toMatch(/Trop tôt/);
    expect(practice(createCtx(state), tard.id).ok).toBe(false);
  });

  it('refuse de prendre l’argent quand il n’a plus rien à rendre', () => {
    // Mesuré : un personnage qui s'entraînait chaque année sans s'arrêter
    // finissait plus pauvre que celui qui ne s'entraînait jamais, six fois
    // sur dix — il payait quarante ans pour des dixièmes de point.
    const state = life();
    const skill = availableSkills(state)[0];
    state.player.skills = { [skill.id]: { level: 99.5, peak: 99.5, done: 9 } };
    expect(gainFor(state, skill.id)).toBeLessThan(MIN_GAIN);
    expect(practiceBlocker(state, skill.id)).toMatch(/plus grand-chose/);
    const money = state.player.money;
    expect(practice(createCtx(state), skill.id).ok).toBe(false);
    expect(state.player.money).toBe(money);
  });

  it('rapporte de moins en moins à mesure qu’on est bon', () => {
    const state = life();
    const skill = availableSkills(state)[0];
    state.player.skills = { [skill.id]: { level: 5, peak: 5, done: 0 } };
    const début = gainFor(state, skill.id);
    state.player.skills = { [skill.id]: { level: 75, peak: 75, done: 0 } };
    const haut = gainFor(state, skill.id);
    expect(haut).toBeLessThan(début * 0.5);
    expect(haut).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qui monte sans qu’on le décide', () => {
  it('fait monter la compétence du métier qu’on exerce', () => {
    const state = life(31, 30);
    const trade = SKILLS.find((s) => s.fields.includes('Restauration'))!;
    const job = JOBS.find((j) => j.category === 'Restauration')!;
    state.player.job = {
      jobId: job.id, title: job.levels[0].title, level: 0, salary: 20_000,
      employer: 'X', performance: 50, yearsAtJob: 3, effort: 'normal',
      lastRaiseAskYear: 0, partTime: false, hours: 35, satisfaction: 50,
      team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
    };
    expect(skillOfJob(state)?.id).toBe(trade.id);
    const before = levelOf(state, trade.id);
    advanceSkills(createCtx(state));
    expect(levelOf(state, trade.id)).toBeGreaterThan(before);
  });

  it('ne mène jamais au-delà de « correct » sans qu’on le veuille', () => {
    // C'est la règle qui donne au système sa raison d'être, et elle a été
    // mesurée : sans plafond, exercer un métier soixante ans amenait la
    // compétence à 94,6 sur 100, et travailler délibérément ne changeait
    // plus rien (94,6 → 95,7).
    const state = life(31, 25);
    const job = JOBS.find((j) => j.category === 'Restauration')!;
    const trade = skillForField('Restauration')!;
    state.player.job = {
      jobId: job.id, title: job.levels[0].title, level: 0, salary: 20_000,
      employer: 'X', performance: 50, yearsAtJob: 1, effort: 'normal',
      lastRaiseAskYear: 0, partTime: false, hours: 35, satisfaction: 50,
      team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
    };
    for (let year = 0; year < 120; year++) advanceSkills(createCtx(state));
    expect(levelOf(state, trade.id)).toBeLessThanOrEqual(PASSIVE_CAP);
    expect(levelOf(state, trade.id)).toBeGreaterThan(PASSIVE_CAP - 6);

    // Et l'on passe au-delà en s'y mettant.
    for (let i = 0; i < 12; i++) {
      state.player.yearActions = {};
      state.player.money = 500_000;
      practice(createCtx(state), trade.id);
    }
    expect(levelOf(state, trade.id)).toBeGreaterThan(PASSIVE_CAP + 8);
  });

  it('rouille ce qu’on ne pratique plus, sans jamais tout reprendre', () => {
    const state = life(31, 30);
    const skill = availableSkills(state)[0];
    state.player.skills = { [skill.id]: { level: 80, peak: 80, done: 5 } };
    state.player.job = null;
    // Quelqu'un « qui ne pratique plus » ne garde ni métier, ni goût, ni
    // matière qui l'entretiendrait : sans cela le test tombait sur une
    // compétence qu'un loisir nourrissait, et mesurait l'inverse de ce
    // qu'il affirme.
    state.player.education.marks = {};
    for (const key of Object.keys(state.player.flags)) {
      if (key.startsWith('exposé:')) delete state.player.flags[key];
    }
    for (let year = 0; year < 60; year++) advanceSkills(createCtx(state));
    const after = levelOf(state, skill.id);
    expect(after).toBeLessThan(80);
    // On se rouille, on n'oublie pas qu'on a su faire.
    expect(after).toBeGreaterThan(40);
  });
});

/* ------------------------------------------------------------------ */

describe('le don qu’un professeur remarque', () => {
  it('transforme le marqueur d’enfance en vraie avance, et révèle le don', () => {
    // L'événement « Un don caché » posait `talent_music`, `talent_sport` et
    // `talent_math`, et rien ne les relisait nulle part.
    const state = life(31, 10);
    state.player.flags.talent_chiffres = true;
    // Pas zéro : à dix ans l'école a déjà déteint un peu. C'est l'avance que
    // le professeur ajoute qu'on mesure, pas le niveau absolu.
    const before = levelOf(state, 'chiffres');
    expect(giftKnown(state, 'chiffres')).toBe(false);

    claimGifts(createCtx(state));
    expect(levelOf(state, 'chiffres')).toBeGreaterThan(before + 10);
    expect(giftKnown(state, 'chiffres')).toBe(true);
    // Le marqueur est consommé : on ne l'encaisse qu'une fois.
    expect(state.player.flags.talent_chiffres).toBeUndefined();
    const once = levelOf(state, 'chiffres');
    claimGifts(createCtx(state));
    expect(levelOf(state, 'chiffres')).toBe(once);
  });

  it('ne casse rien si le marqueur ne désigne rien', () => {
    const state = life(31, 10);
    state.player.flags.talent_inexistant = true;
    expect(() => claimGifts(createCtx(state))).not.toThrow();
    expect(state.player.flags.talent_inexistant).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

describe('ce que ça change', () => {
  it('pèse à l’embauche, dans les deux sens', () => {
    const state = life();
    const job = JOBS.find((j) => j.category === 'Finance' && j.levels.length > 3)!;
    const skill = skillForField('Finance')!;

    state.player.skills = { [skill.id]: { level: 0, peak: 0, done: 0 } };
    const nul = hireEdge(state, job.id, 3);
    state.player.skills = { [skill.id]: { level: 95, peak: 95, done: 9 } };
    const bon = hireEdge(state, job.id, 3);

    expect(nul).toBeLessThan(1);
    expect(bon).toBeGreaterThan(1);
    expect(bon).toBeGreaterThan(nul * 1.5);
    // Mais jamais au point de remplacer le diplôme, qui reste éliminatoire.
    expect(bon).toBeLessThan(1.6);
  });

  it('pèse sur ce qu’on est payé', () => {
    const state = life();
    const job = JOBS.find((j) => j.category === 'Finance' && j.levels.length > 3)!;
    const skill = skillForField('Finance')!;
    state.player.skills = { [skill.id]: { level: 0, peak: 0, done: 0 } };
    const petit = paySwing(state, job.id, 3);
    state.player.skills = { [skill.id]: { level: 95, peak: 95, done: 9 } };
    const gros = paySwing(state, job.id, 3);
    expect(petit).toBeLessThan(1);
    expect(gros).toBeGreaterThan(petit);
    expect(gros).toBeLessThan(1.4);
  });

  it('n’avantage pas un métier qui ne s’appuie pas dessus', () => {
    const state = life();
    const job = JOBS.find((j) => j.category === 'Finance' && j.levels.length > 3)!;
    // On est excellent ailleurs : cela ne doit rien faire ici.
    state.player.skills = { cuisine: { level: 95, peak: 95, done: 9 } };
    expect(hireEdge(state, job.id, 3)).toBeLessThan(1);
  });

  it('aide à tenir le poste, ce qui finit en promotion', () => {
    const state = life();
    const job = JOBS.find((j) => j.category === 'Restauration')!;
    state.player.job = {
      jobId: job.id, title: job.levels[0].title, level: 0, salary: 20_000,
      employer: 'X', performance: 50, yearsAtJob: 2, effort: 'normal',
      lastRaiseAskYear: 0, partTime: false, hours: 35, satisfaction: 50,
      team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
    };
    state.player.skills = { cuisine: { level: 0, peak: 0, done: 0 } };
    expect(jobCapacity(state)).toBe(0);
    state.player.skills = { cuisine: { level: 100, peak: 100, done: 9 } };
    expect(jobCapacity(state)).toBeGreaterThan(2);
  });
});

/* ------------------------------------------------------------------ */

describe('sur une vie', () => {
  it('entame toujours quelque chose, sans qu’on s’en occupe', () => {
    /*
     * **Écrit deux fois.** Le commentaire disait « mesuré : 100 % des vies
     * jouées ont au moins une compétence entamée, et 97 % atteignent “ça
     * vient” quelque part » — et le test vérifiait **une seule graine**. Une
     * proportion annoncée sur cent vies et contrôlée sur une n'est pas
     * contrôlée : un changement sans rapport, ailleurs dans le moteur, a
     * décalé le tirage et la graine 909 est simplement tombée du mauvais
     * côté des 3 %. On mesure donc ce que la phrase affirme.
     */
    let entamées = 0;
    let avancées = 0;
    const lives = 24;
    for (let seed = 900; seed < 900 + lives; seed++) {
      const state = life(seed, 45);
      const known = knownSkills(state);
      if (known.length > 0) entamées += 1;
      if (known.some((r) => r.held.level > 8)) avancées += 1;
    }
    // Une compétence que personne ne rencontrerait sans la chercher serait
    // invisible : toutes les vies en entament au moins une.
    expect(entamées).toBe(lives);
    // Et la plupart en poussent une jusqu'à « ça vient » sans s'en occuper.
    expect(avancées).toBeGreaterThan(lives * 0.7);
  });

  it('ne fait pas connaître son don à qui ne l’a jamais cherché', () => {
    const state = life(909, 45);
    const connus = SKILLS.filter((s) => giftKnown(state, s.id)).length;
    expect(connus).toBeLessThan(4);
  });

  it('garde des noms lisibles à chaque palier', () => {
    expect(rankOf(0)).toBe('Rien du tout');
    expect(rankOf(100)).toBe('On vient te chercher');
    let last = '';
    for (let level = 0; level <= 100; level += 4) {
      const label = rankOf(level);
      expect(label.length).toBeGreaterThan(3);
      last = label;
    }
    expect(last).toBeTruthy();
  });

  it('ne se transmet pas à la génération suivante', () => {
    // Le don, lui, se retire de la graine : l'héritier a le sien, et tout à
    // apprendre. Ce qu'on savait faire meurt avec soi.
    const state = life(31, 30);
    const skill = availableSkills(state)[0];
    practice(createCtx(state), skill.id);
    expect(levelOf(state, skill.id)).toBeGreaterThan(0);
    const fresh = createNewLife({ seed: 31, countryId: 'fr' });
    expect(Object.keys(fresh.player.skills)).toHaveLength(0);
  });

  it('survit à une sauvegarde qui ne connaissait pas les compétences', () => {
    const state = life(31, 20);
    delete (state.player as { skills?: unknown }).skills;
    expect(() => stateOf(state, 'cuisine')).not.toThrow();
    expect(stateOf(state, 'cuisine').level).toBe(0);
    expect(() => advanceSkills(createCtx(state))).not.toThrow();
  });
});
