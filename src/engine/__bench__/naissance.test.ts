import { describe, expect, it } from 'vitest';
import { createNewLife, inCity } from '../newLife.ts';
import { COUNTRIES } from '../../data/countries.ts';

describe('annonce de naissance', () => {
  it('nomme tous les adultes du foyer, employés ou non', () => {
    for (let seed = 0; seed < 40; seed++) {
      const state = createNewLife({ seed: seed * 101 + 7 });
      const line = state.timeline.find((e) => e.text.startsWith('Tu grandis avec'));
      expect(line, `graine ${seed}`).toBeTruthy();
      const parents = state.player.origin.parents;
      expect(parents.length, `graine ${seed}`).toBeGreaterThan(0);
      // Aucun adulte élevant l'enfant ne doit être passé sous silence, même
      // sans emploi : c'était le bug d'origine.
      for (const role of parents) {
        const person = state.npcs[role.personId];
        expect(person, `graine ${seed}`).toBeTruthy();
        expect(line!.text, `graine ${seed} — ${role.role}`).toContain(person.firstName);
      }
    }
  });

  it('respecte la structure familiale demandée', () => {
    const alone = createNewLife({ seed: 909, draft: { presetId: 'singleParent' } });
    expect(alone.player.origin.structure).toBe('parent seul');
    expect(alone.player.origin.parents.length).toBe(1);

    const both = createNewLife({ seed: 909, draft: { presetId: 'middleSuburb' } });
    expect(both.player.origin.parents.length).toBe(2);
    expect(both.player.origin.couple).not.toBeNull();
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
