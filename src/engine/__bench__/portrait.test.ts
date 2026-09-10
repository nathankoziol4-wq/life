/**
 * Le portrait du personnage, tenu par un test.
 *
 * **Le défaut qu'il attrape, et il est muet.** `Portrait.tsx` traduit des mots
 * — « mate », « auburn », « bouclés » — en couleurs et en géométrie, avec un
 * repli sur la première entrée quand le mot est inconnu. Ce repli est
 * volontaire : un portrait sans peau serait un trou dans l'interface, là où un
 * teint approché reste un visage.
 *
 * Mais il rend une faute totalement silencieuse. Le jour où quelqu'un ajoute
 * « platine » à `HAIR_COLORS` dans `data/cradle.ts`, un personnage sur sept
 * naîtra avec cette couleur — et sera dessiné brun. Rien ne planterait, aucun
 * test existant ne le verrait, et le joueur constaterait seulement que sa
 * coiffure ne correspond pas à sa fiche.
 *
 * Ce test relie les deux fichiers : toute valeur que le moteur peut tirer doit
 * avoir sa traduction.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PORTRAIT = readFileSync(
  new URL('../../ui/components/Portrait.tsx', import.meta.url).pathname,
  'utf8',
);

/** Les clés d'une table du portrait, lues dans le fichier lui-même. */
function clesDe(nom: string): Set<string> {
  const debut = PORTRAIT.indexOf(`const ${nom}`);
  const fin = PORTRAIT.indexOf('\n};', debut);
  expect(debut, `table ${nom} introuvable : l’analyse a cassé`).toBeGreaterThan(-1);
  const bloc = PORTRAIT.slice(debut, fin);
  return new Set(
    [...bloc.matchAll(/^ {2}'?([^':\n]+?)'?:/gm)].map((m) => m[1]!.trim()),
  );
}

describe('le portrait du personnage', () => {
  /*
   * Les cinq axes que le moteur tire, et la table qui doit les traduire.
   * `features` est à part : les particularités sont *optionnelles* — une
   * mèche rebelle qui n'a pas de dessin ne laisse rien de faux à l'écran,
   * seulement rien du tout, ce qui est acceptable.
   */
  const AXES: { donnee: string; table: string }[] = [
    { donnee: 'SKIN_TONES', table: 'PEAU' },
    { donnee: 'HAIR_COLORS', table: 'CHEVEUX' },
    { donnee: 'EYE_COLORS', table: 'YEUX' },
    { donnee: 'FACE_SHAPES', table: 'VISAGE' },
  ];

  const cradle = readFileSync(
    new URL('../../data/cradle.ts', import.meta.url).pathname,
    'utf8',
  );

  function valeursDe(nom: string): string[] {
    const m = cradle.match(new RegExp(`export const ${nom} = \\[([^\\]]*)\\]`));
    expect(m, `${nom} introuvable dans cradle.ts : l’analyse a cassé`).toBeTruthy();
    return [...m![1]!.matchAll(/'([^']+)'/g)].map((q) => q[1]!);
  }

  for (const { donnee, table } of AXES) {
    it(`traduit chaque valeur de ${donnee}`, () => {
      const attendues = valeursDe(donnee);
      expect(attendues.length, `aucune valeur lue dans ${donnee}`).toBeGreaterThan(3);
      const connues = clesDe(table);
      const orphelines = attendues.filter((v) => !connues.has(v));
      expect(
        orphelines,
        `ces valeurs seraient dessinées avec le repli, en silence : ${orphelines.join(', ')}`,
      ).toEqual([]);
    });
  }

  /**
   * Les coiffures sont un `switch`, pas une table : le `default` est le repli,
   * et il faut donc qu'une branche existe pour chaque style sauf celui que le
   * `default` sert légitimement.
   */
  it('dessine chaque coiffure de HAIR_STYLES', () => {
    const styles = valeursDe('HAIR_STYLES');
    const bloc = PORTRAIT.slice(PORTRAIT.indexOf('function chevelure'));
    const cas = new Set([...bloc.matchAll(/case '([^']+)':/g)].map((m) => m[1]!));
    // « courts » est servi par le `default` : c'est écrit dans le fichier.
    const manquantes = styles.filter((s) => s !== 'courts' && !cas.has(s));
    expect(
      manquantes,
      `ces coiffures retomberaient sur le dessin par défaut : ${manquantes.join(', ')}`,
    ).toEqual([]);
  });

  /**
   * **Le portrait ne doit rien tirer au sort.**
   *
   * C'est ce qui garantit la cohérence demandée : le même personnage donne
   * toujours le même visage, et changer une caractéristique n'en change
   * qu'une. Un `Math.random` glissé ici ferait changer le visage à chaque
   * rendu de React — donc à chaque année, à chaque ouverture de menu.
   */
  it('ne tire rien au sort', () => {
    expect(PORTRAIT).not.toContain('Math.random');
    expect(PORTRAIT).not.toMatch(/\brng\b/);
  });

  /**
   * Le fond doit rester transparent : c'est l'appelant qui décide du médaillon,
   * du carré ou de rien. Un fond peint dans le SVG se verrait comme un
   * rectangle derrière chaque portrait dès qu'on change de forme.
   */
  it('garde un fond transparent', () => {
    const svg = PORTRAIT.slice(PORTRAIT.indexOf('<svg'), PORTRAIT.indexOf('>', PORTRAIT.indexOf('<svg')));
    expect(svg).not.toContain('background');
    expect(svg).not.toContain('fill=');
  });
});
