/**
 * Vérifications de la lignée.
 *
 * L'audit relevait, en priorité 1 : « la mort termine la partie : le monde et
 * le patrimoine sont perdus ». Reprendre un descendant change la portée de
 * toutes les décisions d'une vie — le testament, la maison, la brouille avec
 * sa fille — qui n'avaient jusqu'ici de conséquence que sur un écran de fin.
 *
 * Les tests portent sur ce qui distingue une vraie succession d'un
 * recommencement déguisé :
 *
 * 1. **le monde continue** — même année, même économie, même famille ;
 * 2. **la parenté est recalculée, et juste** — le conjoint du défunt devient
 *    un parent, les autres enfants des frères et sœurs, et les gens qui
 *    n'appartenaient qu'à la vie précédente s'effacent ;
 * 3. **on hérite de ce qu'on a laissé** — l'argent, et surtout le milieu :
 *    c'est là que se voit ce qu'une génération transmet à la suivante ;
 * 4. **la lignée se souvient** — chaque génération laisse une ligne, et
 *    l'ancêtre devient un PNJ qu'on peut retrouver ;
 * 5. **ça tourne** — le moteur doit faire vivre le nouveau personnage sans
 *    rien casser.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  canContinue, continueAs, heirsOf, relationTo, tierFromWealth,
} from '../../systems/lineage.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../../systems/relationships.ts';
import { autoplayFrom, autoplayLife } from './autoplay.ts';
import { killPlayer } from '../simulateYear.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/**
 * Une vie avec conjoint et enfants, quelle que soit la graine.
 *
 * Se marier et avoir des enfants sont des actions du joueur : une vie jouée
 * toute seule n'en a jamais. On les provoque donc par les vraies fonctions du
 * moteur, plutôt que d'écrire des PNJ à la main — sinon le test vérifierait
 * son propre décor.
 */
function familyLife(seed: number, kids = 2, ageAtBirth = 28): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, ageAtBirth);
  if (state.gameOver || !state.player.alive) return null;

  const ctx = createCtx(state);
  const partner = meetRomanticProspect(ctx, 70);
  marry(ctx, partner);
  for (let i = 0; i < kids; i++) {
    deliverBaby(createCtx(state));
    playTo(state, 2);
    if (state.gameOver || !state.player.alive) return null;
  }
  return state;
}

/** La même vie, jouée jusqu'à la mort. */
function deadWithHeirs(seed: number): GameState | null {
  const state = familyLife(seed);
  if (!state) return null;
  // Les enfants doivent avoir l'âge de reprendre.
  playTo(state, 30);
  if (state.gameOver || !state.player.alive) {
    return canContinue(state) ? state : null;
  }
  killPlayer(createCtx(state), 'de vieillesse');
  return canContinue(state) ? state : null;
}

