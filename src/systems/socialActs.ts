/**
 * Ce qu'on fait avec quelqu'un, au-delà de lui parler.
 *
 * Mesuré avant d'écrire une ligne, sur le vrai moteur :
 *
 *     la mère à  6 ans : 8 actions jouables
 *     la mère à 16 ans : 10
 *     la mère à 35 ans : 8 — dont 8 déjà là à six ans
 *     le moteur en connaît 10 en tout pour une mère, toute sa vie
 *     recouvrement moyen entre deux vies entières : 75 %
 *
 * Le registre contextuel existait déjà (`actions.ts`) et il est bon : il tient
 * l'école, le travail, la prison, et chaque ligne bloquée dit pourquoi. Ce qui
 * manquait n'était pas le moteur, c'était **la famille adulte** : discuter,
 * complimenter, demander conseil, donner de l'argent, se disputer — les mêmes
 * huit gestes à six ans et à trente-cinq.
 *
 * Ce fichier ajoute ce qu'une vie d'adulte fait réellement avec ses proches,
 * et suit une règle stricte : **rien qui n'existe déjà ailleurs**. Une action
 * n'entre ici que si elle change un état que le reste du jeu lit.
 *
 * Trois d'entre elles créent des choix futurs, ce qui est le vrai sujet :
 * prêter de l'argent crée une dette dont on peut réclamer le remboursement ;
 * rendre service crée une faveur qu'on peut appeler ; promettre crée une
 * échéance que le moteur vérifie tout seul à la fin de l'année.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, peopleByRelation, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  APPROACHES, COOL, KEEN, READS_BADLY, READS_WELL, getApproach, type Approach,
} from '../data/approaches.ts';
import { formatMoney, getCountry } from '../data/countries.ts';
import { learn } from './dates.ts';
import { ailing, faraway } from './lives.ts';
import { noteHistory } from './npc.ts';
import { wrong } from './grudges.ts';

export { APPROACHES, getApproach };
export type { Approach };

/* ------------------------------------------------------------------ */
/* La manière                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce que la manière fait aux chances, devant cette personne-là.
 *
 * C'est le cœur du système : une même approche ne vaut pas la même chose
 * selon à qui l'on parle. Insister marche sur quelqu'un que rien n'énerve et
 * ruine tout chez un colérique — et l'on ne sait lequel on a en face que si
 * l'on a pris la peine de le découvrir (`systems/dates.ts`).
 */
export function approachOdds(target: Person, approach: Approach): number {
  const trait = target.personality[approach.reads];
  const fit = trait >= KEEN ? READS_WELL : trait <= COOL ? READS_BADLY : 1;
  return approach.odds * fit;
}

/** Ce que la manière laisse sur le lien, quoi qu'il arrive. */
export function approachToll(target: Person, approach: Approach): number {
  // Un caractère facile encaisse mieux une manière brutale.
  const soft = target.personality.temper <= COOL ? 0.6 : target.personality.temper >= KEEN ? 1.4 : 1;
  return approach.bond >= 0 ? approach.bond : approach.bond * soft;
}

/** Applique la manière : le lien bouge avant même de savoir si ça a marché. */
function payTheTone(target: Person, approach: Approach): void {
  const toll = approachToll(target, approach);
  target.relationship = clampStat(target.relationship + toll);
  target.opinion = clampStat(target.opinion + toll * 0.7);
}

function pick(choiceId: string | undefined, fallback: string): Approach {
  return getApproach(choiceId ?? fallback) ?? getApproach(fallback)!;
}

/* ------------------------------------------------------------------ */
/* Se voir                                                             */
/* ------------------------------------------------------------------ */

/** Ce qu'un repas coûte ici. */
export function mealCost(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return Math.round(60 * country.costIndex * state.world.inflation);
}

/**
 * Inviter quelqu'un à manger.
 *
 * Le seul geste qui rattrape la distance : quelqu'un parti vivre ailleurs
 * perd du lien chaque année (`lives.ts`), et rien ne le contrait à part
 * aller le voir. Compte double dans ce cas.
 */
