/**
 * Vérifications de la filière du sport scolaire.
 *
 * Le catalogue disait deux choses : « on entre dans un club sportif sans
 * jamais être choisi » et « la filière sport scolaire → université →
 * professionnel n'existe pas ». Ce fichier vérifie les deux, et surtout que
 * ce qui a été ajouté est une filière et non une deuxième liste de clubs.
 *
 * 1. **on peut être écarté** — la sélection a une issue négative fréquente,
 *    et elle dépend d'autre chose que du seul niveau ;
 * 2. **l'établissement décide de ce qui est possible** — le champ `sports`,
 *    jusque-là décoratif, ouvre ou ferme des sports entiers ;
 * 3. **un sport d'équipe n'est pas une épreuve individuelle** — dans l'un on
 *    dépend des autres, dans l'autre non ;
 * 4. **être bon ne suffit pas** — la bourse demande d'avoir été vu, et un
 *    sport confidentiel ne fait pas venir de recruteurs ;
 * 5. **ça mène quelque part** — dix ans de filière démarrent la carrière
 *    professionnelle ailleurs qu'à zéro. C'est le raccord qui manquait.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  SCHOLARSHIP, SCHOOL_SPORTS, getSchoolSport, seasonLabel, squadFor,
} from '../../data/schoolSports.ts';
import {
  advanceSchoolSport, captaincyBlocker, captaincyOdds, hasSportScholarship,
  levelLabel, offeredSports, quitSport, runForCaptain, scholarshipGap,
  selectionBlocker, selectionOdds, sportDef, sportHeadStart, sportOf,
  teammateQuality, train, trainingBlocker, trySelection,
} from '../../systems/schoolSport.ts';
import { startDiscipline } from '../../systems/stage.ts';
import { annualTuition } from '../../systems/education.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un collégien ou lycéen, dans un établissement qui propose du sport. */
function pupil(seed: number, age = 14): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (!state.player.origin.school) return null;
  if (offeredSports(state).length === 0) return null;
  state.player.yearActions = {};
  return state;
}

/**
 * Quelqu'un dans l'équipe, à un niveau donné.
 *
 * On force l'entrée en poussant les chances au maximum plutôt qu'en écrivant
 * l'état à la main : il faut que ce soit `trySelection` qui construise la
 * filière, sinon on testerait un objet littéral.
 */
function player(seed: number, sportId = 'course', level = 45, age = 14): GameState | null {
  const state = pupil(seed, age);
  if (!state) return null;
  const sport = getSchoolSport(sportId);
  if (!sport) return null;
  // On rend l'établissement généreux et le corps excellent : la sélection
  // reste un tirage, mais elle passe presque toujours.
  state.player.origin.school!.sports = 100;
  state.player.stats.fitness = 100;
  state.player.stats.health = 100;
  state.player.stats.discipline = 90;
  state.player.stats.intelligence = 90;
  for (let attempt = 0; attempt < 8; attempt++) {
    state.player.yearActions = {};
    if (trySelection(createCtx(state), sportId).ok) break;
    state.player.education.sport = null;
  }
  const s = sportOf(state);
  if (!s || s.cutYear) return null;
  s.level = level;
  s.squad = squadFor(level);
  return state;
}

/* ------------------------------------------------------------------ */

describe('les données tiennent debout', () => {
  it('offre des sports qui ne se ressemblent pas', () => {
    expect(SCHOOL_SPORTS.length).toBeGreaterThanOrEqual(8);
    // Si tous étaient également risqués, également visibles et également
    // sélectifs, choisir n'aurait aucun sens.
    for (const field of ['contact', 'visibility', 'places', 'demands'] as const) {
      const values = SCHOOL_SPORTS.map((s) => s[field]);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(40);
    }
    // Il faut des deux : des sports d'équipe et des épreuves individuelles.
    expect(SCHOOL_SPORTS.some((s) => s.team)).toBe(true);
    expect(SCHOOL_SPORTS.some((s) => !s.team)).toBe(true);
    for (const s of SCHOOL_SPORTS) expect(getSchoolSport(s.id)).toBeDefined();
  });

  it('nomme le niveau et la saison à tous les degrés', () => {
    expect(levelLabel(0)).not.toBe(levelLabel(100));
    expect(seasonLabel(100).label).not.toBe(seasonLabel(0).label);
    expect(seasonLabel(0).label).toBeTruthy();
    expect(squadFor(0)).toBe('espoirs');
    expect(squadFor(100)).toBe('sélection');
  });
});

