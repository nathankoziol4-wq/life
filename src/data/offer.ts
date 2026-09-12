/**
 * Ce que la maison vend, et non pas combien.
 *
 * Le catalogue disait : « l'entreprise vend *du chiffre* : aucun produit
 * nommé, aucun lancement ». C'était exact — `venture.ts#forecast` calcule une
 * demande à partir de la notoriété et de la qualité, et l'on ne sait jamais ce
 * qu'un café fait passer sur son comptoir.
 *
 * Ce fichier apporte les deux moitiés qui manquaient : **des formes**, qui sont
 * la mécanique, et **des noms**, qui sont ce qu'on lit. Les formes ne dépendent
 * pas du métier — une boulangerie et un éditeur de logiciel ont tous deux
 * quelque chose de courant, quelque chose de signature, un coup de mode et un
 * fond de gamme. Les noms, eux, viennent du métier.
 */

/* ------------------------------------------------------------------ */
/* Les formes                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on met au point, du point de vue de la mécanique.
 *
 * Les quatre ne se départagent pas par la force mais par **la forme de leur
 * vie** : quand elles prennent, combien de temps elles tiennent, et à quelle
 * vitesse elles retombent. Aucune ne domine, parce qu'aucune ne se compare à
 * une autre sans savoir ce que le joueur compte faire ensuite.
 */
export interface Shape {
  id: string;
  label: string;
  emoji: string;
  /** Ce que la mise au point coûte, en part de la mise de départ du métier. */
  cost: number;
  /** L'attrait qu'elle peut atteindre au mieux, ajouté à la demande. */
  ceiling: number;
  /** Combien d'années pour arriver au sommet. Zéro : tout de suite. */
  climb: number;
  /** Combien d'années au sommet avant de retomber. */
  hold: number;
  /** Combien d'années pour retomber à rien, une fois le sommet passé. */
  fall: number;
  /**
   * Ce que le savoir-faire de l'équipe pèse dans sa qualité de départ, 0-1.
   *
   * C'est le seul endroit où `systems/crew.ts` décide d'autre chose que de la
   * capacité : une équipe médiocre peut tenir un fond de gamme, elle ne sort
   * pas une signature.
   */
  needs: number;
  /**
   * Combien de bras il faut pour la sortir correctement.
   *
   * **Une signature ne se fait pas seul**, et il a fallu le mesurer pour s'en
   * apercevoir : sans ce nombre, la forme la plus ambitieuse était aussi la
   * plus rentable dans tous les cas — 212 % au-dessus de « ne rien lancer »
   * contre 65 à 99 % aux trois autres — parce que rien n'empêchait de la sortir
   * le jour de l'ouverture, seul derrière un comptoir. Il faut maintenant avoir
   * bâti l'équipe d'abord, ce qui coûte des salaires avant de rapporter quoi
   * que ce soit.
   */
  hands: number;
  line: string;
}

export const SHAPES: Shape[] = [
  {
    id: 'courant', label: 'Quelque chose de courant', emoji: '🍞',
    cost: 0.18, ceiling: 0.4, climb: 1, hold: 4, fall: 4, needs: 0.25, hands: 0,
    line: 'Prend tout de suite, ne monte pas haut, ne fait pas de bruit.',
  },
  {
    id: 'fond', label: 'Un fond de gamme', emoji: '🧱',
    cost: 0.3, ceiling: 0.5, climb: 2, hold: 12, fall: 6, needs: 0.35, hands: 1,
    line: 'Lent à s’installer, et là pour vingt ans. On l’oublie, il paie.',
  },
  {
    id: 'signature', label: 'Une signature', emoji: '⭐',
    cost: 0.75, ceiling: 1.15, climb: 4, hold: 6, fall: 5, needs: 0.8, hands: 3,
    line: 'Quatre ans à ne rien rapporter, puis c’est ce pour quoi on vient.',
  },
  {
    id: 'mode', label: 'Un coup', emoji: '🎆',
    cost: 0.32, ceiling: 1.05, climb: 0, hold: 1, fall: 2, needs: 0.5, hands: 1,
    line: 'Tout de suite, très fort, et c’est fini dans trois ans.',
  },
];

