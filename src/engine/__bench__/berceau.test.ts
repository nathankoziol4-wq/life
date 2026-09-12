/**
 * Ce qu'on décide avant de naître.
 *
 * Trois feuilles du catalogue disaient ce groupe absent. Une mesure a montré
 * que le moteur honorait déjà presque tout et que seul l'écran manquait — et
 * qu'une seule chose n'avait vraiment aucun chemin de données : le potentiel
 * hérité.
 *
 * Ces tests tiennent les deux moitiés du travail :
 *
 * 1. **ce qui existait déjà marche vraiment** — sinon deux notes périmées
 *    seraient remplacées par deux affirmations non vérifiées ;
 * 2. **l'enveloppe est neutre**, et composer ne décale pas la partie.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { previewOrigin } from '../../systems/originGen.ts';
import {
  BUILDS, GIFTS, GIFT_MAX, GIFT_MIN, GIFT_STEP, LOOKS, LOOK_POOLS, POOL,
  baseOf, canLower, canRaise, giftWord, remaining, spent,
} from '../../data/cradle.ts';
import type { GameState } from '../types.ts';
import type { OriginDraft } from '../origin.ts';

const SEED = 4242;
const life = (draft: Partial<OriginDraft> = {}): GameState =>
  createNewLife({ seed: SEED, draft });

/* ------------------------------------------------------------------ */

describe('l’enveloppe', () => {
  it('vaut exactement ce que le hasard donnait', () => {
    // C'est la seule chose qui distingue une création d'une triche : le
    // tirage ordinaire vise 52, 52 et 56. Composer rend différent, pas plus
    // fort.
    expect(POOL).toBe(GIFTS.reduce((sum, g) => sum + g.base, 0));
    expect(POOL).toBe(160);
    expect(remaining({})).toBe(0);
    expect(spent({})).toBe(POOL);
  });

  it('oblige à baisser pour monter', () => {
    const gifts: Record<string, number> = {};
    for (const gift of GIFTS) gifts[gift.key] = gift.base;
    // Tout est placé : on ne peut rien pousser sans reprendre ailleurs.
    for (const gift of GIFTS) expect(canRaise(gifts, gift.key), gift.key).toBe(false);

    gifts[GIFTS[1].key] -= GIFT_STEP;
    expect(remaining(gifts)).toBe(GIFT_STEP);
    expect(canRaise(gifts, GIFTS[0].key)).toBe(true);
  });

  it('tient ses bornes dans les deux sens', () => {
    const low: Record<string, number> = { [GIFTS[0].key]: GIFT_MIN };
    expect(canLower(low, GIFTS[0].key)).toBe(false);

    const high: Record<string, number> = {
      [GIFTS[0].key]: GIFT_MAX,
      [GIFTS[1].key]: GIFT_MIN,
      [GIFTS[2].key]: GIFT_MIN,
    };
    expect(canRaise(high, GIFTS[0].key)).toBe(false);
  });

  it('donne à chaque potentiel sa moyenne pour valeur par défaut', () => {
    // Un tiers de l'enveloppe laissait un point qui traînait (160 / 3 = 53,
    // et 53 × 3 = 159) : l'écran s'ouvrait en annonçant « il te reste 1 à
    // placer » sans que le joueur ait rien touché.
    for (const gift of GIFTS) expect(baseOf(gift.key)).toBe(gift.base);
    expect(baseOf('cognitivePotential')).toBe(52);
  });

  it('nomme chaque niveau, sans jamais rendre un vide', () => {
    for (let value = 0; value <= 100; value += 3) {
      expect(giftWord(value).length, String(value)).toBeGreaterThan(3);
    }
    expect(giftWord(90)).not.toBe(giftWord(20));
  });
});

/* ------------------------------------------------------------------ */

describe('le potentiel hérité', () => {
  it('arrive vraiment jusqu’à la naissance', () => {
    const tete = life({ gifts: { cognitivePotential: 90, athleticPotential: 35, constitution: 35 } });
    const corps = life({ gifts: { cognitivePotential: 35, athleticPotential: 90, constitution: 35 } });
    expect(tete.player.genetics.cognitivePotential).toBe(90);
    expect(corps.player.genetics.athleticPotential).toBe(90);
  });

  it('change ce qui en découle, dans le bon sens', () => {
    // Mesuré : intelligence 63 contre 36, forme 52 contre 79.
    const tete = life({ gifts: { cognitivePotential: 90, athleticPotential: 35, constitution: 35 } });
    const corps = life({ gifts: { cognitivePotential: 35, athleticPotential: 90, constitution: 35 } });
    expect(tete.player.stats.intelligence).toBeGreaterThan(corps.player.stats.intelligence + 10);
    expect(corps.player.stats.fitness).toBeGreaterThan(tete.player.stats.fitness + 10);
  });

  it('n’exprime que la moitié du potentiel : le reste se joue', () => {
    // Un potentiel de 90 ne doit pas donner 90 d'intelligence au berceau,
    // sinon l'école et la vie n'auraient plus rien à décider.
    const doué = life({ gifts: { cognitivePotential: 90, athleticPotential: 35, constitution: 35 } });
    expect(doué.player.stats.intelligence).toBeLessThan(85);
    expect(doué.player.stats.intelligence).toBeGreaterThan(40);
  });

  it('ne décale pas la partie quand on ne fixe qu’un potentiel', () => {
    // Les tirages ont lieu dans tous les cas, choisis ou non : sans quoi
    // composer un seul champ changerait tout le reste de la vie, et deux
    // parties « identiques » ne le seraient plus. Mesuré : athlétique 50 →
    // 50, constitution 59 → 59, prénom inchangé.
    const ref = life();
    const un = life({ gifts: { cognitivePotential: 70 } });
    expect(un.player.genetics.athleticPotential).toBe(ref.player.genetics.athleticPotential);
    expect(un.player.genetics.constitution).toBe(ref.player.genetics.constitution);
    expect(un.player.firstName).toBe(ref.player.firstName);
    expect(un.player.countryId).toBe(ref.player.countryId);
  });
});

