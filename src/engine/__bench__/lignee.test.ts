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
import type { GameState, Player } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  canContinue, continueAs, heirsOf, relationTo, tierFromWealth,
} from '../../systems/lineage.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../../systems/relationships.ts';
import { autoplayFrom, autoplayLife } from './autoplay.ts';
import { JOBS } from '../../data/jobs.ts';
import { netWorth } from '../../systems/finance.ts';
import { getCountry } from '../../data/countries.ts';
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

describe('l’héritier arrive avec ce qu’il avait déjà vécu', () => {
  /**
   * **Reprendre par un descendant rendait un homme de quarante-cinq ans qui
   * n'avait jamais travaillé.**
   *
   * Mesuré au moment de la succession, contre quelqu'un d'ordinaire amené au
   * même âge : l'héritier avait un emploi dans 0 % des cas contre 100 %, zéro
   * poste tenu contre quatre, zéro compétence contre neuf, zéro diplôme contre
   * deux. Et rien de cela n'était vrai dans la fiction — il avait été un PNJ
   * pendant quarante-cinq ans, et `lives.ts` lui avait donné une vraie
   * carrière : **cent pour cent des héritiers ont un métier** juste avant la
   * reprise, avec des titres pris dans le catalogue du jeu.
   *
   * Conséquence mesurée, à âge et à fortune égaux : l'héritier laissait 7 425
   * là où le témoin laissait 32 747. Hériter était quatre fois pire que ne pas
   * hériter.
   *
   * **Les quatre vérifications partagent une seule passe.** Écrites chacune
   * avec sa propre boucle de soixante vies, elles refaisaient quatre fois le
   * même calcul et portaient ce fichier à soixante-cinq secondes — assez pour
   * que le rapporteur de vitest lâche un « Timeout calling onTaskUpdate ». La
   * couverture est la même ; le coût est divisé par quatre.
   */
  interface Taken {
    age: number;
    title: string | null;
    salary: number;
    birthYear: number;
    year: number;
    job: Player['job'];
    skills: number;
    degrees: Player['education']['degrees'];
    level: number;
    posts: number;
    inflation: number;
    country: string;
  }

  const taken: Taken[] = [];
  for (let i = 0; i < 60; i += 1) {
    const state = autoplayLife(i * 7919 + 3);
    if (!canContinue(state)) continue;
    const heir = heirsOf(state)[0]!.person;
    const before = {
      age: heir.age, title: heir.jobTitle, salary: heir.salary, birthYear: heir.birthYear,
    };
    const next = continueAs(state, heir.id);
    taken.push({
      ...before,
      year: next.year,
      job: next.player.job,
      skills: Object.keys(next.player.skills).length,
      degrees: next.player.education.degrees,
      level: next.player.education.level ?? 0,
      posts: next.player.careerHistory.length,
      inflation: next.world.inflation,
      country: next.player.countryId,
    });
  }

  /** Ceux dont le poste figure au catalogue : c'est ce qui doit passer. */
  const working = taken.filter((t) => t.title && t.title !== 'Retraité' && t.age >= 18
    && JOBS.some((j) => j.levels.some((l) => l.title === t.title)));

  it('a produit assez de cas pour que le reste veuille dire quelque chose', () => {
    expect(taken.length).toBeGreaterThan(15);
    expect(working.length).toBeGreaterThan(10);
  });

  it('garde le métier qu’il exerçait comme PNJ', () => {
    for (const t of working) {
      expect(t.job, `${t.title} à ${t.age} ans`).not.toBeNull();
      expect(t.job!.title).toBe(t.title);
      expect(t.posts).toBeGreaterThan(0);
    }
  });

  it('sait faire quelque chose, et a le diplôme de son niveau', () => {
    const adults = working.filter((t) => t.age >= 25 && t.job);
    expect(adults.length).toBeGreaterThan(8);
    for (const t of adults) {
      expect(t.skills, 'un actif sans aucun savoir-faire').toBeGreaterThan(0);
      // Le niveau d'études était calculé puis les diplômes vidés : quelqu'un
      // de « niveau 3 » n'avait rien à montrer, et tout ce qui lit `degrees`
      // le traitait en sans-diplôme.
      if (t.level >= 1) {
        expect(t.degrees.length, `niveau ${t.level} sans diplôme`).toBeGreaterThan(0);
      }
      for (const degree of t.degrees) {
        expect(degree.level).toBeLessThanOrEqual(t.level);
        expect(degree.year).toBeLessThanOrEqual(t.year);
        expect(degree.year).toBeGreaterThanOrEqual(t.birthYear);
      }
    }
  });

  /**
   * **Le salaire doit être dans la monnaie de l'année.**
   *
   * Ce test exigeait d'abord que le salaire de l'héritier *dépasse* celui de sa
   * fiche de PNJ — ce qui était vrai, mais seulement parce que les PNJ étaient
   * sous-payés d'un facteur égal à l'inflation. C'était donc un test qui
   * mesurait un bogue, et il est tombé le jour où le bogue a été corrigé à la
   * source (`npc.ts#agePerson`, `markets.ts#inflationStep`).
   *
   * Ce qu'il faut tenir n'est pas un rapport entre deux nombres, c'est que le
   * salaire soit du même ordre que ce qu'on offre au joueur pour ce poste-là,
   * cette année-là. Il l'était vingt fois moins à la troisième génération.
   */
  it('est payé dans la monnaie de l’année, pas dans celle d’il y a cent ans', () => {
    const paid = taken.filter((t) => t.job);
    expect(paid.length).toBeGreaterThan(10);
    for (const t of paid) {
      const level = JOBS.find((j) => j.id === t.job!.jobId)?.levels[t.job!.level];
      if (!level) continue;
      /*
       * La grille est en monnaie de référence : ramenée au pays **et** à
       * l'année, elle donne l'ordre de grandeur attendu.
       *
       * `salaryIndex` manquait ici, et cela n'était pas une approximation
       * inoffensive : dans un pays dont l'indice vaut justement 0,25, le
       * rapport tombait exactement sur la borne tolérée, et le test se jouait
       * à l'arrondi près — il est tombé sur « 62 126 n'est pas plus grand que
       * 62 126,26 ».
       */
      const expected = level.salary * getCountry(t.country).salaryIndex * t.inflation;
      // Large — l'ancienneté, la reconversion et le hasard de l'embauche
      // écartent légitimement les deux nombres — mais pas d'un facteur dix.
      expect(t.job!.salary, `${t.job!.title} : ${t.job!.salary} pour une grille à ${Math.round(expected)}`)
        .toBeGreaterThan(expected * 0.3);
    }
  });

  it('n’invente rien à qui n’avait rien', () => {
    // L'inverse du reproche : on ne fabrique pas une carrière à un enfant.
    for (const t of taken.filter((x) => x.age < 18)) {
      expect(t.job, `${t.age} ans avec un emploi`).toBeNull();
      expect(t.posts).toBe(0);
    }
  });
});

