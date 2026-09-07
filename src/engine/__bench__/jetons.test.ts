/**
 * L'adoption des jetons, tenue par un test.
 *
 * **Ce que la mesure a trouvé.** `tokens.css` s'ouvre sur une règle — « aucune
 * valeur en dur » — et `components.css` a été écrit pour supprimer 443
 * corrections d'écrans. Rien ne vérifiait que la règle tenait. Elle ne tenait
 * pas : **617 `style={{}}` dans 62 fichiers**, contre 575 quelques semaines
 * plus tôt. L'adoption ne stagnait pas, elle reculait — et c'est bien le point :
 * un chiffre que personne ne tient remonte tout seul.
 *
 * **Ce qui était en dessous.** Deux cent trente-trois de ces styles portaient
 * la même chose : `<p className="small muted" style={{ margin: '8px 4px 0',
 * lineHeight: 1.5 }}>`. `.small` et `.muted` existaient, mais ne portaient que
 * la taille et la couleur ; la marge et l'interligne étaient réécrits à chaque
 * fois. C'est ainsi qu'un même paragraphe s'est mis à exister avec quatre
 * interlignes — 1,45 hérité, puis 1,5, puis 1,55, puis 1,6. Le défaut n'était
 * pas six cent dix-sept valeurs éparses, c'était un composant jamais écrit.
 *
 * **Pourquoi deux plafonds et non un.** Une largeur de jauge, la position d'un
 * mobile dans un mini-jeu, une couleur choisie par le moteur : ce sont des
 * valeurs calculées à l'exécution, qu'aucun jeton ne peut exprimer. Les
 * compter avec les autres donnerait un chiffre faux dans le sens qui arrange.
 */

import { describe, expect, it } from 'vitest';
import { COLOUR, isComputed, stylesOf } from '../../../tools/jetons.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;

function sources(dir = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...sources(path));
    else if (entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

function measure() {
  let computed = 0;
  const literal: string[] = [];
  const colours: string[] = [];
  for (const file of sources()) {
    for (const style of stylesOf(readFileSync(join(ROOT, file), 'utf8'))) {
      if (COLOUR.test(style)) colours.push(`${file} — ${style}`);
      if (isComputed(style)) computed += 1;
      else literal.push(`${file} — ${style}`);
    }
  }
  return { computed, literal, colours };
}

/*
 * Les plafonds sont posés un peu au-dessus du relevé du jour — 102 valeurs en
 * dur, 46 calculées — pour laisser passer un écran neuf sans laisser passer
 * une dérive. L'écart de 575 à 617 qui a motivé tout ceci aurait été pris.
 *
 * Ils sont faits pour descendre. Baisser un plafond après avoir nettoyé un
 * écran est un bon commit ; le monter en demande un qui dise pourquoi.
 */
const LITERAL_CEILING = 110;
const COMPUTED_CEILING = 60;

describe('l’adoption des jetons', () => {
  it('ne laisse pas les valeurs en dur remonter', () => {
    const { literal } = measure();
    expect(
      literal.length,
      `${literal.length} valeurs en dur pour un plafond de ${LITERAL_CEILING}.`
      + ` Les plus récentes :\n  ${literal.slice(-8).join('\n  ')}`,
    ).toBeLessThanOrEqual(LITERAL_CEILING);
  });

  /**
   * Les couleurs sont à part, et à zéro.
   *
   * Une couleur écrite à la main ne suit pas le thème : elle reste identique
   * quand tout le reste bascule en sombre, et rien ne le signale — l'écran
   * s'affiche, simplement il est faux. C'est la seule catégorie où un plafond
   * souple n'aurait pas de sens.
   *
   * Le dernier cas trouvé était un repli, `var(--bad, #c0392b)`, dont la
   * valeur de secours ne valait plus le jeton depuis un changement de palette.
   * Il ne se déclenchait jamais ; le jour où il l'aurait fait, il aurait rendu
   * une autre couleur sans prévenir.
   */
  it('ne laisse aucune couleur en dur dans les écrans', () => {
    const { colours } = measure();
    expect(
      colours,
      `ces styles écrivent une couleur au lieu d’un jeton :\n  ${colours.join('\n  ')}`,
    ).toEqual([]);
  });

  it('sépare bien ce qui est calculé de ce qui est écrit', () => {
    const { computed, literal } = measure();
    // Le compte sert de garde-fou au garde-fou : si l'analyse des balises
    // cassait, elle trouverait zéro style et les plafonds passeraient en ne
    // mesurant plus rien.
    expect(computed + literal.length, 'plus aucun style trouvé : l’analyse a cassé')
      .toBeGreaterThan(80);
    expect(
      computed,
      `${computed} styles calculés à l’exécution : au-delà de ${COMPUTED_CEILING},`
      + ' vérifier qu’ils le sont vraiment plutôt que de monter le plafond',
    ).toBeLessThanOrEqual(COMPUTED_CEILING);
  });

  /**
   * Les classes posées en remplacement doivent rester définies. Une classe
   * effacée de la feuille ne casse rien de visible : le texte s'affiche, sans
   * sa marge ni son interligne. C'est exactement le genre de perte qu'aucun
   * autre test ne verrait.
   */
  it('garde les classes qui ont remplacé les styles', () => {
    const css = readFileSync(join(ROOT, 'ui/theme/components.css'), 'utf8')
      + readFileSync(join(ROOT, 'styles.css'), 'utf8');
    for (const cls of [
      'note', 'note-flush', 'note-block', 'figure', 'lede',
      'pad-above-1', 'pad-above-2', 'pad-above-3', 'pad-above-4',
      'pad-below-2', 'pad-below-3', 'text-right', 'center',
      'pill-splash', 'pill-splash-strong',
    ]) {
      expect(css, `la classe .${cls} n’est plus définie`).toMatch(
        new RegExp(`\\.${cls}\\s*[,{]`),
      );
    }
  });

  /**
   * Et les jetons que ces classes emploient. `--text-lede` a été ajouté à
   * l'échelle parce que dix-sept points y manquaient réellement entre le corps
   * et le titre ; `--on-brand` existe parce que le dégradé du seuil ne suit pas
   * le thème et que le blanc qui s'y pose devait cesser d'être écrit en `#fff`.
   */
  it('garde les jetons que ces classes emploient', () => {
    const tokens = readFileSync(join(ROOT, 'ui/theme/tokens.css'), 'utf8');
    for (const name of [
      '--text-lede', '--on-brand', '--on-brand-soft', '--on-brand-strong',
      '--space-1', '--space-2', '--space-3', '--space-4', '--leading-body',
      '--weight-black', '--tracking-title',
    ]) {
      expect(tokens, `le jeton ${name} n’est plus défini`).toContain(`${name}:`);
    }
  });
});
