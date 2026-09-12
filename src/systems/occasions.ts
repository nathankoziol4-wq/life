/**
 * Ce qui revient chaque année.
 *
 * Deux feuilles du catalogue pointaient le même manque — le volume et la
 * densité des événements — et une mesure a dit où il était vraiment : sur
 * quatre mille années jouées, 3,4 % ne produisaient aucune ligne, mais
 * **quatorze pour cent des années entre six et treize ans étaient
 * parfaitement vides**. L'enfance était la partie la plus maigre du jeu.
 *
 * Ce fichier n'ajoute pas un système de plus : il réutilise le mécanisme
 * d'événements en attente (`systems/randomEvents.ts`) et son écran. Une
 * occasion est un `PendingEvent` comme un autre, résolu par un `system`
 * enregistré — c'est pour cela que ce mécanisme existe.
 *
 * Trois règles gouvernent le choix de l'occasion de l'année :
 *
 * **1. Le calendrier d'abord.** Chaque occasion a son mois ; on ne tire pas
 * dans un sac, on regarde la date. Une vie voit donc les mêmes rendez-vous aux
 * mêmes moments, ce qui lui donne un rythme.
 *
 * **2. L'âge ensuite.** Un enfant et un vieillard n'ont pas le même
 * calendrier. C'est ce qui remplit précisément les années qui étaient vides.
 *
 * **3. La rareté en dernier.** Cinq degrés. La comète passe une fois par
 * quatre-vingts ans environ, et beaucoup de vies ne la voient jamais.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { GameState, PendingEvent, Person } from '../engine/types.ts';
import {
  KEEPSAKES, OCCASIONS, RARITY_LABEL, RARITY_ODDS, freshness, getKeepsake,
  getOccasion, type Occasion,
} from '../data/occasions.ts';
import { livingCostOf } from './ribbons.ts';
import { shiftStats } from './stats.ts';
import { registerSystemResolver } from './randomEvents.ts';

export { KEEPSAKES, OCCASIONS, RARITY_LABEL, getKeepsake, getOccasion };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'âge à partir duquel on paie ses occasions soi-même.
 *
 * En dessous, c'est le foyer qui paie — et c'est vrai autant que nécessaire :
 * un enfant n'a pas d'argent dans ce jeu, si bien que le filtre de prix lui
 * retirait *toutes* les options payantes. Il ne lui restait que « rester à la
 * maison », ce qui vidait de son sens le système censé remplir précisément
 * ses années.
 */
export const PAYS_OWN_WAY = 16;

/** Ce qu'une option coûte réellement à ce personnage-là. */
export function costOf(state: GameState, cost: number | undefined): number {
  if (!cost || state.player.age < PAYS_OWN_WAY) return 0;
  return Math.round(cost * livingCostOf(state));
}

/**
 * Quelle part de ce qu'on a on accepte de mettre dans une fête.
 *
 * Le filtre ne demandait que de pouvoir payer, si bien qu'un personnage à
 * découvert mettait son dernier euro dans la fête du quartier. Mesuré : les
 * faillites par vie passaient de 0,34 à 0,65. On ne propose donc une option
 * payante que si elle reste une toute petite part de ce qu'on a — une
 * occasion est un agrément, pas un poste de dépense.
 */
export const AFFORDABLE = 0.08;

export function canAfford(state: GameState, cost: number | undefined): boolean {
  const price = costOf(state, cost);
  if (price <= 0) return true;
  return state.player.money * AFFORDABLE >= price;
}

/** Le mois où tombe une occasion, pour ce personnage. */
export function monthOf(state: GameState, occasion: Occasion): number {
  return occasion.month === 0 ? state.player.birthMonth : occasion.month;
}

/** Les occasions que cet âge peut voir. */
export function occasionsFor(state: GameState): Occasion[] {
  const age = state.player.age;
  return OCCASIONS.filter((o) => age >= o.from && age <= o.to);
}

/** Combien de fois on a déjà passé cette occasion de cette façon. */
export function timesDone(state: GameState, occasionId: string, choice: number): number {
  return Number(state.player.flags[`occ_${occasionId}_${choice}`] ?? 0);
}

/** Ce qu'on a gardé des occasions passées. */
export function keepsakesOf(state: GameState): string[] {
  return state.player.keepsakes ?? [];
}

/* ------------------------------------------------------------------ */
/* Choisir l'occasion de l'année                                       */
/* ------------------------------------------------------------------ */

/**
 * L'occasion de l'année, s'il y en a une.
 *
 * On parcourt le calendrier et l'on retient la première qui passe son tirage
 * de rareté — mais **en partant d'un mois qui tourne d'une année sur
 * l'autre**. Sans cette rotation, le parcours commençait toujours en janvier :
 * une mesure sur quatre mille années a montré que « le premier jour »
 * représentait à lui seul quatre-vingts pour cent des occasions vues, et que
 * la rentrée ou la longue nuit n'arrivaient pour ainsi dire jamais. Le
 * calendrier existait, et une seule de ses dates comptait.
 *
 * Une seule occasion par an : le but est de remplir les années vides, pas de
 * noyer les autres.
 */