/**
 * **Une lignée doit pouvoir se relever.**
 *
 * Mesurée en monnaie constante, elle mourait : patrimoine médian laissé de
 * 29 331 à la première génération, 4 442 à la deuxième, **zéro** à partir de
 * la troisième, négatif à la sixième. Chaque génération consommait ce qu'elle
 * recevait et laissait moins.
 *
 * Deux causes, et une seule était dans le jeu. La vraie : l'héritier arrivait
 * sans métier, sans compétence et sans diplôme, à quarante-cinq ans
 * (`carryOwnLife` la corrige). La fausse : l'autojoueur ne changeait jamais de
 * poste, si bien que l'héritier, une fois pourvu, restait trente ans au même
 * salaire — c'était l'instrument qui rendait zéro, pas la lignée.
 *
 * Les deux corrigées, la lignée creuse à la deuxième génération puis remonte :
 * 34 334 · 13 730 · 27 409 · 32 545. Ce test tient le fait qu'elle remonte.
 */
describe('la lignée ne s’éteint pas d’elle-même', () => {
  it('se relève après le creux de la reprise', () => {
    const left = new Map<number, number[]>();
    for (let i = 0; i < 40; i += 1) {
      const seed = i * 7919 + 3;
      let state = autoplayLife(seed);
      let generation = 1;
      const note = (g: number, value: number) => {
        if (!left.has(g)) left.set(g, []);
        left.get(g)!.push(value);
      };
      note(1, netWorth(state) / state.world.inflation);
      while (canContinue(state) && generation < 5) {
        state = continueAs(state, heirsOf(state)[0]!.person.id);
        generation += 1;
        state = autoplayFrom(state, seed + generation * 104_729);
        note(generation, netWorth(state) / state.world.inflation);
      }
    }
    const median = (xs: number[]) => {
      const sorted = [...xs].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };

    const third = left.get(3) ?? [];
    expect(third.length, 'aucune lignée n’atteint la troisième génération').toBeGreaterThan(5);
    // Le point du test : la troisième génération laisse quelque chose. Elle
    // laissait exactement zéro, et une médiane nulle ne se lit pas comme une
    // pauvreté — elle se lit comme un système qui ne fonctionne plus.
    expect(median(third), 'la troisième génération ne laisse rien').toBeGreaterThan(0);
  });
});

describe('le nouveau personnage part sur des bases propres', () => {
  it('ne récupère ni le casier, ni l’entreprise, ni la notoriété du défunt', () => {
    const state = deadWithHeirs(67);
    if (!state) return;
    state.player.fame.level = 80;
    state.player.criminalRecord.arrests = 4;
    const deadJob = state.player.job?.title ?? null;
    const heir = heirsOf(state)[0]!.person;
    const ownJob = heir.jobTitle;
    const next = continueAs(state, heir.id);
    expect(next.player.fame.level).toBe(0);
    expect(next.player.criminalRecord.arrests).toBe(0);
    expect(next.player.business).toBeNull();
    expect(next.player.freelance).toBeNull();
    /*
     * **Ce test exigeait `job === null`, et cette ligne était le bogue.**
     *
     * Elle était rangée sous « ne récupère rien du défunt », ce qui est la
     * bonne intention — mais le métier de l'héritier n'a jamais été celui du
     * défunt. C'est le sien : il l'exerçait comme PNJ, `lives.ts` le lui avait
     * donné, et la succession l'effaçait. Ce qu'il faut vérifier n'est donc pas
     * qu'il arrive sans rien, c'est qu'il arrive avec **le sien**.
     */
    if (next.player.job) {
      expect(next.player.job.title).toBe(ownJob);
      if (deadJob && deadJob !== ownJob) expect(next.player.job.title).not.toBe(deadJob);
    }
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
