/**
 * Menu Activités (§4) : toutes les actions ponctuelles du joueur qui ne
 * relèvent pas d'un système dédié — bien-être, loisirs, jeux d'argent,
 * shopping, animaux, adoption, immigration, testament, changement de nom…
 *
 * Chaque fonction renvoie un `ActionResult` affiché dans une modale et
 * applique immédiatement ses conséquences à l'état.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import { tempt } from './recovery.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat, shiftStats } from './stats.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Pet, StatKey } from '../engine/types.ts';
import {
  COSMETIC_PROCEDURES, DESTINATIONS, NIGHTLIFE, PET_NAMES, PET_SPECIES,
  SELL_CHANNELS, SHOP_ITEMS, SPORTS, WELLNESS,
} from '../data/activities.ts';
import { COUNTRIES, formatMoney, getCountry } from '../data/countries.ts';
import { autoResolve, miniGameContext } from '../engine/minigame.ts';
import {
  WORK_FLOOR, fluencyHere, getLanguage, localLanguage, strandedLabel,
} from './languages.ts';
import { createPerson } from './npc.ts';
import { injure } from './health.ts';
import { meetRomanticProspect } from './relationships.ts';
import { relocatePlayer } from './environment.ts';
import { getLocalOpportunities } from './contexts.ts';
import { startRecovery } from './appearance.ts';

/** Coût ajusté au pays et à l'inflation. */
export function localPrice(state: GameState, base: number): number {
  const country = getCountry(state.player.countryId);
  return Math.round(base * country.costIndex * state.world.inflation);
}

function once(ctx: Ctx, key: string, limit = 1): boolean {
  const used = Number(ctx.state.player.yearActions[key] ?? 0);
  if (used >= limit) return false;
  ctx.state.player.yearActions[key] = used + 1;
  return true;
}

function applyStats(ctx: Ctx, deltas: Partial<Record<StatKey, number>>): void {
  shiftStats(ctx.state, deltas);
}

/* ------------------------------------------------------------------ */
/* Bien-être et apparence                                             */
/* ------------------------------------------------------------------ */

/**
 * Équipement nécessaire à chaque sport. Sans piscine à distance raisonnable,
 * on ne nage pas — c'est l'une des façons les plus concrètes dont un
 * environnement ferme des portes sans rien interdire explicitement.
 */
const SPORT_VENUE: Record<string, string> = {
  run: 'park',
  gym: 'gym',
  swim: 'pool',
  yoga: 'gym',
  martial: 'sportsClub',
  climbing: 'sportsClub',
  team: 'stadium',
  extreme: 'nature',
};

/** Le sport est-il praticable là où vit le personnage ? */
export function sportAvailable(state: GameState, sportId: string): boolean {
  const venue = SPORT_VENUE[sportId];
  if (!venue) return true;
  return getLocalOpportunities(state).reachable[venue] === true;
}

export function doSport(ctx: Ctx, sportId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const sport = SPORTS.find((s) => s.id === sportId);
  if (!sport) return { ok: false, message: 'Activité inconnue.' };
  if (p.age < sport.minAge) return { ok: false, message: `Âge minimum : ${sport.minAge} ans.` };
  if (!p.prison && !sportAvailable(state, sportId)) {
    return { ok: false, message: `Aucun équipement pour pratiquer ${sport.name.toLowerCase()} près de chez toi.` };
  }
  if (p.prison) return { ok: false, message: 'Utilise la salle de sport de la prison.' };
  if (!once(ctx, `sport_${sportId}`)) return { ok: false, message: 'Tu pratiques déjà cette activité cette année.' };

  const cost = localPrice(state, sport.cost);
  if (p.money < cost) return { ok: false, message: `Coût annuel : ${cost}.` };
  p.money -= cost;

  // L'âge et la forme actuelle modulent les gains.
  const ageFactor = p.age > 55 ? 0.6 : p.age > 40 ? 0.82 : 1;
  const diminishing = 1 - (p.stats.fitness / 100) * 0.55;
  applyStats(ctx, {
    fitness: sport.fitness * ageFactor * diminishing,
    health: sport.health * ageFactor,
    happiness: sport.happiness,
    stress: sport.stress,
    looks: sport.fitness / 5,
    discipline: 2,
  });

  if (rng.chance(sport.injuryRisk * (p.age > 50 ? 1.5 : 1))) {
    injure(ctx, sport.id === 'extreme' ? 1.5 : 0.9);
    return {
      ok: true,
      title: sport.name,
      message: `Tu pratiques toute l’année… jusqu’à la blessure qui t’arrête net. (${cost})`,
      tone: 'bad',
    };
  }
  ctx.log('health', `Tu as pratiqué : ${sport.name}.`, 'good');
  return { ok: true, title: sport.name, message: `${sport.description} Une bonne année pour ton corps. (${cost})`, tone: 'good' };
}

