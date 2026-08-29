/**
 * La gamme.
 *
 * **Ce qui existait.** `venture.ts#forecast` calcule une demande à partir de
 * deux cadrans posés sur la maison — la notoriété et la qualité — et un
 * multiplicateur de prix. Une boulangerie et un éditeur de logiciel s'y
 * distinguent par quatre nombres du catalogue et par rien d'autre. Le joueur
 * n'a jamais su ce que sa maison vendait, et surtout : **il n'a jamais eu à
 * décider quoi faire ensuite.** Le catalogue le disait, feuille
 * `Entreprise/Produit`, impact 3 : « l'entreprise vend du chiffre : aucun
 * produit nommé, aucun lancement ».
 *
 * **Ce que ce fichier ajoute, et il n'en remplace rien.** Une maison sans
 * gamme se comporte exactement comme avant — même formule, mêmes nombres. Ce
 * qui change n'arrive qu'à celle qui met quelque chose au point.
 *
 * Trois choses en font une décision plutôt qu'un bouton :
 *
 * **1. Une chose a une vie, et elle est finie.** Elle monte, tient, puis
 * retombe — et la vitesse des trois est ce qui distingue les quatre formes. Un
 * coup de mode prend tout de suite et est mort en trois ans ; une signature ne
 * rapporte rien pendant quatre ans puis devient la raison pour laquelle on
 * vient. Il n'y a donc pas de « meilleure » forme, il y a ce qu'on compte
 * faire ensuite.
 *
 * **2. Lancer coûte une année de capacité.** On met au point avec les mêmes
 * bras qui produisent. C'est ce qui empêche le système d'être « paie, gagne » :
 * l'année où l'on prépare la suite, la maison sert moins de monde, et c'est
 * exactement l'année où l'ancienne chose rapporte encore. Décider *quand* est
 * plus difficile que décider *quoi*.
 *
 * **3. Une gamme n'est pas une collection.** Au-delà de deux, chaque chose de
 * plus retire de la qualité tous les ans. On ne peut pas empiler les attraits
 * en payant.
 *
 * Ce que l'équipe devient au passage : `crew.ts` ne décidait que de la
 * capacité et d'un peu de qualité annuelle. La qualité d'une chose **au
 * lancement** dépend maintenant de ce que valent les gens, et d'autant plus que
 * la forme est exigeante. Une équipe médiocre tient un fond de gamme ; elle ne
 * sort pas une signature.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, Business, GameState, Offer } from '../engine/types.ts';
import {
  BASE_QUALITY, DEV_DRAG, HOUSE_SHARE, Q_FLOOR, Q_SPAN, SHAPES, SHORT_HANDED,
  SPENT, SPREAD, SPREAD_TOLL, STALE, getShape, namesFor,
} from '../data/offer.ts';
import { getBusinessKind } from '../data/ventures.ts';
import { crewSkill } from './crew.ts';
import { getCountry } from '../data/countries.ts';

export { SHAPES, SPREAD };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Ce que la maison vend, ou rien du tout. */
export function lineOf(business: Business | null | undefined): Offer[] {
  return business?.line ?? [];
}

/**
 * Où en est une chose de sa vie, entre 0 et 1.
 *
 * Trois temps, et c'est toute la mécanique : la montée, le plateau, la chute.
 * Rien n'est tiré — le joueur doit pouvoir lire sur l'écran que sa signature
 * atteindra son sommet dans deux ans, sinon il ne peut pas décider quand
 * lancer la suivante.
 */
export function phase(offer: Offer): number {
  const shape = getShape(offer.shapeId);
  if (!shape) return 0;
  if (offer.age < shape.climb) return (offer.age + 1) / (shape.climb + 1);
  const past = offer.age - shape.climb - shape.hold;
  if (past < 0) return 1;
  return Math.max(0, 1 - past / shape.fall);
}

/** Ce qu'une chose ajoute à la demande de la maison. */
export function appeal(offer: Offer): number {
  const shape = getShape(offer.shapeId);
  if (!shape) return 0;
  return shape.ceiling * (Q_FLOOR + (offer.quality / 100) * Q_SPAN) * phase(offer);
}

