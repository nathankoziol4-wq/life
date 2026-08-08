/**
 * Vieillissement du joueur : dérive naturelle des statistiques et
 * vérification du décès (§20).
 */

import { clampStat } from '../engine/rng.ts';
import { deathChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { getCountry } from '../data/countries.ts';
import { diseaseBurden } from './health.ts';
import { housingComfort } from './properties.ts';

/** Applique la dérive annuelle des statistiques du joueur. */
export function ageUpPlayer(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const age = p.age;

  // Croissance puis déclin physique.
  if (age <= 18) {
    p.stats.fitness = clampStat(p.stats.fitness + rng.float(0.5, 2.5));
    p.stats.health = clampStat(p.stats.health + rng.float(-0.5, 1.2));
    p.stats.looks = clampStat(p.stats.looks + rng.float(-1, 2));
  } else if (age <= 30) {
    p.stats.fitness = clampStat(p.stats.fitness - rng.float(0, 1.2));
    p.stats.looks = clampStat(p.stats.looks - rng.float(0, 0.5));
  } else {
    // Le déclin s'accélère avec l'âge, mais reste compatible avec une
    // vieillesse en bonne santé si le mode de vie a suivi : à 80 ans, un
    // corps entretenu doit encore tenir debout.
    const decline = (age - 30) / 55;
    p.stats.fitness = clampStat(p.stats.fitness - rng.float(0.4, 1.7) * (1 + decline));
    p.stats.looks = clampStat(p.stats.looks - rng.float(0.3, 1.5) * (1 + decline));
    p.stats.health = clampStat(p.stats.health - rng.float(0.1, 1.0) * (1 + decline));
  }

  // Fertilité.
  if (age > 30) p.stats.fertility = clampStat(p.stats.fertility - (p.sex === 'F' ? rng.float(3, 7) : rng.float(1, 3)));

  // L'inactivité physique érode la santé, la forme la soutient.
  p.stats.health = clampStat(p.stats.health + (p.stats.fitness - 50) / 16);
  // Les dépendances usent le corps.
  if (p.stats.addiction > 0) {
    p.stats.health = clampStat(p.stats.health - p.stats.addiction / 22);
    p.stats.looks = clampStat(p.stats.looks - p.stats.addiction / 45);
    // Une dépendance non entretenue s'atténue lentement.
    p.stats.addiction = clampStat(p.stats.addiction - rng.float(0.5, 2.5));
  }
  // Le stress se résorbe partiellement chaque année.
  p.stats.stress = clampStat(p.stats.stress - rng.float(2, 7));
  // Le bonheur revient vers une ligne de base personnelle.
  const baseline = 52 + (p.stats.karma - 50) / 6 + housingComfort(state) * 2;
  p.stats.happiness = clampStat(p.stats.happiness + (baseline - p.stats.happiness) * 0.18);
  // La réputation s'estompe si rien ne l'entretient.
  p.stats.reputation = clampStat(p.stats.reputation + (50 - p.stats.reputation) * 0.06);
  // L'intelligence décline très tard.
  if (age > 68) p.stats.intelligence = clampStat(p.stats.intelligence - rng.float(0, 0.9));

  // Un environnement pauvre ou une famille aisée influencent l'enfance.
  if (age < 16) {
    const tier = String(p.flags.familyTier ?? 'middle');
    if (tier === 'rich' || tier === 'upper') p.stats.happiness = clampStat(p.stats.happiness + 1.5);
    if (tier === 'poor') p.stats.stress = clampStat(p.stats.stress + 2);
  }
}

/** Renvoie la cause du décès si le joueur meurt cette année, sinon `null`. */
export function checkPlayerDeath(ctx: Ctx): string | null {
  const { state, rng } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  // L'espérance de vie du pays décale légèrement l'âge effectif.
  const effectiveAge = p.age - country.lifespan * 0.35;
  const chance = deathChance(effectiveAge, p.stats, {
    diseaseSeverity: diseaseBurden(state),
    inPrison: Boolean(p.prison),
  });

  if (!rng.chance(chance)) return null;

  // Détermination de la cause la plus plausible.
  const severe = [...p.diseases].sort((a, b) => b.severity - a.severity)[0];
  if (severe && severe.severity > 45 && rng.chance(0.7)) {
    return `des suites de : ${severe.name}`;
  }
  if (p.stats.addiction > 65 && rng.chance(0.35)) return 'des complications liées à une dépendance';
  if (p.prison && rng.chance(0.25)) return 'en détention';
  if (p.age > 78) return rng.pick(['de vieillesse', 'paisiblement, dans son sommeil', 'entouré des siens']);
  if (p.age < 45 && rng.chance(0.5)) {
    return rng.pick(['dans un accident de la route', 'dans un accident domestique', 'd’une crise cardiaque soudaine', 'noyé lors d’une baignade']);
  }
  return rng.pick(['d’une défaillance cardiaque', 'd’une maladie foudroyante', 'd’un accident vasculaire']);
}
