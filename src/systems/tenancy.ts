/**
 * Être propriétaire de quelqu'un.
 *
 * « Mettre en location » était un interrupteur : on l'activait, un loyer fixe
 * tombait chaque année, et personne n'habitait le logement. L'audit le
 * résumait ainsi : « ni locataire, ni vacance, ni impayé, ni réparation ».
 *
 * Trois principes gouvernent ce fichier.
 *
 * **1. Il y a quelqu'un derrière la porte.** Le locataire est un PNJ complet,
 * avec un nom, une opinion de vous et une vie qui continue après son départ.
 * C'est ce qui transforme un revenu passif en relation.
 *
 * **2. Le loyer demandé sélectionne le locataire.** C'est le levier central,
 * et il ne coupe pas là où on croit : demander cher ne fait pas fuir tout le
 * monde, cela fait fuir *ceux qui ont le choix*. Il reste les autres — ceux
 * qui se serrent pour tenir, et qui cessent de payer à la première mauvaise
 * année. Un loyer élevé n'achète donc pas un meilleur rendement, il achète
 * un meilleur rendement **plus risqué**, et c'est tout l'arbitrage.
 *
 * **3. Ce qu'on refuse se paie plus tard.** Une réparation qu'on ne fait pas
 * économise son coût, abîme le bien, et achète du ressentiment chez quelqu'un
 * qui tient vos clés.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, Applicant, GameState, OwnedProperty, Person,
} from '../engine/types.ts';
import { createPerson } from './npc.ts';
import { getLocalOpportunities } from './contexts.ts';

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Le loyer que le marché accepterait pour ce bien, dans son état. */
export function marketRent(state: GameState, prop: OwnedProperty): number {
  return Math.max(1, Math.round(
    prop.annualRentIncome * (0.85 + getLocalOpportunities(state).salary * 0.15),
  ));
}

/** Ce que le propriétaire demande réellement. */
export function askingRent(state: GameState, prop: OwnedProperty): number {
  return prop.askingRent > 0 ? prop.askingRent : marketRent(state, prop);
}

/** Le locataire en place, s'il est encore là. */
export function tenantOf(state: GameState, prop: OwnedProperty): Person | null {
  if (!prop.tenancy) return null;
  const npc = person(state, prop.tenancy.personId);
  return npc?.alive ? npc : null;
}

/** Les biens qu'on peut louer : tout sauf celui où l'on vit. */
export function rentable(state: GameState): OwnedProperty[] {
  return state.player.properties.filter((x) => !x.isResidence);
}

/**
 * Le loyer contractuel de tout le parc.
 *
 * C'est ce sur quoi une banque prête : elle regarde les baux, pas les
 * relevés. Ce qui est réellement tombé est ailleurs — `rentCollected` —,
 * et les deux ne coïncident jamais tout à fait.
 */
export function rentRoll(state: GameState): number {
  return state.player.properties.reduce(
    (sum, prop) => sum + (prop.tenancy ? prop.tenancy.rent : 0),
    0,
  );
}

/** Ce qui est réellement tombé depuis le dernier bilan. */
export function rentCollected(state: GameState): number {
  return Math.max(0, state.player.rentCollectedThisYear);
}

export function clearRentYear(state: GameState): void {
  state.player.rentCollectedThisYear = 0;
}

/* ------------------------------------------------------------------ */
/* Fixer son loyer                                                     */
/* ------------------------------------------------------------------ */

/**
 * Demander plus, ou moins.
 *
 * Le loyer n'est modifiable qu'entre deux baux : un locataire en place paie
 * ce qui a été signé, et c'est précisément ce qui rend le choix du premier
 * locataire important.
 */
