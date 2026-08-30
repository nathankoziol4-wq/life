/**
 * Vérifications de l'allure.
 *
 * Le catalogue portait cinq aveux voisins, tous sur la même chose : coiffure
 * et style absents, salon et soins absents, tatouages et marques absents,
 * « l'allure baisse avec l'âge mais l'apparence décrite ne change pas », et
 * une chirurgie esthétique classée `BASIC` — « une action, un tirage ».
 *
 * Le jeu tirait pourtant une apparence complète à la naissance et n'y touchait
 * plus jamais. Toute l'allure vivait dans une statistique, `looks`, que les
 * quinze systèmes qui la lisent lisaient de la même façon.
 *
 * Six exigences :
 *
 * 1. **aucun registre n'est bon partout** — sinon il n'y a qu'une réponse ;
 * 2. **le registre pèse assez pour se sentir** — un système qu'on ne sent pas
 *    n'est pas un système ;
 * 3. **ce qu'on ne tient pas redescend**, et cela se lit avant les chiffres ;
 * 4. **une partie sans registre se joue exactement comme avant** — c'est ce
 *    qui permet d'ajouter une couche à trois systèmes déjà mesurés ;
 * 5. **les marques viennent de la vie qu'on a menée**, pas d'un dé ;
 * 6. **l'apparence décrite change**, ce qui était l'aveu de départ.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { GROOMING, REGISTERS, getMark, type Audience } from '../../data/looks.ts';
import {
  DECAY, adopt, adoptCost, describe as describeLook, driftAppearance, groom,
  groomBlocker, marksOf, markPenalty, readAs, recovering, registerOf,
  upkeepLabel, upkeepOf,
} from '../../systems/appearance.ts';
import { odds, profilesFor } from '../../systems/matching.ts';
import { cosmeticSurgery } from '../../systems/activities.ts';

/** Les trois publics. Écrits ici pour que le test échoue si l'un disparaît. */
const AUDIENCES_ALL: Audience[] = ['embauche', 'rencontre', 'public'];

function grown(seed: number, years = 28): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < years && !state.gameOver; i++) simulateYear(state);
  state.player.prison = null;
  state.player.yearActions = {};
  state.player.money = Math.max(state.player.money, 20_000);
  return state;
}

describe('les registres', () => {
  it('ne sont bons nulle part de la même façon', () => {
    expect(REGISTERS.length).toBeGreaterThanOrEqual(4);
    for (const register of REGISTERS) {
      for (const who of AUDIENCES_ALL) {
        expect(Math.abs(register.reads[who]), register.id).toBeLessThanOrEqual(1);
      }
      // Un registre qui plairait à tout le monde serait la bonne réponse, et
      // il n'y aurait plus de choix à faire.
      const sum = AUDIENCES_ALL.reduce((n, who) => n + register.reads[who], 0);
      expect(sum, register.id).toBeLessThan(1.2);
    }
  });

  it('n’en compte aucun qui domine tous les autres', () => {
    /*
     * L'exigence centrale. Un registre au moins aussi bon que tous les autres
     * partout rendrait les quatre autres décoratifs.
     */
    const dominant = REGISTERS.filter((a) => REGISTERS.every((b) => (
      a === b || AUDIENCES_ALL.every((who) => a.reads[who] >= b.reads[who])
    )));
    expect(dominant.map((r) => r.id)).toEqual([]);
  });

  it('se contredisent d’un public à l’autre', () => {
    // Il faut au moins un couple de registres qui s'inversent : celui que le
    // recruteur préfère doit être desservi ailleurs.
    const best = (who: Audience) => (
      [...REGISTERS].sort((a, b) => b.reads[who] - a.reads[who])[0]!
    );
    expect(best('embauche').id).not.toBe(best('public').id);
  });
});

