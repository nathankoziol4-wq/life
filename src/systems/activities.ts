/**
 * Menu Activités (§4) : toutes les actions ponctuelles du joueur qui ne
 * relèvent pas d'un système dédié — bien-être, loisirs, jeux d'argent,
 * shopping, animaux, adoption, immigration, testament, changement de nom…
 *
 * Chaque fonction renvoie un `ActionResult` affiché dans une modale et
 * applique immédiatement ses conséquences à l'état.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Pet, StatKey } from '../engine/types.ts';
import {
  COSMETIC_PROCEDURES, DESTINATIONS, NIGHTLIFE, PET_NAMES, PET_SPECIES,
  SELL_CHANNELS, SHOP_ITEMS, SPORTS, WELLNESS,
} from '../data/activities.ts';
import { COUNTRIES, getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';
import { createPerson } from './npc.ts';
import { injure } from './health.ts';
import { meetRomanticProspect } from './relationships.ts';

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
  const p = ctx.state.player;
  for (const [key, value] of Object.entries(deltas)) {
    const k = key as StatKey;
    p.stats[k] = clampStat(p.stats[k] + (value as number));
  }
}

/* ------------------------------------------------------------------ */
/* Bien-être et apparence                                             */
/* ------------------------------------------------------------------ */

export function doSport(ctx: Ctx, sportId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const sport = SPORTS.find((s) => s.id === sportId);
  if (!sport) return { ok: false, message: 'Activité inconnue.' };
  if (p.age < sport.minAge) return { ok: false, message: `Âge minimum : ${sport.minAge} ans.` };
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
  return { ok: true, title: proc.name, message: `Intervention réussie. Apparence +${Math.round(gain)}. (${cost})`, tone: 'good' };
}

/* ------------------------------------------------------------------ */
/* Loisirs et sorties                                                 */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Réseaux sociaux                                                    */
/* ------------------------------------------------------------------ */

export function postOnSocial(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 10) return { ok: false, message: 'Trop jeune pour ça.' };
  if (p.prison) return { ok: false, message: 'Pas de téléphone en détention.' };
  if (!once(ctx, 'social', 3)) return { ok: false, message: 'Tu as déjà beaucoup posté cette année.' };

  const appeal = (p.stats.looks + p.stats.intelligence + p.stats.reputation) / 3;
  const roll = rng.next() * 100;

  if (roll > 96) {
    const gained = Math.round(rng.int(20000, 400000) * (0.5 + appeal / 100));
    p.followers += gained;
    p.stats.reputation = clampStat(p.stats.reputation + 8);
    p.stats.happiness = clampStat(p.stats.happiness + 10);
    ctx.log('random', `Une de tes publications est devenue virale : +${gained} abonnés.`, 'good');
    return { ok: true, title: 'Viral !', message: `Ta publication explose : +${gained} abonnés.`, tone: 'good' };
  }
  if (roll > 55) {
    const gained = Math.round(rng.int(20, 900) * (0.4 + appeal / 100));
    p.followers += gained;
    p.stats.happiness = clampStat(p.stats.happiness + 3);
    return { ok: true, title: 'Publication', message: `Bonne réception : +${gained} abonnés.`, tone: 'good' };
  }
  if (roll > 12) {
    const gained = rng.int(0, 40);
    p.followers += gained;
    return { ok: true, title: 'Publication', message: `Réception tiède : +${gained} abonnés.`, tone: 'neutral' };
  }
  const lost = Math.min(p.followers, Math.round(p.followers * rng.float(0.03, 0.2)) + rng.int(1, 30));
  p.followers -= lost;
  p.stats.reputation = clampStat(p.stats.reputation - 3);
  p.stats.happiness = clampStat(p.stats.happiness - 5);
  return { ok: true, title: 'Bad buzz', message: `Ta publication est mal reçue : -${lost} abonnés.`, tone: 'bad' };
}

/** Monétisation de l'audience, une fois par an. */
export function monetizeAudience(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.followers < 5000) return { ok: false, message: 'Il faut au moins 5 000 abonnés pour intéresser une marque.' };
  if (!once(ctx, 'monetize')) return { ok: false, message: 'Un partenariat par an.' };
  const income = Math.round(p.followers * rng.float(0.02, 0.09) * getCountry(p.countryId).salaryIndex);
  p.money += income;
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

