/**
 * Vérifications des mini-jeux.
 *
 * Un mini-jeu doit satisfaire quatre exigences, et elles se contredisent
 * partiellement — c'est ce qui rend l'exercice intéressant :
 *
 * 1. **la performance du joueur compte** : mieux jouer donne un meilleur
 *    résultat, sinon ce n'est qu'un tirage déguisé derrière une animation ;
 * 2. **le personnage compte aussi** : un débutant qui joue bien ne doit pas
 *    valoir un expert ;
 * 3. **on peut ne pas jouer** : la résolution automatique doit rester
 *    plausible et passer par la même conclusion ;
 * 4. **rien n'est décidé par `Math.random()`** : à graine égale et à
 *    politique égale, deux parties sont identiques.
 */

import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import {
  allMiniGames, autoResolve, blend, getMiniGame, miniGameContext, playHeadless,
} from '../minigame.ts';
import type { MiniGameInput } from '../minigame.ts';
import {
  PICKPOCKET, TARGET_PROFILES, pickpocketOutcome, targetDifficulty,
  type PickpocketState,
} from '../../systems/minigames/pickpocket.ts';
import { auditInteractiveGameplay } from '../../systems/interactiveAudit.ts';

const rng = (seed: number) => new Rng({ rngState: seed >>> 0 });

const context = (skill: number, profileId = 'touriste') => {
  const profile = TARGET_PROFILES.find((p) => p.id === profileId)!;
  return miniGameContext({
    skill,
    difficulty: targetDifficulty(profile),
    setup: { profile, unit: 200 },
  });
};

/**
 * Un joueur appliqué : il approche doucement de la poche la plus accessible,
 * tire, et s'arrête dès que la méfiance monte.
 */
function carefulPlayer(s: PickpocketState): MiniGameInput {
  const target = s.pockets.filter((p) => !p.taken).sort((a, b) => a.depth - b.depth)[0];
  if (!target) return { quit: true };
  const wantX = target.x + (s.targetX - 0.5);
  const wantY = target.y;
  // On se déplace par petits pas : un geste brusque se remarque.
  const step = 0.02;
  const nx = s.handX + Math.max(-step, Math.min(step, wantX - s.handX));
  const ny = s.handY + Math.max(-step, Math.min(step, wantY - s.handY));
  const inPlace = Math.hypot(wantX - s.handX, wantY - s.handY) < 0.05;
  // On ne tire jamais pendant qu'elle regarde, ni si la jauge est haute.
  const safe = s.mood !== 'regarde' && s.suspicion < 55;
  return { x: nx, y: ny, hold: inPlace && safe };
}

/** Un joueur brutal : il fonce sur la poche et tire sans regarder. */
function recklessPlayer(s: PickpocketState): MiniGameInput {
  const target = s.pockets.filter((p) => !p.taken)[0];
  if (!target) return { quit: true };
  return { x: target.x + (s.targetX - 0.5), y: target.y, hold: true };
}

/** Un joueur qui ne fait rien. */
const idlePlayer = (): MiniGameInput => ({});

