/**
 * La bête — l'animal qui vivait dans la sauvegarde et pas dans la vie.
 *
 * Le jeu savait adopter neuf espèces, payer leur entretien et les faire mourir
 * de vieillesse. `Pet.happiness` était écrit à deux endroits et **lu nulle
 * part** : il baissait de trois à dix points par an et ne décidait de rien.
 *
 * Six exigences :
 *
 * 1. **le contentement est lu**, sans quoi rien de ce qui suit n'existe ;
 * 2. **les trois provenances sont trois bêtes**, pas trois prix ;
 * 3. **les moments sont comptés** et se partagent entre toutes les bêtes ;
 * 4. **lire la bête bat les recettes toutes faites** — sans quoi le tableau
 *    des natures est de la décoration ;
 * 5. **l'attention achète des années**, mesurées et non postulées ;
 * 6. **on peut s'en séparer**, ce qui n'existait pas du tout.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Pet } from '../types.ts';
import { adoptPetSpecies } from '../../systems/activities.ts';
import {
  BEAST_SOURCES, CARES, MISERY, NATURES, TRAIN_BOND,
} from '../../data/beast.ts';
import { PET_SPECIES } from '../../data/activities.ts';
import {
  bondOf, calmOf, careBlocker, deathFactor, entrust, griefOf, keptFactor,
  momentsLeft, momentsPerYear, needFor, partingCost, priceFrom, reachOf,
  spendMoment, surrender, trainingOf, wants,
} from '../../systems/beast.ts';

/** Un adulte installé, de quoi payer, et une bête d'une provenance donnée. */
function keeper(seed: number, speciesId: string, sourceId: string): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 26 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = 400_000;
  p.pets = [];
  if (!adoptPetSpecies(createCtx(state), speciesId, false, sourceId).ok) return null;
  p.yearActions = {};
  return state;
}

const beast = (state: GameState): Pet => state.player.pets[0]!;

describe('ce que le moteur lit enfin', () => {
  it('fait dépendre la fin de la bête de ce qu’on en a fait', () => {
    /*
     * Le défaut d'origine : `happiness` était écrit et jamais lu. Ce test
     * fige la lecture — deux bêtes identiques à ceci près qu'on s'est occupé
     * de l'une n'ont pas la même probabilité de fin.
     */
    const held: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 4,
      happiness: 95, health: 95, annualCost: 800, bond: 95, training: 80,
    };
    const left: Pet = { ...held, id: 'b', happiness: 5, health: 30, bond: 0, training: 0 };

    expect(keptFactor(held)).toBeGreaterThan(keptFactor(left));
    expect(deathFactor(held)).toBeLessThan(deathFactor(left));
    // Et l'écart est un rapport, pas un arrondi : à peu près du simple au triple.
    expect(deathFactor(left) / deathFactor(held)).toBeGreaterThan(2);
  });

  it('fait dépendre le chagrin de ce qu’il y avait', () => {
    // Avant, toute mort coûtait le même chiffre : quatorze points, que la bête
    // ait passé douze ans à tes pieds ou six mois dans une cage.
    const near: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 9,
      happiness: 90, health: 80, annualCost: 800, bond: 100,
    };
    const stranger: Pet = { ...near, bond: 0 };
    expect(griefOf(near)).toBeGreaterThan(griefOf(stranger) * 3);
  });
});

describe('d’où elle vient', () => {
  it('donne trois bêtes différentes, et pas trois prix', () => {
    /*
     * Mesuré sur trente tirages, un chien :
     *
     *     refuge      |  176 | 2,8 ans | ouverture 21 | santé 63
     *     éleveur     | 1876 | 0,0 an  | ouverture 71 | santé 93
     *     animalerie  | 1173 | 0,4 an  | ouverture 45 | santé 78
     *
     * Dix fois moins cher au refuge, et trois ans de vie déjà passés ailleurs.
     */
    const seen: { ease: number; health: number; age: number; price: number }[] = [];
    for (const source of BEAST_SOURCES) {
      const state = keeper(1_003, 'dog', source.id);
      if (!state) continue;
      const pet = beast(state);
      seen.push({
        ease: pet.ease ?? 0, health: pet.health, age: pet.age,
        price: priceFrom(900, source.id),
      });
    }
    expect(seen).toHaveLength(3);
    // Le refuge est le moins cher, l'éleveur le plus.
    expect(seen[0].price).toBeLessThan(seen[2].price);
    expect(seen[1].price).toBeGreaterThan(seen[2].price);
    // Et ce ne sont pas les mêmes bêtes : l'éleveur est plus ouvert et plus sain.
    expect(seen[1].ease).toBeGreaterThan(seen[0].ease);
    expect(seen[1].health).toBeGreaterThan(seen[0].health);
    expect(seen[0].age).toBeGreaterThan(seen[1].age);
  });

  it('rend le refuge en conscience ce qu’il ne rend pas en années', () => {
    const shelter = keeper(211, 'dog', 'refuge');
    const breeder = keeper(211, 'dog', 'eleveur');
    if (!shelter || !breeder) return;
    expect(shelter.player.stats.karma).toBeGreaterThan(breeder.player.stats.karma);
    expect(400_000 - shelter.player.money).toBeLessThan(400_000 - breeder.player.money);
  });
});