export function adoptChild(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 25) return { ok: false, message: 'Il faut avoir au moins 25 ans.' };
  if (p.prison) return { ok: false, message: 'Impossible avec une incarcération en cours.' };
  if (!once(ctx, 'adopt')) return { ok: false, message: 'Une demande par an.' };
  const cost = localPrice(state, 9000);
  if (p.money < cost) return { ok: false, message: `Les frais de procédure s’élèvent à ${cost}.` };

  const chance = 0.3
    + (p.stats.reputation / 100) * 0.25
    + (p.money > localPrice(state, 60000) ? 0.15 : 0)
    + (Object.values(state.npcs).some((x) => x.alive && x.relation === 'spouse') ? 0.15 : 0)
    - (p.criminalRecord.convictions.length ? 0.4 : 0)
    - (p.stats.addiction > 50 ? 0.2 : 0);

  p.money -= cost;
  if (!rng.chance(clamp(chance, 0.02, 0.95))) {
    return { ok: true, title: 'Dossier refusé', message: `La commission rejette ta demande. Frais engagés : ${cost}.`, tone: 'bad' };
  }

  const sex = rng.chance(0.5) ? 'M' : 'F';
  const names = getNameSet(getCountry(p.countryId).nameSet);
  const child = createPerson(ctx, {
    relation: sex === 'M' ? 'son' : 'daughter',
    sex,
    age: rng.int(0, 8),
    lastName: p.lastName,
    withJob: false,
    relationship: rng.int(50, 75),
    opinion: rng.int(50, 78),
  });
  child.firstName = rng.pick(sex === 'M' ? names.male : names.female);
  child.flags.adopted = true;
  p.stats.happiness = clampStat(p.stats.happiness + 18);
  p.stats.karma = clampStat(p.stats.karma + 10);
  ctx.log('family', `Tu as adopté ${child.firstName}, ${child.age} ans.`, 'good');
  return { ok: true, title: 'Adoption acceptée', message: `${child.firstName}, ${child.age} ans, rejoint ta famille.`, tone: 'good' };
}

export function fertilityTreatment(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (p.age < 18 || p.age > 50) return { ok: false, message: 'Traitement non indiqué à ton âge.' };
  if (!once(ctx, 'fertility')) return { ok: false, message: 'Un protocole par an.' };
  const cost = localPrice(state, 6500);
  if (p.money < cost) return { ok: false, message: `Le protocole coûte ${cost}.` };
  p.money -= cost;
  p.flags.fertilityTreatment = true;
  p.stats.fertility = clampStat(p.stats.fertility + 22);
  p.stats.stress = clampStat(p.stats.stress + 8);
  return {
    ok: true,
    title: 'Traitement de fertilité',
    message: `Protocole engagé pour ${cost}. Tes chances de conception augmentent nettement.`,
    tone: 'good',
  };
}

/* ------------------------------------------------------------------ */
/* Rencontres                                                         */
/* ------------------------------------------------------------------ */

export function useDatingApp(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age < 18) return { ok: false, message: 'Réservé aux majeurs.' };
  if (p.prison) return { ok: false, message: 'Pas depuis la détention.' };
  if (!once(ctx, 'dating', 3)) return { ok: false, message: 'Tu as déjà beaucoup utilisé l’application cette année.' };
  const cost = localPrice(state, 18);
  if (p.money < cost) return { ok: false, message: `L’abonnement coûte ${cost}.` };
  p.money -= cost;

  const attractiveness = (p.stats.looks * 0.55 + p.stats.reputation * 0.2 + p.stats.happiness * 0.15
    + Math.min(100, (p.money / (40000 * getCountry(p.countryId).salaryIndex)) * 100) * 0.1) / 100;

  if (!rng.chance(clamp(0.2 + attractiveness * 0.7, 0.05, 0.92))) {
    p.stats.happiness = clampStat(p.stats.happiness - 3);
    return { ok: true, title: 'Aucun match', message: 'Beaucoup de profils, aucune réponse. L’application est impitoyable.', tone: 'bad' };
  }

  const prospect = meetRomanticProspect(ctx, attractiveness);
  ctx.log('love', `Tu as rencontré ${fullName(prospect)} sur une application.`, 'neutral');
  return {
    ok: true,
    title: 'Match !',
    message: `Tu discutes avec ${fullName(prospect)}, ${prospect.age} ans. Retrouve-${prospect.sex === 'F' ? 'la' : 'le'} dans l’onglet Relations.`,
    tone: 'good',
  };
}

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
  p.countryId = target.id;
  p.cityName = rng.pick(target.cities).name;
  // Un changement de pays remet la carrière à zéro : le diplôme reste.
  if (p.job) {
    const last = p.careerHistory[p.careerHistory.length - 1];
    if (last && last.to === null) last.to = state.year;
    p.job = null;
  }
  p.stats.stress = clampStat(p.stats.stress + 18);
  p.stats.happiness = clampStat(p.stats.happiness + 6);
  p.stats.intelligence = clampStat(p.stats.intelligence + 3);
  ctx.log('life', `Tu as quitté ${oldCountry} pour ${target.name} (${p.cityName}).`, 'neutral');
  return {
    ok: true,
    title: 'Visa accordé',
    message: `Tu t’installes à ${p.cityName}, ${target.name}. Il va falloir tout recommencer côté carrière.`,
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
