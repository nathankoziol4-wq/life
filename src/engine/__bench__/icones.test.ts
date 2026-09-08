/**
 * Le jeu d'icônes, tenu par un test.
 *
 * **Ce qu'il remplace.** Le jeu employait 497 emoji répartis sur 203 formes
 * distinctes. Un emoji rend différemment sur chaque plateforme — un contrat
 * qu'on ne maîtrise pas — il ne prend pas la couleur du texte, et son style
 * figuratif jure avec une interface au trait.
 *
 * **Pourquoi la migration est partielle, et assumée.** Dessiner deux cents
 * formes d'un coup donnerait deux cents formes bâclées. Ce qui n'a pas encore
 * son dessin retombe sur l'emoji, ce qui laisse le jeu utilisable entre deux
 * lots. Ce test mesure où l'on en est et interdit de reculer.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SOURCE = readFileSync(join(ROOT, 'ui/components/Icon.tsx'), 'utf8');

/** Les tracés définis, lus dans le fichier lui-même. */
const paths = new Set(
  [...SOURCE.slice(SOURCE.indexOf('const PATHS'), SOURCE.indexOf('const FROM_EMOJI'))
    .matchAll(/^\s{2}([a-z]+):\s*'/gm)].map((m) => m[1]!),
);

/** La table emoji → nom de tracé. */
const mapping = new Map(
  [...SOURCE.slice(SOURCE.indexOf('const FROM_EMOJI'), SOURCE.indexOf('/** Le dessin correspondant'))
    .matchAll(/'([^']+)':\s*'([a-z]+)'/g)].map((m) => [m[1]!, m[2]!]),
);

/** Tous les `emoji="…"` écrits dans les écrans, avec leur nombre d'usages. */
function usages(): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.tsx')) {
        for (const m of readFileSync(join(ROOT, path), 'utf8').matchAll(/emoji="([^"]+)"/g)) {
          out.set(m[1]!, (out.get(m[1]!) ?? 0) + 1);
        }
      }
    }
  };
  walk('');
  return out;
}

describe('le jeu d’icônes', () => {
  /**
   * **Le défaut le plus discret de tout ce système.**
   *
   * `Icon` rend `null` quand le nom ne correspond à aucun tracé. Une faute de
   * frappe dans la table ne casse donc rien : la ligne s'affiche, simplement
   * son signe a disparu. Aucun autre test ne verrait ce blanc.
   */
  it('ne renvoie à aucun tracé qui n’existe pas', () => {
    const orphelins = [...mapping].filter(([, name]) => !paths.has(name));
    expect(
      orphelins.map(([e, n]) => `${e} → ${n}`),
      'ces emoji pointent vers un tracé inexistant : la ligne perdrait son signe en silence',
    ).toEqual([]);
  });

  /**
   * Et l'inverse : un tracé que personne n'emploie est du poids mort. Ce n'est
   * pas une faute, mais le savoir évite de dessiner dans le vide.
   */
  it('n’accumule pas de tracés que personne n’emploie', () => {
    const employes = new Set(mapping.values());
    const inutilises = [...paths].filter((n) => !employes.has(n));
    expect(
      inutilises,
      `ces tracés ne sont reliés à aucun emoji : ${inutilises.join(', ')}`,
    ).toEqual([]);
  });

  /*
   * **Le plancher de couverture.**
   *
   * Relevé du jour : 53 emoji dessinés sur 203 distincts, soit 48 % des 498
   * usages — la distribution est très inégale, et les formes fréquentes ont
   * été prises en premier.
   *
   * Le plancher est fait pour monter. Le baisser demande un commit qui dise
   * pourquoi, parce qu'une interface à moitié dessinée et à moitié en emoji
   * est plus laide que l'une ou l'autre entièrement.
   */
  const FLOOR = 45;

  it('couvre au moins la moitié des signes du jeu', () => {
    const all = usages();
    let total = 0;
    let drawn = 0;
    for (const [emoji, n] of all) {
      total += n;
      if (mapping.has(emoji)) drawn += n;
    }
    const pct = Math.round((drawn / total) * 100);
    // Garde-fou du garde-fou : une analyse cassée ne trouverait aucun usage
    // et le pourcentage n'aurait plus de sens.
    expect(total, 'plus aucun emoji trouvé dans les écrans : l’analyse a cassé')
      .toBeGreaterThan(300);
    expect(
      pct,
      `${drawn} usages dessinés sur ${total} (${pct} %) pour un plancher de ${FLOOR} %`,
    ).toBeGreaterThanOrEqual(FLOOR);
  });

  /**
   * Le style ne se négocie pas d'une icône à l'autre : même grille, même
   * trait, aucun remplissage, et la couleur prise au texte. Une icône qui
   * s'en écarterait se verrait immédiatement dans une liste.
   */
  it('garde un style unique', () => {
    expect(SOURCE).toContain("viewBox=\"0 0 24 24\"");
    expect(SOURCE).toContain("stroke: 'currentColor'");
    expect(SOURCE).toContain("fill: 'none'");
  });
});
