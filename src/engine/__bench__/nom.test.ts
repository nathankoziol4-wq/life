/**
 * Le nom — naître de quelqu'un.
 *
 * La naissance couvrait tout : parents avec métier et âge, fratrie, famille
 * élargie, richesse du foyer, logement, quartier, hérédité, dix-sept milieux
 * composables, adoption et placement. Une seule chose manquait, et le
 * catalogue la disait en cinq mots : « hériter d'une notoriété au berceau ».
 *
 * Sept exigences :
 *
 * 1. **c'est rare**, sinon ce n'est qu'un milieu de plus dans la liste ;
 * 2. **le parent est un vrai parent**, à qui l'on peut parler et dont on peut
 *    hériter — pas une figure ajoutée à côté ;
 * 3. **le nom n'ouvre que sa porte** : ailleurs il ne décide de rien, et là
 *    où rien n'est public il ne fait rien du tout ;
 * 4. **il fait comparer là où il ouvre** — c'est le contrepoids, et il est au
 *    même endroit que l'avantage ;
 * 5. **il se voit dès l'enfance**, ce qui se paie partout ;
 * 6. **il s'use**, et les trois hauteurs se distinguent sur la durée ;
 * 7. **on peut s'en défaire**, ce qui donne enfin une conséquence à changer
 *    de nom.
 *
 * Et une exigence de plomberie qui a failli tout casser : **naître ne
 * consomme aucun tirage.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { JOBS } from '../../data/jobs.ts';
import { FAME_FIELDS } from '../../data/fame.ts';
import { BORN_KNOWN, FADE, FORGOTTEN, STANDINGS } from '../../data/legacy.ts';
import {
  advanceLegacy, bearer, doorFor, hiringEdge, legacyOf, nameLevel,
  shadowFor, watchedFactor,
} from '../../systems/legacy.ts';
import { changeName } from '../../systems/activities.ts';

/** La première vie qui naît avec un nom. */
function named(): GameState | null {
  for (let s = 0; s < 40_000; s++) {
    const state = createNewLife({ seed: s * 31 + 7 });
    if (state.player.legacy) return state;
  }
  return null;
}