export function doWellness(ctx: Ctx, activityId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const activity = WELLNESS.find((w) => w.id === activityId);
  if (!activity) return { ok: false, message: 'Activité inconnue.' };
  if (p.age < activity.minAge) return { ok: false, message: `Âge minimum : ${activity.minAge} ans.` };
  if (!once(ctx, `wellness_${activityId}`)) return { ok: false, message: 'Déjà fait cette année.' };

  const cost = localPrice(state, activity.cost);
  if (p.money < cost) return { ok: false, message: `Coût : ${cost}.` };
  p.money -= cost;
  applyStats(ctx, activity.effects as Partial<Record<StatKey, number>>);
  ctx.log('health', `${activity.name} : une année qui te fait du bien.`, 'good');
  return { ok: true, title: activity.name, message: `${activity.description} (${cost})`, tone: 'good' };
}

export function cosmeticSurgery(ctx: Ctx, procedureId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const proc = COSMETIC_PROCEDURES.find((c) => c.id === procedureId);
  if (!proc) return { ok: false, message: 'Intervention inconnue.' };
  if (p.age < proc.minAge) return { ok: false, message: `Âge minimum : ${proc.minAge} ans.` };
  if (p.prison) return { ok: false, message: 'Pas depuis la détention.' };
  if (!once(ctx, 'surgery')) return { ok: false, message: 'Une intervention par an, pas plus.' };

  const cost = localPrice(state, proc.cost);
  if (p.money < cost) return { ok: false, message: `Cette intervention coûte ${cost}.` };
  p.money -= cost;

  // Le risque augmente avec les interventions déjà subies.
  const previous = Number(p.flags.surgeries ?? 0);
  p.flags.surgeries = previous + 1;
  const risk = proc.risk * (1 + previous * 0.18);

  // Réussie ou non, une intervention se voit pendant un an. C'était le seul
  // des trois reproches du catalogue qui portait.
  startRecovery(state);

  if (rng.chance(risk)) {
    const loss = rng.int(4, 14);
    applyStats(ctx, { looks: -loss, health: -rng.int(4, 12), happiness: -12, stress: 12 });
    ctx.log('health', `Ton intervention (${proc.name}) s’est mal passée.`, 'bad');
    return {
      ok: true,
      title: proc.name,
      message: `Complications post-opératoires. Le résultat n’est pas celui espéré. (${cost})`,
      tone: 'bad',
    };
  }

  // Rendements décroissants : plus on est déjà beau, moins on gagne.
  const gain = proc.looksGain * (1 - (p.stats.looks / 100) * 0.6);
  applyStats(ctx, { looks: gain, happiness: 6, health: -2 });
  ctx.log('health', `${proc.name} : intervention réussie.`, 'good');
  return {
    ok: true, title: proc.name, tone: 'good',
    message: `Intervention réussie. Apparence +${Math.round(gain)}, mais il faudra une année pour que cela cesse de se voir. (${cost})`,
  };
}

/* ------------------------------------------------------------------ */
/* Loisirs et sorties                                                 */
/* ------------------------------------------------------------------ */

/** Note un lieu dans la mémoire du personnage, sans doublon. */
export function remember(p: GameState['player'], key: 'seen' | 'lived', id: string): void {
  const list = key === 'seen' ? p.seenPlaces : p.livedCountries;
  if (!list.includes(id)) list.push(id);
}

