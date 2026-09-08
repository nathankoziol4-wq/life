/**
 * Le contraste des encres, tenu par un test.
 *
 * **Ce que la mesure a trouvé.** `--ink-muted` est la couleur du sous-titre de
 * chaque ligne du jeu. Elle rendait 3,90:1 sur blanc et **3,25:1 sur
 * `--bg-deep`**, pour un plancher WCAG AA de 4,5:1 — donc les sous-titres de
 * l'application entière étaient sous le seuil en thème clair. `--ink-faint`
 * était à 1,86:1 au pire, sous le plancher de 3:1 des éléments non textuels.
 *
 * Rien ne le vérifiait : le fichier de jetons portait la matière et le sens,
 * mais pas la lisibilité. Les audits mobiles existants mesurent le débordement,
 * la taille des cibles et le texte coupé — pas le rapport de luminance.
 *
 * **Le blanc est le cas le plus favorable, et c'est le piège.** Une première
 * mesure ne regardait que `--surface` et concluait à un manque de 0,6 point.
 * Sur les cinq surfaces réelles, le pire cas est `--bg-deep`, et il manquait
 * 1,25 point.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(
  new URL('../../ui/theme/tokens.css', import.meta.url).pathname,
  'utf8',
);

/** Les jetons de couleur d'un bloc, lus dans le fichier lui-même. */
function tokensOf(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

/**
 * Tous les blocs d'un thème, et pas le premier.
 *
 * La matière et le sens vivent dans deux blocs séparés, et les blocs sombres
 * passent entre les deux. Découper « du premier `:root,` jusqu'au premier
 * `@media` » ne lisait donc que la matière : les douze couleurs de famille du
 * thème clair étaient invisibles à ce test, qui affirmait pourtant que tout
 * tenait. `contraste.mjs` avait déjà été corrigé de ce défaut ; ce fichier-ci
 * l'avait gardé, ce qui est la meilleure preuve qu'une correction faite à un
 * seul endroit ne suffit pas.
 */
function blocksOf(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of CSS.matchAll(new RegExp(`${selector}\\s*\\{`, 'g'))) {
    const start = m.index + m[0].length;
    const end = CSS.indexOf('\n}', start);
    Object.assign(out, tokensOf(CSS.slice(start, end === -1 ? undefined : end)));
  }
  return out;
}

const light = blocksOf("(?::root,\\s*)?:root\\[data-theme='light'\\]");
const dark = blocksOf(":root\\[data-theme='dark'\\]");

/** La variante « comme le système », qui ne pose aucun attribut. */
const systeme = blocksOf(":root:not\\(\\[data-theme='light'\\]\\)");

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n.slice(0, 6);
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * Les planchers, et pourquoi ils diffèrent.
 *
 * WCAG 2.2 demande 4,5:1 pour du texte courant (1.4.3) et 3:1 pour ce qui
 * n'est pas du texte — un chevron, un trait, une jauge (1.4.11). `ink-faint`
 * est la seule encre qui ne porte pas de texte : c'est ce qui lui vaut le
 * plancher bas, et c'est aussi ce qui rend le test suivant nécessaire.
 */
const INKS: { name: string; floor: number }[] = [
  { name: 'ink', floor: 4.5 },
  { name: 'ink-soft', floor: 4.5 },
  { name: 'ink-muted', floor: 4.5 },
  { name: 'ink-faint', floor: 3 },
];

/** Toutes les surfaces sur lesquelles une encre peut se poser. */
const GROUNDS = ['surface', 'surface-alt', 'surface-sunken', 'bg', 'bg-deep'];

