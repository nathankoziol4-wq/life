/**
 * Vérifications des scènes composées.
 *
 * Le catalogue portait deux aveux voisins : la banque d'événements tient par
 * son architecture mais pas par son volume, et rien n'est composé à la volée.
 * Mesuré avant d'écrire une ligne, sur quarante vies entières et en comptant
 * **ce que le joueur lit vraiment** — le titre d'une scène et l'issue qu'elle
 * produit :
 *
 *     scènes lues par vie   : 148, dont 97 distinctes
 *     recouvrement entre deux vies : 55,5 %
 *
 * Plus d'une scène sur deux est commune à deux vies quelconques. Ce n'est pas
 * un défaut d'architecture — le format déclaratif est bon — c'est un défaut
 * de volume, et le volume ne s'écrit pas à la main.
 *
 * Six exigences :
 *
 * 1. **une scène ne se pose qu'avec quelqu'un de réel** — jamais de PNJ
 *    inventé pour l'occasion, jamais de mort, jamais de brouillé ;
 * 2. **le caractère décide, pas un dé** — deux personnes opposées sur le trait
 *    en jeu donnent deux issues différentes, toujours ;
 * 3. **savoir à qui l'on a affaire paie** — sinon le choix est décoratif ;
 * 4. **la scène apprend ce qu'elle a mis à l'épreuve** — c'est sa contrepartie
 *    et son lien avec les soirées ;
 * 5. **la même scène ne revient pas avec la même personne** avant longtemps ;
 * 6. **deux vies se ressemblent nettement moins**, mesuré de bout en bout.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { SITUATIONS, getSituation, type SituationOutcome } from '../../data/situations.ts';
import { TRAITS } from '../../data/dates.ts';
import { knows } from '../../systems/dates.ts';
import {
  COMPOSED_COOLDOWN, castings, composeYear, playedRecently, stands,
} from '../../systems/composed.ts';

/**
 * Ce qu'une issue vaut pour le joueur, sur une seule échelle.
 *
 * Il faut bien une monnaie commune pour comparer deux issues dont l'une donne
 * de l'argent et l'autre du calme. Les poids ne prétendent pas être justes :
 * ils servent à comparer des choix entre eux, pas à mesurer une vie.
 */
function worth(outcome: SituationOutcome): number {
  return (outcome.happiness ?? 0)
    + (outcome.rel ?? 0) * 0.6
    - (outcome.stress ?? 0) * 0.5
    + (outcome.money ?? 0) / 250;
}

function grown(seed: number, years = 30): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

describe('les scènes', () => {
  it('mettent toutes un trait à l’épreuve, et savent qui peut les jouer', () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(12);
    const ids = new Set(SITUATIONS.map((s) => s.id));
    expect(ids.size).toBe(SITUATIONS.length);
    for (const situation of SITUATIONS) {
      expect(TRAITS, situation.id).toContain(situation.trait);
      expect(situation.actors.length, situation.id).toBeGreaterThan(0);
      expect(situation.choices.length, situation.id).toBeGreaterThanOrEqual(2);
      for (const choice of situation.choices) {
        // Une scène dont les deux issues seraient identiques serait un
        // événement écrit déguisé : le caractère n'y changerait rien.
        expect(choice.high.text, `${situation.id} / ${choice.label}`)
          .not.toBe(choice.low.text);
        expect(choice.high.text.length).toBeGreaterThan(30);
        expect(choice.low.text.length).toBeGreaterThan(30);
      }
    }
  });

  it('n’emploient que des balises que le moteur sait remplacer', () => {
    // Une balise inconnue s'afficherait telle quelle au joueur. Le premier
    // jet en contenait une — « {il.maj} » — invisible à la relecture.
    const known = new Set(['name', 'full', 'il', 'le', 'lui', 'e', 'moi_e', 'player', 'city', 'country', 'job', 'school']);
    for (const situation of SITUATIONS) {
      const texts = [situation.title, situation.text, ...situation.choices.flatMap((c) => (
        [c.label, c.high.text, c.low.text]
      ))];
      for (const text of texts) {
        for (const tag of text.match(/\{[^}]*\}/g) ?? []) {
          expect(known, `${situation.id} : ${tag}`).toContain(tag.slice(1, -1));
        }
      }
    }
  });
});

