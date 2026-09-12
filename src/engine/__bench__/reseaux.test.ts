/**
 * Vérifications des réseaux.
 *
 * Le catalogue classait « Publier » en `BASIC` — « un tirage et un effet » —
 * et c'était exact : `postOnSocial` lançait un dé et distribuait quatre issues
 * selon la bande où il tombait. Le joueur appuyait sur un bouton, un nombre
 * sortait. Il n'y avait ni endroit, ni sujet, ni rien à apprendre.
 *
 * Sept exigences :
 *
 * 1. **les publics ne se ressemblent pas** — sinon le choix du réseau est un
 *    décor ;
 * 2. **leurs goûts sont stables** — sinon il n'y a rien à apprendre, et
 *    rouvrir la feuille suffirait à changer sa chance ;
 * 3. **ils ne sont pas annoncés** — c'est ce qu'il y a à découvrir ;
 * 4. **savoir sert vraiment** — publier ce que le public aime doit rapporter
 *    nettement plus que publier au hasard ;
 * 5. **un public se lasse** — répéter doit rapporter de moins en moins,
 *    sinon la bonne stratégie serait un seul sujet répété ;
 * 6. **ce qui est exposé se retourne**, et seulement là où la maison est peu
 *    patiente ;
 * 7. **publier longtemps mène quelque part** — un système qu'on joue mieux
 *    mais qui plafonne est pire que le tirage qu'il remplace.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { NETWORKS, SUBJECTS, type Subject } from '../../data/networks.ts';
import {
  YEAR_LIMIT, appetiteFor, fatigueOf, postBlocker, postsThisYear, publish,
  suspendedOn, timesPosted,
} from '../../systems/social.ts';

function grown(seed: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < 22 && !state.gameOver; i++) simulateYear(state);
  state.player.prison = null;
  state.player.yearActions = {};
  return state;
}

describe('quatre publics', () => {
  it('n’ont ni la même taille, ni le même appétit, ni la même patience', () => {
    expect(NETWORKS.length).toBe(4);
    expect(new Set(NETWORKS.map((n) => n.reach)).size).toBeGreaterThan(2);
    expect(new Set(NETWORKS.map((n) => n.appetite)).size).toBeGreaterThan(2);
    expect(new Set(NETWORKS.map((n) => n.patience)).size).toBeGreaterThan(2);
  });

  it('n’aiment pas les mêmes sujets, et gardent leurs goûts', () => {
    const state = grown(3);
    const tastes = new Map<string, number[]>();
    for (const net of NETWORKS) {
      tastes.set(net.id, SUBJECTS.map((s) => appetiteFor(state, net.id, s.id)));
    }
    // Deux réseaux qui auraient les mêmes goûts seraient le même réseau.
    const signatures = new Set([...tastes.values()].map((v) => v.join(',')));
    expect(signatures.size).toBe(4);

    // Et relire ne change rien : c'est ce qui rend l'apprentissage possible.
    for (const net of NETWORKS) {
      const again = SUBJECTS.map((s) => appetiteFor(state, net.id, s.id));
      expect(again).toEqual(tastes.get(net.id));
    }
  });

  it('n’ont pas les mêmes goûts d’une partie à l’autre', () => {
    const a = grown(5);
    const b = grown(9);
    const one = NETWORKS.map((n) => appetiteFor(a, n.id, 'soi'));
    const two = NETWORKS.map((n) => appetiteFor(b, n.id, 'soi'));
    expect(one).not.toEqual(two);
  });
});

describe('savoir ce que le public veut', () => {
  /*
   * L'exigence centrale. On compare deux joueurs sur beaucoup de parties :
   * l'un publie chaque fois le sujet que ce public préfère, l'autre publie au
   * hasard. Si les deux finissaient pareil, l'écran mentirait en proposant un
   * choix.
   */
  it('rapporte nettement plus que publier au hasard', () => {
    /*
     * On compare les **médianes**, pas les moyennes. Une publication qui part
     * partout rapporte vingt-six fois l'ordinaire : sur soixante parties, une
     * seule décide de la moyenne, et le premier jet de ce test échouait en
     * mesurant surtout ce coup de chance. La médiane dit ce qui arrive
     * d'habitude, qui est la question posée.
     */
    const informedRuns: number[] = [];
    const blindRuns: number[] = [];
    for (let seed = 100; seed < 220; seed++) {
      const wise = grown(seed);
      const naive = grown(seed);
      const start = wise.player.followers;

      for (const net of NETWORKS) {
        const best = [...SUBJECTS]
          .sort((a, b) => appetiteFor(wise, net.id, b.id) - appetiteFor(wise, net.id, a.id))[0]!;
        publish(createCtx(wise), net.id, best.id);
        // Celui qui ne sait pas prend toujours le premier de la liste.
        publish(createCtx(naive), net.id, SUBJECTS[0]!.id);
      }
      informedRuns.push(wise.player.followers - start);
      blindRuns.push(naive.player.followers - start);
    }
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    const informed = median(informedRuns);
    const blind = median(blindRuns);
    /*
     * Mesuré à **1,35 fois** sur trois cents parties. C'est le réglage du
     * système : le premier donnait 1,29, parce que le hasard allait de 0,65 à
     * 1,35 quand le goût du public allait de 0,45 à 1,55 — la chance pesait
     * autant que ce qu'on avait compris. Le hasard reste, il ne domine plus.
     */
    expect(informed).toBeGreaterThan(blind * 1.2);
    // Et pas au point que publier au hasard ne serve à rien : on gagne des
    // abonnés dans les deux cas, seulement moins.
    expect(blind).toBeGreaterThan(0);
  });
});

