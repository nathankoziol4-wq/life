/**
 * Système de santé (§15) : contraction de maladies, évolution annuelle,
 * consultations et traitements.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import { illnessChance, recoveryChance } from '../engine/probability.ts';
import { getHealthContext } from './contexts.ts';
import { applyExperience } from './psyche.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import type { ActionResult, ActiveDisease, GameState, StatKey } from '../engine/types.ts';
import { DISEASES, getDisease } from '../data/diseases.ts';
import { getCountry } from '../data/countries.ts';

/**
 * Gravité cumulée des maladies actives (sert au calcul de mortalité).
 *
 * La somme est saturante : accumuler cinq pathologies chroniques bien suivies
 * fragilise, mais ne tue pas cinq fois. Sans cela, une vieillesse normale
 * devient statistiquement impossible.
 */
export function diseaseBurden(state: GameState): number {
  const raw = state.player.diseases.reduce(
    (sum, d) => sum + (d.treated ? d.severity * 0.22 : d.severity),
    0,
  );
  // Saturation douce : 100 → 71, 200 → 118, 400 → 173.
  return Math.round((raw * 210) / (210 + raw));
}

/** Coût d'un traitement après prise en charge du pays. */
export function treatmentCost(state: GameState, diseaseId: string): number {
  const disease = getDisease(diseaseId);
  if (!disease) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(
    disease.cost * country.costIndex * state.world.inflation * (1 - country.healthcare)
    * getHealthContext(state).careCost,
  );
}

/** Contracte une maladie précise (utilisé aussi par les événements). */
export function contractDisease(ctx: Ctx, diseaseId: string, silent = false): ActiveDisease | null {
  const { state } = ctx;
  const p = state.player;
  const def = getDisease(diseaseId);
  if (!def) return null;
  if (p.diseases.some((d) => d.id === diseaseId)) return null;

  const active: ActiveDisease = {
    id: def.id,
    name: def.name,
    severity: Math.round(def.severity * ctx.rng.float(0.75, 1.25)),
    yearsIll: 0,
    treated: false,
    chronic: def.chronic,
    /*
     * **Ce qui rendait tout médecin inutile.**
     *
     * C'était `def.severity > 45 || rng.chance(0.6)` : au-dessus de
     * quarante-cinq de gravité une maladie arrivait **toujours** déjà
     * diagnostiquée, et en dessous six fois sur dix. Six maladies sur sept
     * naissaient donc connues, et consulter n'avait rien à trouver — ni avec
     * l'ancien système de praticiens, ni avec celui qui le remplace. Mesuré de
     * bout en bout : le meilleur praticien d'une ville et le pire donnaient la
     * même vie, au dixième de point près.
     *
     * L'intention du seuil était juste — ce qui est grave se manifeste vite —
     * mais un mur à quarante-cinq en faisait une certitude. Une pente le dit
     * mieux : une méningite se signale une fois sur deux, une grippe presque
     * jamais, et entre les deux il reste quelque chose à aller chercher.
     */
    diagnosed: ctx.rng.chance(clamp(def.severity / 140, 0.05, 0.55)),
  };
  p.diseases.push(active);
  p.chronicle.illnesses += 1;
  if (!silent) {
    if (active.diagnosed) {
      ctx.log('health', `On te diagnostique : ${def.name}.`, 'bad');
    } else {
      ctx.log('health', 'Tu ne te sens pas bien depuis quelques mois, sans savoir pourquoi.', 'bad');
    }
  }
  p.stats.happiness = clampStat(p.stats.happiness - def.severity / 6);
  return active;
}

