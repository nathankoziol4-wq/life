/**
 * Calcul des répercussions d'un choix — capture l'état avant/après et en déduit
 * la liste lisible des conséquences (stats, argent, prison, relations, statuts).
 * Alimente la pop-up de conséquences affichée après chaque choix.
 */
import type { Character } from "../types";
import { STAT_KEYS, STAT_LABELS } from "../types";

export interface Snap {
  stats: Record<string, number>;
  mental: number;
  addiction: number;
  money: number;
  conditions: string[];
  addictions: string[];
  memory: string[];
  prison: boolean;
  relCount: number;
}

export function snapshot(char: Character): Snap {
  return {
    stats: { ...char.stats },
    mental: char.meta.mentalHealth,
    addiction: char.meta.addictionRisk,
    money: char.money,
    conditions: [...char.conditions],
    addictions: [...char.addictions],
    memory: [...char.memory],
    prison: !!char.prison,
    relCount: char.relationships.filter((r) => r.alive).length,
  };
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? Math.round(abs / 1000) + " k" : String(abs);
  return (n < 0 ? "−" : "+") + s + " €";
}

/** Étiquettes "statut" déclenchées par de nouveaux tags mémoire notables. */
const STATUS_TAGS: Record<string, string> = {
  meurtrier: "🔪 Devenu meurtrier",
  marie: "💍 Marié·e",
  parent: "👶 Devenu parent",
  en_couple: "💞 En couple",
  celibataire: "💔 Célibataire",
  ex_detenu: "⛓️ Casier judiciaire",
  hors_la_loi: "🕶️ Hors-la-loi",
  proprietaire: "🏠 Propriétaire",
  gagnant_loto: "🎉 Gagnant du loto",
  fugitif: "🏃 En cavale",
  divorce: "💔 Divorcé·e",
};

/** Produit les étiquettes de conséquences en comparant deux instantanés. */
export function diffConsequences(before: Snap, char: Character): string[] {
  const chips: string[] = [];
  for (const k of STAT_KEYS) {
    const d = char.stats[k] - before.stats[k];
    if (d) chips.push(`${STAT_LABELS[k]} ${d > 0 ? "+" : ""}${d}`);
  }
  const dm = char.meta.mentalHealth - before.mental;
  if (dm) chips.push(`Santé mentale ${dm > 0 ? "+" : ""}${dm}`);
  const da = char.meta.addictionRisk - before.addiction;
  if (da) chips.push(`Risque d'addiction ${da > 0 ? "+" : ""}${da}`);
  const dMoney = char.money - before.money;
  if (dMoney) chips.push(fmtMoney(dMoney));

  // Nouvelles conditions / addictions.
  for (const c of char.conditions) if (!before.conditions.includes(c)) chips.push(`🩺 ${c}`);
  for (const a of char.addictions) if (!before.addictions.includes(a)) chips.push(`⚠️ addiction`);

  // Prison.
  if (char.prison && !before.prison) chips.push(`⛓️ Prison ${char.prison.sentence} an(s)`);
  if (!char.prison && before.prison) chips.push(`🕊️ Libéré`);

  // Relations gagnées / perdues.
  const relNow = char.relationships.filter((r) => r.alive).length;
  if (relNow > before.relCount) chips.push(`🤝 +${relNow - before.relCount} relation`);
  if (relNow < before.relCount) chips.push(`✖ ${before.relCount - relNow} relation perdue`);

  // Statuts notables.
  for (const t of char.memory) if (!before.memory.includes(t) && STATUS_TAGS[t]) chips.push(STATUS_TAGS[t]);

  return chips;
}