export function setAskingRent(ctx: Ctx, propertyId: string, amount: number): ActionResult {
  const { state } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  if (prop.tenancy) {
    return {
      ok: false,
      title: 'Le bail court',
      message: 'Le loyer d’un locataire en place ne se change pas en cours de bail. Il faudra attendre son renouvellement.',
    };
  }
  const market = marketRent(state, prop);
  prop.askingRent = Math.round(clamp(amount, market * 0.4, market * 2.4));
  // Changer le prix affiché renvoie les candidats à leurs calculs.
  prop.applicants = [];
  const ratio = prop.askingRent / market;
  return {
    ok: true,
    title: 'Loyer demandé',
    message: ratio > 1.25
      ? 'Bien au-dessus du marché. Ceux qui ont le choix iront ailleurs ; il restera ceux qui n’en ont pas.'
      : ratio < 0.85
        ? 'En dessous du marché : tu auras l’embarras du choix, et moins d’argent.'
        : 'Dans les prix du quartier.',
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Trouver un locataire                                                */
/* ------------------------------------------------------------------ */

const DOSSIERS = [
  'Dossier complet, garant solide.',
  'En poste depuis huit ans au même endroit.',
  'Aucun garant, mais deux mois d’avance proposés.',
  'A visité deux fois, a posé beaucoup de questions.',
  'Vient de déménager pour un travail. Pressé.',
  'Précédent bailleur injoignable.',
  'Trois enfants, cherche à rester longtemps.',
  'Ne veut signer que pour un an.',
  'A insisté pour payer en liquide.',
  'Très poli, très vague sur ses revenus.',
];

/** Publier l'annonce : les candidatures arrivent. */
export function listForRent(ctx: Ctx, propertyId: string): ActionResult {
  const { state, rng } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  if (prop.isResidence) {
    return { ok: false, title: 'Impossible', message: 'Tu ne peux pas louer le logement où tu vis.' };
  }
  if (prop.tenancy) return { ok: false, message: 'Quelqu’un y habite déjà.' };
  if (prop.applicants.length > 0) return { ok: false, message: 'Les candidatures sont déjà sur la table.' };
  if (state.player.yearActions[`list_${propertyId}`]) {
    return { ok: false, message: 'Tu as déjà publié cette annonce cette année.' };
  }
  state.player.yearActions[`list_${propertyId}`] = 1;

  const market = marketRent(state, prop);
  const asked = askingRent(state, prop);
  const ratio = asked / market;

  // Le nombre de candidats dépend du prix, de l'état du bien et du quartier.
  const pull = clamp(
    (2.6 / ratio ** 1.6) * (0.5 + prop.condition / 130)
    * (0.7 + getLocalOpportunities(state).hiring * 0.4),
    0, 5,
  );
  const count = Math.min(4, Math.floor(pull) + (rng.chance(pull % 1) ? 1 : 0));
  if (count === 0) {
    prop.rentedOut = true;
    return {
      ok: true,
      title: 'Personne',
      message: ratio > 1.2
        ? 'À ce prix-là, personne ne se déplace.'
        : 'Personne ne s’est manifesté cette année. Le bien reste vide.',
      tone: 'bad',
    };
  }

  const applicants: Applicant[] = [];
  for (let i = 0; i < count; i++) {
    const npc = createPerson(ctx, {
      relation: 'acquaintance',
      age: rng.int(19, 68),
      withJob: true,
      relationship: rng.int(30, 55),
      opinion: rng.int(38, 62),
    });
    npc.flags.applicant = true;

    // Ce qu'il peut tenir sans se mettre en difficulté : le tiers de ce
    // qu'il gagne. C'est ce chiffre — invisible — qui décidera des impayés.
    const affordable = Math.max(1, Math.round(npc.salary * 0.33));
    // Un loyer élevé ne fait pas fuir tout le monde : il fait fuir ceux qui
    // ont le choix. Ceux qui restent se serrent, et c'est le vrai risque.
    const stretch = asked / Math.max(1, affordable);
    applicants.push({
      id: ctx.id('appl'),
      personId: npc.id,
      affordable,
      offer: rng.chance(0.18) && ratio < 1.1 ? Math.round(asked * rng.float(1.03, 1.14)) : asked,
      care: clampStat(
        npc.personality.discipline * 0.5 + npc.stats.discipline * 0.3
        + (100 - npc.personality.madness) * 0.2
        // Quelqu'un qui paie trop cher pour lui a d'autres soucis que
        // l'entretien du logement.
        - Math.max(0, stretch - 1) * 22,
      ),
      years: rng.int(1, 9),
      hint: rng.pick(DOSSIERS),
    });
  }
  prop.applicants = applicants;
  prop.rentedOut = true;
  return {
    ok: true,
    title: `${count} candidature(s)`,
    message: 'Un dossier ne dit jamais tout. Ce qui se voit, c’est ce qu’ils gagnent ; ce qui compte, c’est ce qu’ils feront du logement.',
    tone: 'neutral',
  };
}

/** Ce que le dossier laisse deviner du soin qu'il prendra. */
export function careHint(applicant: Applicant): string {
  if (applicant.care > 70) return 'Il a l’air de savoir tenir un intérieur';
  if (applicant.care > 45) return 'Rien de particulier à en dire';
  if (applicant.care > 25) return 'Quelque chose d’un peu négligé';
  return 'Tu le sens mal, sans pouvoir dire pourquoi';
}

/** Ce que sa situation financière laisse deviner. */
export function strainHint(applicant: Applicant): string {
  const stretch = applicant.offer / Math.max(1, applicant.affordable);
  if (stretch > 1.35) return 'Ce loyer est très au-dessus de ses moyens';
  if (stretch > 1.05) return 'Il devra se serrer pour tenir';
  if (stretch > 0.75) return 'C’est dans ses moyens';
  return 'Il pourrait payer bien davantage';
}

/** Accepter un dossier. */
export function acceptTenant(ctx: Ctx, propertyId: string, applicantId: string): ActionResult {
  const { state, rng } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  const applicant = prop.applicants.find((a) => a.id === applicantId);
  if (!applicant) return { ok: false, message: 'Ce dossier n’est plus là.' };
  const npc = person(state, applicant.personId);
  if (!npc) return { ok: false, message: 'Ce candidat a disparu.' };

  prop.tenancy = {
    personId: applicant.personId,
    since: state.year,
    rent: applicant.offer,
    arrears: 0,
    care: applicant.care,
    goodwill: 58,
    yearsLeft: applicant.years,
    noticeYear: null,
  };
  prop.rentedOut = true;
  prop.vacantYears = 0;
  // Les autres repartent : on ne garde pas un dossier en réserve.
  for (const other of prop.applicants) {
    if (other.id === applicantId) continue;
    const loser = state.npcs[other.personId];
    if (loser) delete state.npcs[other.personId];
  }
  prop.applicants = [];
  npc.flags.tenantOf = prop.id;
  delete npc.flags.applicant;

  ctx.log('asset', `${fullName(npc)} emménage dans ${prop.name} pour ${applicant.offer} par an.`, 'good');
  return {
    ok: true,
    title: 'Bail signé',
    message: `${npc.firstName} s’installe pour ${applicant.years} an(s) à ${applicant.offer} par an. ${
      rng.chance(0.5) ? 'Tu ne sauras qu’à l’usage si c’était le bon choix.' : 'Le loyer est fixé jusqu’au renouvellement.'
    }`,
    tone: 'good',
  };
}

/* ------------------------------------------------------------------ */
/* Vivre avec                                                          */
/* ------------------------------------------------------------------ */

/**
 * Trancher une demande de réparation.
 *
 * Les trois réponses ne se classent pas : réparer coûte et rapporte de la
 * bonne volonté, refuser économise et abîme tout, bâcler fait les deux à
 * moitié. Ce qu'on refuse se paie plus tard, mais parfois moins cher.
 */
export function handleRepair(
  ctx: Ctx,
  propertyId: string,
  choice: 'faire' | 'bâcler' | 'refuser',
): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const prop = p.properties.find((x) => x.id === propertyId);
  if (!prop?.repair) return { ok: false, message: 'Rien à réparer en ce moment.' };
  const { label, cost, severity } = prop.repair;
  const tenancy = prop.tenancy;
  prop.repair = null;

  if (choice === 'faire') {
    p.money -= cost;
    prop.condition = clamp(prop.condition + severity * 0.85, 0, 100);
    if (tenancy) tenancy.goodwill = clampStat(tenancy.goodwill + 12);
    return {
      ok: true,
      title: 'Réparé',
      message: `${label} — ${cost} de travaux. ${tenancy ? 'Ton locataire s’en souviendra.' : ''}`.trim(),
      tone: 'neutral',
    };
  }
  if (choice === 'bâcler') {
    const spent = Math.round(cost * 0.35);
    p.money -= spent;
    prop.condition = clamp(prop.condition + severity * 0.3, 0, 100);
    if (tenancy) tenancy.goodwill = clampStat(tenancy.goodwill - 4);
    return {
      ok: true,
      title: 'Rafistolé',
      message: `${spent} dépensés. Ça tiendra un temps, et il faudra y revenir.`,
      tone: 'neutral',
    };
  }
  prop.condition = clamp(prop.condition - severity * 0.5, 0, 100);
  if (tenancy) {
    tenancy.goodwill = clampStat(tenancy.goodwill - 20);
    // Quelqu'un dont on ignore les demandes cesse d'entretenir le logement.
    tenancy.care = clampStat(tenancy.care - 12);
  }
  p.stats.karma = clampStat(p.stats.karma - 4);
  return {
    ok: true,
    title: 'Sans suite',
    message: tenancy
      ? 'Tu ne réponds pas. Le problème reste, et la personne qui vit avec s’en souviendra aussi.'
      : 'Tu laisses courir. Le bien s’abîme.',
    tone: 'bad',
  };
}

/** Ce qu'il faudrait demander au renouvellement pour rester au marché. */
export function renewalGap(state: GameState, prop: OwnedProperty): number {
  if (!prop.tenancy) return 0;
  return marketRent(state, prop) - prop.tenancy.rent;
}

/**
 * Renouveler le bail à un nouveau loyer.
 *
 * Augmenter fait partir ceux qui peuvent partir. Ne pas augmenter laisse le
 * loyer s'éroder derrière le marché, année après année — c'est le coût
 * silencieux d'un bon locataire qu'on veut garder.
 */
export function renewLease(ctx: Ctx, propertyId: string, newRent: number): ActionResult {
  const { state, rng } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  const tenancy = prop?.tenancy;
  if (!prop || !tenancy) return { ok: false, message: 'Aucun bail à renouveler.' };
  if (tenancy.yearsLeft > 0) {
    return { ok: false, title: 'Pas encore', message: 'Le bail court encore. On en reparlera à son terme.' };
  }
  const market = marketRent(state, prop);
  const asked = Math.round(clamp(newRent, market * 0.4, market * 2.4));
  const rise = asked / Math.max(1, tenancy.rent);
  const npc = tenantOf(state, prop);

  // Il part si la hausse dépasse ce qu'il peut ou veut supporter. Un
  // locataire content encaisse davantage — c'est là que la bonne volonté
  // accumulée se transforme en argent.
  const tolerance = 1.04 + tenancy.goodwill / 420;
  const leaves = rise > tolerance
    && rng.chance(clamp((rise - tolerance) * 3.4, 0.1, 0.95));

  if (leaves) {
    endTenancy(ctx, prop, 'il n’a pas voulu de la hausse');
    return {
      ok: true,
      title: 'Il s’en va',
      message: `${npc?.firstName ?? 'Ton locataire'} refuse le nouveau loyer et rend les clés. Le bien est vide.`,
      tone: 'bad',
    };
  }
  tenancy.rent = asked;
  tenancy.yearsLeft = rng.int(2, 6);
  tenancy.goodwill = clampStat(tenancy.goodwill - Math.max(0, (rise - 1) * 55));
  return {
    ok: true,
    title: 'Bail renouvelé',
    message: `${npc?.firstName ?? 'Ton locataire'} reste, à ${asked} par an.`,
    tone: 'good',
  };
}

/** Mettre fin au bail : coûteux, lent, et rarement propre. */
export function evictTenant(ctx: Ctx, propertyId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prop = p.properties.find((x) => x.id === propertyId);
  const tenancy = prop?.tenancy;
  if (!prop || !tenancy) return { ok: false, message: 'Il n’y a personne à faire partir.' };
  const npc = tenantOf(state, prop);

  if (tenancy.noticeYear === null) {
    tenancy.noticeYear = state.year;
    tenancy.goodwill = clampStat(tenancy.goodwill - 30);
    tenancy.care = clampStat(tenancy.care - 15);
    return {
      ok: true,
      title: 'Procédure engagée',
      message: `Tu demandes à ${npc?.firstName ?? 'ton locataire'} de partir. Ça prendra du temps, et d’ici là il n’a plus aucune raison de ménager le logement.`,
      tone: 'neutral',
    };
  }

  // La procédure aboutit, à un coût qui dépend de ce qu'on lui doit.
  const legalCost = Math.round(tenancy.rent * rng.float(0.3, 0.9));
  p.money -= legalCost;
  p.stats.karma = clampStat(p.stats.karma - 6);
  p.stats.stress = clampStat(p.stats.stress + 8);
  const lost = tenancy.arrears;
  endTenancy(ctx, prop, 'expulsé');
  return {
    ok: true,
    title: 'Départ',
    message: `${npc?.firstName ?? 'Le locataire'} est parti. ${legalCost} de frais, et ${lost > 0 ? `${Math.round(lost)} d’impayés que tu ne reverras pas.` : 'aucun impayé.'}`,
    tone: 'bad',
  };
}

/** Fin de bail, quelle qu'en soit la cause. */
function endTenancy(ctx: Ctx, prop: OwnedProperty, reason: string): void {
  const { state } = ctx;
  const tenancy = prop.tenancy;
  if (!tenancy) return;
  const npc = state.npcs[tenancy.personId];
  if (npc) {
    delete npc.flags.tenantOf;
    // Un ancien locataire mécontent ne redevient pas un inconnu.
    npc.opinion = clampStat(npc.opinion + (tenancy.goodwill - 50) * 0.4);
  }
  prop.tenancy = null;
  prop.rentedOut = false;
  prop.applicants = [];
  ctx.log('asset', `${npc ? fullName(npc) : 'Ton locataire'} quitte ${prop.name} (${reason}).`, 'neutral');
}

/** Reprendre le bien pour soi. */
export function stopRenting(ctx: Ctx, propertyId: string): ActionResult {
  const { state } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  if (prop.tenancy) {
    return {
      ok: false,
      title: 'Quelqu’un y habite',
      message: 'On ne récupère pas un logement occupé d’un claquement de doigts. Il faut engager le départ.',
    };
  }
  prop.rentedOut = false;
  prop.applicants = [];
  prop.askingRent = 0;
  return { ok: true, title: 'Retiré du marché', message: `${prop.name} n’est plus proposé à la location.`, tone: 'neutral' };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

const REPAIRS = [
  { label: 'La chaudière a lâché', rate: 0.022, severity: 10 },
  { label: 'Une fuite au plafond', rate: 0.03, severity: 14 },
  { label: 'L’électricité n’est plus aux normes', rate: 0.04, severity: 16 },
  { label: 'Les fenêtres ne ferment plus', rate: 0.018, severity: 9 },
  { label: 'De l’humidité dans la chambre', rate: 0.025, severity: 12 },
  { label: 'La toiture prend l’eau', rate: 0.05, severity: 20 },
];

/**
 * Une année de bailleur.
 *
 * Appelée par `advanceProperties` pour chaque bien. Elle encaisse ce qui
 * rentre — pas ce qui est dû —, use le logement à la mesure du soin qu'on en
 * prend, et fait vivre le bail.
 */
export function advanceTenancy(ctx: Ctx, prop: OwnedProperty): number {
  const { state, rng } = ctx;
  const p = state.player;
  const tenancy = prop.tenancy;

  // Vacance : on ne gagne rien et on paie quand même les charges.
  if (!tenancy) {
    if (prop.rentedOut) {
      prop.vacantYears += 1;
      prop.applicants = [];
      if (prop.vacantYears === 2) {
        ctx.log('asset', `${prop.name} est vide depuis deux ans. Le loyer demandé y est peut-être pour quelque chose.`, 'bad');
      }
    }
    return 0;
  }

  const npc = tenantOf(state, prop);
  if (!npc) {
    endTenancy(ctx, prop, 'décédé');
    return 0;
  }

  /* Ce qui rentre. Le loyer dû n'est pas le loyer payé. */
  const strain = tenancy.rent / Math.max(1, npc.salary * 0.33);
  // La probabilité d'impayé tient à trois choses : ce que le loyer pèse sur
  // ses revenus, la conjoncture, et ce qu'il pense de vous.
  const missChance = clamp(
    (strain - 0.85) * 0.55
    - state.world.economy * 0.09
    - (tenancy.goodwill - 50) / 320
    + (tenancy.noticeYear !== null ? 0.35 : 0),
    0.01, 0.85,
  );
  let collected = tenancy.rent;
  if (rng.chance(missChance)) {
    const missed = Math.round(tenancy.rent * rng.float(0.25, 1));
    collected -= missed;
    tenancy.arrears += missed;
    ctx.log('money', `${npc.firstName} n’a pas payé ${missed} de loyer sur ${prop.name}.`, 'bad');
  } else if (tenancy.arrears > 0 && rng.chance(0.4)) {
    // Il rattrape une partie de son retard.
    const caught = Math.round(Math.min(tenancy.arrears, tenancy.rent * rng.float(0.15, 0.5)));
    tenancy.arrears -= caught;
    collected += caught;
  }
  p.money += collected;
  p.rentCollectedThisYear += collected;

  /* Ce que le logement subit. */
  const neglect = (60 - tenancy.care) / 100;
  prop.condition = clamp(prop.condition - Math.max(0, neglect) * rng.float(1.5, 4), 0, 100);

  /* Ce qu'il demande. */
  const wearRisk = 0.1 + (100 - prop.condition) / 260;
  if (!prop.repair && rng.chance(wearRisk)) {
    const kind = rng.pick(REPAIRS);
    prop.repair = {
      year: state.year,
      label: kind.label,
      cost: Math.round(prop.value * kind.rate * rng.float(0.7, 1.3)),
      severity: kind.severity,
    };
    ctx.log('asset', `${prop.name} : ${kind.label.toLowerCase()}. ${npc.firstName} attend une réponse.`, 'bad');
  } else if (prop.repair && state.year - prop.repair.year >= 1) {
    // Une demande laissée sans réponse est une réponse.
    handleRepair(ctx, prop.id, 'refuser');
  }

  /* Le bail. */
  tenancy.yearsLeft = Math.max(0, tenancy.yearsLeft - 1);
  tenancy.goodwill = clampStat(tenancy.goodwill + (prop.condition > 65 ? 2 : -3));
  if (tenancy.noticeYear !== null && state.year - tenancy.noticeYear >= 2) {
    endTenancy(ctx, prop, 'la procédure a abouti');
    return collected;
  }
  if (tenancy.yearsLeft === 0) {
    // Un locataire mécontent ne se donne pas la peine d'attendre le
    // renouvellement pour partir.
    const stays = rng.chance(clamp(0.35 + tenancy.goodwill / 150, 0.15, 0.92));
    if (!stays) {
      endTenancy(ctx, prop, 'fin de bail');
    } else {
      ctx.log('asset', `Le bail de ${npc.firstName} arrive à terme sur ${prop.name}. À toi de fixer la suite.`, 'neutral');
    }
  }
  return collected;
}