describe('l’établissement décide de ce qui est possible', () => {
  it('propose d’autant plus de sports qu’il est doté', () => {
    const state = pupil(3);
    if (!state) return;
    state.player.origin.school!.sports = 0;
    const poor = offeredSports(state).length;
    state.player.origin.school!.sports = 100;
    const rich = offeredSports(state).length;
    expect(rich).toBeGreaterThan(poor);
    // Toujours au moins deux : un établissement sans rien du tout n'aurait
    // aucun intérêt de jeu.
    expect(poor).toBeGreaterThanOrEqual(2);
  });

  it('refuse ce qui n’est pas proposé', () => {
    const state = pupil(5);
    if (!state) return;
    state.player.origin.school!.sports = 0;
    const offered = offeredSports(state);
    const absent = SCHOOL_SPORTS.find((s) => !offered.some((o) => o.id === s.id));
    if (!absent) return;
    expect(selectionBlocker(state, absent)).toContain('propose pas');
    expect(trySelection(createCtx(state), absent.id).ok).toBe(false);
  });

  it('ne laisse pas entrer avant le collège, ni depuis une cellule', () => {
    const state = pupil(7);
    if (!state) return;
    const sport = offeredSports(state)[0];
    state.player.age = 9;
    expect(selectionBlocker(state, sport)).toContain('collège');
    state.player.age = 15;
    expect(selectionBlocker(state, sport)).toBeNull();
  });
});

describe('la sélection écarte réellement', () => {
  it('produit des refus, et pas seulement des succès', () => {
    let taken = 0;
    let cut = 0;
    for (let seed = 10; seed < 70; seed++) {
      const state = pupil(seed);
      if (!state) continue;
      const hard = offeredSports(state).reduce((a, b) => (a.demands > b.demands ? a : b));
      // Un corps ordinaire face au sport le plus exigeant de l'établissement.
      state.player.stats.fitness = 42;
      if (trySelection(createCtx(state), hard.id).ok) taken += 1; else cut += 1;
    }
    expect(taken + cut).toBeGreaterThan(20);
    // Les deux issues existent franchement : ni formalité, ni mur.
    expect(cut).toBeGreaterThan(3);
    expect(taken).toBeGreaterThan(3);
  });

  it('dépend du nombre de places autant que du niveau', () => {
    const state = pupil(11);
    if (!state) return;
    state.player.origin.school!.sports = 100;
    const offered = offeredSports(state);
    const wide = offered.reduce((a, b) => (a.places > b.places ? a : b));
    const narrow = offered.reduce((a, b) => (a.places < b.places ? a : b));
    if (wide.id === narrow.id) return;
    // À demandes physiques comparables, davantage de places veut dire
    // davantage de chances. On neutralise l'écart d'exigence.
    state.player.stats.fitness = 70;
    state.player.stats.discipline = 70;
    state.player.stats.intelligence = 70;
    const spread = selectionOdds(state, wide) - selectionOdds(state, narrow);
    const demandGap = (narrow.demands - wide.demands) / 120;
    expect(spread - demandGap).toBeGreaterThan(0);
  });

  it('coûte quelque chose d’être écarté, et n’autorise pas à retenter aussitôt', () => {
    const state = pupil(13);
    if (!state) return;
    // L'établissement d'abord : réduire son programme change la liste, et
    // choisir avant reviendrait à viser un sport qu'il ne propose plus — on
    // testerait alors le blocage, pas le refus.
    state.player.origin.school!.sports = 0;
    const sport = offeredSports(state)[0];
    state.player.stats.fitness = 1;
    state.player.stats.health = 1;
    const happiness = state.player.stats.happiness;
    const result = trySelection(createCtx(state), sport.id);
    if (result.ok) return;
    expect(state.player.stats.happiness).toBeLessThan(happiness);
    expect(sportOf(state)?.cutYear).toBe(state.year);
    state.player.yearActions = {};
    expect(selectionBlocker(state, sport)).not.toBeNull();
  });

  it('efface la trace du refus au bout d’un an', () => {
    const state = pupil(15);
    if (!state) return;
    state.player.origin.school!.sports = 0;
    const sport = offeredSports(state)[0];
    state.player.stats.fitness = 1;
    if (trySelection(createCtx(state), sport.id).ok) return;
    state.year += 1;
    advanceSchoolSport(createCtx(state));
    expect(sportOf(state)).toBeNull();
  });
});