export function invite(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const cost = mealCost(state);
  if (p.money < cost) return { ok: false, title: 'Inviter', message: `Il te faudrait ${formatMoney(cost, p.countryId)}.` };

  p.money -= cost;
  const far = faraway(target);
  const gain = far ? 11 : 7;
  target.relationship = clampStat(target.relationship + gain);
  target.opinion = clampStat(target.opinion + gain * 0.6);
  target.lastInteractionYear = state.year;
  p.stats.stress = clampStat(p.stats.stress - 5);
  p.stats.happiness = clampStat(p.stats.happiness + 4);

  noteHistory(state, target, `Repas avec ${p.firstName}.`);
  ctx.log('family', `Tu as invité ${fullName(target)} à manger.`, 'good');
  return {
    ok: true, title: 'À table', tone: 'good',
    message: far
      ? `${target.firstName} a fait la route. Ça compte double quand on ne se voit plus.`
      : `Deux heures, sans rien de particulier. C’est souvent comme ça que ça tient.`,
  };
}

/**
 * Se confier.
 *
 * On y apprend qui est l'autre — au sens propre : le trait mis à l'épreuve
 * devient connu. Quelqu'un de chaleureux s'approche ; quelqu'un de distant
 * change de sujet.
 */
export function confide(ctx: Ctx, personId: string, approachId?: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const approach = pick(approachId, 'honnete');

  learn(target, approach.reads);
  const warm = target.personality.warmth >= KEEN;
  const heard = warm || approachOdds(target, approach) >= 1;

  target.relationship = clampStat(target.relationship + (heard ? 6 : -2));
  target.opinion = clampStat(target.opinion + (heard ? 5 : -3));
  target.lastInteractionYear = state.year;
  p.stats.stress = clampStat(p.stats.stress - (heard ? 9 : 2));

  ctx.log('family', `Tu t’es confié à ${fullName(target)}.`, heard ? 'good' : 'neutral');
  return {
    ok: true, title: heard ? 'Écouté' : 'Poliment',
    tone: heard ? 'good' : 'neutral',
    message: heard
      ? `${target.firstName} écoute jusqu’au bout. Tu en sors plus léger.`
      : `${target.firstName} hoche la tête et parle d’autre chose. Tu ranges ça.`,
  };
}

/**
 * Présenter la personne avec qui l'on est.
 *
 * Une fois par couple et par proche : c'est un moment, pas une action
 * répétable. Ce qu'il en sort tient au caractère de celui qu'on présente à —
 * et il reste, puisque le lien du couple en dépend ensuite.
 */
export function introduce(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  const partner = Object.values(state.npcs).find(
    (x) => x.alive && (x.relation === 'partner' || x.relation === 'spouse'),
  );
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  if (!partner) return { ok: false, title: 'Présenter', message: 'Tu n’as personne à présenter.' };
  if (target.flags[`met:${partner.id}`] === true) {
    return { ok: false, title: 'Présenter', message: `${target.firstName} le connaît déjà.` };
  }

  target.flags[`met:${partner.id}`] = true;
  // Ce qui décide : ce que le proche vaut en chaleur, et ce que vaut celui
  // qu'on présente. Deux caractères durs se détestent.
  const warmth = (target.personality.warmth + partner.personality.warmth) / 2;
  const good = warmth >= KEEN || (warmth > COOL && partner.stats.looks >= 55);

  target.opinion = clampStat(target.opinion + (good ? 5 : -6));
  partner.relationship = clampStat(partner.relationship + (good ? 7 : -5));
  partner.flags.metFamily = true;
  p.stats.stress = clampStat(p.stats.stress + (good ? -3 : 6));

  noteHistory(state, target, `A rencontré ${partner.firstName}.`);
  ctx.log('love', `Tu as présenté ${partner.firstName} à ${fullName(target)}.`, good ? 'good' : 'bad');
  return {
    ok: true, title: good ? 'Ça s’est bien passé' : 'Ça s’est mal passé',
    tone: good ? 'good' : 'bad',
    message: good
      ? `${target.firstName} et ${partner.firstName} se sont trouvés. Ça compte plus qu’on ne croit.`
      : `Le repas a été long. ${target.firstName} n’a rien dit, et ${partner.firstName} l’a bien senti.`,
  };
}

/**
 * Accompagner quelqu'un de malade.
 *
 * `lives.ts` fait tomber les proches malades et rien ne permettait d'y faire
 * quoi que ce soit : on regardait le drapeau. Ici, on y va — ça coûte, ça
 * améliore réellement ses chances, et ça se retient.
 */