export function takeVacation(ctx: Ctx, destinationId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) return { ok: false, message: 'Destination inconnue.' };
  if (p.prison) return { ok: false, message: 'Les vacances attendront.' };
  if (!once(ctx, 'vacation')) return { ok: false, message: 'Tu es déjà parti en vacances cette année.' };

  const cost = localPrice(state, dest.cost);
  if (p.money < cost) return { ok: false, message: `Ce voyage coûte ${cost}.` };
  p.money -= cost;

  if (rng.chance(dest.risk)) {
    const mishaps = [
      { text: 'Tu te fais voler tes affaires dès le deuxième jour.', money: -Math.round(cost * 0.3), stats: { happiness: -8, stress: 14 } },
      { text: 'Une intoxication alimentaire gâche la moitié du séjour.', money: -Math.round(cost * 0.1), stats: { health: -8, happiness: -6 } },
      { text: 'Ton vol est annulé et tu passes deux nuits dans un aéroport.', money: -Math.round(cost * 0.15), stats: { happiness: -6, stress: 16 } },
      { text: 'Tu te blesses lors d’une excursion.', money: 0, stats: { happiness: -8 }, injury: true },
    ];
    const mishap = rng.pick(mishaps);
    p.money = Math.max(0, p.money + mishap.money);
    applyStats(ctx, mishap.stats as Partial<Record<StatKey, number>>);
    if ('injury' in mishap && mishap.injury) injure(ctx, 1);
    ctx.log('life', `Vacances à ${dest.name} : ça ne s’est pas passé comme prévu.`, 'bad');
    return { ok: true, title: dest.name, message: mishap.text, tone: 'bad' };
  }

  applyStats(ctx, {
    happiness: dest.happiness,
    stress: dest.stress,
    health: dest.health,
    intelligence: dest.cost > 3000 ? 3 : 1,
  });
  // Ce qu'on a vu reste. Sans cette trace, une vie de voyages et une vie
  // passée dans la même rue se ressemblaient à la fin — et un titre de
  // « voyageur » n'aurait eu aucun fondement à lire.
  remember(p, 'seen', dest.id);
  ctx.log('life', `Tu es parti${p.sex === 'F' ? 'e' : ''} en vacances : ${dest.name}.`, 'good');
  return { ok: true, title: dest.name, message: `${dest.description} Tu reviens transformé. (${cost})`, tone: 'good' };
}

export function goOut(ctx: Ctx, outingId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const outing = NIGHTLIFE.find((n) => n.id === outingId);
  if (!outing) return { ok: false, message: 'Sortie inconnue.' };
  if (p.age < outing.minAge) return { ok: false, message: `Âge minimum : ${outing.minAge} ans.` };
  if (p.prison) return { ok: false, message: 'Pas depuis la détention.' };
  if (!once(ctx, `out_${outingId}`, 3)) return { ok: false, message: 'Tu y es déjà allé plusieurs fois cette année.' };

  const cost = localPrice(state, outing.cost);
  if (p.money < cost) return { ok: false, message: `Il te faut ${cost}.` };
  p.money -= cost;

  applyStats(ctx, {
    happiness: outing.happiness,
    stress: outing.stress,
    addiction: outing.addiction,
    health: outing.health,
  });
  // Seules les sorties qui portent quelque chose comptent : un musée n'a
  // jamais fait rechuter personne.
  if (outing.addiction > 0) tempt(state);

  // Rencontre possible.
  const meetBonus = 1 + (p.stats.looks - 50) / 120;
  if (rng.chance(outing.meetChance * meetBonus)) {
    if (rng.chance(0.5) && p.age >= 16) {
      const prospect = meetRomanticProspect(ctx, 0.5);
      return {
        ok: true,
        title: outing.name,
        message: `${outing.description} Tu fais la connaissance de ${fullName(prospect)}, qui te laisse son numéro.`,
        tone: 'good',
      };
    }
    const friend = createPerson(ctx, {
      relation: 'friend',
      age: Math.max(6, p.age + rng.int(-8, 8)),
      relationship: rng.int(35, 60),
      opinion: rng.int(40, 65),
      withJob: p.age >= 22,
    });
    return {
      ok: true,
      title: outing.name,
      message: `${outing.description} Tu sympathises avec ${fullName(friend)}.`,
      tone: 'good',
    };
  }
  return { ok: true, title: outing.name, message: `${outing.description} (${cost})`, tone: 'good' };
}

/* ------------------------------------------------------------------ */
/* Jeux d'argent                                                      */
/* ------------------------------------------------------------------ */