describe('s’entraîner et jouer', () => {
  it('fait monter le niveau, et de moins en moins', () => {
    const low = player(17, 'course', 10);
    const high = player(17, 'course', 88);
    if (!low || !high) return;
    const before = { low: sportOf(low)!.level, high: sportOf(high)!.level };
    train(createCtx(low));
    train(createCtx(high));
    const gainLow = sportOf(low)!.level - before.low;
    const gainHigh = sportOf(high)!.level - before.high;
    expect(gainLow).toBeGreaterThan(0);
    expect(gainLow).toBeGreaterThan(gainHigh);
  });

  it('prend sur les devoirs', () => {
    const state = player(19, 'course', 40);
    if (!state) return;
    state.player.education.grades = 14;
    train(createCtx(state));
    train(createCtx(state));
    expect(state.player.education.grades).toBeLessThan(14);
    // Et pas trois fois dans l'année.
    expect(trainingBlocker(state)).not.toBeNull();
  });

  it('fait monter de groupe quand le niveau suit', () => {
    const state = player(21, 'course', 30);
    if (!state) return;
    const s = sportOf(state)!;
    expect(s.squad).toBe('espoirs');
    s.level = 70;
    s.squad = squadFor(s.level);
    expect(s.squad).toBe('première');
    s.level = 90;
    expect(squadFor(s.level)).toBe('sélection');
  });

  it('solde une saison chaque année, et fait progresser', () => {
    const state = player(23, 'course', 50);
    if (!state) return;
    const s = sportOf(state)!;
    const before = s.level;
    advanceSchoolSport(createCtx(state));
    expect(s.seasons).toBe(1);
    expect(s.lastSeason).toBeGreaterThan(0);
    expect(s.bestSeason).toBeGreaterThanOrEqual(s.lastSeason);
    if (s.injuredUntil === 0) expect(s.level).toBeGreaterThan(before);
  });

  it('blesse, et la blessure fait perdre ce qu’on avait', () => {
    let injuries = 0;
    let lostGround = 0;
    for (let seed = 30; seed < 90; seed++) {
      const state = player(seed, 'mêlée', 60);
      if (!state) continue;
      const s = sportOf(state)!;
      const before = s.level;
      advanceSchoolSport(createCtx(state));
      if (s.injuredUntil > state.year) {
        injuries += 1;
        if (s.level < before) lostGround += 1;
      }
    }
    // Le rugby est le sport le plus rude de la liste : il doit blesser.
    expect(injuries).toBeGreaterThan(0);
    expect(lostGround).toBe(injuries);
  });

  it('fait passer une saison entière à regarder quand on est blessé', () => {
    const state = player(91, 'course', 60);
    if (!state) return;
    const s = sportOf(state)!;
    s.injuredUntil = state.year + 2;
    const seasons = s.seasons;
    advanceSchoolSport(createCtx(state));
    expect(s.seasons).toBe(seasons);
    expect(trainingBlocker(state)).not.toBeNull();
  });
});

