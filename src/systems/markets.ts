/**
 * Génération des marchés (emploi, immobilier, automobile) et de la
 * conjoncture économique.
 *
 * Les annonces sont persistées dans `world` : le joueur voit la même offre
 * tant qu'il n'a pas pris une année, ce qui rend les décisions signifiantes.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { JobOffer, PropertyListing, VehicleListing } from '../engine/types.ts';
import { getCountry } from '../data/countries.ts';
import { JOBS } from '../data/jobs.ts';
import { COMPANY_PREFIXES, COMPANY_SUFFIXES } from '../data/names.ts';
import { PROPERTY_ARCHETYPES } from '../data/properties.ts';
import { VEHICLE_MODELS } from '../data/vehicles.ts';
import { getLocalOpportunities } from './contexts.ts';
import { workFactor } from './languages.ts';

/**
 * Échelon maximal proposé sur le marché de l'emploi. Au-delà, un poste ne
 * s'obtient que par promotion interne.
 */
const ENTRY_LEVEL_CAP = 2;

/**
 * Ce que l'année ajoute à l'inflation.
 *
 * **Exporté parce que les salaires des PNJ doivent suivre la même pente.**
 * Une offre faite au joueur vaut `grille × salaryIndex × inflation` ; le
 * salaire d'un PNJ était fixé à `grille × salaryIndex` et n'était plus jamais
 * indexé — seulement des augmentations au mérite, de 3 à 12 % avec une chance
 * de 4 à 12 % par an, soit 0,6 % l'an en espérance contre 2,4 % d'inflation.
 * Il décrochait donc d'environ deux points par an, en composé.
 *
 * Mesuré à poste identique, même année, même pays : le joueur se voit offrir
 * 3,2 fois le salaire d'un PNJ à la première génération, 9,2 à la deuxième,
 * **20 à la troisième**. Le rapport suit exactement l'inflation. Or plusieurs
 * systèmes lisent `person.salary` pour dire ce que vaut un foyer — le revenu
 * du ménage (`environment.ts`), ce que des parents peuvent donner
 * (`finance.ts#familySupport`) — et voyaient donc une famille s'appauvrir
 * sans fin par rapport au monde autour d'elle.
 */
export function inflationStep(economy: number): number {
  return 1 + 0.018 + economy * 0.012;
}

/** Fait évoluer la conjoncture puis régénère toutes les annonces. */
export function refreshMarkets(ctx: Ctx): void {
  const { rng, state } = ctx;
  const w = state.world;
  w.year = state.year;

  // Cycle économique : marche aléatoire bornée avec retour à la moyenne.
  w.economy = clamp(w.economy * 0.72 + rng.float(-0.6, 0.6), -1, 1);
  w.inflation *= inflationStep(w.economy);
  w.jobMarket = clamp(1 + w.economy * 0.28, 0.55, 1.45);
  w.propertyIndex *= 1 + 0.021 + w.economy * 0.035 + rng.float(-0.02, 0.02);
  w.propertyIndex = clamp(w.propertyIndex, 0.35, 40);

  w.jobOffers = generateJobOffers(ctx);
  w.propertyListings = generatePropertyListings(ctx);
  w.vehicleListings = generateVehicleListings(ctx);
}

/** Libellé lisible de la conjoncture. */
export function economyLabel(economy: number): string {
  if (economy < -0.55) return 'Récession';
  if (economy < -0.2) return 'Ralentissement';
  if (economy < 0.2) return 'Conjoncture stable';
  if (economy < 0.55) return 'Croissance';
  return 'Forte croissance';
}

function companyName(ctx: Ctx): string {
  return `${ctx.rng.pick(COMPANY_PREFIXES)} ${ctx.rng.pick(COMPANY_SUFFIXES)}`;
}