/** Ce que la gamme entière tire, additionné. */
export function lift(business: Business | null | undefined): number {
  return lineOf(business).reduce((sum, offer) => sum + appeal(offer), 0);
}

/** Où en est une chose, dit en français. */
export function standing(offer: Offer): string {
  const shape = getShape(offer.shapeId);
  if (!shape) return '';
  if (offer.age < shape.climb) {
    const left = shape.climb - offer.age;
    return `Monte encore — sommet dans ${left} an${left > 1 ? 's' : ''}.`;
  }
  const past = offer.age - shape.climb - shape.hold;
  if (past < 0) {
    const left = -past;
    return `Au sommet — encore ${left} an${left > 1 ? 's' : ''} avant de retomber.`;
  }
  if (phase(offer) <= SPENT) return 'Fini. Cela n’intéresse plus personne.';
  return 'S’essouffle.';
}

/** Ce qu'une mise au point coûterait. */
export function devCost(state: GameState, shapeId: string): number {
  const b = state.player.business;
  const kind = b ? getBusinessKind(b.kindId) : undefined;
  const shape = getShape(shapeId);
  if (!b || !kind || !shape) return 0;
  /*
   * Le même barème que `venture.ts#priceIndex`, recopié plutôt qu'importé : le
   * calcul tient en une ligne, et l'importer ferait de `venture` et `offer` un
   * cycle. Le cycle marcherait — les deux appels sont différés — mais il rend
   * l'ordre d'initialisation dépendant de qui charge qui, ce qui est
   * exactement le genre de chose qui casse six mois plus tard.
   *
   * Sans le terme d'opportunités locales de `startupCost` : ce qu'on met au
   * point coûte le prix du pays et de l'année, pas celui du quartier.
   */
  const index = getCountry(state.player.countryId).salaryIndex * state.world.inflation;
  return Math.round(kind.capital * shape.cost * index);
}

/**
 * Ce que sortirait une chose de cette forme, aujourd'hui, en qualité.
 *
 * Rendu à l'écran avant de payer : le joueur doit voir qu'avec l'équipe qu'il a,
 * une signature sortirait à 41 — sans quoi il paie sans savoir, et le choix de
 * la forme n'en est plus un.
 */
