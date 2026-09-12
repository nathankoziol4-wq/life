/**
 * Vérifications de l'entretien d'embauche.
 *
 * Le catalogue le donnait absent, et il l'était : `applyToJob` calculait très
 * bien ses chances — diplôme, expérience, intelligence, allure, réputation,
 * casier, conjoncture, marché local, savoir-faire hors diplôme — puis lançait
 * le dé. Le message disait « entretien manqué » sans qu'aucun entretien ait
 * eu lieu. C'est la chose qu'un joueur fait le plus souvent dans une vie, et
 * c'était la seule où il n'avait rien à décider.
 *
 * Six exigences :
 *
 * 1. **l'employeur veut quelque chose**, deux registres sur quatre, et il ne
 *    le dit pas ;
 * 2. **c'est stable** — rouvrir la feuille ne rebat pas les cartes, sinon on
 *    sortirait et rentrerait jusqu'à tomber sur des questions faciles ;
 * 3. **bien répondre sert vraiment** — sinon l'écran ment en le proposant ;
 * 4. **cela ne décide pas** — le dossier compte d'abord, sinon le diplôme et
 *    l'expérience ne voudraient plus rien dire ;
 * 5. **y aller soi-même vaut mieux que laisser faire** — sinon personne n'a
 *    de raison de jouer ;
 * 6. **rien n'a bougé pour qui ne s'en sert pas** : sans argument, le calcul
 *    est exactement celui d'avant.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, JobOffer } from '../types.ts';
import {
  ROUNDS, autoPicks, edgeOf, fitOf, hint, interviewFor, readsRoom, verdictOf, wants,
} from '../../systems/interview.ts';
import { QUESTIONS, type Register } from '../../data/interviews.ts';
import { applyToJob } from '../../systems/careers.ts';
import { levelOf } from '../../systems/skills.ts';

function grown(seed: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < 24 && !state.gameOver; i++) simulateYear(state);
  return state;
}

function anyOffer(state: GameState): JobOffer | undefined {
  return state.world.jobOffers[0];
}

describe('ce que l’employeur cherche', () => {
  it('tient à deux registres, et pas au même pour tous', () => {
    const state = grown(9);
    const seen = new Set<string>();
    for (const offer of state.world.jobOffers) {
      const w = wants(state, offer);
      expect(w.length).toBe(2);
      expect(w[0]).not.toBe(w[1]);
      seen.add(w.join('+'));
    }
    // Si tous les employeurs voulaient la même chose, le pari n'existerait pas.
    expect(seen.size).toBeGreaterThan(1);
  });

  it('pose toujours le même entretien pour la même offre', () => {
    const state = grown(11);
    const offer = anyOffer(state)!;
    const a = interviewFor(state, offer).map((q) => q.id);
    const b = interviewFor(state, offer).map((q) => q.id);
    expect(a).toEqual(b);
    expect(a.length).toBe(ROUNDS);
    // Quatre questions distinctes : on ne repose pas deux fois la même.
    expect(new Set(a).size).toBe(ROUNDS);
    expect(wants(state, offer)).toEqual(wants(state, offer));
  });

  it('n’annonce qu’un registre sur deux, et seulement à qui sait parler', () => {
    const state = grown(13);
    const offer = anyOffer(state)!;

    state.player.skills = {};
    expect(readsRoom(state)).toBe(false);
    expect(hint(state, offer)).toContain('Tu ne sais pas');

    state.player.skills = { parole: { level: 80, peak: 80, done: 6 } };
    expect(readsRoom(state)).toBe(true);
    const said = hint(state, offer);
    const [first, second] = wants(state, offer);
    expect(said).toContain(first === 'métier' ? 'le métier'
      : first === 'tenue' ? 'la tenue' : first === 'élan' ? 'l’élan' : 'l’entente');
    // Le second reste caché : sinon il n'y aurait plus rien à parier.
    expect(said).toContain('et à autre chose');
    expect(second).not.toBe(first);
  });
});

describe('ce que l’entretien vaut', () => {
  it('compte ce qui touche juste, sans punir le reste', () => {
    const state = grown(17);
    const offer = anyOffer(state)!;
    const [a, b] = wants(state, offer);
    const other = (['métier', 'tenue', 'élan', 'entente'] as Register[])
      .filter((r) => r !== a && r !== b);

    expect(fitOf(state, offer, [a!, b!, a!, b!])).toBe(4);
    expect(fitOf(state, offer, [a!, other[0]!, other[1]!, other[0]!])).toBe(1);
    expect(fitOf(state, offer, [other[0]!, other[1]!, other[0]!, other[1]!])).toBe(0);
  });

  it('module les chances sans jamais les décider', () => {
    // Les deux bornes sont le réglage du système, pas une tolérance.
    expect(edgeOf(0)).toBeCloseTo(0.5, 5);
    expect(edgeOf(ROUNDS)).toBeCloseTo(1.6, 5);
    // Un entretien parfait multiplie par un peu plus de trois un entretien
    // catastrophique — assez pour que ça compte, trop peu pour effacer le
    // dossier, dont les facteurs vont de 0 à 1 chacun.
    expect(edgeOf(ROUNDS) / edgeOf(0)).toBeLessThan(3.5);
    for (let fit = 0; fit < ROUNDS; fit++) {
      expect(edgeOf(fit + 1)).toBeGreaterThan(edgeOf(fit));
    }
  });

  it('dit ce qui s’est passé, du meilleur au pire', () => {
    const said = new Set<string>();
    for (let fit = 0; fit <= ROUNDS; fit++) said.add(verdictOf(fit));
    expect(said.size).toBeGreaterThan(3);
  });
});

describe('jouer plutôt que laisser faire', () => {
  /*
   * L'exigence qui justifie tout le reste. On compare, sur beaucoup d'offres,
   * ce que le personnage obtient seul à ce qu'obtient quelqu'un qui a compris
   * ce que l'employeur cherche.
   */
  it('rapporte davantage que de laisser le personnage répondre', () => {
    let auto = 0;
    let played = 0;
    let count = 0;
    for (let seed = 40; seed < 90; seed++) {
      const state = grown(seed);
      for (const offer of state.world.jobOffers) {
        const wanted = wants(state, offer);
        // Un joueur qui a compris répond dans un registre attendu chaque fois
        // que la question le propose.
        const best = interviewFor(state, offer).map((q) => {
          const good = q.answers.find((a) => wanted.includes(a.appeals));
          return (good ?? q.answers[0]!).appeals;
        });
        played += fitOf(state, offer, best);
        auto += fitOf(state, offer, autoPicks(state, offer));
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(100);
    const playedRate = played / (count * ROUNDS);
    const autoRate = auto / (count * ROUNDS);
    // Jouer doit valoir nettement mieux, sans que laisser faire soit inutile.
    expect(playedRate).toBeGreaterThan(autoRate + 0.2);
    expect(autoRate).toBeGreaterThan(0.2);
  });

  it('laisse faire un peu mieux quand le personnage sait parler', () => {
    let low = 0;
    let high = 0;
    let count = 0;
    for (let seed = 120; seed < 170; seed++) {
      const quiet = grown(seed);
      const smooth = grown(seed);
      quiet.player.skills = {};
      smooth.player.skills = { parole: { level: 95, peak: 95, done: 9 } };
      for (const offer of quiet.world.jobOffers) {
        low += fitOf(quiet, offer, autoPicks(quiet, offer));
        high += fitOf(smooth, offer, autoPicks(smooth, offer));
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(100);
    expect(high).toBeGreaterThan(low);
  });

  it('laisse faire vaut mieux que répondre à l’aveugle', () => {
    /*
     * La conséquence qu'on veut, et qui fait de la porte « laisser faire »
     * autre chose qu'une facilité : **sans la parole, le joueur n'a aucun
     * indice**, et répondre au hasard vaut moins que laisser le personnage
     * s'en charger. Mesuré : 50 % de réponses justes contre 64, soit un
     * facteur de 1,05 contre 1,21. Décider de ne pas jouer est alors le bon
     * choix, et c'est une décision comme une autre.
     */
    let auto = 0;
    let blind = 0;
    let count = 0;
    for (let seed = 200; seed < 250; seed++) {
      const state = grown(seed);
      for (const offer of state.world.jobOffers) {
        const qs = interviewFor(state, offer);
        auto += fitOf(state, offer, autoPicks(state, offer));
        blind += fitOf(state, offer, qs.map((q, i) => q.answers[i % q.answers.length]!.appeals));
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(100);
    expect(auto).toBeGreaterThan(blind);
  });
});

describe('ce qui n’a pas changé', () => {
  it('garde exactement l’ancien calcul quand personne ne passe d’entretien', () => {
    // Deux parties identiques : l'une postule sans argument, l'autre avec le
    // facteur neutre. Le résultat doit être le même à la lettre.
    const a = grown(55);
    const b = grown(55);
    const offerA = anyOffer(a);
    const offerB = anyOffer(b);
    if (!offerA || !offerB) return;
    const ra = applyToJob(createCtx(a), offerA.id);
    const rb = applyToJob(createCtx(b), offerB.id, 1);
    expect(ra.ok).toBe(rb.ok);
    expect(ra.title).toBe(rb.title);
    expect(a.player.job?.jobId).toBe(b.player.job?.jobId);
  });
});

describe('le catalogue des questions', () => {
  it('propose trois registres sur quatre, et pas toujours les mêmes', () => {
    const missing = new Set<Register>();
    for (const q of QUESTIONS) {
      expect(q.answers.length).toBe(3);
      const here = new Set(q.answers.map((a) => a.appeals));
      expect(here.size).toBe(3);
      for (const r of ['métier', 'tenue', 'élan', 'entente'] as Register[]) {
        if (!here.has(r)) missing.add(r);
      }
    }
    // Le registre absent tourne : sinon l’un d’eux ne serait jamais servable,
    // et un employeur qui y tiendrait rendrait l’entretien injouable.
    expect(missing.size).toBe(4);
  });

  it('ne nomme aucun métier : elles se posent partout', () => {
    for (const q of QUESTIONS) {
      expect(q.ask.length).toBeGreaterThan(10);
      for (const a of q.answers) expect(a.text.length).toBeGreaterThan(10);
    }
    expect(QUESTIONS.length).toBeGreaterThan(ROUNDS * 2);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
});

describe('la parole sert à quelque chose', () => {
  it('est bien la compétence qui ouvre la lecture', () => {
    const state = grown(23);
    state.player.skills = { parole: { level: 60, peak: 60, done: 4 } };
    expect(levelOf(state, 'parole')).toBe(60);
    expect(readsRoom(state)).toBe(true);
  });
});