export function playLottery(ctx: Ctx, tickets: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 18) return { ok: false, message: 'Interdit aux mineurs.' };
  const count = Math.max(1, Math.min(50, Math.round(tickets)));
  const price = localPrice(state, 3) * count;
  if (p.money < price) return { ok: false, message: `Il te faut ${price}.` };
  p.money -= price;
  p.stats.addiction = clampStat(p.stats.addiction + count * 0.15);
  tempt(state);

  let won = 0;
  let best = '';
  for (let i = 0; i < count; i++) {
    const roll = rng.next();
    if (roll < 0.000004) { won += localPrice(state, 12_000_000); best = 'jackpot'; }
    else if (roll < 0.00008) { won += localPrice(state, 320_000); best = best || 'gros lot'; }
    else if (roll < 0.0012) { won += localPrice(state, 9000); best = best || 'beau gain'; }
    else if (roll < 0.014) { won += localPrice(state, 380); best = best || 'petit gain'; }
    else if (roll < 0.09) { won += localPrice(state, 12); best = best || 'remboursé'; }
  }

  if (won > 0) {
    p.money += won;
    p.stats.happiness = clampStat(p.stats.happiness + Math.min(30, won / (localPrice(state, 5000)) * 6 + 4));
    if (best === 'jackpot' || best === 'gros lot') {
      ctx.log('money', `Tu as gagné ${won} à la loterie !`, 'good');
      p.stats.reputation = clampStat(p.stats.reputation + 8);
    }
    return {
      ok: true,
      title: 'Loterie',
      message: `${count} ticket${count > 1 ? 's' : ''} pour ${price}. Gain : ${won} !`,
      tone: 'good',
    };
  }
  return { ok: true, title: 'Loterie', message: `${count} ticket${count > 1 ? 's' : ''} pour ${price}. Aucun gain.`, tone: 'bad' };
}

export type CasinoGame = 'slots' | 'blackjack' | 'roulette' | 'poker';

export function playCasino(ctx: Ctx, game: CasinoGame, bet: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 18) return { ok: false, message: 'Interdit aux mineurs.' };
  if (p.prison) return { ok: false, message: 'Pas de casino en détention.' };
  const wager = Math.round(bet);
  if (wager <= 0 || wager > p.money) return { ok: false, message: 'Mise invalide.' };
  const plays = Number(p.yearActions.casino ?? 0);
  if (plays >= 5) return { ok: false, message: 'Tu as déjà beaucoup joué cette année.' };
  p.yearActions.casino = plays + 1;

  p.money -= wager;
  p.stats.addiction = clampStat(p.stats.addiction + 3);
  tempt(state);

  // Chaque jeu a son espérance et sa variance propres.
  const tables: Record<CasinoGame, { win: number; payout: number; skill: number }> = {
    slots: { win: 0.28, payout: 3.2, skill: 0 },
    roulette: { win: 0.46, payout: 2.0, skill: 0 },
    blackjack: { win: 0.46, payout: 2.05, skill: 0.09 },
    poker: { win: 0.4, payout: 2.4, skill: 0.2 },
  };
  const table = tables[game];
  const skillBonus = table.skill * ((p.stats.intelligence - 50) / 100 + (p.stats.discipline - 50) / 160);
  const winChance = clamp(table.win + skillBonus, 0.05, 0.62);

  if (rng.chance(winChance)) {
    const payout = Math.round(wager * table.payout * (game === 'slots' ? rng.float(0.6, 2.4) : 1));
    p.money += payout;
    p.stats.happiness = clampStat(p.stats.happiness + 6);
    return {
      ok: true,
      title: 'Casino',
      message: `Tu mises ${wager} et tu remportes ${payout}. Bénéfice : ${payout - wager}.`,
      tone: 'good',
    };
  }
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  p.stats.stress = clampStat(p.stats.stress + 5);
  return { ok: true, title: 'Casino', message: `Tu perds ta mise de ${wager}.`, tone: 'bad' };
}

/**
 * La table : ce qu'il faut savoir avant de s'asseoir.
 *
 * Ce que le personnage apporte n'est pas de la chance — elle ne s'achète
 * pas — mais **la mémoire de ce qui est sorti**. Quelqu'un de vif sait ce
 * qu'il reste dans le sac ; quelqu'un d'éteint ne voit qu'un total et joue à
 * pile ou face. C'est la seule adresse honnête à ce genre de table.
 */
export function tableContext(state: GameState) {
  const p = state.player;
  const skill = clamp(
    p.stats.intelligence * 0.6 + p.stats.discipline * 0.4 - p.stats.addiction * 0.25,
    0, 100,
  );
  return miniGameContext({ skill, difficulty: 46, setup: {} });
}

/** Ce qui empêche de s'asseoir à la table, ou rien. */
export function tableBlocker(state: GameState, bet: number): string | null {
  const p = state.player;
  if (p.age < 18) return 'Interdit aux mineurs.';
  if (p.prison) return 'Pas de casino en détention.';
  if (Number(p.yearActions.casino ?? 0) >= 5) return 'Tu as déjà beaucoup joué cette année.';
  if (bet <= 0 || bet > p.money) return 'Mise invalide.';
  return null;
}

