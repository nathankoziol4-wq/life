/**
 * Le garde-fou de l'écran des proches.
 *
 * **Ce test existe à cause de vingt-huit pour cent de gens invisibles.**
 *
 * `RelationshipsScreen` range les vivants par groupes, et filtre la liste sur
 * ces groupes-là. Il en listait vingt sur trente-quatre. Les quatorze autres —
 * grands-parents, petits-enfants, oncles, tantes, cousins, neveux, nièces,
 * belle-famille, professeurs — étaient construits par le moteur, vieillis,
 * suivis d'année en année, dotés d'une personnalité et d'un historique… et
 * n'apparaissaient nulle part. Mesuré sur douze vies jouées jusqu'au bout :
 * **142 personnes vivantes cachées sur 505.**
 *
 * Ce n'était pas un choix : `RELATION_ORDER`, dans `engine/context.ts`, les
 * classe toutes. Quelqu'un les avait prévues, et il manquait des lignes dans
 * un tableau. Le défaut est resté invisible parce qu'un écran qui n'affiche
 * pas quelqu'un ressemble exactement à un écran où il n'y a personne — aucune
 * erreur, aucune ligne fermée, aucun refus muet. Seule une lecture du code
 * pouvait le voir, et c'est ce que fait ce fichier.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { RELATION_LABELS, RELATION_ORDER } from '../context.ts';
import type { RelationKind } from '../types.ts';

const SOURCE = readFileSync(
  new URL('../../screens/RelationshipsScreen.tsx', import.meta.url).pathname, 'utf8',
);

/** Les sortes de liens que l'écran sait ranger, lues dans son tableau. */
function grouped(): string[] {
  const start = SOURCE.indexOf('const GROUPS');
  const end = SOURCE.indexOf('];', start);
  expect(start, 'le tableau GROUPS a changé de nom').toBeGreaterThan(0);
  const block = SOURCE.slice(start, end);
  // On ne relève que ce qui suit `kinds:`, pour ne pas ramasser les titres.
  return [...block.matchAll(/kinds:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1]!.matchAll(/'([a-zA-Z]+)'/g)].map((k) => k[1]!));
}

describe('l’écran des proches', () => {
  it('range toutes les sortes de liens, sans exception', () => {
    const shown = grouped();
    const missing = RELATION_ORDER.filter((r) => !shown.includes(r));
    expect(
      missing,
      `liens jamais affichés : ${missing.map((r) => RELATION_LABELS[r]).join(', ')}`,
    ).toEqual([]);
  });

  it('n’en range aucun deux fois', () => {
    // Un lien dans deux groupes afficherait la même personne à deux endroits,
    // ce qui est l'autre façon de rendre une liste fausse.
    const shown = grouped();
    const seen = new Set<string>();
    const twice = shown.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(twice, `liens rangés deux fois : ${twice.join(', ')}`).toEqual([]);
  });

  it('n’invente pas de lien qui n’existe pas', () => {
    const known = new Set<string>(RELATION_ORDER);
    const unknown = grouped().filter((k) => !known.has(k));
    expect(unknown, `liens inconnus du moteur : ${unknown.join(', ')}`).toEqual([]);
  });

  it('ne cache plus personne dans une vie entière', () => {
    /*
     * La mesure qui a révélé le défaut, gardée comme test : on joue douze vies
     * jusqu'au bout et l'on compte les vivants qu'aucun groupe ne recevrait.
     * C'est plus lent qu'une lecture du tableau, et c'est le seul contrôle qui
     * resterait valable si la façon d'écrire les groupes changeait.
     */
    const shown = new Set(grouped());
    let hidden = 0;
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const state = createNewLife({ seed });
      for (let i = 0; i < 60 && !state.gameOver; i++) simulateYear(state);
      for (const npc of Object.values(state.npcs)) {
        if (!npc.alive || npc.petSpecies) continue;
        total += 1;
        if (!shown.has(npc.relation)) hidden += 1;
      }
    }
    // Avant : 142 sur 505.
    expect(total).toBeGreaterThan(200);
    expect(hidden, `${hidden} personnes vivantes cachées sur ${total}`).toBe(0);
  });

  it('donne un libellé français à chaque lien', () => {
    // Sans quoi une nouvelle sorte de lien s'afficherait sous son nom de code.
    for (const kind of RELATION_ORDER) {
      const label = RELATION_LABELS[kind as RelationKind];
      expect(label, kind).toBeTruthy();
      expect(label, kind).not.toBe(kind);
    }
  });
});
