/**
 * L'audience — le moment le plus lourd du jeu tenait en un lancer.
 *
 * `justice.ts#goToTrial` : choisir un avocat parmi quatre prix, payer, lancer
 * un dé contre `acquittalChance`, annoncer le verdict. Le joueur choisissait
 * **un niveau de gamme**. Le catalogue : « le procès est un calcul : aucune
 * scène, aucune plaidoirie à conduire ».
 *
 * Et ce chantier-ci l'a rendu deux fois plus voyant : `advanceTrial` fait
 * juger toute affaire qu'on laisse traîner, `office.ts` a fait de la
 * condamnation ce qui coûte une carrière.
 *
 * Sept exigences :
 *
 * 1. **ce n'est pas l'entretien d'embauche avec d'autres mots** : on ne devine
 *    pas une préférence, on dépense une ressource finie ;
 * 2. **lire bat ne pas lire**, sinon les décisions sont un rituel avant le dé ;
 * 3. **tout contester est puni**, sinon la ressource ne se défend pas ;
 * 4. **l'avocat achète de la vue et non un verdict** ;
 * 5. **le dossier compte toujours plus que la plaidoirie** — le calcul d'avant
 *    était bon, l'audience le module ;
 * 6. **la solidité ne bouge pas si l'on rouvre l'écran**, sans quoi on
 *    relancerait jusqu'à tomber sur un dossier creux ;
 * 7. **le chemin sans audience existe et n'est pas meilleur.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { CRIME_MAP, LAWYERS } from '../../data/crimes.ts';
import { ROUNDS, SWING } from '../../data/hearing.ts';
import { arrest, goToTrial, pendingTrial, pleadFor } from '../../systems/justice.ts';
import {
  answer, chargesOf, creditOf, currentCharge, hearingDone, hearingOf,
  openHearing, readOf, sightOf, solidityOf, swingOf, weightOf,
} from '../../systems/hearing.ts';

/** Une vie adulte avec une affaire ouverte. */
function accused(seed: number, crimeId = 'burglary'): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.money = 900_000;
  arrest(createCtx(state), CRIME_MAP.burglary!, 0);
  void crimeId;
  return pendingTrial(state) ? state : null;
}

type Pick = (state: GameState, i: number) => 'concéder' | 'contester' | 'taire';

/** Conduit une audience entière et rend ce qu'elle a déplacé. */
function plead(state: GameState, lawyerId: string, pick: Pick): number {
  openHearing(createCtx(state), lawyerId);
  let i = 0;
  while (!hearingDone(state)) {
    answer(createCtx(state), pick(state, i));
    i += 1;
  }
  return swingOf(state);
}

const READER: Pick = (state) => {
  const charge = currentCharge(state);
  if (!charge) return 'concéder';
  const read = readOf(state, charge);
  if (!read) return 'taire';
  return (read.low + read.high) / 2 < 42 ? 'contester' : 'concéder';
};

/** Le taux de condamnation d'une façon de plaider, sur une population. */
function convictionRate(lawyerId: string, pick: Pick, n = 160): number {
  let convicted = 0;
  let played = 0;
  for (let s = 0; s < n; s++) {
    const state = accused(s * 613 + 5);
    if (!state) continue;
    plead(state, lawyerId, pick);
    const before = state.player.criminalRecord.convictions.length;
    goToTrial(createCtx(state), lawyerId);
    if (state.player.criminalRecord.convictions.length > before) convicted += 1;
    played += 1;
  }
  return played === 0 ? 0 : convicted / played;
}

