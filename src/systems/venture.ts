/**
 * Travailler pour soi.
 *
 * Le jeu ne connaissait qu'une seule façon de gagner sa vie : être embauché
 * par quelqu'un. Un chômeur n'avait rien à faire de son année, un retraité
 * non plus, et le mot « entreprise » ne désignait qu'un nom d'employeur.
 *
 * Deux formes manquaient, et elles ne se jouent pas de la même manière.
 *
 * **À son compte**, on vend son temps. Le seul levier est le tarif, et il
 * coupe des deux côtés : au-dessus de ce qu'on sait faire, les clients
 * s'en vont ; en dessous, on travaille beaucoup pour peu. Chaque métier a
 * sa propre élasticité, invisible, qu'il faut sentir — il n'existe pas un
 * bon tarif, il existe un bon tarif par métier.
 *
 * **Avec une entreprise**, on vend le travail des autres. Le levier central
 * est l'écart entre ce qu'on peut produire et ce que le marché veut : trop
 * d'employés, on paie des salaires pour rien ; trop peu, on refuse du
 * chiffre. Les prix, la présence du patron et l'investissement déplacent
 * l'un et l'autre, jamais dans le même sens.
 *
 * Règle commune aux deux : **le temps est fini**. Un salarié à plein temps
 * n'a pas d'année à consacrer à autre chose, et `timeBudget` le dit.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, BuyerOffer, FreelanceState, GameState, GigOffer, Person,
} from '../engine/types.ts';
import {
  BUSINESS_KINDS, INVOLVEMENT, PRICING, TRADES, getBusinessKind, getTrade,
  type BusinessKind, type Involvement, type Pricing, type Trade,
} from '../data/ventures.ts';
import { getCountry } from '../data/countries.ts';
import { getLocalOpportunities } from './contexts.ts';
import { advanceCrew, crewOf, crewSkill, crewWorth, payroll } from './crew.ts';
import { completedCourses, isInSchool } from './education.ts';
import { createPerson } from './npc.ts';
import { applyExperience } from './psyche.ts';
import { addLoan } from './finance.ts';

/* ------------------------------------------------------------------ */
/* Échelles                                                            */
/* ------------------------------------------------------------------ */

/** Tous les montants du catalogue sont exprimés en unités de base. */
export function priceIndex(state: GameState): number {
  return getCountry(state.player.countryId).salaryIndex * state.world.inflation;
}

/**
 * La part de l'année dont on dispose vraiment, 0-1.
 *
 * C'est ce qui empêche d'empiler un plein temps, une activité indépendante
 * et une entreprise pour tripler ses revenus : chacune prend de la place,
 * et ce qui reste borne ce qu'on peut produire.
 */
export function timeBudget(state: GameState): number {
  const p = state.player;
  if (p.prison) return 0;
  let free = 1;
  if (p.job) free -= clamp(p.job.hours / 40, 0.2, 1.4) * 0.72;
  if (isInSchool(state)) free -= p.age < 18 ? 0.42 : 0.5;
  if (p.business) {
    free -= p.business.involvement === 'total' ? 0.9
      : p.business.involvement === 'présent' ? 0.55 : 0.08;
  }
  // La santé et l'âge bornent ce qu'on peut abattre dans une année.
  const vigour = 0.55 + (p.stats.health / 100) * 0.45;
  const old = p.age > 70 ? 1 - Math.min(0.55, (p.age - 70) * 0.035) : 1;
  // Un plancher, et pas zéro : quelqu'un qui travaille et qui étudie trouve
  // encore quelques soirs. Un système qui rendrait exactement rien serait
  // indistinguable d'un système en panne.
  return clamp(free, 0.06, 1) * vigour * old;
}

/* ================================================================== */
/* À SON COMPTE                                                        */
/* ================================================================== */

/** Le métier est-il ouvert à ce personnage ? Renvoie la raison sinon. */
export function tradeBlocker(state: GameState, trade: Trade): string | null {
  const p = state.player;
  if (p.age < trade.minAge) return `Il faut avoir ${trade.minAge} ans.`;
  if (p.prison) return 'On ne prend pas de clients depuis une cellule.';
  if (trade.needsLevel !== undefined && p.education.level < trade.needsLevel) {
    return 'Personne ne te confierait ça sans le diplôme qui va avec.';
  }
  if (trade.needsCourse && !completedCourses(state).includes(trade.needsCourse)) {
    return 'Il faut la formation : c’est réglementé.';
  }
  return null;
}

/** Le tarif que le marché considère comme normal pour ce métier. */
export function marketFee(state: GameState, trade: Trade): number {
  return Math.max(1, Math.round(
    trade.baseFee * priceIndex(state) * getLocalOpportunities(state).salary,
  ));
}

/** Ce qu'on livre réellement, 0-100. */
export function craftDelivered(state: GameState, f: FreelanceState): number {
  const trade = getTrade(f.tradeId);
  if (!trade) return 0;
  const s = state.player.stats;
  return clampStat(f.craft * 0.55 + s[trade.driver] * 0.34 + s[trade.second] * 0.11);
}

/**
 * Ce que le tarif promet, 0-100.
 *
 * Un prix est une promesse : demander le double du marché, c'est annoncer
 * qu'on vaut le double. La différence entre cette promesse et ce qu'on
 * livre décide de tout le reste — le bouche-à-oreille, les litiges, et à
 * terme la survie de l'activité.
 */
export function feePromise(state: GameState, f: FreelanceState): number {
  const trade = getTrade(f.tradeId);
  if (!trade) return 50;
  const ratio = f.fee / marketFee(state, trade);
  return clamp(46 + (ratio - 1) * 48, 0, 130);
}

/** Combien de prestations l'année peut absorber, au tarif choisi. */
export function expectedMissions(state: GameState, f: FreelanceState): number {
  const trade = getTrade(f.tradeId);
  if (!trade) return 0;
  const ratio = Math.max(0.2, f.fee / marketFee(state, trade));
  // L'élasticité est propre au métier : au-dessus de 1, augmenter son tarif
  // fait perdre plus de clients qu'il ne rapporte.
  const priceEffect = clamp(ratio ** -trade.elasticity, 0.08, 2.6);
  // Un débutant ne prend qu'une fraction du marché, même en cassant les prix.
  const reach = 0.07 + (f.clientele / 100) * 0.93;
  const local = 0.65 + (getLocalOpportunities(state).hiring - 1) * 0.5
    + state.world.economy * 0.12
    + (state.player.stats.reputation - 50) / 260;
  const hurt = 1 - Math.min(0.45, f.disputes * 0.09);
  return Math.max(0, trade.volume * reach * priceEffect
    * clamp(local, 0.35, 1.5) * timeBudget(state) * hurt);
}

