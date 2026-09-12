/**
 * Composer une scène avec quelqu'un de réel.
 *
 * **Ce que ce fichier règle.** Le catalogue portait deux aveux voisins : la
 * banque d'événements tient par son architecture mais pas par son volume, et
 * rien n'est composé à la volée. Mesuré sur quarante vies : cent soixante-neuf
 * événements écrits, quatre-vingt-un distincts par vie, **72,8 % de
 * recouvrement entre deux vies**. Une vie épuise la moitié du catalogue et
 * rejoue chaque scène deux fois.
 *
 * **On n'invente pas du texte : on lie une scène à une personne.** Une
 * situation composée prend un moment ordinaire — un service demandé, une
 * heure de retard, une soirée qui peut tourner — et le lie à un PNJ de la
 * partie. La variété ne vient pas d'un générateur de phrases mais du fait
 * qu'aucune partie n'a le même entourage.
 *
 * **Et l'issue ne se tire pas au dé.** Chaque situation met un trait à
 * l'épreuve — générosité, loyauté, caractère, chaleur, ambition — et c'est ce
 * que la personne vaut **vraiment** sur ce trait qui décide. Demander de
 * l'argent à un frère généreux et à un frère qui compte ne donne pas la même
 * scène.
 *
 * **Ce qu'on y gagne, c'est de le savoir.** `dates.ts` couvre les traits d'un
 * proche : on les découvre en sortant avec lui, délibérément et en payant.
 * Une situation composée est l'autre chemin — la vie s'en charge, sans qu'on
 * l'ait demandé. Résoudre la scène **apprend le trait**, définitivement, et
 * la fiche de la personne le porte ensuite.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { GameState, PendingEvent, Person } from '../engine/types.ts';
import {
  SITUATIONS, getSituation, type SituationDef, type SituationOutcome,
} from '../data/situations.ts';
import { COLD, TRAIT_HIGH, TRAIT_LOW, WARM } from '../data/dates.ts';
import { knows, learn } from './dates.ts';
import { interpolate, registerSystemResolver } from './randomEvents.ts';
import { localPrice } from './activities.ts';

/** Une scène composée par an au plus : elle complète les écrites, ne les remplace pas. */
export const COMPOSED_PER_YEAR = 1;

/**
 * Un même couple (scène, personne) ne se rejoue pas avant tout ce temps.
 *
 * Sans ce délai, la variété apparente s'effondrerait : la scène la mieux
 * pondérée reviendrait avec la même personne, ce qui est exactement le défaut
 * qu'on corrige.
 */
export const COMPOSED_COOLDOWN = 12;

/** Les gens avec qui une scène peut se jouer. */
function castFor(state: GameState, situation: SituationDef): Person[] {
  return Object.values(state.npcs).filter((person) => (
    person.alive
    && !person.petSpecies
    && !person.estranged
    && !person.incarcerated
    && situation.actors.includes(person.relation)
  ));
}

/** La clef de mémoire d'un couple scène-personne. */
function memoryKey(situation: SituationDef, person: Person): string {
  return `comp_${situation.id}_${person.id}`;
}

/** Cette scène s'est-elle déjà jouée avec cette personne, récemment ? */
export function playedRecently(state: GameState, situation: SituationDef, person: Person): boolean {
  const last = state.eventLog?.[memoryKey(situation, person)];
  return last !== undefined && state.year - last < COMPOSED_COOLDOWN;
}

/** Les couples scène-personne jouables cette année. */
export function castings(state: GameState): { situation: SituationDef; person: Person }[] {
  const p = state.player;
  const out: { situation: SituationDef; person: Person }[] = [];
  if (p.prison) return out;
  for (const situation of SITUATIONS) {
    if (situation.from !== undefined && p.age < situation.from) continue;
    if (situation.to !== undefined && p.age > situation.to) continue;
    for (const person of castFor(state, situation)) {
      if (playedRecently(state, situation, person)) continue;
      out.push({ situation, person });
    }
  }
  return out;
}

/**
 * Ce que l'autre vaut vraiment sur le trait en jeu.
 *
 * Franchement haut, franchement bas, et rien entre les deux : une scène dont
 * l'issue dépendrait d'un trait tiède ne dirait rien de la personne, et ce
 * qu'elle est censée apprendre au joueur serait faux.
 */