describe('naître d’un nom', () => {
  it('reste une exception', () => {
    /*
     * Mesuré sur trois mille naissances : 117, soit 3,90 % pour une cible de
     * 3,5 %. Il faut que cela reste rare — à une vie sur douze on le
     * rencontrerait sans y penser, et ce ne serait plus une autre façon de
     * jouer mais un milieu de plus dans la liste.
     */
    let born = 0;
    const fields = new Set<string>();
    const standings = new Set<string>();
    for (let s = 0; s < 1_200; s++) {
      const legacy = createNewLife({ seed: s * 31 + 7 }).player.legacy;
      if (!legacy) continue;
      born += 1;
      fields.add(legacy.field);
      standings.add(legacy.standing);
    }
    const rate = born / 1_200;
    expect(rate).toBeGreaterThan(BORN_KNOWN * 0.4);
    expect(rate).toBeLessThan(BORN_KNOWN * 2.2);
    // Et la variété existe : sans elle, « le nom » serait toujours le même.
    expect(standings.size).toBe(STANDINGS.length);
    expect(fields.size).toBeGreaterThan(6);
  });

  it('ne consomme aucun tirage', () => {
    /*
     * **Ce qui a failli tout casser.** `buildHousehold` tourne à la création
     * de toutes les vies : un `rng.chance` y décale la suite pseudo-aléatoire
     * de chaque partie dès l'année zéro. Mesuré, cela a fait tomber quatre
     * tests d'équilibrage — famille, notoriété, placements, pratiques — sans
     * qu'aucune règle du jeu ait changé. Le hachage déterministe rend le même
     * résultat sans rien prélever.
     *
     * On le vérifie là où ça compte : une vie entière doit se dérouler à
     * l'identique, que le tirage du nom ait dit oui ou non.
     */
    const source = readFileSync(
      new URL('../../systems/legacy.ts', import.meta.url).pathname, 'utf8',
    );
    const body = source.slice(source.indexOf('export function bestowName'));
    /*
     * **Sans les commentaires.** La première version de ce contrôle lisait le
     * corps tel quel et échouait sur sa propre explication, laquelle cite
     * `rng.chance` pour dire pourquoi on ne s'en sert pas. C'est du texte, pas
     * du code.
     */
    const fn = body.slice(0, body.indexOf('\n}')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(fn).not.toContain('rng.');
    expect(fn).toContain('hash(');

    // Et la preuve par la partie : même graine, même monde.
    const a = createNewLife({ seed: 4242 });
    const b = createNewLife({ seed: 4242 });
    for (let i = 0; i < 25; i++) { simulateYear(a); simulateYear(b); }
    expect(a.player.money).toBe(b.player.money);
    expect(a.player.stats.happiness).toBe(b.player.stats.happiness);
  });

  it('prend un vrai parent du foyer', () => {
    // Pas une figure ajoutée à côté : quelqu'un à qui l'on peut parler, avec
    // qui l'on peut se fâcher, et dont on peut hériter.
    const state = named();
    if (!state) return;
    const parent = bearer(state);
    expect(parent).not.toBeNull();
    expect(['mother', 'father', 'stepmother', 'stepfather', 'guardian', 'grandmother', 'grandfather'])
      .toContain(parent!.relation);
    // Et le parent est réellement connu, pas seulement dans la tête du joueur.
    expect(Number(parent!.flags.famous ?? 0)).toBeGreaterThan(0);
  });
});

describe('ce que le nom ouvre', () => {
  it('n’ouvre que son domaine', () => {
    /*
     * Mesuré : ×1,628 dans le domaine du parent, ×1,120 dans un autre, et
     * ×1,000 là où rien n'est public — soit un rapport de 5,2 entre dedans et
     * dehors. C'est la règle qui empêche le nom d'être une prime de départ.
     */
    const state = named();
    if (!state) return;
    const legacy = state.player.legacy!;
    const other = FAME_FIELDS.find((f) => f.id !== 'aucun' && f.id !== legacy.field)!.id;

    const inside = doorFor(state, legacy.field);
    const outside = doorFor(state, other);
    const nowhere = doorFor(state, null);

    expect(inside).toBeGreaterThan(outside);
    expect(outside).toBeGreaterThan(1);
    /*
     * **Et rien du tout là où rien n'est public.** La première version
     * appliquait le petit bonus « autre domaine » au cas `null` : le nom
     * aidait donc jusqu'à la caisse d'un supermarché.
     */
    expect(nowhere).toBe(1);
    expect(inside - 1).toBeGreaterThan((outside - 1) * 3);
  });

  it('ne s’applique qu’à des catégories de métiers qui existent', () => {
    /*
     * **Le défaut que ce test existe pour attraper.** Deux des sept premières
     * entrées du pont catégorie → domaine étaient fausses — « Droit » pour
     * « Droit & Justice », « Arts » pour « Arts & Spectacle » — et ne
     * correspondaient donc à rien, silencieusement : le nom n'ouvrait pas là
     * où il devait, sans que rien ne le signale.
     */
    const source = readFileSync(
      new URL('../../systems/legacy.ts', import.meta.url).pathname, 'utf8',
    );
    const block = source.slice(source.indexOf('const FIELD_BY_CATEGORY'));
    const keys = [...block.slice(0, block.indexOf('};')).matchAll(/'([^']+)':\s*'/g)]
      .map((m) => m[1]!)
      // La valeur du couple est un domaine de notoriété, pas une catégorie.
      .filter((k) => !FAME_FIELDS.some((f) => f.id === k));
    const categories = new Set(JOBS.map((j) => j.category));
    expect(keys.length).toBeGreaterThan(4);
    expect(keys.filter((k) => !categories.has(k))).toEqual([]);
  });

  it('donne un avantage à l’embauche, borné', () => {
    const state = named();
    if (!state) return;
    for (const category of new Set(JOBS.map((j) => j.category))) {
      const edge = hiringEdge(state, category);
      expect(edge).toBeGreaterThanOrEqual(1);
      expect(edge).toBeLessThanOrEqual(1.8);
    }
  });
});

