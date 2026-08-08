/**
 * Système relationnel (§7, §8) : interactions sociales, vie amoureuse,
 * mariage, séparation, enfants, et initiatives autonomes des PNJ.
 */

import { clampStat } from '../engine/rng.ts';
import { BASE, conceptionChance, proposalChance, romanceChance, socialDelta } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person, peopleByRelation } from '../engine/context.ts';
import type { ActionResult, GameState, Person, RelationKind, Sex } from '../engine/types.ts';
import { createPerson, killPerson, noteHistory } from './npc.ts';
import { getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';

/** Interactions sociales disponibles, avec leur coût éventuel. */
export type SocialAction =
  | 'talk' | 'time' | 'compliment' | 'gift' | 'insult' | 'argue'
  | 'kiss' | 'askOut' | 'propose' | 'breakUp' | 'cutTies' | 'reconnect';

const MAX_INTERACTIONS_PER_YEAR = 3;

function canInteract(ctx: Ctx, target: Person): string | null {
  if (!target.alive) return `${target.firstName} n’est plus là.`;
  if (target.estranged) return `Tu as coupé les ponts avec ${target.firstName}.`;
  if (target.interactionsThisYear >= MAX_INTERACTIONS_PER_YEAR) {
    return `Tu as déjà passé beaucoup de temps avec ${target.firstName} cette année.`;
  }
  void ctx;
  return null;
}

/** Interaction sociale simple (discuter, complimenter, se disputer…). */
export function interact(ctx: Ctx, personId: string, action: SocialAction, giftValue = 0): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target) return { ok: false, message: 'Personne introuvable.' };

  const blocker = canInteract(ctx, target);
  if (blocker && action !== 'reconnect') return { ok: false, message: blocker };

  switch (action) {
    case 'talk':
    case 'time':
    case 'compliment': {
      target.interactionsThisYear += 1;
      const delta = socialDelta({
        kind: action,
        personality: target.personality,
        relationship: target.relationship,
        intensity: 0,
        playerLooks: p.stats.looks,
        roll: rng.next(),
      });
      target.relationship = clampStat(target.relationship + delta);
      target.opinion = clampStat(target.opinion + delta * 0.8);
      target.lastInteractionYear = state.year;
      p.stats.happiness = clampStat(p.stats.happiness + Math.min(4, delta / 2));
      if (action === 'time') p.stats.stress = clampStat(p.stats.stress - 3);
      return {
        ok: true,
        title: fullName(target),
        message: describeSocialOutcome(action, target, delta),
        tone: delta > 0 ? 'good' : 'neutral',
      };
    }
    case 'gift': {
      target.interactionsThisYear += 1;
      if (giftValue <= 0 || giftValue > p.money) return { ok: false, message: 'Montant du cadeau invalide.' };
      const country = getCountry(p.countryId);
      p.money -= giftValue;
      const intensity = Math.min(1, giftValue / (2500 * country.salaryIndex));
      const delta = socialDelta({
        kind: 'gift',
        personality: target.personality,
        relationship: target.relationship,
        intensity,
        playerLooks: p.stats.looks,
        roll: rng.next(),
      });
      target.relationship = clampStat(target.relationship + delta);
      target.opinion = clampStat(target.opinion + delta);
      target.lastInteractionYear = state.year;
      return {
        ok: true,
        title: 'Cadeau offert',
        message: delta > 12
          ? `${target.firstName} est visiblement bouleversé${target.sex === 'F' ? 'e' : ''} par ton attention.`
          : `${target.firstName} te remercie${delta < 4 ? ', un peu poliment' : ' chaleureusement'}.`,
        tone: delta > 4 ? 'good' : 'neutral',
      };
    }
    case 'insult':
    case 'argue': {
      target.interactionsThisYear += 1;
      const delta = socialDelta({
        kind: action,
        personality: target.personality,
        relationship: target.relationship,
        intensity: 0,
        playerLooks: p.stats.looks,
        roll: rng.next(),
      });
      target.relationship = clampStat(target.relationship + delta);
      target.opinion = clampStat(target.opinion + delta * 1.2);
      p.stats.karma = clampStat(p.stats.karma - (action === 'insult' ? 5 : 2));
      p.stats.stress = clampStat(p.stats.stress + 4);
      // Un PNJ colérique peut riposter durement.
      if (target.personality.temper > 70 && rng.percent(30)) {
        p.stats.happiness = clampStat(p.stats.happiness - 8);
        target.estranged = true;
        ctx.log('family', `${fullName(target)} a coupé les ponts après votre dispute.`, 'bad');
        return { ok: true, title: 'Rupture', message: `${target.firstName} explose et met fin à votre relation.`, tone: 'bad' };
      }
      return {
        ok: true,
        title: action === 'insult' ? 'Insulte' : 'Dispute',
        message: `${target.firstName} encaisse mal. La relation se dégrade.`,
        tone: 'bad',
      };
    }
    case 'cutTies': {
      target.estranged = true;
      target.relationship = clampStat(target.relationship - 40);
      p.stats.happiness = clampStat(p.stats.happiness - 6);
      ctx.log('family', `Tu as coupé les ponts avec ${fullName(target)}.`, 'bad');
      return { ok: true, title: 'Ponts coupés', message: `Tu ne parleras plus à ${target.firstName}.`, tone: 'bad' };
    }
    case 'reconnect': {
      if (!target.estranged) return { ok: false, message: 'Vous êtes déjà en contact.' };
      const chance = 0.25 + target.opinion / 250 + target.personality.warmth / 300;
      if (rng.chance(chance)) {
        target.estranged = false;
        target.relationship = clampStat(target.relationship + 15);
        ctx.log('family', `Tu as renoué avec ${fullName(target)}.`, 'good');
        return { ok: true, title: 'Réconciliation', message: `${target.firstName} accepte de reprendre contact.`, tone: 'good' };
      }
      return { ok: true, title: 'Sans réponse', message: `${target.firstName} ne répond pas.`, tone: 'bad' };
    }
    case 'kiss':
    case 'askOut':
      return romanticAdvance(ctx, target, action);
    case 'propose':
      return propose(ctx, target);
    case 'breakUp':
      return breakUp(ctx, target);
  }
}

