/**
 * Le jeu de portraits dessinés, tenu par un test.
 *
 * **Le défaut qu'il attrape est parfaitement muet.** Les images vivent dans
 * `public/`, que rien ne compile et que rien ne vérifie : elles sont copiées
 * telles quelles dans le paquet. Un nom mal orthographié dans la table, un
 * fichier renommé, une image oubliée au moment de la copie — et le personnage
 * s'affiche avec un carré vide. Pas d'erreur, pas de ligne en console : un
 * trou à la place du visage, dans l'en-tête de tous les écrans.
 *
 * Le vecteur, lui, ne peut pas disparaître : il est dans le paquet. C'est
 * précisément ce que le passage aux images fait perdre, et ce test est ce qui
 * le rachète.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PORTRAITS, agePortrait, choisirPortrait } from '../../data/portraits.ts';

const PUBLIC = new URL('../../../public/portraits', import.meta.url).pathname;
const CRADLE = readFileSync(
  new URL('../../data/cradle.ts', import.meta.url).pathname,
  'utf8',
);

function valeursDe(nom: string): string[] {
  const m = CRADLE.match(new RegExp(`export const ${nom} = \\[([^\\]]*)\\]`));
  expect(m, `${nom} introuvable dans cradle.ts : l’analyse a cassé`).toBeTruthy();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((q) => q[1]!);
}

describe('les portraits dessinés', () => {
  it('déclare au moins une poignée d’images', () => {
    expect(PORTRAITS.length, 'la table est vide : l’analyse ou la table a cassé')
      .toBeGreaterThan(10);
  });

  it('pointe vers des fichiers qui existent', () => {
    const manquants = PORTRAITS
      .map((p) => p.fichier)
      .filter((f) => !existsSync(join(PUBLIC, f)));
    expect(
      manquants,
      `ces images sont déclarées mais absentes de public/portraits : ${manquants.join(', ')}`,
    ).toEqual([]);
  });

  it('n’emploie pas deux fois le même fichier', () => {
    const vus = new Set<string>();
    const doubles = PORTRAITS.map((p) => p.fichier).filter((f) => vus.size === vus.add(f).size);
    expect(doubles, `ces images sont déclarées deux fois : ${doubles.join(', ')}`).toEqual([]);
  });

  /**
   * Les mots doivent être ceux du moteur. Un teint écrit « foncé » au lieu de
   * « foncée » ne planterait pas : l'image ne serait simplement jamais choisie,
   * et elle dormirait dans le paquet sans que rien ne le dise.
   */
  it('n’emploie que le vocabulaire du jeu', () => {
    const axes: [keyof typeof PORTRAITS[number], string][] = [
      ['peau', 'SKIN_TONES'],
      ['cheveux', 'HAIR_COLORS'],
      ['coiffure', 'HAIR_STYLES'],
    ];
    for (const [champ, liste] of axes) {
      const connus = new Set(valeursDe(liste));
      const inconnus = [...new Set(PORTRAITS.map((p) => String(p[champ])))]
        .filter((v) => !connus.has(v));
      expect(
        inconnus,
        `ces valeurs de « ${champ} » n’existent pas dans ${liste} : ${inconnus.join(', ')}`,
      ).toEqual([]);
    }
  });

  /**
   * **Le poids compte, et personne ne le surveille.** `public/` n'est pas
   * compilé : une image de deux mégaoctets y entre sans un mot et part dans le
   * paquet. Le jeu se joue au téléphone, souvent en données mobiles.
   */
  it('garde les images légères', () => {
    const lourdes = readdirSync(PUBLIC)
      .filter((f) => /\.(webp|png|jpg)$/.test(f))
      .map((f) => [f, statSync(join(PUBLIC, f)).size] as const)
      .filter(([, o]) => o > 60_000);
    expect(
      lourdes.map(([f, o]) => `${f} : ${Math.round(o / 1024)} Ko`),
      'ces images dépassent 60 Ko pièce',
    ).toEqual([]);
  });

  /**
   * **Le choix ne doit jamais tirer au sort.** Deux rendus du même personnage
   * qui donneraient deux visages, c'est le portrait qui change à chaque ouverture
   * de menu. C'est la même règle que pour le tracé vectoriel, et elle vaut
   * d'autant plus ici qu'un changement d'image se voit de loin.
   */
  it('choisit toujours le même portrait pour le même personnage', () => {
    const traits = { sexe: 'F' as const, peau: 'mate', cheveux: 'bruns', coiffure: 'raides', age: 28 };
    const premier = choisirPortrait(traits);
    expect(premier, 'aucun portrait choisi pour un cas pourtant couvert').toBeTruthy();
    for (let i = 0; i < 20; i += 1) {
      expect(choisirPortrait(traits)?.fichier).toBe(premier!.fichier);
    }
  });

  /**
   * Tant que le jeu d'images ne couvre pas les enfants ni les anciens, le
   * choix doit rendre `null` pour eux : c'est ce qui laisse le tracé vectoriel
   * prendre le relais, lui qui vieillit. Le jour où des enfants arrivent, ce
   * test tombe — et c'est exactement ce qu'on veut qu'il fasse, parce qu'il
   * faudra alors relire cette règle.
   */
  it('laisse le tracé prendre les âges qu’aucune image ne couvre', () => {
    const ages = new Set(PORTRAITS.map((p) => p.age));
    for (const n of [3, 8, 70, 90]) {
      const couvert = ages.has(agePortrait(n));
      const choisi = choisirPortrait({
        sexe: 'M', peau: 'claire', cheveux: 'noirs', coiffure: 'courts', age: n,
      });
      expect(
        Boolean(choisi),
        `à ${n} ans, tranche « ${agePortrait(n)} » : ${couvert ? 'des images existent mais aucune n’est choisie' : 'aucune image ne couvre cet âge, et pourtant une est choisie'}`,
      ).toBe(couvert);
    }
  });
});