/* ------------------------------------------------------------------ */

describe('ce que l’écran montre est ce qui naîtra', () => {
  it('rend une apparence, et la même que la naissance', () => {
    // Sans cela, régler une apparence et voir autre chose à la naissance
    // serait un mensonge de l'aperçu.
    const draft: Partial<OriginDraft> = {
      sex: 'F',
      appearance: { hairColor: 'roux', eyeColor: 'gris', build: 'athlétique' },
    };
    const preview = previewOrigin(draft, SEED, 2026);
    expect(preview.appearance.hairColor).toBe('roux');
    expect(preview.appearance.eyeColor).toBe('gris');
    expect(preview.appearance.build).toBe('athlétique');

    const born = createNewLife({ seed: SEED, draft });
    expect(born.player.appearance.hairColor).toBe('roux');
    expect(born.player.appearance.eyeColor).toBe('gris');
    expect(born.player.appearance.build).toBe('athlétique');
  });

  it('ne propose que des valeurs que le moteur sait produire', () => {
    // Une liste à l'écran qui contiendrait une valeur inconnue du générateur
    // serait un choix qui ne veut rien dire.
    for (const look of LOOKS) {
      const pool = LOOK_POOLS[look.key];
      expect(pool, look.key).toBeDefined();
      expect(pool.length).toBeGreaterThan(2);
      for (const value of pool) {
        const born = createNewLife({ seed: SEED, draft: { appearance: { [look.key]: value } } });
        expect(born.player.appearance[look.key], `${look.key}=${value}`).toBe(value);
      }
    }
  });

  it('accepte chaque carrure', () => {
    for (const build of BUILDS) {
      const born = createNewLife({ seed: SEED, draft: { appearance: { build } } });
      expect(born.player.appearance.build).toBe(build);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('ce qui existait déjà, vérifié plutôt que supposé', () => {
  it('règle le tempérament axe par axe', () => {
    // Le catalogue disait « se transmet au générateur mais n'est pas
    // choisissable feuille à feuille ». Mesuré : demandé 5 → obtenu 5,
    // demandé 95 → obtenu 95, avec un effet réel sur les statistiques.
    const froid = life({ temperament: { emotionalReactivity: 5, persistence: 5 } });
    const chaud = life({ temperament: { emotionalReactivity: 95, persistence: 95 } });
    expect(froid.player.psyche.temperament.emotionalReactivity).toBe(5);
    expect(chaud.player.psyche.temperament.emotionalReactivity).toBe(95);
    expect(chaud.player.stats.stress).toBeGreaterThan(froid.player.stats.stress);
    expect(chaud.player.stats.discipline).toBeGreaterThan(froid.player.stats.discipline);
  });

  it('compose la fratrie, et en fait de vraies personnes', () => {
    const seul = life({ siblings: [] });
    const kin = (s: GameState) => Object.values(s.npcs)
      .filter((n) => n.relation === 'brother' || n.relation === 'sister');
    expect(kin(seul)).toHaveLength(0);

    const nombreux = life({
      siblings: [
        { sex: 'M', ageGap: 3, kind: 'plein' },
        { sex: 'F', ageGap: -2, kind: 'plein' },
        { sex: 'F', ageGap: 6, kind: 'demi' },
      ],
    });
    expect(kin(nombreux)).toHaveLength(3);
    // Aux bons âges : un frère de trois ans de plus a bien trois ans.
    expect(kin(nombreux).map((n) => n.age).sort((a, b) => a - b)).toEqual([0, 3, 6]);
  });

  it('compose la structure du foyer', () => {
    const parents = (s: GameState) => Object.values(s.npcs)
      .filter((n) => ['mother', 'father', 'stepmother', 'stepfather'].includes(n.relation));
    expect(parents(life({ structure: 'deux parents' }))).toHaveLength(2);
    expect(parents(life({ structure: 'parent seul' }))).toHaveLength(1);
  });
});
