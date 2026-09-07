/**
 * Le typage de `jetons.mjs`, pour que le garde-fou puisse l'importer.
 *
 * `tsconfig.app.json` n'inclut que `src`, et le dépôt avait jusqu'ici résolu
 * le problème en dupliquant : `contraste.test.ts` réécrit la mesure de
 * luminance plutôt que d'importer `tools/contraste.mjs`. Cela marche, mais
 * cela laisse deux implémentations d'une même règle libres de diverger — et
 * c'est précisément ce qu'un garde-fou ne doit pas permettre.
 *
 * Une déclaration à côté du module résout le typage sans toucher à
 * `include` : le test et le rapport partagent alors la même analyse, et une
 * correction de l'un profite à l'autre.
 */

/** Le contenu de chaque `style={{ … }}`, accolades équilibrées, commentaires retirés. */
export function stylesOf(source: string): string[];

/** Une valeur calculée à l'exécution : rien ne peut la mettre en feuille. */
export function isComputed(style: string): boolean;

/** Ce qui trahit une couleur écrite à la main plutôt qu'un jeton. */
export const COLOUR: RegExp;

export function measure(): {
  files: number;
  computed: number;
  literal: string[];
  colours: string[];
};