/**
 * Solder une partie jouée.
 *
 * Le gain suit ce que le joueur a réellement empoché, pas un tirage : c'est
 * toute la différence avec l'ancien casino, où quatre noms de jeux ne
 * différaient que par trois nombres dans un tableau.
 */
export function settleTable(ctx: Ctx, bet: number, quality: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const why = tableBlocker(state, bet);
  if (why) return { ok: false, title: 'La table', message: why };

  p.yearActions.casino = Number(p.yearActions.casino ?? 0) + 1;
  p.stats.addiction = clampStat(p.stats.addiction + 3);
  tempt(state);

  // La maison garde sa part : même bien joué, on ne repart pas riche. Un
  // joueur parfait rentre à peu près à l'équilibre, ce qui est déjà mieux
  // que tout le monde.
  const payout = Math.round(bet * (quality * 2.35));
  p.money += payout - bet;
  const net = payout - bet;
  if (net >= 0) {
    p.stats.happiness = clampStat(p.stats.happiness + 6);
    return {
      ok: true, title: 'La table', tone: 'good',
      message: `Tu repars avec ${formatMoney(payout, p.countryId)}. Bénéfice : ${formatMoney(net, p.countryId)}.`,
    };
  }
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  p.stats.stress = clampStat(p.stats.stress + 5);
  return {
    ok: true, title: 'La table', tone: 'bad',
    message: payout === 0
      ? `Tu laisses ta mise de ${formatMoney(bet, p.countryId)} sur le tapis.`
      : `Tu récupères ${formatMoney(payout, p.countryId)} d’une mise de ${formatMoney(bet, p.countryId)}.`,
  };
}

/** La même soirée, sans y jouer. */
export function autoTable(ctx: Ctx, bet: number): ActionResult {
  const result = autoResolve(ctx.rng, tableContext(ctx.state));
  return settleTable(ctx, bet, result.quality);
}

/* ------------------------------------------------------------------ */
/* Réseaux sociaux                                                    */
/* ------------------------------------------------------------------ */

/*
 * `postOnSocial` vivait ici : un dé, quatre bandes, un nombre. Publier est
 * devenu une décision — où, quoi, combien de fois — et cela demande un
 * fichier à soi : `systems/social.ts`. On ne garde pas l'ancienne version à
 * côté : plus rien ne l'appelait, et du code que l'interface n'atteint plus
 * est exactement ce qu'on vient de corriger ailleurs.
 */

/** Monétisation de l'audience, une fois par an. */
export function monetizeAudience(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.followers < 5000) return { ok: false, message: 'Il faut au moins 5 000 abonnés pour intéresser une marque.' };
  if (!once(ctx, 'monetize')) return { ok: false, message: 'Un partenariat par an.' };
  if (p.fame.controversy > 70) {
    return { ok: false, title: 'Personne ne rappelle', message: 'Aucune marque ne veut de ton nom en ce moment.' };
  }
  // Une marque achète un nom, pas une liste d'abonnés : ce que le public
  // pense de toi vaut autant que le nombre de gens qui te suivent.
  const standing = 0.5 + p.fame.goodwill / 140 - p.fame.controversy / 190;
  const income = Math.round(
    p.followers * rng.float(0.02, 0.09) * getCountry(p.countryId).salaryIndex
    * Math.max(0.15, standing),
  );
  p.money += income;
  p.fame.earnedThisYear += Math.max(0, income);
  p.stats.reputation = clampStat(p.stats.reputation + (rng.chance(0.3) ? -4 : 2));
  ctx.log('money', `Partenariat rémunéré : ${income}.`, 'good');
  return { ok: true, title: 'Partenariat', message: `Une marque te verse ${income} pour une campagne.`, tone: 'good' };
}

/* ------------------------------------------------------------------ */
/* Shopping et possessions                                            */
/* ------------------------------------------------------------------ */

export function buyItem(ctx: Ctx, itemId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, message: 'Article inconnu.' };
  const price = localPrice(state, item.price);
  if (p.money < price) return { ok: false, message: `Cet article coûte ${price}.` };
  p.money -= price;

  p.valuables.push({
    id: ctx.id('val'),
    name: item.name,
    value: price,
    purchaseYear: state.year,
    purchasePrice: price,
  });
  applyStats(ctx, {
    looks: item.looks ?? 0,
    happiness: item.happiness ?? 0,
    reputation: item.reputation ?? 0,
    intelligence: item.intelligence ?? 0,
  });
  ctx.log('asset', `Tu as acheté : ${item.name} (${price}).`, 'neutral');
  return { ok: true, title: item.name, message: `Achat effectué pour ${price}.`, tone: 'good' };
}