function describeSocialOutcome(action: SocialAction, target: Person, delta: number): string {
  if (delta <= 0) return `${target.firstName} ne semble pas d’humeur.`;
  if (action === 'talk') {
    return delta > 4
      ? `Vous parlez longuement. ${target.firstName} se confie un peu.`
      : `Une conversation agréable mais sans relief.`;
  }
  if (action === 'time') {
    return delta > 7
      ? `Vous passez une journée entière ensemble. ${target.firstName} rayonne.`
      : `Vous passez un moment ensemble, tranquillement.`;
  }
  return delta > 5
    ? `${target.firstName} rougit et te remercie.`
    : `${target.firstName} sourit poliment.`;
}

/** Compatibilité d'orientation entre le joueur et un PNJ. */
export function isRomanticallyCompatible(playerSex: Sex, playerOrientation: string, target: Person): boolean {
  const playerLikes = playerOrientation === 'bi'
    || (playerOrientation === 'hetero' ? target.sex !== playerSex : target.sex === playerSex);
  const targetLikes = target.orientation === 'bi'
    || (target.orientation === 'hetero' ? playerSex !== target.sex : playerSex === target.sex);
  return playerLikes && targetLikes;
}

function romanticAdvance(ctx: Ctx, target: Person, action: 'kiss' | 'askOut'): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 13) return { ok: false, message: 'Tu es beaucoup trop jeune pour ça.' };
  if (target.age < 16 && p.age >= 18) return { ok: false, message: 'Absolument pas.' };
  if (p.age < 18 && target.age >= 18) return { ok: false, message: 'Absolument pas.' };
  if (['mother', 'father', 'brother', 'sister', 'son', 'daughter', 'stepmother', 'stepfather'].includes(target.relation)) {
    return { ok: false, message: 'Non.' };
  }
  const current = currentPartner(state);
  if (current && current.id !== target.id && action === 'askOut') {
    return { ok: false, message: `Tu es déjà en couple avec ${current.firstName}.` };
  }
  target.interactionsThisYear += 1;

  const country = getCountry(p.countryId);
  const chance = romanceChance({
    playerLooks: p.stats.looks,
    playerHappiness: p.stats.happiness,
    targetLooks: target.stats.looks,
    relationship: target.relationship,
    opinion: target.opinion,
    targetWarmth: target.personality.warmth,
    compatible: isRomanticallyCompatible(p.sex, p.orientation, target),
    targetTaken: target.maritalStatus === 'married' || target.maritalStatus === 'dating',
    targetLoyalty: target.personality.loyalty,
    ageGapYears: p.age - target.age,
    richness: Math.min(100, (p.money / (60000 * country.salaryIndex)) * 100),
  });

  if (rng.chance(chance)) {
    if (action === 'kiss') {
      target.relationship = clampStat(target.relationship + 12);
      target.opinion = clampStat(target.opinion + 10);
      p.stats.happiness = clampStat(p.stats.happiness + 8);
      return { ok: true, title: 'Baiser', message: `${target.firstName} répond à ton baiser.`, tone: 'good' };
    }
    startRelationship(ctx, target);
    return { ok: true, title: 'C’est un oui', message: `Tu es maintenant en couple avec ${fullName(target)}.`, tone: 'good' };
  }

  target.relationship = clampStat(target.relationship - rng.int(3, 12));
  target.opinion = clampStat(target.opinion - rng.int(2, 8));
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  return {
    ok: true,
    title: 'Refus',
    message: action === 'kiss'
      ? `${target.firstName} recule d’un pas. Le moment est très gênant.`
      : `${target.firstName} décline. La conversation se termine vite.`,
    tone: 'bad',
  };
}