describe('les moments', () => {
  it('sont comptés, et partagés entre toutes les bêtes', () => {
    const state = keeper(31, 'dog', 'eleveur');
    if (!state) return;
    const p = state.player;
    const budget = momentsPerYear(state);
    expect(budget).toBeGreaterThanOrEqual(2);
    expect(momentsLeft(state)).toBe(budget);

    // Une seconde bête ne double pas le temps disponible.
    adoptPetSpecies(createCtx(state), 'cat', false, 'eleveur');
    expect(momentsPerYear(state)).toBe(budget);

    spendMoment(createCtx(state), p.pets[0].id, 'sortir');
    expect(momentsLeft(state)).toBe(budget - 1);
    // Et ce qu'on a donné au chien n'est plus disponible pour le chat.
    let guard = 0;
    while (momentsLeft(state) > 0 && guard < 12) {
      guard += 1;
      spendMoment(createCtx(state), p.pets[1].id, 'soigner');
    }
    expect(momentsLeft(state)).toBe(0);
    expect(careBlocker(state, p.pets[0], 'sortir')).toContain('moment');
  });

  it('dépendent de ce que la vie laisse comme temps', () => {
    // Mesuré : sans travail 4, métier ordinaire 3, métier dévorant 2.
    const state = keeper(37, 'cat', 'eleveur');
    if (!state) return;
    const p = state.player;
    p.job = null;
    const free = momentsPerYear(state);
    p.job = { hours: 52 } as unknown as typeof p.job;
    expect(momentsPerYear(state)).toBeLessThan(free);
  });
});

describe('lire la bête', () => {
  it('ne dit pas la même chose selon son état', () => {
    /*
     * Première mesure : `wants` répondait « dresser » pour six espèces sur
     * six, ce qui n'est pas une lecture. La cause était que le manque de
     * dressage vaut 1 à l'arrivée pour toute espèce dressable ; il est
     * maintenant écarté tant que le lien n'y est pas.
     */
    const base: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 2,
      happiness: 70, health: 80, annualCost: 800, bond: 10,
    };
    expect(wants({ ...base, happiness: 20 })).toBe('sortir');
    expect(wants({ ...base, health: 25 })).toBe('soigner');
    // Le dressage n'apparaît qu'une fois le lien fait.
    expect(wants({ ...base, happiness: 95, health: 98 })).not.toBe('dresser');
    expect(wants({ ...base, happiness: 95, health: 98, bond: 60 })).toBe('dresser');
  });

  it('ne propose pas à une espèce ce dont elle n’a que faire', () => {
    const state = keeper(41, 'fish', 'animalerie');
    if (!state) return;
    // Un aquarium ne se sort pas et ne se dresse pas.
    expect(careBlocker(state, beast(state), 'sortir')).toBeTruthy();
    expect(careBlocker(state, beast(state), 'dresser')).toBeTruthy();
    expect(careBlocker(state, beast(state), 'soigner')).toBeNull();
    expect(wants(beast(state))).toBe('soigner');
  });

  it('refuse le dressage tant que la bête ne te connaît pas', () => {
    const state = keeper(43, 'dog', 'refuge');
    if (!state) return;
    const pet = beast(state);
    pet.bond = TRAIN_BOND - 1;
    expect(careBlocker(state, pet, 'dresser')).toContain('connaît pas');
    pet.bond = TRAIN_BOND + 1;
    expect(careBlocker(state, pet, 'dresser')).toBeNull();
  });

  it('paie mieux le moment juste que le moment machinal', () => {
    /*
     * C'est la correction qui a fait exister le système. Mesuré avant : sortir
     * toujours, dresser toujours, ou lire la bête donnaient **10,4 / 10,4 /
     * 10,7 ans** et un lien de 97 dans les trois cas. N'importe quelle
     * attention saturait tout, donc il n'y avait rien à décider.
     */
    const bored: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 3,
      happiness: 15, health: 95, annualCost: 800, bond: 40, ease: 60,
    };
    const comfortable: Pet = { ...bored, happiness: 95 };
    expect(reachOf(bored, 'sortir')).toBeGreaterThan(reachOf(comfortable, 'sortir') * 2);
    // Et un besoin comblé rapporte encore quelque chose : jamais zéro.
    expect(reachOf(comfortable, 'sortir')).toBeGreaterThan(0);
  });
});

