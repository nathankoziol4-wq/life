/**
 * Se présenter, puis gouverner.
 *
 * Le catalogue avait quatre reproches à la politique, et ils se ramenaient à
 * un seul : c'était **un métier de scène comme un autre**. On signait « une
 * candidature nationale » comme un rôle, on la tenait devant un public, et
 * l'accueil décidait de la suite. Ce fichier ajoute ce qui manquait, sans
 * toucher à ce qui existait — `stage.ts` garde la discipline `tribune`, le
 * métier politique acquis et les mandats qu'on y tient. La campagne est une
 * couche au-dessus, qui ne s'ouvre qu'à ceux qui ont déjà le métier.
 *
 * Cinq principes, et ils tiennent tous au même endroit : **une élection se
 * gagne sur des gens, pas sur un score**.
 *
 * **1. Le programme est un arbitrage.** Six axes, trois au plus, et chacun
 * plaît à certains blocs en déplaisant à d'autres. Deux axes peuvent se
 * contredire, et ceux qui lisent le programme en entier s'en aperçoivent.
 *
 * **2. La campagne coûte, et l'argent vient de quelque part.** Une collecte
 * ne rapporte que si l'on plaît déjà. De gros donateurs rapportent tout de
 * suite et se rappellent à vous pendant le mandat. Sa propre fortune ne doit
 * rien à personne, et coûte ce qu'elle coûte.
 *
 * **3. L'adversaire existe.** Il a un nom, un archétype, un programme et une
 * dynamique propre. Il fait campagne pendant que vous faites la vôtre.
 *
 * **4. Gouverner, c'est trancher.** Chaque année en fonction apporte une
 * décision dont **aucune option ne contente tout le monde**. Tenir une
 * promesse coûte ; y renoncer se voit.
 *
 * **5. La réélection est un vote.** Ce qu'on a fait pendant le mandat devient
 * le point de départ des intentions de vote suivantes.
 *
 * Rien n'est partisan : les blocs sont démographiques, les axes sont des
 * arbitrages budgétaires. Le jeu porte sur qui l'on fâche, jamais sur qui a
 * raison.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, Campaign, GameState, Mandate, Person,
} from '../engine/types.ts';
import {
  BLOCS, CAMPAIGN_MOVES, DECISIONS, FUNDING, MAX_PLANKS, OFFICES, PLANKS,
  RIVAL_KINDS, TACTICS, approvalLabel, getBloc, getDecision, getFunding,
  getOffice, getPlank, getTactic, pollLabel, tensionCount, votingWeight,
  type Decision, type Office,
} from '../data/politics.ts';
import { getCountry } from '../data/countries.ts';
import { createPerson } from './npc.ts';
import { shiftStat, shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';

export {
  approvalLabel, pollLabel, BLOCS, OFFICES, PLANKS, TACTICS, FUNDING, MAX_PLANKS,
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function campaignOf(state: GameState): Campaign | null {
  return state.player.campaign;
}

export function mandateOf(state: GameState): Mandate | null {
  return state.player.mandate;
}

export function officeOf(state: GameState): Office | null {
  const held = state.player.mandate;
  return held ? getOffice(held.officeId) ?? null : null;
}

/** Le métier politique acquis. Il vit dans `stage.ts` et n'est que lu ici. */
function craftOf(state: GameState): number {
  const stage = state.player.stage;
  return stage?.disciplineId === 'tribune' ? stage.craft : 0;
}

/** L'unité monétaire d'une campagne, à l'échelle du pays et de l'époque. */
export function politicalUnit(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return country.salaryIndex * state.world.inflation;
}

export function campaignCost(state: GameState, office: Office): number {
  return Math.round(office.cost * politicalUnit(state));
}

export function officePay(state: GameState, office: Office): number {
  return Math.round(office.pay * politicalUnit(state));
}

/**
 * Le score global, blocs pondérés par leur taille **et leur participation**.
 *
 * C'est là qu'un bloc peut peser sans compter : les jeunes sont quinze pour
 * cent de l'électorat et un peu moins de neuf pour cent des votants. Séduire
 * ceux qui ne se déplacent pas est un choix, et c'est un mauvais choix.
 */
export function tally(polls: Record<string, number>): number {
  let total = 0;
  let mass = 0;
  for (const bloc of BLOCS) {
    const weight = votingWeight(bloc);
    total += (polls[bloc.id] ?? 0) * weight;
    mass += weight;
  }
  return mass > 0 ? total / mass : 0;
}