describe('l’équipe n’est pas l’individu', () => {
  it('ne fait dépendre des autres que dans un sport collectif', () => {
    const solo = player(93, 'course', 55);
    const team = player(93, 'ballon', 55);
    if (!solo || !team) return;
    expect(sportDef(solo)!.team).toBe(false);
    expect(sportDef(team)!.team).toBe(true);
    // L'épreuve individuelle ignore le niveau des camarades ; le sport
    // collectif le lit.
    expect(teammateQuality(solo)).toBe(50);
    for (const mate of Object.values(team.npcs)) mate.stats.fitness = 100;
    team.player.origin.school!.sports = 100;
    expect(teammateQuality(team)).toBeGreaterThan(50);
  });

  it('fait qu’une bonne saison personnelle peut être gâchée par les autres', () => {
    let goodMates = 0;
    let badMates = 0;
    for (let seed = 100; seed < 150; seed++) {
      const strong = player(seed, 'ballon', 60);
      if (!strong) continue;
      const weak = structuredClone(strong);
      for (const m of Object.values(strong.npcs)) m.stats.fitness = 100;
      strong.player.origin.school!.sports = 100;
      for (const m of Object.values(weak.npcs)) m.stats.fitness = 5;
      weak.player.origin.school!.sports = 5;
      advanceSchoolSport(createCtx(strong));
      advanceSchoolSport(createCtx(weak));
      goodMates += sportOf(strong)!.lastSeason;
      badMates += sportOf(weak)!.lastSeason;
    }
    expect(goodMates).toBeGreaterThan(badMates);
  });

  it('ne nomme un capitaine que là où il y a une équipe', () => {
    const solo = player(151, 'course', 70);
    if (!solo) return;
    sportOf(solo)!.seasons = 3;
    expect(captaincyBlocker(solo)).toContain('capitaine');
    expect(runForCaptain(createCtx(solo)).ok).toBe(false);
  });

  it('donne le brassard à celui qu’on suit, pas au meilleur', () => {
    const state = player(153, 'ballon', 55);
    if (!state) return;
    sportOf(state)!.seasons = 3;
    state.player.origin.popularity.respected = 0;
    state.player.psyche.social.assertiveness = 10;
    const unloved = captaincyOdds(state);
    state.player.origin.popularity.respected = 10;
    state.player.psyche.social.assertiveness = 95;
    const followed = captaincyOdds(state);
    expect(followed).toBeGreaterThan(unloved);

    // Et un très bon joueur que personne ne suit reste derrière quelqu'un de
    // moyen que tout le monde écoute.
    const great = player(153, 'ballon', 95);
    const ordinary = player(153, 'ballon', 40);
    if (!great || !ordinary) return;
    for (const s of [great, ordinary]) sportOf(s)!.seasons = 3;
    great.player.origin.popularity.respected = 0;
    great.player.psyche.social.assertiveness = 5;
    ordinary.player.origin.popularity.respected = 12;
    ordinary.player.psyche.social.assertiveness = 95;
    expect(captaincyOdds(ordinary)).toBeGreaterThan(captaincyOdds(great));
  });

  it('fait du brassard une charge qui se voit ailleurs', () => {
    const state = player(155, 'ballon', 80);
    if (!state) return;
    const s = sportOf(state)!;
    s.seasons = 4;
    state.player.origin.popularity.respected = 12;
    state.player.psyche.social.assertiveness = 98;
    const reputation = state.player.stats.reputation;
    for (let attempt = 0; attempt < 8 && !s.captain; attempt++) {
      state.player.yearActions = {};
      runForCaptain(createCtx(state));
    }
    if (!s.captain) return;
    expect(state.player.stats.reputation).toBeGreaterThan(reputation);
    expect(state.player.origin.popularity.respected).toBeGreaterThan(12);
  });
});

describe('être bon ne suffit pas', () => {
  it('exige d’avoir été vu, pas seulement d’être fort', () => {
    const state = player(157, 'course', 90);
    if (!state) return;
    const s = sportOf(state)!;
    state.player.education.grades = 15;
    s.scouts = 0;
    // Niveau largement suffisant, personne pour le voir : pas de bourse.
    expect(scholarshipGap(state)).toContain('vu');
    expect(hasSportScholarship(state)).toBe(false);
    s.scouts = SCHOLARSHIP.scouts;
    expect(hasSportScholarship(state)).toBe(true);
  });

  it('exige aussi la moyenne : une bourse reste une inscription', () => {
    const state = player(159, 'course', 90);
    if (!state) return;
    const s = sportOf(state)!;
    s.scouts = SCHOLARSHIP.scouts;
    state.player.education.grades = 3;
    expect(hasSportScholarship(state)).toBe(false);
    state.player.education.grades = 15;
    expect(hasSportScholarship(state)).toBe(true);
  });

  it('fait venir les recruteurs sur ce qui se voit', () => {
    // Deux sports, deux visibilités. À niveau et saison comparables, celui
    // qu'on regarde attire davantage.
    let seen = 0;
    let unseen = 0;
    for (let seed = 160; seed < 230; seed++) {
      const loud = player(seed, 'ballon', 85);
      const quiet = player(seed, 'aviron', 85);
      if (!loud || !quiet) continue;
      advanceSchoolSport(createCtx(loud));
      advanceSchoolSport(createCtx(quiet));
      seen += sportOf(loud)?.scouts ?? 0;
      unseen += sportOf(quiet)?.scouts ?? 0;
    }
    expect(seen).toBeGreaterThan(unseen);
  });

  it('fait payer l’université à qui l’obtient', () => {
    const state = player(231, 'course', 90, 18);
    if (!state) return;
    const s = sportOf(state)!;
    state.player.education.stage = 'university';
    state.player.education.majorId = 'droit';
    state.player.education.scholarship = false;
    state.player.education.grades = 15;
    s.scouts = 0;
    const full = annualTuition(state);
    s.scouts = SCHOLARSHIP.scouts;
    expect(hasSportScholarship(state)).toBe(true);
    expect(annualTuition(state)).toBe(0);
    if (full > 0) expect(full).toBeGreaterThan(annualTuition(state));
  });
});

