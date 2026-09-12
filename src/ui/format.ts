/** Aides de formatage partagées par l'interface. */

import { formatMoney, getCountry } from '../data/countries.ts';
import type { GameState, Person, Player } from '../engine/types.ts';

export function money(state: GameState, amount: number): string {
  return formatMoney(amount, state.player.countryId);
}

/** Montant signé, coloré par l'appelant via `moneyClass`. */
export function signedMoney(state: GameState, amount: number): string {
  const text = money(state, Math.abs(amount));
  return amount < 0 ? `−${text}` : `+${text}`;
}

export function moneyClass(amount: number): string {
  if (amount > 0) return 'money-pos';
  if (amount < 0) return 'money-neg';
  return '';
}

export function plural(n: number, singular: string, plural?: string): string {
  return n > 1 ? (plural ?? `${singular}s`) : singular;
}

export function years(n: number): string {
  return `${n} ${plural(n, 'an')}`;
}

/** Emoji d'avatar dérivé de l'âge et du sexe. */
export function avatarFor(p: Player | Person): string {
  const fem = p.sex === 'F';
  if (p.age < 2) return '👶';
  if (p.age < 12) return fem ? '👧' : '👦';
  if (p.age < 20) return fem ? '👩‍🦱' : '👨‍🦱';
  if (p.age < 60) return fem ? '👩' : '👨';
  return fem ? '👵' : '👴';
}

/** Description de la situation actuelle affichée dans l'en-tête. */
export function situationOf(state: GameState): string {
  const p = state.player;
  if (p.prison) return `Détenu · ${p.prison.facilityName}`;
  if (p.job) return p.job.title;
  if (p.retired) return 'Retraité';
  switch (p.education.stage) {
    case 'nursery': return 'Maternelle';
    case 'primary': return 'École primaire';
    case 'middle': return 'Collège';
    case 'high': return 'Lycée';
    case 'university': return 'Étudiant';
    case 'graduate': return 'Cycle supérieur';
    case 'vocational': return `Formation · ${p.education.schoolName ?? ''}`;
    case 'dropout': return 'Sans emploi';
    default:
      return p.age < 6 ? 'Enfance' : 'Sans emploi';
  }
}

export function countryLine(state: GameState): string {
  const c = getCountry(state.player.countryId);
  return `${c.flag} ${state.player.cityName}`;
}

/** Formate un grand nombre d'abonnés. */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)} k`;
  return String(Math.round(n));
}

export function percent(n: number): string {
  return `${Math.round(n)} %`;
}

/** Libellé qualitatif d'une jauge 0-100. */
export function qualify(value: number): string {
  if (value >= 88) return 'Excellent';
  if (value >= 70) return 'Très bon';
  if (value >= 52) return 'Correct';
  if (value >= 34) return 'Faible';
  if (value >= 16) return 'Mauvais';
  return 'Critique';
}

/** Libellé de la qualité d'une relation. */
export function relationQuality(value: number): string {
  if (value >= 85) return 'Fusionnel';
  if (value >= 70) return 'Très proche';
  if (value >= 55) return 'Bonne entente';
  if (value >= 40) return 'Correcte';
  if (value >= 25) return 'Tendue';
  if (value >= 10) return 'Très mauvaise';
  return 'Rompue';
}
