/**
 * La table.
 *
 * Le casino du jeu était exactement ce que §228 interdit : quatre noms de
 * jeux — machine, roulette, blackjack, poker — qui ne différaient que par
 * trois nombres dans un tableau. Une mise, un tirage, rien à décider.
 *
 * Ces tests tiennent les deux affirmations qui font de la table autre chose :
 *
 * 1. **il y a une décision**, et elle change le résultat ;
 * 2. **suivre ce qui est sorti est une vraie adresse** — un joueur attentif
 *    finit devant un joueur au jugé, de façon mesurable et pas seulement
 *    affirmée ;
 *
 * et la garde-fou qui empêche le jeu d'être une source de revenus : même
 * parfaitement joué, on ne repart pas riche.
 */

import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import { miniGameContext } from '../minigame.ts';
import {
  ROUNDS, TABLE, bustOdds, remaining, type TableState,
} from '../../systems/minigames/table.ts';

/** Une partie neuve, avec ou sans lecture du sac. */
function table(seed: number, skill: number): TableState {
  const rng = new Rng({ rngState: seed >>> 0 });
  return TABLE.setup(rng, miniGameContext({ skill, difficulty: 46, setup: {} }));
}

/** Joue une partie avec une politique donnée, et rend ce qui est empoché. */
function play(s: TableState, stopAt: (state: TableState) => boolean): TableState {
  let guard = 0;
  while (!TABLE.finished(s) && guard++ < 400) {
    TABLE.step(s, stopAt(s) ? { hold: true } : { tap: true }, 16);
  }
  return s;
}

/* ------------------------------------------------------------------ */

describe('la table', () => {
  it('se déclare correctement et n’emprunte aucun jeu réel', () => {
    expect(TABLE.id).toBe('table');
    expect(TABLE.category).toBe('jeu');
    expect(TABLE.goal.length).toBeGreaterThan(20);
    // Aucun jeu de casino existant n'est reproduit : la contrainte est
    // explicite, et un identifiant emprunté serait le premier signe.
    const words = `${TABLE.id} ${TABLE.label} ${TABLE.goal}`.toLowerCase();
    for (const banned of ['blackjack', 'poker', 'roulette', 'baccarat', '21']) {
      expect(words.includes(banned), banned).toBe(false);
    }
  });

  it('part d’un sac qui contient du bon et du mauvais', () => {
    const s = table(11, 50);
    const left = remaining(s);
    expect(left.good).toBeGreaterThan(4);
    expect(left.bad).toBeGreaterThan(0);
    expect(s.pot).toBe(0);
    expect(s.banked).toBe(0);
    expect(s.roundsLeft).toBe(ROUNDS);
  });

  it('fait monter le pot en retournant, et le vide sur un mauvais jeton', () => {
    // Sur plusieurs sacs : une seule partie peut tomber sur trois manches qui
    // s'ouvrent par un mauvais jeton, auquel cas le pot n'a jamais monté et
    // le test mesurerait la malchance plutôt que la mécanique.
    let sawGain = false;
    let sawLoss = false;
    for (let seed = 0; seed < 12; seed++) {
      const s = table(seed, 50);
      for (let i = 0; i < 30 && !TABLE.finished(s); i++) {
        const before = s.pot;
        TABLE.step(s, { tap: true }, 16);
        if (s.pot > before) sawGain = true;
        if (before > 0 && s.pot === 0) sawLoss = true;
      }
    }
    expect(sawGain).toBe(true);
    expect(sawLoss).toBe(true);
  });

  it('met à l’abri ce qu’on empoche, définitivement', () => {
    const s = table(11, 50);
    TABLE.step(s, { tap: true }, 16);
    TABLE.step(s, { tap: true }, 16);
    const pot = s.pot;
    if (pot > 0) {
      TABLE.step(s, { hold: true }, 16);
      expect(s.banked).toBe(pot);
      expect(s.pot).toBe(0);
      // Une manche perdue ensuite ne reprend rien de ce qui est à l'abri.
      let guard = 0;
      while (!TABLE.finished(s) && guard++ < 200) TABLE.step(s, { tap: true }, 16);
      expect(s.banked).toBeGreaterThanOrEqual(pot);
    }
  });

  it('finit en trois manches, quoi qu’on fasse', () => {
    const s = table(11, 50);
    play(s, () => false);
    expect(TABLE.finished(s)).toBe(true);
    expect(s.roundsLeft).toBeLessThanOrEqual(0);
  });

  it('dit vrai sur ce qu’il reste', () => {
    const s = table(11, 90);
    const before = remaining(s);
    TABLE.step(s, { tap: true }, 16);
    const after = remaining(s);
    expect(after.good + after.bad).toBe(before.good + before.bad - 1);
    expect(bustOdds(s)).toBeGreaterThan(0);
    expect(bustOdds(s)).toBeLessThan(1);
  });
});

