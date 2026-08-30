/**
 * Audit d'impact de la personnalité.
 *
 * Même règle que pour l'environnement, appliquée au caractère : aucun trait,
 * aucune valeur, aucun style ne doit exister sans conséquence. On perturbe
 * chaque champ un par un et on vérifie que quelque chose bouge dans ce que le
 * moteur consomme réellement.
 *
 * La différence avec l'audit d'environnement est le domaine mesuré : ici, la
 * signature contient surtout des *décisions* — apprendre, embaucher, oser,
 * dépenser, se lier, encaisser — puisque c'est précisément ce que la
 * personnalité gouverne.
 */

import type { GameState } from '../engine/types.ts';
import type { Psyche } from '../engine/psyche.ts';
import {
  getEducationContext, getFamilyContext, getPsycheContext, getSocialContext,
  invalidateContexts,
} from './contexts.ts';
import { habitCostRatio, habitHours, lifeSatisfaction, temperamentPull } from './psyche.ts';
import { friendshipChance } from './school.ts';
import type { AuditIssue } from './environmentAudit.ts';

/**
 * Champs dont l'effet passe par la génération ou par des systèmes qui ne
 * s'expriment qu'à certains moments de la vie. Chacun est justifié.
 */
export const PSYCHE_GENERATION_ONLY: Record<string, string> = {
  'temperament.energy': 'entre dans l’extraversion et le courage à la naissance',
  'temperament.attentionNeed': 'entre dans l’identité sociale et l’ambition à la naissance',
  'temperament.stimulationNeed': 'entre dans l’impulsivité et le goût de l’aventure à la naissance',
  'temperament.caution': 'entre dans la prudence et la tolérance au risque à la naissance',
  'temperament.emotionalReactivity': 'entre dans le calme et l’impulsivité à la naissance',
  'temperament.frustrationTolerance': 'entre dans la patience et la maîtrise de la colère',
  'self.authenticity': 'reflet calculé de l’écart entre façade et estime de soi',
};

/** Chemins ignorés : identifiants et listes gérées séparément. */
const IGNORED = new Set(['fears', 'interests', 'habits', 'ambitions', 'memories']);

type Signature = number[];

function signature(state: GameState): Signature {
  invalidateContexts(state);
  const psyche = state.player.psyche;
  const psy = getPsycheContext(state);
  const edu = getEducationContext(state);
  const soc = getSocialContext(state);
  const fam = getFamilyContext(state);
  const satisfaction = lifeSatisfaction(state);

  // La probabilité d'amitié avec un camarade réel : c'est là que les styles
  // sociaux et la compatibilité se manifestent.
  const klass = state.player.origin.schoolClass;
  const peer = klass?.classmateIds
    .map((id) => state.npcs[id])
    .find((x) => x?.alive);
  const friendship = peer ? friendshipChance(state, peer).chance : 0;

  return [
    psy.studyEffect, psy.hiring, psy.promotion, psy.negotiation, psy.bonding,
    psy.romance, psy.risk, psy.spending, psy.saving, psy.stressRecovery,
    psy.moodDrift, psy.conflict, psy.addiction,
    psy.karmaDrift, psy.reputationDrift, psy.socialGain, psy.recovery,
    psy.loyaltyFloor, psy.changeCost, psy.judgement, psy.looksDrift,
    psy.valueSatisfaction, psy.conformity, psy.criticismCost,
    // Le tempérament tire les axes vers lui chaque année : c'est un effet
    // réel, invisible dans les contextes, qu'on mesure donc directement.
    ...temperamentPull(state.player.psyche),
    edu.gradeBonus, soc.friendChance, fam.warmth,
    satisfaction.score, satisfaction.reasons.length,
    friendship,
    habitHours(psyche), habitCostRatio(psyche),
    psyche.interests.length, psyche.fears.length, psyche.ambitions.length,
  ];
}

function differs(a: Signature, b: Signature): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-9) return true;
  }
  return false;
}

function walk(
  node: Record<string, unknown>,
  prefix: string,
  visit: (holder: Record<string, unknown>, key: string, path: string) => void,
): void {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (IGNORED.has(path)) continue;
    if (typeof value === 'number') {
      visit(node, key, path);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      walk(value as Record<string, unknown>, path, visit);
    }
  }
}

/**
 * Vérifie que chaque paramètre de personnalité a une conséquence mesurable.
 */
export function validatePsycheImpact(state: GameState): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const psyche = state.player.psyche as unknown as Record<string, unknown>;
  const snapshot: Psyche = JSON.parse(JSON.stringify(state.player.psyche));

  const targets: { holder: Record<string, unknown>; key: string; path: string }[] = [];
  walk(psyche, '', (holder, key, path) => targets.push({ holder, key, path }));

  for (const { holder, key, path } of targets) {
    const before = signature(state);
    const original = holder[key] as number;
    holder[key] = original === 0 ? 14 : original * 1.4 + 9;
    const after = signature(state);
    holder[key] = original;

    if (!differs(before, after)) {
      const reason = PSYCHE_GENERATION_ONLY[path];
      issues.push(
        reason
          ? { path, kind: 'génération', message: reason }
          : { path, kind: 'orphelin', message: 'aucun effet mesurable : ce trait est décoratif.' },
      );
    }
  }

  Object.assign(state.player.psyche, snapshot);
  invalidateContexts(state);
  return issues;
}

/** Traits réellement orphelins, hors dérogations justifiées. */
export function orphanTraits(state: GameState): AuditIssue[] {
  return validatePsycheImpact(state).filter((i) => i.kind === 'orphelin');
}
