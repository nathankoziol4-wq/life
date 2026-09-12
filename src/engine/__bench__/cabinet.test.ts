/**
 * Le cabinet — et le défaut qui rendait tout médecin inutile.
 *
 * **Ce qu'il y avait.** Quatre *types* de praticien, un prix fixe et une
 * qualité fixe chacun, et l'écran affichait la qualité en toutes lettres :
 * « Fiabilité du diagnostic : 60 % ». Choisir revenait à lire deux nombres et
 * prendre le plus grand qu'on pouvait payer.
 *
 * **Et ce que la mesure de bout en bout a trouvé derrière.** Le meilleur
 * praticien d'une ville et le pire donnaient exactement la même vie. Pas parce
 * que le nouveau système était mal réglé : parce que **les maladies naissaient
 * déjà diagnostiquées**. `contractDisease` posait
 * `diagnosed: def.severity > 45 || rng.chance(0.6)` — au-dessus de
 * quarante-cinq de gravité, toujours ; en dessous, six fois sur dix. Six
 * maladies sur sept arrivaient connues, et consulter n'avait rien à trouver.
 * Ni avec l'ancien système, ni avec le nouveau. Personne ne pouvait le voir
 * sans jouer des vies entières et compter.
 *
 * Ce fichier vérifie six choses, et la dernière est celle qui compte :
 *
 * 1. **le cabinet est fait de gens**, stables, propres à la ville ;
 * 2. **la compétence est cachée** et la réputation la trahit imparfaitement ;
 * 3. **le prix suit la réputation**, pas la compétence ;
 * 4. **on ne peut pas ratisser** : deux avis par an, pas sept ;
 * 5. **on apprend ce que vaut le sien** en le voyant ;
 * 6. **une maladie a de quoi rester inconnue**, sans quoi rien de tout cela
 *    ne servirait à rien.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { PER_YEAR, READ_AFTER, SPECIALTIES } from '../../data/practitioners.ts';
import {
  consultBlocker, consultWith, consultedThisYear, feeOf, goToER, memoryOf,
  panelOf, readOf, register, regularOf, renownLabel,
} from '../../systems/practitioners.ts';
import { contractDisease, treatDisease } from '../../systems/health.ts';

function adult(seed: number, age = 30): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < age && !state.gameOver; i++) simulateYear(state);
  state.player.money = Math.max(state.player.money, 500_000);
  state.player.yearActions = {};
  return state;
}

describe('le cabinet', () => {
  it('est fait de gens, et les mêmes tant qu’on ne déménage pas', () => {
    const state = adult(3);
    const first = panelOf(state);
    expect(first.length).toBe(SPECIALTIES.reduce((s, x) => s + x.count, 0));
    for (const doctor of first) {
      expect(doctor.name).toMatch(/\S+ \S+/);
      expect(doctor.skill).toBeGreaterThan(0);
      expect(doctor.skill).toBeLessThanOrEqual(1);
    }
    // Déduit, jamais tiré : deux lectures donnent le même cabinet, et ouvrir
    // l'écran ne décale la séquence aléatoire de personne.
    expect(panelOf(state).map((d) => d.id + d.name)).toEqual(first.map((d) => d.id + d.name));

    // Et une autre ville donne d'autres gens : on perd son médecin en
    // déménageant, ce qui donne à `relocatePlayer` une conséquence de plus.
    state.player.cityName = `${state.player.cityName} (ailleurs)`;
    expect(panelOf(state).map((d) => d.name)).not.toEqual(first.map((d) => d.name));
  });

  it('cache la compétence et la laisse deviner, sans la dire', () => {
    /*
     * Mesuré sur deux cents villes : corrélation 0,80 entre réputation et
     * compétence, et **dans 26 % des villes le mieux noté n'est pas le
     * meilleur**. C'est le réglage central : à corrélation 1, la réputation
     * *serait* la compétence et l'on retomberait sur le pourcentage affiché en
     * clair qu'on remplace ; sans corrélation, ce serait un tirage.
     */
    const pairs: [number, number][] = [];
    let wrong = 0;
    let towns = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const state = createNewLife({ seed });
      const panel = panelOf(state);
      for (const d of panel) pairs.push([d.renown, d.skill * 100]);
      const gps = panel.filter((d) => d.specialtyId === 'gp');
      if (gps.length < 2) continue;
      towns += 1;
      const byRenown = [...gps].sort((a, b) => b.renown - a.renown)[0]!;
      const bySkill = [...gps].sort((a, b) => b.skill - a.skill)[0]!;
      if (byRenown.id !== bySkill.id) wrong += 1;
    }
    const mean = (f: (p: [number, number]) => number) =>
      pairs.reduce((s, p) => s + f(p), 0) / pairs.length;
    const mr = mean((p) => p[0]);
    const ms = mean((p) => p[1]);
    const cov = mean((p) => (p[0] - mr) * (p[1] - ms));
    const sd = (f: (p: [number, number]) => number, m: number) =>
      Math.sqrt(mean((p) => (f(p) - m) ** 2));
    const r = cov / (sd((p) => p[0], mr) * sd((p) => p[1], ms));
    expect(r).toBeGreaterThan(0.6);
    expect(r).toBeLessThan(0.95);
    expect(wrong / towns).toBeGreaterThan(0.1);
    expect(wrong / towns).toBeLessThan(0.45);
  });

  it('fait suivre le prix à la réputation, jamais à la compétence', () => {
    // C'est ce qui permet de payer cher pour rien, et pas cher pour beaucoup.
    const state = adult(5);
    const panel = [...panelOf(state)].filter((d) => d.specialtyId === 'gp');
    const byFee = [...panel].sort((a, b) => b.fee - a.fee);
    const byRenown = [...panel].sort((a, b) => b.renown - a.renown);
    expect(byFee.map((d) => d.id)).toEqual(byRenown.map((d) => d.id));

    // Et l'écran ne montre jamais la compétence.
    const source = readFileSync(
      new URL('../../screens/PractitionerScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).not.toContain('.skill');
    expect(source).toContain('renownLabel');
    // En mots, pas en pourcentage : « 78 » donnerait l'illusion d'une mesure.
    expect(renownLabel(90)).not.toMatch(/\d/);
  });

  it('ne laisse pas ratisser tout le cabinet dans l’année', () => {
    /*
     * La limite d'avant était par praticien : on pouvait voir les sept dans la
     * même année, et il suffisait qu'un seul trouve. La compétence de chacun
     * cessait alors de compter, et choisir quelqu'un ne voulait plus rien dire.
     */
    const state = adult(7);
    const panel = panelOf(state);
    for (let i = 0; i < PER_YEAR; i++) {
      expect(consultWith(createCtx(state), panel[i]!.id).ok, `avis ${i + 1}`).toBe(true);
    }
    expect(consultedThisYear(state)).toBe(PER_YEAR);
    const blocked = consultBlocker(state, panel[PER_YEAR]!.id);
    expect(blocked).toBeTruthy();
    expect(consultWith(createCtx(state), panel[PER_YEAR]!.id).ok).toBe(false);

    // Mais un second avis reste possible, et c'est la bonne décision quand on
    // doute du sien.
    expect(PER_YEAR).toBeGreaterThan(1);
  });

  it('apprend ce que vaut le sien, et plus vite si c’est le sien', () => {
    const state = adult(11);
    const doctor = panelOf(state)[0]!;
    expect(readOf(state, doctor.id)).toBeNull();

    register(createCtx(state), doctor.id);
    expect(regularOf(state)?.id).toBe(doctor.id);
    // Son médecin traitant coûte moins cher : c'est ce qui donne une raison de
    // rester plutôt que d'essayer tout le monde.
    const other = panelOf(state).find((d) => d.specialtyId === doctor.specialtyId && d.id !== doctor.id);
    if (other && Math.abs(other.renown - doctor.renown) < 4) {
      expect(feeOf(state, doctor.id)).toBeLessThan(feeOf(state, other.id));
    }

    for (let i = 0; i < READ_AFTER; i++) {
      state.player.yearActions = {};
      consultWith(createCtx(state), doctor.id);
    }
    const said = readOf(state, doctor.id);
    expect(said).toBeTruthy();
    // Le verdict porte sur la compétence réelle : c'est le seul endroit du
    // système où la vérité sort, et elle se paie en années de fréquentation.
    if (doctor.skill >= 0.86) expect(said).toContain('ne passe pas à côté');
    if (doctor.skill < 0.5) expect(said).toContain('expédie');
    expect(memoryOf(state, doctor.id).seen).toBe(READ_AFTER);
  });

  it('ne dit pas qu’il n’a pas trouvé — il dit qu’il n’y a rien', () => {
    /*
     * Le cœur du système : un examen manqué est indiscernable d'un examen
     * normal. Le joueur repart rassuré, et c'est ce qui fait qu'un mauvais
     * médecin coûte des années plutôt que de l'argent.
     */
    /*
     * Mesuré sur des vies, et non sur une : la première version faisait
     * consulter *un* praticien d'*une* graine, et le résultat dépendait donc
     * d'un seul tirage — elle passait ou non selon que ce médecin-là trouvait
     * du premier coup. Un test qui dépend d'un tirage ne mesure pas ce qu'il
     * croit mesurer, et celui-ci a échoué la première fois pour cette raison.
     */
    let wronglyReassured = 0;
    let lives = 0;
    let good = 0;
    let goodReassured = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const state = adult(seed * 3, 30);
      const gp = panelOf(state).find((d) => d.specialtyId === 'gp');
      if (!gp) continue;
      state.player.diseases = [];
      contractDisease(createCtx(state), 'lyme', true);
      const active = state.player.diseases[0];
      if (!active) continue;
      active.diagnosed = false;
      lives += 1;
      if (gp.skill >= 0.75) good += 1;

      state.player.yearActions = {};
      state.player.money = 500_000;
      const result = consultWith(createCtx(state), gp.id);
      expect(result.ok).toBe(true);
      if (!active.diagnosed) {
        // Le message est **le même** qu'après un examen normal : c'est tout
        // le propos. Le joueur ne peut pas distinguer les deux.
        expect(result.message).toContain('rien d’anormal');
        expect(result.tone).toBe('good');
        wronglyReassured += 1;
        if (gp.skill >= 0.75) goodReassured += 1;
      }
    }
    expect(lives).toBeGreaterThan(30);
    // Ça arrive — sinon la compétence ne servirait à rien…
    expect(wronglyReassured).toBeGreaterThan(2);
    // …et ça arrive moins souvent quand le praticien est bon.
    expect(goodReassured / Math.max(1, good))
      .toBeLessThan(wronglyReassured / lives + 0.01);
  });

  it('laisse les urgences à qui n’a personne', () => {
    const state = adult(17);
    const result = goToER(createCtx(state));
    expect(result.ok).toBe(true);
    // Une fois par an, et cher : c'est ce que coûte de n'avoir pas de médecin.
    expect(goToER(createCtx(state)).ok).toBe(false);
  });
});

