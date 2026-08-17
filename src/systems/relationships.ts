/**
 * Système relationnel (§7, §8) : interactions sociales, vie amoureuse,
 * mariage, séparation, enfants, et initiatives autonomes des PNJ.
 */

import { clampStat } from '../engine/rng.ts';
import { BASE, conceptionChance, proposalChance, romanceChance, socialDelta } from '../engine/probability.ts';
import { getPsycheContext, getSocialContext } from './contexts.ts';
import { applyExperience } from './psyche.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import { socialFactor } from './languages.ts';
import { FAR_FLOOR } from '../data/lives.ts';
import { wrong } from './grudges.ts';
import { separate } from './separation.ts';
import { fullName, person, peopleByRelation } from '../engine/context.ts';
import type { ActionResult, GameState, Person, RelationKind, Sex } from '../engine/types.ts';
import { createPerson, killPerson, noteHistory } from './npc.ts';
import { getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';

/** Interactions sociales disponibles, avec leur coût éventuel. */
export type SocialAction =
  | 'talk' | 'time' | 'compliment' | 'gift' | 'insult' | 'argue'
  | 'kiss' | 'askOut' | 'propose' | 'breakUp' | 'cutTies' | 'reconnect'
  | 'advice';

const MAX_INTERACTIONS_PER_YEAR = 3;

/**
 * Socle sous lequel une relation ne descend pas par simple inattention.
 * Les liens du sang et du couple résistent au silence ; les camarades de
 * classe et les collègues s'effacent complètement.
 */
const RELATION_FLOOR: Partial<Record<RelationKind, number>> = {
  mother: 46, father: 44, stepmother: 30, stepfather: 30,
  son: 48, daughter: 48,
  brother: 34, sister: 34,
  grandmother: 32, grandfather: 30, aunt: 18, uncle: 18, cousin: 14,
  nephew: 16, niece: 16, inLaw: 12,
  spouse: 38, partner: 30,
  bestFriend: 28, friend: 8,
  ex: 0, crush: 0, classmate: 0, coworker: 0, boss: 0,
  inmate: 0, lawyer: 0, acquaintance: 0,
};

/** Liens qui s'effritent vite faute d'entretien. */
const TRANSIENT_BONDS: RelationKind[] = ['friend', 'classmate', 'coworker', 'boss', 'crush', 'acquaintance', 'inmate'];

function canInteract(ctx: Ctx, target: Person): string | null {
  if (!target.alive) return `${target.firstName} n’est plus là.`;
  if (target.estranged) return `Tu as coupé les ponts avec ${target.firstName}.`;
  // Quelqu'un qui est dedans n'est pas joignable : il ne reste que le
  // parloir, qui est une action à lui (`systems/lives.ts#visit`).
  if (target.incarcerated) {
    return `${target.firstName} est détenu${target.sex === 'F' ? 'e' : ''}. Tu ne peux que lui rendre visite.`;
  }
  if (target.interactionsThisYear >= MAX_INTERACTIONS_PER_YEAR) {
    return `Tu as déjà passé beaucoup de temps avec ${target.firstName} cette année.`;
  }
  void ctx;
  return null;
}

/** Interaction sociale simple (discuter, complimenter, se disputer…). */
/**
 * Ce que la langue fait à un lien qu'on essaie de nouer.
 *
 * Elle ne s'applique pas aux proches : on parle sa propre langue avec ses
 * parents, ses frères, ses enfants et son conjoint, où qu'on vive. Elle
 * s'applique à tous les autres — c'est-à-dire aux gens d'ici, ceux qu'on
 * rencontre justement parce qu'on a changé de pays.
 */
const CLOSE: RelationKind[] = [
  'father', 'mother', 'brother', 'sister', 'son', 'daughter',
  'spouse', 'partner', 'grandfather', 'grandmother',
];

function bondFactor(state: GameState, target: Person): number {
  return CLOSE.includes(target.relation) ? 1 : socialFactor(state);
}

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
      // Le gain dépend autant de la manière que du geste : chaleur, humour,
      // aisance en tête-à-tête. Deux personnes qui « passent du temps » avec
      // quelqu'un n'obtiennent pas le même résultat.
      const delta = socialDelta({
        kind: action,
        personality: target.personality,
        relationship: target.relationship,
        intensity: 0,
        playerLooks: p.stats.looks,
        roll: rng.next(),
      }) * getPsycheContext(state).socialGain * bondFactor(state, target);
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
      shiftStat(state, 'karma', -((action === 'insult' ? 5 : 2)));
      // Ce qui reste après coup. Mesuré avant : on pouvait insulter sa sœur
      // douze fois et rester en bons termes — opinion à zéro, lien à 54,
      // ponts intacts. Un tort n'est retenu que par quelqu'un dont l'opinion
      // est déjà basse : blesser qui vous aime encore fait une déception.
      wrong(ctx, target, action === 'insult' ? 'insulte' : 'dispute');
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
      target.opinion = clampStat(target.opinion - 25);
      wrong(ctx, target, 'ponts');
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
    case 'advice':
      return askAdvice(ctx, target);
    case 'kiss':
    case 'askOut':
      return romanticAdvance(ctx, target, action);
    case 'propose':
      return propose(ctx, target);
    case 'breakUp':
      return breakUp(ctx, target);
  }
}

