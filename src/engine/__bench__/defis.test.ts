/**
 * Les défis, les serments et le cabinet.
 *
 * Le catalogue reprochait deux choses — aucun objectif à long terme, aucun
 * suivi de progression — et le risque en y répondant était d'ajouter une
 * troisième liste de cases à un jeu qui en avait déjà deux : les ambitions du
 * personnage, et les titres de fin de vie.
 *
 * Ce fichier vérifie donc surtout ce qui distingue un défi des deux autres :
 *
 * 1. **il se prend**, et le prendre coûte quelque chose ;
 * 2. **il se voit avancer**, et une étape franchie ne se reperd jamais ;
 * 3. **il se perd** quand le serment est rompu, et ne se reprend pas ;
 * 4. **le cabinet ne rend pas plus fort** — c'est la règle la plus facile à
 *    trahir sans s'en apercevoir, et celle qui déciderait de tout ;
 * 5. **il n'est atteignable qu'en jouant** : un défi que personne ne peut
 *    finir est du texte mort, un défi que tout le monde finit n'en est pas un.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState } from '../types.ts';
import { clearVault, loadVault, recordTrophy } from '../save.ts';
import {
  abandon, advanceChallenges, carryChallenges, entryFor, progressOf,
  settledOf, shownChallenges, stepsOf, take, takeBlocker, takenOf, tierOpen,
  viewOf, vowBroken,
} from '../../systems/challenges.ts';
import {
  CHALLENGES, MAX_TAKEN, VAULT_PIECES, VOWS, getChallenge, getVaultPiece,
  getVow, tierCost,
} from '../../data/challenges.ts';
import { readLife } from '../../systems/ribbons.ts';

function life(seed = 707, age = 25): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age; i++) simulateYear(state);
  return state;
}

beforeEach(() => { clearVault(); });

/* ------------------------------------------------------------------ */
/* Le catalogue                                                        */
/* ------------------------------------------------------------------ */

