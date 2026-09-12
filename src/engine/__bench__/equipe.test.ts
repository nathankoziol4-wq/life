/**
 * Ceux qui travaillent pour toi.
 *
 * Le jeu modélise finement le travail vu d'en bas : salarié, on a un `team` de
 * vraies personnes, avec compétence, ancienneté et influence. Vu d'en haut,
 * `Business.staff` était un entier. Ce n'était pas un nombre mort — il décidait
 * de la capacité, des coûts et de la dilution — mais une **asymétrie** : le jeu
 * savait que vos collègues sont des gens et oubliait que vos salariés en sont.
 *
 * Six exigences :
 *
 * 1. **le talent se paie**, sans quoi la promesse du système est fausse ;
 * 2. **la maison a une taille** : au-delà, on paie un travail qui ne se vend
 *    pas ;
 * 3. **payer au rabais coûte**, et pas seulement en façade ;
 * 4. **l'ancienneté rend meilleur** ;
 * 5. **les deux vérités ne coexistent pas** : effectif anonyme ou gens nommés,
 *    jamais les deux ;
 * 6. **rien de tout cela ne tire dans la séquence du moteur.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Hire } from '../types.ts';
import {
  LEARNED_CAP, MORALE_START, RESTLESS, SHORTLIST, WAGE_CEILING, WAGE_FLOOR,
  WORTH_FLOOR, WORTH_RANGE,
} from '../../data/crew.ts';
import { getBusinessKind } from '../../data/ventures.ts';
import {
  crewMorale, crewOf, crewSkill, crewWorth, hireBlocker, letGo, offer,
  offerBlocker, openShortlist, paidShare, payroll, raise, skillOf, worthOf,
} from '../../systems/crew.ts';
import { forecast, foundBusiness, hireStaff, layOffStaff, wageOf } from '../../systems/venture.ts';

/**
 * Un patron installé, avec de quoi payer et une maison qui a de la demande.
 *
 * Le renom et la qualité sont posés, et c'est indispensable : le chiffre
 * d'affaires vaut `min(capacité, demande)`, si bien qu'une maison qui vient
 * d'ouvrir n'a pas de demande et qu'un bras de plus n'y ajoute que du coût.
 * Mesuré sur un café neuf à effectif **anonyme**, donc sans rien de ce
 * chantier : +4 297 sans personne, −7 942 à deux, −65 172 à quatre.
 */
function boss(seed: number): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = 900_000;
  p.business = null;
  if (!foundBusiness(createCtx(state), 'cafe').ok) return null;
  p.business!.cash = 600_000;
  p.business!.renown = 70;
  p.business!.quality = 70;
  p.yearActions = {};
  return state;
}

const BEST = (list: Hire[]) => list.reduce((a, b) => (a.competence > b.competence ? a : b));
const WORST = (list: Hire[]) => list.reduce((a, b) => (a.competence < b.competence ? a : b));

/** Embaucher `n` personnes en visant un profil, au salaire demandé. */
function staffUp(state: GameState, n: number, pick: (l: Hire[]) => Hire): number {
  const b = state.player.business!;
  const kind = getBusinessKind(b.kindId)!;
  const wage = wageOf(state, kind);
  let taken = 0;
  for (let round = 0; round < n * 4 && taken < n; round++) {
    state.player.yearActions = {};
    if (!openShortlist(createCtx(state), b, wage).ok) break;
    const list = [...(b.shortlist ?? [])];
    if (list.length === 0) break;
    const want = pick(list);
    if (offer(createCtx(state), b, want.personId, want.asking).ok) taken += 1;
  }
  return taken;
}

describe('embaucher quelqu’un', () => {
  it('fait venir des gens, pas un effectif', () => {
    const state = boss(3);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    expect(openShortlist(createCtx(state), b, wageOf(state, kind)).ok).toBe(true);
    const list = b.shortlist ?? [];
    expect(list).toHaveLength(SHORTLIST);
    for (const cand of list) {
      // Chaque candidat est une vraie personne du monde.
      expect(state.npcs[cand.personId]).toBeDefined();
      expect(cand.competence).toBeGreaterThan(0);
      expect(cand.asking).toBeGreaterThan(0);
    }
    // Et une seule fournée par an.
    expect(hireBlocker(state, b)).toContain('déjà');
  });

  it('fait aller la prétention avec la compétence', () => {
    const state = boss(5);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const list = [...(b.shortlist ?? [])].sort((a, c) => a.competence - c.competence);
    if (list.length < 2) return;
    // Le plus faible ne demande jamais plus que le meilleur : sans cela le
    // choix serait une loterie et non un arbitrage.
    expect(list[0].asking).toBeLessThanOrEqual(list[list.length - 1].asking);
    expect(WAGE_FLOOR).toBeLessThan(1);
    expect(WAGE_CEILING).toBeGreaterThan(1);
  });

  it('refuse une offre trop basse', () => {
    const state = boss(7);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const cand = (b.shortlist ?? [])[0];
    if (!cand) return;
    expect(offerBlocker(state, b, cand, Math.round(cand.asking * 0.5)))
      .toContain('ne descendra pas');
  });
});