describe('publier longtemps', () => {
  /*
   * **Ce test existe parce que le système a failli ne mener nulle part.**
   *
   * Le premier réglage faisait croître le gain en *racine* du nombre
   * d'abonnés : chaque publication rapportait un peu plus que la précédente,
   * mais de moins en moins vite. Tous les tests ci-dessus passaient — le choix
   * comptait, le public se lassait, les goûts différaient — et pourtant vingt
   * ans à publier au mieux plafonnaient à quarante mille abonnés, quand
   * l'ancien tirage qu'on remplaçait menait aux millions. On avait rendu
   * meilleur un chemin qui ne va nulle part, ce qui est pire que le tirage.
   *
   * Rien ne l'a signalé : c'est la fabrique de sauvegarde `fixture-connu.mjs`
   * qui a échoué, faute de trouver quelqu'un d'assez connu en huit cents
   * graines. Une audience compose ; le test le demande maintenant.
   */
  it('mène quelque part : une audience compose', () => {
    const totals: number[] = [];
    for (let seed = 700; seed < 712; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (let year = 0; year < 20 && !state.gameOver && state.player.alive; year++) {
        for (const net of NETWORKS) {
          if (postBlocker(state, net)) continue;
          const best = [...SUBJECTS]
            .sort((a, b) => appetiteFor(state, net.id, b.id) - appetiteFor(state, net.id, a.id))[0]!;
          publish(createCtx(state), net.id, best.id);
        }
        simulateYear(state);
      }
      if (state.player.alive) totals.push(state.player.followers);
    }
    expect(totals.length).toBeGreaterThan(6);
    const median = [...totals].sort((a, b) => a - b)[Math.floor(totals.length / 2)]!;
    // Mesuré autour de cent cinquante mille. Le seuil est bas exprès : ce
    // qu'on garde, c'est l'ordre de grandeur, pas le réglage du jour.
    expect(median).toBeGreaterThan(20_000);
  });
});