export function currentPartner(state: GameState): Person | null {
  return Object.values(state.npcs).find(
    (x) => x.alive && (x.relation === 'partner' || x.relation === 'spouse'),
  ) ?? null;
}

export function isMarried(state: GameState): boolean {
  return Object.values(state.npcs).some((x) => x.alive && x.relation === 'spouse');
}

export function startRelationship(ctx: Ctx, target: Person): void {
  const { state } = ctx;
  target.relation = 'partner';
  target.maritalStatus = 'dating';
  target.partnerId = state.player.id;
  target.relationship = clampStat(Math.max(target.relationship, 62));
  target.flags.togetherSince = state.year;
  state.player.stats.happiness = clampStat(state.player.stats.happiness + 12);
  noteHistory(state, target, `Début de la relation avec ${state.player.firstName}.`);
  ctx.log('love', `Tu es en couple avec ${fullName(target)}.`, 'good');
}

export function propose(ctx: Ctx, target: Person): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (target.relation !== 'partner') return { ok: false, message: 'Il faut être en couple pour faire une demande.' };
  if (p.age < 18) return { ok: false, message: 'Tu es trop jeune pour te marier.' };
  const ringValue = Number(p.flags.ringValue ?? 0);
  const yearsTogether = state.year - Number(target.flags.togetherSince ?? state.year);
  const chance = proposalChance({
    relationship: target.relationship,
    yearsTogether,
    ringValue,
    targetAmbition: target.personality.ambition,
    playerWealth: p.money,
    targetLoyalty: target.personality.loyalty,
  });
  target.interactionsThisYear += 1;

  if (rng.chance(chance)) {
    marry(ctx, target);
    return { ok: true, title: 'Elle a dit oui !', message: `${target.firstName} accepte de t’épouser.`, tone: 'good' };
  }
  target.relationship = clampStat(target.relationship - 12);
  p.stats.happiness = clampStat(p.stats.happiness - 14);
  return {
    ok: true,
    title: 'Demande refusée',
    message: `${target.firstName} n’est pas prêt${target.sex === 'F' ? 'e' : ''}. Le retour à la maison est silencieux.`,
    tone: 'bad',
  };
}

