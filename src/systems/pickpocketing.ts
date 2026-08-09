/**
 * Le vol à la tire, branché sur la simulation.
 *
 * Le mini-jeu (`minigames/pickpocket.ts`) ne connaît que des jauges et des
 * poches. C'est ici qu'on décide ce que sa fin veut dire pour la vie du
 * personnage : ce qu'il empoche, ce que ça lui coûte moralement, et surtout
 * la chaîne de conséquences quand ça tourne mal — quelqu'un remarque, il y a
 * confrontation, la police arrive, et le reste suit.
 *
 * La règle du §74 s'applique ici : le résultat final n'est ni la performance
 * du joueur seule, ni la compétence du personnage seule. Un débutant qui joue
 * parfaitement s'en sort mieux qu'un débutant maladroit, sans devenir pour
 * autant un professionnel.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import type { MiniGameContext, MiniGameResult } from '../engine/minigame.ts';
import { autoResolve, blend, miniGameContext } from '../engine/minigame.ts';
import {
  TARGET_PROFILES, targetDifficulty, type PickpocketOutcome, type TargetProfile,
} from './minigames/pickpocket.ts';
import { getCountry } from '../data/countries.ts';
import { CRIMES } from '../data/crimes.ts';
import { arrest } from './justice.ts';
import { injure } from './health.ts';
import { getPsycheContext } from './contexts.ts';

/** Nombre de tentatives autorisées par an. */
const ATTEMPTS_PER_YEAR = 3;

export function pickpocketBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.prison) return 'Tu es incarcéré.';
  if (p.age < 12) return 'Tu es bien trop jeune.';
  if ((p.yearActions.pickpocket ?? 0) >= ATTEMPTS_PER_YEAR) {
    return 'Tu as déjà tenté ta chance plusieurs fois cette année. Le quartier te connaît.';
  }
  return null;
}

/**
 * Les cibles présentes aujourd'hui.
 *
 * Ce n'est pas une liste fixe : le quartier décide de qui passe. Un centre
 * animé attire des touristes, un quartier huppé des porte-monnaie mieux
 * garnis et mieux gardés.
 */
export function availableTargets(state: GameState): TargetProfile[] {
  const o = state.player.origin;
  const busy = o.neighborhood.zone === 'centre-ville' || o.city.size === 'métropole';
  const rich = o.neighborhood.reputation > 62;

  return TARGET_PROFILES.filter((profile) => {
    if (profile.id === 'touriste' && !busy) return false;
    if (profile.id === 'aisé' && !rich) return false;
    if (profile.id === 'vigile' && !busy) return false;
    return true;
  });
}

/** Contexte du mini-jeu pour une cible donnée. */
export function pickpocketContext(state: GameState, profile: TargetProfile): MiniGameContext {
  const p = state.player;
  const country = getCountry(p.countryId);
  // La compétence pertinente n'est pas seulement « criminalité » : les doigts
  // et le sang-froid comptent aussi.
  const skill = p.stats.criminality * 0.6
    + p.stats.fitness * 0.15
    + p.psyche.emotion.stability * 0.15
    + Math.min(10, p.criminalRecord.successfulCrimes);

  return miniGameContext({
    skill,
    difficulty: targetDifficulty(profile),
    setup: {
      profile,
      unit: Math.round(120 * country.salaryIndex * state.world.inflation),
    },
  });
}

/**
 * Applique la fin de partie.
 *
 * `outcome` vient du mini-jeu ; `loot` est ce que le joueur a effectivement
 * pris. Quand le joueur a choisi de ne pas jouer, `autoPickpocket` fabrique
 * les mêmes entrées à partir des statistiques.
 */