/* ------------------------------------------------------------------ */

describe('la décision compte', () => {
  it('classe trois façons de jouer, dans l’ordre qu’on attend', () => {
    // Le minimum : si retourner ou empocher donnait la même chose, il n'y
    // aurait pas de jeu — c'était exactement le cas de l'ancien casino. On
    // compare des totaux plutôt que des parties : sur un seul sac, la chance
    // décide, et un seuil de « combien de parties diffèrent » serait un
    // chiffre inventé.
    const total = (stop: (s: TableState) => boolean) => {
      let sum = 0;
      for (let seed = 0; seed < 150; seed++) sum += TABLE.score(play(table(seed, 50), stop)).score;
      return sum;
    };
    const jamais = total(() => false);
    const tot = total((s) => s.pot > 0);
    const juste = total((s) => s.pot >= 4);

    // Ne jamais s'arrêter ne rapporte rien du tout : le pot n'est jamais mis
    // à l'abri.
    expect(jamais).toBe(0);
    // S'arrêter au premier jeton met quelque chose de côté, mais peu.
    expect(tot).toBeGreaterThan(0);
    // Attendre un peu rapporte davantage : c'est l'arbitrage du jeu.
    expect(juste).toBeGreaterThan(tot);
  });

  it('récompense qui s’arrête à temps plutôt que qui ne s’arrête jamais', () => {
    let careful = 0;
    let greedy = 0;
    for (let seed = 0; seed < 120; seed++) {
      greedy += TABLE.score(play(table(seed, 50), () => false)).score;
      careful += TABLE.score(play(table(seed, 50), (s) => s.pot >= 6)).score;
    }
    expect(careful).toBeGreaterThan(greedy);
  });

  it('fait de la lecture du sac un vrai avantage', () => {
    // L'affirmation du système : suivre ce qui est sorti est la seule adresse
    // honnête à ce genre de table. Elle doit se mesurer, pas s'annoncer.
    // Le joueur attentif s'arrête quand le risque monte ; l'autre s'arrête
    // sur un seuil fixe, faute de savoir.
    let sharp = 0;
    let blind = 0;
    for (let seed = 0; seed < 200; seed++) {
      sharp += TABLE.score(play(table(seed, 95), (s) => s.pot > 0 && bustOdds(s) > 0.3)).score;
      blind += TABLE.score(play(table(seed, 5), (s) => s.pot >= 8)).score;
    }
    expect(sharp).toBeGreaterThan(blind);
  });

  it('ne montre le sac qu’à qui sait le suivre', () => {
    expect(table(11, 95).reads).toBe(true);
    expect(table(11, 2).reads).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('la maison garde sa part', () => {
  it('ne laisse presque jamais tout empocher', () => {
    // Le garde-fou : la table ne doit pas devenir une source de revenus. Un
    // joueur parfait rentre à peu près à l'équilibre — la note est rapportée
    // à ce qu'un sac pouvait donner, pas à un montant absolu.
    let best = 0;
    for (let seed = 0; seed < 120; seed++) {
      const s = play(table(seed, 95), (st) => st.pot > 0 && bustOdds(st) > 0.25);
      best = Math.max(best, TABLE.score(s).quality);
    }
    expect(best).toBeLessThanOrEqual(1);
    expect(best).toBeGreaterThan(0.3);
  });

  it('compte les manches perdues comme des fautes', () => {
    const s = play(table(3, 50), () => false);
    const result = TABLE.score(s);
    expect(result.mistakes).toBeGreaterThan(0);
    expect(result.notes?.length ?? 0).toBeGreaterThan(0);
  });

  it('rend une note bornée et lisible', () => {
    for (let seed = 0; seed < 40; seed++) {
      const result = TABLE.score(play(table(seed, 50), (s) => s.pot >= 5));
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.time)).toBe(true);
    }
  });

  it('s’arrête si le joueur se lève', () => {
    const s = table(11, 50);
    TABLE.step(s, { quit: true }, 16);
    expect(TABLE.finished(s)).toBe(true);
  });
});
