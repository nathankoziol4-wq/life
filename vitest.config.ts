/**
 * Configuration des tests.
 *
 * Séparée de `vite.config.ts` pour une raison précise : Vitest embarque sa
 * propre copie de Vite, et mélanger les deux dans un seul fichier fait
 * diverger les types de greffons. Aucun test ne rend de JSX — ils portent
 * tous sur le moteur, qui ne connaît pas React — donc cette configuration
 * n'a besoin d'aucun greffon.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Les tests de `__bench__` simulent des centaines de vies entières pour
     * mesurer une tendance, et une vie coûte de plus en plus cher à mesure
     * que le moteur gagne des systèmes. Plusieurs d'entre eux tournaient à
     * trois ou quatre secondes contre le plafond de cinq par défaut : ils
     * passaient, jusqu'au jour où la machine était occupée ailleurs. Un
     * échec par lenteur ressemble à un échec de mesure, et fait douter du
     * bon test.
     */
    testTimeout: 60_000,
  },
});
