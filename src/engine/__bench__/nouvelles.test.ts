/**
 * Vérifications de ce qui se dit sur le marché.
 *
 * Le catalogue reprochait quatre choses aux placements — pas de graphique,
 * pas d'actualité, pas de conseiller, pas de quantité — et elles disaient
 * toutes la même : **le joueur n'avait rien pour se faire une idée.** On
 * choisissait un support, les cours bougeaient, et il n'y avait aucune
 * décision à prendre, seulement un choix puis l'attente. Un pari sans
 * information n'est pas un jeu.
 *
 * Cinq exigences, et la première est la seule qui compte vraiment :
 *
 * 1. **une nouvelle prédit** — le cours part bien dans le sens annoncé, sinon
 *    tout le reste est de la décoration ;
 * 2. **elle ne décide pas** — le bruit propre du support reste plus fort,
 *    sinon on a remplacé un pari par une recette ;
 * 3. **ce qui est incertain, c'est la lecture** — pas le fait : la culture
 *    financière change ce qu'on comprend, jamais ce qui arrive ;
 * 4. **relire ne change pas la réponse** — sinon il suffirait de fermer la
 *    feuille et de la rouvrir jusqu'à tomber sur le bon sens ;
 * 5. **rien n'a bougé dans le hasard de la partie** — les nouvelles sortent
 *    d'un tirage à part, sans quoi les vingt-huit sauvegardes fabriquées
 *    changeraient de personnage et le témoin de parité deviendrait illisible.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import {
  advice, adviceReady, consult, marketOf, newsAt, newsFor, readNews,
} from '../../systems/investing.ts';
import { NEWS } from '../../data/marketNews.ts';
import { ASSETS } from '../../data/assets.ts';

function life(seed: number) {
  const state = createNewLife({ seed });
  return state;
}

describe('ce qui se dit', () => {
  it('annonce quelque chose, et sur des supports différents', () => {
    const state = life(4242);
    const items = newsFor(state);
    expect(items.length).toBe(3);
    expect(new Set(items.map((i) => i.assetId)).size).toBe(3);
    for (const item of items) {
      expect(ASSETS.some((a) => a.id === item.assetId)).toBe(true);
      expect(item.text.length).toBeGreaterThan(20);
      expect(item.pull).not.toBe(0);
    }
  });

  it('donne la même chose deux fois pour la même année', () => {
    const state = life(77);
    const a = newsAt(state, 2000);
    const b = newsAt(state, 2000);
    expect(a).toEqual(b);
    // Et pas la même d'une année sur l'autre, sinon rien ne se passe jamais.
    expect(newsAt(state, 2001)).not.toEqual(a);
  });

  /*
   * L'exigence centrale. On joue beaucoup d'années, on note à chaque fois le
   * sens annoncé et le sens obtenu, et l'on regarde si les deux se
   * ressemblent plus que le hasard ne le voudrait.
   */
  it('penche réellement le cours dans le sens annoncé', () => {
    let agree = 0;
    let total = 0;
    for (let seed = 500; seed < 560; seed++) {
      const state = life(seed);
      for (let year = 0; year < 14; year++) {
        const announced = newsFor(state);
        const before = new Map(
          announced.map((i) => [i.assetId, marketOf(state, i.assetId).price]),
        );
        simulateYear(state);
        for (const item of announced) {
          const change = marketOf(state, item.assetId).price - (before.get(item.assetId) ?? 0);
          if (change === 0) continue;
          total += 1;
          if ((change > 0) === (item.pull > 0)) agree += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(1500);
    const rate = agree / total;
    /*
     * Mesuré à **64,5 %** sur cent quarante vies, et l'intervalle est serré
     * exprès : c'est le réglage du système, pas une marge de tolérance.
     *
     * Trop bas, la nouvelle ne sert à rien et l'écran ment en la montrant.
     * Trop haut, elle décide de l'année et lire devient une recette — le
     * premier jet donnait 80 %, et une version intermédiaire 74 %. Entre les
     * deux, il reste une décision : le sens est probable, jamais acquis.
     */
    expect(rate).toBeGreaterThan(0.58);
    expect(rate).toBeLessThan(0.72);
  });

  it('ne change pas ce qui arrive selon ce qu’on comprend', () => {
    // Deux parties de même graine, l'une savante et l'autre non : les cours
    // doivent être identiques. La culture financière change la lecture, elle
    // ne touche pas au monde.
    const naive = life(31);
    const expert = life(31);
    expert.player.financialLiteracy = 95;
    for (let i = 0; i < 8; i++) { simulateYear(naive); simulateYear(expert); }
    for (const asset of ASSETS) {
      expect(marketOf(expert, asset.id).price).toBeCloseTo(marketOf(naive, asset.id).price, 6);
    }
  });

  it('dit moins quand on comprend moins, et jamais autre chose au second regard', () => {
    const state = life(99);
    const item = newsFor(state)[0]!;

    state.player.financialLiteracy = 10;
    expect(readNews(state, item)).toBe('Tu n’en tires rien de précis.');

    state.player.financialLiteracy = 90;
    const first = readNews(state, item);
    expect(first).toMatch(/effet/);
    // Relire doit donner exactement la même phrase : sinon on rouvrirait la
    // feuille jusqu'à obtenir la réponse qui arrange.
    expect(readNews(state, item)).toBe(first);
  });

  it('se trompe parfois entre les deux, et pas toujours', () => {
    // À mi-chemin, le sens est lu mais pas toujours le bon. On vérifie que
    // les deux cas existent, sinon le brouillage ne fait rien.
    const seen = new Set<boolean>();
    for (let seed = 1; seed < 400 && seen.size < 2; seed++) {
      const state = life(seed);
      state.player.financialLiteracy = 32;
      for (const item of newsFor(state)) {
        const said = readNews(state, item);
        if (said.includes('rien de précis')) continue;
        seen.add(said.includes('plutôt bon') === (item.pull > 0));
      }
    }
    expect(seen.has(true)).toBe(true);
    expect(seen.has(false)).toBe(true);
  });
});

describe('l’avis qu’on paie', () => {
  it('ne se trompe jamais sur le sens', () => {
    for (let seed = 200; seed < 260; seed++) {
      const state = life(seed);
      for (const item of newsFor(state)) {
        const said = advice(item);
        expect(said.startsWith(item.pull > 0 ? 'favorable' : 'défavorable')).toBe(true);
      }
    }
  });

  it('appuie sur ce qui le paie', () => {
    // Un support à frais élevés annoncé favorable est toujours présenté comme
    // « très marqué », même quand l'effet est léger. C'est le biais, et c'est
    // la seule chose qu'on puisse lui reprocher.
    let exaggerated = 0;
    for (let seed = 300; seed < 900; seed++) {
      const state = life(seed);
      for (const item of newsFor(state)) {
        const asset = ASSETS.find((a) => a.id === item.assetId)!;
        if (asset.fee > 0.01 && item.pull > 0 && Math.abs(item.pull) < 0.18) {
          expect(advice(item)).toContain('très marqué');
          exaggerated += 1;
        }
      }
    }
    expect(exaggerated).toBeGreaterThan(0);
  });

  it('se paie, une fois par an', () => {
    const state = life(12);
    state.player.money = 100_000;
    expect(adviceReady(state)).toBe(false);

    const before = state.player.money;
    const first = consult(createCtx(state));
    expect(first.ok).toBe(true);
    expect(state.player.money).toBeLessThan(before);
    expect(adviceReady(state)).toBe(true);

    const again = consult(createCtx(state));
    expect(again.ok).toBe(false);

    // L'année suivante remet le compteur : `yearActions` est vidé au premier
    // pas de `simulateYear`.
    simulateYear(state);
    expect(adviceReady(state)).toBe(false);
  });
});

describe('le catalogue des nouvelles', () => {
  it('couvre toutes les natures de support', () => {
    for (const asset of ASSETS) {
      expect(NEWS[asset.klass]?.length ?? 0).toBeGreaterThan(1);
    }
  });

  it('mêle du bon et du mauvais partout', () => {
    for (const [klass, list] of Object.entries(NEWS)) {
      expect(list.some((n) => n.pull > 0), klass).toBe(true);
      expect(list.some((n) => n.pull < 0), klass).toBe(true);
    }
  });

  it('n’écrit jamais de chiffre dans une phrase', () => {
    // Une nouvelle qui donnerait un chiffre ressemblerait à une donnée de
    // marché. Ce sont des phrases de jeu, sur des supports qui n'existent pas.
    for (const list of Object.values(NEWS)) {
      for (const n of list) expect(n.text).not.toMatch(/\d/);
    }
  });
});