export function wouldBe(state: GameState, shapeId: string): number {
  const b = state.player.business;
  const shape = getShape(shapeId);
  if (!b || !shape) return 0;
  const named = crewSkill(b);
  // Sans personne de nommé, on s'en remet à la maison seule : une entreprise
  // d'avant `crew.ts` n'est pas punie pour n'avoir personne à montrer.
  const skill = named ?? b.quality;
  // Et il faut des bras, pas seulement de bons bras : ce qui manque se paie.
  const short = Math.max(0, shape.hands - b.staff);
  return Math.round(clamp(
    BASE_QUALITY
    + (b.quality - 50) * HOUSE_SHARE
    + (skill - 50) * shape.needs
    - short * SHORT_HANDED,
    5, 100,
  ));
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

export function launchBlocker(state: GameState, shapeId: string): string | null {
  const b = state.player.business;
  if (!b) return 'Il n’y a pas de maison.';
  if (!getShape(shapeId)) return 'Cela ne se fait pas.';
  if (b.developedYear === state.year) return 'Une chose par an : les bras ne suivent pas.';
  const cost = devCost(state, shapeId);
  if (b.cash + Math.max(0, state.player.money) < cost) return 'Ni la caisse ni toi n’avez de quoi.';
  return null;
}

/**
 * Mettre quelque chose au point.
 *
 * La maison paie d'abord sur sa caisse, et le patron complète — c'est ce que
 * fait déjà `investInBusiness`, et le joueur n'a pas à comprendre deux règles
 * différentes selon l'écran.
 */
export function launch(ctx: Ctx, shapeId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const b = p.business;
  const why = launchBlocker(state, shapeId);
  if (why || !b) return { ok: false, message: why ?? 'Il n’y a pas de maison.' };
  const shape = getShape(shapeId)!;

  const cost = devCost(state, shapeId);
  const fromCash = Math.min(Math.max(0, b.cash), cost);
  b.cash -= fromCash;
  p.money -= cost - fromCash;

  const line = lineOf(b);
  const used = new Set(line.map((o) => o.name));
  const pool = namesFor(b.kindId).filter((n) => !used.has(n));
  const name = pool[0] ?? `${namesFor(b.kindId)[0]} (${line.length + 1})`;

  const offer: Offer = {
    id: ctx.id('offer'),
    name,
    shapeId,
    since: state.year,
    age: 0,
    quality: wouldBe(state, shapeId),
  };
  b.line = [...line, offer];
  b.developedYear = state.year;

  ctx.log(
    'work',
    `${b.name} met ${name} au point. ${shape.line}`,
    'neutral',
  );
  return {
    ok: true,
    title: name,
    message: `${shape.line} Qualité de départ : ${offer.quality}. L’année sera plus courte : les bras qui mettent au point ne servent personne.`,
  };
}

/**
 * Retirer quelque chose de la gamme.
 *
 * Ce n'est pas seulement du ménage : une chose finie ne rapporte plus rien et
 * compte quand même dans l'éparpillement. La retirer rend de la qualité — et
 * retirer trop tôt jette ce qui montait encore.
 */
export function retire(ctx: Ctx, offerId: string): ActionResult {
  const { state } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Il n’y a pas de maison.' };
  const offer = lineOf(b).find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Ce n’est pas à la carte.' };
  b.line = lineOf(b).filter((o) => o.id !== offerId);
  /*
   * « Marchait encore » se lit sur la courbe et non sur un seuil d'attrait :
   * une chose qui n'a pas passé son sommet valait encore quelque chose, quelle
   * que soit sa qualité. Une première version comparait l'attrait à 0,25, un
   * nombre qui ne voulait plus rien dire dès que l'échelle de la qualité a
   * changé — et qui annonçait « ne faisait plus venir personne » d'un fond de
   * gamme en plein plateau.
   */
  const shape = getShape(offer.shapeId);
  const rising = Boolean(shape) && offer.age < shape!.climb + shape!.hold;
  ctx.log('work', `${b.name} retire ${offer.name}.`, rising ? 'bad' : 'neutral');
  return {
    ok: true,
    message: rising
      ? `${offer.name} marchait encore. Tu viens de t’en priver.`
      : `${offer.name} ne faisait plus venir personne.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que la gamme devient d'une année sur l'autre.
 *
 * Appelée depuis `venture.ts#advanceBusiness`, après le calcul de l'exercice :
 * ce qui a été vendu cette année l'a été avec la gamme telle qu'elle était au
 * premier janvier.
 */
export function advanceLine(business: Business): void {
  const line = lineOf(business);
  if (line.length === 0) return;
  for (const offer of line) {
    offer.age += 1;
    offer.quality = clampStat(offer.quality - STALE);
  }
  // L'éparpillement : au-delà de deux choses, la maison se disperse et cela se
  // voit sur ce qui sort. C'est ce qui empêche d'empiler les attraits.
  const extra = Math.max(0, line.length - SPREAD);
  if (extra > 0) {
    business.quality = clampStat(business.quality - extra * SPREAD_TOLL);
  }
}

/** Une chose est-elle finie ? Rendu à l'écran, et lu par le retrait. */
export function spent(offer: Offer): boolean {
  return appeal(offer) <= SPENT;
}

/** Ce que l'année de mise au point retire à la capacité. */
export function devDrag(state: GameState): number {
  const b = state.player.business;
  return b && b.developedYear === state.year ? 1 - DEV_DRAG : 1;
}

/* ------------------------------------------------------------------ */
/* Ce qui se lit sur la ligne d'accueil                                */
/* ------------------------------------------------------------------ */

export function summary(state: GameState): string {
  const b = state.player.business;
  const line = lineOf(b);
  if (line.length === 0) return 'Rien de nommé : la maison vend « du chiffre »';
  const best = [...line].sort((a, c) => appeal(c) - appeal(a))[0];
  const dying = line.filter((o) => spent(o)).length;
  return `${line.length} au catalogue · ${best.name} porte la maison${dying > 0 ? ` · ${dying} fini${dying > 1 ? 's' : ''}` : ''}`;
}
