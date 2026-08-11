/**
 * Marché immobilier (§13) : achat comptant ou à crédit, rénovation,
 * location, vente, évolution annuelle de la valeur et de l'état.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, OwnedProperty } from '../engine/types.ts';
import { PROPERTY_MAP, RENOVATIONS } from '../data/properties.ts';
import { annuity, borrowingCapacity } from './finance.ts';
import { getCountry } from '../data/countries.ts';
import { advanceTenancy } from './tenancy.ts';

export const MORTGAGE_YEARS = 20;

/** Taux d'intérêt proposé au joueur, selon son profil. */
export function mortgageRate(state: GameState): number {
  const p = state.player;
  let rate = 0.032 + Math.max(0, state.world.economy) * 0.012;
  if (p.criminalRecord.convictions.length) rate += 0.012;
  rate += Math.max(0, (55 - p.stats.reputation)) / 2000;
  if (!p.job && !p.retired) rate += 0.02;
  return Math.round(rate * 10000) / 10000;
}

/** Apport minimal exigé par la banque (20 %). */
export function minimumDeposit(price: number): number {
  return Math.round(price * 0.2);
}

export function buyProperty(ctx: Ctx, listingId: string, mode: 'cash' | 'mortgage'): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const listing = state.world.propertyListings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, message: 'Ce bien n’est plus disponible.' };
  if (p.age < 18) return { ok: false, message: 'Il faut être majeur pour acheter.' };
  if (p.prison) return { ok: false, message: 'Impossible depuis la détention.' };

  const arch = PROPERTY_MAP[listing.archetypeId];
  let mortgageBalance = 0;
  let annualPayment = 0;
  let rate = 0;

  if (mode === 'cash') {
    if (p.money < listing.price) return { ok: false, message: `Il te manque ${Math.round(listing.price - p.money)}.` };
    p.money -= listing.price;
  } else {
    const deposit = minimumDeposit(listing.price);
    if (p.money < deposit) return { ok: false, message: `Apport minimum requis : ${deposit}.` };
    const borrowed = listing.price - deposit;
    if (borrowed > borrowingCapacity(state)) {
      return { ok: false, title: 'Prêt refusé', message: `La banque limite ton emprunt à ${borrowingCapacity(state)}.` };
    }
    rate = mortgageRate(state);
    p.money -= deposit;
    mortgageBalance = borrowed;
    annualPayment = Math.round(annuity(borrowed, rate, MORTGAGE_YEARS));
  }

  const property: OwnedProperty = {
    id: ctx.id('own'),
    archetypeId: listing.archetypeId,
    name: listing.name,
    cityName: listing.cityName,
    countryId: listing.countryId,
    purchasePrice: listing.price,
    purchaseYear: state.year,
    value: listing.price,
    condition: listing.condition,
    areaM2: listing.areaM2,
    mortgageBalance,
    annualPayment,
    mortgageYearsLeft: mode === 'mortgage' ? MORTGAGE_YEARS : 0,
    interestRate: rate,
    annualCost: listing.annualCost,
    isResidence: !p.properties.some((x) => x.isResidence),
    rentedOut: false,
    annualRentIncome: listing.annualRentIncome,
    askingRent: 0,
    tenancy: null,
    applicants: [],
    vacantYears: 0,
    repair: null,
  };
  p.properties.push(property);
  state.world.propertyListings = state.world.propertyListings.filter((l) => l.id !== listingId);

  p.stats.happiness = clampStat(p.stats.happiness + 10 + (arch?.prestige ?? 0) / 3);
  p.stats.reputation = clampStat(p.stats.reputation + (arch?.prestige ?? 0) / 4);
  if (property.isResidence) p.cityName = property.cityName;

  ctx.log('asset', `Tu as acheté : ${listing.name} à ${listing.cityName} (${Math.round(listing.price)}).`, 'good');
  return {
    ok: true,
    title: 'Acquisition',
    message: mode === 'cash'
      ? `${listing.name} est à toi, payé comptant.`
      : `${listing.name} est à toi. Mensualité annuelle : ${annualPayment} pendant ${MORTGAGE_YEARS} ans.`,
    tone: 'good',
  };
}

export function sellProperty(ctx: Ctx, propertyId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prop = p.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };

  // Prix de vente : valeur de marché avec une décote de négociation.
  const gross = Math.round(prop.value * rng.float(0.93, 1.04));
  const net = gross - prop.mortgageBalance;
  if (net < 0 && p.money < -net) {
    return { ok: false, title: 'Vente impossible', message: `Le crédit restant (${prop.mortgageBalance}) dépasse le prix de vente. Il te manque ${Math.round(-net - p.money)}.` };
  }

  p.money += net;
  p.properties = p.properties.filter((x) => x.id !== propertyId);
  delete p.flags[`missed_${prop.id}`];
  // Si c'était la résidence principale, une autre la remplace.
  if (prop.isResidence && p.properties.length) p.properties[0].isResidence = true;

  const gain = gross - prop.purchasePrice;
  ctx.log('asset', `Tu as vendu ${prop.name} (${prop.cityName}) pour ${gross}.`, gain >= 0 ? 'good' : 'bad');
  return {
    ok: true,
    title: 'Vente conclue',
    message: `Vendu ${gross}. ${prop.mortgageBalance > 0 ? `Solde du crédit remboursé : ${prop.mortgageBalance}. ` : ''}${gain >= 0 ? `Plus-value : ${gain}.` : `Moins-value : ${gain}.`}`,
    tone: gain >= 0 ? 'good' : 'bad',
  };
}

