/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * L'état du générateur vit dans la sauvegarde : une partie rechargée
 * poursuit exactement la même suite de tirages, ce qui rend les bugs
 * reproductibles et empêche le « save scumming » par rechargement.
 */

export interface RngHost {
  rngState: number;
}

export class Rng {
  private host: RngHost;

  constructor(host: RngHost) {
    this.host = host;
  }

  /** Flottant dans [0, 1). */
  next(): number {
    this.host.rngState = (this.host.rngState + 0x6d2b79f5) | 0;
    let t = this.host.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Flottant dans [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Vrai avec la probabilité `p` (0-1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Vrai avec la probabilité `p` exprimée en pourcentage (0-100). */
  percent(p: number): boolean {
    return this.next() * 100 < p;
  }

  /** Élément au hasard dans un tableau non vide. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** `n` éléments distincts au hasard (ou moins si le tableau est plus court). */
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = arr.slice();
    const out: T[] = [];
    while (out.length < n && copy.length > 0) {
      out.push(copy.splice(Math.floor(this.next() * copy.length), 1)[0]);
    }
    return out;
  }

  /** Tirage pondéré. `weight` doit renvoyer un nombre >= 0. */
  weighted<T>(arr: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    const weights = arr.map((item) => {
      const w = Math.max(0, weight(item));
      total += w;
      return w;
    });
    if (total <= 0) return this.pick(arr);
    let roll = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  /** Loi normale approchée (somme de 3 uniformes), bornée à [min, max]. */
  gauss(mean: number, spread: number, min = -Infinity, max = Infinity): number {
    const u = (this.next() + this.next() + this.next()) / 3;
    const value = mean + (u - 0.5) * 2 * spread;
    return clamp(value, min, max);
  }

  /** Statistique de départ : loi normale centrée, bornée 0-100, arrondie. */
  stat(mean = 50, spread = 30): number {
    return Math.round(this.gauss(mean, spread, 0, 100));
  }

  /** Mélange une copie du tableau. */
  shuffle<T>(arr: readonly T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Arrondi à l'entier en restant dans [0, 100]. */
export function clampStat(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

/** Interpolation linéaire. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Convertit une statistique 0-100 en multiplicateur autour de 1.
 * `normalize(75, 0.5)` renvoie 1.25 : 50 est neutre, 100 donne 1+strength.
 */
export function normalize(stat: number, strength = 1): number {
  return 1 + ((clamp(stat, 0, 100) - 50) / 50) * strength;
}

/** Graine aléatoire (utilisée uniquement à la création d'une partie). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