describe('ça mène quelque part', () => {
  it('démarre la carrière professionnelle ailleurs qu’à zéro', () => {
    // C'est le raccord que le catalogue réclamait : « rien ne relie le club du
    // lycée à la sélection ».
    const trained = player(233, 'course', 88, 17);
    if (!trained) return;
    const untrained = structuredClone(trained);
    untrained.player.education.sport = null;

    expect(sportHeadStart(trained)).toBeGreaterThan(0);
    expect(sportHeadStart(untrained)).toBe(0);

    for (const s of [trained, untrained]) {
      s.player.age = 20;
      s.player.yearActions = {};
      s.player.stage = null;
      startDiscipline(createCtx(s), 'sport');
    }
    expect(trained.player.stage!.craft).toBeGreaterThan(untrained.player.stage!.craft + 10);
  });

  it('ne donne aucune avance à qui a été écarté', () => {
    const state = player(235, 'course', 80);
    if (!state) return;
    sportOf(state)!.cutYear = state.year;
    expect(sportHeadStart(state)).toBe(0);
  });

  it('compte le brassard et les recruteurs dans l’avance', () => {
    const state = player(237, 'ballon', 70);
    if (!state) return;
    const s = sportOf(state)!;
    const plain = sportHeadStart(state);
    s.captain = true;
    s.scouts = 3;
    expect(sportHeadStart(state)).toBeGreaterThan(plain);
  });
});

describe('l’année et la sauvegarde', () => {
  it('fait perdre la main quand on quitte l’école', () => {
    const state = player(239, 'course', 60);
    if (!state) return;
    const s = sportOf(state)!;
    state.player.education.stage = 'graduated';
    const before = s.level;
    advanceSchoolSport(createCtx(state));
    expect(s.level).toBeLessThan(before);
    expect(s.seasons).toBe(0);
  });

  it('laisse arrêter, et ne remet rien tout seul', () => {
    const state = player(241, 'course', 60);
    if (!state) return;
    expect(quitSport(createCtx(state)).ok).toBe(true);
    expect(sportOf(state)).toBeNull();
    expect(quitSport(createCtx(state)).ok).toBe(false);
    expect(sportHeadStart(state)).toBe(0);
  });

  it('n’existe pas pour qui n’y est jamais entré', () => {
    const state = pupil(243);
    if (!state) return;
    expect(sportOf(state)).toBeNull();
    expect(sportHeadStart(state)).toBe(0);
    expect(trainingBlocker(state)).not.toBeNull();
    expect(captaincyBlocker(state)).not.toBeNull();
    // Et une année passe sans que rien ne s'y accroche.
    const grades = state.player.education.grades;
    advanceSchoolSport(createCtx(state));
    expect(state.player.education.grades).toBe(grades);
  });

  it('survit à la sauvegarde et reprend où on en était', () => {
    const state = player(245, 'ballon', 55);
    if (!state) return;
    simulateYear(state);
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    const s = sportOf(copy);
    if (!s) return;
    expect(getSchoolSport(s.sportId)).toBeDefined();
    expect(typeof s.level).toBe('number');
    advanceSchoolSport(createCtx(copy));
    expect(sportOf(copy)).not.toBeNull();
  });

  it('remet le compteur d’entraînements à chaque année', () => {
    const state = player(247, 'course', 40);
    if (!state) return;
    const s = sportOf(state)!;
    s.trainedThisYear = 2;
    expect(trainingBlocker(state)).not.toBeNull();
    advanceSchoolSport(createCtx(state));
    expect(s.trainedThisYear).toBe(0);
  });
});