describe('on peut reprendre un descendant', () => {
  it('propose les enfants vivants, du plus proche au plus lointain', () => {
    const state = deadWithHeirs(3);
    if (!state) return;
    const heirs = heirsOf(state);
    expect(heirs.length).toBeGreaterThan(0);
    for (const heir of heirs) {
      expect(heir.person.alive).toBe(true);
      expect(heir.person.age).toBeGreaterThanOrEqual(8);
    }
    // Les enfants passent avant les petits-enfants.
    const distances = heirs.map((h) => h.distance);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('ne propose rien à qui n’a pas de descendance', () => {
    const state = createNewLife({ seed: 5 });
    playTo(state, 40);
    if (state.gameOver) return;
    killPlayer(createCtx(state), 'de vieillesse');
    expect(canContinue(state)).toBe(false);
  });
});

describe('le monde continue', () => {
  it('garde l’année, l’économie et l’inflation', () => {
    const state = deadWithHeirs(7);
    if (!state) return;
    const year = state.year;
    const inflation = state.world.inflation;
    const economy = state.world.economy;
    const next = continueAs(state, heirsOf(state)[0].person.id);
    expect(next.year).toBe(year);
    expect(next.world.inflation).toBe(inflation);
    expect(next.world.economy).toBe(economy);
    expect(next.gameOver).toBe(false);
    expect(next.player.alive).toBe(true);
  });

  it('garde la timeline : une lignée a une mémoire continue', () => {
    const state = deadWithHeirs(11);
    if (!state) return;
    const before = state.timeline.length;
    const next = continueAs(state, heirsOf(state)[0].person.id);
    expect(next.timeline.length).toBeGreaterThan(before);
  });

  it('fait tourner le moteur pour le nouveau personnage', () => {
    const state = deadWithHeirs(13);
    if (!state) return;
    const next = continueAs(state, heirsOf(state)[0].person.id);
    const age = next.player.age;
    for (let i = 0; i < 5 && !next.gameOver; i++) {
      simulateYear(next);
      next.pending = [];
    }
    expect(next.player.age).toBeGreaterThan(age);
    // Aucune statistique ne doit être sortie de ses bornes au passage.
    for (const [key, value] of Object.entries(next.player.stats)) {
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThanOrEqual(100);
    }
  });
});

describe('la parenté est recalculée depuis le nouveau point de vue', () => {
  it('fait du conjoint du défunt un parent de l’héritier', () => {
    const state = deadWithHeirs(17);
    if (!state) return;
    const spouse = Object.values(state.npcs).find((x) => x.relation === 'spouse' && x.alive);
    const heir = heirsOf(state)[0].person;
    if (!spouse || !spouse.childrenIds.includes(heir.id)) return;
    const next = continueAs(state, heir.id);
    expect(['mother', 'father']).toContain(next.npcs[spouse.id]?.relation);
  });

  it('fait des autres enfants des frères et sœurs', () => {
    const state = deadWithHeirs(19);
    if (!state) return;
    const heirs = heirsOf(state);
    if (heirs.length < 2) return;
    const sibling = heirs[1].person.id;
    const next = continueAs(state, heirs[0].person.id);
    expect(['brother', 'sister']).toContain(next.npcs[sibling]?.relation);
  });

  it('efface ce qui n’appartenait qu’à la vie précédente', () => {
    const state = deadWithHeirs(23);
    if (!state) return;
    const heir = heirsOf(state)[0].person;
    // Un collègue : il n'a aucune raison de suivre l'héritier.
    const stranger = Object.values(state.npcs).find(
      (x) => x.relation === 'coworker' || x.relation === 'classmate' || x.relation === 'inmate',
    );
    const next = continueAs(state, heir.id);
    if (stranger) expect(next.npcs[stranger.id]).toBeUndefined();
    // Et plus personne ne porte un lien du bureau.
    for (const npc of Object.values(next.npcs)) {
      expect(['coworker', 'boss', 'classmate', 'inmate', 'teacher'], npc.id)
        .not.toContain(npc.relation);
    }
  });

  it('remonte la filiation au lieu de traduire les anciens liens', () => {
    // Un test direct sur la fonction : c'est elle qui décide de tout, et une
    // table de correspondance « le père de mon père devient mon grand-père »
    // se tromperait dès qu'un maillon manque.
    const state = createNewLife({ seed: 29 });
    playTo(state, 12);
    if (state.gameOver) return;
    const npcs = Object.values(state.npcs);
    const parent = npcs.find((x) => x.relation === 'mother' || x.relation === 'father');
    const grandparent = npcs.find(
      (x) => (x.relation === 'grandmother' || x.relation === 'grandfather')
        && parent?.parentIds.includes(x.id),
    );
    if (!parent || !grandparent) return;

    // Vu par un enfant fictif du joueur, le parent du joueur est un
    // grand-parent et le grand-parent un aïeul qu'on ne nomme plus.
    const me = npcs.find((x) => x.relation === 'brother' || x.relation === 'sister');
    if (!me) return;
    expect(relationTo(state, me, parent)).toMatch(/mother|father/);
    expect(relationTo(state, me, grandparent)).toMatch(/grand/);
  });

  it('ne se prend jamais pour un membre de sa propre famille', () => {
    const state = deadWithHeirs(31);
    if (!state) return;
    const heir = heirsOf(state)[0].person;
    expect(relationTo(state, heir, heir)).toBeNull();
    const next = continueAs(state, heir.id);
    expect(next.npcs[heir.id]).toBeUndefined();
  });
});

describe('on hérite de ce qu’on a laissé', () => {
  it('crédite à l’héritier ce que la succession lui a donné', () => {
    const state = deadWithHeirs(37);
    if (!state) return;
    const heir = heirsOf(state)[0];
    const expected = Math.max(0, Math.round(heir.wealth));
    const next = continueAs(state, heir.person.id);
    expect(next.player.money).toBe(expected);
  });

  it('fait dépendre le milieu de départ de la fortune transmise', () => {
    // C'est le cœur de la transmission : ce que la génération précédente a
    // laissé décide de l'enfance de la suivante. Sans cela, reprendre un
    // enfant ne serait qu'une nouvelle partie avec un autre nom.
    const state = deadWithHeirs(41);
    if (!state) return;
    expect(tierFromWealth(state, 0)).toBe('poor');
    expect(tierFromWealth(state, 30_000)).toBe('modest');
    expect(tierFromWealth(state, 150_000)).toBe('middle');
    expect(tierFromWealth(state, 900_000)).toBe('upper');
    expect(tierFromWealth(state, 9_000_000)).toBe('rich');
  });

  it('donne réellement un meilleur départ à un héritier fortuné', () => {
    const rich = deadWithHeirs(43);
    const poor = deadWithHeirs(43);
    if (!rich || !poor) return;
    const richHeir = heirsOf(rich)[0].person;
    const poorHeir = heirsOf(poor)[0].person;
    // Les seuils sont exprimés en monnaie constante : une vie qui s'achève
    // en 2100 a traversé beaucoup d'inflation, et un montant fixe ne veut
    // plus rien dire. On part donc du seuil lui-même.
    const index = rich.world.inflation * 1.5;
    richHeir.wealth = 2_500_000 * index;
    poorHeir.wealth = 0;
    const a = continueAs(rich, richHeir.id);
    const b = continueAs(poor, poorHeir.id);
    // Le milieu, pas seulement le solde bancaire : c'est ce qui rend
    // l'héritage structurel plutôt que cosmétique.
    expect(a.player.flags.familyTier).toBe('rich');
    expect(b.player.flags.familyTier).toBe('poor');
    expect(a.player.origin.capitals.economic)
      .toBeGreaterThan(b.player.origin.capitals.economic);
  });

  it('garde le nom de famille', () => {
    const state = deadWithHeirs(47);
    if (!state) return;
    const name = state.player.lastName;
    const heir = heirsOf(state)[0].person;
    const next = continueAs(state, heir.id);
    if (heir.lastName === name) expect(next.player.lastName).toBe(name);
  });
});

describe('la lignée se souvient', () => {
  it('enregistre une ligne par génération', () => {
    const state = deadWithHeirs(53);
    if (!state) return;
    const dead = state.player;
    const next = continueAs(state, heirsOf(state)[0].person.id);
    expect(next.lineage).toHaveLength(1);
    const entry = next.lineage![0];
    expect(entry.generation).toBe(1);
    expect(entry.name).toContain(dead.firstName);
    expect(entry.ageAtDeath).toBe(dead.age);
    expect(entry.birthYear).toBe(dead.birthYear);
  });

  /**
   * **Le registre pointait sur des morts effacés, et le test d'à côté ne
   * pouvait pas le voir.**
   *
   * Celui qui suit vérifie qu'un défunt reste retrouvable — mais à la première
   * génération, où il est simplement le père de l'héritier. Le trou était plus
   * loin : `relationTo` ne remonte que jusqu'aux grands-parents, et
   * `continueAs` efface du monde quiconque il ne sait pas nommer. Dès la
   * quatrième génération, le fondateur de la lignée était donc supprimé de la
   * sauvegarde en laissant son nom au registre et rien derrière — mesuré sur
   * soixante lignées, la totalité d'entre eux.
   *
   * Il n'y avait pas d'arbre à parcourir parce qu'on effaçait le tronc.
   * Ce test joue les lignées jusqu'où elles vont, et exige que chaque entrée
   * du registre désigne encore quelqu'un.
   */
  it('garde tous ses ancêtres, même le fondateur, à toutes les générations', () => {
    let deepest = 1;
    let checked = 0;
    for (let i = 0; i < 60; i += 1) {
      const seed = i * 7919 + 3;
      let state = autoplayLife(seed);
      let generation = 1;
      while (canContinue(state) && generation < 7) {
        state = continueAs(state, heirsOf(state)[0]!.person.id);
        generation += 1;
        state = autoplayFrom(state, seed + generation * 104_729);
        for (const entry of state.lineage ?? []) {
          checked += 1;
          expect(
            state.npcs[entry.personId],
            `génération ${generation} : l’ancêtre ${entry.name} (gén. ${entry.generation}) n’existe plus`,
          ).toBeDefined();
        }
      }
      deepest = Math.max(deepest, generation);
    }
    // Sans cela, le test passerait aussi bien en n'atteignant jamais la
    // profondeur où le trou se trouvait.
    expect(deepest, 'aucune lignée ne va assez loin pour éprouver quoi que ce soit')
      .toBeGreaterThanOrEqual(4);
    expect(checked).toBeGreaterThan(40);
  });

  it('transforme le défunt en ancêtre retrouvable', () => {
    const state = deadWithHeirs(59);
    if (!state) return;
    const heir = heirsOf(state)[0].person;
    const next = continueAs(state, heir.id);
    const ancestorId = next.lineage![0].personId;
    const ancestor = next.npcs[ancestorId];
    expect(ancestor).toBeDefined();
    expect(ancestor.alive).toBe(false);
    // Vu par son enfant, le défunt est un parent.
    expect(['mother', 'father']).toContain(ancestor.relation);
  });

  it('empile les générations sans en perdre', () => {
    const state = deadWithHeirs(61);
    if (!state) return;
    const first = continueAs(state, heirsOf(state)[0].person.id);
    // La génération suivante : on refait une famille et on remet ça.
    const ctx = createCtx(first);
    const partner = meetRomanticProspect(ctx, 70);
    marry(ctx, partner);
    deliverBaby(createCtx(first));
    playTo(first, 20);
    if (first.gameOver || !first.player.alive) {
      if (!canContinue(first)) return;
    } else {
      killPlayer(createCtx(first), 'de vieillesse');
    }
    if (!canContinue(first)) return;
    const second = continueAs(first, heirsOf(first)[0].person.id);
    expect(second.lineage).toHaveLength(2);
    expect(second.lineage![1].generation).toBe(2);
    // Les deux ancêtres restent joignables.
    for (const entry of second.lineage!) {
      expect(second.npcs[entry.personId], String(entry.generation)).toBeDefined();
    }
  });
});

describe('le nouveau personnage part sur des bases propres', () => {
  it('ne récupère ni le casier, ni l’entreprise, ni la notoriété du défunt', () => {
    const state = deadWithHeirs(67);
    if (!state) return;
    state.player.fame.level = 80;
    state.player.criminalRecord.arrests = 4;
    const next = continueAs(state, heirsOf(state)[0].person.id);
    expect(next.player.fame.level).toBe(0);
    expect(next.player.criminalRecord.arrests).toBe(0);
    expect(next.player.business).toBeNull();
    expect(next.player.freelance).toBeNull();
    expect(next.player.job).toBeNull();
  });

  it('garde en revanche ce qui appartenait déjà à l’héritier', () => {
    const state = deadWithHeirs(71);
    if (!state) return;
    const heir = heirsOf(state)[0].person;
    const stats = { ...heir.stats };
    const next = continueAs(state, heir.id);
    expect(next.player.stats.intelligence).toBe(stats.intelligence);
    expect(next.player.age).toBe(heir.age);
    expect(next.player.firstName).toBe(heir.firstName);
    expect(next.player.sex).toBe(heir.sex);
  });

  it('ne laisse pas un adulte sans le moindre bagage scolaire', () => {
    const state = deadWithHeirs(73);
    if (!state) return;
    const heir = heirsOf(state)[0].person;
    const next = continueAs(state, heir.id);
    if (next.player.age >= 22) {
      expect(next.player.education.stage).toBe('graduated');
    }
  });
});
