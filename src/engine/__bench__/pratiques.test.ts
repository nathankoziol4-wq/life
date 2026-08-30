/**
 * Ce que « tenir quelque chose » doit valoir.
 *
 * Le catalogue portait trois aveux voisins — « aucun régime à suivre, aucun
 * effet progressif », « arts martiaux avec grades », « lecture avec
 * progression » — et un seul manque derrière : `doSport` et `doWellness` ne
 * lisent rien des années précédentes. Vingt ans de la même discipline valaient
 * vingt fois un an.
 *
 * Ce fichier vérifie que le système qui les remplace tient six promesses. Cinq
 * portent sur le jeu, la sixième sur l'honnêteté de l'écran.
 *
 * 1. **L'attention est bornée, et elle bouge.** On ne peut pas tout tenir, et
 *    ce qui rétrécit le budget est ce que le joueur a décidé ailleurs.
 * 2. **Trop en prendre ralentit tout, sans rien détruire.**
 * 3. **La continuité paie**, et l'interruption coûte — mais jamais tout.
 * 4. **Le passage est une décision** : tenter tôt est un pari, attendre a un
 *    prix, et l'échec apprend.
 * 5. **Le grade paie ailleurs.** C'est la promesse qui empêche le système
 *    d'être une jauge de plus, et c'est celle qu'on mesure le plus durement :
 *    deux vies identiques, une seule pratique de différence.
 * 6. **L'écran ne route rien qu'il ne sache faire** — le garde-fou repris de
 *    `amitie.test.ts`, pour la même raison : un bouton qui ment coûte plus
 *    cher qu'un bouton manquant.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { CAP, HOLDING, NEED, PRACTICES, getPractice } from '../../data/practices.ts';
import {
  advancePractices, attemptPassage, attention, availablePractices, bodyKeeping,
  chargeOf, dropPractice, kept, load, pace, passageBlocker, passageOdds, raw,
  paidByHome, stalled, standing, standingUp, stateOf, steadiness, readingEdge,
  summary, takeBlocker, takePractice, yearlyGain,
} from '../../systems/practices.ts';
import { openHarassment, responseOdds } from '../../systems/bullying.ts';
import { ageUpPlayer } from '../../systems/aging.ts';
import { getFinancialContext, invalidateContexts } from '../../systems/contexts.ts';

function grown(seed: number, years: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < years && !state.gameOver; i++) simulateYear(state);
  state.player.yearActions = {};
  return state;
}

/**
 * Donne au personnage une vie qui prend de la place.
 *
 * `grown` fait tourner `simulateYear` sans jouer : le personnage ne postule
 * jamais, n'a donc pas d'emploi, et son attention reste proche de cent. C'est
 * un état réel du jeu — c'est celui d'un adolescent ou d'un retraité — mais ce
 * n'est pas celui où l'arbitrage se pose. Les tests du mur ont besoin d'une
 * vie active.
 *
 * Un emploi **et** deux enfants, pas seulement un emploi : la première version
 * ne posait que le poste, ce qui laissait l'attention autour de soixante-cinq
 * et le rythme des cinq pratiques à 0,61 — un cheveu au-dessus du seuil, donc
 * un test qui basculait d'une graine à l'autre. Une vie pleine n'est pas un
 * emploi tout seul.
 */
function busy(state: GameState): void {
  state.player.retired = false;
  for (let i = 0; i < 2; i++) {
    const child = createPerson(createCtx(state), { relation: 'son', age: 7 });
    child.age = 7;
  }
  state.player.job = {
    jobId: 'ouvrier', title: 'Poste', level: 0, salary: 30_000, employer: 'X',
    performance: 50, yearsAtJob: 4, effort: 'normal', lastRaiseAskYear: 0,
    partTime: false, hours: 40, satisfaction: 50, team: [], warnings: 0,
    leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
  };
}

/** Se mettre à une pratique sans passer par les refus d'argent ou d'âge. */
function hold(state: GameState, id: string): void {
  state.player.money = Math.max(state.player.money, 400_000);
  state.player.age = Math.max(state.player.age, getPractice(id)!.from);
  raw(state, id).keeping = true;
}

