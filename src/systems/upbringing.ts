/**
 * Élever un enfant, et ce que ça en fait.
 *
 * Le catalogue disait : « un enfant existe et grandit ; on ne fait rien avec
 * lui ». C'était vrai, et c'était le plus gros trou du jeu, parce que les
 * enfants y sont déjà partout — ils naissent, ils héritent, et ils peuvent
 * **reprendre la partie**. Rien de ce que faisait le joueur ne les
 * distinguait.
 *
 * Ce fichier referme la seule boucle complète du jeu : ce qu'on écrit ici
 * devient, à dix-huit ans, l'adulte que `systems/lineage.ts#continueAs`
 * reprendra. Élever un enfant, c'est fabriquer son prochain personnage.
 *
 * Trois règles, et elles sont toutes vérifiées par des mesures plutôt que par
 * des affirmations.
 *
 * **1. Le temps est la seule ressource.** Deux gestes par enfant et par an.
 * Avec trois enfants, on ne peut pas tout donner à tout le monde.
 *
 * **2. Il n'y a pas de bonne façon.** Cadrer construit et coûte le lien ;
 * laisser faire achète le lien et coûte la tenue. Les deux extrêmes sont
 * moins bons que la bande du milieu, et un joueur qui pousse à fond le paie.
 *
 * **3. Ça ne s'achète pas.** Payer compte, mais bien moins qu'être là. Un
 * enfant riche et seul finit moins bien qu'un enfant suivi et pauvre.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person, Upbringing } from '../engine/types.ts';
import {
  GROWN, GROWN_UP_WEIGHT, HAND_SLACK, PER_CHILD, REARINGS, attentionLabel,
  getRearing, handEffect, handLabel, markLabel,
} from '../data/upbringing.ts';
import { livingCostOf } from './ribbons.ts';
import { shiftStat } from './stats.ts';
import { noteHistory } from './npc.ts';

export {
  GROWN, PER_CHILD, REARINGS, attentionLabel, getRearing, handLabel, markLabel,
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Les enfants qu'on peut encore élever. */
export function childrenOf(state: GameState): Person[] {
  return Object.values(state.npcs)
    .filter((n) => n.alive && (n.relation === 'son' || n.relation === 'daughter'))
    .sort((a, b) => a.age - b.age);
}

/** Ceux dont l'enfance n'est pas finie. */
export function raisable(state: GameState): Person[] {
  return childrenOf(state).filter((c) => c.age < GROWN);
}

/** Le dossier d'un enfant, créé au besoin. Neutre : rien n'est acquis. */
export function upbringingOf(child: Person): Upbringing {
  child.upbringing ??= {
    attention: 0, schooling: 0, invested: 0, hand: 0,
    // Une moyenne de départ ordinaire : ce qu'il vaut sans que personne ne
    // s'en occupe. Tout ce qui s'en écarte est le fait du joueur.
    mark: 10, doneThisYear: 0, record: [], grownYear: null,
  };
  return child.upbringing;
}

/** Ce qu'il reste de gestes cette année, pour cet enfant. */
export function leftFor(child: Person): number {
  return Math.max(0, PER_CHILD - upbringingOf(child).doneThisYear);
}

/** L'attention reçue, rapportée à son âge : c'est ce qui compte, pas le total. */
export function attentionShare(child: Person): number {
  const record = upbringingOf(child);
  const years = Math.max(1, Math.min(child.age, GROWN));
  return clamp(record.attention / (years * 12), 0, 1);
}

export function rearingCost(state: GameState, id: string): number {
  const rearing = getRearing(id);
  if (!rearing) return 0;
  return Math.round(rearing.cost * livingCostOf(state));
}

/** Ce qu'on peut faire avec cet enfant, à son âge. */
export function availableRearings(child: Person) {
  return REARINGS.filter((r) => child.age >= r.from && child.age <= r.to);
}