describe('ce que le talent vaut', () => {
  it('se paie, à effectif égal', () => {
    /*
     * **La promesse du système, et elle a d'abord été fausse.** Premier
     * réglage — production de 0,55 à 1,65, prétentions de 0,62 à 1,95 — les
     * deux montaient du même pas, et deux salariés quelconques rapportaient
     * *plus* que deux très bons : 74 208 contre 72 953.
     *
     * Mesuré après correction, dans un café qui a de la demande :
     *
     *     équipe                   | têtes | équivalents | masse sal. | bénéfice
     *     témoin, effectif anonyme |     4 |         4,0 |    168 239 |   69 738
     *     deux très bons           |     2 |         3,0 |    138 946 |   78 427
     *     deux quelconques         |     2 |         1,8 |     92 451 |   65 605
     *     quatre quelconques       |     4 |         3,5 |    184 072 |   43 386
     *     quatre très bons         |     4 |         6,0 |    277 305 |  −36 620
     */
    expect(WORTH_RANGE / WORTH_FLOOR).toBeGreaterThan(WAGE_CEILING / WAGE_FLOOR);

    const gains: Record<string, number[]> = { good: [], plain: [] };
    for (let s = 0; s < 10; s++) {
      for (const [key, pick] of [['good', BEST], ['plain', WORST]] as const) {
        const state = boss(3_000 + s);
        if (!state) continue;
        const b = state.player.business!;
        if (staffUp(state, 2, pick) < 2) continue;
        b.renown = 70;
        b.quality = 70;
        gains[key].push(forecast(state).profit);
      }
    }
    if (gains.good.length === 0 || gains.plain.length === 0) return;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(gains.good)).toBeGreaterThan(mean(gains.plain));
  });

  it('compte en équivalents et non en têtes', () => {
    const able: Hire = {
      personId: 'a', competence: 90, asking: 100, wage: 100,
      morale: 60, since: 0, learned: 0,
    };
    const weak: Hire = { ...able, personId: 'b', competence: 15 };
    expect(worthOf(able)).toBeGreaterThan(worthOf(weak) * 2.5);
    // Et un salarié moyen vaut à peu près une tête, pour que les entreprises
    // d'avant ce système ne changent pas de comportement.
    const middling: Hire = { ...able, competence: 50 };
    expect(worthOf(middling)).toBeGreaterThan(0.9);
    expect(worthOf(middling)).toBeLessThan(1.3);
  });

  it('n’invente rien quand personne n’est nommé', () => {
    // Une entreprise d'avant ce chantier : un effectif, aucune personne. Le
    // calcul doit être exactement celui d'avant.
    const state = boss(11);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    b.staff = 3;
    b.crew = undefined;
    expect(crewWorth(b)).toBe(3);
    expect(crewSkill(b)).toBeNull();
    expect(crewMorale(b)).toBeNull();
    expect(payroll(b, wageOf(state, kind))).toBe(3 * wageOf(state, kind));
  });
});

describe('les deux vérités ne coexistent pas', () => {
  it('refuse l’effectif anonyme dès qu’il y a des gens', () => {
    const state = boss(13);
    if (!state) return;
    const b = state.player.business!;
    if (staffUp(state, 1, BEST) < 1) return;
    expect(b.staff).toBe(crewOf(b).length);
    const added = hireStaff(createCtx(state), 1);
    expect(added.ok).toBe(false);
    expect(added.message).toContain('pas un effectif');
    const cut = layOffStaff(createCtx(state), 1);
    expect(cut.ok).toBe(false);
    expect(cut.message).toContain('un nom');
  });

  it('garde `staff` égal au nombre de personnes', () => {
    const state = boss(17);
    if (!state) return;
    const b = state.player.business!;
    if (staffUp(state, 2, BEST) < 2) return;
    expect(b.staff).toBe(2);
    const first = crewOf(b)[0];
    letGo(createCtx(state), b, first.personId);
    expect(b.staff).toBe(1);
    expect(crewOf(b)).toHaveLength(1);
  });
});