/** Ta part du vote, adversaire compris, en pourcentage. */
export function share(campaign: Campaign): number {
  const mine = tally(campaign.polls);
  const theirs = tally(campaign.rivalPolls);
  const sum = mine + theirs;
  return sum > 0 ? (mine / sum) * 100 : 50;
}

/** L'adversaire, s'il est encore dans la partie. */
export function rivalOf(state: GameState): Person | null {
  const campaign = state.player.campaign;
  return campaign ? person(state, campaign.rivalId) : null;
}

/** Ce qu'il reste à dépenser. */
export function warChest(state: GameState): number {
  const campaign = state.player.campaign;
  return campaign ? Math.max(0, campaign.funds - campaign.spent) : 0;
}

export function movesLeft(state: GameState): number {
  const campaign = state.player.campaign;
  return campaign ? Math.max(0, CAMPAIGN_MOVES - campaign.moves) : 0;
}

/* ------------------------------------------------------------------ */
/* Se déclarer                                                         */
/* ------------------------------------------------------------------ */

export function candidacyBlocker(state: GameState, office: Office): string | null {
  const p = state.player;
  if (p.campaign) return 'Tu es déjà en campagne.';
  if (p.mandate) return 'Tu as un mandat à finir.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Il faudrait se montrer, et donner son nom.';
  if (p.age < office.minAge) return `Il faut avoir ${office.minAge} ans.`;
  if (craftOf(state) < office.craft) {
    return `Il faut savoir faire ce métier — ${office.craft} au moins.`;
  }
  if (p.fame.level < office.fame) return `Il faut qu’on te connaisse — ${office.fame} de notoriété.`;
  return null;
}

export function availableOffices(state: GameState): Office[] {
  return OFFICES.filter((o) => candidacyBlocker(state, o) === null);
}

/**
 * Le point de départ des intentions de vote.
 *
 * Personne ne part de zéro et personne ne part gagnant : ce qu'on vaut au
 * premier jour vient du métier acquis, du nom qu'on s'est fait, et — si l'on
 * a déjà gouverné — de ce qu'on a laissé. C'est le raccord qui manquait
 * entre un mandat et le suivant.
 */
function openingPolls(state: GameState, office: Office): Record<string, number> {
  const p = state.player;
  const base = 22 + craftOf(state) * 0.16 + Math.min(18, p.fame.level * 0.2)
    + (p.stats.reputation - 50) * 0.1;
  const polls: Record<string, number> = {};
  for (const bloc of BLOCS) {
    // Ce qu'un sortant a laissé chez chaque bloc pèse plus que tout le reste.
    const legacy = Number(p.flags[`polls_${office.id}_${bloc.id}`] ?? 0);
    polls[bloc.id] = clampStat(base + (legacy > 0 ? (legacy - 50) * 0.55 : 0));
  }
  return polls;
}

/** Se présenter. Cela crée un adversaire, et engage l'année. */
export function declareRun(ctx: Ctx, officeId: string): ActionResult {
  const { state, rng } = ctx;
  const office = getOffice(officeId);
  if (!office) return { ok: false, message: 'Ce siège n’existe pas.' };
  const blocker = candidacyBlocker(state, office);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  // L'adversaire est un vrai PNJ : on le croisera encore après le scrutin.
  const kind = RIVAL_KINDS[rng.int(0, RIVAL_KINDS.length - 1)];
  const rival = createPerson(ctx, {
    // `acquaintance` et non un lien inventé : l'adversaire est quelqu'un
    // qu'on connaît sans être proche, et il reste dans la partie après le
    // scrutin — on peut le recroiser des années plus tard.
    relation: 'acquaintance',
    age: state.player.age + rng.int(-12, 16),
    withJob: false,
    relationship: rng.int(15, 35),
    opinion: rng.int(15, 40),
  });
  rival.jobTitle = 'Candidat';
  rival.flags.rivalKind = kind.id;

  const pool = [...PLANKS];
  const rivalPlanks: string[] = [];
  for (let i = 0; i < kind.planks && pool.length > 0; i++) {
    rivalPlanks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0].id);
  }

  const polls = openingPolls(state, office);
  const rivalPolls: Record<string, number> = {};
  for (const bloc of BLOCS) {
    rivalPolls[bloc.id] = clampStat(office.rival * 0.55 * kind.strength + rng.float(-6, 6));
  }
  applyPlanks(rivalPolls, rivalPlanks, 0.8);

  state.player.campaign = {
    officeId: office.id,
    since: state.year,
    planks: [],
    funds: 0,
    spent: 0,
    polls,
    rivalId: rival.id,
    rivalKind: kind.id,
    rivalPlanks,
    rivalPolls,
    moves: 0,
    damage: 0,
    debate: null,
    log: [],
  };
  ctx.log('work', `Tu te présentes : ${office.label.toLowerCase()}. En face, ${fullName(rival)}.`, 'neutral');
  return {
    ok: true,
    title: 'Candidature déposée',
    tone: 'neutral',
    message: `${office.note} En face : ${fullName(rival)}, ${kind.label.toLowerCase()}. ${
      kind.note} Tu as ${CAMPAIGN_MOVES} coups à jouer avant le scrutin.`,
  };
}