export function marry(ctx: Ctx, target: Person): void {
  const { state } = ctx;
  const p = state.player;
  target.relation = 'spouse';
  target.maritalStatus = 'married';
  target.flags.marriedSince = state.year;
  // Frais de mariage proportionnels aux moyens.
  const cost = Math.min(p.money * 0.35, 22000);
  p.money -= cost;
  p.stats.happiness = clampStat(p.stats.happiness + 22);
  p.stats.reputation = clampStat(p.stats.reputation + 5);
  target.relationship = clampStat(target.relationship + 12);
  noteHistory(state, target, `Mariage avec ${p.firstName}.`);
  ctx.log('love', `Tu as épousé ${fullName(target)}. Coût de la cérémonie : ${Math.round(cost)}.`, 'good');
}

export function breakUp(ctx: Ctx, target: Person): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (target.relation === 'spouse') return divorce(ctx, target);
  if (target.relation !== 'partner') return { ok: false, message: 'Vous n’êtes pas en couple.' };
  target.relation = 'ex';
  target.maritalStatus = 'single';
  target.partnerId = null;
  target.exPartnerIds.push(p.id);
  target.relationship = clampStat(target.relationship - 30);
  target.opinion = clampStat(target.opinion - 25);
  p.stats.happiness = clampStat(p.stats.happiness - 12);
  noteHistory(state, target, `Rupture avec ${p.firstName}.`);
  ctx.log('love', `Tu as rompu avec ${fullName(target)}.`, 'bad');
  return { ok: true, title: 'Rupture', message: `C’est terminé avec ${target.firstName}.`, tone: 'bad' };
}

export function divorce(ctx: Ctx, target: Person): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (target.relation !== 'spouse') return { ok: false, message: 'Tu n’es pas marié à cette personne.' };

  const prenup = Boolean(p.flags.prenup);
  const country = getCountry(p.countryId);
  let lost = 0;
  if (!prenup) {
    // Partage du patrimoine liquide, atténué par la générosité du conjoint.
    const share = 0.5 - (target.personality.generosity / 100) * 0.15;
    lost = Math.round(Math.max(0, p.money) * share);
    p.money -= lost;
    target.wealth += lost;
  }

  // Pension alimentaire si des enfants mineurs vivent avec l'ex-conjoint.
  const minorChildren = peopleByRelation(state, ['son', 'daughter']).filter((c) => c.age < 18);
  let alimony = 0;
  if (minorChildren.length > 0 && rng.chance(0.55)) {
    alimony = Math.round(minorChildren.length * 3600 * country.costIndex);
    p.flags.alimony = Number(p.flags.alimony ?? 0) + alimony;
  }

  target.relation = 'ex';
  target.maritalStatus = 'divorced';
  target.partnerId = null;
  target.exPartnerIds.push(p.id);
  target.relationship = clampStat(target.relationship - 35);
  target.opinion = clampStat(target.opinion - 30);
  p.stats.happiness = clampStat(p.stats.happiness - 20);
  p.stats.stress = clampStat(p.stats.stress + 18);
  p.flags.prenup = false;
  noteHistory(state, target, `Divorce d’avec ${p.firstName}.`);
  ctx.log('love', `Tu as divorcé de ${fullName(target)}.${lost > 0 ? ` Partage des biens : -${lost}.` : ''}`, 'bad');

  return {
    ok: true,
    title: 'Divorce prononcé',
    message: [
      `La procédure est terminée.`,
      lost > 0 ? `Partage des biens : ${lost} versés à ${target.firstName}.` : 'Le contrat de mariage a protégé ton patrimoine.',
      alimony > 0 ? `Pension alimentaire annuelle : ${alimony}.` : '',
    ].filter(Boolean).join(' '),
    tone: 'bad',
  };
}