describe('mini-jeux', () => {
  it('inscrit chaque mini-jeu au registre', () => {
    expect(allMiniGames().length).toBeGreaterThan(0);
    for (const game of allMiniGames()) {
      expect(getMiniGame(game.id)).toBe(game);
      expect(game.goal.length).toBeGreaterThan(10);
      expect(game.duration).toBeGreaterThan(0);
    }
  });

  it('reste déterministe à graine et politique égales', () => {
    const a = playHeadless(PICKPOCKET, rng(4242), context(50), carefulPlayer);
    const b = playHeadless(PICKPOCKET, rng(4242), context(50), carefulPlayer);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.result).toEqual(b.result);
  });

  it('récompense le joueur qui joue bien', () => {
    // Même personnage, même cible, même graine : seule la façon de jouer
    // change. Si le résultat ne bouge pas, le mini-jeu est un décor.
    let careful = 0;
    let reckless = 0;
    for (let seed = 0; seed < 30; seed++) {
      const a = playHeadless(PICKPOCKET, rng(seed * 131 + 7), context(45), carefulPlayer);
      const b = playHeadless(PICKPOCKET, rng(seed * 131 + 7), context(45), recklessPlayer);
      careful += a.result.quality;
      reckless += b.result.quality;
    }
    expect(careful / 30).toBeGreaterThan(reckless / 30 + 0.12);
  });

  it('punit celui qui ne fait rien', () => {
    const { result } = playHeadless(PICKPOCKET, rng(99), context(50), idlePlayer);
    expect(result.success).toBe(false);
    // Ne rien faire n'est pas dramatique : on repart bredouille, pas menotté.
    expect(result.mistakes).toBe(0);
  });

  it('rend la partie plus confortable à un personnage expérimenté', () => {
    // La compétence ne joue pas à la place du joueur : elle donne du temps,
    // de la marge et de l'information.
    const novice = context(10);
    const expert = context(90);
    expect(expert.grace.time).toBeGreaterThan(novice.grace.time);
    expect(expert.grace.pressure).toBeLessThan(novice.grace.pressure);
    expect(expert.grace.tolerance).toBeGreaterThan(novice.grace.tolerance);
    expect(expert.grace.insight).toBe(true);
    expect(novice.grace.insight).toBe(false);

    // Et en pratique, à jeu identique, l'expert s'en sort mieux.
    let noviceQuality = 0;
    let expertQuality = 0;
    for (let seed = 0; seed < 30; seed++) {
      noviceQuality += playHeadless(PICKPOCKET, rng(seed * 97 + 3), novice, recklessPlayer).result.quality;
      expertQuality += playHeadless(PICKPOCKET, rng(seed * 97 + 3), expert, recklessPlayer).result.quality;
    }
    expect(expertQuality).toBeGreaterThan(noviceQuality);
  });

  it('ne laisse pas un bon joueur remplacer un personnage nul', () => {
    // C'est la règle du §74 : les deux dimensions comptent. Un débutant qui
    // joue parfaitement ne doit pas dépasser un expert qui joue mal.
    const noviceCtx = context(8);
    const expertCtx = context(92);
    const perfect = { success: true, score: 100, quality: 1, mistakes: 0, time: 0 };
    const poor = { success: false, score: 0, quality: 0.1, mistakes: 5, time: 0 };

    expect(blend(noviceCtx, perfect)).toBeLessThan(blend(expertCtx, poor));
    // Mais bien jouer doit rester payant à personnage égal.
    expect(blend(noviceCtx, perfect)).toBeGreaterThan(blend(noviceCtx, poor));
  });

  it('rend une cible vigilante réellement plus difficile', () => {
    const tourist = TARGET_PROFILES.find((p) => p.id === 'touriste')!;
    const guard = TARGET_PROFILES.find((p) => p.id === 'vigile')!;
    expect(targetDifficulty(guard)).toBeGreaterThan(targetDifficulty(tourist) + 30);

    let easy = 0;
    let hard = 0;
    for (let seed = 0; seed < 30; seed++) {
      easy += playHeadless(PICKPOCKET, rng(seed * 53 + 11), context(50, 'touriste'), carefulPlayer).result.quality;
      hard += playHeadless(PICKPOCKET, rng(seed * 53 + 11), context(50, 'vigile'), carefulPlayer).result.quality;
    }
    expect(easy).toBeGreaterThan(hard);
  });

  it('produit toutes les issues prévues sur un échantillon', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      for (const policy of [carefulPlayer, recklessPlayer, idlePlayer]) {
        const { state } = playHeadless(PICKPOCKET, rng(seed * 29 + 5), context(40), policy);
        seen.add(pickpocketOutcome(state as PickpocketState));
      }
    }
    // Le jeu doit savoir finir bien, mal, et entre les deux.
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(seen.has('bredouille')).toBe(true);
  });

  it('borne toujours ses jauges', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { state } = playHeadless(PICKPOCKET, rng(seed * 17 + 1), context(50), recklessPlayer);
      const s = state as PickpocketState;
      expect(s.suspicion).toBeGreaterThanOrEqual(0);
      expect(s.suspicion).toBeLessThanOrEqual(100);
      expect(s.elapsed).toBeLessThanOrEqual(s.limit + 100);
      expect(s.over).not.toBeNull();
    }
  });

  it('permet de ne pas jouer sans être puni', () => {
    // La résolution automatique doit rester corrélée à la compétence et
    // produire des résultats plausibles, jamais systématiquement mauvais.
    let noviceWins = 0;
    let expertWins = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (autoResolve(rng(seed * 7 + 1), context(15)).success) noviceWins += 1;
      if (autoResolve(rng(seed * 7 + 1), context(85)).success) expertWins += 1;
    }
    expect(expertWins).toBeGreaterThan(noviceWins);
    expect(expertWins).toBeGreaterThan(20);
  });
});

describe('audit du gameplay interactif', () => {
  it('ne signale aucune incohérence', () => {
    const { problems } = auditInteractiveGameplay();
    expect(problems).toEqual([]);
  });

  it('rattache chaque action interactive à un mini-jeu réel', () => {
    const { entries } = auditInteractiveGameplay();
    for (const entry of entries.filter((e) => e.level === 'INTERACTIVE')) {
      expect(getMiniGame(entry.miniGame!), entry.action).toBeTruthy();
    }
  });

  it('calcule un score honnête', () => {
    const { score, byLevel, entries } = auditInteractiveGameplay();
    expect(entries.length).toBeGreaterThan(15);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    // Tant qu'il reste des actions passives, le score ne peut pas être plein.
    if (byLevel.PASSIVE > 0) expect(score).toBeLessThan(100);
  });
});