/** Tirage annuel d'une nouvelle maladie, pondéré par l'âge et l'hygiène de vie. */
export function rollNewIllness(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  // Une personne déjà suivie médicalement pour plusieurs pathologies ne
  // « collectionne » pas indéfiniment de nouveaux diagnostics.
  // Le logement, la pollution et les privations pèsent réellement : c'est le
  // premier canal par lequel un environnement dégradé raccourcit une vie.
  const env = getHealthContext(state);
  const chance = illnessChance(p.age, p.stats) * env.illness / (1 + p.diseases.length * 0.45);
  if (!rng.chance(chance)) return;

  const eligible = DISEASES.filter(
    (d) => p.age >= d.minAge && p.age <= d.maxAge && !p.diseases.some((a) => a.id === d.id),
  );
  if (!eligible.length) return;

  const disease = rng.weighted(eligible, (d) => {
    let w = d.rarity;
    // Les comportements à risque orientent le tirage.
    if (p.stats.addiction > 50 && ['alcoholism', 'cancer_lung', 'hepatitis', 'gambling'].includes(d.id)) w *= 3.5;
    if (p.stats.fitness < 35 && ['obesity', 'diabetes', 'hypertension', 'heartattack'].includes(d.id)) w *= 2.6;
    if (p.stats.stress > 65 && ['depression', 'anxiety', 'burnout', 'insomnia', 'hypertension'].includes(d.id)) w *= 3;
    if (p.stats.happiness < 30 && d.category === 'mentale') w *= 2.4;
    if (p.job && d.id === 'burnout' && p.job.effort === 'overtime') w *= 2.5;
    // Antécédents familiaux : la prédisposition multiplie la probabilité,
    // elle ne déclenche jamais la maladie à elle seule.
    if (p.genetics.predispositions.includes(d.id)) w *= 2.8;
    // Un quartier pollué pèse sur les voies respiratoires.
    if (p.origin.neighborhood.pollution > 60 && ['asthma', 'pneumonia', 'cancer_lung'].includes(d.id)) w *= 1.8;
    return w;
  });
  contractDisease(ctx, disease.id);
}

/** Évolution annuelle des maladies actives : guérison, aggravation, effets. */
export function advanceDiseases(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  // Copie volontaire : la liste est modifiée pendant le parcours.
  for (const active of [...p.diseases]) {
    const def = getDisease(active.id);
    if (!def) {
      p.diseases = p.diseases.filter((d) => d !== active);
      continue;
    }
    active.yearsIll += 1;

    // Effets annuels sur les statistiques.
    for (const [key, delta] of Object.entries(def.effects)) {
      const k = key as StatKey;
      const scale = active.treated ? 0.4 : 1;
      shiftStat(state, k, (delta as number) * scale);
    }

    /*
     * Une maladie non diagnostiquée finit par se révéler — **et le temps
     * qu'elle met dépend de ce qu'elle est.**
     *
     * C'était `35 + yearsIll * 10` : trente-cinq pour cent dès la première
     * année, quelle que soit la maladie. Mesuré sur soixante vies, la médiane
     * du temps passé sans savoir valait **un an**. Le corps se diagnostiquait
     * donc lui-même avant qu'aucun médecin ait pu servir à quoi que ce soit :
     * consulter n'a jamais rien changé à une vie, ni avec l'ancien système ni
     * avec le nouveau, et c'est ce que la mesure de bout en bout a montré.
     *
     * L'écran des pathologies promettait déjà le contraire — « certaines
     * maladies restent longtemps silencieuses » —, et cette phrase était
     * fausse. Elle est vraie maintenant : ce qui est grave se signale vite, ce
     * qui est discret peut tenir des années, et c'est très exactement à cela
     * que sert quelqu'un qui sait regarder.
     */
    if (!active.diagnosed && rng.percent(4 + def.severity / 5 + active.yearsIll * 3)) {
      active.diagnosed = true;
      active.foundAt = active.severity;
      ctx.log('health', `Après des mois de symptômes, le diagnostic tombe : ${def.name}.`, 'bad');
      if (def.severity > 65) applyExperience(ctx, 'maladieGrave');
    }

    // Guérison.
    if (!def.chronic) {
      const cure = recoveryChance({
        baseCure: def.cure,
        treated: active.treated,
        health: p.stats.health,
        age: p.age,
        yearsIll: active.yearsIll,
      });
      if (rng.chance(cure * getHealthContext(state).recovery)) {
        p.diseases = p.diseases.filter((d) => d !== active);
        ctx.log('health', `Tu es guéri${p.sex === 'F' ? 'e' : ''} de : ${def.name}.`, 'good');
        p.stats.happiness = clampStat(p.stats.happiness + 8);
        continue;
      }
    } else if (active.treated) {
      /*
       * Une maladie chronique stabilisée perd un peu de gravité — **mais pas en
       * dessous de ce qu'elle valait le jour où on l'a trouvée.**
       *
       * Le plancher était `def.severity * 0.4` pour tout le monde : une chose
       * prise à temps et la même prise dix ans trop tard finissaient
       * exactement au même endroit. Mesuré de bout en bout, choisir le
       * meilleur praticien de la ville plutôt que le pire ne changeait donc
       * *rien* à une vie — 20,5 de gravité contre 20,8, santé 71 des deux
       * côtés. Le système entier était décoratif, et seule une mesure sur des
       * vies entières pouvait le dire.
       *
       * Ce qu'on rattrape n'est pas ce qu'on n'a pas laissé s'installer.
       */
      const floor = Math.max(def.severity * 0.3, (active.foundAt ?? def.severity) * 0.62);
      active.severity = Math.max(floor, active.severity - 2);
    }

    // Aggravation si non traitée.
    if (!active.treated) {
      active.severity = Math.min(100, active.severity + rng.float(0.5, 3.5));
    }
    // Le traitement dure un an : il faut le renouveler.
    active.treated = false;
  }
}

