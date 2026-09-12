/**
 * L'esclandre en détention — la cour.
 *
 * `PRISON_ACTIVITIES` proposait « Provoquer un esclandre » depuis toujours, et
 * il se réglait entièrement par tirage : `rng.int` pour le respect, `rng.int`
 * pour le dossier, et un `rng.percent(45)` qui décidait seul de l'année
 * supplémentaire. Le joueur cliquait, et regardait. C'est exactement ce que le
 * cahier des charges appelle « animation + RNG » : **un mini-jeu signifie que
 * le joueur contrôle quelque chose.**
 *
 * Six exigences :
 *
 * 1. **le fond ne rapporte rien** — rester en sécurité est un choix, et il
 *    vaut zéro ;
 * 2. **le devant rapporte, et expose** ;
 * 3. **se faire relever coûte**, et trois fois efface tout ;
 * 4. **la compétence achète du temps d'avance**, et rien d'autre ;
 * 5. **le résultat suit ce que le joueur a fait**, pas un tirage ;
 * 6. **on peut toujours s'en remettre au personnage**, comme partout ailleurs.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import type { MiniGameContext } from '../minigame.ts';
import {
  FRONT, MARK_COST, SWEEPS, exposed, warning, yard, type YardState,
} from '../../systems/minigames/yard.ts';

function context(skill: number): MiniGameContext {
  return {
    skill,
    difficulty: 50,
    mode: 'normal',
    grace: {
      time: 1 + (skill / 100) * 0.25,
      pressure: 1 - (skill / 100) * 0.2,
      tolerance: skill * 0.4,
      insight: skill > 58,
    },
  };
}

/** Joue une scène entière en tenant une position fixe. */
function playAt(where: number, skill = 50, seed = 7): YardState {
  const s = yard.setup(new Rng({ rngState: seed }), context(skill));
  let guard = 0;
  while (!yard.finished(s) && guard < 4000) {
    guard += 1;
    yard.step(s, { y: 1 - where }, 50);
  }
  return s;
}

/** Joue en reculant dès qu'on sent venir quelque chose. */
function playCareful(skill = 50, seed = 7): YardState {
  const s = yard.setup(new Rng({ rngState: seed }), context(skill));
  let guard = 0;
  while (!yard.finished(s) && guard < 4000) {
    guard += 1;
    // Le joueur avisé : devant par défaut, au fond dès que ça se sent.
    const wants = warning(s) > 0.35 ? 0 : 1;
    yard.step(s, { y: 1 - wants }, 50);
  }
  return s;
}

describe('ce que le joueur contrôle', () => {
  it('ne rapporte rien à qui reste au fond', () => {
    const s = playAt(0);
    expect(s.standing).toBe(0);
    expect(s.marked).toBe(0);
    const result = yard.score(s);
    expect(result.quality).toBe(0);
    expect(result.success).toBe(false);
    expect(result.notes?.join(' ')).toContain('resté au fond');
  });

  it('rapporte à qui tient le premier rang, et l’expose', () => {
    const s = playAt(1);
    expect(s.standing).toBeGreaterThan(0);
    // Tenu tout du long, on se fait relever à chaque balayage.
    expect(s.marked).toBe(SWEEPS);
    // Et trois relevés effacent tout, y compris une scène parfaite devant.
    expect(yard.score(s).quality).toBe(0);
  });

  it('récompense celui qui avance et se retire à temps', () => {
    /*
     * C'est toute la partie : le joueur avisé bat le joueur qui reste devant
     * **et** le joueur qui reste au fond. Si ce n'était pas le cas, la scène
     * n'aurait pas de jeu — seulement deux façons de perdre.
     */
    const careful = yard.score(playCareful());
    const front = yard.score(playAt(1));
    const back = yard.score(playAt(0));
    expect(careful.quality).toBeGreaterThan(front.quality);
    expect(careful.quality).toBeGreaterThan(back.quality);
    expect(careful.success).toBe(true);
  });

  it('fait payer chaque relevé', () => {
    expect(MARK_COST).toBeGreaterThan(0);
    // Deux scènes de même exposition, l'une relevée : la seconde vaut moins.
    const clean = playCareful();
    const caught = playAt(1);
    expect(caught.marked).toBeGreaterThan(clean.marked);
    expect(yard.score(caught).mistakes).toBe(caught.marked);
  });
});

describe('ce que la compétence achète', () => {
  it('donne du temps d’avance, et rien d’autre', () => {
    /*
     * `tell` est le seul endroit où le personnage entre dans la scène : il ne
     * court pas plus vite et ne rapporte pas davantage. Il voit venir.
     */
    const green = yard.setup(new Rng({ rngState: 3 }), context(5));
    const old = yard.setup(new Rng({ rngState: 3 }), context(95));
    expect(old.sweeps[0].tell).toBeGreaterThan(green.sweeps[0].tell * 1.5);
    // Le nombre de balayages et le gain par seconde sont les mêmes pour tous.
    expect(old.sweeps).toHaveLength(green.sweeps.length);
  });

  it('se lit pendant la scène', () => {
    // Sans `warning`, `tell` serait un champ posé au départ et lu par
    // personne — une avance annoncée dans la documentation et absente du jeu.
    const s = yard.setup(new Rng({ rngState: 11 }), context(90));
    expect(warning(s)).toBe(0);
    // Juste avant le premier balayage, ça se sent.
    s.elapsed = s.sweeps[0].at - s.sweeps[0].tell * 0.2;
    expect(warning(s)).toBeGreaterThan(0.5);
    // Et une fois passé, plus rien de ce balayage-là.
    s.elapsed = s.sweeps[0].at + 10;
    s.sweeps[0].done = true;
    const after = warning(s);
    expect(after).toBeLessThan(1);
  });

  it('dit clairement si l’on est exposé', () => {
    const s = yard.setup(new Rng({ rngState: 13 }), context(50));
    s.at = FRONT - 0.01;
    expect(exposed(s)).toBe(false);
    s.at = FRONT + 0.01;
    expect(exposed(s)).toBe(true);
  });
});

describe('le règlement', () => {
  it('ne décide plus par un tirage', () => {
    /*
     * L'ancienne version : `rng.percent(45)` pour l'année supplémentaire,
     * `rng.int(8, 18)` pour le respect. On assure sur le corps de `settleYard`,
     * qu'aucune prose ne peut simuler : le résultat vient de ce que le joueur
     * a fait, et de rien d'autre.
     */
    const source = readFileSync(new URL('../../systems/prison.ts', import.meta.url), 'utf8');
    const body = source.slice(
      source.indexOf('export function settleYard'),
      source.indexOf('export function autoYard'),
    );
    expect(body).not.toMatch(/\brng\b/);
    expect(body).toMatch(/result\.quality/);
    expect(body).toMatch(/result\.success/);
  });

  it('se termine toujours, joué ou non', () => {
    for (const skill of [5, 50, 95]) {
      const s = playAt(0.7, skill);
      expect(yard.finished(s)).toBe(true);
      const r = yard.score(s);
      expect(r.quality).toBeGreaterThanOrEqual(0);
      expect(r.quality).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.time)).toBe(true);
    }
  });

  it('laisse renoncer, et le compte comme une scène passée au fond', () => {
    const s = yard.setup(new Rng({ rngState: 17 }), context(50));
    yard.step(s, { y: 0 }, 1000);
    yard.step(s, { quit: true }, 50);
    expect(yard.finished(s)).toBe(true);
    // On a tenu une seconde devant : ce n'est pas rien, et ce n'est pas assez.
    expect(yard.score(s).success).toBe(false);
  });
});
