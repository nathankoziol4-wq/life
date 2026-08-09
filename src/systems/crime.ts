/**
 * Système de criminalité (§16).
 *
 * Un délit est ici une pure mécanique de jeu : un tirage de probabilité
 * pondéré par les statistiques, avec un gain, un risque d'arrestation et des
 * conséquences durables. Le jeu ne décrit aucun mode opératoire réel.
 */

import { clampStat } from '../engine/rng.ts';
import { arrestChance, crimeSuccessChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { getPsycheContext } from './contexts.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import { CRIMES, type CrimeDef } from '../data/crimes.ts';
import { getCountry } from '../data/countries.ts';
import { arrest } from './justice.ts';
import { injure } from './health.ts';

/** Raison éventuelle empêchant de tenter un délit. */
export function crimeBlocker(state: GameState, crime: CrimeDef): string | null {
  const p = state.player;
  if (p.prison) return 'Tu es incarcéré.';
  if (p.age < crime.minAge) return `Âge minimum : ${crime.minAge} ans.`;
  if (p.stats.criminality < crime.minCriminality) {
    return `Expérience criminelle insuffisante (${crime.minCriminality} requis, tu as ${Math.round(p.stats.criminality)}).`;
  }
  if (crime.needsCrew && p.criminalRecord.notoriety < 25) {
    return 'Personne ne veut travailler avec toi. Fais-toi un nom d’abord.';
  }
  if (crime.id === 'embezzle' && !p.job) return 'Il faut un emploi pour détourner des fonds.';
  if (crime.id === 'cybercrime' && p.stats.intelligence < 65) return 'Compétences techniques insuffisantes.';
  const attempts = Number(p.yearActions[`crime_${crime.id}`] ?? 0);
  if (attempts >= 1) return 'Tu as déjà tenté ce coup cette année.';
  return null;
}

/** Tente un délit. Renvoie le récit et applique toutes les conséquences. */
export function commitCrime(ctx: Ctx, crimeId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const crime = CRIMES.find((c) => c.id === crimeId);
  if (!crime) return { ok: false, message: 'Délit inconnu.' };

  const blocker = crimeBlocker(state, crime);
  if (blocker) return { ok: false, title: crime.name, message: blocker };

  p.yearActions[`crime_${crime.id}`] = 1;
  const country = getCountry(p.countryId);

  const success = rng.chance(
    crimeSuccessChance({
      baseDifficulty: crime.difficulty,
      criminality: p.stats.criminality,
      intelligence: p.stats.intelligence,
      fitness: p.stats.fitness,
      notoriety: p.criminalRecord.notoriety,
      drunk: p.stats.addiction > 55 && rng.chance(0.4),
    }),
  );

  // Blessure possible, que le coup réussisse ou non.
  let injured = false;
  if (rng.chance(crime.injuryRisk * (success ? 0.5 : 1.4))) {
    injure(ctx, crime.category === 'grave' || crime.category === 'organisé' ? 1.4 : 1);
    injured = true;
  }

  // Un impulsif prépare mal son coup : il se fait prendre plus souvent, quelle
  // que soit sa compétence. C'est le caractère, pas la statistique de crime.
  const caught = rng.chance(
    arrestChance({
      succeeded: success,
      baseHeat: crime.heat * (0.6 + country.justice * 0.7),
      criminality: p.stats.criminality,
      intelligence: p.stats.intelligence,
      priorArrests: p.criminalRecord.arrests,
    }) * (2 - Math.min(1.6, getPsycheContext(state).risk)),
  );

  let gain = 0;
  if (success) {
    const raw = rng.float(crime.minGain, crime.maxGain);
    gain = Math.round(raw * country.salaryIndex * state.world.inflation * (0.7 + p.criminalRecord.notoriety / 200));
    p.criminalRecord.successfulCrimes += 1;
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + crime.heat * 8);
    p.stats.criminality = clampStat(p.stats.criminality + 3 + crime.heat * 5);
  } else {
    p.stats.criminality = clampStat(p.stats.criminality + 1);
    p.stats.happiness = clampStat(p.stats.happiness - 5);
  }
  p.stats.karma = clampStat(p.stats.karma + crime.karma);
  p.stats.stress = clampStat(p.stats.stress + 8 + crime.heat * 10);

  if (caught) {
    // L'argent volé est saisi lors de l'arrestation.
    const pending = success ? gain : 0;
    const result = arrest(ctx, crime, pending);
    return {
      ok: true,
      title: crime.name,
      message: [
        success ? 'Le coup fonctionne…' : 'Le coup échoue.',
        injured ? 'Tu es blessé dans l’action.' : '',
        result,
      ].filter(Boolean).join(' '),
      tone: 'bad',
    };
  }

  if (success) {
    p.money += gain;
    ctx.log('crime', `${crime.name} : réussi. Gain de ${gain}.`, 'neutral');
    return {
      ok: true,
      title: crime.name,
      message: [
        `Tout se passe comme prévu. Tu repars avec ${gain}.`,
        injured ? 'Tu es blessé au passage.' : '',
        p.criminalRecord.notoriety > 60 ? 'Ton nom commence à circuler dans le milieu.' : '',
      ].filter(Boolean).join(' '),
      tone: 'good',
    };
  }

  ctx.log('crime', `${crime.name} : échec, mais personne ne t’a identifié.`, 'neutral');
  return {
    ok: true,
    title: crime.name,
    message: [
      'Ça tourne court. Tu repars les mains vides.',
      injured ? 'Et tu y as laissé des plumes.' : 'Au moins, personne ne t’a identifié.',
    ].join(' '),
    tone: 'bad',
  };
}