describe('choisir avec ce qu’on sait', () => {
  it('n’a jamais de bonne réponse indépendante du caractère', () => {
    /*
     * **L'exigence qui a fait réécrire la moitié du fichier.** Premier jet :
     * six scènes sur quatorze seulement récompensaient de connaître la
     * personne — dans les huit autres, une option dominait quel que soit le
     * caractère, et le choix n'était qu'un décor. Quatre ont été rééquilibrées,
     * quatre ont reçu une troisième option qui n'a de sens que dans un cas :
     * passer par un notaire, demander explicitement, donner un autre nom.
     */
    let depends = 0;
    for (const situation of SITUATIONS) {
      const high = situation.choices.map((c) => worth(c.high));
      const low = situation.choices.map((c) => worth(c.low));
      const bestHigh = high.indexOf(Math.max(...high));
      const bestLow = low.indexOf(Math.max(...low));
      if (bestHigh !== bestLow) depends += 1;
    }
    expect(depends).toBe(SITUATIONS.length);
  });

  it('paie nettement mieux que jouer au mieux sans savoir', () => {
    /*
     * Trois joueurs, sur soixante vies entières : celui qui prend toujours la
     * première option, celui qui prend celle qui est la meilleure *en
     * moyenne* — le mieux qu'on puisse faire sans connaître la personne — et
     * celui qui sait à qui il a affaire.
     *
     * Mesuré : **3,73 · 4,82 · 6,97**. Savoir rapporte 45 % de plus que le
     * meilleur jeu aveugle, ce qui est le point du système entier.
     */
    const value = (how: 'premier' | 'moyenne' | 'sait'): number => {
      const runs: number[] = [];
      for (let seed = 1; seed <= 40; seed++) {
        const state = createNewLife({ seed });
        let total = 0;
        let count = 0;
        for (let year = 0; year < 60 && !state.gameOver; year++) {
          simulateYear(state);
          const ctx = createCtx(state);
          for (const pending of [...state.pending]) {
            let pick = 0;
            const situation = getSituation(String(pending.payload?.situation ?? ''));
            const person = pending.personId ? state.npcs[pending.personId] : undefined;
            if (pending.payload?.system === 'composee' && situation && person) {
              const way = stands(person, situation);
              if (how === 'sait') {
                const scores = situation.choices.map((c) => worth(way === 'high' ? c.high : c.low));
                pick = scores.indexOf(Math.max(...scores));
              } else if (how === 'moyenne') {
                const scores = situation.choices.map((c) => (worth(c.high) + worth(c.low)) / 2);
                pick = scores.indexOf(Math.max(...scores));
              }
              const choice = situation.choices[pick]!;
              total += worth(way === 'high' ? choice.high : choice.low);
              count += 1;
            }
            resolvePending(ctx, pending.id, pick);
          }
          state.pending = [];
        }
        if (count > 0) runs.push(total / count);
      }
      expect(runs.length).toBeGreaterThan(20);
      return [...runs].sort((a, b) => a - b)[Math.floor(runs.length / 2)]!;
    };

    const blind = value('moyenne');
    const wise = value('sait');
    expect(wise).toBeGreaterThan(blind * 1.25);
    // Et jouer au hasard reste moins bon que jouer au mieux en aveugle : la
    // scène récompense déjà la réflexion avant de récompenser la connaissance.
    expect(blind).toBeGreaterThan(value('premier'));
  });
});

describe('poser une scène', () => {
  it('ne la pose qu’avec quelqu’un de vivant et de joignable', () => {
    for (let seed = 1; seed < 25; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const { situation, person } of castings(state)) {
        expect(person.alive, situation.id).toBe(true);
        expect(person.estranged, situation.id).toBe(false);
        expect(person.incarcerated, situation.id).toBe(false);
        expect(situation.actors, situation.id).toContain(person.relation);
      }
    }
  });

  it('ne se pose pas du tout en détention', () => {
    const state = grown(4);
    state.player.prison = { years: 4, left: 3, crime: 'vol', parole: false } as never;
    expect(castings(state)).toEqual([]);
    expect(composeYear(createCtx(state))).toBeNull();
  });

  it('ne rejoue pas la même scène avec la même personne', () => {
    const state = grown(6);
    state.pending = [];
    const posed = composeYear(createCtx(state));
    if (!posed) return;
    const situation = getSituation(String(posed.payload?.situation))!;
    const person = state.npcs[posed.personId!]!;
    expect(playedRecently(state, situation, person)).toBe(true);
    expect(castings(state).some((c) => (
      c.situation.id === situation.id && c.person.id === person.id
    ))).toBe(false);
    // Et le délai finit par passer.
    state.year += COMPOSED_COOLDOWN;
    expect(playedRecently(state, situation, person)).toBe(false);
  });
});