export function rearBlocker(state: GameState, child: Person, id: string): string | null {
  const rearing = getRearing(id);
  if (!rearing) return 'Ça n’existe pas.';
  if (child.age >= GROWN) return `${child.firstName} est grand maintenant.`;
  if (!child.alive) return null;
  if (child.age < rearing.from) return `Il est trop tôt pour ça.`;
  if (child.age > rearing.to) return 'Il est trop tard pour ça.';
  if (leftFor(child) <= 0) return 'Tu as donné ce que tu avais cette année.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  const cost = rearingCost(state, id);
  if (state.player.money < cost) return `Il faut ${cost}.`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Faire                                                               */
/* ------------------------------------------------------------------ */

/**
 * Un geste, pour une année.
 *
 * Rien ici ne s'applique à l'adulte tout de suite : on accumule, et c'est
 * `advanceUpbringing` qui traduit chaque année, puis `settleChildhood` qui
 * clôt à dix-huit ans. C'est ce qui rend une éducation cumulative plutôt
 * qu'une suite de primes.
 */
export function rear(ctx: Ctx, childId: string, id: string): ActionResult {
  const { state } = ctx;
  const child = person(state, childId);
  if (!child) return { ok: false, message: 'Introuvable.' };
  const rearing = getRearing(id);
  if (!rearing) return { ok: false, message: 'Ça n’existe pas.' };
  const blocker = rearBlocker(state, child, id);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const record = upbringingOf(child);
  const cost = rearingCost(state, id);
  state.player.money -= cost;
  record.doneThisYear += 1;

  record.attention += rearing.gives.attention ?? 0;
  record.schooling += rearing.gives.schooling ?? 0;
  record.hand = clamp(record.hand + (rearing.gives.hand ?? 0), -100, 100);
  if (rearing.cost > 0) record.invested += rearing.cost;

  child.relationship = clampStat(child.relationship + (rearing.gives.bond ?? 0));
  child.opinion = clampStat(child.opinion + (rearing.gives.bond ?? 0) * 0.8);
  child.stats.happiness = clampStat(child.stats.happiness + (rearing.gives.happiness ?? 0));
  shiftStat(state, 'stress', rearing.strain);

  ctx.log('family', `${rearing.label} — ${child.firstName}.`, 'neutral');
  return {
    ok: true,
    title: rearing.label,
    tone: (rearing.gives.bond ?? 0) < 0 ? 'neutral' : 'good',
    message: `${rearing.note} ${handLabel(record.hand)}.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année d'enfance, pour chaque enfant.
 *
 * On traduit ce qui a été donné dans l'année en effets durables, puis on
 * remet le compteur de gestes à zéro. La main donnée agit **tous les ans**,
 * même sans geste : c'est une façon d'élever, pas une action ponctuelle.
 */
export function advanceUpbringing(ctx: Ctx): void {
  const { state, rng } = ctx;
  for (const child of childrenOf(state)) {
    const record = child.upbringing;
    if (!record) continue;

    if (child.age < GROWN) {
      /* 1. La main donnée, qu'on ait fait quelque chose ou non. */
      const hand = handEffect(record.hand);
      child.personality.discipline = clampStat(child.personality.discipline + hand.discipline);
      child.personality.temper = clampStat(child.personality.temper + hand.temper);
      child.relationship = clampStat(child.relationship + hand.bond);
      child.stats.criminality = clampStat(child.stats.criminality + hand.criminality);

      /* 2. Ce que l'année a construit. */
      const cared = record.doneThisYear > 0;
      if (cared) {
        // L'intelligence suit la scolarité suivie, avec des rendements
        // décroissants : on ne fabrique pas un génie à coups de devoirs.
        const room = 1 - child.stats.intelligence / 100;
        child.stats.intelligence = clampStat(
          child.stats.intelligence + record.doneThisYear * 0.9 * room,
        );
      } else {
        // Une année sans rien : le lien s'effrite doucement. Ce n'est pas une
        // punition, c'est ce que fait le temps quand on n'est pas là.
        child.relationship = clampStat(child.relationship - 1.4);
      }

      /* 1 bis. La main se relâche : un enfant dérive, et il faut retenir sa
       * position année après année. */
      record.hand = record.hand * (1 - HAND_SLACK);

      /* 2 bis. Son humeur revient vers le milieu.
       *
       * Sans ce rappel, le bonheur d'un enfant était un compte en banque :
       * dix-huit ans de gestes le saturaient à cent, et un enfant suivi
       * finissait exactement comme un enfant payé — la différence existait
       * dans les chiffres et ne se voyait nulle part. Ce qu'on veut mesurer
       * est l'attention *récente*, pas un cumul. */
      child.stats.happiness = clampStat(
        child.stats.happiness + (52 - child.stats.happiness) * 0.14,
      );

      /* 3. Sa moyenne. Elle suit ce qu'on suit, et ce qu'il vaut. */
      const target = clamp(
        7 + (record.schooling / Math.max(1, child.age)) * 0.35
        + (child.stats.intelligence - 50) / 12
        + child.personality.discipline / 30,
        2, 20,
      );
      record.mark = clamp(record.mark + (target - record.mark) * 0.35, 2, 20);

      record.doneThisYear = 0;
      if (child.age === GROWN - 1) settleChildhood(ctx, child);
      continue;
    }

    /* 4. Passé dix-huit ans, il n'y a plus rien à faire. */
    if (record.grownYear === null) settleChildhood(ctx, child);
    void rng;
  }
}

/**
 * Clore une enfance.
 *
 * Le moment où l'on voit ce qu'on a fait. Tout se joue ici, une seule fois, et
 * ce sont exactement les valeurs que `continueAs` reprendra si l'on continue
 * la partie avec lui.
 */
export function settleChildhood(ctx: Ctx, child: Person): void {
  const { state } = ctx;
  const record = upbringingOf(child);
  if (record.grownYear !== null) return;
  record.grownYear = state.year;

  const share = attentionShare(child);
  const schooled = clamp(record.schooling / (GROWN * 12), 0, 1);
  const paid = clamp(record.invested / (GROWN * 0.5), 0, 1);

  // Être là vaut plus que payer : c'est la seule affirmation forte du système,
  // et elle est mesurée par un test.
  child.stats.happiness = clampStat(
    child.stats.happiness + share * 100 * GROWN_UP_WEIGHT.attention * 0.3,
  );
  child.stats.intelligence = clampStat(
    child.stats.intelligence + schooled * 100 * GROWN_UP_WEIGHT.schooling * 0.3
    + paid * GROWN_UP_WEIGHT.money * 0.4,
  );
  child.personality.discipline = clampStat(
    child.personality.discipline + (record.mark - 10) * 1.2,
  );
  child.relationship = clampStat(child.relationship + share * 18 - 6);

  // Ce qu'il fera de sa vie découle de ce qu'on lui a donné, comme pour tout
  // le monde dans ce jeu : le niveau, puis le salaire.
  const level = Math.round(clamp(record.mark / 5 + paid * 1.4 + schooled * 1.2, 0, 5));
  child.salary = Math.round(child.salary * (0.75 + level * 0.14));

  const line = share >= 0.5
    ? `${child.firstName} a dix-huit ans. Tu as été là.`
    : share >= 0.2
      ? `${child.firstName} a dix-huit ans. Tu as été là par moments.`
      : `${child.firstName} a dix-huit ans. Tu n’as pas été là.`;
  record.record.push({ year: state.year, text: line });
  noteHistory(state, child, line);
  ctx.log('family', `${line} ${markLabel(record.mark)}.`, share >= 0.4 ? 'good' : 'neutral');
}

/* ------------------------------------------------------------------ */
/* Le bilan                                                            */
/* ------------------------------------------------------------------ */

/** Ce qu'on a donné à ses enfants, tous confondus, 0-1. */
export function raisedWell(state: GameState): number {
  const kids = childrenOf(state);
  if (kids.length === 0) return 0;
  return kids.reduce((sum, c) => sum + attentionShare(c), 0) / kids.length;
}

/** Une phrase sur ce qu'on aura été comme parent. */
export function parentLabel(state: GameState): string {
  const kids = childrenOf(state);
  if (kids.length === 0) return 'Tu n’as pas d’enfants.';
  const share = raisedWell(state);
  if (share >= 0.6) return `Tu as élevé ${kids.length === 1 ? 'ton enfant' : 'tes enfants'}.`;
  if (share >= 0.3) return 'Tu as fait ce que tu as pu.';
  if (share > 0.05) return 'Tu n’as pas été très présent.';
  return 'Tu les as laissés grandir sans toi.';
}

/** Pour l'écran : le nom complet, et où en est son enfance. */
export function childLine(child: Person): string {
  const record = upbringingOf(child);
  if (child.age >= GROWN) {
    return `${child.age} ans · ${attentionLabel(record.attention / 12, GROWN)}`;
  }
  return `${child.age} ans · ${markLabel(record.mark)} · ${handLabel(record.hand).toLowerCase()}`;
}

export { fullName };