describe('ce que le nom coûte', () => {
  it('fait comparer là où il ouvre, et nulle part ailleurs', () => {
    /*
     * **Le contrepoids, et il est au même endroit que l'avantage.** Mesuré
     * sur douze ans du même métier exposé : dans le domaine du parent, la
     * notoriété atteint 100 et les reproches 43 ; ailleurs, 69 et 13. Le nom
     * porte trente et un points plus haut **et** laisse trente points de
     * reproches en plus. Sans cela, suivre le parent serait le bon calcul
     * dans tous les cas.
     */
    const state = named();
    if (!state) return;
    const legacy = state.player.legacy!;
    const other = FAME_FIELDS.find((f) => f.id !== 'aucun' && f.id !== legacy.field)!.id;
    expect(shadowFor(state, legacy.field)).toBeGreaterThan(1);
    expect(shadowFor(state, other)).toBe(1);
    expect(shadowFor(state, null)).toBe(1);
  });

  it('se voit dès l’enfance, partout', () => {
    const state = named();
    if (!state) return;
    expect(watchedFactor(state)).toBeGreaterThan(1);
    // Chez qui n'a hérité d'aucun nom, cela ne change rien.
    expect(watchedFactor(createNewLife({ seed: 999_331 }))).toBe(1);
  });
});

describe('ce que le temps en fait', () => {
  it('use le nom, et distingue les hauteurs sur la durée', () => {
    /*
     * À 2,6 par an — la première valeur — un nom même immense était oublié
     * vers vingt-six ans : il ne colorait plus que l'enfance, c'est-à-dire la
     * partie de la vie où presque rien ne s'en sert. À 1,1, un nom régional
     * s'éteint vers vingt ans et une figure tient une vie entière.
     */
    const state = named();
    if (!state) return;
    const before = nameLevel(state);
    for (let i = 0; i < 10; i++) {
      state.year += 1;
      advanceLegacy(createCtx(state));
    }
    expect(nameLevel(state)).toBeLessThan(before);
    expect(nameLevel(state)).toBeGreaterThan(before - FADE * 10 - 1);

    // Les trois hauteurs ne mettent pas le même temps à disparaître.
    const lives = STANDINGS.map((s) => Math.max(0, (s.level - FORGOTTEN) / FADE));
    for (let i = 1; i < lives.length; i++) expect(lives[i]!).toBeGreaterThan(lives[i - 1]!);
    expect(lives[0]!).toBeLessThan(30);
    expect(lives[lives.length - 1]!).toBeGreaterThan(55);
  });

  it('finit par ne plus rien vouloir dire', () => {
    const state = named();
    if (!state) return;
    for (let i = 0; i < 120 && legacyOf(state); i++) {
      state.year += 1;
      advanceLegacy(createCtx(state));
    }
    expect(legacyOf(state)).toBeNull();
  });
});

describe('s’en défaire', () => {
  it('donne enfin une conséquence à changer de nom', () => {
    /*
     * `activities.ts#changeName` était marqué dans le catalogue : « aucune
     * conséquence : ni réputation, ni réaction des proches ». En voici une, et
     * elle ne concerne que le parent dont on portait le nom.
     */
    const state = named();
    if (!state) return;
    state.player.age = 30;
    state.player.money = 100_000;
    const parent = bearer(state)!;
    const before = parent.relationship;

    const result = changeName(createCtx(state), 'Camille', 'Sanslenom');
    expect(result.ok).toBe(true);
    expect(legacyOf(state)).toBeNull();
    if (parent.alive) expect(parent.relationship).toBeLessThan(before);
    // La porte est fermée : le nom ne sert plus nulle part.
    expect(doorFor(state, state.player.legacy!.field)).toBe(1);
  });

  it('ne se déclenche pas quand on ne change que de prénom', () => {
    const state = named();
    if (!state) return;
    state.player.age = 30;
    state.player.money = 100_000;
    const kept = state.player.lastName;
    expect(changeName(createCtx(state), 'Camille', kept).ok).toBe(true);
    expect(legacyOf(state)).not.toBeNull();
  });
});

describe('l’écran', () => {
  it('dit ce que le nom vaut et où il sert', () => {
    const source = readFileSync(
      new URL('../../screens/ProfileScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('legacyOf');
    expect(source).toContain('nameLevel');
    // Et il dit la règle, qui est ce qu'on ne devinerait pas.
    expect(source).toContain('que dans son domaine');
  });
});