export function renovate(ctx: Ctx, propertyId: string, renovationId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const prop = p.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  const reno = RENOVATIONS.find((r) => r.id === renovationId);
  if (!reno) return { ok: false, message: 'Type de travaux inconnu.' };
  const cost = Math.round(prop.value * reno.costRate);
  if (p.money < cost) return { ok: false, message: `Ces travaux coûtent ${cost}.` };
  if (prop.condition >= 99) return { ok: false, message: 'Ce bien est déjà en parfait état.' };

  p.money -= cost;
  prop.condition = clamp(prop.condition + reno.condition, 0, 100);
  prop.value = Math.round(prop.value * (1 + reno.valueGain));
  prop.annualRentIncome = Math.round(prop.annualRentIncome * (1 + reno.valueGain * 0.6));
  p.stats.happiness = clampStat(p.stats.happiness + 4);
  ctx.log('asset', `Travaux sur ${prop.name} : ${reno.name} (${cost}).`, 'neutral');
  return {
    ok: true,
    title: reno.name,
    message: `Travaux terminés. État : ${Math.round(prop.condition)} %. Nouvelle valeur : ${prop.value}.`,
    tone: 'good',
  };
}

export function setResidence(ctx: Ctx, propertyId: string): ActionResult {
  const p = ctx.state.player;
  const prop = p.properties.find((x) => x.id === propertyId);
  if (!prop) return { ok: false, message: 'Bien introuvable.' };
  if (prop.rentedOut) return { ok: false, message: 'Ce bien est loué à quelqu’un d’autre.' };
  for (const x of p.properties) x.isResidence = x.id === propertyId;
  p.cityName = prop.cityName;
  p.countryId = prop.countryId;
  ctx.log('asset', `Tu emménages dans ${prop.name} à ${prop.cityName}.`, 'good');
  return { ok: true, title: 'Déménagement', message: `Tu vis désormais à ${prop.cityName}.`, tone: 'good' };
}

/** Évolution annuelle du parc immobilier du joueur. */
export function advanceProperties(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  for (const prop of p.properties) {
    // La vie du bail : ce qui rentre, ce qui s'abîme, ce qu'on demande.
    // Elle passe avant l'usure ordinaire parce qu'un locataire négligent
    // abîme davantage qu'un logement vide.
    advanceTenancy(ctx, prop);

    // Usure ordinaire. Un bien inoccupé se dégrade aussi, autrement.
    const wear = rng.float(0.8, 3.2) * (prop.tenancy ? 1.15 : prop.rentedOut ? 1.3 : 1);
    prop.condition = clamp(prop.condition - wear, 0, 100);

    // La valeur suit le marché et l'état du bien.
    const market = 1 + 0.021 + state.world.economy * 0.035 + rng.float(-0.025, 0.03);
    const conditionFactor = 1 + (prop.condition - 60) / 1400;
    prop.value = Math.round(Math.max(1000, prop.value * market * conditionFactor));
    prop.annualCost = Math.round(prop.value * (PROPERTY_MAP[prop.archetypeId]?.upkeepRate ?? 0.02));
    prop.annualRentIncome = Math.round(
      prop.value * (PROPERTY_MAP[prop.archetypeId]?.rentYield ?? 0.045) * (0.6 + prop.condition / 250),
    );

    // Sinistres.
    if (rng.chance(0.04 * (1 + (100 - prop.condition) / 160))) {
      const damage = Math.round(prop.value * rng.float(0.02, 0.12));
      prop.condition = clamp(prop.condition - rng.int(8, 25), 0, 100);
      const covered = rng.chance(0.6);
      if (covered) {
        ctx.log('asset', `Sinistre sur ${prop.name} : pris en charge par l’assurance.`, 'neutral');
      } else {
        p.money -= damage;
        ctx.log('asset', `Sinistre sur ${prop.name} : ${damage} de réparations à ta charge.`, 'bad');
      }
    }

    // Un logement en ruine finit par devenir insalubre.
    if (prop.condition < 10 && prop.isResidence) {
      p.stats.health = clampStat(p.stats.health - 3);
      p.stats.happiness = clampStat(p.stats.happiness - 4);
    }
  }
  void country;
}

/** Bonheur apporté par le logement (appelé au bilan annuel). */
export function housingComfort(state: GameState): number {
  const residence = state.player.properties.find((x) => x.isResidence);
  if (!residence) return 0;
  const arch = PROPERTY_MAP[residence.archetypeId];
  return (arch?.prestige ?? 0) / 8 + (residence.condition - 50) / 60;
}
