import { describe, expect, it } from 'vitest';
import { createNewLife, inCity } from '../newLife.ts';
import { COUNTRIES } from '../../data/countries.ts';

describe('annonce de naissance', () => {
  it('nomme toujours les deux parents, employés ou non', () => {
  for (let seed = 0; seed < 40; seed++) {
    const state = createNewLife({ seed: seed * 101 + 7 });
    const line = state.timeline.find((e) => e.text.startsWith('Tu grandis avec'));
    expect(line, `graine ${seed}`).toBeTruthy();
    const mother = Object.values(state.npcs).find((p) => p.relation === 'mother')!;
    const father = Object.values(state.npcs).find((p) => p.relation === 'father')!;
    expect(line!.text).toContain(mother.firstName);
    expect(line!.text).toContain(father.firstName);
    expect(line!.text).toContain('ta mère');
    expect(line!.text).toContain('ton père');
  }
});

  it('contracte l’article des noms de ville', () => {
    expect(inCity('Le Caire')).toBe('au Caire');
    expect(inCity('Le Cap')).toBe('au Cap');
    expect(inCity('Paris')).toBe('à Paris');
    // Aucune ville du jeu ne doit produire « à Le… » (article non contracté).
    // Attention : « Leipzig » commence par « Le » sans être un article.
    for (const country of COUNTRIES) {
      for (const city of country.cities) {
        const phrase = inCity(city.name);
        expect(/^à (Le|La|Les) /.test(phrase), phrase).toBe(false);
      }
    }
  });

  it('ouvre la timeline par la naissance', () => {
    const state = createNewLife({ seed: 4242 });
    expect(state.timeline[0].text).toContain('Tu es né');
  });
});