export function getShape(id: string | null | undefined): Shape | undefined {
  return SHAPES.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Les noms                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un métier peut faire, dit avec ses mots.
 *
 * Ce n'est pas un choix du joueur — il choisit la forme, et la maison sort le
 * nom suivant de sa liste. Ouvrir un menu de quatre noms qui font tous
 * exactement la même chose aurait été un faux choix, et le cahier des charges
 * a un mot pour cela.
 */
export const NAMES: Record<string, string[]> = {
  cafe: ['la formule du midi', 'le café de la maison', 'les brunchs du dimanche', 'la carte des thés', 'les planches à partager', 'le comptoir du soir'],
  restaurant: ['le menu du jour', 'la carte d’hiver', 'la table d’hôtes', 'le service du dimanche', 'les banquets', 'la cave'],
  boulangerie: ['le pain de campagne', 'la viennoiserie du matin', 'les tourtes', 'la galette de janvier', 'le pain de seigle', 'les commandes de fêtes'],
  epicerie: ['les paniers de saison', 'le rayon en vrac', 'les produits d’ici', 'la livraison du quartier', 'le rayon frais', 'les conserves maison'],
  coiffeur: ['la coupe rapide', 'les couleurs', 'les chignons de mariage', 'le rasage à l’ancienne', 'les soins', 'les rendez-vous du soir'],
  garage: ['la révision annuelle', 'la carrosserie', 'les pneus', 'le dépannage', 'la préparation au contrôle', 'les véhicules d’occasion'],
  librairie: ['la table des libraires', 'le rayon jeunesse', 'les rencontres d’auteurs', 'la commande à l’unité', 'les beaux livres', 'le fonds ancien'],
  salle_sport: ['l’abonnement annuel', 'les cours collectifs', 'le suivi personnel', 'la salle de nuit', 'les stages', 'l’accès entreprise'],
  agence_web: ['les sites vitrines', 'la refonte complète', 'l’hébergement à l’année', 'l’application sur mesure', 'l’audit', 'la maintenance'],
  conseil: ['l’audit express', 'la mission longue', 'la formation en interne', 'l’accompagnement au changement', 'l’étude sectorielle', 'le second avis'],
  nettoyage: ['les contrats de bureaux', 'la remise en état', 'les vitres en hauteur', 'l’entretien de copropriétés', 'le nettoyage industriel', 'les fins de chantier'],
  batiment: ['la rénovation d’appartement', 'le gros œuvre', 'l’isolation', 'les extensions', 'la charpente', 'les marchés publics'],
  logiciel: ['l’abonnement mensuel', 'la version entreprise', 'le module de rapports', 'l’interface publique', 'l’installation sur site', 'le support prioritaire'],
  formation: ['la session de deux jours', 'le parcours long', 'la certification', 'la formation à distance', 'l’intra-entreprise', 'les modules courts'],
  transport: ['la tournée régionale', 'le grand froid', 'l’express', 'le groupage', 'les déménagements', 'le dernier kilomètre'],
  fleuriste: ['les bouquets du jour', 'les compositions de mariage', 'l’abonnement bureau', 'les plantes d’intérieur', 'les couronnes', 'la livraison le jour même'],
  studio: ['les films de commande', 'la série documentaire', 'la captation de concerts', 'la publicité', 'le montage à façon', 'la location de plateau'],
  atelier: ['les pièces uniques', 'la petite série', 'la restauration', 'les commandes sur mesure', 'les stages du samedi', 'le dépôt en boutique'],
};

/** De quoi nommer une gamme dans un métier qui n'a pas sa liste. */
export const GENERIC_NAMES = [
  'l’offre courante', 'la formule complète', 'le sur-mesure', 'l’abonnement',
  'la gamme haute', 'les commandes spéciales',
];

export function namesFor(kindId: string): string[] {
  return NAMES[kindId] ?? GENERIC_NAMES;
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/**
 * Combien de choses une maison peut tenir avant de s'éparpiller.
 *
 * Au-delà, la qualité baisse chaque année : c'est ce qui empêche de lancer
 * tout ce qu'on peut payer et d'empiler les attraits. Une gamme n'est pas une
 * collection.
 */
export const SPREAD = 2;

/** Ce que chaque chose de trop retire à la qualité, par an. */
export const SPREAD_TOLL = 3.4;

/**
 * Ce que l'année d'un lancement coûte en capacité.
 *
 * **C'est l'arbitrage.** Sans cela, lancer serait gratuit dès qu'on a l'argent,
 * et le seul calcul serait « ai-je de quoi ». On met au point avec les mêmes
 * bras qui produisent : l'année du lancement, la maison sert moins de monde.
 */
export const DEV_DRAG = 0.3;

/** La qualité de départ, avant ce que l'équipe et la maison y ajoutent. */
export const BASE_QUALITY = 34;

/** Ce que la qualité de la maison apporte à ce qu'elle sort de nouveau. */
export const HOUSE_SHARE = 0.42;

/** Ce qu'une chose perd de qualité par an : rien ne reste neuf. */
export const STALE = 1.1;

/** Ce que coûte, en qualité, chaque bras qui manque pour sortir une forme. */
export const SHORT_HANDED = 11;

/**
 * Ce qu'une chose sans qualité tire encore, et ce que la qualité y ajoute.
 *
 * **Mesuré, il a fallu creuser l'écart.** Avec un plancher à 0,45, une chose
 * ratée valait encore quarante pour cent d'une réussie : une signature bâclée
 * à 8 de qualité tirait plus qu'un fond de gamme excellent, et la forme la plus
 * ambitieuse gagnait quelles que soient les conditions — 196 % au-dessus de
 * « ne rien lancer » contre 65 à 85 % aux autres. Le plafond d'une forme ne
 * doit se toucher qu'en la réussissant, sans quoi il n'y a qu'une forme.
 */
export const Q_FLOOR = 0.05;
export const Q_SPAN = 1.15;

/** Sous cet attrait, une chose ne rapporte plus rien et encombre. */
export const SPENT = 0.04;
