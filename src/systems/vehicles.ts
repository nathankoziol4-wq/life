/**
 * Parc automobile (§14) : achat, entretien, pannes, accidents, revente.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import { BASE } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, OwnedVehicle } from '../engine/types.ts';
import { GARAGE_SERVICES, VEHICLE_MAP } from '../data/vehicles.ts';
import { injure } from './health.ts';
import { annuity, borrowingCapacity, addLoan } from './finance.ts';

export function buyVehicle(ctx: Ctx, listingId: string, mode: 'cash' | 'credit'): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const listing = state.world.vehicleListings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, message: 'Ce véhicule n’est plus disponible.' };
  if (p.age < 16) return { ok: false, message: 'Tu es trop jeune pour acheter un véhicule.' };
  if (p.prison) return { ok: false, message: 'Impossible depuis la détention.' };

  if (mode === 'cash') {
    if (p.money < listing.price) return { ok: false, message: `Il te manque ${Math.round(listing.price - p.money)}.` };
    p.money -= listing.price;
  } else {
    const deposit = Math.round(listing.price * 0.15);
    if (p.money < deposit) return { ok: false, message: `Apport minimum : ${deposit}.` };
    const borrowed = listing.price - deposit;
    if (borrowed > borrowingCapacity(state)) {
      return { ok: false, title: 'Crédit refusé', message: `Ta capacité d’emprunt est de ${borrowingCapacity(state)}.` };
    }
    p.money -= deposit;
    const rate = 0.062 + (p.criminalRecord.convictions.length ? 0.02 : 0);
    addLoan(ctx, { kind: 'personal', label: `Crédit auto — ${listing.brand} ${listing.model}`, amount: borrowed, rate, years: 5 });
  }

  const model = VEHICLE_MAP[listing.modelId];
  const vehicle: OwnedVehicle = {
    id: ctx.id('car'),
    modelId: listing.modelId,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    purchasePrice: listing.price,
    purchaseYear: state.year,
    value: listing.price,
    mileage: listing.mileage,
    condition: listing.condition,
    reliability: listing.reliability,
    annualCost: listing.annualCost,
    broken: false,
  };
  p.vehicles.push(vehicle);
  p.chronicle.vehiclesOwned += 1;
  state.world.vehicleListings = state.world.vehicleListings.filter((l) => l.id !== listingId);

  p.stats.happiness = clampStat(p.stats.happiness + 6 + (model?.prestige ?? 0) / 6);
  p.stats.reputation = clampStat(p.stats.reputation + (model?.prestige ?? 0) / 8);
  p.flags.license = p.flags.license ?? true;

  ctx.log('asset', `Tu as acheté une ${listing.brand} ${listing.model} (${listing.year}) pour ${listing.price}.`, 'good');
  return {
    ok: true,
    title: 'Nouveau véhicule',
    message: mode === 'cash'
      ? `${listing.brand} ${listing.model} payée comptant.`
      : `${listing.brand} ${listing.model} achetée à crédit sur 5 ans.`,
    tone: 'good',
  };
}

export function sellVehicle(ctx: Ctx, vehicleId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const v = p.vehicles.find((x) => x.id === vehicleId);
  if (!v) return { ok: false, message: 'Véhicule introuvable.' };
  const price = Math.round(v.value * rng.float(0.86, 1.02) * (v.broken ? 0.45 : 1));
  p.money += price;
  p.vehicles = p.vehicles.filter((x) => x.id !== vehicleId);
  ctx.log('asset', `Tu as vendu ta ${v.brand} ${v.model} pour ${price}.`, 'neutral');
  return {
    ok: true,
    title: 'Véhicule vendu',
    message: `${v.brand} ${v.model} vendue ${price}${v.broken ? ' (décote pour panne)' : ''}.`,
    tone: 'neutral',
  };
}

export function serviceVehicle(ctx: Ctx, vehicleId: string, serviceId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const v = p.vehicles.find((x) => x.id === vehicleId);
  if (!v) return { ok: false, message: 'Véhicule introuvable.' };
  const service = GARAGE_SERVICES.find((s) => s.id === serviceId);
  if (!service) return { ok: false, message: 'Prestation inconnue.' };
  if (serviceId !== 'repair' && v.broken) {
    return { ok: false, message: 'Ce véhicule est en panne : il faut d’abord le réparer.' };
  }
  const cost = Math.max(service.minCost, Math.round(v.purchasePrice * service.costRate));
  if (p.money < cost) return { ok: false, message: `Cette intervention coûte ${cost}.` };

  p.money -= cost;
  v.condition = clamp(v.condition + service.condition, 0, 100);
  if (serviceId === 'repair' || serviceId === 'overhaul') v.broken = false;
  // Un véhicule bien entretenu conserve mieux sa valeur.
  v.value = Math.round(v.value * (1 + service.condition / 900));
  ctx.log('asset', `${service.name} sur ta ${v.brand} ${v.model} (${cost}).`, 'neutral');
  return {
    ok: true,
    title: service.name,
    message: `Intervention réalisée. État : ${Math.round(v.condition)} %. Coût : ${cost}.`,
    tone: 'good',
  };
}

/** Évolution annuelle des véhicules du joueur. */
export function advanceVehicles(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  for (const v of p.vehicles) {
    const model = VEHICLE_MAP[v.modelId];
    const depreciation = model?.depreciation ?? 0.14;
    const km = rng.int(4000, 22000);
    v.mileage += km;
    v.condition = clamp(v.condition - rng.float(1.5, 6) - km / 9000, 0, 100);
    // Les véhicules d'exception peuvent prendre de la valeur.
    v.value = Math.round(Math.max(200, v.value * (1 - depreciation) * (0.9 + v.condition / 500)));
    v.annualCost = Math.round((model?.basePrice ?? v.purchasePrice) * (model?.upkeep ?? 0.05) * (1 + (100 - v.condition) / 200));

    // Panne.
    const breakdown = BASE.vehicleBreakdown * (1.6 - v.reliability / 100) * (1 + (100 - v.condition) / 90);
    if (!v.broken && rng.chance(Math.min(0.55, breakdown))) {
      v.broken = true;
      v.condition = clamp(v.condition - rng.int(10, 25), 0, 100);
      ctx.log('asset', `Ta ${v.brand} ${v.model} est tombée en panne.`, 'bad');
      p.stats.stress = clampStat(p.stats.stress + 6);
    }

    // Accident : rare, mais coûteux.
    if (rng.chance(0.02 * (1 + p.stats.addiction / 120) * (v.broken ? 1.5 : 1))) {
      const damage = Math.round(v.value * rng.float(0.15, 0.6));
      v.condition = clamp(v.condition - rng.int(20, 45), 0, 100);
      v.value = Math.max(200, v.value - damage);
      const hurt = rng.chance(0.35);
      if (hurt) injure(ctx, 1.1);
      ctx.log('asset', `Accident avec ta ${v.brand} ${v.model}${hurt ? ' — tu es blessé' : ''}.`, 'bad');
      p.stats.stress = clampStat(p.stats.stress + 12);
    }
  }
}

/** Le joueur possède-t-il un véhicule en état de rouler ? */
export function hasWorkingVehicle(state: GameState): boolean {
  return state.player.vehicles.some((v) => !v.broken && v.condition > 10);
}

/** Mensualité indicative pour un achat à crédit. */
export function creditEstimate(price: number): number {
  return Math.round(annuity(price * 0.85, 0.062, 5));
}