describe('l’attention', () => {
  it('ne suffit jamais pour tout tenir', () => {
    const total = PRACTICES.reduce((sum, p) => sum + p.charge, 0);
    // Sans cela, prendre les cinq serait évidemment juste, et il n'y aurait
    // aucun arbitrage — c'est-à-dire aucun système.
    expect(total).toBeGreaterThan(100);

    const state = grown(3, 30);
    expect(attention(state)).toBeLessThanOrEqual(100);
    for (const practice of PRACTICES) hold(state, practice.id);
    // Au premier grade, la charge vaut celle du catalogue ; elle grandit
    // ensuite, ce que vérifie « reprend de la place à mesure qu’on réussit ».
    expect(load(state)).toBe(total);
    expect(pace(state)).toBeLessThan(1);
  });

  it('rétrécit quand la vie prend de la place', () => {
    const state = grown(5, 34);
    const p = state.player;
    p.job = null;
    p.freelance = null;
    p.business = null;
    p.retired = false;
    p.stats.stress = 20;
    const empty = attention(state);

    // Un emploi à plein temps. C'est la même valeur que lit la fiche de poste.
    p.job = {
      jobId: 'ouvrier', title: 'Poste', level: 0, salary: 30_000, employer: 'X',
      performance: 50, yearsAtJob: 2, effort: 'normal', lastRaiseAskYear: 0,
      partTime: false, hours: 40, satisfaction: 50, team: [], warnings: 0,
      leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
    };
    const working = attention(state);
    expect(working).toBeLessThan(empty - 20);

    // Puis deux enfants à la maison.
    for (let i = 0; i < 2; i++) {
      const child = createPerson(createCtx(state), { relation: 'son', age: 6 });
      child.age = 6;
    }
    expect(attention(state)).toBeLessThan(working);
  });

  it('ralentit d’abord, puis arrête tout à fait', () => {
    const one = grown(7, 30);
    const all = grown(7, 30);
    busy(one);
    busy(all);
    hold(one, 'reading');
    for (const practice of PRACTICES) hold(all, practice.id);

    const alone = yearlyGain(one, 'reading');
    expect(alone).toBeGreaterThan(0);
    expect(stalled(one)).toBe(false);

    // Les cinq à la fois, avec un emploi : sous le seuil, plus rien ne monte.
    // C'est le seul mur du système, et c'est lui qui oblige à choisir — sans
    // lui, mesuré, une vie qui tenait tout amenait presque tout au bout.
    expect(pace(all)).toBeLessThan(HOLDING);
    expect(stalled(all)).toBe(true);
    expect(yearlyGain(all, 'reading')).toBe(0);
  });

  it('laisse tout tenir à qui n’a rien d’autre à faire', () => {
    /*
     * Le mur n'est pas une règle sur les pratiques, c'est une règle sur les
     * vies : un adolescent ou un retraité peuvent porter les cinq, un actif
     * avec un emploi à plein temps ne le peut pas. C'est l'arc qu'on voulait,
     * et il faut l'écrire ici pour qu'on ne « corrige » pas plus tard le
     * budget large d'une vie vide en croyant réparer quelque chose.
     */
    const idle = grown(7, 30);
    idle.player.job = null;
    idle.player.freelance = null;
    idle.player.business = null;
    for (const practice of PRACTICES) hold(idle, practice.id);
    expect(stalled(idle)).toBe(false);

    // Mais dès que la vie se remplit, le même personnage ne suit plus.
    busy(idle);
    expect(stalled(idle)).toBe(true);
  });

  it('rend sa place dès qu’on lâche', () => {
    /*
     * Le pendant du mur : il doit être franchissable dans les deux sens la
     * même année. Un mur dont on ne sort qu'en attendant serait une punition ;
     * celui-ci est une décision, et lâcher est la décision.
     */
    const state = grown(7, 30);
    busy(state);
    for (const practice of PRACTICES) hold(state, practice.id);
    expect(stalled(state)).toBe(true);
    for (const id of ['garden', 'meditate', 'diet']) {
      dropPractice(createCtx(state), id);
    }
    expect(stalled(state)).toBe(false);
    expect(yearlyGain(state, 'reading')).toBeGreaterThan(0);
  });

  it('reprend de la place à mesure qu’on réussit', () => {
    /*
     * Sans cela la charge était fixe : on prenait tout ce qu'on pouvait payer
     * une fois pour toutes, et il n'y avait plus rien à décider ensuite.
     * Ici une pratique menée loin redemande de la place, et l'arbitrage revient
     * au moment où l'on a le plus investi.
     */
    const state = grown(7, 30);
    hold(state, 'martial');
    const martial = getPractice('martial')!;
    const beginner = chargeOf(state, martial);
    expect(beginner).toBe(martial.charge);
    raw(state, 'martial').grade = martial.grades.length;
    expect(chargeOf(state, martial)).toBeGreaterThan(beginner * 1.5);
  });
});