describe('ce que l’attention achète', () => {
  it('achète des années, mesurées et non postulées', () => {
    /*
     * Mesuré sur soixante vies et quinze ans, un chien de refuge :
     *
     *     régime                 | avec toi | âge atteint | santé
     *     rien                   |      5,4 |         7,5 |    48
     *     sortir toujours        |      9,1 |        11,2 |    39
     *     dresser dès qu’on peut |      9,3 |        11,3 |    39
     *     lire la bête           |     10,3 |        12,5 |    88
     *
     * Le promeneur pur meurt en bonne humeur et en mauvaise santé : c'est ce
     * que `keptFactor` sanctionne depuis qu'il compte la santé pour un quart.
     * Le test rejoue les deux extrêmes sur un échantillon réduit.
     */
    const play = (care: ((pet: Pet) => string | null) | null) => {
      let years = 0;
      let lives = 0;
      for (let s = 0; s < 14; s++) {
        const state = keeper(4_000 + s * 7, 'dog', 'refuge');
        if (!state) continue;
        lives += 1;
        const p = state.player;
        const id = beast(state).id;
        for (let y = 0; y < 15 && p.alive && !state.gameOver; y++) {
          const pet = p.pets.find((x) => x.id === id);
          if (!pet) break;
          years += 1;
          let guard = 0;
          while (care && guard < 8) {
            guard += 1;
            const live = p.pets.find((x) => x.id === id);
            const wanted = live ? care(live) : null;
            if (!live || !wanted) break;
            if (!spendMoment(createCtx(state), id, wanted).ok) break;
          }
          simulateYear(state);
        }
      }
      return lives === 0 ? 0 : years / lives;
    };

    const ignored = play(null);
    const read = play((pet) => wants(pet));
    expect(read).toBeGreaterThan(ignored * 1.4);
  });

  it('retire du stress à proportion de ce qui a été construit', () => {
    const state = keeper(53, 'dog', 'eleveur');
    if (!state) return;
    const pet = beast(state);
    pet.bond = 0;
    pet.training = 0;
    expect(calmOf(state)).toBe(0);
    pet.bond = 100;
    const bonded = calmOf(state);
    expect(bonded).toBeGreaterThan(1);
    pet.training = 100;
    expect(calmOf(state)).toBeGreaterThan(bonded);
  });

  it('laisse ne rien faire possible, sans en faire une confiscation', () => {
    /*
     * Premier réglage mesuré : **cinquante-neuf bêtes sur soixante** étaient
     * retirées en moins de cinq ans, toutes espèces confondues. Ne rien faire
     * n'était pas une façon de jouer.
     *
     * Deux garde-fous depuis : le compteur ne monte que sous un seuil profond,
     * et l'on ne retire que les bêtes dont le malheur se voit. Une espèce
     * discrète laissée à elle-même vieillit mal, mais reste.
     */
    const state = keeper(59, 'turtle', 'animalerie');
    if (!state) return;
    const p = state.player;
    const id = beast(state).id;
    for (let y = 0; y < 12 && p.alive && !state.gameOver; y++) simulateYear(state);
    const still = p.pets.find((x) => x.id === id);
    // Elle est peut-être morte de vieillesse — elle n'a pas été retirée.
    expect(state.timeline.some((e) => e.text.includes('ne vit plus chez toi'))).toBe(false);
    if (still) expect(still.happiness).toBeLessThan(MISERY);
  });
});