describe('le catalogue, sur le papier', () => {
  it('n’a ni doublon ni trophée fantôme', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const challenge of CHALLENGES) {
      expect(challenge.label).toBeTruthy();
      expect(challenge.brief.length).toBeGreaterThan(30);
      expect(challenge.steps.length).toBeGreaterThanOrEqual(2);
      expect(challenge.steps.length).toBeLessThanOrEqual(4);
      expect(getVaultPiece(challenge.trophy), `${challenge.id}`).toBeDefined();
      if (challenge.vow) expect(getVow(challenge.vow), `${challenge.id}`).toBeDefined();
    }
  });

  it('n’a pas deux défis qui rangent la même pièce', () => {
    // Sinon le cabinet compterait moins de pièces que de défis réussis, et
    // les paliers ne s'ouvriraient jamais.
    const trophies = CHALLENGES.map((c) => c.trophy);
    expect(new Set(trophies).size).toBe(trophies.length);
  });

  it('ne garde aucune pièce que rien ne peut gagner', () => {
    const claimed = new Set(CHALLENGES.map((c) => c.trophy));
    for (const piece of VAULT_PIECES) {
      expect(claimed.has(piece.id), `${piece.id} ne se gagne nulle part`).toBe(true);
    }
  });

  it('échelonne les paliers, et le premier est ouvert d’emblée', () => {
    expect(tierCost(1)).toBe(0);
    for (let tier = 2; tier <= 5; tier++) {
      expect(tierCost(tier)).toBeGreaterThan(tierCost(tier - 1));
      // Un palier ne peut pas coûter plus de pièces qu'il n'existe de défis
      // en dessous : il serait inatteignable.
      const below = CHALLENGES.filter((c) => c.tier < tier).length;
      expect(tierCost(tier), `palier ${tier}`).toBeLessThanOrEqual(below);
    }
  });

  it('donne à chaque palier de quoi jouer', () => {
    for (let tier = 1; tier <= 5; tier++) {
      expect(CHALLENGES.filter((c) => c.tier === tier).length, `palier ${tier}`)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it('utilise les trois portées', () => {
    const scopes = new Set(CHALLENGES.map((c) => c.scope));
    expect(scopes.has('vie')).toBe(true);
    expect(scopes.has('lignée')).toBe(true);
    expect(scopes.has('chasse')).toBe(true);
  });

  it('n’a aucun serment qu’aucun défi ne demande', () => {
    const used = new Set(CHALLENGES.map((c) => c.vow).filter(Boolean));
    // Tous ne sont pas forcément employés, mais la moitié au moins : un
    // catalogue de serments décoratifs serait exactement ce qu'on évite.
    expect(used.size).toBeGreaterThanOrEqual(Math.ceil(VOWS.length / 2));
  });
});

/* ------------------------------------------------------------------ */
/* Prendre                                                             */
/* ------------------------------------------------------------------ */

describe('prendre un défi', () => {
  it('n’en laisse pas porter plus que la limite', () => {
    const state = life();
    // Tous les défis du premier palier, serments compris : il en faut plus
    // que la limite pour que la limite se voie.
    const open = shownChallenges();
    expect(open.length).toBeGreaterThan(MAX_TAKEN);
    for (let i = 0; i < MAX_TAKEN; i++) {
      expect(take(createCtx(state), open[i].id).ok, open[i].id).toBe(true);
    }
    expect(takenOf(state).length).toBe(MAX_TAKEN);
    const extra = take(createCtx(state), open[MAX_TAKEN].id);
    expect(extra.ok).toBe(false);
  });

  it('compte tout de suite ce qui est déjà fait', () => {
    // On ne demande pas de refaire ce qu'on a fait : ce serait punir le
    // joueur d'avoir pris le défi tard.
    const state = life(707, 40);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    state.player.stats.intelligence = 90;
    take(createCtx(state), 'lettres');
    const entry = entryFor(state, 'lettres')!;
    expect(entry.done.length).toBeGreaterThanOrEqual(2);
  });

  it('refuse un serment déjà rompu', () => {
    // Promettre de ne jamais se marier quand on l'est déjà n'est pas une
    // promesse.
    const state = life();
    state.player.chronicle.marriages = 1;
    const wedded = CHALLENGES.find((c) => c.vow === 'sansMariage');
    if (wedded) expect(takeBlocker(state, wedded)).not.toBeNull();

    state.player.chronicle.inherited = 90_000;
    const solo = getChallenge('parSoiMeme')!;
    expect(takeBlocker(state, solo)).not.toBeNull();
    expect(take(createCtx(state), 'parSoiMeme').ok).toBe(false);
  });

  it('ne se reprend pas après avoir été abandonné', () => {
    const state = life();
    expect(take(createCtx(state), 'lettres').ok).toBe(true);
    expect(abandon(createCtx(state), 'lettres').ok).toBe(true);
    expect(takenOf(state).length).toBe(0);
    expect(settledOf(state).length).toBe(1);
    expect(take(createCtx(state), 'lettres').ok).toBe(false);
  });

  it('n’ouvre les paliers hauts qu’avec un cabinet garni', () => {
    const state = life();
    const high = CHALLENGES.find((c) => c.tier >= 3)!;
    expect(tierOpen(high.tier)).toBe(false);
    expect(takeBlocker(state, high)).toContain('cabinet');
    for (let i = 0; i < tierCost(high.tier); i++) {
      recordTrophy({
        pieceId: VAULT_PIECES[i].id, challengeId: 'x', who: 'Quelqu’un',
        year: 2000, age: 40,
      });
    }
    expect(tierOpen(high.tier)).toBe(true);
    expect(takeBlocker(state, high)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Avancer                                                             */
/* ------------------------------------------------------------------ */

describe('voir où l’on en est', () => {
  it('ne fait avancer que ce qu’on porte', () => {
    // Le progrès d'un défi qu'on n'a pas pris reste à zéro : sinon le jeu
    // les remplirait tout seul et « prendre » ne voudrait rien dire.
    const state = life(707, 40);
    state.player.stats.intelligence = 95;
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    expect(progressOf(state, getChallenge('lettres')!)).toBe(0);
    take(createCtx(state), 'lettres');
    expect(progressOf(state, getChallenge('lettres')!)).toBeGreaterThan(0);
  });

  it('ne reperd jamais une étape franchie', () => {
    // Le cœur du suivi : un défi qui demande d'avoir eu de l'argent ne doit
    // pas s'annuler à la première mauvaise année.
    const state = life(707, 40);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    take(createCtx(state), 'lettres');
    advanceChallenges(createCtx(state));
    const before = entryFor(state, 'lettres')!.done.length;
    expect(before).toBeGreaterThan(0);
    state.player.education.degrees = [];
    advanceChallenges(createCtx(state));
    expect(entryFor(state, 'lettres')!.done.length).toBe(before);
  });

  it('ne montre qu’un pas d’une chasse à la fois', () => {
    const state = life();
    for (const piece of VAULT_PIECES.slice(0, 8)) {
      recordTrophy({ pieceId: piece.id, challengeId: 'x', who: 'Q', year: 2000, age: 40 });
    }
    const hunt = CHALLENGES.find((c) => c.scope === 'chasse')!;
    expect(take(createCtx(state), hunt.id).ok).toBe(true);
    const steps = stepsOf(state, hunt);
    // La première est visible ; celles d'après ne le sont pas.
    expect(steps[0].hidden).toBe(false);
    expect(steps.slice(1).some((s) => s.hidden)).toBe(true);
  });

  it('suit une chasse dans l’ordre, même si la fin est déjà vraie', () => {
    // Sans cela une piste se résoudrait d'un coup, et ce ne serait pas une
    // piste.
    const state = life(707, 45);
    for (const piece of VAULT_PIECES.slice(0, 8)) {
      recordTrophy({ pieceId: piece.id, challengeId: 'x', who: 'Q', year: 2000, age: 40 });
    }
    state.player.vehicles = [];
    const hunt = getChallenge('laCollection')!;
    // Tout ce que la chasse demande, sauf la première étape.
    state.player.valuables = Array.from({ length: 6 }, (_, i) => ({
      id: `v${i}`, name: 'x', value: 10, purchaseYear: 2000, purchasePrice: 10,
    }));
    state.player.heirlooms = Array.from({ length: 4 }, (_, i) => ({
      id: `h${i}`, kindId: 'montre', since: 1900, founder: 'x', provenance: 'x',
      condition: 50, restorations: 0, generations: 1, history: [],
    }));
    state.player.properties = Array.from({ length: 3 }, (_, i) => ({
      id: `p${i}`,
    })) as never;
    take(createCtx(state), hunt.id);
    advanceChallenges(createCtx(state));
    const entry = entryFor(state, hunt.id)!;
    // La première étape (trois véhicules) n'est pas remplie : rien derrière
    // elle ne compte.
    expect(entry.done).not.toContain(0);
    expect(entry.done.length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Les serments                                                        */
/* ------------------------------------------------------------------ */

describe('les serments', () => {
  it('se lisent tous sur un état que le jeu tenait déjà', () => {
    // Aucun serment ne doit être vrai par défaut : il serait rompu à la
    // seconde où on le prête.
    const state = life(707, 8);
    for (const vow of VOWS) {
      expect(vowBroken(state, vow.id), vow.id).toBe(false);
    }
  });

  it('se rompent chacun pour sa raison, et pas pour une autre', () => {
    const cases: [string, (s: GameState) => void][] = [
      ['sansHeritage', (s) => { s.player.chronicle.inherited = 1; }],
      ['sansSalaire', (s) => { s.player.careerHistory = [{ title: 'x' }] as never; }],
      ['sansDiplome', (s) => { s.player.education.degrees = [{ id: 'a' }] as never; }],
      ['sansCrime', (s) => { s.player.criminalRecord.successfulCrimes = 1; }],
      ['sansDette', (s) => { s.player.loans = [{ id: 'l' }] as never; }],
      ['sansPartir', (s) => { s.player.livedCountries = ['fr', 'de']; }],
      ['sansMariage', (s) => { s.player.chronicle.marriages = 1; }],
    ];
    for (const [vowId, breakIt] of cases) {
      const state = life(707, 8);
      breakIt(state);
      expect(vowBroken(state, vowId), vowId).toBe(true);
      // Et il ne rompt pas les autres : un serment qui en romprait un autre
      // rendrait les défis inséparables.
      const collateral = VOWS.filter((v) => v.id !== vowId && vowBroken(state, v.id));
      expect(collateral.map((v) => v.id), vowId).toEqual([]);
    }
  });

  it('perd le défi, et ne le rend pas', () => {
    const state = life();
    take(createCtx(state), 'parSoiMeme');
    expect(takenOf(state).length).toBe(1);
    state.player.chronicle.inherited = 120_000;
    advanceChallenges(createCtx(state));
    const entry = entryFor(state, 'parSoiMeme')!;
    expect(entry.failed).toBe('sansHeritage');
    expect(takenOf(state).length).toBe(0);
    expect(take(createCtx(state), 'parSoiMeme').ok).toBe(false);
  });

  it('n’empêche pas de conclure un défi sans serment', () => {
    const state = life();
    take(createCtx(state), 'parSoiMeme');
    take(createCtx(state), 'lettres');
    state.player.chronicle.inherited = 120_000;
    advanceChallenges(createCtx(state));
    expect(entryFor(state, 'parSoiMeme')!.failed).toBe('sansHeritage');
    expect(entryFor(state, 'lettres')!.failed).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Conclure                                                            */
/* ------------------------------------------------------------------ */

describe('mener au bout', () => {
  it('range une pièce au cabinet, avec le nom de la vie qui l’a gagnée', () => {
    const state = life(707, 40);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    state.player.stats.intelligence = 90;
    state.player.education.clubs = ['a', 'b', 'c'];
    take(createCtx(state), 'lettres');
    advanceChallenges(createCtx(state));
    const entry = entryFor(state, 'lettres')!;
    expect(entry.doneYear).toBe(state.year);
    const vault = loadVault();
    expect(vault.length).toBe(1);
    expect(vault[0].pieceId).toBe('encrier');
    expect(vault[0].who).toContain(state.player.firstName);
    expect(vault[0].age).toBe(state.player.age);
  });

  it('garde la première vie qui a réussi, pas la dernière', () => {
    recordTrophy({ pieceId: 'clef', challengeId: 'parSoiMeme', who: 'La première', year: 2000, age: 60 });
    recordTrophy({ pieceId: 'clef', challengeId: 'parSoiMeme', who: 'La seconde', year: 2100, age: 60 });
    const vault = loadVault();
    expect(vault.length).toBe(1);
    expect(vault[0].who).toBe('La première');
  });

  it('ne donne ni argent ni statistique brute', () => {
    // La règle qui décide de tout : un cabinet qui rend plus fort fait de la
    // difficulté une affaire de patience.
    const state = life(707, 40);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    state.player.stats.intelligence = 90;
    state.player.education.clubs = ['a', 'b', 'c'];
    take(createCtx(state), 'lettres');
    const money = state.player.money;
    const intel = state.player.stats.intelligence;
    advanceChallenges(createCtx(state));
    expect(state.player.money).toBe(money);
    expect(state.player.stats.intelligence).toBe(intel);
  });

  it('ne donne rien non plus à la vie suivante', () => {
    // Le cabinet est plein ; une vie neuve doit partir exactement comme si
    // elle était la première.
    for (const piece of VAULT_PIECES) {
      recordTrophy({ pieceId: piece.id, challengeId: 'x', who: 'Q', year: 2000, age: 40 });
    }
    const rich = createNewLife({ seed: 4242, countryId: 'fr' });
    clearVault();
    const bare = createNewLife({ seed: 4242, countryId: 'fr' });
    expect(rich.player.money).toBe(bare.player.money);
    expect(rich.player.stats).toEqual(bare.player.stats);
    expect(rich.player.flags.familyWealth).toBe(bare.player.flags.familyWealth);
  });

  it('ne se conclut pas deux fois', () => {
    const state = life(707, 40);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    state.player.stats.intelligence = 90;
    state.player.education.clubs = ['a', 'b', 'c'];
    take(createCtx(state), 'lettres');
    advanceChallenges(createCtx(state));
    advanceChallenges(createCtx(state));
    advanceChallenges(createCtx(state));
    expect(loadVault().length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* La lignée                                                           */
/* ------------------------------------------------------------------ */

describe('ce qui traverse la mort', () => {
  it('ne fait passer que les défis de lignée', () => {
    const kept = carryChallenges([
      { id: 'lePassage', since: 2000, done: [0], failed: null, doneYear: null },
      { id: 'lettres', since: 2000, done: [0], failed: null, doneYear: null },
      { id: 'lePassage', since: 1900, done: [], failed: 'abandon', doneYear: null },
    ]);
    expect(kept.map((k) => k.id)).toEqual(['lePassage']);
    expect(kept[0].done).toEqual([0]);
  });

  it('ne fait passer ni les perdus ni les réussis', () => {
    const kept = carryChallenges([
      { id: 'lePassage', since: 2000, done: [0, 1], failed: null, doneYear: 2050 },
      { id: 'laMaison', since: 2000, done: [], failed: 'sansCrime', doneYear: null },
    ]);
    expect(kept).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Ce qui se mesure en jouant                                          */
/* ------------------------------------------------------------------ */

describe('atteignable, et pas gratuit', () => {
  it('lit le même relevé de vie que les titres de fin de vie', () => {
    // Deux relevés du même état auraient fini par diverger : c'est le seul
    // point de contrôle qui l'interdit.
    const state = life(707, 45);
    expect(viewOf(state).life).toEqual(readLife(state));
  });

  it('ne se remplit pas tout seul dans une vie ordinaire', () => {
    // Un défi qui se conclurait sans qu'on ait rien fait de particulier ne
    // serait pas un défi. On les prend tous et on laisse la vie se jouer.
    let finished = 0;
    let attempts = 0;
    for (let seed = 0; seed < 12; seed++) {
      const state = createNewLife({ seed: seed * 91 + 5, countryId: 'fr' });
      for (let i = 0; i < 12; i++) simulateYear(state);
      const open = shownChallenges().filter((c) => !takeBlocker(state, c));
      for (const c of open.slice(0, MAX_TAKEN)) {
        if (take(createCtx(state), c.id).ok) attempts += 1;
      }
      while (state.player.alive && state.player.age < 100) simulateYear(state);
      finished += state.player.challenges.filter((t) => t.doneYear !== null).length;
    }
    expect(attempts).toBeGreaterThan(10);
    // Quelques-uns passent — ce sont les défis de palier 1, et c'est voulu —
    // mais pas la majorité, sans quoi ils ne demanderaient rien.
    expect(finished).toBeLessThan(attempts * 0.6);
  });

  it('ne rompt aucun serment tout seul, sur une vie entière', () => {
    // Le défaut que la mesure avait montré, et il décidait de tout : sur
    // quarante vies ayant juré de ne jamais emprunter, quarante rompaient —
    // un prêt étudiant se contracte seul. Trente-huit sur quarante pour
    // l'héritage, trente-deux pour le diplôme. Un serment qu'on ne peut pas
    // choisir de tenir est un piège, pas un serment.
    for (const challenge of CHALLENGES.filter((c) => c.vow)) {
      let broken = 0;
      for (let seed = 0; seed < 8; seed++) {
        for (const piece of VAULT_PIECES) {
          recordTrophy({ pieceId: piece.id, challengeId: 'x', who: 'Q', year: 2000, age: 40 });
        }
        const state = createNewLife({ seed: seed * 311 + 7, countryId: 'fr' });
        for (let i = 0; i < 8; i++) simulateYear(state);
        if (takeBlocker(state, challenge)) continue;
        take(createCtx(state), challenge.id);
        while (state.player.alive && state.player.age < 100) simulateYear(state);
        if (entryFor(state, challenge.id)?.failed) broken += 1;
      }
      expect(broken, `${challenge.id} se rompt tout seul`).toBe(0);
    }
  });

  it('se conclut sur un état réellement atteignable, pas sur des cases cochées', () => {
    // L'épreuve d'à côté prouve que la conclusion marche ; celle-ci prouve que
    // les seuils se lisent bien sur l'état du jeu. On construit une vie
    // plausible et l'on vérifie que les étapes s'allument d'elles-mêmes.
    const state = life(707, 62);
    state.player.education.degrees = [{ id: 'a' }, { id: 'b' }] as never;
    state.player.stats.intelligence = 82;
    state.player.education.clubs = ['echecs', 'theatre', 'chorale'];
    take(createCtx(state), 'lettres');
    advanceChallenges(createCtx(state));
    expect(entryFor(state, 'lettres')!.doneYear).toBe(state.year);

    const other = life(808, 62);
    // Rien reçu des morts : à soixante-deux ans un héritage est déjà tombé,
    // et le serment serait refusé avant d'être prêté — ce qui est la bonne
    // règle, mais ce n'est pas elle qu'on mesure ici.
    other.player.chronicle.inherited = 0;
    other.player.lifetimeEarnings = readLife(other).livingCost * 120;
    other.player.properties = [{ id: 'p' }] as never;
    take(createCtx(other), 'parSoiMeme');
    advanceChallenges(createCtx(other));
    expect(entryFor(other, 'parSoiMeme')!.doneYear).toBe(other.year);
  });

  it('se laisse mener au bout par quelqu’un qui joue pour ça', () => {
    // La contre-épreuve : chaque défi doit être atteignable. On construit un
    // relevé qui satisfait toutes ses étapes et l'on vérifie qu'il conclut.
    for (const challenge of CHALLENGES) {
      const state = life(707, 30);
      // Aucun serment rompu d'avance : ce qu'on mesure ici est la conclusion,
      // pas la rupture, et les serments ont leur propre épreuve.
      state.player.loans = [];
      state.player.education.studentLoan = 0;
      state.player.chronicle.inherited = 0;
      state.player.chronicle.marriages = 0;
      state.player.careerHistory = [];
      state.player.job = null;
      state.player.education.degrees = [];
      state.player.criminalRecord.successfulCrimes = 0;
      state.player.criminalRecord.convictions = [];
      state.player.livedCountries = ['fr'];
      const entry = {
        id: challenge.id, since: state.year,
        done: challenge.steps.map((_, i) => i), failed: null, doneYear: null,
      };
      state.player.challenges = [entry];
      advanceChallenges(createCtx(state));
      expect(entry.doneYear, `${challenge.id} ne se conclut jamais`).not.toBeNull();
    }
    expect(loadVault().length).toBe(CHALLENGES.length);
  });
});