/** Applique l'effet d'un programme sur des intentions de vote. */
function applyPlanks(
  polls: Record<string, number>,
  planks: string[],
  scale = 1,
): void {
  for (const id of planks) {
    const plank = getPlank(id);
    if (!plank) continue;
    for (const [blocId, amount] of Object.entries(plank.appeal)) {
      polls[blocId] = clampStat((polls[blocId] ?? 0) + (amount as number) * scale);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Le programme                                                        */
/* ------------------------------------------------------------------ */

export function plankBlocker(state: GameState, plankId: string): string | null {
  const campaign = state.player.campaign;
  if (!campaign) return 'Tu n’es pas en campagne.';
  if (campaign.planks.includes(plankId)) return null;
  if (campaign.planks.length >= MAX_PLANKS) {
    return `Trois axes au plus — au-delà, plus personne ne retient rien.`;
  }
  return null;
}

/**
 * Ajouter ou retirer un axe de programme.
 *
 * Gratuit en coups : construire son programme n'est pas une semaine de
 * campagne, c'est ce qu'on décide avant de commencer. Ce qui coûte, c'est
 * qu'il n'y a que trois places et six axes.
 */
export function togglePlank(ctx: Ctx, plankId: string): ActionResult {
  const { state } = ctx;
  const campaign = state.player.campaign;
  const plank = getPlank(plankId);
  if (!campaign || !plank) return { ok: false, message: 'Tu n’es pas en campagne.' };
  const blocker = plankBlocker(state, plankId);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  // On recalcule à partir de la base : appliquer puis retirer des effets un
  // par un dérive, parce que les intentions sont bornées à chaque écriture.
  const office = getOffice(campaign.officeId);
  if (!office) return { ok: false, message: 'Ce siège n’existe pas.' };
  const dropping = campaign.planks.includes(plankId);
  campaign.planks = dropping
    ? campaign.planks.filter((id) => id !== plankId)
    : [...campaign.planks, plankId];

  const fresh = openingPolls(state, office);
  applyPlanks(fresh, campaign.planks);
  // Ce qui a déjà été gagné sur le terrain ne se perd pas quand on change
  // d'axe : on garde l'écart accumulé par les coups joués.
  const earned = Number(state.player.flags.campaignEarned ?? 0);
  const tension = tensionCount(campaign.planks);
  for (const bloc of BLOCS) {
    // Ceux qui lisent le programme en entier sont ceux que la contradiction
    // fait fuir. Les autres ne s'en aperçoivent pas.
    const notice = bloc.id === 'diplomes' ? 7 : 2.5;
    campaign.polls[bloc.id] = clampStat(fresh[bloc.id] + earned - tension * notice);
  }
  return {
    ok: true,
    title: dropping ? 'Axe retiré' : plank.label,
    tone: 'neutral',
    message: dropping
      ? `Tu n’en parleras plus.`
      : `« ${plank.promise} »${tension > 0 ? ' Ton programme se contredit quelque part, et cela se verra.' : ''}`,
  };
}

/* ------------------------------------------------------------------ */
/* L'argent                                                            */
/* ------------------------------------------------------------------ */

export function fundBlocker(state: GameState, sourceId: string): string | null {
  const campaign = state.player.campaign;
  const source = getFunding(sourceId);
  if (!campaign || !source) return 'Tu n’es pas en campagne.';
  if (movesLeft(state) <= 0) return 'Plus de temps avant le scrutin.';
  const key = `fund_${sourceId}`;
  if (Number(state.player.yearActions[key] ?? 0) >= 2) {
    return 'Tu as déjà tiré sur cette corde deux fois.';
  }
  if (source.ownPocket) {
    const office = getOffice(campaign.officeId);
    const want = office ? campaignCost(state, office) * source.yield : 0;
    if (state.player.money < want) return 'Tu n’as pas cette somme.';
  }
  return null;
}

/** Ce que rapporterait cette source aujourd'hui. */
export function fundYield(state: GameState, sourceId: string): number {
  const campaign = state.player.campaign;
  const source = getFunding(sourceId);
  const office = campaign ? getOffice(campaign.officeId) : null;
  if (!campaign || !source || !office) return 0;
  const base = campaignCost(state, office) * source.yield;
  // Une collecte ne rapporte que si l'on plaît déjà : c'est ce qui empêche
  // de financer une campagne perdue d'avance en cliquant plus fort.
  const popular = source.popular ? 0.35 + (share(campaign) / 100) * 1.3 : 1;
  return Math.round(base * popular);
}

export function raiseFunds(ctx: Ctx, sourceId: string): ActionResult {
  const { state, rng } = ctx;
  const campaign = state.player.campaign;
  const source = getFunding(sourceId);
  if (!campaign || !source) return { ok: false, message: 'Tu n’es pas en campagne.' };
  const blocker = fundBlocker(state, sourceId);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const key = `fund_${sourceId}`;
  state.player.yearActions[key] = Number(state.player.yearActions[key] ?? 0) + 1;
  campaign.moves += 1;

  const amount = Math.round(fundYield(state, sourceId) * rng.float(0.85, 1.15));
  campaign.funds += amount;
  if (source.ownPocket) state.player.money -= amount;
  if (source.damage) campaign.damage = clampStat(campaign.damage + source.damage);

  campaign.log.push(`${source.label} : ${amount}.`);
  return {
    ok: true,
    title: source.label,
    tone: 'good',
    message: `${amount} de plus dans la caisse. ${source.note}`,
  };
}

/* ------------------------------------------------------------------ */
/* Les coups de campagne                                               */
/* ------------------------------------------------------------------ */

export function tacticCost(state: GameState, tacticId: string): number {
  const campaign = state.player.campaign;
  const tactic = getTactic(tacticId);
  const office = campaign ? getOffice(campaign.officeId) : null;
  if (!campaign || !tactic || !office) return 0;
  return Math.round(campaignCost(state, office) * tactic.cost);
}

export function tacticBlocker(state: GameState, tacticId: string): string | null {
  const campaign = state.player.campaign;
  const tactic = getTactic(tacticId);
  if (!campaign || !tactic) return 'Tu n’es pas en campagne.';
  if (movesLeft(state) <= 0) return 'Plus de temps avant le scrutin.';
  if (warChest(state) < tacticCost(state, tacticId)) return 'La caisse est vide.';
  if (tactic.craft && craftOf(state) < tactic.craft) {
    return `Il faut savoir s’y prendre — ${tactic.craft} de métier.`;
  }
  return null;
}

/**
 * Jouer un coup.
 *
 * `targetBloc` ne sert qu'au ciblage : partout ailleurs il est ignoré. C'est
 * volontairement la seule tactique qui demande de désigner quelqu'un — les
 * autres portent où elles portent, et le joueur doit faire avec.
 */
export function playTactic(ctx: Ctx, tacticId: string, targetBloc?: string): ActionResult {
  const { state, rng } = ctx;
  const campaign = state.player.campaign;
  const tactic = getTactic(tacticId);
  if (!campaign || !tactic) return { ok: false, message: 'Tu n’es pas en campagne.' };
  const blocker = tacticBlocker(state, tacticId);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  campaign.moves += 1;
  campaign.spent += tacticCost(state, tacticId);

  // La notoriété amplifie ce qui passe par les médias, et rien d'autre.
  const reach = tactic.amplified ? 0.5 + Math.min(1.6, state.player.fame.level / 45) : 1;
  const touched: string[] = [];
  for (const [blocId, amount] of Object.entries(tactic.moves)) {
    const gain = (amount as number) * reach * rng.float(0.75, 1.25);
    campaign.polls[blocId] = clampStat((campaign.polls[blocId] ?? 0) + gain);
    if (gain > 0) touched.push(getBloc(blocId)?.label ?? blocId);
  }

  // Le ciblage : tout sur un bloc, et rien pour les autres.
  if (tacticId === 'ciblage') {
    const bloc = getBloc(targetBloc ?? '') ?? BLOCS[rng.int(0, BLOCS.length - 1)];
    campaign.polls[bloc.id] = clampStat((campaign.polls[bloc.id] ?? 0) + 15 * rng.float(0.8, 1.2));
    touched.push(bloc.label);
  }

  let backfire = '';
  if (tactic.againstRival) {
    for (const bloc of BLOCS) {
      campaign.rivalPolls[bloc.id] = clampStat(
        (campaign.rivalPolls[bloc.id] ?? 0) - tactic.againstRival * rng.float(0.7, 1.3),
      );
    }
    // Une partie de ce qu'on jette revient : c'est la règle du coup facile.
    if (rng.chance(0.45)) {
      for (const bloc of BLOCS) {
        campaign.polls[bloc.id] = clampStat((campaign.polls[bloc.id] ?? 0) - rng.float(2, 6));
      }
      backfire = ' Une partie t’est revenue dessus.';
    }
  }
  if (tactic.damage) campaign.damage = clampStat(campaign.damage + tactic.damage);

  const earned = Number(state.player.flags.campaignEarned ?? 0);
  state.player.flags.campaignEarned = earned + 1.5;
  campaign.log.push(tactic.label);
  return {
    ok: true,
    title: tactic.label,
    tone: backfire ? 'neutral' : 'good',
    message: `${touched.length > 0 ? `Ça bouge chez : ${touched.join(', ')}.` : tactic.note}${backfire}`,
  };
}

/* ------------------------------------------------------------------ */
/* Le débat                                                            */
/* ------------------------------------------------------------------ */

export function debateBlocker(state: GameState): string | null {
  const campaign = state.player.campaign;
  if (!campaign) return 'Tu n’es pas en campagne.';
  if (campaign.debate !== null) return 'Il n’y en a qu’un.';
  if (movesLeft(state) <= 0) return 'Plus de temps avant le scrutin.';
  return null;
}

/** Ce que la confrontation demande, pour le mini-jeu de prestation. */
export function debateDifficulty(state: GameState): number {
  const campaign = state.player.campaign;
  const office = campaign ? getOffice(campaign.officeId) : null;
  if (!campaign || !office) return 50;
  const kind = RIVAL_KINDS.find((k) => k.id === campaign.rivalKind);
  return clampStat(office.rival * (kind?.strength ?? 1));
}

/**
 * Régler le débat.
 *
 * Le seul coup dont l'effet dépend de ce que le joueur a fait et non de ce
 * qu'il a payé — et le seul qui puisse renverser une campagne mal partie.
 * `quality` vient du mini-jeu de prestation, ou de la résolution automatique.
 */
export function settleDebate(ctx: Ctx, quality: number): ActionResult {
  const { state, rng } = ctx;
  const campaign = state.player.campaign;
  if (!campaign) return { ok: false, message: 'Tu n’es pas en campagne.' };
  const blocker = debateBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  campaign.moves += 1;
  const craft = craftOf(state);
  // Le personnage compte autant que le joueur, comme partout ailleurs.
  const outcome = clampStat(craft * 0.45 + quality * 55);
  campaign.debate = outcome;

  // Un débat déplace beaucoup, dans les deux sens. C'est ce qui en fait le
  // moment de la campagne, et non un coup de plus.
  const swing = (outcome - 48) * 0.34;
  for (const bloc of BLOCS) {
    // Ceux qui regardent un débat en entier ne sont pas tout le monde.
    const attention = bloc.id === 'diplomes' ? 1.5 : bloc.id === 'aines' ? 1.25
      : bloc.id === 'jeunes' ? 0.6 : 1;
    campaign.polls[bloc.id] = clampStat(
      (campaign.polls[bloc.id] ?? 0) + swing * attention * rng.float(0.85, 1.15),
    );
    campaign.rivalPolls[bloc.id] = clampStat(
      (campaign.rivalPolls[bloc.id] ?? 0) - swing * attention * 0.5,
    );
  }
  campaign.log.push(`Débat : ${outcome >= 55 ? 'gagné' : outcome >= 42 ? 'sans vainqueur' : 'perdu'}.`);
  return {
    ok: true,
    title: outcome >= 55 ? 'Tu as pris le dessus' : outcome >= 42 ? 'Match nul' : 'Ça s’est mal passé',
    tone: outcome >= 55 ? 'good' : outcome >= 42 ? 'neutral' : 'bad',
    message: outcome >= 55
      ? 'On ne retiendra qu’une phrase, et elle est de toi.'
      : outcome >= 42
        ? 'Personne n’a gagné, ce qui arrange celui qui menait.'
        : 'On ne retiendra qu’une phrase, et elle n’est pas de toi.',
  };
}

/* ------------------------------------------------------------------ */
/* Le scrutin                                                          */
/* ------------------------------------------------------------------ */

/**
 * Le jour du vote.
 *
 * Trois choses seulement : ce que valent les intentions pondérées par la
 * participation, ce que les casseroles ont coûté, et l'incertitude d'un
 * scrutin — que rien ne supprime, même à trente points d'avance.
 */
export function holdElection(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const campaign = state.player.campaign;
  const office = campaign ? getOffice(campaign.officeId) : null;
  if (!campaign || !office) return { ok: false, message: 'Tu n’es pas en campagne.' };

  const mine = tally(campaign.polls) - campaign.damage * 0.22;
  const theirs = tally(campaign.rivalPolls);
  const sum = Math.max(1, mine + theirs);
  const result = clamp((mine / sum) * 100 + rng.float(-4.5, 4.5), 0, 100);
  const won = result > 50;

  // Ce qu'on laisse chez chaque bloc sert de point de départ à la prochaine
  // fois : c'est ce qui relie une campagne à la suivante.
  for (const bloc of BLOCS) {
    state.player.flags[`polls_${office.id}_${bloc.id}`] = Math.round(campaign.polls[bloc.id] ?? 0);
  }
  state.player.flags.campaignEarned = 0;
  const rival = person(state, campaign.rivalId);
  state.player.campaign = null;

  if (!won) {
    ctx.log('work', `Scrutin perdu : ${result.toFixed(1)} %.`, 'bad');
    shiftStats(state, { happiness: -12, reputation: -4 });
    applyExperience(ctx, 'échecPolitique');
    if (rival) rival.opinion = clampStat(rival.opinion + 10);
    return {
      ok: true,
      title: 'Battu',
      tone: 'bad',
      message: `${result.toFixed(1)} % contre ${(100 - result).toFixed(1)}. ${
        rival ? `${fullName(rival)} l’emporte.` : ''} ${
        campaign.damage > 30 ? 'Les affaires ont pesé plus que le programme.' : ''}`,
    };
  }

  const approval: Record<string, number> = {};
  for (const bloc of BLOCS) approval[bloc.id] = clampStat(campaign.polls[bloc.id] ?? 50);
  state.player.mandate = {
    officeId: office.id,
    from: state.year,
    yearsLeft: office.term,
    promises: [...campaign.planks],
    kept: 0,
    broken: 0,
    approval,
    pending: null,
    record: [],
    earnedThisYear: 0,
    terms: Number(state.player.flags[`terms_${office.id}`] ?? 0) + 1,
  };
  state.player.flags[`terms_${office.id}`] = state.player.mandate.terms;
  // Avoir exercé un mandat public compte comme un service rendu, et ouvre
  // l'anoblissement (`systems/royalty.ts#meritOf`). Le drapeau survit au
  // mandat, parce que ce qu'on a exercé ne s'annule pas quand il s'achève.
  state.player.flags.heldOffice = true;
  state.player.fame.level = clampStat(state.player.fame.level + office.visibility);
  ctx.log('work', `Élu : ${office.label.toLowerCase()} — ${result.toFixed(1)} %.`, 'good');
  shiftStats(state, { happiness: 14, reputation: 6 });
  applyExperience(ctx, 'élection');
  return {
    ok: true,
    title: 'Élu',
    tone: 'good',
    message: `${result.toFixed(1)} %. ${office.term} ans, et ${
      campaign.planks.length} promesse(s) que l’on te rappellera.`,
  };
}

/* ------------------------------------------------------------------ */
/* Gouverner                                                           */
/* ------------------------------------------------------------------ */

/** L'opinion moyenne, pondérée comme un vote. */
export function approvalOf(state: GameState): number {
  const held = state.player.mandate;
  return held ? tally(held.approval) : 0;
}

/** La décision de l'année, si elle est posée. */
export function pendingDecision(state: GameState): Decision | null {
  const held = state.player.mandate;
  return held?.pending ? getDecision(held.pending) ?? null : null;
}

/**
 * Trancher.
 *
 * Aucune option ne contente tout le monde : c'est la seule règle du
 * catalogue de décisions, et elle est vérifiée par un test. Tenir une
 * promesse compte ; y renoncer aussi, et davantage.
 */
export function decide(ctx: Ctx, optionIndex: number): ActionResult {
  const { state } = ctx;
  const held = state.player.mandate;
  const decision = pendingDecision(state);
  const office = officeOf(state);
  if (!held || !decision || !office) return { ok: false, message: 'Rien à trancher.' };
  const option = decision.options[optionIndex];
  if (!option) return { ok: false, message: 'Ce choix n’existe pas.' };

  for (const [blocId, amount] of Object.entries(option.effect)) {
    held.approval[blocId] = clampStat((held.approval[blocId] ?? 50) + (amount as number));
  }
  const cost = Math.round(officePay(state, office) * option.cost * 3);
  if (cost !== 0) state.player.money -= cost;
  shiftStat(state, 'karma', option.karma);

  // Une promesse ne compte que si on l'avait faite. Tenir un axe qu'on
  // n'avait jamais porté n'est pas tenir une promesse.
  if (option.keeps && held.promises.includes(option.keeps)) {
    held.kept += 1;
    held.approval[bestBlocFor(option.keeps)] = clampStat(
      (held.approval[bestBlocFor(option.keeps)] ?? 50) + 4,
    );
  }
  if (option.breaks && held.promises.includes(option.breaks)) {
    held.broken += 1;
    // Renoncer coûte partout, et pas seulement chez ceux que ça concernait.
    for (const bloc of BLOCS) {
      held.approval[bloc.id] = clampStat((held.approval[bloc.id] ?? 50) - 5);
    }
  }

  held.record.push(`${decision.title} — ${option.label.toLowerCase()}`);
  held.pending = null;
  ctx.log('work', `${decision.title} : ${option.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: option.label,
    tone: option.karma >= 3 ? 'good' : option.karma <= -4 ? 'bad' : 'neutral',
    message: `${option.outcome}${
      option.breaks && held.promises.includes(option.breaks)
        ? ' Tu avais promis le contraire, et on s’en souvient.' : ''} Opinion : ${
      approvalLabel(approvalOf(state)).toLowerCase()}.`,
  };
}

/** Le bloc qu'un axe de programme sert le mieux. */
function bestBlocFor(plankId: string): string {
  const plank = getPlank(plankId);
  if (!plank) return BLOCS[0].id;
  let best = BLOCS[0].id;
  let top = -Infinity;
  for (const [blocId, amount] of Object.entries(plank.appeal)) {
    if ((amount as number) > top) { top = amount as number; best = blocId; }
  }
  return best;
}

/** Quitter avant la fin. On peut, et cela se paie. */
export function resignBlocker(state: GameState): string | null {
  if (!state.player.mandate) return 'Tu n’as pas de mandat.';
  return null;
}

export function resign(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const held = state.player.mandate;
  const office = officeOf(state);
  if (!held || !office) return { ok: false, message: 'Tu n’as pas de mandat.' };
  state.player.mandate = null;
  // Démissionner laisse une trace chez les électeurs : la prochaine campagne
  // part de plus bas, ce qui est exactement ce qu'on veut dire par « ça se
  // paie ».
  for (const bloc of BLOCS) {
    state.player.flags[`polls_${office.id}_${bloc.id}`] = Math.round(
      clampStat((held.approval[bloc.id] ?? 50) - 18),
    );
  }
  ctx.log('work', `Tu démissionnes de ${office.label.toLowerCase()}.`, 'bad');
  shiftStats(state, { reputation: -8, happiness: -5 });
  return {
    ok: true,
    title: 'Démission',
    tone: 'bad',
    message: 'On retiendra que tu n’as pas fini. C’est ce qu’on retient toujours.',
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le mandat a versé depuis le dernier bilan.
 *
 * Comme un cachet de scène : l'argent est crédité au moment où il est gagné,
 * et ce compteur ne sert qu'à l'assiette imposable — le bilan retranche ce
 * qu'il y trouve pour ne pas l'encaisser deux fois.
 */
export function politicalEarnings(state: GameState): number {
  const held = state.player.mandate;
  return held ? Math.max(0, Math.round(held.earnedThisYear)) : 0;
}

export function clearPoliticalYear(state: GameState): void {
  if (state.player.mandate) state.player.mandate.earnedThisYear = 0;
}

/**
 * Une année de politique.
 *
 * L'ordre suit le calendrier : l'adversaire fait sa propre campagne, le
 * scrutin se tient à la fin de l'année de candidature, puis le mandat court
 * — une décision par an, une opinion qui dérive, et un terme.
 */
export function advancePolitics(ctx: Ctx): void {
  const { state, rng } = ctx;
  const campaign = state.player.campaign;
  const held = state.player.mandate;

  if (campaign) {
    // L'adversaire ne regarde pas : il fait campagne pendant qu'on fait la
    // sienne, et il monte d'autant plus qu'il est fort.
    const kind = RIVAL_KINDS.find((k) => k.id === campaign.rivalKind);
    for (const bloc of BLOCS) {
      campaign.rivalPolls[bloc.id] = clampStat(
        (campaign.rivalPolls[bloc.id] ?? 0) + 3.5 * (kind?.strength ?? 1) * rng.float(0.6, 1.4),
      );
    }
    // Une casserole peut sortir avant le vote, et elle fait plus de mal que
    // n'importe quelle tactique adverse.
    if (campaign.damage > 25 && rng.chance(campaign.damage / 190)) {
      const hit = rng.float(5, 12);
      for (const bloc of BLOCS) {
        campaign.polls[bloc.id] = clampStat((campaign.polls[bloc.id] ?? 0) - hit);
      }
      campaign.damage = clampStat(campaign.damage + 8);
      ctx.log('random', 'Une affaire sort en pleine campagne.', 'bad');
      campaign.log.push('Une affaire sort.');
    }
    // Le scrutin se tient à la fin de l'année de candidature, joué ou non.
    holdElection(ctx);
    return;
  }

  if (!held) return;

  const office = getOffice(held.officeId);
  if (!office) return;

  const pay = officePay(state, office);
  state.player.money += pay;
  held.earnedThisYear += pay;

  // Une décision non tranchée est une décision quand même : ne rien décider
  // mécontente tout le monde un peu, ce qui est fidèle.
  if (held.pending) {
    for (const bloc of BLOCS) {
      held.approval[bloc.id] = clampStat((held.approval[bloc.id] ?? 50) - 4);
    }
    held.record.push(`${getDecision(held.pending)?.title ?? 'Une décision'} — laissée en suspens`);
    ctx.log('work', 'Tu n’as rien tranché cette année, et cela s’est vu.', 'bad');
    held.pending = null;
  }

  // L'usure du pouvoir : l'opinion revient vers le milieu et un peu en
  // dessous. Personne ne finit un mandat plus aimé qu'au premier jour sans
  // avoir rien fait.
  for (const bloc of BLOCS) {
    const current = held.approval[bloc.id] ?? 50;
    held.approval[bloc.id] = clampStat(current + (46 - current) * 0.12 - 1.2);
  }

  held.yearsLeft -= 1;
  if (held.yearsLeft > 0) {
    // La décision suivante : jamais deux fois la même dans un mandat, tant
    // qu'il en reste.
    const seen = new Set(held.record.map((r) => r.split(' — ')[0]));
    const pool = DECISIONS.filter((d) => !seen.has(d.title));
    if (pool.length > 0) {
      held.pending = pool[rng.int(0, pool.length - 1)].id;
      ctx.log('work', `${getDecision(held.pending)?.title} — il faudra trancher.`, 'neutral');
    }
    return;
  }

  // Fin de mandat : ce qu'on laisse devient le point de départ de la suite.
  for (const bloc of BLOCS) {
    const kept = held.kept - held.broken;
    state.player.flags[`polls_${office.id}_${bloc.id}`] = Math.round(
      clampStat((held.approval[bloc.id] ?? 50) + kept * 3),
    );
  }
  const verdict = approvalOf(state);
  state.player.mandate = null;
  ctx.log(
    'work',
    `Ton mandat s’achève — ${approvalLabel(verdict).toLowerCase()}.`,
    verdict >= 50 ? 'good' : 'bad',
  );
  shiftStats(state, { reputation: (verdict - 50) * 0.12 });
}