/** Finance le traitement d'une maladie pour l'année. */
export function treatDisease(ctx: Ctx, diseaseId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const active = p.diseases.find((d) => d.id === diseaseId);
  if (!active) return { ok: false, message: 'Tu ne souffres pas de cette maladie.' };
  if (!active.diagnosed) return { ok: false, message: 'Il faut d’abord consulter pour obtenir un diagnostic.' };
  if (active.treated) return { ok: false, message: 'Le traitement est déjà financé cette année.' };
  const cost = treatmentCost(state, diseaseId);
  if (p.money < cost) return { ok: false, message: `Traitement à ${cost}. Fonds insuffisants.` };

  p.money -= cost;
  active.treated = true;
  p.stats.happiness = clampStat(p.stats.happiness + 4);
  const def = getDisease(diseaseId)!;
  ctx.log('health', `Tu commences un traitement contre ${def.name} (${cost}).`, 'good');
  return {
    ok: true,
    title: def.name,
    message: `${def.treatment}. Coût : ${cost}. Les effets seront visibles à la fin de l’année.`,
    tone: 'good',
  };
}

/** Blessure générique (accidents, événements). */
export function injure(ctx: Ctx, severity = 1): void {
  const { rng } = ctx;
  const p = ctx.state.player;
  p.chronicle.accidents += 1;
  const pool = ['fracture', 'concussion', 'backinjury', 'burn'];
  const id = severity > 1.5 ? rng.pick(['spinal', 'burn', 'concussion']) : rng.pick(pool);
  p.stats.health = clampStat(p.stats.health - rng.float(5, 14) * severity);
  contractDisease(ctx, id);
}

/** Espérance de vie et état de santé résumés pour l'interface. */
export function healthSummary(state: GameState): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  const h = state.player.stats.health;
  if (h >= 85) return { label: 'Excellente santé', tone: 'good' };
  if (h >= 65) return { label: 'Bonne santé', tone: 'good' };
  if (h >= 45) return { label: 'Santé correcte', tone: 'neutral' };
  if (h >= 25) return { label: 'Santé fragile', tone: 'bad' };
  return { label: 'Santé critique', tone: 'bad' };
}