/** Signature d'un contrat de mariage avant la cérémonie. */
export function signPrenup(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const partner = currentPartner(state);
  if (!partner) return { ok: false, message: 'Tu n’as pas de partenaire.' };
  if (partner.relation === 'spouse') return { ok: false, message: 'Le mariage est déjà célébré.' };
  if (p.flags.prenup) return { ok: false, message: 'Le contrat est déjà signé.' };
  const cost = 1800;
  if (p.money < cost) return { ok: false, message: `Un notaire coûte ${cost}.` };

  // Le partenaire peut très mal le prendre.
  const accepts = rng.chance(0.45 + partner.personality.discipline / 300 - partner.personality.warmth / 400);
  p.money -= cost;
  if (accepts) {
    p.flags.prenup = true;
    partner.relationship = clampStat(partner.relationship - 6);
    return { ok: true, title: 'Contrat signé', message: `${partner.firstName} accepte, sans enthousiasme.`, tone: 'neutral' };
  }
  partner.relationship = clampStat(partner.relationship - 18);
  partner.opinion = clampStat(partner.opinion - 15);
  return { ok: true, title: 'Refus', message: `${partner.firstName} refuse catégoriquement et le prend très mal.`, tone: 'bad' };
}

/** Tentative de concevoir un enfant. */
export function tryForBaby(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const partner = currentPartner(state);
  if (!partner) return { ok: false, message: 'Il faut être en couple.' };
  if (p.age < 16) return { ok: false, message: 'Tu es trop jeune.' };
  if (p.yearActions.tryBaby) return { ok: false, message: 'Vous avez déjà essayé cette année.' };
  p.yearActions.tryBaby = 1;

  const mother = p.sex === 'F' ? { age: p.age, fertility: p.stats.fertility } : { age: partner.age, fertility: partner.stats.fertility };
  const father = p.sex === 'M' ? { age: p.age, fertility: p.stats.fertility } : { age: partner.age, fertility: partner.stats.fertility };
  if (!isRomanticallyCompatible(p.sex, p.orientation, partner) || p.sex === partner.sex) {
    return { ok: false, title: 'Adoption', message: 'Vous devrez passer par l’adoption ou une aide médicale (menu Activités).', tone: 'neutral' };
  }

  const chance = conceptionChance({
    motherAge: mother.age,
    fatherAge: father.age,
    motherFertility: mother.fertility,
    fatherFertility: father.fertility,
    health: p.stats.health,
    onTreatment: Boolean(p.flags.fertilityTreatment),
  });
  if (rng.chance(chance)) {
    p.flags.pregnant = state.year;
    return { ok: true, title: 'Bonne nouvelle', message: 'Un enfant est en route. Naissance l’an prochain.', tone: 'good' };
  }
  return { ok: true, title: 'Pas cette fois', message: 'Rien cette année. Vous pourrez réessayer.', tone: 'neutral' };
}

/** Naissance effective, appelée par le moteur au passage d'année. */
export function deliverBaby(ctx: Ctx, adopted = false): Person {
  const { state, rng } = ctx;
  const p = state.player;
  const partner = currentPartner(state);
  const sex: Sex = rng.chance(0.5) ? 'M' : 'F';
  const country = getCountry(p.countryId);
  const names = getNameSet(country.nameSet);

  const child = createPerson(ctx, {
    relation: sex === 'M' ? 'son' : 'daughter',
    sex,
    age: 0,
    lastName: p.lastName,
    withJob: false,
    relationship: 85,
    opinion: 88,
    parentIds: partner ? [p.id, partner.id] : [p.id],
    statsBias: {
      // Hérédité partielle des deux parents.
      intelligence: clampStat(((p.stats.intelligence + (partner?.stats.intelligence ?? 50)) / 2) + rng.float(-14, 14)),
      looks: clampStat(((p.stats.looks + (partner?.stats.looks ?? 50)) / 2) + rng.float(-14, 14)),
      health: clampStat(85 + rng.float(-12, 10)),
    },
  });
  child.firstName = rng.pick(sex === 'M' ? names.male : names.female);
  if (partner) {
    partner.childrenIds.push(child.id);
    partner.relationship = clampStat(partner.relationship + 10);
  }
  p.flags.pregnant = 0;
  p.stats.happiness = clampStat(p.stats.happiness + 18);
  p.stats.stress = clampStat(p.stats.stress + 12);
  ctx.log(
    'family',
    adopted
      ? `Tu as adopté ${child.firstName}.`
      : `Naissance de ${child.firstName}, ${sex === 'M' ? 'ton fils' : 'ta fille'}.`,
    'good',
  );
  return child;
}