function generateJobOffers(ctx: Ctx): JobOffer[] {
  const { rng, state } = ctx;
  const country = getCountry(state.player.countryId);
  const w = state.world;
  // Le nombre d'annonces dépend du bassin d'emploi local : chercher du
  // travail dans un village n'a rien à voir avec le faire dans une capitale.
  const local = getLocalOpportunities(state);
  const count = Math.max(4, Math.round(rng.int(14, 22) * w.jobMarket * local.jobSupply));
  const offers: JobOffer[] = [];

  for (let i = 0; i < count; i++) {
    // Les secteurs dominants de la région sont surreprésentés dans les offres.
    const job = rng.weighted(JOBS, (j) => (local.sectors.includes(j.category) ? 2.6 : 1));
    // On ne recrute jamais un directeur par petite annonce : le marché ne
    // propose que les premiers échelons. Le sommet de la hiérarchie
    // s'atteint uniquement par promotion interne (§11).
    // Ce que le marché propose à quelqu'un qui ne parle pas la langue : le
    // premier échelon, et rien d'autre. Le diplôme et l'expérience ne
    // rattrapent pas ça — c'est ce qui donne son poids à l'expatriation.
    const speaks = workFactor(state);
    const topOffered = speaks >= 1
      ? Math.min(ENTRY_LEVEL_CAP, job.levels.length - 1)
      : 0;
    const level = rng.weighted(
      job.levels.slice(0, topOffered + 1).map((_, idx) => idx),
      (idx) => Math.max(0.35, 4 - idx * 1.8),
    );
    const def = job.levels[level];
    const salary = Math.round(
      def.salary * country.salaryIndex * w.inflation * w.jobMarket * local.salary
        * speaks * rng.float(0.88, 1.18),
    );
    offers.push({
      id: ctx.id('offer'),
      jobId: job.id,
      title: def.title,
      employer: companyName(ctx),
      salary,
      level,
      category: job.category,
      requiresLevel: job.requiresLevel,
      requiresMajor: job.requiresMajors,
      minExperience: job.minExperience + level * 4,
      stress: job.stress,
      hours: job.hours,
    });
  }
  return offers;
}

function generatePropertyListings(ctx: Ctx): PropertyListing[] {
  const { rng, state } = ctx;
  const country = getCountry(state.player.countryId);
  const w = state.world;
  const listings: PropertyListing[] = [];

  for (let i = 0; i < 16; i++) {
    const arch = rng.pick(PROPERTY_ARCHETYPES);
    const cities = country.cities.filter((c) => arch.locations.includes(c.size));
    const city = cities.length ? rng.pick(cities) : rng.pick(country.cities);
    const area = Math.round(rng.float(arch.minArea, arch.maxArea));
    const condition = Math.round(rng.gauss(66, 32, 12, 100));
    const areaFactor = area / ((arch.minArea + arch.maxArea) / 2);
    const conditionFactor = 0.68 + (condition / 100) * 0.42;
    const price = Math.round(
      arch.basePrice *
        country.propertyIndex *
        city.costMult *
        w.propertyIndex *
        areaFactor *
        conditionFactor *
        rng.float(0.92, 1.1),
    );
    listings.push({
      id: ctx.id('prop'),
      archetypeId: arch.id,
      name: arch.name,
      cityName: city.name,
      countryId: country.id,
      price,
      areaM2: area,
      condition,
      annualCost: Math.round(price * arch.upkeepRate),
      annualRentIncome: Math.round(price * arch.rentYield),
    });
  }
  return listings.sort((a, b) => a.price - b.price);
}

function generateVehicleListings(ctx: Ctx): VehicleListing[] {
  const { rng, state } = ctx;
  const country = getCountry(state.player.countryId);
  const w = state.world;
  const listings: VehicleListing[] = [];

  for (let i = 0; i < 18; i++) {
    const model = rng.pick(VEHICLE_MODELS);
    const used = rng.chance(0.55);
    const age = used ? rng.int(1, 16) : 0;
    const mileage = used ? age * rng.int(6000, 24000) : rng.int(0, 60);
    const wear = Math.pow(1 - model.depreciation, age);
    const condition = used
      ? Math.round(clamp(100 - age * rng.float(2.5, 6) - mileage / 4500, 8, 98))
      : 100;
    const price = Math.round(
      model.basePrice * country.salaryIndex * 0.85 * w.inflation * wear *
        (0.6 + (condition / 100) * 0.5) * rng.float(0.93, 1.08),
    );
    listings.push({
      id: ctx.id('veh'),
      modelId: model.id,
      brand: model.brand,
      model: model.model,
      year: state.year - age,
      price: Math.max(150, price),
      mileage,
      condition,
      reliability: model.reliability,
      annualCost: Math.round(model.basePrice * country.salaryIndex * 0.85 * model.upkeep),
      used,
    });
  }
  return listings.sort((a, b) => a.price - b.price);
}