export function careFor(ctx: Ctx, personId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  if (!ailing(target)) return { ok: false, title: 'L’accompagner', message: `${target.firstName} n’en a pas besoin.` };
  const country = getCountry(p.countryId);
  const cost = Math.round(900 * country.costIndex * state.world.inflation * (1 - country.healthcare * 0.7));
  if (p.money < cost) return { ok: false, title: 'L’accompagner', message: `Il te faudrait ${formatMoney(cost, p.countryId)}.` };

  p.money -= cost;
  target.relationship = clampStat(target.relationship + 14);
  target.opinion = clampStat(target.opinion + 12);
  target.lastInteractionYear = state.year;
  p.stats.stress = clampStat(p.stats.stress + 7);

  // Ce qui compte vraiment : la maladie peut céder.
  const better = rng.chance(0.45);
  if (better) {
    delete target.flags.illness;
    noteHistory(state, target, `Soigné, avec ${p.firstName} à côté.`);
  }
  ctx.log('family', `Tu as accompagné ${fullName(target)}.`, better ? 'good' : 'neutral');
  return {
    ok: true, title: better ? 'Ça va mieux' : 'Tu étais là',
    tone: better ? 'good' : 'neutral',
    message: better
      ? `Les examens sont bons. ${target.firstName} s’en sort, et sait qui était là.`
      : `Rien n’est réglé. Mais tu y étais, et ça, ça ne s’oublie pas.`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qui crée des choix plus tard                                     */
/* ------------------------------------------------------------------ */

/** Ce que cette personne te doit. */
export function owed(target: Person): number {
  return Math.max(0, Number(target.flags.owes ?? 0));
}

/** Te doit-elle un service ? */
export function owesFavour(target: Person): boolean {
  return target.flags.favour === true;
}

/** Lui as-tu promis quelque chose cette année ? */
export function promised(state: GameState, target: Person): boolean {
  return Number(target.flags.promised ?? -99) >= state.year;
}

/**
 * Prêter de l'argent.
 *
 * Ce n'est pas donner : le moteur s'en souvient, et la dette ouvre une action
 * qui n'existait pas avant. C'est le principe de tout ce fichier — une
 * décision doit pouvoir en créer d'autres.
 */
export function lend(ctx: Ctx, personId: string, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const sum = Math.round(amount);
  if (sum <= 0 || sum > p.money) return { ok: false, title: 'Prêter', message: 'Montant impossible.' };

  p.money -= sum;
  target.wealth += sum;
  target.flags.owes = owed(target) + sum;
  target.flags.owesSince = state.year;
  target.relationship = clampStat(target.relationship + 5);
  target.opinion = clampStat(target.opinion + 4);

  noteHistory(state, target, `A emprunté ${sum} à ${p.firstName}.`);
  ctx.log('money', `Tu as prêté ${formatMoney(sum, p.countryId)} à ${fullName(target)}.`, 'neutral');
  return {
    ok: true, title: 'Prêté', tone: 'neutral',
    message: `${target.firstName} te doit ${formatMoney(owed(target), p.countryId)}. `
      + `Reste à savoir si tu le reverras.`,
  };
}

/**
 * Réclamer ce qu'on t'a prêté.
 *
 * Ce qui décide : sa loyauté, ce qu'il a, et la manière. Réclamer durement
 * marche mieux et laisse un ennemi ; laisser courir ne rapporte rien et se
 * retient aussi.
 */
export function reclaim(ctx: Ctx, personId: string, approachId?: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const due = owed(target);
  if (due <= 0) return { ok: false, title: 'Réclamer', message: `${target.firstName} ne te doit rien.` };

  const approach = pick(approachId, 'calme');
  payTheTone(target, approach);

  const able = clamp(target.wealth / Math.max(1, due), 0, 1);
  const willing = target.personality.loyalty / 100;
  const odds = clamp(0.25 + able * 0.35 + willing * 0.3, 0.05, 0.95) * approachOdds(target, approach);

  if (rng.chance(clamp(odds, 0.03, 0.97))) {
    const paid = Math.min(due, Math.max(0, target.wealth));
    p.money += paid;
    target.wealth -= paid;
    target.flags.owes = due - paid;
    if (due - paid <= 0) delete target.flags.owes;
    ctx.log('money', `${fullName(target)} t’a remboursé ${formatMoney(paid, p.countryId)}.`, 'good');
    return {
      ok: true, title: 'Remboursé', tone: 'good',
      message: paid >= due
        ? `${target.firstName} solde tout : ${formatMoney(paid, p.countryId)}.`
        : `${target.firstName} rend ce qu’il peut : ${formatMoney(paid, p.countryId)}. Il reste ${formatMoney(due - paid, p.countryId)}.`,
    };
  }

  // Un refus laisse quelque chose, et pas seulement une somme.
  if (approach.bond <= -7) wrong(ctx, target, 'dispute');
  return {
    ok: true, title: 'Pas maintenant', tone: 'bad',
    message: `${target.firstName} promet, décale, s’excuse. Tu repars sans rien.`,
  };
}

/**
 * Rendre service.
 *
 * Coûte une part de l'année et crée une faveur : quelque chose qu'on pourra
 * appeler plus tard, et que l'argent n'achète pas.
 */
export function doFavour(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  if (owesFavour(target)) return { ok: false, title: 'Rendre service', message: `${target.firstName} te doit déjà quelque chose.` };

  target.flags.favour = true;
  target.relationship = clampStat(target.relationship + 8);
  target.opinion = clampStat(target.opinion + 9);
  target.lastInteractionYear = state.year;
  p.stats.stress = clampStat(p.stats.stress + 6);

  noteHistory(state, target, `${p.firstName} lui a rendu service.`);
  ctx.log('family', `Tu as rendu service à ${fullName(target)}.`, 'good');
  return {
    ok: true, title: 'Rendu', tone: 'good',
    message: `Ça t’a pris du temps. ${target.firstName} s’en souviendra — c’est le genre de chose qui se rend.`,
  };
}

/**
 * Appeler une faveur.
 *
 * Ce qu'on obtient dépend de ce que la personne est capable de donner : de
 * l'argent si elle en a, un mot si elle a du poids, du réconfort sinon.
 */
export function callFavour(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  if (!owesFavour(target)) return { ok: false, title: 'Demander', message: `${target.firstName} ne te doit rien de particulier.` };

  delete target.flags.favour;
  target.relationship = clampStat(target.relationship - 3);

  const country = getCountry(p.countryId);
  if (target.wealth > 20_000 * country.salaryIndex) {
    const given = Math.round(Math.min(target.wealth * 0.12, 18_000 * country.salaryIndex));
    p.money += given;
    target.wealth -= given;
    ctx.log('money', `${fullName(target)} t’a dépanné : ${formatMoney(given, p.countryId)}.`, 'good');
    return { ok: true, title: 'Rendu', tone: 'good', message: `${target.firstName} te dépanne de ${formatMoney(given, p.countryId)}, sans poser de question.` };
  }
  if (target.jobTitle && target.wealth > 5_000 * country.salaryIndex) {
    p.stats.reputation = clampStat(p.stats.reputation + 6);
    return { ok: true, title: 'Un mot bien placé', tone: 'good', message: `${target.firstName} a parlé de toi à quelqu’un. On ne sait jamais ce que ça donne.` };
  }
  p.stats.stress = clampStat(p.stats.stress - 12);
  p.stats.happiness = clampStat(p.stats.happiness + 6);
  return { ok: true, title: 'Il est venu', tone: 'good', message: `${target.firstName} est venu, a écouté, est resté. Ça vaut ce que ça vaut, et ça vaut beaucoup.` };
}

/**
 * Promettre quelque chose.
 *
 * Le moteur vérifie tout seul à la fin de l'année : si l'on n'a rien fait
 * avec la personne entre-temps, la promesse tombe et le lien se paie. C'est
 * la seule chose du jeu qui punit d'avoir dit oui trop vite.
 */
export function promise(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  if (promised(state, target)) return { ok: false, title: 'Promettre', message: 'Tu lui as déjà promis quelque chose.' };

  target.flags.promised = state.year;
  target.flags.promisedAt = target.relationship;
  target.relationship = clampStat(target.relationship + 4);
  ctx.log('family', `Tu as promis quelque chose à ${fullName(target)}.`, 'neutral');
  return {
    ok: true, title: 'Promis', tone: 'neutral',
    message: `${target.firstName} compte sur toi. Il faudra passer du temps avec ${target.sex === 'F' ? 'elle' : 'lui'} avant la fin de l’année.`,
  };
}

/**
 * Ce que les promesses deviennent.
 *
 * Appelé par le déroulé de l'année. Une promesse tenue — c'est-à-dire suivie
 * d'un vrai moment ensemble — laisse davantage qu'elle n'a coûté ; une
 * promesse oubliée coûte le double de ce qu'elle avait rapporté.
 */
export function advancePromises(ctx: Ctx): void {
  const { state } = ctx;
  for (const npc of Object.values(state.npcs)) {
    // Sans ce premier test, l'absence de promesse valait `-99`, donc « une
    // promesse largement échue et tenue » : chaque PNJ du jeu gagnait six
    // points de lien par an, pour rien. Quatre fichiers de tests l'ont dit.
    if (npc.flags.promised === undefined) continue;
    const year = Number(npc.flags.promised);
    if (year > state.year - 1) continue;
    delete npc.flags.promised;
    delete npc.flags.promisedAt;
    if (!npc.alive) continue;
    const kept = npc.lastInteractionYear >= year;
    if (kept) {
      npc.relationship = clampStat(npc.relationship + 6);
      npc.opinion = clampStat(npc.opinion + 5);
    } else {
      npc.relationship = clampStat(npc.relationship - 12);
      npc.opinion = clampStat(npc.opinion - 10);
      ctx.log('family', `Tu n’as pas tenu ce que tu avais promis à ${fullName(npc)}.`, 'bad');
    }
  }
}

/* ------------------------------------------------------------------ */
/* La suite de la vie                                                  */
/* ------------------------------------------------------------------ */

/** Les enfants qu'on peut confier à quelqu'un. */
export function entrustable(state: GameState): Person[] {
  return peopleByRelation(state, ['son', 'daughter']).filter((c) => c.alive && c.age < 12);
}

/**
 * Confier un enfant à quelqu'un.
 *
 * Ce que ça change vraiment : une année de moins de charge pour le joueur, et
 * un lien qui se crée entre l'enfant et celui qui l'a gardé — lequel comptera
 * quand l'enfant grandira.
 */
export function entrust(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const kids = entrustable(state);
  if (kids.length === 0) return { ok: false, title: 'Confier', message: 'Tu n’as pas d’enfant en âge d’être gardé.' };

  const child = kids[0];
  target.relationship = clampStat(target.relationship + 5);
  child.relationship = clampStat(child.relationship + 4);
  child.flags[`raisedBy:${target.id}`] = true;
  p.stats.stress = clampStat(p.stats.stress - 10);
  p.stats.happiness = clampStat(p.stats.happiness + 3);

  noteHistory(state, target, `A gardé ${child.firstName}.`);
  ctx.log('family', `${fullName(target)} a gardé ${child.firstName}.`, 'good');
  return {
    ok: true, title: 'Confié', tone: 'good',
    message: `${child.firstName} a passé du temps chez ${target.firstName}. Ça vous soulage tous les deux, et ça les rapproche.`,
  };
}

/**
 * Parler de ce qui restera.
 *
 * Une conversation que les vraies familles ont et que le jeu n'avait pas. On
 * y apprend ce que la personne possède réellement — information que rien
 * d'autre ne donne — et mal s'y prendre se paie.
 */
export function willTalk(ctx: Ctx, personId: string, approachId?: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne.' };
  const approach = pick(approachId, 'prudent');
  payTheTone(target, approach);

  target.flags.willKnown = true;
  const badly = approachOdds(target, approach) < 0.9 || approach.bond <= -7;
  if (badly) {
    target.opinion = clampStat(target.opinion - 8);
    return {
      ok: true, title: 'Mal pris', tone: 'bad',
      message: `${target.firstName} coupe court. « On a bien le temps. » Tu as quand même vu ce qu’il y avait.`,
    };
  }
  return {
    ok: true, title: 'C’est dit', tone: 'neutral',
    message: `${target.firstName} en parle sans détour. Ce qu’${target.sex === 'F' ? 'elle' : 'il'} laissera : `
      + `${formatMoney(Math.max(0, target.wealth), p.countryId)}. Le dire enlève un poids à tout le monde.`,
  };
}