export function resolvePickpocket(ctx: Ctx, opts: {
  profile: TargetProfile;
  outcome: PickpocketOutcome;
  loot: number;
  result: MiniGameResult;
  context: MiniGameContext;
}): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const { profile, outcome, result, context } = opts;
  p.yearActions.pickpocket = (p.yearActions.pickpocket ?? 0) + 1;

  // Le mélange décide de la marge : bien jouer réduit vraiment le risque, sans
  // l'annuler pour un débutant.
  const mastery = blend(context, result);

  // Le vol à la tire existe déjà comme délit : on réutilise sa fiche pour
  // l'arrestation et le casier plutôt que d'inventer un second barème.
  const crime = CRIMES.find((c) => c.id === 'pickpocket')!;

  p.stats.stress = clampStat(p.stats.stress + 6);
  p.stats.karma = clampStat(p.stats.karma + crime.karma);

  /* --- Les issues heureuses --- */
  if (outcome === 'parfait' || outcome === 'risqué') {
    const gain = Math.round(opts.loot);
    p.money += gain;
    p.criminalRecord.successfulCrimes += 1;
    p.stats.criminality = clampStat(p.stats.criminality + 2 + result.quality * 3);
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 2);
    ctx.log('crime', `Vol à la tire réussi : ${gain}.`, 'neutral');

    if (outcome === 'parfait') {
      return {
        ok: true, title: 'Personne n’a rien vu', tone: 'good',
        message: `${profile.label} s’éloigne sans se douter de rien. Tu repars avec ${gain}.`,
      };
    }
    // Réussi mais remarqué : la victime se méfiera, et le quartier aussi.
    p.stats.reputation = clampStat(p.stats.reputation - 2);
    return {
      ok: true, title: 'Ça passe, de justesse', tone: 'neutral',
      message: `Tu as ce que tu voulais (${gain}), mais ${profile.label.toLowerCase()} a senti quelque chose. Mieux vaut ne pas repasser ici de sitôt.`,
    };
  }

  /* --- Repartir bredouille : rien perdu, rien gagné --- */
  if (outcome === 'bredouille') {
    return {
      ok: true, title: 'Tu renonces', tone: 'neutral',
      message: 'Tu laisses filer. Rien dans les poches, mais rien non plus dans le dossier.',
    };
  }

  /* --- Se faire repérer, et la chaîne qui suit --- */
  const psy = getPsycheContext(state);
  // Bien jouer, même en échouant, permet souvent de disparaître dans la foule.
  const escapes = rng.chance(Math.min(0.85, 0.2 + mastery * 0.6 + profile.crowd / 300));

  if (outcome === 'repéré') {
    if (escapes) {
      return {
        ok: true, title: 'Repéré', tone: 'bad',
        message: `${profile.label} se retourne d’un coup. Tu es déjà loin quand la phrase arrive.`,
      };
    }
    const told = arrest(ctx, crime, 0);
    return { ok: true, title: 'Repéré', tone: 'bad', message: told };
  }

  /* --- Confrontation : le pire des cas --- */
  let message = `${profile.label} t’attrape le poignet et ne lâche pas.`;
  if (rng.chance(0.45)) {
    injure(ctx, 1);
    message += ' L’échange tourne mal, tu y laisses quelque chose.';
  }
  p.stats.reputation = clampStat(p.stats.reputation - 5);

  // Sang-froid et adresse peuvent encore sauver la mise.
  if (rng.chance(Math.min(0.7, 0.12 + mastery * 0.5 * psy.risk))) {
    return {
      ok: true, title: 'Confrontation', tone: 'bad',
      message: `${message} Tu te dégages et tu cours. Personne ne te suit très longtemps.`,
    };
  }

  const seized = Math.round(opts.loot);
  const told = arrest(ctx, crime, seized);
  return {
    ok: true, title: 'Confrontation', tone: 'bad',
    message: `${message} ${told}`,
    };
}

/**
 * Tentative sans jouer.
 *
 * Le joueur qui refuse le mini-jeu ne doit pas être puni pour autant : on
 * simule une performance moyenne corrélée à sa compétence, et on passe par
 * exactement la même résolution.
 */
export function autoPickpocket(ctx: Ctx, profile: TargetProfile): ActionResult {
  const { state, rng } = ctx;
  const context = pickpocketContext(state, profile);
  const result = autoResolve(rng, context);
  const setup = context.setup as { unit: number };

  // Ce qu'un joueur moyen aurait pris : proportionnel à sa réussite.
  const loot = result.success
    ? Math.round(setup.unit * (0.5 + result.quality * 1.6) * (0.6 + profile.wealth * 0.5))
    : 0;
  const outcome: PickpocketOutcome = result.success
    ? (result.quality > 0.7 ? 'parfait' : 'risqué')
    : result.quality > 0.3 ? 'bredouille'
      : result.quality > 0.15 ? 'repéré' : 'confrontation';

  return resolvePickpocket(ctx, { profile, outcome, loot, result, context });
}
