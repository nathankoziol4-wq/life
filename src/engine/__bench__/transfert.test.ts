/** Export et import d'une partie : le transfert doit être fidèle. */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { exportSave, parseSave, saveFileName } from '../save.ts';

describe('transfert de partie', () => {
  it('restitue une partie identique', () => {
    const state = createNewLife({ seed: 6161 });
    for (let i = 0; i < 30; i++) simulateYear(state);

    const restored = parseSave(exportSave(state));
    expect(restored).not.toBeNull();
    expect(restored).toEqual(state);
    // La partie importée poursuit la même suite de tirages.
    const a = simulateYear(state);
    const b = simulateYear(restored!);
    expect(b.entries.map((e) => e.text)).toEqual(a.entries.map((e) => e.text));
  });

  it('refuse tout contenu qui n’est pas une sauvegarde Odyssia', () => {
    expect(parseSave('')).toBeNull();
    expect(parseSave('bonjour')).toBeNull();
    expect(parseSave('{}')).toBeNull();
    expect(parseSave('[1,2,3]')).toBeNull();
    expect(parseSave('null')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 999, player: { age: 3 } }))).toBeNull();
    // Une sauvegarde tronquée ne doit pas passer.
    const partial = JSON.parse(exportSave(createNewLife({ seed: 1 })));
    delete partial.npcs;
    expect(parseSave(JSON.stringify(partial))).toBeNull();
  });

  it('propose un nom de fichier lisible et sans accent', () => {
    const state = createNewLife({ seed: 3, firstName: 'Élodie', lastName: 'Gaüthier' });
    const name = saveFileName(state);
    expect(name).toBe('odyssia-elodie-gauthier-0ans.json');
    expect(name).toMatch(/^[a-z0-9.-]+$/);
  });
});