describe('ce que la scène apprend', () => {
  it('découvre le trait qu’elle a mis à l’épreuve', () => {
    let learnt = 0;
    for (let seed = 1; seed < 40; seed++) {
      const state = grown(seed, 26);
      if (!state.player.alive) continue;
      state.pending = [];
      const posed = composeYear(createCtx(state));
      if (!posed) continue;
      const situation = getSituation(String(posed.payload?.situation))!;
      const person = state.npcs[posed.personId!]!;
      resolvePending(createCtx(state), posed.id, 0);
      // Après la scène, le trait est connu — quel qu'il soit, et que le
      // joueur ait bien ou mal choisi. C'est la contrepartie : on ne choisit
      // pas de vivre la scène, on en ressort en sachant quelque chose.
      expect(knows(person, situation.trait), `${situation.id} / ${person.firstName}`).toBe(true);
      learnt += 1;
    }
    expect(learnt).toBeGreaterThan(15);
  });

  it('donne deux issues opposées à deux caractères opposés', () => {
    /*
     * **Écrit deux fois.** Le premier jet reposait une scène au hasard et ne
     * comparait les deux textes que si le tirage retombait sur le même couple
     * — c'est-à-dire presque jamais. Il passait sans rien vérifier, ce qui est
     * le défaut que ce projet a déjà rencontré ailleurs et qu'il ne veut plus
     * commettre. On rejoue donc **la même scène en attente**, deux fois, en ne
     * changeant que le caractère de la personne.
     */
    let compared = 0;
    for (let seed = 1; seed < 30; seed++) {
      const state = grown(seed, 26);
      if (!state.player.alive) continue;
      state.pending = [];
      const posed = composeYear(createCtx(state));
      if (!posed) continue;
      const situation = getSituation(String(posed.payload?.situation))!;
      const person = state.npcs[posed.personId!]!;

      person.personality[situation.trait] = 92;
      expect(stands(person, situation)).toBe('high');
      const high = resolvePending(createCtx(state), posed.id, 0);

      // La même scène, la même personne, l'autre caractère.
      state.pending = [{ ...posed, id: 'rejeu' }];
      person.personality[situation.trait] = 6;
      expect(stands(person, situation)).toBe('low');
      const low = resolvePending(createCtx(state), 'rejeu', 0);

      expect(high.text, situation.id).not.toBe(low.text);
      expect(high.text.length).toBeGreaterThan(20);
      expect(low.text.length).toBeGreaterThan(20);
      compared += 1;
    }
    // Sans ce compte, le test passerait sur zéro comparaison.
    expect(compared).toBeGreaterThan(10);
  });
});

describe('deux vies', () => {
  it('se ressemblent nettement moins qu’avant', () => {
    /*
     * La mesure qui a motivé tout le fichier, refaite à l'identique : on
     * compare **ce que le joueur lit** — titre et issue — entre deux vies.
     *
     *     avant : 148 scènes par vie, 97 distinctes, 55,5 % de recouvrement
     *     après : 205 scènes par vie, 156 distinctes, 35,8 % de recouvrement
     */
    const lives: Set<string>[] = [];
    for (let seed = 1; seed <= 14; seed++) {
      const state = createNewLife({ seed });
      const read = new Set<string>();
      for (let year = 0; year < 70 && !state.gameOver; year++) {
        simulateYear(state);
        const ctx = createCtx(state);
        for (const pending of [...state.pending]) {
          const out = resolvePending(ctx, pending.id, 0);
          read.add(`${pending.title}|${out.text}`);
        }
        state.pending = [];
      }
      if (read.size > 20) lives.push(read);
    }
    expect(lives.length).toBeGreaterThan(8);

    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < lives.length; i++) {
      for (let j = i + 1; j < lives.length; j++) {
        const a = lives[i]!;
        const b = lives[j]!;
        let common = 0;
        for (const line of a) if (b.has(line)) common += 1;
        sum += common / Math.min(a.size, b.size);
        pairs += 1;
      }
    }
    const overlap = sum / pairs;
    // Le seuil est lâche exprès : ce qu'on garde est l'ordre de grandeur, pas
    // le réglage du jour. Avant, aucun réglage n'aurait pu passer dessous.
    expect(overlap).toBeLessThan(0.45);
  });
});
