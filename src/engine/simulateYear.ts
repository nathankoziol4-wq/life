/**
 * Moteur annuel (§24).
 *
 * `simulateYear` exécute, dans l'ordre, toutes les étapes d'une année de vie.
 * Cette fonction ne connaît pas l'interface : elle prend un `GameState`,
 * le fait avancer d'un an et renvoie les événements produits.
 */

import { clampStat } from './rng.ts';
import { createCtx, fullName } from './context.ts';
import type { GameState, PendingEvent, TimelineEntry } from './types.ts';
import { agePerson } from '../systems/npc.ts';
import { ageUpPlayer, checkPlayerDeath } from '../systems/aging.ts';
import { advanceEducation } from '../systems/education.ts';
import { advanceCareer } from '../systems/careers.ts';
import { runAnnualFinance } from '../systems/finance.ts';
import { advanceDiseases, rollNewIllness } from '../systems/health.ts';
import { advanceProperties } from '../systems/properties.ts';
import { advanceVehicles } from '../systems/vehicles.ts';
import { advanceRelationships } from '../systems/relationships.ts';
import { advancePrison } from '../systems/prison.ts';
import { advancePets, advanceValuables } from '../systems/activities.ts';
import { rollRandomEvents } from '../systems/randomEvents.ts';
import { handleRelativeDeath, settleEstate, type EstateShare } from '../systems/inheritance.ts';
import { refreshMarkets } from '../systems/markets.ts';
import { netWorth } from '../systems/finance.ts';
import { lifeExpectancy } from './probability.ts';

export interface YearResult {
  /** Nouvelles entrées de timeline générées par l'année. */
  entries: TimelineEntry[];
  /** Événements interactifs à présenter au joueur. */
  pending: PendingEvent[];
  /** Le joueur est-il mort cette année ? */
  died: boolean;
  deathCause: string | null;
  /** Répartition de la succession, si décès. */
  estate: EstateShare[];
}

/**
 * Fait avancer la partie d'une année complète.
 * L'ordre des étapes correspond exactement au cahier des charges §24.
 */
export function simulateYear(state: GameState): YearResult {
  const ctx = createCtx(state);
  const p = state.player;

  if (!p.alive || state.gameOver) {
    return { entries: [], pending: [], died: true, deathCause: p.deathCause, estate: [] };
  }

  // 1. Nouvelle année, nouvel âge.
  state.year += 1;
  p.age += 1;
  p.yearActions = {};
  state.pending = [];
  ageUpPlayer(ctx);

  // 2. Vieillissement des PNJ (et décès éventuels).
  const deceased = [];
  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    if (agePerson(ctx, npc)) deceased.push(npc);
  }

  // 3. Évolution des relations et initiatives des PNJ.
  advanceRelationships(ctx);

  // 4. Études.
  advanceEducation(ctx);

  // 5. Carrière et promotions.
  advanceCareer(ctx);

  // 6. Patrimoine : biens, véhicules, objets de valeur.
  advanceProperties(ctx);
  advanceVehicles(ctx);
  advanceValuables(ctx);
  advancePets(ctx);

  // 7. Santé.
  rollNewIllness(ctx);
  advanceDiseases(ctx);

  // 8. Détention.
  advancePrison(ctx);

  // 9. Bilan financier annuel.
  runAnnualFinance(ctx);

  // 10. Successions ouvertes par les décès de l'étape 2.
  for (const npc of deceased) {
    handleRelativeDeath(ctx, npc);
  }

  // 11. Événements aléatoires contextuels.
  rollRandomEvents(ctx);
  queueSystemPrompts(ctx);

  // 12. Marchés de l'année suivante.
  refreshMarkets(ctx);

  // 13. Décès du joueur.
  const cause = checkPlayerDeath(ctx);
  if (cause) {
    return { ...killPlayer(ctx, cause), entries: ctx.entries, pending: [] };
  }

  // Journal d'anniversaire, discret mais utile pour rythmer la timeline.
  if (p.age % 10 === 0 && p.age > 0) {
    ctx.log('life', `Tu as ${p.age} ans.`, 'neutral');
  }

  return {
    entries: ctx.entries,
    pending: [...state.pending],
    died: false,
    deathCause: null,
    estate: [],
  };
}