export function sellValuable(ctx: Ctx, valuableId: string, channelId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const item = p.valuables.find((v) => v.id === valuableId);
  if (!item) return { ok: false, message: 'Objet introuvable.' };
  const channel = SELL_CHANNELS.find((c) => c.id === channelId);
  if (!channel) return { ok: false, message: 'Canal de vente inconnu.' };

  const catalogItem = SHOP_ITEMS.find((i) => i.name === item.name);
  const resaleRate = catalogItem?.resale ?? 0.6;
  const price = Math.round(item.value * resaleRate * channel.rate * rng.float(0.9, 1.1));
  p.money += price;
  p.valuables = p.valuables.filter((v) => v.id !== valuableId);
  const gain = price - item.purchasePrice;
  ctx.log('asset', `Tu as vendu : ${item.name} pour ${price}.`, gain >= 0 ? 'good' : 'neutral');
  return {
    ok: true,
    title: 'Vente',
    message: `${item.name} vendu ${price} (${gain >= 0 ? '+' : ''}${gain} par rapport à l’achat).`,
    tone: gain >= 0 ? 'good' : 'neutral',
  };
}

/** Réévaluation annuelle des objets de valeur. */
export function advanceValuables(ctx: Ctx): void {
  const { state, rng } = ctx;
  for (const v of state.player.valuables) {
    const catalogItem = SHOP_ITEMS.find((i) => i.name === v.name);
    const rate = catalogItem?.appreciation ?? -0.1;
    v.value = Math.max(1, Math.round(v.value * (1 + rate + rng.float(-0.03, 0.03))));
  }
}

/* ------------------------------------------------------------------ */
/* Animaux                                                            */
/* ------------------------------------------------------------------ */

export function adoptPetSpecies(ctx: Ctx, speciesId: string, free = false): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const species = PET_SPECIES.find((s) => s.id === speciesId);
  if (!species) return { ok: false, message: 'Espèce inconnue.' };
  if (p.prison) return { ok: false, message: 'Pas en détention.' };
  if (p.pets.length >= 4) return { ok: false, message: 'Tu as déjà beaucoup d’animaux.' };
  const price = free ? 0 : localPrice(state, species.price);
  if (p.money < price) return { ok: false, message: `Il te faut ${price}.` };
  p.money -= price;

  const pet: Pet = {
    id: ctx.id('pet'),
    name: rng.pick(PET_NAMES),
    species: species.name,
    age: 0,
    happiness: 80,
    health: 90,
    annualCost: localPrice(state, species.annualCost),
  };
  p.pets.push(pet);
  applyStats(ctx, { happiness: species.happiness, fitness: species.fitness / 2 });
  ctx.log('family', `${pet.name} (${species.name}) rejoint la famille.`, 'good');
  return { ok: true, title: 'Adoption', message: `${pet.name} le ${species.name.toLowerCase()} emménage chez toi.`, tone: 'good' };
}

export function playWithPet(ctx: Ctx, petId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const pet = p.pets.find((x) => x.id === petId);
  if (!pet) return { ok: false, message: 'Animal introuvable.' };
  if (!once(ctx, `pet_${petId}`, 2)) return { ok: false, message: `Tu as déjà bien occupé ${pet.name} cette année.` };
  pet.happiness = clamp(pet.happiness + 12, 0, 100);
  applyStats(ctx, { happiness: 5, stress: -5, fitness: 1 });
  return { ok: true, title: pet.name, message: `Un bon moment avec ${pet.name}.`, tone: 'good' };
}

export function vetVisit(ctx: Ctx, petId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const pet = p.pets.find((x) => x.id === petId);
  if (!pet) return { ok: false, message: 'Animal introuvable.' };
  const cost = localPrice(state, 240);
  if (p.money < cost) return { ok: false, message: `La consultation coûte ${cost}.` };
  p.money -= cost;
  pet.health = clamp(pet.health + 25, 0, 100);
  return { ok: true, title: 'Vétérinaire', message: `${pet.name} est examiné et soigné. (${cost})`, tone: 'good' };
}

