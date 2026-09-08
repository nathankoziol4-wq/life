/**
 * Le mouvement, tenu par un test.
 *
 * **Pourquoi celui-ci est nécessaire.** Une animation qui disparaît ne casse
 * rien de visible : le contenu s'affiche, simplement il ne bouge plus. C'est
 * exactement le défaut silencieux que `fermees.test.ts` attrape pour les
 * lignes fermées, transposé à la couche de mouvement — et aucun autre test du
 * dépôt ne le verrait.
 *
 * **Ce que la mesure a trouvé en l'écrivant.** Sur 40 déclarations
 * d'animation ou de transition, **une seule** employait un jeton de durée
 * dans `styles.css`, contre 25 valeurs écrites à la main : 0,12 s, 0,15 s,
 * 0,4 s, 0,05 s. Le fichier de jetons annonçait pourtant une échelle de
 * mouvement en quatre pas. La règle existait, personne ne la suivait, et rien
 * ne le disait. Seize ont depuis rejoint l'échelle ; les dix qui restent sont
 * des timings de mini-jeu, et la note du plafond dit pourquoi on n'y touche
 * pas.
 *
 * Les deux fichiers ne sont pas jugés pareil, et c'est délibéré :
 * `components.css` est le système de design, il doit être irréprochable ;
 * `styles.css` est l'héritage, on lui pose un plafond qui ne peut que
 * descendre.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const read = (p: string) => readFileSync(ROOT + p, 'utf8');

const tokens = read('ui/theme/tokens.css');
const system = read('ui/theme/components.css');
const legacy = read('styles.css');

/** Les déclarations de mouvement d'une feuille, commentaires retirés. */
function motions(css: string): string[] {
  const clean = css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/(?:animation|transition):[^;]*/g)].map((m) => m[0]);
}

/** Une durée écrite à la main, par opposition à un jeton. */
const HARD = /\b\d+(\.\d+)?m?s\b/;

describe('le mouvement', () => {
  it('a son échelle, et le mouvement réduit la ramène à zéro', () => {
    const scale = ['--motion-instant', '--motion-quick', '--motion-base', '--motion-slow', '--motion-loop', '--motion-breath'];
    for (const name of scale) {
      expect(tokens, `le jeton ${name} n’est plus défini`).toContain(`${name}:`);
    }
    /*
     * Le mouvement réduit est traité à deux endroits : les jetons de durée
     * passent à zéro ici, et `styles.css` ramène en plus toute animation à
     * 0,01 ms. La ceinture et les bretelles — mais la première seule ne
     * suffirait pas, puisque 25 déclarations n'emploient pas les jetons.
     */
    const reduced = tokens.slice(tokens.indexOf('@media (prefers-reduced-motion'));
    for (const name of scale) {
      expect(reduced, `${name} n’est pas neutralisé en mouvement réduit`)
        .toContain(`${name}: 0ms`);
    }
    expect(legacy, 'la surcharge globale de mouvement réduit a disparu')
      .toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('n’écrit aucune durée en dur dans le système de design', () => {
    const hard = motions(system).filter((m) => HARD.test(m));
    expect(
      hard,
      `ces déclarations de components.css écrivent une durée au lieu d’un jeton :\n  ${hard.join('\n  ')}`,
    ).toEqual([]);
  });

  /*
   * **Le plafond de l'héritage, et ce qu'il ne compte pas.**
   *
   * Descendu de 25 à 10 en migrant le chrome d'interface — appuis, modales,
   * feuilles, jauges d'écran — sur l'échelle de mouvement.
   *
   * Les dix qui restent sont délibérées, et elles ont toutes la même raison :
   * ce sont des **timings de mini-jeu**. `.scene-hand`, `.scene-cursor`,
   * `.plan-player`, `.yard-you`, `.ropeline-face`, `.dock-rail`,
   * `.game-gauge-fill`, `.paper-bar-fill` suivent le doigt ou remplissent une
   * jauge pendant qu'on joue : leurs 50 à 120 millisecondes *sont* la
   * mécanique. Les aligner sur `--motion-instant` (90 ms) ajouterait du
   * retard à un contrôle de jeu — donc changerait le gameplay, pas
   * l'habillage. La pulsation du bouton d'âge, elle, a rejoint
   * l'échelle : c'est `--motion-breath`, le rythme de ce qui attend le
   * joueur, et le reflet qui le traverse en est le double.
   *
   * Le plafond est fait pour descendre. Le monter demande un commit qui dise
   * pourquoi.
   */
  const LEGACY_CEILING = 10;

  it('ne laisse pas les durées en dur remonter dans l’héritage', () => {
    const hard = motions(legacy).filter((m) => HARD.test(m));
    expect(
      hard.length,
      `${hard.length} durées en dur dans styles.css pour un plafond de ${LEGACY_CEILING}`,
    ).toBeLessThanOrEqual(LEGACY_CEILING);
    // Garde-fou du garde-fou : une analyse cassée n'en trouverait aucune et
    // passerait en ne mesurant plus rien.
    expect(motions(legacy).length, 'plus aucune déclaration trouvée : l’analyse a cassé')
      .toBeGreaterThan(15);
  });

  /**
   * Les animations que les composants nomment doivent exister.
   *
   * Une `animation: ui-rise …` dont la règle `@keyframes` a disparu ne
   * produit aucune erreur : l'élément s'affiche sans bouger. C'est le mode de
   * panne le plus discret de toute cette couche.
   */
  it('définit chaque animation qu’elle emploie', () => {
    const css = system + legacy;
    const declared = new Set(
      [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!),
    );
    const used = new Set(
      [...css.matchAll(/animation:\s*([\w-]+)/g)].map((m) => m[1]!),
    );
    const missing = [...used].filter((name) => !declared.has(name));
    expect(
      missing,
      `ces animations sont employées sans être définies : ${missing.join(', ')}`,
    ).toEqual([]);
  });

  /**
   * Et les classes que le JavaScript pose doivent être stylées.
   *
   * `overlay-out` et `sheet-out` viennent de `Modal.tsx`, `feed-milestone` et
   * `feed-more` de `LifeFeed.tsx`, `ui-count` de `AppHeader.tsx`. Aucune n'a
   * d'effet fonctionnel : les effacer laisse un jeu qui marche et qui ne
   * bouge plus.
   *
   * Les deux en `-out` portent en plus une règle de sûreté : elles existent
   * pour qu'un élément en cours de départ **cesse de répondre au nom du
   * vivant**. Les supprimer ne casserait pas l'affichage, mais rendrait à
   * nouveau possible qu'un sélecteur attrape un nœud mort — ce qui a déjà
   * coûté deux diagnostics dans ce dépôt.
   *
   * `ui-screen-in` a été retirée : voir la note de `components.css` sur la
   * transition entre onglets, qui a coûté deux régressions pour quatre
   * pixels de fondu.
   */
  it('style chaque classe que les composants posent pour animer', () => {
    for (const cls of ['overlay-out', 'sheet-out', 'feed-milestone', 'ui-count', 'ui-rise', 'feed-more']) {
      expect(
        system.includes(`.${cls}`) || system.includes(`${cls} `) || legacy.includes(`.${cls}`),
        `la classe .${cls} est posée par un composant mais n’est plus stylée`,
      ).toBe(true);
    }
  });
});