describe('le contraste des encres', () => {
  for (const [label, theme] of [['clair', light], ['sombre', dark]] as const) {
    it(`tient son plancher sur toutes les surfaces, en thème ${label}`, () => {
      for (const ink of INKS) {
        const hex = theme[ink.name];
        expect(hex, `--${ink.name} introuvable`).toBeDefined();
        for (const ground of GROUNDS) {
          const bg = theme[ground];
          expect(bg, `--${ground} introuvable`).toBeDefined();
          const value = ratio(hex!, bg!);
          expect(
            value,
            `--${ink.name} sur --${ground} : ${value.toFixed(2)}:1 pour un plancher de ${ink.floor}:1`,
          ).toBeGreaterThanOrEqual(ink.floor);
        }
      }
    });
  }

  /**
   * `--ink-faint` ne tient que le plancher des éléments non textuels. Elle
   * portait pourtant l'année du fil de vie, en douze points gras — passée
   * depuis à l'encre sourde. Si un écran l'y remet, le plancher de 3:1
   * devient un mensonge, et ce test est le seul endroit qui s'en apercevra.
   */
  it('ne laisse pas l’encre pâle reprendre du texte', () => {
    const components = readFileSync(
      new URL('../../ui/theme/components.css', import.meta.url).pathname,
      'utf8',
    );
    const textual: string[] = [];
    // On retire les commentaires avant de lire : une note qui *explique*
    // pourquoi une règle n'emploie pas l'encre pâle contient forcément son
    // nom, et le premier jet de ce test s'y est fait prendre.
    const rules = components.replaceAll(/\/\*[\s\S]*?\*\//g, '');
    for (const block of rules.split('}')) {
      if (!block.includes('--ink-faint')) continue;
      // Une règle qui pose une taille ou une graisse de texte *et* l'encre
      // pâle met du texte dans une couleur qui n'est pas faite pour ça.
      const sizes = /font-size|font-weight|--text-/.test(block);
      // Le chevron est l'exception connue : il porte « › », qui est un signe
      // d'interface et non une phrase, et relève donc bien du plancher de 3:1.
      if (sizes && !block.includes('.ui-row-chevron')) {
        textual.push((block.match(/\.[a-z-]+/) ?? ['(inconnu)'])[0]!);
      }
    }
    expect(
      textual,
      `ces règles mettent du texte en --ink-faint : ${textual.join(', ')}`,
    ).toEqual([]);
  });

  /**
   * Les quatre encres doivent rester distinctes : si deux se rejoignent, la
   * hiérarchie de lecture disparaît, et corriger un contraste en écrasant la
   * nuance serait un remède pire que le mal.
   */
  it('garde les quatre encres distinctes', () => {
    for (const [label, theme] of [['clair', light], ['sombre', dark]] as const) {
      const ground = theme.surface!;
      const values = INKS.map((ink) => ratio(theme[ink.name]!, ground));
      for (let i = 1; i < values.length; i += 1) {
        expect(
          values[i - 1]! - values[i]!,
          `en thème ${label}, ${INKS[i - 1]!.name} et ${INKS[i]!.name} se rejoignent`,
        ).toBeGreaterThan(0.5);
      }
    }
  });

  /**
   * **Le thème sombre a deux sources, et elles avaient divergé.**
   *
   * Le réglage explicite du joueur pose `data-theme='dark'` ; « comme le
   * système » ne pose rien du tout et passe par le `@media`. Ce sont deux
   * variantes du même thème, et le fichier le disait déjà en commentaire —
   * « une couleur qui ne serait que dans l'un des deux manquerait à l'autre ».
   *
   * Elles avaient divergé quand même : le bloc du `@media` portait les
   * couleurs de famille *claires*, donc des pastilles presque blanches sur un
   * fond presque noir, pour tout joueur n'ayant jamais touché au réglage. Rien
   * ne l'a signalé pendant ce temps, parce que l'outil de contraste comme ce
   * test ne lisaient que la variante explicite.
   *
   * Un commentaire ne tient pas un invariant. Celui-ci, si.
   */
  it('garde les deux sources du thème sombre identiques', () => {
    const noms = [...new Set([...Object.keys(dark), ...Object.keys(systeme)])].sort();
    // Garde-fou du garde-fou : une analyse cassée ne lirait aucun jeton et
    // trouverait deux blocs vides, donc parfaitement d'accord.
    expect(noms.length, 'aucun jeton lu dans les blocs sombres : l’analyse a cassé')
      .toBeGreaterThan(20);
    const ecarts = noms
      .filter((nom) => dark[nom] !== systeme[nom])
      .map((nom) => `--${nom} : explicite ${dark[nom] ?? '(absent)'}, système ${systeme[nom] ?? '(absent)'}`);
    expect(
      ecarts,
      'un joueur verrait une palette ou l’autre selon un réglage jamais touché',
    ).toEqual([]);
  });
});
