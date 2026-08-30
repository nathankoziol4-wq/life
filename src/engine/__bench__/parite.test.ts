/**
 * Vérifications de la matrice de parité.
 *
 * Une matrice d'audit est dangereuse : elle donne l'impression d'un travail
 * fait, alors qu'elle n'est qu'une liste d'affirmations. Ces tests la
 * rattachent au code réel — une ligne ne peut pas se déclarer présente en
 * pointant vers un fichier ou un symbole qui n'existe pas.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { PARITY_MATRIX, nextPriorities, parityScore } from '../../data/parity.ts';

const ROOT = new URL('../../../', import.meta.url).pathname;

describe('matrice de parité', () => {
  it('rattache chaque fonctionnalité déclarée présente à du code réel', () => {
    for (const entry of PARITY_MATRIX) {
      if (entry.status === 'MISSING') continue;
      const label = `${entry.domain} / ${entry.feature}`;
      expect(entry.anchor, `${label} : une ligne non MISSING doit citer son code`).toBeTruthy();

      const [file, symbol] = entry.anchor!.split('#');
      expect(existsSync(ROOT + file), `${label} : fichier introuvable (${file})`).toBe(true);
      if (symbol) {
        const source = readFileSync(ROOT + file, 'utf8');
        const declared = new RegExp(
          `(export (function|const|interface|type|class) ${symbol}\\b)|(export \\{[^}]*\\b${symbol}\\b)`,
        );
        expect(declared.test(source), `${label} : ${symbol} n’est pas exporté par ${file}`).toBe(true);
      }
    }
  });

  it('reste cohérente entre statut et profondeur', () => {
    for (const entry of PARITY_MATRIX) {
      const label = `${entry.domain} / ${entry.feature}`;
      if (entry.status === 'MISSING') {
        expect(entry.depth, `${label} : absent mais de profondeur non nulle`).toBe(0);
        expect(entry.ours, `${label} : absent mais quelque chose est décrit`).toBeNull();
      } else {
        expect(entry.depth, `${label} : présent mais de profondeur nulle`).toBeGreaterThan(0);
        expect(entry.ours, `${label} : présent sans description`).toBeTruthy();
      }
      // Une ligne COMPLETE ne peut pas lister ce qui lui manque.
      if (entry.status === 'COMPLETE') {
        expect(entry.missingInteractions ?? [], label).toEqual([]);
        expect(entry.missingConsequences ?? [], label).toEqual([]);
        expect(entry.depth, `${label} : COMPLETE demande de la profondeur`).toBeGreaterThanOrEqual(3);
      }
      // Une ligne PARTIAL doit dire ce qui manque, sinon elle est COMPLETE.
      if (entry.status === 'PARTIAL') {
        const gaps = [
          ...(entry.missingInteractions ?? []),
          ...(entry.missingConsequences ?? []),
          ...(entry.miniGame ? [entry.miniGame] : []),
        ];
        expect(gaps.length, `${label} : PARTIAL sans manque déclaré`).toBeGreaterThan(0);
      }
      expect(entry.priority).toBeGreaterThanOrEqual(1);
      expect(entry.priority).toBeLessThanOrEqual(5);
      expect(entry.depth).toBeLessThanOrEqual(5);
    }
  });

  it('calcule un score exploitable', () => {
    const { domains, total } = parityScore();
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(100);
    expect(domains.length).toBeGreaterThan(10);
    // Les domaines sont classés du plus faible au plus fort : c'est l'ordre
    // dans lequel on veut lire un audit.
    for (let i = 1; i < domains.length; i++) {
      expect(domains[i].score).toBeGreaterThanOrEqual(domains[i - 1].score);
    }
    // Le score global ne doit jamais afficher 100 % tant qu'il reste des
    // lignes MISSING : ce serait exactement le mensonge que la matrice existe
    // pour empêcher.
    if (PARITY_MATRIX.some((e) => e.status === 'MISSING')) {
      expect(total).toBeLessThan(100);
    }
  });

  it('propose un ordre de travail cohérent avec les priorités', () => {
    const next = nextPriorities();
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((e) => e.status !== 'COMPLETE')).toBe(true);
    for (let i = 1; i < next.length; i++) {
      expect(next[i].priority).toBeGreaterThanOrEqual(next[i - 1].priority);
    }
  });
});