describe('s’en séparer', () => {
  it('coûte ce que le lien valait', () => {
    const near: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 8,
      happiness: 90, health: 85, annualCost: 800, bond: 100,
    };
    expect(partingCost(near)).toBeGreaterThan(partingCost({ ...near, bond: 0 }) * 3);
  });

  it('confier fait sortir la bête et réchauffe celui qui la prend', () => {
    const state = keeper(61, 'dog', 'eleveur');
    if (!state) return;
    const p = state.player;
    // `npcs` est un dictionnaire, pas une liste.
    const someone = Object.values(state.npcs).find((n) => n.alive);
    if (!someone) return;
    beast(state).bond = 80;
    const warmth = someone.relationship;
    const id = beast(state).id;
    expect(entrust(createCtx(state), id, someone.id).ok).toBe(true);
    expect(p.pets.find((x) => x.id === id)).toBeUndefined();
    expect(someone.relationship).toBeGreaterThan(warmth);
  });

  it('rendre coûte en conscience, à proportion', () => {
    const held = keeper(67, 'dog', 'eleveur');
    const stranger = keeper(67, 'dog', 'eleveur');
    if (!held || !stranger) return;
    beast(held).bond = 100;
    beast(stranger).bond = 0;
    const heldKarma = held.player.stats.karma;
    const strangerKarma = stranger.player.stats.karma;
    surrender(createCtx(held), beast(held).id);
    surrender(createCtx(stranger), beast(stranger).id);
    expect(heldKarma - held.player.stats.karma)
      .toBeGreaterThan(strangerKarma - stranger.player.stats.karma);
  });
});

describe('le catalogue', () => {
  it('donne une nature à chaque espèce du jeu', () => {
    // Deux catégories de métier avaient été écrites de travers dans un
    // chantier précédent et ne correspondaient à rien. Ce test empêche la
    // même erreur ici : une espèce sans nature tomberait silencieusement sur
    // la valeur par défaut.
    for (const species of PET_SPECIES) {
      expect(NATURES[species.id], species.id).toBeDefined();
    }
  });

  it('donne à chaque soin au moins une espèce qui en a besoin', () => {
    for (const care of CARES) {
      const useful = PET_SPECIES.some((s) => NATURES[s.id][care.needs] >= 0.5);
      expect(useful, care.id).toBe(true);
    }
  });

  it('n’a pas d’espèce qui ne demande rien', () => {
    for (const species of PET_SPECIES) {
      const pet: Pet = {
        id: 'x', name: 'X', species: species.name, speciesId: species.id,
        age: 1, happiness: 40, health: 50, annualCost: 100, bond: 50,
      };
      const answers = CARES.map((c) => needFor(pet, c.id));
      expect(Math.max(...answers), species.id).toBeGreaterThan(0);
    }
  });

  it('ne construit le lien qu’avec des moments, jamais avec de l’argent', () => {
    /*
     * Le lien ne dépend que du soin donné, de la nature de l'espèce et de
     * l'ouverture de la bête. Le vétérinaire existe et achète de la santé —
     * c'est ce que l'argent peut faire à la place du temps — mais il n'achète
     * pas la relation, sans quoi les moments ne seraient plus la monnaie du
     * système et il n'y aurait plus rien à arbitrer.
     */
    const rich: Pet = {
      id: 'a', name: 'A', species: 'Chien', speciesId: 'dog', age: 2,
      happiness: 40, health: 60, annualCost: 800, bond: 0, ease: 50,
    };
    const before = reachOf(rich, 'sortir');
    rich.annualCost = 99_999;
    expect(reachOf(rich, 'sortir')).toBe(before);
  });

  it('ne laisse pas `advanceBeast` tirer dans la séquence du moteur', () => {
    /*
     * Un chantier précédent (« Le nom ») a consommé un tirage `rng` à chaque
     * naissance et décalé quatre tests d'équilibrage d'un coup : la séquence
     * est partagée par tout le moteur.
     *
     * Trois fois j'ai aussi écrit un test qui vérifiait « le code ne fait pas
     * X » et qui passait parce qu'il rencontrait mon propre commentaire
     * expliquant qu'il ne le faisait pas. La parade est d'assurer sur les
     * **spécificateurs d'importation** et sur le corps de la fonction, jamais
     * sur une chaîne qu'une explication pourrait contenir.
     */
    const source = readFileSync(
      new URL('../../systems/beast.ts', import.meta.url), 'utf8',
    );
    const body = source.slice(source.indexOf('export function advanceBeast'));
    expect(body).not.toMatch(/\brng\.[a-z]/);
    // Le hachage déterministe, lui, doit bien être là.
    expect(body).toMatch(/\bhash\(/);
  });
});

describe('ce que la bête coûte quand on la laisse', () => {
  it('se dégrade vraiment, et pas seulement dans un nombre invisible', () => {
    const state = keeper(71, 'dog', 'eleveur');
    if (!state) return;
    const p = state.player;
    const id = beast(state).id;
    const start = beast(state).happiness;
    for (let y = 0; y < 4 && p.alive && !state.gameOver; y++) simulateYear(state);
    const still = p.pets.find((x) => x.id === id);
    if (!still) return;
    expect(still.happiness).toBeLessThan(start - 20);
    expect(bondOf(still)).toBe(0);
    expect(trainingOf(still)).toBe(0);
  });
});