/** Le chiffre d'affaires qu'on peut attendre de l'année. */
export function expectedRevenue(state: GameState, f: FreelanceState): number {
  return Math.round(expectedMissions(state, f) * f.fee);
}

/** Se mettre à son compte. */
export function startFreelance(ctx: Ctx, tradeId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const trade = getTrade(tradeId);
  if (!trade) return { ok: false, message: 'Ce métier n’existe pas.' };
  if (p.freelance?.tradeId === tradeId) {
    return { ok: false, message: 'C’est déjà ce que tu fais.' };
  }
  const blocker = tradeBlocker(state, trade);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  if (p.yearActions.tradeSwitch) {
    return { ok: false, message: 'Tu as déjà changé d’activité cette année.' };
  }
  p.yearActions.tradeSwitch = 1;

  const previous = p.freelance;
  // Changer de métier ne remet pas tout à zéro : ce qu'on a appris ailleurs
  // sert un peu, et les anciens clients suivent parfois. Un peu.
  const carriedCraft = previous ? previous.craft * 0.22 : 0;
  const carriedClients = previous ? previous.clientele * 0.18 : 0;
  const stats = p.stats;
  p.freelance = {
    tradeId,
    since: state.year,
    fee: marketFee(state, trade),
    clientele: clampStat(carriedClients + 4 + stats.reputation / 14),
    craft: clampStat(carriedCraft + stats[trade.driver] * 0.3 + 8),
    lastRevenue: 0,
    earnedThisYear: 0,
    lastMissions: 0,
    offers: [],
    disputes: 0,
  };
  rollGigOffers(ctx);
  ctx.log('work', `Tu te mets à ton compte : ${trade.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: 'À ton compte',
    message: previous
      ? `Tu laisses tomber ${getTrade(previous.tradeId)?.label.toLowerCase() ?? 'l’ancienne activité'} pour ${trade.label.toLowerCase()}. Tu repars presque de zéro.`
      : `${trade.label} : personne ne te connaît encore. Le tarif est celui du marché, à toi de voir s’il te va.`,
    tone: 'neutral',
  };
}

/** Arrêter. */
export function stopFreelance(ctx: Ctx): ActionResult {
  const p = ctx.state.player;
  if (!p.freelance) return { ok: false, message: 'Tu n’as pas d’activité indépendante.' };
  const trade = getTrade(p.freelance.tradeId);
  p.freelance = null;
  return {
    ok: true,
    title: 'Rideau',
    message: `Tu arrêtes ${trade?.label.toLowerCase() ?? 'ton activité'}. Les clients trouveront quelqu’un d’autre.`,
    tone: 'neutral',
  };
}

/**
 * Fixer son tarif.
 *
 * L'action est libre et gratuite : c'est une décision, pas une dépense. Ce
 * qu'elle coûte se voit l'année suivante.
 */
export function setFee(ctx: Ctx, fee: number): ActionResult {
  const { state } = ctx;
  const f = state.player.freelance;
  if (!f) return { ok: false, message: 'Tu n’as pas d’activité indépendante.' };
  const trade = getTrade(f.tradeId);
  if (!trade) return { ok: false, message: 'Métier inconnu.' };
  const market = marketFee(state, trade);
  const before = f.fee;
  const next = Math.round(clamp(fee, market * 0.35, market * 3.2));
  const jump = (next - before) / Math.max(1, before);
  f.fee = next;
  // Doubler ses prix du jour au lendemain fait fuir une partie des habitués,
  // même si le nouveau tarif reste tenable. Baisser ne coûte rien : c'est
  // l'année suivante qui dira ce que ça rapporte.
  if (jump > 0.3) f.clientele = clampStat(f.clientele - jump * 22);
  const ratio = next / market;
  return {
    ok: true,
    title: 'Nouveau tarif',
    message: ratio > 1.35 ? 'Bien au-dessus du marché. Il va falloir le justifier.'
      : ratio < 0.75 ? 'En dessous du marché : tu auras du monde, et des journées longues.'
        : 'Dans les prix habituels.',
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Les commandes                                                       */
/* ------------------------------------------------------------------ */

const CLIENT_KINDS = [
  'Un particulier', 'Une petite association', 'Un commerçant du quartier',
  'Une entreprise', 'Un ancien client', 'Quelqu’un qui a eu ton nom',
  'Une mairie', 'Un couple', 'Un cabinet', 'Une école',
];

/** Trois ou quatre commandes concrètes, renouvelées chaque année. */
export function rollGigOffers(ctx: Ctx): void {
  const { state, rng } = ctx;
  const f = state.player.freelance;
  if (!f) return;
  const trade = getTrade(f.tradeId);
  if (!trade) return;
  const market = marketFee(state, trade);
  const count = 2 + (f.clientele > 35 ? 1 : 0) + (rng.chance(0.5) ? 1 : 0);
  const offers: GigOffer[] = [];
  for (let i = 0; i < count; i++) {
    // Un client exigeant paie mieux. C'est toute la décision : prendre le
    // gros contrat qu'on risque de rater, ou celui qu'on est sûr de tenir.
    const demand = clampStat(rng.gauss(48, 30, 8, 96));
    const generosity = 0.55 + (demand / 100) * 1.5 + rng.float(-0.18, 0.28);
    // La taille suit l'exigence : un gros chantier est rarement confié à
    // quelqu'un dont on n'attend rien. Sans cette corrélation, le hasard de
    // la taille noyait le signal, et le joueur ne pouvait plus lire que le
    // client difficile paie mieux — ce qui est tout l'arbitrage.
    const size = rng.float(0.9, 2.4) * (0.7 + (demand / 100) * 0.7);
    offers.push({
      id: ctx.id('gig'),
      client: rng.pick(CLIENT_KINDS),
      label: rng.pick(GIG_LABELS[trade.id] ?? ['Une commande']),
      fee: Math.max(1, Math.round(market * size * generosity)),
      demand,
      urgency: clampStat(rng.gauss(45, 32, 5, 98)),
      hint: demand > 72 ? 'Il sait exactement ce qu’il veut, et il le dira si ce n’est pas ça.'
        : demand > 45 ? 'Rien d’extravagant, mais il regardera le résultat.'
          : 'Il ne fera pas la différence, du moment que c’est fait.',
    });
  }
  f.offers = offers;
}

/** Quatre commandes par an au maximum : le reste, c'est le régime normal. */
export const GIG_LIMIT = 4;

export function gigBlocker(state: GameState): string | null {
  const p = state.player;
  if (!p.freelance) return 'Tu n’as pas d’activité indépendante.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (Number(p.yearActions.gig ?? 0) >= GIG_LIMIT) {
    return 'Tu as pris tout ce que tu pouvais tenir cette année.';
  }
  if (timeBudget(state) < 0.08) return 'Tu n’as plus une heure à toi cette année.';
  return null;
}

/** Accepter une commande. */
export function takeGig(ctx: Ctx, gigId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const f = p.freelance;
  if (!f) return { ok: false, message: 'Tu n’as pas d’activité indépendante.' };
  const blocker = gigBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const gig = f.offers.find((o) => o.id === gigId);
  if (!gig) return { ok: false, message: 'Cette commande n’est plus là.' };
  f.offers = f.offers.filter((o) => o.id !== gigId);
  p.yearActions.gig = Number(p.yearActions.gig ?? 0) + 1;

  const delivered = craftDelivered(state, f);
  // L'écart entre ce qu'il attend et ce qu'on sait faire, transformé en
  // probabilité. Un gros contrat pris trop tôt se paie.
  const margin = delivered - gig.demand;
  const success = clamp(0.5 + margin / 90, 0.06, 0.95);
  const strain = (gig.urgency / 100) * 9 + 3;
  p.stats.stress = clampStat(p.stats.stress + strain);

  if (rng.chance(success)) {
    p.money += gig.fee;
    f.earnedThisYear += gig.fee;
    f.craft = clampStat(f.craft + Math.max(0.6, (gig.demand - f.craft) / 12));
    f.clientele = clampStat(f.clientele + 2.5 + (gig.demand / 100) * 5);
    p.stats.happiness = clampStat(p.stats.happiness + 3);
    if (gig.demand > 70) {
      p.stats.reputation = clampStat(p.stats.reputation + 2);
      p.followers += Math.round((getTrade(f.tradeId)?.visibility ?? 0) * rng.float(2, 9));
    }
    ctx.log('work', `Commande livrée : ${gig.label.toLowerCase()} (${Math.round(gig.fee)}).`, 'good');
    return {
      ok: true,
      title: 'Livré',
      message: `${gig.client} paie ${Math.round(gig.fee)}. ${gig.demand > 70 ? 'Et il en parlera.' : 'Affaire réglée.'}`,
      tone: 'good',
    };
  }

  // Un travail refusé se paie en réputation, et parfois en remboursement.
  const partial = margin > -25 ? Math.round(gig.fee * rng.float(0.25, 0.55)) : 0;
  p.money += partial;
  f.earnedThisYear += partial;
  f.clientele = clampStat(f.clientele - 4 - (gig.demand / 100) * 6);
  f.disputes += 1;
  f.craft = clampStat(f.craft + 1.4); // on apprend quand même
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  p.stats.stress = clampStat(p.stats.stress + 6);
  if (gig.demand > 60) p.stats.reputation = clampStat(p.stats.reputation - 2);
  ctx.log('work', `Commande ratée : ${gig.client.toLowerCase()} n’a pas eu ce qu’il attendait.`, 'bad');
  return {
    ok: true,
    title: 'Ça n’a pas suffi',
    message: partial > 0
      ? `Le résultat ne correspond pas. Tu récupères ${partial} sur ${Math.round(gig.fee)}, et un client de moins.`
      : `Le résultat ne correspond à rien de ce qui était demandé. Tu ne seras pas payé${p.sex === 'F' ? 'e' : ''}.`,
    tone: 'bad',
  };
}

const GIG_LABELS: Record<string, string[]> = {
  menage: ['Un grand ménage de printemps', 'Un appartement à remettre en état', 'Un entretien hebdomadaire'],
  garde: ['Trois enfants pendant les vacances', 'Les soirs de la semaine', 'Un week-end entier'],
  livraison: ['Une tournée quotidienne', 'Un gros volume à écouler', 'Des livraisons de nuit'],
  bricolage: ['Une salle de bain à refaire', 'Des étagères et une porte qui ferme mal', 'Une remise à monter'],
  jardinage: ['Un parc à remettre en état', 'L’entretien de la saison', 'Une haie de cent mètres'],
  cours: ['Un élève à remonter avant le bac', 'Un groupe de quatre', 'Une préparation à un concours'],
  traduction: ['Un manuel technique', 'Un roman', 'Un dossier juridique urgent'],
  redaction: ['Le site d’une entreprise', 'Une série d’articles', 'Un discours'],
  web: ['Une boutique en ligne', 'La refonte complète d’un site', 'Une application interne'],
  graphisme: ['Une identité complète', 'Une campagne d’affiches', 'Un livre à mettre en page'],
  photo: ['Un mariage', 'Un catalogue de trois cents pièces', 'Une série de portraits'],
  musique: ['Un festival de quartier', 'Un mariage', 'Une résidence de trois soirs'],
  illustration: ['Une couverture', 'Vingt planches', 'Une série de portraits'],
  artisanat: ['Une commande pour une boutique', 'Un marché de Noël', 'Une pièce unique'],
  coiffure: ['Toute une noce', 'Une tournée en maison de retraite', 'Un client fidèle et difficile'],
  coaching: ['Une préparation de six mois', 'Un groupe en entreprise', 'Un retour de blessure'],
  contenu: ['Une série sponsorisée', 'Une vidéo longue', 'Une couverture d’événement'],
  reparation: ['Un lot de machines à remettre en marche', 'Une pièce introuvable', 'Un dépannage en urgence'],
  couture: ['Une robe de mariée', 'Des costumes de spectacle', 'Un lot de retouches'],
  patisserie: ['Un mariage de cent personnes', 'Une commande hebdomadaire', 'Une pièce montée'],
};

/* ------------------------------------------------------------------ */
/* L'année de l'indépendant                                            */
/* ------------------------------------------------------------------ */

function advanceFreelance(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const f = p.freelance;
  if (!f) return;
  const trade = getTrade(f.tradeId);
  if (!trade) { p.freelance = null; return; }

  if (p.prison) {
    // Une clientèle ne survit pas à une absence longue.
    f.clientele = clampStat(f.clientele - 22);
    f.lastRevenue = f.earnedThisYear;
    f.lastMissions = 0;
    f.offers = [];
    return;
  }

  const missions = expectedMissions(state, f) * rng.float(0.82, 1.18);
  const revenue = Math.round(missions * f.fee);
  p.money += revenue;
  f.earnedThisYear += revenue;
  f.lastRevenue = f.earnedThisYear;
  f.lastMissions = Math.round(missions);

  // Le bouche-à-oreille : il ne mesure pas la qualité, il mesure l'écart
  // entre la qualité et le prix. Un excellent artisan trop cher perd des
  // clients ; un artisan moyen bon marché en gagne.
  //
  // L'attrition est *proportionnelle* au carnet, pas fixe. Avec une perte
  // constante, un écart borné ne pouvait jamais la compenser et toute
  // clientèle finissait à zéro, quel que soit le prix demandé — ce qui
  // rendait le tarif décoratif. Proportionnelle, elle donne un point
  // d'équilibre par métier et par écart : la question devient « à quel
  // niveau ma clientèle se stabilise-t-elle ? », qui est la vraie question
  // d'un indépendant.
  const gap = craftDelivered(state, f) - feePromise(state, f);
  const attrition = (0.1 + (trade.elasticity - 1) * 0.05) * f.clientele;
  f.clientele = clampStat(f.clientele + 2.5 + gap / 6 - attrition);

  // On apprend en faisant, de moins en moins vite.
  const load = trade.volume > 0 ? Math.min(1.4, missions / trade.volume) : 0;
  f.craft = clampStat(f.craft + load * 9 * (1 - f.craft / 130) + 0.4);

  // Les litiges refroidissent.
  if (f.disputes > 0 && rng.chance(0.6)) f.disputes -= 1;
  if (gap < -30 && rng.chance(0.35)) {
    f.disputes += 1;
    p.stats.reputation = clampStat(p.stats.reputation - 2);
    ctx.log('work', 'Un client conteste ta facture : il estime ne pas en avoir eu pour son argent.', 'bad');
  }

  // Fatigue et intérêt entretenu.
  p.stats.stress = clampStat(p.stats.stress + load * trade.toll * 0.42 - 1);
  if (trade.interest) {
    const key = `exposé:${trade.interest}`;
    p.flags[key] = Math.min(6, Number(p.flags[key] ?? 0) + (load > 0.25 ? 1 : 0));
  }
  p.followers += Math.round(trade.visibility * load * rng.float(4, 16));

  if (revenue > 0 && f.since === state.year - 1) applyExperience(ctx, 'premierSalaire');
  if (revenue > 0) {
    ctx.log('money', `${trade.label} : ${f.lastMissions} prestation(s), ${revenue} encaissés.`, revenue > 0 ? 'good' : 'neutral');
  } else if (f.clientele < 6) {
    ctx.log('work', `Personne ne t’a appelé${p.sex === 'F' ? 'e' : ''} cette année.`, 'bad');
  }

  rollGigOffers(ctx);
}

/* ================================================================== */
/* L'ENTREPRISE                                                        */
/* ================================================================== */

/** Peut-on ouvrir cette maison ? Renvoie la raison sinon. */
export function foundBlocker(state: GameState, kind: BusinessKind): string | null {
  const p = state.player;
  if (p.business) return 'Tu en as déjà une. Une à la fois.';
  if (p.age < kind.minAge) return `Il faut avoir ${kind.minAge} ans.`;
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Il faudrait signer de ton vrai nom.';
  if (kind.needsLevel !== undefined && p.education.level < kind.needsLevel) {
    return 'Le niveau d’études ne suit pas.';
  }
  if (kind.needsCourse && !completedCourses(state).includes(kind.needsCourse)) {
    return 'Il faut la qualification : c’est réglementé.';
  }
  if (p.money + borrowable(state, kind) < startupCost(state, kind)) {
    // Le montant est déjà affiché à côté : le répéter en chiffres bruts
    // n'ajoute rien et se lit mal.
    return 'Ni l’épargne, ni de quoi emprunter la différence.';
  }
  return null;
}

/** La mise de départ, à l'échelle du pays. */
export function startupCost(state: GameState, kind: BusinessKind): number {
  return Math.round(kind.capital * priceIndex(state)
    * (0.8 + getLocalOpportunities(state).salary * 0.25));
}

/** Ce qu'une banque prêterait pour ce projet. */
export function borrowable(state: GameState, kind: BusinessKind): number {
  const p = state.player;
  const need = startupCost(state, kind);
  // On ne prête qu'à ceux qui mettent quelque chose : l'apport décide de
  // tout, et c'est le vrai avantage d'être né du bon côté.
  const contribution = Math.min(p.money, need);
  const trust = 0.4 + p.stats.reputation / 260 + p.financialLiteracy / 300
    - (p.loans.reduce((s, l) => s + l.balance, 0) > need ? 0.25 : 0);
  return Math.max(0, Math.round(contribution * clamp(trust * 3.2, 0.2, 2.4)));
}

/** Ouvrir. */
export function foundBusiness(ctx: Ctx, kindId: string, name?: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const kind = getBusinessKind(kindId);
  if (!kind) return { ok: false, message: 'Ce type d’entreprise n’existe pas.' };
  const blocker = foundBlocker(state, kind);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const need = startupCost(state, kind);
  const own = Math.min(p.money, need);
  const borrowed = need - own;
  p.money -= own;
  if (borrowed > 0) {
    addLoan(ctx, {
      kind: 'personal',
      label: `Prêt professionnel — ${name ?? kind.label}`,
      amount: borrowed,
      rate: 0.062,
      years: 10,
    });
  }

  const chosen = name?.trim() || `${rng.pick(kind.names)} ${p.lastName}`;
  p.chronicle.venturesRun += 1;
  p.business = {
    id: ctx.id('biz'),
    kindId,
    name: chosen,
    foundedYear: state.year,
    // Une partie de la mise reste en trésorerie : c'est elle qui absorbe la
    // première mauvaise année, et sans elle on ferme au premier accroc.
    cash: Math.round(need * 0.18),
    staff: 0,
    renown: clampStat(6 + p.stats.reputation / 8),
    quality: clampStat(38 + p.stats[kind.driver] * 0.32),
    pricing: 'normal',
    involvement: 'présent',
    managerId: null,
    debt: 0,
    drawnThisYear: 0,
    history: [],
    distress: 0,
    offers: [],
  };
  ctx.log('work', `Tu ouvres ${chosen}.`, 'good');
  return {
    ok: true,
    title: 'C’est ouvert',
    message: borrowed > 0
      ? `${chosen} existe. Tu as mis ${own} et emprunté ${borrowed}. La première année dira si c’était une bonne idée.`
      : `${chosen} existe. Tu as tout financé toi-même. La première année dira si c’était une bonne idée.`,
    tone: 'good',
  };
}

/* ------------------------------------------------------------------ */
/* Les leviers de l'entreprise                                         */
/* ------------------------------------------------------------------ */

export function setPricing(ctx: Ctx, pricing: Pricing): ActionResult {
  const b = ctx.state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  b.pricing = pricing;
  return { ok: true, title: 'Prix', message: PRICING[pricing].note, tone: 'neutral' };
}

export function setInvolvement(ctx: Ctx, involvement: Involvement): ActionResult {
  const b = ctx.state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  if (involvement === 'total' && ctx.state.player.job) {
    return {
      ok: false,
      title: 'Impossible',
      message: 'Tu ne peux pas y consacrer tes journées et garder ton emploi.',
    };
  }
  b.involvement = involvement;
  return { ok: true, title: 'Ta place', message: INVOLVEMENT[involvement].note, tone: 'neutral' };
}

/** Le coût annuel complet d'un salarié, à l'échelle du pays. */
export function wageOf(state: GameState, kind: BusinessKind): number {
  return Math.round(kind.wage * priceIndex(state) * getLocalOpportunities(state).salary);
}

export function hireStaff(ctx: Ctx, count = 1): ActionResult {
  const { state } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const kind = getBusinessKind(b.kindId);
  if (!kind) return { ok: false, message: 'Entreprise inconnue.' };
  // Une fois qu'on embauche des gens, on n'ajoute plus un effectif : les deux
  // vérités ne peuvent pas coexister sans que `staff` cesse de valoir le
  // nombre de personnes. On renvoie donc vers le recrutement nommé.
  if (crewOf(b).length > 0) {
    return {
      ok: false,
      title: 'Recruter',
      message: 'Tu embauches des gens, pas un effectif. Passe par les candidats.',
    };
  }
  if (b.staff + count > kind.ceiling * 3) {
    return { ok: false, title: 'Impossible', message: 'Le local ne tiendrait pas tout ce monde.' };
  }
  const wage = wageOf(state, kind);
  // Une embauche coûte avant de rapporter : recrutement, formation, mois
  // improductifs. Sans cela, embaucher serait une décision gratuite.
  const upfront = Math.round(wage * 0.3 * count);
  if (b.cash < upfront) {
    return {
      ok: false,
      title: 'Trésorerie insuffisante',
      message: `Recruter coûte ${upfront} avant le premier salaire. L’entreprise n’a que ${Math.round(b.cash)}.`,
    };
  }
  b.cash -= upfront;
  b.staff += count;
  // Chaque arrivée dilue un peu ce que le patron sait faire lui-même.
  b.quality = clampStat(b.quality - count * 2.2);
  return {
    ok: true,
    title: count > 1 ? `${count} embauches` : 'Embauche',
    message: `${b.staff} salarié(s). ${wage} par personne et par an, quoi qu’il arrive.`,
    tone: 'neutral',
  };
}

export function layOffStaff(ctx: Ctx, count = 1): ActionResult {
  const { state } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  if (b.staff === 0) return { ok: false, message: 'Il n’y a personne à licencier.' };
  if (crewOf(b).length > 0) {
    return {
      ok: false,
      title: 'Se séparer de quelqu’un',
      message: 'Tes salariés ont un nom. C’est de l’un d’eux qu’il faut se séparer.',
    };
  }
  const kind = getBusinessKind(b.kindId);
  const gone = Math.min(count, b.staff);
  const wage = kind ? wageOf(state, kind) : 0;
  const severance = Math.round(wage * 0.35 * gone);
  b.staff -= gone;
  b.cash -= severance;
  // Licencier se sait : les clients aussi lisent le journal local.
  b.renown = clampStat(b.renown - gone * 1.6);
  shiftStat(state, 'karma', -(gone * 1.5));
  state.player.stats.stress = clampStat(state.player.stats.stress + 5);
  return {
    ok: true,
    title: 'Licenciement',
    message: `${gone} départ(s), ${severance} d’indemnités. Il reste ${b.staff} salarié(s).`,
    tone: 'bad',
  };
}

/** Mettre de l'argent dans la maison : matériel, local, publicité. */
export function investInBusiness(ctx: Ctx, amount: number, into: 'qualité' | 'notoriété'): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const kind = getBusinessKind(b.kindId);
  if (!kind) return { ok: false, message: 'Entreprise inconnue.' };
  const sum = Math.round(Math.max(0, amount));
  if (sum <= 0) return { ok: false, message: 'Il faut y mettre quelque chose.' };
  const available = b.cash + p.money;
  if (sum > available) return { ok: false, message: 'Tu n’as pas cette somme.' };

  // On puise d'abord dans la trésorerie de l'entreprise, puis dans sa poche.
  const fromBiz = Math.min(b.cash, sum);
  b.cash -= fromBiz;
  p.money -= sum - fromBiz;

  // Le rendement est décroissant : la référence est le chiffre qu'une
  // personne produit. Doubler la mise ne double pas l'effet.
  const scale = kind.perHead * priceIndex(state);
  const effect = Math.sqrt(sum / Math.max(1, scale)) * 22;
  if (into === 'qualité') {
    b.quality = clampStat(b.quality + effect);
  } else {
    b.renown = clampStat(b.renown + effect * 1.15);
  }
  return {
    ok: true,
    title: into === 'qualité' ? 'Investissement' : 'Campagne',
    message: into === 'qualité'
      ? `${sum} dans le matériel et le savoir-faire. La qualité passe à ${Math.round(b.quality)}.`
      : `${sum} pour se faire connaître. La notoriété passe à ${Math.round(b.renown)}.`,
    tone: 'neutral',
  };
}

/** Se verser de l'argent. */
export function drawFromBusiness(ctx: Ctx, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const sum = Math.round(clamp(amount, 0, Math.max(0, b.cash)));
  if (sum <= 0) return { ok: false, message: 'La trésorerie est vide.' };
  b.cash -= sum;
  b.drawnThisYear += sum;
  p.money += sum;
  return {
    ok: true,
    title: 'Prélèvement',
    message: `Tu te verses ${sum}. Il reste ${Math.round(b.cash)} dans la caisse — c’est elle qui encaissera la prochaine mauvaise année.`,
    tone: 'neutral',
  };
}

/** Remettre de l'argent dedans. */
export function injectIntoBusiness(ctx: Ctx, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const sum = Math.round(clamp(amount, 0, Math.max(0, p.money)));
  if (sum <= 0) return { ok: false, message: 'Tu n’as pas cette somme.' };
  p.money -= sum;
  b.cash += sum;
  return { ok: true, title: 'Apport', message: `${sum} remis dans la caisse.`, tone: 'neutral' };
}

/* ------------------------------------------------------------------ */
/* Le gérant                                                           */
/* ------------------------------------------------------------------ */

/** Le gérant salarié, s'il existe encore. */
export function managerOf(state: GameState): Person | null {
  const b = state.player.business;
  if (!b?.managerId) return null;
  const npc = person(state, b.managerId);
  return npc?.alive ? npc : null;
}

/** Ce que coûte un gérant. */
export function managerWage(state: GameState, kind: BusinessKind): number {
  return Math.round(wageOf(state, kind) * 2.1);
}

/**
 * Recruter quelqu'un pour tenir la maison.
 *
 * C'est ce qui permet de s'absenter sans que tout se délite — mais un
 * gérant coûte deux salaires, et sa compétence n'est pas connue d'avance.
 */
export function hireManager(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  if (managerOf(state)) return { ok: false, message: 'Tu as déjà un gérant.' };
  const kind = getBusinessKind(b.kindId);
  if (!kind) return { ok: false, message: 'Entreprise inconnue.' };
  const wage = managerWage(state, kind);
  if (b.cash < wage * 0.4) {
    return {
      ok: false,
      title: 'Trésorerie insuffisante',
      message: `Un gérant coûte ${wage} par an, et il faut de quoi tenir le premier exercice.`,
    };
  }
  b.cash -= Math.round(wage * 0.4);
  const npc = createPerson(ctx, {
    relation: 'coworker',
    age: rng.int(28, 58),
    withJob: false,
    relationship: rng.int(35, 58),
    opinion: rng.int(38, 62),
    statsBias: { discipline: rng.stat(62, 20), intelligence: rng.stat(60, 20) },
  });
  npc.jobTitle = `Gérant de ${b.name}`;
  npc.flags.manager = true;
  npc.salary = wage;
  b.managerId = npc.id;
  return {
    ok: true,
    title: 'Gérant recruté',
    message: `${fullName(npc)} prend la maison en main. Tu ne sauras qu’à l’usage ce qu’il vaut.`,
    tone: 'neutral',
  };
}

export function dismissManager(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const npc = managerOf(state);
  if (!npc) return { ok: false, message: 'Il n’y a pas de gérant.' };
  b.managerId = null;
  npc.relationship = clampStat(npc.relationship - 25);
  npc.opinion = clampStat(npc.opinion - 30);
  if (b.involvement === 'absent') b.involvement = 'présent';
  return {
    ok: true,
    title: 'Gérant remercié',
    message: `${fullName(npc)} s’en va. C’est toi qui tiens la maison, désormais.`,
    tone: 'neutral',
  };
}

/** Ce que le gérant apporte réellement, 0-1. */
export function managerGrip(state: GameState): number {
  const npc = managerOf(state);
  if (!npc) return 0;
  const skill = npc.stats.discipline * 0.5 + npc.stats.intelligence * 0.3
    + npc.personality.ambition * 0.2;
  // Un gérant compétent mais qui vous méprise tient mal la maison : c'est la
  // même règle qu'au bureau, l'opinion transforme la compétence en résultat.
  return clamp((skill / 100) * (0.55 + npc.opinion / 220), 0, 1.1);
}

/* ------------------------------------------------------------------ */
/* Valeur et revente                                                   */
/* ------------------------------------------------------------------ */

/** Ce que la maison vaut, si quelqu'un devait la reprendre. */
export function businessValue(state: GameState): number {
  const b = state.player.business;
  if (!b) return 0;
  const kind = getBusinessKind(b.kindId);
  if (!kind) return 0;
  const recent = b.history.slice(0, 3);
  const avgProfit = recent.length
    ? recent.reduce((s, h) => s + h.profit, 0) / recent.length
    : 0;
  // Un repreneur achète un résultat, pas un chiffre d'affaires. Ce qu'il
  // paie en plus, c'est la clientèle : la notoriété et la qualité.
  const goodwill = 0.55 + (b.renown / 100) * 0.6 + (b.quality / 100) * 0.35;
  const earningsValue = Math.max(0, avgProfit) * kind.multiple * goodwill;
  // Une maison qui perd de l'argent vaut son matériel, moins ses dettes.
  const floor = startupCost(state, kind) * 0.28 * (b.quality / 100 + 0.35);
  return Math.round(Math.max(earningsValue, floor) + b.cash - b.debt);
}

const BUYER_NAMES = [
  'Un concurrent du quartier', 'Un groupe régional', 'Un ancien salarié',
  'Un investisseur', 'Un couple qui veut se lancer', 'Une chaîne',
  'Ton gérant', 'Un fonds de reprise',
];

/** Mettre la maison sur le marché : les repreneurs se manifestent. */
export function listBusiness(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const b = state.player.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  if (b.offers.length > 0) return { ok: false, message: 'Les offres sont déjà sur la table.' };
  if (state.year - b.foundedYear < 1) {
    return { ok: false, title: 'Trop tôt', message: 'Personne ne rachète une maison qui n’a pas fait un exercice.' };
  }
  const base = businessValue(state);
  if (base <= 0) {
    return {
      ok: false,
      title: 'Aucun repreneur',
      message: 'Ce que tu proposes ne vaut rien de plus que ses dettes. Il faudra fermer.',
    };
  }
  const offers: BuyerOffer[] = [];
  const clauses: BuyerOffer['clause'][] = ['aucune', 'accompagnement', 'echelonne', 'nom'];
  for (const clause of rng.sample(clauses, rng.int(2, 3))) {
    // Chaque clause a son prix : ce qui se paie cher se paie en autre chose.
    const bonus = clause === 'aucune' ? 0.86
      : clause === 'accompagnement' ? 1.12
        : clause === 'echelonne' ? 1.24 : 1.05;
    // Savoir ce que vaut sa maison évite de se faire acheter au rabais.
    const skill = 0.9 + state.player.financialLiteracy / 420
      + (state.player.stats.reputation - 50) / 700;
    offers.push({
      id: ctx.id('buy'),
      buyer: rng.pick(BUYER_NAMES),
      price: Math.round(base * bonus * skill * rng.float(0.88, 1.12)),
      clause,
      catch: clause === 'aucune' ? null
        : clause === 'accompagnement' ? 'Tu restes deux ans pour passer la main.'
          : clause === 'echelonne' ? 'Payé sur trois ans, si la maison tient.'
            : 'Ton nom reste sur la devanture, quoi qu’ils en fassent.',
    });
  }
  b.offers = offers;
  return {
    ok: true,
    title: 'Sur le marché',
    message: `${offers.length} repreneur(s) se sont manifestés. Ce qui se paie le mieux se paie en autre chose.`,
    tone: 'neutral',
  };
}

/** Accepter une offre de reprise. */
export function sellBusiness(ctx: Ctx, offerId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const offer = b.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette offre n’est plus valable.' };

  const name = b.name;
  const years = state.year - b.foundedYear;
  let cashed = offer.price;
  let note: string;
  switch (offer.clause) {
    case 'echelonne': {
      // Payé sur trois ans : ce qui vient plus tard peut ne pas venir.
      const holds = rng.chance(clamp(0.45 + b.quality / 260 + b.renown / 300, 0.3, 0.88));
      cashed = holds ? offer.price : Math.round(offer.price * rng.float(0.4, 0.68));
      note = holds
        ? 'Les échéances sont tombées, toutes.'
        : 'La maison a mal tourné entre leurs mains : les dernières échéances ne viendront pas.';
      break;
    }
    case 'accompagnement':
      p.stats.stress = clampStat(p.stats.stress + 14);
      note = 'Tu restes deux ans à regarder d’autres décider chez toi.';
      break;
    case 'nom':
      // Le nom sur la devanture engage la réputation, dans un sens ou dans l'autre.
      if (rng.chance(0.45)) {
        p.stats.reputation = clampStat(p.stats.reputation - 8);
        note = 'Ils ont gardé ton nom et abîmé ce qu’il y avait derrière.';
      } else {
        p.stats.reputation = clampStat(p.stats.reputation + 5);
        note = 'Ton nom continue de vivre sur la devanture, et il n’a pas à en rougir.';
      }
      break;
    default:
      note = 'Net, immédiat, sans conditions.';
  }

  p.money += cashed;
  p.lifetimeEarnings += Math.max(0, cashed);
  p.business = null;
  p.stats.happiness = clampStat(p.stats.happiness + (cashed > 0 ? 10 : -5));
  if (cashed > startupCost(state, getBusinessKind(b.kindId) ?? BUSINESS_KINDS[0]) * 2) {
    applyExperience(ctx, 'grandeRéussite');
  }
  ctx.log('money', `Tu as vendu ${name} pour ${cashed} après ${years} an(s).`, 'good');
  return {
    ok: true,
    title: 'Vendue',
    message: `${offer.buyer} reprend ${name} pour ${cashed}. ${note}`,
    tone: 'good',
  };
}

/** Fermer boutique. */
export function closeBusiness(ctx: Ctx, forced = false): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return { ok: false, message: 'Tu n’as pas d’entreprise.' };
  const kind = getBusinessKind(b.kindId);
  const name = b.name;

  // Liquidation : le matériel se revend mal, les dettes restent.
  const salvage = kind ? Math.round(startupCost(state, kind) * 0.14 * (b.quality / 100 + 0.3)) : 0;
  const owed = Math.max(0, b.debt - b.cash - salvage);
  p.money += Math.max(0, b.cash + salvage - b.debt);
  if (owed > 0) {
    // La caution personnelle : une part de la dette suit le patron. C'est
    // le vrai risque d'ouvrir, et il ne doit pas être escamoté.
    const personal = Math.round(owed * 0.4);
    if (p.money >= personal) {
      p.money -= personal;
    } else {
      addLoan(ctx, {
        kind: 'personal',
        label: `Caution personnelle — ${name}`,
        amount: personal - Math.max(0, p.money),
        rate: 0.11,
        years: 8,
      });
      p.money = 0;
    }
  }
  p.business = null;
  p.stats.happiness = clampStat(p.stats.happiness - (forced ? 20 : 8));
  p.stats.stress = clampStat(p.stats.stress + (forced ? 20 : 6));
  p.stats.reputation = clampStat(p.stats.reputation - (forced ? 7 : 2));
  if (forced) applyExperience(ctx, 'licenciement');
  ctx.log('work', forced ? `${name} a déposé le bilan.` : `Tu as fermé ${name}.`, 'bad');
  return {
    ok: true,
    title: forced ? 'Dépôt de bilan' : 'Fermeture',
    message: owed > 0
      ? `${name} n’existe plus, et ${Math.round(owed * 0.4)} de dettes te suivent personnellement.`
      : `${name} n’existe plus. Tu récupères ce qui pouvait l’être.`,
    tone: 'bad',
  };
}

/* ------------------------------------------------------------------ */
/* L'exercice                                                          */
/* ------------------------------------------------------------------ */

export interface BusinessForecast {
  /** Ce que la maison peut produire. */
  capacity: number;
  /** Ce que le marché veut. */
  demand: number;
  revenue: number;
  costs: number;
  profit: number;
}

/**
 * L'exercice tel qu'il se présente, sans le hasard de l'année.
 *
 * Sert à l'écran comme au moteur : le joueur voit les mêmes chiffres que
 * ceux qui décideront, ce qui rend l'arbitrage capacité/demande jouable au
 * lieu d'être subi.
 */
export function forecast(state: GameState): BusinessForecast {
  const b = state.player.business;
  const kind = b ? getBusinessKind(b.kindId) : undefined;
  if (!b || !kind) return { capacity: 0, demand: 0, revenue: 0, costs: 0, profit: 0 };

  const index = priceIndex(state) * (0.8 + getLocalOpportunities(state).salary * 0.25);
  const price = PRICING[b.pricing];

  // Capacité : ce que les bras présents peuvent produire. Le patron compte
  // pour ce qu'il donne ; au-delà de la taille naturelle du modèle, un bras
  // de plus ne produit presque plus rien.
  const boss = INVOLVEMENT[b.involvement].weight
    + (b.involvement === 'absent' ? managerGrip(state) * 0.85 : managerGrip(state) * 0.25);
  /*
   * Ce que les bras produisent — en **équivalents-salariés** et non en têtes.
   *
   * `crewWorth` rend la somme de ce que vaut chacun : quelqu'un d'excellent
   * pèse une personne et demie, quelqu'un de faible un peu plus d'une demie.
   * Deux très bons peuvent donc battre quatre moyens. Quand personne n'est
   * nommé — une entreprise d'avant `systems/crew.ts` — il rend simplement
   * l'effectif, et le calcul est identique à ce qu'il a toujours été.
   */
  const heads = crewWorth(b);
  const productive = heads <= kind.ceiling
    ? heads
    : kind.ceiling + (heads - kind.ceiling) * 0.3;
  const capacity = kind.perHead * index * (boss + productive)
    * (0.55 + (b.quality / 100) * 0.55);

  // Demande : ce que le marché veut de cette maison-là, à ce prix-là.
  const o = state.player.origin;
  const local = clamp(
    0.55 + (o.city.jobOpportunity - 50) / 220 + o.economy.growth / 26
    - (o.economy.businessClosure - 50) / 400,
    0.35, 1.5,
  );
  const pull = 0.2 + (b.renown / 100) * 1.05 + (b.quality / 100) * 0.35;
  const demand = kind.perHead * index * (1 + kind.ceiling) * pull * price.volume
    * local * (1 + state.world.economy * 0.2);

  const revenue = Math.min(capacity, demand);
  const gross = revenue * kind.margin * price.margin;
  const wage = wageOf(state, kind);
  const manager = managerOf(state) ? managerWage(state, kind) : 0;
  // La masse salariale est la somme des salaires réellement versés : un
  // patron qui a négocié paie moins, un patron qui a payé cher paie plus.
  const costs = kind.fixed * index + payroll(b, wage) + manager + b.debt * 0.085;

  return {
    capacity: Math.round(capacity),
    demand: Math.round(demand),
    revenue: Math.round(revenue),
    costs: Math.round(costs),
    profit: Math.round(gross - costs),
  };
}

function advanceBusiness(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const b = p.business;
  if (!b) return;
  const kind = getBusinessKind(b.kindId);
  if (!kind) { p.business = null; return; }

  // Le patron en prison ne dirige rien : sans gérant, la maison tombe.
  if (p.prison && !managerOf(state)) {
    b.quality = clampStat(b.quality - 14);
    b.renown = clampStat(b.renown - 10);
    b.involvement = 'absent';
  }

  const view = forecast(state);
  // L'aléa de l'année : une saison, une commande énorme, un mois mort.
  const swing = rng.gauss(1, 0.16 * kind.swing, 0.42, 1.85);
  const revenue = Math.round(view.revenue * swing);
  const gross = revenue * kind.margin * PRICING[b.pricing].margin;
  const profit = Math.round(gross - view.costs);

  b.cash += profit;
  b.history.unshift({ year: state.year, revenue, profit });
  if (b.history.length > 8) b.history.pop();

  // Ce qui sort de la maison : la présence du patron, ce qu'il vaut, et le
  // nombre de bras qu'il n'a pas le temps de regarder.
  const inv = INVOLVEMENT[b.involvement];
  const dilution = b.staff > kind.ceiling ? (b.staff - kind.ceiling) * 1.1 : 0;
  // Ce que vaut l'équipe pèse sur ce qui sort de la maison : une équipe très
  // bonne tire la qualité vers le haut, une équipe médiocre la tire vers le
  // bas. Sans personne de nommé, ce terme est nul et rien ne change.
  const hands = crewSkill(b);
  b.quality = clampStat(
    b.quality + inv.quality + (p.stats[kind.driver] - 50) / 22
    + managerGrip(state) * (b.involvement === 'absent' ? 7 : 2)
    + (hands === null ? 0 : (hands - 50) / 9)
    - dilution - 2.5,
  );

  // Et ceux qui travaillent pour vous vivent leur année : le moral suit ce
  // qu'on leur verse et la santé de la maison, l'ancienneté les rend
  // meilleurs, et ceux qui n'y croient plus s'en vont.
  advanceCrew(ctx, b);

  // La notoriété suit la qualité, avec un retard, et sanctionne le prix qui
  // ne se justifie pas.
  const overpriced = b.pricing === 'haut' && b.quality < 58 ? -4.5 : 0;
  const cheap = b.pricing === 'bas' ? 1.8 : 0;
  b.renown = clampStat(b.renown + (b.quality - 52) / 11 + overpriced + cheap - 2.2);

  p.stats.stress = clampStat(p.stats.stress + inv.toll * 0.5 - 2);
  if (b.involvement === 'total') p.stats.happiness = clampStat(p.stats.happiness - 2);

  // Trésorerie négative : on emprunte, et l'année suivante coûte plus cher.
  if (b.cash < 0) {
    b.debt += -b.cash;
    b.cash = 0;
  } else if (b.debt > 0) {
    const paid = Math.min(b.cash, Math.round(b.debt * 0.22));
    b.debt -= paid;
    b.cash -= paid;
  }

  // Un gérant mal payé de considération se sert lui-même.
  const manager = managerOf(state);
  if (manager && manager.opinion < 32 && b.cash > 0 && rng.chance(0.22)) {
    const taken = Math.round(b.cash * rng.float(0.08, 0.25));
    b.cash -= taken;
    ctx.log('money', `Un écart de ${taken} dans les comptes de ${b.name}. Personne ne l’explique.`, 'bad');
  }

  b.distress = profit < 0 ? b.distress + 1 : 0;
  if (b.distress >= 3 && b.debt > businessValue(state) + view.costs) {
    closeBusiness(ctx, true);
    return;
  }

  if (profit > 0) {
    ctx.log('money', `${b.name} : ${revenue} de chiffre, ${profit} de résultat.`, 'good');
  } else {
    ctx.log('money', `${b.name} : ${revenue} de chiffre, ${profit} de résultat.`, 'bad');
  }
  if (b.distress === 2) {
    ctx.log('work', `Deuxième exercice dans le rouge pour ${b.name}. Il va falloir décider.`, 'bad');
  }

  // Les offres de reprise ne restent pas éternellement sur la table.
  b.offers = [];
}

/* ================================================================== */
/* L'ANNÉE                                                             */
/* ================================================================== */

/**
 * Ce que les activités indépendantes ont rapporté cette année.
 *
 * Cet argent est déjà sur le compte : il a été crédité au moment où il a
 * été gagné. Le bilan annuel s'en sert pour l'assiette imposable, pas pour
 * l'encaissement — sinon il serait compté deux fois.
 */
export function ventureEarnings(state: GameState): number {
  const p = state.player;
  return Math.max(0, (p.freelance?.earnedThisYear ?? 0) + (p.business?.drawnThisYear ?? 0));
}

/** Remet les compteurs à zéro, une fois l'impôt calculé. */
export function clearVentureYear(state: GameState): void {
  const p = state.player;
  if (p.freelance) p.freelance.earnedThisYear = 0;
  if (p.business) p.business.drawnThisYear = 0;
}

/** L'année des activités à son compte. Après la carrière, avant le bilan. */
export function advanceVentures(ctx: Ctx): void {
  advanceFreelance(ctx);
  advanceBusiness(ctx);
}

/** Les métiers ouverts au personnage cette année. */
export function availableTrades(state: GameState): Trade[] {
  return TRADES.filter((t) => tradeBlocker(state, t) === null);
}

/** Les entreprises qu'on pourrait ouvrir. */
export function availableBusinesses(state: GameState): BusinessKind[] {
  return BUSINESS_KINDS.filter((k) => foundBlocker(state, k) === null);
}