describe('ce qui rendait tout médecin inutile', () => {
  it('laisse une maladie arriver sans qu’on le sache', () => {
    /*
     * **Le défaut de fond.** `contractDisease` posait
     * `diagnosed: def.severity > 45 || rng.chance(0.6)` : au-dessus de
     * quarante-cinq de gravité, une maladie arrivait *toujours* connue.
     * Consulter n'avait donc rien à trouver, et c'était vrai avant comme après
     * le changement de système.
     */
    let known = 0;
    let total = 0;
    for (const id of ['flu', 'diabetes', 'meningitis']) {
      for (let seed = 1; seed <= 60; seed++) {
        const state = adult(seed * 3, 32);
        state.player.diseases = [];
        const active = contractDisease(createCtx(state), id, true);
        if (!active) continue;
        total += 1;
        if (active.diagnosed) known += 1;
      }
    }
    // Ni toujours, ni jamais : il faut qu'il reste quelque chose à trouver.
    expect(known / total).toBeGreaterThan(0.05);
    expect(known / total).toBeLessThan(0.5);
  });

  it('laisse une maladie discrète rester longtemps inconnue', () => {
    /*
     * L'écran des pathologies promet depuis toujours que « certaines maladies
     * restent longtemps silencieuses ». C'était faux : la révélation
     * spontanée valait `35 + yearsIll * 10`, soit trente-cinq pour cent dès la
     * première année quelle que soit la maladie, et la médiane du temps passé
     * sans savoir valait **un an**. Ce qui est grave se signale vite ; ce qui
     * est discret peut tenir des années.
     */
    const quiet: number[] = [];
    for (let seed = 1; seed <= 60; seed++) {
      const state = adult(seed * 5, 30);
      state.player.diseases = [];
      const active = contractDisease(createCtx(state), 'asthma', true);
      if (!active) continue;
      active.diagnosed = false;
      let years = 0;
      for (let i = 0; i < 30 && !state.gameOver && !active.diagnosed; i++) {
        simulateYear(state);
        years += 1;
      }
      if (active.diagnosed) quiet.push(years);
    }
    quiet.sort((a, b) => a - b);
    expect(quiet.length).toBeGreaterThan(10);
    expect(quiet[Math.floor(quiet.length / 2)]!).toBeGreaterThan(1);
  });

  it('fait qu’aller voir quelqu’un change une vie', () => {
    /*
     * La mesure qui justifie le chantier entier, et qui dit aussi ses limites.
     * Soixante vies de vingt-cinq à soixante-dix ans :
     *
     *     personne         santé 52 · 0,25 maladie ignorée
     *     un généraliste   santé 79 · 0,10
     *
     * Avoir quelqu'un et y aller vaut vingt-sept points de santé. En revanche
     * — et c'est écrit ici pour qu'on ne le « corrige » pas plus tard en
     * croyant réparer quelque chose — **prendre le meilleur praticien plutôt
     * que le pire ne change qu'un point ou deux** : la compétence décide de la
     * vitesse à laquelle on trouve, et sur une vie entière cela se rattrape.
     */
    const run = (consulting: boolean): number => {
      let health = 0;
      let n = 0;
      for (let seed = 1; seed <= 24; seed++) {
        const state = adult(seed, 25);
        const gp = panelOf(state).filter((d) => d.specialtyId === 'gp')
          .sort((a, b) => b.renown - a.renown)[0];
        if (!gp || state.gameOver) continue;
        register(createCtx(state), gp.id);
        n += 1;
        for (let i = 0; i < 40 && !state.gameOver; i++) {
          state.player.money = Math.max(state.player.money, 500_000);
          state.player.yearActions = {};
          if (consulting) consultWith(createCtx(state), gp.id);
          for (const d of state.player.diseases) {
            if (d.diagnosed) treatDisease(createCtx(state), d.id);
          }
          simulateYear(state);
        }
        health += state.player.stats.health;
      }
      return health / Math.max(1, n);
    };
    expect(run(true)).toBeGreaterThan(run(false) + 8);
  });
});
