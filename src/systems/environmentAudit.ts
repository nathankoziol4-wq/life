/**
 * Audit d'impact de l'environnement.
 *
 * La règle du projet est simple : *aucun paramètre d'environnement ne doit
 * exister pour faire joli*. Ce module la vérifie mécaniquement plutôt que par
 * relecture — on ne cherche pas le nom du champ dans le code, on mesure son
 * effet.
 *
 * Méthode : on calcule une signature complète de tout ce que l'environnement
 * produit (les six contextes, les axes d'opportunité et de difficulté, le
 * bilan du foyer), puis, champ par champ, on perturbe la valeur et on
 * recalcule. Si la signature ne bouge pas d'un iota, le champ est orphelin.
 *
 * Quelques champs n'ont d'effet qu'au moment de la génération : ils
 * déterminent d'autres valeurs puis n'ont plus rien à dire. Ils sont
 * répertoriés explicitement dans `GENERATION_ONLY`, avec leur justification.
 * Tout le reste doit prouver son utilité.
 */

import type { GameState } from '../engine/types.ts';
import type { WorldOrigin } from '../engine/origin.ts';
import { getCountry } from '../data/countries.ts';
import {
  getEducationContext, getFamilyContext, getFinancialContext,
  getHealthContext, getLocalOpportunities, getSocialContext, getTraitTargets,
} from './contexts.ts';
import { nationalIncome, recomputeAxes, recomputeFinance } from './originGen.ts';

export interface AuditIssue {
  path: string;
  kind: 'orphelin' | 'génération';
  message: string;
}

/**
 * Champs dont l'effet a lieu à la construction de l'environnement et nulle
 * part ailleurs. Chacun doit être justifié : c'est la seule dérogation admise
 * à la règle d'impact.
 */
export const GENERATION_ONLY: Record<string, string> = {
  'region.costMult': 'fixe le coût de la vie de la ville lors de sa construction',
  'region.propertyMult': 'fixe les prix de la ville lors de sa construction',
  'region.density': 'détermine la densité de la ville et du quartier',
  'region.infrastructure': 'détermine les écoles et la santé de la ville',
  'region.transport': 'détermine le réseau de transport de la ville',
  'region.universities': 'détermine les universités de la ville',
  'region.urbanisation': 'densifie la ville à la construction',
  'city.propertyMult': 'fixe les prix du quartier et du logement à la construction',
  'housing.value': 'sert de base au crédit et à la mensualité, calculés à l’achat',
  'housing.insulation': 'entre dans le confort et l’état perçus du logement',
};

/** Chemins ignorés : identifiants, libellés, historique, texte libre. */
const IGNORED = new Set([
  'countryId', 'region.id', 'region.name', 'city.name', 'city.size',
  'neighborhood.archetypeId', 'neighborhood.name', 'neighborhood.zone',
  'housing.type', 'housing.tenure', 'school.archetypeId', 'school.name',
  'structure', 'anomalyExplanation', 'finance.behaviour',
  'transport.schoolMode', 'couple', 'parents', 'history', 'memories',
  'region.dominantSectors', 'opportunities', 'difficulties',
]);

type Signature = number[];

/** Tout ce que l'environnement produit, aplati en un vecteur de nombres. */
function signature(state: GameState): Signature {
  const o = state.player.origin;
  const country = getCountry(state.player.countryId);
  const income = nationalIncome(country);

  // Les axes et le bilan du foyer appartiennent à la signature : ce sont des
  // produits directs de l'environnement. On les recalcule sur une copie, sans
  // quoi le recalcul écraserait la perturbation qu'on cherche à mesurer.
  const derived: WorldOrigin = JSON.parse(JSON.stringify(o));
  recomputeFinance(derived, income, country.taxRate);
  recomputeAxes(derived, income);

  const edu = getEducationContext(state);
  const soc = getSocialContext(state);
  const fin = getFinancialContext(state);
  const fam = getFamilyContext(state);
  const loc = getLocalOpportunities(state);
  const hea = getHealthContext(state);

  return [
    edu.gradeBonus, edu.effortMultiplier, edu.clubAccess, edu.universityAccess,
    edu.tuition, edu.pressure, edu.scholarship, edu.dropoutRisk,
    soc.friendChance, soc.peerBackground, soc.streetExposure, soc.happinessDrift, soc.datingChance,
    fin.allowance, fin.familySupport, fin.costOfLiving, fin.propertyCost,
    fin.canLiveAtHome, fin.familyWealth, fin.disposableRatio,
    fam.stressDrift, fam.disciplineDrift, fam.happinessDrift, fam.riskTaking,
    fam.supervision, fam.warmth,
    loc.jobSupply, loc.hiring, loc.salary, loc.promotion,
    ...Object.values(loc.reachable).map((v) => (v ? 1 : 0)),
    hea.illness, hea.recovery, hea.fitnessDrift, hea.careCost,
    ...Object.values(getTraitTargets(state)),
    ...Object.values(derived.opportunities),
    ...Object.values(derived.difficulties),
    derived.finance.disposableIncome, derived.finance.financialStress,
    derived.neighborhood.socialOpportunity, derived.neighborhood.economicOpportunity,
    derived.neighborhood.educationAccess, derived.neighborhood.crimeExposure,
    derived.neighborhood.communityCohesion,
    o.housing.annualHousingCost, loc.accessibility,
  ];
}

function differs(a: Signature, b: Signature): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-9) return true;
  }
  return false;
}

/** Conteneurs à parcourir, avec leur préfixe de chemin. */
function walk(
  node: Record<string, unknown>,
  prefix: string,
  visit: (holder: Record<string, unknown>, key: string, path: string) => void,
): void {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (IGNORED.has(path)) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      visit(node, key, path);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      walk(value as Record<string, unknown>, path, visit);
    }
  }
}

/**
 * Vérifie que chaque paramètre d'environnement a une conséquence mesurable.
 * Renvoie la liste des manquements — vide si tout est en ordre.
 */
export function validateEnvironmentImpact(state: GameState): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const origin = state.player.origin as unknown as Record<string, unknown>;

  // On travaille sur une copie profonde : l'audit ne doit rien laisser
  // derrière lui dans la partie en cours.
  const snapshot = JSON.parse(JSON.stringify(state.player.origin));
  const targets: { holder: Record<string, unknown>; key: string; path: string }[] = [];
  walk(origin, '', (holder, key, path) => targets.push({ holder, key, path }));

  for (const { holder, key, path } of targets) {
    const before = signature(state);
    const original = holder[key];

    if (typeof original === 'boolean') {
      holder[key] = !original;
    } else {
      const n = original as number;
      // Perturbation suffisante pour sortir de tout arrondi, mais réaliste.
      holder[key] = n === 0 ? 12 : n * 1.45 + 7;
    }

    const after = signature(state);
    holder[key] = original;

    if (!differs(before, after)) {
      const reason = GENERATION_ONLY[path];
      issues.push(
        reason
          ? { path, kind: 'génération', message: reason }
          : {
            path,
            kind: 'orphelin',
            message: 'aucun effet mesurable : ce paramètre est décoratif.',
          },
      );
    }
  }

  // On restaure l'environnement exact d'avant l'audit.
  Object.assign(state.player.origin, snapshot);
  return issues;
}

/** Manquements réels : les champs orphelins, hors dérogations justifiées. */
export function orphanParameters(state: GameState): AuditIssue[] {
  return validateEnvironmentImpact(state).filter((i) => i.kind === 'orphelin');
}