describe('ce que ça change', () => {
  it('pèse assez pour se sentir sur une chance réelle', () => {
    /*
     * **Réglé après mesure.** Premier jet : le registre multipliait la
     * statistique `looks`, laquelle ne pèse que la moitié d'une séduction. Le
     * meilleur registre ne changeait la chance d'obtenir une réponse que de
     * cinq points, pour une dépense annuelle. Il multiplie maintenant la
     * chance elle-même, comme `networkEdge` le fait pour l'embauche.
     *
     * Mesuré : de 52,4 % à 68,2 % de réponse selon le registre, contre 59,9 %
     * pour qui n'en a pas choisi.
     */
    const state = grown(21);
    const profile = profilesFor(state)[1]!;
    delete state.player.flags.lookRegister;
    const bare = odds(state, profile);

    const rates = REGISTERS.map((register) => {
      state.player.flags.lookRegister = register.id;
      state.player.flags.lookUpkeep = 1;
      return odds(state, profile);
    });
    const spread = Math.max(...rates) - Math.min(...rates);
    expect(spread).toBeGreaterThan(0.1);
    // Et le meilleur fait mieux que rien du tout, le pire fait pire.
    expect(Math.max(...rates)).toBeGreaterThan(bare);
    expect(Math.min(...rates)).toBeLessThan(bare);
  });

  it('ne change rien du tout tant qu’on n’a pas choisi', () => {
    /*
     * La garantie qui a permis de brancher ce système sur trois autres déjà
     * mesurés — l'embauche, la rencontre, le public — sans invalider leurs
     * chiffres. Une partie qui ignore l'allure se joue au chiffre près comme
     * avant.
     */
    const state = grown(5);
    delete state.player.flags.lookRegister;
    for (const who of AUDIENCES_ALL) expect(readAs(state, who)).toBe(1);
  });

  it('redescend si l’on n’y remet rien, et cela se lit', () => {
    const state = grown(9);
    adopt(createCtx(state), 'soigne');
    expect(registerOf(state)?.id).toBe('soigne');
    const kept = upkeepOf(state);
    expect(kept).toBeGreaterThan(0.5);
    const strong = readAs(state, 'embauche');

    // Une année sans rien y remettre.
    driftAppearance(createCtx(state));
    expect(upkeepOf(state)).toBeCloseTo(kept - DECAY, 5);
    expect(readAs(state, 'embauche')).toBeLessThan(strong);
    // Et la phrase change avant les chiffres.
    expect(upkeepLabel(upkeepOf(state))).not.toBe(upkeepLabel(kept));
  });

  it('remonte quand on s’en occupe, et pas au-delà de tout', () => {
    const state = grown(11);
    adopt(createCtx(state), 'naturel');
    state.player.flags.lookUpkeep = 0;
    state.player.yearActions = {};
    let last = 0;
    for (const op of GROOMING) {
      if (groomBlocker(state, op.id)) continue;
      groom(createCtx(state), op.id);
      expect(upkeepOf(state)).toBeGreaterThan(last);
      last = upkeepOf(state);
    }
    expect(last).toBeGreaterThan(0);
    expect(last).toBeLessThanOrEqual(1);
    // Deux fois la même chose dans l'année : non.
    const first = GROOMING[0]!;
    expect(groomBlocker(state, first.id)).toBeTruthy();
  });

  it('coûte, et le premier registre coûte moins que le suivant', () => {
    const state = grown(13);
    const register = REGISTERS[0]!;
    const firstTime = adoptCost(state, register);
    const before = state.player.money;
    adopt(createCtx(state), register.id);
    expect(state.player.money).toBe(before - firstTime);
    // Changer coûte plus cher que se présenter la première fois : on ne
    // renouvelle pas une allure avec ce qu'on avait.
    expect(adoptCost(state, REGISTERS[1]!)).toBeGreaterThan(
      Math.round(REGISTERS[1]!.upkeep * 0.6),
    );
  });
});

