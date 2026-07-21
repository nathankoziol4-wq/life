/**
 * Système de modificateurs empilables — le moteur du "chaque choix = impact chiffré".
 * Les modifiers sont collectés depuis toutes les options de création, groupés par
 * cible, puis appliqués dans un ordre déterministe : add → mult → min/max → set.
 * Cet ordre garantit que les plafonds/planchers (min/max des backgrounds) priment
 * sur les additions, et que `set` (ex. espérance de vie du pays) fixe une base.
 */
import type { Modifier, StatKey, MetaKey } from "../types";

export interface ImpactBreakdown {
  target: StatKey | MetaKey;
  base: number;
  final: number;
  contributions: { label: string; source: string; delta: number }[];
}

/**
 * Applique une liste de modifiers à un ensemble de valeurs de base.
 * Retourne les valeurs finales ET le détail par cible (pour l'écran de récap).
 */
export function applyModifiers(
  base: Record<string, number>,
  modifiers: Modifier[]
): { values: Record<string, number>; breakdown: Record<string, ImpactBreakdown> } {
  const values: Record<string, number> = { ...base };
  const breakdown: Record<string, ImpactBreakdown> = {};

  // Regroupe les modifiers par cible.
  const byTarget = new Map<string, Modifier[]>();
  for (const m of modifiers) {
    const list = byTarget.get(m.target) ?? [];
    list.push(m);
    byTarget.set(m.target, list);
  }

  for (const [target, mods] of byTarget) {
    const startBase = base[target] ?? 0;
    let value = startBase;
    const contributions: ImpactBreakdown["contributions"] = [];

    // Ordre d'application déterministe.
    const order: Modifier["op"][] = ["set", "add", "mult", "min", "max"];
    // `set` en premier fixe la base (utile pour lifeExpectancy/health du pays),
    // puis add, puis mult, puis clamps.
    for (const op of order) {
      for (const m of mods.filter((x) => x.op === op)) {
        const before = value;
        switch (op) {
          case "set":
            value = m.value;
            break;
          case "add":
            value += m.value;
            break;
          case "mult":
            value *= m.value;
            break;
          case "min":
            value = Math.max(value, m.value);
            break;
          case "max":
            value = Math.min(value, m.value);
            break;
        }
        contributions.push({ label: m.label, source: m.source, delta: value - before });
      }
    }

    values[target] = value;
    breakdown[target] = { target: target as StatKey | MetaKey, base: startBase, final: value, contributions };
  }

  return { values, breakdown };
}

/** Borne une stat dans [0, 100]. */
export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