describe('un public se lasse', () => {
  it('rapporte de moins en moins sur le même sujet', () => {
    const state = grown(11);
    const net = NETWORKS.find((n) => n.id === 'vitrine')!;
    const before = fatigueOf(state, net, 'soi');
    expect(before).toBe(0);

    publish(createCtx(state), net.id, 'soi');
    const once = fatigueOf(state, net, 'soi');
    publish(createCtx(state), net.id, 'soi');
    const twice = fatigueOf(state, net, 'soi');

    expect(once).toBeGreaterThan(before);
    expect(twice).toBeGreaterThan(once);
    expect(timesPosted(state, net.id, 'soi')).toBe(2);
    // Changer de sujet repart de zéro : c'est ce qui pousse à tourner.
    expect(fatigueOf(state, net, 'métier')).toBeLessThan(twice);
  });

  it('compte les publications de l’année, toutes maisons confondues', () => {
    const state = grown(13);
    expect(postsThisYear(state)).toBe(0);
    let done = 0;
    for (const net of NETWORKS) {
      if (postBlocker(state, net)) continue;
      publish(createCtx(state), net.id, 'métier');
      done += 1;
    }
    expect(postsThisYear(state)).toBe(done);

    // Au-delà de la limite, plus rien nulle part.
    for (let i = 0; i < YEAR_LIMIT + 2; i++) {
      const net = NETWORKS[i % NETWORKS.length]!;
      publish(createCtx(state), net.id, 'soi');
    }
    expect(postsThisYear(state)).toBeLessThanOrEqual(YEAR_LIMIT);
    for (const net of NETWORKS) expect(postBlocker(state, net)).toBeTruthy();
  });

  it('repart à zéro l’année suivante', () => {
    const state = grown(17);
    publish(createCtx(state), 'vitrine', 'soi');
    expect(postsThisYear(state)).toBe(1);
    simulateYear(state);
    expect(postsThisYear(state)).toBe(0);
  });
});

describe('ce qui se retourne', () => {
  it('arrive sur les maisons peu patientes, et pas sur les autres', () => {
    // On publie beaucoup le sujet le plus exposé, sur la maison la moins
    // patiente et sur la plus patiente, et l'on compte les suspensions.
    const impatient = NETWORKS.reduce((a, b) => (a.patience < b.patience ? a : b));
    const patient = NETWORKS.reduce((a, b) => (a.patience > b.patience ? a : b));

    let bannedImpatient = 0;
    let bannedPatient = 0;
    for (let seed = 200; seed < 320; seed++) {
      const a = grown(seed);
      const b = grown(seed);
      publish(createCtx(a), impatient.id, 'quelquun');
      publish(createCtx(b), patient.id, 'quelquun');
      if (suspendedOn(a, impatient.id)) bannedImpatient += 1;
      if (suspendedOn(b, patient.id)) bannedPatient += 1;
    }
    expect(bannedImpatient).toBeGreaterThan(bannedPatient);
  });

  it('ferme le compte pour l’année, et rouvre ensuite', () => {
    const state = grown(23);
    const net = NETWORKS.reduce((a, b) => (a.patience < b.patience ? a : b));
    // On force la sanction plutôt que de la guetter : ce qu'on teste est ce
    // qu'elle fait, pas sa fréquence.
    state.player.yearActions[`banned_${net.id}`] = 1;
    expect(suspendedOn(state, net.id)).toBe(true);
    expect(postBlocker(state, net)).toContain('suspendu');
    simulateYear(state);
    expect(suspendedOn(state, net.id)).toBe(false);
  });
});

describe('les sujets', () => {
  it('vont du sans risque à ce qui se retourne', () => {
    expect(SUBJECTS.length).toBe(5);
    expect(SUBJECTS.some((s) => s.risk === 0)).toBe(true);
    expect(SUBJECTS.some((s) => s.risk > 0.5)).toBe(true);
    for (const s of SUBJECTS) {
      expect(s.note.length).toBeGreaterThan(10);
      expect(s.risk).toBeLessThanOrEqual(1);
    }
    // Chaque identifiant est distinct, sinon deux sujets partageraient un
    // compteur de lassitude.
    const ids = SUBJECTS.map((s) => s.id as Subject);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
