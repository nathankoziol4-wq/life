/**
 * Traduction lisible des effets d'un choix, pour l'aperçu de conséquences.
 * Fonctionne pour les choix scriptés ET générés (mêmes structures d'effets).
 */
import type { EventChoice, EventEffect, StatKey } from "../types";
import { STAT_KEYS, STAT_LABELS } from "../types";

const META_LABEL: Record<string, string> = {
  mentalHealth: "Santé mentale",
  addictionRisk: "Risque d'addiction",
  lifeExpectancy: "Espérance de vie",
};

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? Math.round(abs / 1000) + " k" : String(abs);
  return (n < 0 ? "−" : "+") + s + " €";
}

/** Transforme une liste d'effets en petites étiquettes lisibles. */
export function describeEffects(effects: EventEffect[]): string[] {
  const parts: string[] = [];
  // Agrège les modifiers par cible sur tous les effets.
  const byTarget: Record<string, number> = {};
  let money = 0;
  let jail: string | null = null;
  let health = false;
  let rel: string | null = null;
  let item = false;

  for (const e of effects) {
    for (const m of e.modifiers ?? []) {
      if (m.op === "add") byTarget[m.target] = (byTarget[m.target] ?? 0) + m.value;
    }
    if (e.money) money += e.money;
    if (e.jail) jail = `⚠️ Prison ${e.jail.years} an(s)`;
    if (e.addCondition?.length) health = true;
    if (e.relationshipDelta) rel = `Relation ${e.relationshipDelta.kind} ${e.relationshipDelta.delta > 0 ? "+" : ""}${e.relationshipDelta.delta}`;
    if (e.addItem) item = true;
  }

  for (const k of STAT_KEYS) {
    const v = byTarget[k as StatKey];
    if (v) parts.push(`${STAT_LABELS[k]} ${v > 0 ? "+" : ""}${v}`);
  }
  for (const mk of Object.keys(META_LABEL)) {
    const v = byTarget[mk];
    if (v) parts.push(`${META_LABEL[mk]} ${v > 0 ? "+" : ""}${v}`);
  }
  if (money) parts.push(fmtMoney(money));
  if (rel) parts.push(rel);
  if (health) parts.push("Santé affectée");
  if (item) parts.push("🎒 Objet obtenu");
  if (jail) parts.push(jail);
  return parts;
}

export interface ChoicePreview {
  detail?: string;
  /** Pari : proba de succès en % (avant Chance), ou null si déterministe. */
  chancePct: number | null;
  success: string[];
  failure: string[] | null;
}

/** Prépare l'aperçu complet d'un choix (déterministe ou pari). */
export function previewChoice(choice: EventChoice): ChoicePreview {
  return {
    detail: choice.detail,
    chancePct: choice.chance !== undefined ? Math.round(choice.chance * 100) : null,
    success: describeEffects(choice.effects),
    failure: choice.failEffects ? describeEffects(choice.failEffects) : null,
  };
}