/**
 * Demander conseil à quelqu'un.
 *
 * La valeur du conseil ne vient pas de la gentillesse mais de ce que la
 * personne a vécu : son âge, son parcours, son métier. Un proche affectueux
 * mais démuni donnera un conseil chaleureux et inutile — ce qui est déjà
 * quelque chose, mais pas la même chose.
 */
function askAdvice(ctx: Ctx, target: Person): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  target.interactionsThisYear += 1;
  target.lastInteractionYear = state.year;

  // Ce qu'il a à transmettre : du vécu, un métier, une tête bien faite.
  const substance = (target.age - p.age) * 0.8
    + (target.jobTitle ? 14 : 0)
    + (target.psyche ? target.psyche.axes.emotionalMaturity * 0.3 : 12)
    + (target.psyche ? target.psyche.values.knowledge * 0.15 : 8);
  const willing = target.relationship * 0.5 + target.personality.warmth * 0.4;

  if (!rng.percent(20 + willing / 2)) {
    return {
      ok: true, title: 'Conseil', tone: 'neutral',
      message: `${target.firstName} élude. Ce n’est pas le moment, ou ce n’est pas son genre.`,
    };
  }

  target.relationship = clampStat(target.relationship + rng.float(2, 6));
  if (substance > 40) {
    // Vers son plafond : un mentor développe quelqu'un, il ne le remplace pas.
    shiftStat(state, 'intelligence', rng.float(0.4, 1.6));
    p.stats.stress = clampStat(p.stats.stress - rng.float(2, 7));
    p.psyche.self.senseOfControl = clampStat(p.psyche.self.senseOfControl + rng.float(1, 4));
    return {
      ok: true, title: 'Conseil', tone: 'good',
      message: `${target.firstName} a déjà vu ça, et le dit sans détour. Tu y vois plus clair.`,
    };
  }
  p.stats.happiness = clampStat(p.stats.happiness + rng.float(1, 4));
  return {
    ok: true, title: 'Conseil', tone: 'neutral',
    message: `${target.firstName} t’écoute avec attention et ne sait pas quoi te dire. Ça fait du bien quand même.`,
  };
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
  }) * getPsycheContext(state).romance;

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
  p.chronicle.marriages += 1;
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
  // Certains ne le digèrent pas. Seulement ceux dont l'opinion était déjà
  // basse : être quitté par quelqu'un qu'on aimait encore fait un chagrin,
  // pas une inimitié.
  wrong(ctx, target, 'rupture');
  noteHistory(state, target, `Rupture avec ${p.firstName}.`);
  ctx.log('love', `Tu as rompu avec ${fullName(target)}.`, 'bad');
  return { ok: true, title: 'Rupture', message: `C’est terminé avec ${target.firstName}.`, tone: 'bad' };
}

/**
 * Divorcer sans rien décider.
 *
 * Le chemin par défaut : celui qu'empruntent les événements et un conjoint
 * qui s'en va de lui-même. Il passe par la même procédure que le divorce
 * choisi (`systems/separation.ts`), à l'amiable et sans avocat — de sorte
 * qu'il n'existe qu'une seule règle de partage et de garde dans le jeu, et
 * pas deux qui se contrediraient.
 */
export function divorce(ctx: Ctx, target: Person): ActionResult {
  if (target.relation !== 'spouse') return { ok: false, message: 'Tu n’es pas marié à cette personne.' };
  return separate(ctx, target.id, 'aucun', 'amiable');
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
  const character = getPsycheContext(state);

  // Une année de plus à deux. Compté ici parce que l'état final ne le dit
  // pas : un veuf n'a plus de conjoint, et il a pourtant été marié trente ans.
  if (Object.values(state.npcs).some((x) => x.alive && x.relation === 'spouse')) {
    p.chronicle.yearsMarried += 1;
  }

  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    // Une relation non entretenue s'étiole — mais vers un socle, pas vers zéro.
    // On ne devient pas étranger à ses parents simplement en ne cliquant pas.
    const yearsSince = state.year - npc.lastInteractionYear;
    if (yearsSince > 0) {
      // Un caractère loyal maintient ses liens plus haut que la moyenne.
      // Ce qui est loin se garde moins bien : partir vivre ailleurs abaisse
      // le socle sous lequel le lien ne descendait pas.
      const floor = Math.max(0, (RELATION_FLOOR[npc.relation] ?? 0)
        + (RELATION_FLOOR[npc.relation] ? character.loyaltyFloor : 0)
        - (npc.flags.far === true ? FAR_FLOOR : 0));
      const above = npc.relationship - floor;
      if (above > 0) {
        const rate = TRANSIENT_BONDS.includes(npc.relation) ? 0.16 : 0.06;
        const decay = above * rate * Math.min(2.5, yearsSince) + rng.float(0.2, 0.9);
        npc.relationship = clampStat(Math.max(floor, npc.relationship - decay));
      }
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
  // Se faire des amis dépend d'abord de l'endroit où l'on vit : des enfants
  // du même âge à proximité, une vie de quartier, un établissement assez grand.
  const social = getSocialContext(state);
  if (friendCount < 6 && rng.chance(
    BASE.friendContact * (p.stats.happiness / 100 + 0.3) * social.friendChance * character.bonding,
  )) {
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
    applyExperience(ctx, 'trahison', { person: partner });
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