/** Ajoute les sollicitations générées par les systèmes (hors bibliothèque). */
function queueSystemPrompts(ctx: Ctx0): void {
  const { state } = ctx;
  const p = state.player;

  // Le conjoint demande explicitement un enfant.
  if (Number(p.flags.partnerWantsChild ?? 0) === state.year) {
    p.flags.partnerWantsChild = 0;
    const partner = Object.values(state.npcs).find((x) => x.alive && x.relation === 'spouse');
    if (partner) {
      state.pending.push({
        id: ctx.id('ev'),
        eventId: 're_partner_wants_child',
        title: 'Une conversation sérieuse',
        text: `${partner.firstName} veut un enfant. Pas un jour, pas plus tard : maintenant.`,
        choices: [
          { label: 'Dire oui', outcome: '0' },
          { label: 'Demander du temps', outcome: '1' },
          { label: 'Dire non, définitivement', outcome: '2' },
        ],
        personId: partner.id,
        icon: '👶',
      });
    }
  }

  // Rappel de procès en attente.
  if (typeof p.flags.pendingTrial === 'string' && p.flags.pendingTrial) {
    ctx.log('justice', 'Ton procès approche : choisis un avocat depuis le menu Justice.', 'bad');
  }
}

type Ctx0 = ReturnType<typeof createCtx>;

/** Met fin à la partie et règle la succession. */
export function killPlayer(ctx: Ctx0, cause: string): Omit<YearResult, 'entries' | 'pending'> {
  const { state } = ctx;
  const p = state.player;
  p.alive = false;
  p.deathCause = cause;
  p.deathYear = state.year;
  state.gameOver = true;

  ctx.log('death', `Tu es mort${p.sex === 'F' ? 'e' : ''} à ${p.age} ans, ${cause}.`, 'bad');
  // Le patrimoine est figé avant répartition : c'est lui qui sera affiché
  // dans le récapitulatif de fin de vie.
  p.flags.finalNetWorth = netWorth(state);
  const estate = settleEstate(ctx);
  for (const share of estate) {
    ctx.log('money', `${share.name} hérite de ${share.amount}.`, 'neutral');
  }
  return { died: true, deathCause: cause, estate };
}

/** Résumé de fin de partie (§20). */
export interface LifeSummary {
  name: string;
  ageAtDeath: number;
  cause: string;
  netWorth: number;
  topJob: string;
  education: string;
  partners: number;
  children: number;
  arrests: number;
  convictions: number;
  yearsInPrison: number;
  properties: number;
  vehicles: number;
  followers: number;
  finalStats: GameState['player']['stats'];
  highlights: TimelineEntry[];
  estate: EstateShare[];
  score: number;
}

export function buildSummary(state: GameState, estate: EstateShare[], worth: number): LifeSummary {
  const p = state.player;
  const npcs = Object.values(state.npcs);
  const children = npcs.filter((x) => x.relation === 'son' || x.relation === 'daughter').length;
  const partners = npcs.filter((x) => ['spouse', 'partner', 'ex'].includes(x.relation)).length;
  const yearsInPrison = p.criminalRecord.convictions.reduce((s, c) => s + c.sentenceYears, 0);
  const topJob = p.careerHistory.length
    ? p.careerHistory[p.careerHistory.length - 1].title
    : 'Sans profession';

  const highlights = state.timeline
    .filter((e) => e.tone !== 'neutral' && ['life', 'love', 'work', 'family', 'death', 'justice', 'school', 'money'].includes(e.kind))
    .slice(-14);

  // Score composite : longévité, patrimoine, accomplissements, relations.
  const score = Math.round(
    p.age * 8
    + Math.log10(Math.max(1, worth)) * 90
    + p.education.degrees.length * 55
    + children * 40
    + (p.stats.happiness + p.stats.karma) * 2
    + p.careerHistory.length * 18
    - p.criminalRecord.convictions.length * 30,
  );

  return {
    name: fullName(p),
    ageAtDeath: p.age,
    cause: p.deathCause ?? 'de causes inconnues',
    netWorth: worth,
    topJob,
    education: p.education.degrees.length
      ? p.education.degrees[p.education.degrees.length - 1].name
      : 'Aucun diplôme',
    partners,
    children,
    arrests: p.criminalRecord.arrests,
    convictions: p.criminalRecord.convictions.length,
    yearsInPrison,
    properties: p.properties.length,
    vehicles: p.vehicles.length,
    followers: p.followers,
    finalStats: p.stats,
    highlights,
    estate,
    score: Math.max(0, score),
  };
}

/** Espérance de vie estimée, affichée dans le profil. */
export function estimatedLifespan(state: GameState): number {
  return lifeExpectancy(state.player);
}

/** Réinitialise les compteurs annuels (utilisé par les tests). */
export function resetYearActions(state: GameState): void {
  state.player.yearActions = {};
  for (const npc of Object.values(state.npcs)) npc.interactionsThisYear = 0;
  state.player.stats.stress = clampStat(state.player.stats.stress);
}