describe('la durée', () => {
  it('paie d’avoir tenu, et coûte d’avoir lâché', () => {
    const steady = grown(11, 26);
    const fresh = grown(11, 26);
    hold(steady, 'reading');
    hold(fresh, 'reading');
    raw(steady, 'reading').years = 20;

    // La continuité : la seule chose du jeu qui récompense de n'avoir rien
    // changé pendant longtemps.
    expect(yearlyGain(steady, 'reading')).toBeGreaterThan(yearlyGain(fresh, 'reading') * 1.2);
  });

  it('fait fondre ce qu’on ne reprend pas, sans jamais tout reprendre', () => {
    const state = grown(13, 30);
    hold(state, 'martial');
    const held = raw(state, 'martial');
    held.grade = 4;
    held.progress = 90;
    held.keeping = false;

    // Trois années lâchées : l'avancée fond, puis un grade s'en va.
    for (let i = 0; i < 3; i++) advancePractices(createCtx(state));
    expect(held.progress).toBeLessThan(90 * 0.6);
    expect(held.grade).toBe(3);

    // Et l'on peut lâcher indéfiniment : le premier grade reste. Avoir su
    // reste, même vingt ans après.
    for (let i = 0; i < 40; i++) advancePractices(createCtx(state));
    expect(held.grade).toBe(1);
  });

  it('lâche tout seul une pratique qu’on ne peut plus payer', () => {
    const state = grown(17, 32);
    hold(state, 'martial');
    state.player.money = 5;
    advancePractices(createCtx(state));
    expect(stateOf(state, 'martial').keeping).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Qui paie                                                            */
/* ------------------------------------------------------------------ */

describe('l’enfance', () => {
  /**
   * **Le défaut le plus grave qu'ait eu ce système**, et il n'a été trouvé
   * qu'en mesurant. Le lien dont tout le reste dépend — un club à sept ans,
   * une différence à treize face à un harceleur — était écrit dans trois
   * fichiers et **strictement inatteignable** : sur quarante vies, zéro enfant
   * de sept ans pouvait s'inscrire, parce qu'un enfant n'a pas d'argent. Le
   * système entier reposait sur une porte fermée.
   */
  it('laisse un enfant s’inscrire, puisque ce n’est pas lui qui paie', () => {
    let open = 0;
    let seen = 0;
    for (let seed = 8000; seed < 8060; seed++) {
      const state = createNewLife({ seed });
      for (let i = 0; i < 7 && !state.gameOver; i++) simulateYear(state);
      if (state.gameOver) continue;
      seen += 1;
      expect(paidByHome(state)).toBe(true);
      if (takeBlocker(state, 'martial') === null) open += 1;
    }
    // Mesuré : 59 % des enfants de sept ans. Ni zéro — la porte est ouverte —
    // ni tous, parce que c'est le foyer qui décide.
    expect(seen).toBeGreaterThan(40);
    expect(open).toBeGreaterThan(seen * 0.3);
    expect(open).toBeLessThan(seen);
  });

  it('en fait un marqueur d’origine plutôt qu’une formalité', () => {
    /*
     * Ce que la correction a apporté en plus de la correction. Mesuré sur les
     * mêmes soixante vies : dans un foyer modeste, **aucun** enfant n'entre au
     * club, et il ne lui reste que ce qui ne coûte presque rien — la lecture,
     * puis la méditation à huit ans. L'enfant qui grandit là arrive à treize
     * ans sans ceinture, et c'est une conséquence du milieu, pas du hasard.
     */
    let modestClub = 0;
    let modestReading = 0;
    let modest = 0;
    for (let seed = 8000; seed < 8060; seed++) {
      const state = createNewLife({ seed });
      for (let i = 0; i < 10 && !state.gameOver; i++) simulateYear(state);
      if (state.gameOver) continue;
      if (getFinancialContext(state).disposableRatio >= 0.6) continue;
      modest += 1;
      if (takeBlocker(state, 'martial') === null) modestClub += 1;
      if (takeBlocker(state, 'reading') === null) modestReading += 1;
    }
    expect(modest).toBeGreaterThan(5);
    expect(modestClub).toBeLessThan(modest * 0.25);
    // Mais jamais rien du tout : la méditation ne coûte rien, et la lecture
    // presque rien. Un système qui fermerait tout aux pauvres ne serait pas un
    // marqueur d'origine, ce serait une punition.
    expect(modestReading).toBeGreaterThan(0);
    for (let seed = 8000; seed < 8010; seed++) {
      const state = createNewLife({ seed });
      for (let i = 0; i < 10 && !state.gameOver; i++) simulateYear(state);
      if (state.gameOver) continue;
      expect(takeBlocker(state, 'meditate')).toBeNull();
    }
  });

  it('lâche la pratique d’un enfant quand le foyer ne suit plus', () => {
    const state = grown(83, 9);
    state.player.age = 9;
    // On assèche le foyer plutôt que le personnage : c'est le foyer qui paie,
    // et l'argent de poche de l'enfant n'y change rien.
    state.player.origin.finance.disposableIncome = 0;
    invalidateContexts(state);
    state.player.money = 500_000;
    expect(takeBlocker(state, 'garden')).toContain('Chez toi');

    hold(state, 'garden');
    advancePractices(createCtx(state));
    expect(stateOf(state, 'garden').keeping).toBe(false);
  });

  it('ne prend pas l’argent de l’enfant', () => {
    const state = grown(89, 12);
    state.player.age = 12;
    state.player.origin.finance.disposableIncome = 900_000;
    invalidateContexts(state);
    raw(state, 'reading').keeping = true;
    const before = state.player.money;
    advancePractices(createCtx(state));
    expect(state.player.money).toBe(before);
    expect(stateOf(state, 'reading').years).toBe(1);
  });
});

describe('le passage', () => {
  it('ne s’obtient pas en attendant', () => {
    const state = grown(19, 30);
    hold(state, 'diet');
    const held = raw(state, 'diet');
    held.progress = NEED - 1;
    expect(passageBlocker(state, 'diet')).toContain('Pas encore');

    // Et même prêt, rien ne le déclenche : il faut aller le chercher.
    held.progress = CAP;
    for (let i = 0; i < 6; i++) advancePractices(createCtx(state));
    expect(stateOf(state, 'diet').grade).toBe(0);
  });

  it('récompense d’avoir attendu, et punit d’avoir attendu', () => {
    const state = grown(23, 30);
    hold(state, 'diet');
    const held = raw(state, 'diet');
    held.progress = NEED;
    const early = passageOdds(state, 'diet');
    held.progress = CAP;
    const late = passageOdds(state, 'diet');
    // Attendre paie…
    expect(late).toBeGreaterThan(early + 0.25);
    // …mais jamais jusqu'à la certitude, sinon attendre serait toujours juste.
    expect(late).toBeLessThan(0.95);
    expect(early).toBeGreaterThan(0.3);
  });

  it('apprend quelque chose quand il rate', () => {
    const state = grown(29, 30);
    hold(state, 'diet');
    const held = raw(state, 'diet');
    held.progress = NEED + 10;
    const first = passageOdds(state, 'diet');
    held.failed = 3;
    expect(passageOdds(state, 'diet')).toBeGreaterThan(first + 0.2);
  });

  it('coûte pour de bon quand il rate', () => {
    const state = grown(31, 30);
    hold(state, 'martial');
    let failed = 0;
    for (let i = 0; i < 60; i++) {
      const held = raw(state, 'martial');
      held.grade = 3;
      held.progress = NEED;
      held.failed = 0;
      state.player.yearActions = {};
      attemptPassage(createCtx(state), 'martial');
      if (held.grade === 3) {
        failed += 1;
        expect(held.progress).toBeLessThan(NEED);
      }
    }
    // Un passage qu'on décroche toujours n'est pas un passage.
    expect(failed).toBeGreaterThan(10);
    expect(failed).toBeLessThan(50);
  });

  it('ne se tente qu’une fois par an', () => {
    const state = grown(37, 30);
    hold(state, 'martial');
    raw(state, 'martial').progress = CAP;
    state.player.yearActions = {};
    attemptPassage(createCtx(state), 'martial');
    expect(passageBlocker(state, 'martial')).toContain('an');
  });
});

/* ------------------------------------------------------------------ */
/* Ce que ça change ailleurs                                           */
/* ------------------------------------------------------------------ */

describe('ce que le grade paie', () => {
  /**
   * Le lien le plus long du jeu : un club à sept ans, une cour de récréation à
   * treize. On mesure sur deux états identiques à un grade près — c'est le
   * seul protocole qui prouve que le grade compte et non ce qui l'accompagne.
   */
  it('les arts martiaux, quand il faut tenir tête', () => {
    /*
     * On ouvre un harcèlement pour de bon plutôt que d'en poser un à la main :
     * la première version écrivait dans `player.flags`, alors qu'un
     * harcèlement vit sur `education.harassment`. `responseOdds` rendait donc
     * zéro, la comparaison était gardée par un `if (plain > 0)`, et le test
     * passait **sans rien mesurer**. C'est exactement le défaut que ce fichier
     * est censé attraper ailleurs.
     */
    const state = grown(41, 14);
    if (!state.player.origin.school) return;
    const bully = createPerson(createCtx(state), { relation: 'classmate', age: 14 });
    state.player.education.harassment = openHarassment(createCtx(state), bully);
    expect(state.player.education.harassment).not.toBeNull();

    raw(state, 'martial').grade = 0;
    const plain = responseOdds(state, 'affronter');
    expect(plain).toBeGreaterThan(0);

    raw(state, 'martial').grade = getPractice('martial')!.grades.length;
    const belted = responseOdds(state, 'affronter');
    expect(standingUp(state)).toBe(1);
    // Dix-huit points de chances en plus, gagnés six ans plus tôt et
    // seulement si l'on n'a pas lâché entre-temps.
    expect(belted).toBeGreaterThan(plain + 0.12);
  });

  it('la lecture, sur le bulletin — dans toutes les matières à la fois', () => {
    const state = grown(43, 15);
    raw(state, 'reading').grade = 0;
    expect(readingEdge(state)).toBe(0);
    raw(state, 'reading').grade = 5;
    expect(readingEdge(state)).toBeGreaterThan(1.5);
  });

  /** Ce que le régime retire au déclin, avant de regarder ce qu'il produit. */
  it('le régime, lu comme un frein', () => {
    const state = grown(47, 20);
    expect(bodyKeeping(state)).toBe(1);
    raw(state, 'diet').grade = getPractice('diet')!.grades.length;
    expect(bodyKeeping(state)).toBeLessThan(0.7);
    // Jamais zéro : un frein, pas un arrêt.
    expect(bodyKeeping(state)).toBeGreaterThan(0.5);
  });

  /**
   * Et la dérive elle-même, mesurée sur douze vies plutôt qu'une.
   *
   * La première version comparait une seule paire à soixante-dix ans. Les deux
   * personnages étaient morts, `stats.health` valait zéro des deux côtés, et
   * le test comparait deux zéros — il serait passé tout aussi bien si le
   * régime n'avait rigoureusement aucun effet. Un test qui compare deux morts
   * ne mesure rien.
   *
   * Quarante graines, quarante à soixante ans, et l'on compte les survivants
   * séparément : un régime qui ferait vivre moins longtemps se verrait là.
   *
   * **L'échantillon est passé de douze à quarante**, et il faut dire pourquoi.
   * À douze graines, une vie d'écart valait déjà 8 % du total, si bien que la
   * marge de tolérance avait dû être ouverte à une vie — puis un chantier sans
   * rapport (les circonstances de naissance : un jumeau, une bête déjà dans la
   * maison) a redécalé la séquence et l'écart est passé à deux. Ouvrir la
   * marge une seconde fois aurait vidé le test de son objet : à ±2 sur 12, un
   * régime franchement mortel serait passé inaperçu.
   *
   * Élargir l'échantillon rend au contraire la question mesurable et permet de
   * **resserrer** la tolérance à une vie sur quarante. C'est la seule des deux
   * corrections qui rende le garde-fou plus sévère qu'avant.
   *
   * **Quarante ne suffisait toujours pas, et un troisième décalage l'a
   * montré.** La densité d'événements de la petite enfance a redécalé la
   * séquence, et les deux affirmations sont tombées ensemble : trois vies
   * d'écart sur les survivants, et une santé cumulée *plus basse* avec le
   * régime que sans. Remesuré en balayant l'échantillon, l'effet sur la santé
   * n'apparaît qu'à partir de cent cinquante paires environ :
   *
   *      40 paires : sans 414 · avec 423   (invisible, et le signe change)
   *      80 paires : sans 792 · avec 875
   *     150 paires : sans 1 389 · avec 1 684
   *     294 paires : sans 2 724 · avec 3 276   (+20 %)
   *
   * Quarante graines ne mesuraient donc pas un effet faible : elles tiraient à
   * pile ou face sur son signe. L'échantillon passe à cent quatre-vingts
   * graines — environ cent soixante-quinze paires utilisables — ce qui coûte
   * une vingtaine de secondes et rend les deux affirmations mesurables au lieu
   * de chanceuses.
   */
  it('le régime, sur vingt ans de vieillissement et cent quatre-vingts vies', () => {
    let better = 0;
    let aliveWith = 0;
    let aliveWithout = 0;
    let onlyWith = 0;
    let onlyWithout = 0;
    let totalWith = 0;
    let totalWithout = 0;

    for (let seed = 100; seed < 280; seed++) {
      const without = grown(seed, 40);
      const with_ = grown(seed, 40);
      if (without.gameOver || with_.gameOver) continue;
      for (let i = 0; i < 20 && !without.gameOver; i++) simulateYear(without);
      for (let i = 0; i < 20 && !with_.gameOver; i++) {
        // Le grade est reposé chaque année : la pratique n'est pas « tenue »
        // au sens du système, on isole l'effet du grade et rien d'autre.
        raw(with_, 'diet').grade = getPractice('diet')!.grades.length;
        simulateYear(with_);
      }
      if (!without.gameOver) aliveWithout += 1;
      if (!with_.gameOver) aliveWith += 1;
      // Les paires discordantes : celles où l'un survit et l'autre non. Ce
      // sont les seules qui portent une information sur la survie.
      if (!without.gameOver && with_.gameOver) onlyWithout += 1;
      if (without.gameOver && !with_.gameOver) onlyWith += 1;
      totalWithout += without.player.stats.health;
      totalWith += with_.player.stats.health;
      if (with_.player.stats.health > without.player.stats.health) better += 1;
    }

    /*
     * Ce que la mesure a donné ici : santé cumulée 87,0 sans le régime contre
     * 105,0 avec, et dix survivants contre onze. Élargie à quarante graines
     * hors du test — trente-huit paires atteignent soixante ans — la même
     * mesure donne 6,5 de santé moyenne sans, 9,4 avec.
     *
     * L'effet est réel et il va dans le bon sens, mais **il ne se voit pas vie
     * par vie** : quatre paires sur onze seulement finissent plus haut (et
     * quatorze sur trente-huit à la mesure large), parce qu'à cet âge la
     * plupart des deux côtés sont déjà au plancher.
     *
     * Deux choses en découlent, et toutes deux sont écrites ici plutôt que
     * cachées derrière un seuil arrangeant. D'abord, on n'affirme donc que
     * l'agrégat, qui est ce que la mesure soutient. Ensuite, ce plancher est
     * une découverte sur le jeu et non sur le régime : une vie où le joueur ne
     * fait **rien** pour son corps arrive à soixante ans avec une santé à un
     * chiffre. C'est précisément ce qui rend une pratique du corps digne
     * d'attention, et c'est ce que le second test ci-dessous isole.
     */
    /*
     * Le compte des survivants ne sert qu'à une chose : attraper un régime qui
     * ferait vivre *moins* longtemps.
     *
     * **Comparer deux totaux ne le faisait pas.** Sur 486 paires : 432
     * survivants sans le régime contre 424 avec — mais 34 paires seulement où
     * le sans-régime survit seul, contre 26 où le régime survit seul. C'est un
     * z de McNemar de 0,90, p ≈ 0,37 : du bruit. Le régime ne raccourcit pas
     * la vie, et « pas plus d'une vie d'écart sur quarante » n'était pas un
     * garde-fou mais un coup de chance.
     *
     * On compare donc ce qui porte de l'information — les paires discordantes,
     * où l'un survit et l'autre non, les autres ne disant rien — et l'on tolère
     * l'écart qu'un pile ou face produirait sur ce nombre-là, à deux écarts-
     * types et demi. Un régime franchement mortel pousserait presque toutes les
     * discordances du même côté et sortirait largement de la bande ; le bruit,
     * non.
     */
    const discordant = onlyWith + onlyWithout;
    const noise = 2.5 * Math.sqrt(discordant) + 1;
    expect(onlyWithout - onlyWith, `${onlyWithout} contre ${onlyWith} sur ${discordant} paires discordantes`)
      .toBeLessThanOrEqual(noise);
    expect(totalWith).toBeGreaterThan(totalWithout);
    expect(better).toBeGreaterThan(0);
  });

  /**
   * Le mécanisme seul, sans le bruit d'une vie entière.
   *
   * Vingt personnages posés à trente-cinq ans dans le même état, puis trente
   * années de vieillissement et rien d'autre — ni maladie, ni événement, ni
   * décision. C'est la seule façon de mesurer ce que fait `bodyKeeping` sans
   * que quarante autres systèmes ne s'en mêlent : 41,5 de santé à soixante-cinq
   * ans sans le régime, 52,6 avec. Onze points, pour une pratique qui aura
   * coûté trente ans d'attention.
   */
  it('le régime, sur le seul vieillissement', () => {
    const at65 = (grade: number): number => {
      let sum = 0;
      for (let seed = 200; seed < 220; seed++) {
        const state = createNewLife({ seed });
        state.player.age = 35;
        state.player.stats.health = 70;
        state.player.stats.fitness = 60;
        state.player.stats.looks = 60;
        for (let i = 0; i < 30; i++) {
          raw(state, 'diet').grade = grade;
          state.player.age += 1;
          ageUpPlayer(createCtx(state));
        }
        sum += state.player.stats.health;
      }
      return sum / 20;
    };
    const plain = at65(0);
    const dieted = at65(getPractice('diet')!.grades.length);
    expect(dieted).toBeGreaterThan(plain + 6);
    // Et jamais au point d'annuler le temps : un corps de soixante-cinq ans
    // reste un corps de soixante-cinq ans.
    expect(dieted).toBeLessThan(70);
  });

  it('la méditation, sur ce qui te tient', () => {
    const state = grown(53, 30);
    raw(state, 'meditate').grade = 0;
    expect(steadiness(state)).toBe(0);
    raw(state, 'meditate').grade = getPractice('meditate')!.grades.length;
    expect(steadiness(state)).toBe(1);
  });

  it('le jardin, qui finit par rendre plus qu’il ne coûte', () => {
    const state = grown(59, 34);
    hold(state, 'garden');
    const held = raw(state, 'garden');
    held.grade = getPractice('garden')!.grades.length;
    state.player.money = 100_000;
    const before = state.player.money;
    advancePractices(createCtx(state));
    // Au dernier grade, l'année rapporte plus qu'elle ne coûte.
    expect(state.player.money).toBeGreaterThan(before);

    // Mais pas au début : c'est ce que le dernier grade promet, pas le premier.
    held.grade = 0;
    held.keeping = true;
    const poorer = state.player.money;
    advancePractices(createCtx(state));
    expect(state.player.money).toBeLessThan(poorer);
  });

  it('chaque pratique paie quelque part — aucune n’est une jauge', () => {
    /*
     * Le garde-fou du système entier. Si l'on ajoutait demain une sixième
     * pratique sans lui donner de débouché, ce test le dirait — et une
     * pratique dont le grade ne servirait qu'à s'afficher est exactement ce
     * qu'on remplace.
     */
    const state = grown(61, 30);
    const reads: Record<string, (s: GameState) => number> = {
      martial: standingUp,
      reading: readingEdge,
      diet: (s) => 1 - bodyKeeping(s),
      meditate: steadiness,
      garden: (s) => standing(s, 'garden'),
    };
    for (const practice of PRACTICES) {
      const read = reads[practice.id];
      expect(read, `${practice.id} n’est lu par personne`).toBeDefined();
      raw(state, practice.id).grade = 0;
      expect(read!(state)).toBe(0);
      raw(state, practice.id).grade = practice.grades.length;
      expect(read!(state), `${practice.id} ne change rien une fois au bout`)
        .toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Ce que l'écran promet                                               */
/* ------------------------------------------------------------------ */

describe('l’écran', () => {
  it('n’appelle que ce que le système sait faire', () => {
    const source = readFileSync(
      new URL('../../screens/PracticeScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    for (const name of ['takePractice', 'dropPractice', 'attemptPassage', 'passageOdds', 'attention']) {
      expect(source, `l’écran n’utilise pas ${name}`).toContain(name);
    }
    // Les chances écrites sur la ligne : décider à quarante-quatre pour cent
    // est une décision, le découvrir en échouant n'en est pas une.
    expect(source).toContain('% de chances');
  });

  it('s’annonce depuis le menu, et dit l’essentiel sans être ouvert', () => {
    /*
     * Une tuile a d'abord été posée dans « Santé et corps » : elle ne portait
     * qu'un libellé. Or la seule chose qu'il faut apprendre **sans ouvrir
     * l'écran** est que l'année est bloquée — sinon on perd trois années sans
     * savoir pourquoi. Le menu affiche donc une ligne qui lit l'état.
     */
    const menu = readFileSync(
      new URL('../../components/ActivityMenu.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(menu).toContain('PracticeRow');
    for (const name of ['practiceSummary', 'stalled', 'bestPractice']) {
      expect(menu, `le menu ne lit pas ${name}`).toContain(name);
    }

    // Et la phrase change vraiment d'un état à l'autre : une ligne qui dirait
    // la même chose dans les trois cas ne vaudrait pas mieux qu'une tuile.
    const state = grown(71, 30);
    const empty = summary(state);
    hold(state, 'reading');
    const one = summary(state);
    busy(state);
    for (const practice of PRACTICES) hold(state, practice.id);
    const stuckLine = summary(state);
    expect(new Set([empty, one, stuckLine]).size).toBe(3);
    expect(stuckLine).toContain('entretiens');
  });

  it('dit toujours pourquoi une ligne est fermée', () => {
    const state = grown(67, 8);
    for (const practice of PRACTICES) {
      const why = takeBlocker(state, practice.id);
      if (state.player.age < practice.from) {
        expect(why, `${practice.id} devrait être fermée à 8 ans`).toBeTruthy();
      }
    }
    // Et une fois prise, on ne la reprend pas.
    const open = availablePractices(state);
    if (open.length > 0) {
      const first = open[0]!;
      state.player.money = 400_000;
      takePractice(createCtx(state), first.id);
      expect(takeBlocker(state, first.id)).toContain('déjà');
      expect(kept(state).map((x) => x.id)).toContain(first.id);
      dropPractice(createCtx(state), first.id);
      expect(kept(state).map((x) => x.id)).not.toContain(first.id);
    }
  });
});