/* ------------------------------------------------------------------ */
/* Évolution annuelle et initiatives des PNJ                          */
/* ------------------------------------------------------------------ */

/** Érosion naturelle des liens et initiatives autonomes des PNJ (§8). */
export function advanceRelationships(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    // Une relation non entretenue s'étiole.
    const yearsSince = state.year - npc.lastInteractionYear;
    if (yearsSince > 0) {
      const decay = npc.relation === 'friend' || npc.relation === 'classmate' || npc.relation === 'coworker'
        ? rng.float(2, 6)
        : rng.float(0.5, 2.5);
      npc.relationship = clampStat(npc.relationship - decay * Math.min(3, yearsSince));
    }
    // Les amis d'école disparaissent progressivement une fois la scolarité finie.
    if (npc.relation === 'classmate' && p.age > 22 && rng.percent(25)) {
      npc.relation = 'acquaintance';
    }
    if (npc.relation === 'friend' && npc.relationship > 82 && rng.percent(12)) {
      npc.relation = 'bestFriend';
      ctx.log('family', `${fullName(npc)} est devenu${npc.sex === 'F' ? 'e' : ''} un${npc.sex === 'F' ? 'e' : ''} de tes meilleur${npc.sex === 'F' ? 'e' : ''}s ami${npc.sex === 'F' ? 'e' : ''}s.`, 'good');
    }
  }

  // Rencontres spontanées d'amis pendant la scolarité ou au travail.
  const friendCount = peopleByRelation(state, ['friend', 'bestFriend']).length;
  if (friendCount < 6 && rng.chance(BASE.friendContact * (p.stats.happiness / 100 + 0.3))) {
    makeFriend(ctx);
  }

  partnerInitiatives(ctx);
  handlePregnancy(ctx);
}

/** Le partenaire agit de sa propre initiative (§8). */
function partnerInitiatives(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const partner = currentPartner(state);
  if (!partner) return;

  const together = state.year - Number(partner.flags.togetherSince ?? state.year);

  // Rupture à l'initiative du PNJ si la relation se dégrade.
  if (partner.relationship < 30 && rng.chance(0.35 + (30 - partner.relationship) / 100)) {
    const married = partner.relation === 'spouse';
    partner.relation = 'ex';
    partner.maritalStatus = married ? 'divorced' : 'single';
    partner.partnerId = null;
    p.stats.happiness = clampStat(p.stats.happiness - (married ? 22 : 14));
    p.stats.stress = clampStat(p.stats.stress + 14);
    if (married) {
      const lost = Math.round(Math.max(0, p.money) * (p.flags.prenup ? 0 : 0.45));
      p.money -= lost;
      ctx.log('love', `${fullName(partner)} a demandé le divorce.${lost > 0 ? ` Partage des biens : -${lost}.` : ''}`, 'bad');
    } else {
      ctx.log('love', `${fullName(partner)} a mis fin à votre relation.`, 'bad');
    }
    return;
  }

  // Infidélité.
  const infidelity = BASE.infidelity
    * (1 - partner.personality.loyalty / 130)
    * (partner.relationship < 55 ? 2.2 : 1)
    * (p.stats.looks < 35 ? 1.4 : 1);
  if (rng.chance(infidelity)) {
    partner.flags.cheated = true;
    partner.relationship = clampStat(partner.relationship - 15);
    if (rng.chance(0.6)) {
      p.stats.happiness = clampStat(p.stats.happiness - 22);
      ctx.log('love', `Tu as découvert que ${partner.firstName} te trompait.`, 'bad');
    }
    return;
  }

  // Demande en mariage à l'initiative du PNJ.
  if (partner.relation === 'partner' && together >= 2 && partner.relationship > 74 && p.age >= 20
    && rng.chance(BASE.partnerInitiative * (partner.personality.loyalty / 90))) {
    marry(ctx, partner);
    ctx.log('love', `${fullName(partner)} t’a demandé{e} en mariage — et tu as dit oui.`.replace('{e}', ''), 'good');
    return;
  }

  // Envie d'enfant exprimée spontanément (traitée comme événement en attente).
  if (partner.relation === 'spouse' && partner.age < 45 && p.age < 50
    && peopleByRelation(state, ['son', 'daughter']).length < 4
    && rng.chance(0.12)) {
    p.flags.partnerWantsChild = state.year;
  }
}

