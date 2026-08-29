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

    /**
     * Sur l'intégration continue, un compte rendu bavard.
     *
     * **Ce que le symptôme était.** Le 29 août, la vérification est tombée en
     * échec avec `1615 passed` et `Errors 1 error` : aucun test cassé, mais
     * `[vitest-worker]: Timeout calling "onTaskUpdate"`. Ce n'est pas un
     * échec de mesure, c'est le canal par lequel les ouvriers racontent où ils
     * en sont qui a expiré.
     *
     * **Pourquoi maintenant.** Le rapporteur par défaut annonce *chaque test*
     * un par un — le journal de la machine en compte mille six cent quinze —
     * et chaque annonce est un aller-retour entre l'ouvrier et le processus
     * principal. Or ces tests simulent des vies entières de façon synchrone :
     * pendant qu'un fichier calcule vingt secondes d'affilée, il ne peut
     * répondre à rien. Le trafic a grossi avec la suite, la machine
     * d'intégration a deux cœurs contre quatre ici, et l'attente a fini par
     * dépasser le délai.
     *
     * **Ce qu'on change, et ce qu'on ne change pas.** On ne touche à aucun
     * test, on n'en raccourcit aucun, on ne baisse aucun seuil : ce serait
     * réparer la mesure au lieu de l'instrument. On rend seulement le compte
     * rendu discret là où personne ne le lit ligne à ligne. En local, le
     * rapport détaillé reste, parce que c'est là qu'on le lit.
     */
    reporters: process.env.CI ? ['dot'] : ['default'],

    /**
     * Et pas plus d'ouvriers que de cœurs.
     *
     * Même raison : sur deux cœurs, six fichiers lourds lancés ensemble se
     * disputent le processeur, chacun bloque plus longtemps, et le canal de
     * compte rendu attend d'autant plus. Mesuré sur la machine d'intégration :
     * 377 s d'horloge pour 980 s de calcul, soit deux ouvriers et demi
     * réellement actifs — le reste était de l'attente.
     */
    maxWorkers: process.env.CI ? 2 : undefined,
  },
});
