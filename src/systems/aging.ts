/**
 * Vieillissement du joueur : dérive naturelle des statistiques et
 * vérification du décès (§20).
 */

import { clampStat, gainStat } from '../engine/rng.ts';
import { deathChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { getCountry } from '../data/countries.ts';
import { diseaseBurden } from './health.ts';
import { housingComfort } from './properties.ts';
import { getFamilyContext, getHealthContext, getPsycheContext, getSocialContext, getTraitTargets } from './contexts.ts';

/** Applique la dérive annuelle des statistiques du joueur. */
export function ageUpPlayer(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const age = p.age;

  // Croissance puis déclin physique.
  if (age <= 18) {
    p.stats.fitness = gainStat(p.stats.fitness, rng.float(0.5, 2.5));
    p.stats.health = gainStat(p.stats.health, rng.float(-0.5, 1.2));
    p.stats.looks = gainStat(p.stats.looks, rng.float(-1, 2));
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
  p.stats.health = gainStat(p.stats.health, (p.stats.fitness - 50) / 16);
  // Les dépendances usent le corps.
  if (p.stats.addiction > 0) {
    p.stats.health = clampStat(p.stats.health - p.stats.addiction / 22);
    p.stats.looks = clampStat(p.stats.looks - p.stats.addiction / 45);
    // Une dépendance non entretenue s'atténue lentement.
    p.stats.addiction = clampStat(p.stats.addiction - rng.float(0.5, 2.5));
  }
  // Le stress se résorbe partiellement chaque année, d'autant mieux qu'on
  // sait le gérer. Une personne à fleur de peau traîne le sien.
  const character = getPsycheContext(state);
  p.stats.stress = clampStat(p.stats.stress - rng.float(2, 7) * character.stressRecovery);
  p.stats.happiness = clampStat(p.stats.happiness + character.moodDrift);
  if (p.stats.addiction > 0) {
    p.stats.addiction = clampStat(p.stats.addiction + (character.addiction - 1) * 3);
  }
  // Le bonheur revient vers une ligne de base personnelle.
  const baseline = 52 + (p.stats.karma - 50) / 6 + housingComfort(state) * 2;
  p.stats.happiness = clampStat(p.stats.happiness + (baseline - p.stats.happiness) * 0.18);
  // La réputation s'estompe si rien ne l'entretient — mais quelqu'un qui y
  // tient l'entretient, et quelqu'un de cassant l'abîme.
  p.stats.reputation = clampStat(
    p.stats.reputation + (50 - p.stats.reputation) * 0.06 + character.reputationDrift,
  );
  p.stats.karma = clampStat(p.stats.karma + character.karmaDrift);
  p.stats.looks = clampStat(p.stats.looks + character.looksDrift * 0.4);
  // L'intelligence décline très tard.
  if (age > 68) p.stats.intelligence = clampStat(p.stats.intelligence - rng.float(0, 0.9));

  applyEnvironmentDrift(ctx);
}

/**
 * Dérive annuelle imputable à l'environnement.
 *
 * Chaque effet est faible pris isolément — c'est voulu. Un quartier ne rend
 * personne intelligent ni malheureux en un an ; il incline dans une direction,
 * année après année, et c'est l'accumulation qui produit deux vies
 * différentes à partir de deux personnages identiques.
 */
function applyEnvironmentDrift(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const family = getFamilyContext(state);
  const social = getSocialContext(state);
  const health = getHealthContext(state);
  // Le foyer pèse pendant l'enfance, puis relâche sa prise à mesure que le
  // personnage construit sa propre vie.
  const homeWeight = p.age < 18 ? 1 : Math.max(0.15, 1 - (p.age - 18) / 14);

  p.stats.stress = clampStat(p.stats.stress + family.stressDrift * homeWeight);
  p.stats.happiness = clampStat(
    p.stats.happiness + family.happinessDrift * homeWeight + social.happinessDrift * 0.5,
  );
  p.stats.discipline = clampStat(p.stats.discipline + family.disciplineDrift * homeWeight);
  p.stats.fitness = clampStat(p.stats.fitness + health.fitnessDrift * (p.age < 25 ? 1 : 0.6));

  driftTraits(ctx);
}

/**
 * Personnalité acquise : elle se construit par l'environnement et par ce que
 * le personnage vit, en partant du tempérament de naissance. Rien n'est fixé
 * à la création — c'est la différence entre un caractère et un réglage.
 */
function driftTraits(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const t = p.traits;
  // La plasticité décroît avec l'âge : on se façonne surtout jeune.
  const plasticity = Math.max(0.08, 1.1 - p.age / 28) * 0.5;
  const towards = (current: number, target: number) => clampStat(current + (target - current) * plasticity);

  const targets = getTraitTargets(state);
  for (const key of Object.keys(t) as (keyof typeof t)[]) {
    t[key] = towards(t[key], targets[key]);
  }

  // Le tempérament reste le socle : les traits ne s'en écartent jamais
  // complètement, quelle que soit la pression du milieu.
  t.sociability = clampStat(t.sociability * 0.85 + p.psyche.temperament.sociability * 0.15);
  t.discipline = clampStat(t.discipline * 0.85 + p.psyche.temperament.persistence * 0.15);
}

/** Renvoie la cause du décès si le joueur meurt cette année, sinon `null`. */
export function checkPlayerDeath(ctx: Ctx): string | null {
  const { state, rng } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  // L'espérance de vie du pays et la longévité familiale décalent légèrement
  // l'âge effectif : hériter de grands-parents centenaires se voit ici.
  const effectiveAge = p.age - country.lifespan * 0.35 - p.genetics.longevityBonus * 0.4;
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
