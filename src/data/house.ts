/**
 * La maison — ce que diriger veut dire.
 *
 * **Ce que ce fichier ouvre.** Le milieu organisé est l'un des systèmes les
 * plus complets du jeu : on entre, on monte de guetteur à patron, on prend des
 * missions ou l'on refuse celles qu'on impose, on se fait un carnet
 * d'adresses, on demande des services, on part. Six rangs, et le sixième
 * s'appelle « Patron » avec pour description : « Tout remonte à toi, y compris
 * ce que tu n'as pas décidé. »
 *
 * Sauf que rien ne remontait. **Aucune ligne de code ne traitait le rang cinq
 * différemment des autres** : on continuait à recevoir des missions de
 * personne, à les exécuter soi-même, avec une part un peu plus grosse. Le
 * catalogue le disait : « le rang de patron existe ; il n'ouvre aucun gameplay
 * de direction ».
 *
 * Ce qui le remplace change ce qu'on fait, et pas seulement ce qu'on gagne :
 * **on cesse d'exécuter, on place des gens.** Trois postes à tenir, moins de
 * gens que de postes, et la certitude que celui qu'on ne place pas est celui
 * qui finira par bouger.
 *
 * Deux dials, et ils se contredisent :
 *
 * — **qui tient quoi** : le terrain, la caisse, le silence. On ne peut pas
 *   tout couvrir, et ce qu'on laisse vide se paie précisément là ;
 * — **ce qu'on leur laisse** : une part généreuse achète la paix et vide la
 *   caisse ; une part maigre remplit la caisse et fabrique des rivaux.
 *
 * **Rien ici ne décrit une organisation réelle.** « La maison », « le
 * terrain », « la caisse » et « le silence » sont quatre mots de jeu ; il n'y
 * a ni structure, ni pratique, ni groupe reconnaissable, et l'on pourrait en
 * changer tous les termes sans toucher une ligne de code.
 */

/* ------------------------------------------------------------------ */
/* Les postes                                                          */
/* ------------------------------------------------------------------ */

export interface Post {
  id: string;
  label: string;
  emoji: string;
  /** Ce que le poste protège, et ce qui se dégrade quand il est vide. */
  line: string;
  /** Ce qu'un poste vide coûte chaque année. */
  neglect: string;
}

export const POSTS: Post[] = [
  {
    id: 'terrain', label: 'Tenir le terrain', emoji: '🧱',
    line: 'Quelqu’un doit être là quand ceux d’en face y sont.',
    neglect: 'Le terrain se perd un peu chaque année où personne ne le tient.',
  },
  {
    id: 'caisse', label: 'Faire rentrer', emoji: '💰',
    line: 'Ce qui rentre dépend surtout de qui s’en occupe.',
    neglect: 'Sans personne à la caisse, il ne rentre presque rien.',
  },
  {
    id: 'silence', label: 'Tenir au calme', emoji: '🤫',
    line: 'Ce qui fait du bruit finit sur un bureau.',
    neglect: 'Tout ce que font tes gens s’entend, et cela s’accumule.',
  },
];

export function getPost(id: string): Post | undefined {
  return POSTS.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce que rapporte le terrain                                          */
/* ------------------------------------------------------------------ */

/** Ce qu'un point d'emprise rapporte par an, avant tout le reste. */
export const GROUND_YIELD = 780;

/** Ce que la caisse tenue par quelqu'un de compétent ajoute, au plus. */
export const TILL_BONUS = 0.9;

/**
 * Ce que le terrain gagne par an quand quelqu'un le tient bien.
 *
 * **Mesuré, et corrigé pour ça.** À six, même le meilleur tenant du terrain
 * rendait moins que la poussée d'en face : l'emprise ne faisait que baisser
 * quelle que soit la façon de diriger, elle tombait à zéro en quatre ans, et
 * comme c'est elle qui porte les revenus, la maison ne rapportait rien dans
 * toutes les configurations. Une maison bien tenue doit pouvoir gagner du
 * terrain — sinon diriger n'est pas un système, c'est une chute réglée.
 */
export const GROUND_HELD = 12;

/** Et ce qu'il perd quand personne ne le tient. */
export const GROUND_LOST = 7;

/** La poussée annuelle de la maison d'en face, avant compétence. */
export const RIVAL_PUSH = 5;

/* ------------------------------------------------------------------ */
/* Le bruit                                                            */
/* ------------------------------------------------------------------ */

/** Ce que l'activité de la maison ajoute d'attention chaque année. */
export const NOISE = 9;

/** Ce qu'un bon silence en retire, au plus. */
export const HUSH = 11;

/* ------------------------------------------------------------------ */
/* Ce qu'on leur laisse                                                */
/* ------------------------------------------------------------------ */

/** Les parts possibles, et ce qu'elles disent. */
export const CUTS: { id: string; label: string; emoji: string; share: number; line: string }[] = [
  { id: 'maigre', label: 'Le strict minimum', emoji: '🪙', share: 0.15, line: 'Tu gardes presque tout. Ils comptent, eux aussi.' },
  { id: 'correct', label: 'Ce qui se fait', emoji: '⚖️', share: 0.32, line: 'Personne ne se plaint, personne ne te remercie.' },
  { id: 'large', label: 'Largement', emoji: '🎁', share: 0.5, line: 'On te suivrait n’importe où. Il ne reste plus grand-chose.' },
];

export function getCut(id: string): { share: number } {
  return CUTS.find((c) => c.id === id) ?? CUTS[1]!;
}

/* ------------------------------------------------------------------ */
/* Les rancunes                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une année sans poste ajoute de rancune, chez quelqu'un d'ambitieux.
 *
 * **Le côté qui fait la décision.** Sans lui, on placerait ses deux meilleurs
 * et l'on oublierait les autres : ne pas se servir de quelqu'un ne coûterait
 * rien. Avec lui, chaque personne laissée de côté est un problème qui mûrit,
 * et d'autant plus vite qu'elle se croit capable.
 */
export const IDLE_GRUDGE = 9;

/** Ce qu'une part maigre ajoute de rancune, chez tout le monde. */
export const THIN_GRUDGE = 7;

/** Ce qu'une part large en retire. */
export const FAT_SOOTHE = 6;

/** Au-dessus de quoi quelqu'un se lève contre toi. */
export const CHALLENGE_AT = 55;

/** Ce que coûte d'acheter la paix, par point de rancune. */
export const BUYOFF = 420;

/** Ce qu'on perd d'emprise en perdant un duel de direction. */
export const OUSTED_GROUND = 30;