describe('une intervention', () => {
  it('se voit pendant un an, puis cesse de se voir', () => {
    /*
     * Le catalogue reprochait à la chirurgie « ni choix de procédure, ni
     * complication, ni suite ». Les deux premiers étaient inexacts : le
     * catalogue de procédures et la branche de complication existaient déjà.
     * Le troisième portait — on payait, on gagnait des points le jour même, et
     * rien n'en paraissait.
     */
    const state = grown(29);
    state.player.yearActions = {};
    state.player.money = 60_000;
    const before = describeLook(state);
    cosmeticSurgery(createCtx(state), 'teeth');
    expect(recovering(state)).toBe(true);
    expect(describeLook(state)).not.toBe(before);
    expect(describeLook(state)).toContain('intervention');

    // L'année suivante en porte encore la trace, celle d'après non.
    state.year += 1;
    driftAppearance(createCtx(state));
    expect(recovering(state)).toBe(false);
    state.year += 1;
    driftAppearance(createCtx(state));
    expect(describeLook(state)).not.toContain('intervention');
  });

  it('finit par se lire sur le visage quand on y revient trop', () => {
    const state = grown(31);
    state.player.flags.lookMarks = '';
    state.player.flags.surgeries = 5;
    for (let i = 0; i < 20; i++) driftAppearance(createCtx(state));
    expect(marksOf(state)).toContain('refait');
    expect(getMark('refait')!.reversible).toBe(false);
  });
});

describe('ce que la vie inscrit', () => {
  it('ne marque personne sans raison', () => {
    // Quelqu'un de calme, en bonne santé, jeune et libre ne prend rien.
    const state = grown(17, 20);
    state.player.stats.stress = 20;
    state.player.stats.health = 90;
    state.player.stats.happiness = 80;
    state.player.flags.lookMarks = '';
    state.player.flags.surgeries = 0;
    state.player.job = null;
    for (let i = 0; i < 8; i++) driftAppearance(createCtx(state));
    expect(marksOf(state)).toEqual([]);
    expect(markPenalty(state)).toBe(0);
  });

  it('marque celui qui a vécu tendu, et le dit', () => {
    const state = grown(19, 40);
    state.player.age = Math.max(state.player.age, 45);
    state.player.stats.stress = 85;
    state.player.stats.happiness = 30;
    state.player.stats.health = 35;
    state.player.flags.lookMarks = '';
    for (let i = 0; i < 20; i++) driftAppearance(createCtx(state));
    const marks = marksOf(state);
    expect(marks.length).toBeGreaterThan(1);
    expect(markPenalty(state)).toBeGreaterThan(0);
    // Chaque marque sait dire ce qui l'a causée : sans cela, ce serait un
    // malus anonyme de plus.
    for (const id of marks) {
      const mark = getMark(id);
      expect(mark, id).toBeTruthy();
      expect(mark!.cause.length).toBeGreaterThan(5);
    }
  });

  it('efface ce qui peut l’être quand la cause a disparu', () => {
    const state = grown(23, 30);
    state.player.flags.lookMarks = 'cernes,teint,rides';
    state.player.stats.stress = 20;
    state.player.stats.happiness = 75;
    state.player.stats.health = 80;
    driftAppearance(createCtx(state));
    const left = marksOf(state);
    expect(left).not.toContain('cernes');
    expect(left).not.toContain('teint');
    // Et ce qui ne s'efface pas reste.
    expect(left).toContain('rides');
  });

  it('finit par se voir dans la phrase que la fiche affiche', () => {
    /*
     * L'aveu de départ du catalogue : « l'allure baisse avec l'âge mais
     * l'apparence décrite ne change pas ». On compare donc la phrase à vingt
     * ans et la même phrase à la fin d'une vie.
     */
    const state = createNewLife({ seed: 7 });
    for (let i = 0; i < 22 && !state.gameOver; i++) simulateYear(state);
    const young = describeLook(state);
    for (let i = 0; i < 40 && !state.gameOver; i++) simulateYear(state);
    const old = describeLook(state);
    expect(old).not.toBe(young);
    expect(old.length).toBeGreaterThan(young.length - 20);
  });
});
