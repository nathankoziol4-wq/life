/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) + helpers pondérés par
 * la Chance. La stat `Chance` influence DISCRÈTEMENT tous les jets : un perso
 * chanceux voit ses tirages favorables légèrement gonflés.
 */

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Flottant [0,1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entier [min, max] inclus. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Vrai avec probabilité p (0–1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Pioche un élément selon des poids. */
  weighted<T>(items: T[], weightOf: (item: T) => number): T | undefined {
    const total = items.reduce((s, it) => s + Math.max(0, weightOf(it)), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weightOf(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  /** Pioche un élément uniformément. */
  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /**
   * Jet influencé par la Chance. `luck` 0–100. Renvoie true si succès.
   * base est la probabilité neutre à Chance=50. La Chance décale de ±25 pts.
   */
  luckyRoll(base: number, luck: number): boolean {
    const shift = (luck - 50) / 200; // ±0.25
    return this.next() < Math.max(0.02, Math.min(0.98, base + shift));
  }
}

/** Graine dérivée d'une chaîne (nom du perso) pour la reproductibilité. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