export function stands(person: Person, situation: SituationDef): 'high' | 'low' {
  return person.personality[situation.trait] >= (WARM + COLD) / 2 ? 'high' : 'low';
}

/**
 * Poser une scène composée.
 *
 * On préfère quelqu'un dont on ne connaît pas encore le trait : la scène a
 * alors quelque chose à apprendre, ce qui est tout son intérêt. Quelqu'un de
 * déjà lu reste possible — on ne cesse pas de vivre des choses avec ses
 * proches une fois qu'on les connaît — mais il pèse quatre fois moins.
 */
export function composeYear(ctx: Ctx): PendingEvent | null {
  const { state, rng } = ctx;
  const pool = castings(state);
  if (pool.length === 0) return null;

  const picked = rng.weighted(pool, ({ situation, person }) => (
    knows(person, situation.trait) ? 1 : 4
  ));
  const { situation, person } = picked;

  const choices = situation.choices.map((choice, index) => ({
    label: interpolate(state, choice.label, person),
    outcome: String(index),
  }));

  const pending: PendingEvent = {
    id: ctx.id('ev'),
    eventId: `comp_${situation.id}`,
    title: interpolate(state, situation.title, person),
    text: interpolate(state, situation.text, person),
    choices,
    personId: person.id,
    icon: situation.icon,
    payload: { system: 'composee', situation: situation.id },
  };
  state.pending.push(pending);
  state.eventLog ??= {};
  state.eventLog[memoryKey(situation, person)] = state.year;
  return pending;
}

/** Appliquer ce qu'une issue fait, au joueur et au lien. */
function applyOutcome(ctx: Ctx, outcome: SituationOutcome, person: Person): void {
  const p = ctx.state.player;
  if (outcome.happiness) p.stats.happiness = clampStat(p.stats.happiness + outcome.happiness);
  if (outcome.stress) p.stats.stress = clampStat(p.stats.stress + outcome.stress);
  if (outcome.money) p.money += localPrice(ctx.state, outcome.money);
  if (outcome.rel) {
    person.relationship = Math.max(0, Math.min(100, person.relationship + outcome.rel));
    person.opinion = Math.max(0, Math.min(100, person.opinion + Math.round(outcome.rel * 0.6)));
  }
}

/**
 * La résolution.
 *
 * Le format des événements reste ce qu'il est — de la donnée pure — et cette
 * scène-ci passe par `registerSystemResolver`, comme les occasions et le
 * harcèlement : elle a besoin de lire le caractère d'un PNJ, ce qu'un fichier
 * de données ne fait pas.
 */
registerSystemResolver('composee', (ctx, pending, choiceIndex) => {
  const { state } = ctx;
  const situation = getSituation(String(pending.payload?.situation ?? ''));
  const person = pending.personId ? state.npcs[pending.personId] : undefined;
  if (!situation || !person) return { text: '', tone: 'neutral' };

  const raw = pending.choices[choiceIndex]?.outcome ?? '-1';
  const index = Number(raw);
  const choice = index >= 0 ? situation.choices[index] : undefined;
  if (!choice) {
    ctx.log(situation.kind, `${pending.title} : tu laisses passer.`, 'neutral');
    return { text: 'Tu laisses passer sans rien décider.', tone: 'neutral' };
  }

  const way = stands(person, situation);
  const outcome = way === 'high' ? choice.high : choice.low;
  applyOutcome(ctx, outcome, person);

  /*
   * **Et l'on apprend.** C'est la contrepartie de la scène : on ne choisit pas
   * de la vivre, mais on en ressort en sachant quelque chose de quelqu'un. La
   * phrase n'est ajoutée que la première fois — répéter « tu sais maintenant »
   * à propos de ce qu'on savait déjà serait faux.
   */
  const discovered = learn(person, situation.trait);
  const word = person.personality[situation.trait] >= WARM
    ? TRAIT_HIGH[situation.trait]
    : person.personality[situation.trait] <= COLD
      ? TRAIT_LOW[situation.trait]
      : null;
  const text = interpolate(state, outcome.text, person)
    + (discovered && word ? ` Tu sais maintenant que ${person.firstName} est ${word}.` : '');

  ctx.log(situation.kind, `${pending.title} — ${interpolate(state, outcome.text, person)}`, outcome.tone);
  return { text, tone: outcome.tone };
});