export function rollOccasion(ctx: Ctx): Occasion | null {
  const { state, rng } = ctx;
  const start = (state.year % 12) + 1;
  const turn = (month: number) => (month - start + 12) % 12;
  const pool = occasionsFor(state)
    .filter((o) => !seenThisYear(state, o))
    .sort((a, b) => turn(monthOf(state, a)) - turn(monthOf(state, b)));
  for (const occasion of pool) {
    if (rng.chance(RARITY_ODDS[occasion.rarity])) return occasion;
  }
  return null;
}

function seenThisYear(state: GameState, occasion: Occasion): boolean {
  return Number(state.player.flags[`occYear_${occasion.id}`] ?? 0) === state.year;
}

/**
 * Poser l'occasion comme une scène en attente.
 *
 * Elle emprunte l'écran des événements plutôt que d'en avoir un à elle : c'est
 * exactement ce que `registerSystemResolver` permet, et une occasion n'a rien
 * de plus à montrer qu'un événement ordinaire.
 */
export function offerOccasion(ctx: Ctx, occasion: Occasion): PendingEvent {
  const { state } = ctx;
  const choices = occasion.choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => canAfford(state, choice.cost))
    .map(({ choice, index }) => ({ label: choice.label, outcome: String(index) }));
  // Une occasion dont on ne peut rien payer se traverse quand même.
  if (choices.length === 0) choices.push({ label: 'La laisser passer', outcome: '-1' });

  const pending: PendingEvent = {
    id: ctx.id('occ'),
    eventId: `occasion_${occasion.id}`,
    title: occasion.label,
    text: occasion.text,
    choices,
    icon: occasion.emoji,
    payload: { system: 'occasion', occasionId: occasion.id },
  };
  state.pending.push(pending);
  state.player.flags[`occYear_${occasion.id}`] = state.year;
  return pending;
}

/* ------------------------------------------------------------------ */
/* La résoudre                                                         */
/* ------------------------------------------------------------------ */

/** Les proches présents, ceux que l'occasion rapproche ou non. */
function closeOnes(state: GameState): Person[] {
  const close = ['spouse', 'partner', 'son', 'daughter', 'father', 'mother',
    'brother', 'sister', 'friend', 'bestFriend'];
  return Object.values(state.npcs).filter((n) => n.alive && close.includes(n.relation));
}

registerSystemResolver('occasion', (ctx, pending, choiceIndex) => {
  const { state } = ctx;
  const occasionId = String(pending.payload?.occasionId ?? '');
  const occasion = getOccasion(occasionId);
  if (!occasion) return { text: '', tone: 'neutral' };

  const raw = pending.choices[choiceIndex]?.outcome ?? '-1';
  const index = Number(raw);
  const choice = index >= 0 ? occasion.choices[index] : null;
  if (!choice) {
    ctx.log('life', `${occasion.label} — tu laisses passer.`, 'neutral');
    return { text: 'L’année passe sans que tu t’en occupes.', tone: 'neutral' };
  }

  // Ce qu'on a déjà fait dix fois ne fait plus le même effet. On peut le
  // refaire — c'est peut-être ce qu'on veut — mais le jeu cesse de le
  // récompenser autant.
  const done = timesDone(state, occasion.id, index);
  const fade = freshness(done);
  state.player.flags[`occ_${occasion.id}_${index}`] = done + 1;

  const cost = costOf(state, choice.cost);
  if (cost > 0) state.player.money -= cost;

  if (choice.gives) {
    const scaled: Record<string, number> = {};
    for (const [key, value] of Object.entries(choice.gives)) {
      // Le mauvais ne s'émousse pas : seul le plaisir se répète mal.
      scaled[key] = value > 0 ? value * fade : value;
    }
    shiftStats(state, scaled);
  }

  if (choice.bond) {
    for (const npc of closeOnes(state)) {
      npc.relationship = clamp(npc.relationship + choice.bond * fade, 0, 100);
    }
  }

  if (choice.keepsake && getKeepsake(choice.keepsake)) {
    state.player.keepsakes ??= [];
    if (!state.player.keepsakes.includes(choice.keepsake)) {
      state.player.keepsakes.push(choice.keepsake);
      ctx.log('life', `Tu gardes ${getKeepsake(choice.keepsake)?.label.toLowerCase()}.`, 'good');
    }
  }

  const tone = (choice.gives?.happiness ?? 0) > 0 ? 'good'
    : (choice.gives?.happiness ?? 0) < 0 ? 'bad' : 'neutral';
  ctx.log('life', `${occasion.label} — ${choice.label.toLowerCase()}.`, tone);
  return {
    text: done >= 3
      ? `${choice.outcome} Tu fais ça tous les ans, maintenant.`
      : choice.outcome,
    tone,
  };
});

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année d'occasions.
 *
 * Une seule par an, et seulement si l'année en a besoin — c'est-à-dire si
 * elle n'a pas déjà produit de quoi la raconter. Le but est de supprimer les
 * années vides, pas d'ajouter du bruit aux années pleines.
 */
export function advanceOccasions(ctx: Ctx, entriesThisYear: number): void {
  const { state } = ctx;
  if (state.player.prison) return;
  // Une année déjà remplie n'a pas besoin qu'on l'occupe. Le seuil est bas :
  // deux lignes ne font pas une année dont on se souvient.
  if (entriesThisYear > 2) return;
  const occasion = rollOccasion(ctx);
  if (occasion) offerOccasion(ctx, occasion);
}