/** Rejoindre le milieu organisé : débloque les délits d'équipe. */
export function joinCrimeSyndicate(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.flags.syndicate) return { ok: false, message: 'Tu en fais déjà partie.' };
  if (p.stats.criminality < 45) return { ok: false, message: 'On ne recrute pas les amateurs.' };
  if (p.age < 18) return { ok: false, message: 'Trop jeune.' };

  if (rng.chance(0.35 + p.criminalRecord.notoriety / 200 + p.stats.criminality / 300)) {
    p.flags.syndicate = true;
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 20);
    p.stats.criminality = clampStat(p.stats.criminality + 10);
    p.stats.karma = clampStat(p.stats.karma - 12);
    ctx.log('crime', 'Tu as été introduit dans une organisation criminelle.', 'neutral');
    return { ok: true, title: 'Recruté', message: 'On te fait une place. Les coups deviennent plus gros, les retours aussi.', tone: 'neutral' };
  }
  p.stats.stress = clampStat(p.stats.stress + 10);
  return { ok: true, title: 'Refusé', message: 'On te renvoie sèchement. Tu n’es pas encore assez crédible.', tone: 'bad' };
}

/** Blanchir de l'argent : réduit la notoriété contre une commission. */
export function launderMoney(ctx: Ctx, amount: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (amount <= 0 || amount > p.money) return { ok: false, message: 'Montant invalide.' };
  if (p.criminalRecord.notoriety < 10) return { ok: false, message: 'Tu n’as rien à blanchir.' };

  const fee = Math.round(amount * rng.float(0.18, 0.32));
  if (rng.percent(18)) {
    p.money -= amount;
    p.stats.stress = clampStat(p.stats.stress + 18);
    ctx.log('crime', 'Ton intermédiaire a disparu avec l’argent.', 'bad');
    return { ok: true, title: 'Arnaqué', message: 'L’intermédiaire s’est volatilisé avec la totalité de la somme.', tone: 'bad' };
  }
  p.money -= fee;
  p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety - 12);
  return {
    ok: true,
    title: 'Blanchiment',
    message: `L’opération passe. Commission : ${fee}. Tu attires un peu moins l’attention.`,
    tone: 'neutral',
  };
}

export { CRIMES };