/** Vieillissement annuel des animaux. */
export function advancePets(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  // Copie volontaire : la liste est modifiée pendant le parcours.
  for (const pet of [...p.pets]) {
    pet.age += 1;
    const species = PET_SPECIES.find((s) => s.name === pet.species);
    const lifespan = species?.lifespan ?? 12;
    pet.happiness = clamp(pet.happiness - rng.float(3, 10), 0, 100);
    pet.health = clamp(pet.health - (pet.age > lifespan * 0.7 ? rng.float(6, 14) : rng.float(1, 5)), 0, 100);
    const deathChance = pet.age > lifespan ? 0.45 : Math.max(0, (pet.age / lifespan) ** 4) * 0.3 + (pet.health < 25 ? 0.25 : 0);
    if (rng.chance(deathChance)) {
      p.pets = p.pets.filter((x) => x.id !== pet.id);
      p.stats.happiness = clampStat(p.stats.happiness - 14);
      ctx.log('family', `${pet.name} est mort${pet.age >= lifespan ? ' de vieillesse' : ''}.`, 'bad');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Famille : adoption, fertilité                                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Rencontres                                                         */
/* ------------------------------------------------------------------ */

/*
 * `useDatingApp` vivait ici : un tirage décidait s'il y avait une réponse, et
 * quelqu'un apparaissait. Choisir à qui écrire — et savoir le lire avant —
 * demande six profils, un budget d'attention et une déduction : cela vit
 * maintenant dans `systems/matching.ts`. On ne garde pas l'ancienne version à
 * côté : plus rien ne l'appelait, et du code que l'interface n'atteint plus
 * est exactement ce qu'on vient de corriger ailleurs.
 */

/* ------------------------------------------------------------------ */
/* Vie administrative                                                 */
/* ------------------------------------------------------------------ */

export function getDrivingLicense(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.flags.license) return { ok: false, message: 'Tu as déjà le permis.' };
  if (p.age < 17) return { ok: false, message: 'Il faut avoir 17 ans.' };
  if (!once(ctx, 'license')) return { ok: false, message: 'Une tentative par an.' };
  const cost = localPrice(state, 1400);
  if (p.money < cost) return { ok: false, message: `Le forfait auto-école coûte ${cost}.` };
  p.money -= cost;

  const chance = 0.4 + p.stats.intelligence / 320 + p.stats.discipline / 260 - p.stats.stress / 400;
  if (rng.chance(clamp(chance, 0.1, 0.95))) {
    p.flags.license = true;
    p.stats.happiness = clampStat(p.stats.happiness + 8);
    ctx.log('life', 'Tu as obtenu ton permis de conduire.', 'good');
    return { ok: true, title: 'Permis obtenu', message: `Tu peux maintenant conduire. (${cost})`, tone: 'good' };
  }
  return { ok: true, title: 'Recalé', message: `Échec à l’examen. Tu pourras repasser l’an prochain. (${cost})`, tone: 'bad' };
}

export function immigrate(ctx: Ctx, countryId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = COUNTRIES.find((c) => c.id === countryId);
  if (!target) return { ok: false, message: 'Pays inconnu.' };
  if (target.id === p.countryId) return { ok: false, message: 'Tu y vis déjà.' };
  if (p.prison) return { ok: false, message: 'Impossible depuis la détention.' };
  if (p.age < 18) return { ok: false, message: 'Il faut être majeur.' };
  if (!once(ctx, 'immigrate')) return { ok: false, message: 'Une demande de visa par an.' };
  const cost = localPrice(state, 3200);
  if (p.money < cost) return { ok: false, message: `Les démarches coûtent ${cost}.` };
  p.money -= cost;

  // Le visa dépend de l'ouverture du pays, du diplôme et du casier.
  let chance = target.openness * 0.6;
  chance += p.education.level * 0.08;
  chance += Math.min(0.2, p.money / (target.salaryIndex * 400000));
  chance += p.job ? 0.1 : 0;
  chance -= p.criminalRecord.convictions.length ? 0.35 : 0;

  if (!rng.chance(clamp(chance, 0.02, 0.95))) {
    return { ok: true, title: 'Visa refusé', message: `${target.name} rejette ta demande. Frais engagés : ${cost}.`, tone: 'bad' };
  }

  const oldCountry = getCountry(p.countryId).name;
  remember(p, 'lived', p.countryId);
  remember(p, 'lived', target.id);
  p.countryId = target.id;
  p.cityName = rng.pick(target.cities).name;
  // Changer de pays change tout le décor : quartier, logement, marché local.
  relocatePlayer(ctx, p.cityName, target.id);
  // Un changement de pays remet la carrière à zéro : le diplôme reste.
  if (p.job) {
    const last = p.careerHistory[p.careerHistory.length - 1];
    if (last && last.to === null) last.to = state.year;
    p.job = null;
  }
  p.stats.stress = clampStat(p.stats.stress + 18);
  p.stats.happiness = clampStat(p.stats.happiness + 6);
  shiftStat(state, 'intelligence', 3);
  // Ce qui attend vraiment sur place : la langue. Le dire ici, au moment du
  // choix, est la seule façon que le joueur ait de mesurer ce qu'il engage —
  // et à quarante ans ce n'est pas ce que c'était à vingt.
  const spoken = fluencyHere(state);
  const tongue = getLanguage(localLanguage(state))?.label ?? '';
  ctx.log('life', `Tu as quitté ${oldCountry} pour ${target.name} (${p.cityName}).`, 'neutral');
  if (spoken < WORK_FLOOR) {
    ctx.log('life', `Tu ne parles pas assez ${tongue} pour ce que tu vaux.`, 'bad');
  }
  return {
    ok: true,
    title: 'Visa accordé',
    message: `Tu t’installes à ${p.cityName}, ${target.name}. Il va falloir tout recommencer côté carrière.${
      spoken < WORK_FLOOR ? ` ${strandedLabel(spoken)}` : ''}`,
    tone: 'good',
  };
}

export function moveToCity(ctx: Ctx, cityName: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);
  const city = country.cities.find((c) => c.name === cityName);
  if (!city) return { ok: false, message: 'Ville inconnue.' };
  if (city.name === p.cityName) return { ok: false, message: 'Tu y habites déjà.' };
  const cost = localPrice(state, 2200);
  if (p.money < cost) return { ok: false, message: `Le déménagement coûte ${cost}.` };
  p.money -= cost;
  p.cityName = city.name;
  relocatePlayer(ctx, city.name);
  p.stats.stress = clampStat(p.stats.stress + 8);
  ctx.log('life', `Tu as déménagé à ${city.name}.`, 'neutral');
  return { ok: true, title: 'Déménagement', message: `Tu vis maintenant à ${city.name}. (${cost})`, tone: 'neutral' };
}

export function changeName(ctx: Ctx, firstName: string, lastName: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const first = firstName.trim().slice(0, 20);
  const last = lastName.trim().slice(0, 24);
  if (!first || !last) return { ok: false, message: 'Prénom et nom sont obligatoires.' };
  if (p.age < 16) return { ok: false, message: 'Il faut avoir 16 ans.' };
  const cost = localPrice(state, 900);
  if (p.money < cost) return { ok: false, message: `La procédure coûte ${cost}.` };
  p.money -= cost;
  const old = `${p.firstName} ${p.lastName}`;
  p.firstName = first;
  p.lastName = last;
  ctx.log('life', `Tu t’appelles désormais ${first} ${last} (anciennement ${old}).`, 'neutral');
  return { ok: true, title: 'Changement de nom', message: `Tu es désormais ${first} ${last}.`, tone: 'good' };
}

export function updateWill(ctx: Ctx, shares: Record<string, number>): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const total = Object.values(shares).reduce((s, x) => s + x, 0);
  if (total > 100) return { ok: false, message: 'La somme des parts dépasse 100 %.' };
  const cost = localPrice(state, 400);
  if (p.money < cost) return { ok: false, message: `Les frais de notaire s’élèvent à ${cost}.` };
  p.money -= cost;
  p.will.shares = { ...shares };
  p.will.updatedYear = state.year;
  p.flags.willDone = true;
  const names = Object.keys(shares)
    .map((id) => person(state, id)?.firstName)
    .filter(Boolean)
    .join(', ');
  ctx.log('money', 'Tu as mis à jour ton testament.', 'neutral');
  return {
    ok: true,
    title: 'Testament',
    message: names ? `Bénéficiaires enregistrés : ${names}.` : 'Testament enregistré sans bénéficiaire désigné.',
    tone: 'neutral',
  };
}

export function buyEngagementRing(ctx: Ctx, budget: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const price = Math.round(budget);
  if (price <= 0 || price > p.money) return { ok: false, message: 'Budget invalide.' };
  p.money -= price;
  p.flags.ringValue = price;
  return {
    ok: true,
    title: 'Bague achetée',
    message: `Une bague à ${price}. Elle attend dans le tiroir de la table de nuit.`,
    tone: 'good',
  };
}