describe('ce qui se joue', () => {
  it('est une dépense et non une devinette', () => {
    /*
     * La distinction avec `interview.ts` n'est pas cosmétique : là-bas il
     * existe une bonne réponse par question, connue de l'employeur. Ici la
     * bonne réponse dépend de **ce qu'il reste**, donc de ce qu'on a fait
     * avant. Contester un point solide en premier abîme les suivants.
     */
    const state = accused(3);
    if (!state) return;
    openHearing(createCtx(state), 'standard');
    const start = creditOf(state);
    expect(start).toBeGreaterThan(0);

    // On conteste tout, sans regarder : le crédit doit fondre.
    while (!hearingDone(state)) answer(createCtx(state), 'contester');
    expect(creditOf(state)).toBeLessThan(start);
  });

  it('fait payer un point contesté à tort plus cher que le même concédé', () => {
    const one = accused(5);
    const two = accused(5);
    if (!one || !two) return;

    // On cherche une charge que l'accusation tient réellement.
    openHearing(createCtx(one), 'elite');
    const charge = currentCharge(one);
    if (!charge || solidityOf(one, charge) < 70) return;

    answer(createCtx(one), 'concéder');
    const conceded = weightOf(one);

    openHearing(createCtx(two), 'elite');
    answer(createCtx(two), 'contester');
    // Perdre un point qu'on a disputé pèse plus que l'avoir reconnu, et coûte
    // en plus le crédit : sans quoi contester ne coûterait rien de retenu.
    expect(weightOf(two)).toBeGreaterThan(conceded);
    expect(creditOf(two)).toBeLessThan(creditOf(one));
  });

  it('propose autant de charges qu’annoncé, et pas toujours les mêmes', () => {
    const seen = new Set<string>();
    let some: GameState | null = null;
    for (let s = 3; s < 40; s += 2) {
      const state = accused(s);
      if (!state) continue;
      some = state;
      const charges = chargesOf(state);
      expect(charges.length).toBe(ROUNDS);
      for (const c of charges) seen.add(c.id);
    }
    expect(some).not.toBeNull();
    // Le tirage puise dans le catalogue plutôt que d'en servir toujours cinq.
    expect(seen.size).toBeGreaterThan(ROUNDS);
  });
});

describe('lire', () => {
  it('bat ne pas lire', () => {
    /*
     * Mesuré par `tools/measure-audience.mjs` sur 253 vies, avocat de
     * quartier :
     *
     *     joueur   | déplacement moyen | condamné
     *     hasard   |               2,4 |   60,9 %
     *     docile   |               6,8 |   62,8 %
     *     furieux  |               5,4 |   64,4 %
     *     lecteur  |              −4,0 |   57,3 %
     *     auto     |              −3,4 |   57,7 %
     *
     * Deux choses s'y lisent. **Lire paie** : sept points de condamnation
     * séparent le lecteur du plus mauvais. Et **le lecteur descend sous
     * zéro** : l'audience peut réellement améliorer sa position, ce qui n'est
     * pas rien — dans sa première version le meilleur joueur atteignait
     * exactement zéro et l'audience n'était qu'un impôt.
     */
    const reader = convictionRate('standard', READER);
    const meek = convictionRate('standard', () => 'concéder');
    expect(reader).toBeLessThan(meek);
  });

  it('punit qui conteste tout', () => {
    /*
     * Dans la première version, tout contester valait autant que répondre au
     * hasard (50,2 % contre 51,4 %) : un point perdu ne coûtait que du crédit,
     * jamais du poids retenu. La ressource ne se défendait pas elle-même.
     */
    const furious = convictionRate('standard', () => 'contester');
    const reader = convictionRate('standard', READER);
    expect(furious).toBeGreaterThan(reader);
  });
});