describe('les tenir', () => {
  it('fait partir ceux qu’on paie mal, et pas les autres', () => {
    /*
     * Mesuré sur dix ans, un salarié embauché à différentes parts de sa
     * prétention :
     *
     *     ce qu’on verse | moral à 10 ans | encore là | compétence perdue
     *              110 % |            100 |     24/24 |                 0
     *              100 % |            100 |     24/24 |                 0
     *               85 % |             53 |     24/24 |                 0
     *               70 % |              6 |      4/24 |                62
     */
    const stayed: Record<string, number> = { fair: 0, cheap: 0 };
    let ran = 0;
    for (let s = 0; s < 10; s++) {
      for (const [key, share] of [['fair', 1], ['cheap', 0.7]] as const) {
        const state = boss(5_000 + s);
        if (!state) continue;
        const b = state.player.business!;
        const kind = getBusinessKind(b.kindId)!;
        state.player.yearActions = {};
        if (!openShortlist(createCtx(state), b, wageOf(state, kind)).ok) continue;
        const want = BEST([...(b.shortlist ?? [])]);
        if (!offer(createCtx(state), b, want.personId, Math.round(want.asking * share)).ok) continue;
        if (key === 'fair') ran += 1;
        for (let y = 0; y < 10 && state.player.alive && !state.gameOver; y++) simulateYear(state);
        if (crewOf(b).some((h) => h.personId === want.personId)) stayed[key] += 1;
      }
    }
    if (ran === 0) return;
    expect(stayed.fair).toBeGreaterThan(stayed.cheap);
  });

  it('fait démarrer plus bas celui qu’on prend au rabais', () => {
    const state = boss(19);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const cand = BEST([...(b.shortlist ?? [])]);
    expect(offer(createCtx(state), b, cand.personId, Math.round(cand.asking * 0.7)).ok).toBe(true);
    const hire = crewOf(b)[0];
    expect(hire.morale).toBeLessThan(MORALE_START);
    expect(paidShare(hire)).toBeLessThan(1);
  });

  it('rend une augmentation utile à qui en avait besoin', () => {
    const state = boss(23);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const cand = BEST([...(b.shortlist ?? [])]);
    offer(createCtx(state), b, cand.personId, Math.round(cand.asking * 0.7));
    const before = crewOf(b)[0].morale;
    state.player.yearActions = {};
    expect(raise(createCtx(state), b, cand.personId).ok).toBe(true);
    expect(crewOf(b)[0].morale).toBeGreaterThan(before);
    expect(crewOf(b)[0].wage).toBeGreaterThan(Math.round(cand.asking * 0.7));
  });

  it('refroidit ceux qui restent quand on se sépare de quelqu’un', () => {
    const state = boss(29);
    if (!state) return;
    const b = state.player.business!;
    if (staffUp(state, 2, BEST) < 2) return;
    const [first, second] = crewOf(b);
    const before = second.morale;
    expect(letGo(createCtx(state), b, first.personId).ok).toBe(true);
    expect(crewOf(b)[0].morale).toBeLessThan(before);
  });

  it('fait progresser ceux qui restent, sans fin de non-recevoir', () => {
    /*
     * Mesuré sur douze ans, quelqu'un de moyen payé correctement :
     * compétence 40 → 58, ce qu'il pèse 0,99 → 1,19.
     */
    const state = boss(31);
    if (!state) return;
    const b = state.player.business!;
    const kind = getBusinessKind(b.kindId)!;
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const cand = [...(b.shortlist ?? [])].sort((a, c) => a.competence - c.competence)[0];
    if (!cand) return;
    offer(createCtx(state), b, cand.personId, Math.round(cand.asking * 1.15));
    const start = skillOf(crewOf(b)[0]);
    for (let y = 0; y < 12 && state.player.alive && !state.gameOver; y++) simulateYear(state);
    const still = crewOf(b).find((h) => h.personId === cand.personId);
    if (!still) return;
    expect(skillOf(still)).toBeGreaterThan(start);
    // Et pas indéfiniment.
    expect(still.learned).toBeLessThanOrEqual(LEARNED_CAP);
  });
});

describe('le moteur', () => {
  it('ne tire rien dans la séquence pour faire vivre l’équipe', () => {
    /*
     * `advanceCrew` tourne chaque année pour chaque entreprise. Quatre
     * chantiers de suite ont décalé la séquence en y ajoutant un tirage — « Le
     * nom », « La bête », « Comment tu es arrivé », « La route ». On assure sur
     * le corps de la fonction, qu'aucune prose ne peut simuler.
     */
    const source = readFileSync(new URL('../../systems/crew.ts', import.meta.url), 'utf8');
    const body = source.slice(source.indexOf('export function advanceCrew'));
    expect(body).not.toMatch(/\brng\b/);
    expect(body).toMatch(/\bhash\(/);
  });

  it('laisse les seuils dire quelque chose', () => {
    expect(RESTLESS).toBeGreaterThan(0);
    expect(RESTLESS).toBeLessThan(MORALE_START);
  });
});