/** Traite une grossesse en cours : naissance l'année suivante. */
function handlePregnancy(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const pregnantSince = Number(p.flags.pregnant ?? 0);
  if (!pregnantSince) return;
  if (state.year <= pregnantSince) return;

  // Risque de fausse couche, plus élevé avec l'âge et le stress.
  const risk = 0.08 + Math.max(0, p.age - 35) * 0.015 + (p.stats.stress / 100) * 0.08;
  if (rng.chance(Math.min(0.45, risk))) {
    p.flags.pregnant = 0;
    p.stats.happiness = clampStat(p.stats.happiness - 20);
    p.stats.stress = clampStat(p.stats.stress + 15);
    ctx.log('family', 'La grossesse s’est interrompue. C’est une épreuve difficile.', 'bad');
    return;
  }
  deliverBaby(ctx);
}

/** Crée un nouvel ami persistant. */
export function makeFriend(ctx: Ctx): Person {
  const { state, rng } = ctx;
  const p = state.player;
  const friend = createPerson(ctx, {
    relation: 'friend',
    age: Math.max(5, p.age + rng.int(-6, 6)),
    relationship: rng.int(45, 72),
    opinion: rng.int(45, 75),
    withJob: p.age >= 22,
  });
  ctx.log('family', `Tu t’es lié${p.sex === 'F' ? 'e' : ''} d’amitié avec ${fullName(friend)}.`, 'good');
  return friend;
}

/** Rencontre romantique via sortie ou application (utilisé par les activités). */
export function meetRomanticProspect(ctx: Ctx, quality: number): Person {
  const { state, rng } = ctx;
  const p = state.player;
  const wantedSex: Sex = p.orientation === 'homo'
    ? p.sex
    : p.orientation === 'hetero'
      ? (p.sex === 'M' ? 'F' : 'M')
      : (rng.chance(0.5) ? 'M' : 'F');
  const prospect = createPerson(ctx, {
    relation: 'crush',
    sex: wantedSex,
    age: Math.max(18, Math.round(p.age + rng.gauss(0, 5, -8, 8))),
    relationship: rng.int(28, 55),
    opinion: rng.int(30, 62),
    withJob: true,
    statsBias: { looks: clampStat(rng.stat(50 + quality * 22, 22)) },
  });
  return prospect;
}

/** Retire un PNJ de l'entourage (mort ou disparition). */
export function removePerson(ctx: Ctx, personId: string, cause: string): void {
  const target = person(ctx.state, personId);
  if (!target) return;
  killPerson(ctx, target, cause);
}

/** Personnes appartenant à la famille proche. */
export function closeFamily(state: GameState): Person[] {
  const kinds: RelationKind[] = ['mother', 'father', 'brother', 'sister', 'son', 'daughter', 'spouse', 'partner'];
  return Object.values(state.npcs).filter((p) => kinds.includes(p.relation));
}