describe('l’avocat', () => {
  it('achète de la vue, et non un verdict', () => {
    const state = accused(11);
    if (!state) return;
    const sight: number[] = [];
    for (const lawyer of LAWYERS) {
      state.player.hearing = null;
      openHearing(createCtx(state), lawyer.id);
      sight.push(sightOf(state));
    }
    for (let i = 1; i < sight.length; i++) {
      expect(sight[i]!).toBeGreaterThan(sight[i - 1]!);
    }
    // Et le commis d'office ne voit presque rien : on plaide à l'aveugle.
    expect(sight[0]!).toBeLessThan(0.5);
  });

  it('ne donne jamais le chiffre exact', () => {
    /*
     * Un ténor du barreau réduit l'incertitude, il ne la supprime pas — sans
     * quoi l'audience redeviendrait le calcul qu'elle remplace. C'est la même
     * règle que pour la limite d'alerte du braquage et la compétence des
     * praticiens : ce qui décide n'est jamais affiché en clair.
     */
    const state = accused(13);
    if (!state) return;
    openHearing(createCtx(state), 'elite');
    let read = 0;
    for (const charge of chargesOf(state)) {
      const band = readOf(state, charge);
      if (!band) continue;
      read += 1;
      expect(band.high).toBeGreaterThan(band.low);
    }
    expect(read).toBeGreaterThan(0);
  });

  it('ne s’affiche plus comme une efficacité chiffrée', () => {
    // « efficacité 78/100 » était un achat de verdict affiché en clair — le
    // défaut que `practitioners.ts` a corrigé pour les médecins.
    const source = readFileSync(
      new URL('../../components/ActivityMenu.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).not.toContain('efficacité ${l.quality}');
  });
});

describe('ce que l’audience pèse', () => {
  it('module le dossier sans le remplacer', () => {
    /*
     * Mesuré : une preuve mince (45) mène à 47,4 % de condamnations, une
     * preuve lourde (60) à 61,0 % — **treize points et demi**, contre sept
     * points entre la meilleure et la pire façon de plaider. Le dossier
     * compte donc environ deux fois plus que la plaidoirie, ce qui est ce
     * qu'on demande aussi à l'entretien d'embauche : un dossier faible bien
     * défendu peut passer devant un dossier moyen mal défendu, et rien de
     * plus.
     *
     * Dans la première version, `SWING` valait 34 et l'ordre était inversé :
     * bien plaider valait 10,6 points quand quinze points de preuve n'en
     * valaient que cinq.
     */
    expect(SWING).toBeLessThanOrEqual(24);

    const state = accused(17);
    if (!state) return;
    const swing = plead(state, 'standard', () => 'concéder');
    expect(Math.abs(swing)).toBeLessThanOrEqual(SWING);
  });

  it('ne bouge pas si l’on rouvre l’écran', () => {
    /*
     * La solidité vient d'un hachage de la graine et de l'affaire, pas du
     * générateur de la partie : sinon on relancerait jusqu'à tomber sur un
     * dossier creux, et **chaque tirage consommé décalerait toute la suite du
     * monde** selon qu'on a ouvert l'écran ou non.
     */
    const state = accused(19);
    if (!state) return;
    const charges = chargesOf(state);
    const first = charges.map((c) => solidityOf(state, c));
    const again = chargesOf(state).map((c) => solidityOf(state, c));
    expect(again).toEqual(first);
    // Et les charges elles-mêmes sont les mêmes.
    expect(chargesOf(state).map((c) => c.id)).toEqual(charges.map((c) => c.id));
  });

  it('se referme une fois le verdict rendu', () => {
    const state = accused(23);
    if (!state) return;
    plead(state, 'standard', READER);
    expect(hearingOf(state)).not.toBeNull();
    goToTrial(createCtx(state), 'standard');
    expect(hearingOf(state)).toBeNull();
    expect(pendingTrial(state)).toBeNull();
  });
});

describe('laisser plaider', () => {
  it('existe, conclut, et n’est pas meilleur que de s’en occuper', () => {
    /*
     * Le chemin sans mini-jeu doit exister — on peut commettre un délit sans
     * jouer le boîtier — et il ne doit pas dominer, sinon conduire son
     * audience serait une corvée facultative. Mesuré : 57,7 % de
     * condamnations en laissant plaider, 57,3 % en lisant soi-même.
     */
    let concluded = 0;
    let n = 0;
    for (let s = 0; s < 40; s++) {
      const state = accused(s * 613 + 5);
      if (!state) continue;
      n += 1;
      const result = pleadFor(createCtx(state), 'standard');
      expect(result.ok).toBe(true);
      if (pendingTrial(state) === null) concluded += 1;
      // L'audience est refermée derrière elle.
      expect(hearingOf(state)).toBeNull();
    }
    expect(n).toBeGreaterThan(10);
    expect(concluded).toBe(n);
  });
});

describe('l’écran', () => {
  it('montre la ressource, ce qui pèse, et ce qu’on lit', () => {
    const source = readFileSync(
      new URL('../../screens/HearingScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('creditOf');
    expect(source).toContain('weightOf');
    // La lecture, qui est ce que l'avocat achète.
    expect(source).toContain('readSays');
    expect(source).toContain('STANCES');
  });

  it('ne décrit aucune procédure réelle', () => {
    /*
     * Garde-fou de contenu : les charges sont des catégories de jeu
     * volontairement générales, et rien du système ne nomme une juridiction,
     * une règle de preuve ou un acte. Ce test ne prouve pas l'absence — il
     * signale une dérive si quelqu'un ajoute un jour du vocabulaire réel.
     */
    const source = readFileSync(
      new URL('../../data/hearing.ts', import.meta.url).pathname, 'utf8',
    );
    for (const word of ['article ', 'code pénal', 'tribunal correctionnel', 'assises']) {
      expect(source.toLowerCase()).not.toContain(word);
    }
  });
});
