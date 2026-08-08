/**
 * Économie réaliste — simule les finances année par année, comme dans la vraie vie :
 * - Revenu : salaire (imposé par tranches progressives + fiscalité du pays) ou
 *   pension de retraite à partir de 65 ans.
 * - Dépenses : coût de la vie (nécessités), logement (loyer si locataire, taxe
 *   foncière si propriétaire), enfants à charge — le tout modulé par le pays et le
 *   type de ville.
 * - Épargne : intérêts sur le solde positif ; les dettes (solde négatif) s'alourdissent.
 * - Patrimoine : l'immobilier s'apprécie, les placements fluctuent. Valeur nette =
 *   liquidités + actifs.
 */
import type { Character } from "../types";
import { COUNTRY_BY_ID } from "../data/countries";
import { Rng, seedFromString } from "./rng";

const cityFactor = (id: string) => (id === "metropole" ? 1.3 : id === "campagne" ? 0.75 : 1.0);

/** Impôt sur le revenu par tranches progressives (barème simplifié). */
function progressiveTax(gross: number): number {
  const brackets: [number, number][] = [
    [15000, 0],
    [40000, 0.15],
    [90000, 0.3],
    [Infinity, 0.45],
  ];
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of brackets) {
    if (gross <= prev) break;
    tax += (Math.min(gross, cap) - prev) * rate;
    prev = cap;
  }
  return tax;
}

export interface Finance {
  income: number;
  tax: number;
  living: number;
  interest: number;
  assetGrowth: number;
  net: number;
  phase: "enfant" | "actif" | "retraite" | "detenu";
}

/**
 * Applique le bilan financier de l'année : met à jour `char.money` et la valeur
 * des actifs, et renvoie le détail pour le journal.
 */
export function annualFinance(char: Character): Finance {
  const country = COUNTRY_BY_ID[char.creation.countryId];
  const incomeMult = char.meta.incomeMultiplier || 1;
  // Le coût de la vie suit le niveau du pays, mais de façon sous-linéaire.
  const cf = cityFactor(char.creation.cityTypeId) * Math.max(0.4, incomeMult * 0.6 + 0.4);

  const detenu = !!char.prison;
  const retiree = char.age >= 65;
  const adult = char.age >= 18 && !detenu;
  const phase: Finance["phase"] = detenu ? "detenu" : char.age < 18 ? "enfant" : retiree ? "retraite" : "actif";

  // --- Revenu brut ---
  let gross = 0;
  if (!detenu) {
    if (retiree) gross = 14000 * incomeMult; // pension d'État
    else if (char.job) gross = char.job.salary * incomeMult;
  }

  // --- Impôt progressif × facteur pays ---
  const taxFactor = country?.tags?.includes("wealthy_nation") ? 1.15 : country?.tags?.includes("oil_wealth") ? 0.1 : 1.0;
  const tax = detenu ? 0 : progressiveTax(gross) * taxFactor;

  // --- Dépenses (adultes libres uniquement ; enfants à la charge des parents) ---
  let living = 0;
  if (adult) {
    living += 9000 * cf; // nécessités (nourriture, énergie, transport…)
    const owns = char.memory.includes("proprietaire");
    living += owns ? 1800 * cf : 7000 * cf; // taxe foncière vs loyer
    const kids = char.relationships.filter((r) => r.kind === "enfant" && r.alive).length;
    living += kids * 4500 * cf; // enfants à charge
  }

  // --- Intérêts : épargne (+) ou dette (−, qui s'alourdit) ---
  let interest = 0;
  if (char.money > 0) interest = char.money * 0.015;
  else if (char.money < 0) interest = char.money * 0.11;

  // --- Rendement du patrimoine (n'affecte pas les liquidités) ---
  let assetGrowth = 0;
  const rng = new Rng(seedFromString("eco" + char.age + Math.round(char.money)));
  for (const a of char.assets) {
    if (a.kind === "immobilier" || a.kind === "objet") {
      const g = a.value * 0.03; // appréciation immobilière ~3 %/an
      a.value = Math.round(a.value + g);
      assetGrowth += g;
    } else if (a.kind === "placement") {
      const r = rng.next() * 0.36 - 0.13; // −13 % … +23 %
      const g = a.value * r;
      a.value = Math.max(0, Math.round(a.value + g));
      assetGrowth += g;
    } else if (a.kind === "vehicule") {
      const g = -a.value * 0.08; // décote automobile
      a.value = Math.max(0, Math.round(a.value + g));
      assetGrowth += g;
    }
  }

  const net = gross - tax - living + interest;
  char.money = Math.round(char.money + net);

  return {
    income: Math.round(gross),
    tax: Math.round(tax),
    living: Math.round(living),
    interest: Math.round(interest),
    assetGrowth: Math.round(assetGrowth),
    net: Math.round(net),
    phase,
  };
}

/** Valeur nette = liquidités + valeur de tous les actifs. */
export function netWorth(char: Character): number {
  return Math.round(char.money + char.assets.reduce((s, a) => s + a.value, 0));
}
