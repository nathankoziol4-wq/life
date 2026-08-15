/**
 * La couronne.
 *
 * Le catalogue avait une feuille absente — « Royauté / Titre et succession » —
 * et derrière elle un parcours de vie entier qui n'existait pas : naître à une
 * place qu'on n'a pas gagnée, et passer sa vie à ne pas la perdre.
 *
 * Ce système est **l'inverse exact de la tribune**. On ne gagne pas une
 * couronne : on l'attend, on la reçoit, ou on n'en a jamais. Tout ce qu'un
 * candidat construit — un programme, une campagne, un électorat — n'a aucun
 * équivalent ici. Ce qui existe, à la place :
 *
 * **1. Une file, et une place dedans.** L'ordre de succession est public et
 * ne se négocie pas. On n'y monte que par la mort ou le renoncement de ceux
 * qui sont devant, et l'on y descend dès qu'un enfant naît plus près du trône
 * que soi. C'est la seule progression du jeu qui ne dépende pas de ce qu'on
 * fait.
 *
 * **2. Deux opinions, et elles ne se confondent pas.** Ce qu'on pense de
 * *vous* monte et descend avec ce que vous faites. Ce qu'on pense de *la
 * couronne* bouge dix fois plus lentement, et c'est celle-là qui décide si
 * l'institution survit. Un souverain aimé peut laisser une monarchie
 * condamnée ; un souverain médiocre peut ne rien abîmer du tout.
 *
 * **3. La position se perd.** Un scandale, un crime, une prison, une
 * abdication : chacun a sa façon de vous sortir de la file. Et si le
 * sentiment s'effondre assez longtemps, ce n'est pas vous qu'on écarte, c'est
 * la couronne qu'on supprime — et personne ne la récupère.
 *
 * Tout est fictif, et volontairement : les maisons, les royaumes, les devises
 * et les titres n'ont d'équivalent nulle part. Aucune dynastie réelle, aucun
 * pays réel n'est décrit comme une monarchie ; le royaume est une entité de
 * jeu qui coexiste avec le pays où l'on habite, comme un décor de théâtre
 * planté dans une ville qui existe.
 */

/* ------------------------------------------------------------------ */
/* Les maisons                                                         */
/* ------------------------------------------------------------------ */

/**
 * Une maison régnante.
 *
 * Entièrement inventée. Le `realm` n'est pas le pays où l'on vit : c'est un
 * royaume de fiction dont la maison occupe le trône, et qui n'a jamais existé.
 */
export interface House {
  id: string;
  /** Le nom de la dynastie. */
  name: string;
  /** Le royaume, fictif. */
  realm: string;
  /** Ce qu'elle se dit d'elle-même. */
  motto: string;
  /** Le siège : un lieu inventé. */
  seat: string;
  /** Depuis combien de générations elle règne. Décide de ce qu'on lui pardonne. */
  generations: number;
  /**
   * Ce que le pays pense de la couronne au départ, 0-100.
   *
   * Une maison ancienne part haut et tombe de plus haut ; une maison récente
   * part bas et n'a rien à perdre.
   */
  sentiment: number;
  /** Ce que la maison possède, en unités de coût de la vie. */
  fortune: number;
  /** Ce qu'elle est, en une phrase. */
  note: string;
}

export const HOUSES: House[] = [
  {
    id: 'valdorne', name: 'Valdorne', realm: 'la Valdorne', motto: 'Ce qui dure',
    seat: 'le palais de Rives-Hautes', generations: 14, sentiment: 72,
    fortune: 4_200_000,
    note: 'Neuf siècles sans interruption, et l’impression qu’il n’y a rien d’autre.',
  },
  {
    id: 'ostrean', name: 'Ostréan', realm: 'l’Ostréanie', motto: 'Par la mer',
    seat: 'la citadelle de Bregne', generations: 9, sentiment: 61,
    fortune: 2_600_000,
    note: 'Une maison de ports et de comptoirs, riche et mal aimée des terres.',
  },
  {
    id: 'karsten', name: 'Karsten', realm: 'le Karstenland', motto: 'Debout au vent',
    seat: 'la maison forte de Vellin', generations: 5, sentiment: 48,
    fortune: 900_000,
    note: 'Trois cents ans à peine. On s’en souvient encore comme d’un général.',
  },
  {
    id: 'sombrel', name: 'Sombrel', realm: 'les Marches de Sombrel', motto: 'Servir d’abord',
    seat: 'l’abbaye de Cens', generations: 11, sentiment: 66,
    fortune: 1_700_000,
    note: 'Une couronne qui s’est toujours voulue discrète, et qu’on aime pour ça.',
  },
  {
    id: 'aubrac', name: 'd’Aubrac', realm: 'la principauté d’Aubrac', motto: 'Rien sans le peuple',
    seat: 'le pavillon de Lens-sur-Aube', generations: 7, sentiment: 55,
    fortune: 620_000,
    note: 'Assez petite pour qu’on croise le souverain au marché. Assez pauvre pour que ça se voie.',
  },
];

export function getHouse(id: string): House | undefined {
  return HOUSES.find((h) => h.id === id);
}

/* ------------------------------------------------------------------ */
/* Les titres                                                          */
/* ------------------------------------------------------------------ */

/**
 * Un titre.
 *
 * Le rang décide de trois choses : ce qu'on touche, ce qu'on attend de vous,
 * et ce que vos fautes coûtent à l'institution. Un baron qui se conduit mal
 * fait rire ; un souverain qui se conduit mal fait tomber une couronne.
 */
export interface Title {
  id: string;
  rank: number;
  male: string;
  female: string;
  /** La rente annuelle, en unités de coût de la vie. */
  stipend: number;
  /** Combien d'engagements l'année attend de vous. */
  expected: number;
  /** Ce que le titre fait connaître, en points de notoriété par an. */
  visibility: number;
  /**
   * Combien votre conduite pèse sur le sentiment envers la couronne.
   *
   * C'est la vraie différence entre les rangs : un titre haut ne donne pas
   * seulement plus, il expose l'institution à ce que vous êtes.
   */
  weight: number;
  note: string;
}

export const TITLES: Title[] = [
  {
    id: 'baron', rank: 1, male: 'Baron', female: 'Baronne',
    stipend: 14_000, expected: 1, visibility: 2, weight: 0.15,
    note: 'Un nom sur une invitation, et un rang qui ne donne rien d’autre.',
  },
  {
    id: 'comte', rank: 2, male: 'Comte', female: 'Comtesse',
    stipend: 42_000, expected: 2, visibility: 5, weight: 0.3,
    note: 'On vous place à table, et l’on remarque quand vous n’y êtes pas.',
  },
  {
    id: 'duc', rank: 3, male: 'Duc', female: 'Duchesse',
    stipend: 130_000, expected: 3, visibility: 12, weight: 0.55,
    note: 'Assez haut pour représenter la maison, assez loin pour ne jamais décider.',
  },
  {
    id: 'prince', rank: 4, male: 'Prince', female: 'Princesse',
    stipend: 340_000, expected: 5, visibility: 26, weight: 0.85,
    note: 'Tout ce que vous faites est lu comme un signe. Y compris ne rien faire.',
  },
  {
    id: 'souverain', rank: 5, male: 'Roi', female: 'Reine',
    stipend: 900_000, expected: 7, visibility: 55, weight: 1.4,
    note: 'La couronne ne vous appartient pas : vous lui appartenez, et pour la durée.',
  },
];

export function getTitle(id: string): Title | undefined {
  return TITLES.find((t) => t.id === id);
}

/** Le titre écrit correctement pour la personne qui le porte. */
export function titleLabel(id: string, sex: 'M' | 'F'): string {
  const title = getTitle(id);
  if (!title) return '';
  return sex === 'F' ? title.female : title.male;
}

/** Le titre qu'on porte quand on a épousé quelqu'un qui en a un. */
export const CONSORT_DROP = 1;

/**
 * Le titre attendu à une place donnée dans l'ordre de succession.
 *
 * C'est ce qui rend la file lisible : monter d'un cran n'est pas un chiffre
 * qui change, c'est un titre qui change, et une rente avec.
 */
export function titleForPlace(place: number): string {
  if (place <= 0) return 'souverain';
  if (place <= 3) return 'prince';
  if (place <= 8) return 'duc';
  if (place <= 16) return 'comte';
  return 'baron';
}

/* ------------------------------------------------------------------ */
/* Les devoirs                                                         */
/* ------------------------------------------------------------------ */

/**
 * Un engagement de l'année.
 *
 * Aucun n'est gratuit et aucun n'est bon partout : ce qui plaît au pays coûte
 * de la fortune, ce qui rapporte de la fortune se voit mal, et ce qui ne
 * demande rien ne convainc personne. Un titulaire qui remplit son quota avec
 * la même chose sept fois s'use — voir `FATIGUE`.
 */
/**
 * Ce qu'un engagement demande.
 *
 * - `présence` : être là, et bien. Le physique et l'expressivité.
 * - `parole` : tenir une salle. L'assurance et le sang-froid.
 * - `tenue` : ne pas se tromper d'un geste pendant trois heures.
 * - `jugement` : comprendre ce qu'on vous dit, et répondre juste.
 * - `nom` : ce qu'on pense déjà de vous, et rien d'autre.
 */
export type Aptitude = 'présence' | 'parole' | 'tenue' | 'jugement' | 'nom';

export interface Duty {
  id: string;
  label: string;
  note: string;
  /** Rang minimal pour y être convié. */
  minRank: number;
  /** Ce que ça coûte, en part de la rente annuelle. */
  cost: number;
  /** Ce que ça prend, en points de stress. */
  strain: number;
  /** Ce que ça fait à ce qu'on pense de vous. */
  approval: number;
  /** Ce que ça fait au sentiment envers la couronne. */
  sentiment: number;
  karma: number;
  /** La notoriété que ça donne. */
  fame: number;
  /**
   * Ce que l'exercice demande.
   *
   * Pas une statistique brute : une aptitude composée, résolue par
   * `systems/royalty.ts#aptitude`. Tenir une cérémonie et prendre la parole
   * ne demandent pas la même chose de la même personne, et un jeu qui les
   * ferait dépendre du même chiffre n'aurait qu'un seul devoir.
   */
  asks: Aptitude;
  /** Le mini-jeu, s'il y en a un. */
  play?: 'walkabout' | 'speech';
}

export const DUTIES: Duty[] = [
  {
    id: 'ruban', label: 'Couper un ruban',
    note: 'Une école, une passerelle, quarante minutes. Personne n’en parlera.',
    minRank: 1, cost: 0.01, strain: 2, approval: 3, sentiment: 0.3, karma: 1,
    fame: 1, asks: 'présence',
  },
  {
    id: 'bain', label: 'Aller au contact',
    note: 'Descendre dans la foule et serrer des mains. Rien ne remplace ça, et rien n’est plus risqué.',
    minRank: 1, cost: 0.02, strain: 7, approval: 11, sentiment: 1.6, karma: 2,
    fame: 4, asks: 'présence', play: 'walkabout',
  },
  {
    id: 'discours', label: 'Prononcer une allocution',
    note: 'Douze minutes qui seront citées pendant dix ans, en bien ou non.',
    minRank: 2, cost: 0.03, strain: 9, approval: 12, sentiment: 2.2, karma: 1,
    fame: 7, asks: 'parole', play: 'speech',
  },
  {
    id: 'oeuvre', label: 'Parrainer une œuvre',
    note: 'Votre nom sur une fondation, et de l’argent dedans. C’est ce qui coûte le plus et ce qu’on oublie le moins.',
    minRank: 1, cost: 0.14, strain: 4, approval: 9, sentiment: 2.4, karma: 8,
    fame: 3, asks: 'nom',
  },
  {
    id: 'ceremonie', label: 'Tenir une cérémonie',
    note: 'Trois heures immobile, et chaque geste dans le mauvais ordre se remarque.',
    minRank: 2, cost: 0.06, strain: 12, approval: 7, sentiment: 1.9, karma: 0,
    fame: 4, asks: 'tenue',
  },
  {
    id: 'visite', label: 'Une visite au-dehors',
    note: 'Un royaume voisin, également fictif. On y va pour être vu d’ici.',
    minRank: 3, cost: 0.11, strain: 10, approval: 6, sentiment: 1.4, karma: 1,
    fame: 9, asks: 'jugement',
  },
  {
    id: 'audience', label: 'Recevoir en audience',
    note: 'Des gens qui viennent demander. On ne peut presque jamais rien, et on écoute quand même.',
    minRank: 2, cost: 0.02, strain: 6, approval: 5, sentiment: 1.1, karma: 6,
    fame: 1, asks: 'jugement',
  },
  {
    id: 'deuil', label: 'Représenter la maison à des obsèques',
    note: 'On n’y gagne rien. On y perd tout si l’on n’y va pas.',
    minRank: 2, cost: 0.02, strain: 8, approval: 4, sentiment: 1.3, karma: 3,
    fame: 2, asks: 'tenue',
  },
];

export function getDuty(id: string): Duty | undefined {
  return DUTIES.find((d) => d.id === id);
}

/** Ce que refaire la même chose perd, par répétition dans l'année. */
export const FATIGUE = 0.32;

/** Combien d'engagements on peut tenir dans une année, quoi qu'il arrive. */
export const MAX_DUTIES = 8;

/**
 * L'âge à partir duquel la maison attend quelque chose de vous.
 *
 * Sans lui, un enfant de six ans manquait chaque année les cinq engagements
 * d'un prince, et la couronne était abolie avant sa majorité : sur deux cent
 * quatre-vingt-huit vies royales mesurées, **deux cent une tombaient pendant
 * l'enfance du titulaire**. Le quota monte ensuite par paliers — on
 * n'attend pas d'un débutant ce qu'on attend d'un titulaire installé.
 */
export const DUTY_AGE = 16;
export const DUTY_RAMP = 8;

/* ------------------------------------------------------------------ */
/* Les affaires                                                        */
/* ------------------------------------------------------------------ */

/**
 * Une affaire que la couronne doit trancher.
 *
 * Ce n'est jamais une décision de gouvernement — elle n'en prend pas. C'est
 * toujours la même question posée autrement : **parler ou se taire, et au
 * profit de qui**. Se taire est presque toujours l'option la moins chère sur
 * le moment, et celle qui use l'institution.
 *
 * Comme pour les décisions de mandat, aucune option n'est sans perdant : ce
 * qui gagne l'opinion coûte au sentiment, ou à la fortune, ou aux siens.
 */
export interface Affair {
  id: string;
  title: string;
  brief: string;
  /** Rang minimal auquel l'affaire se pose. */
  minRank: number;
  options: AffairOption[];
}

export interface AffairOption {
  label: string;
  /** Ce que ça fait à ce qu'on pense de vous. */
  approval: number;
  /** Ce que ça fait au sentiment envers la couronne. */
  sentiment: number;
  /** Ce que ça coûte, en part de la rente annuelle. Négatif = ça rapporte. */
  cost: number;
  karma: number;
  /** Ce que ça fait à la famille : l'opinion des proches. */
  family: number;
  outcome: string;
}

export const AFFAIRS: Affair[] = [
  {
    id: 'greve',
    title: 'Le pays s’arrête',
    brief: 'Un conflit social bloque tout depuis trois semaines. Les deux camps demandent publiquement que tu dises quelque chose.',
    minRank: 3,
    options: [
      {
        label: 'Recevoir les deux camps au palais',
        approval: 9, sentiment: 2.5, cost: 0.05, karma: 5, family: -6,
        outcome: 'Rien n’est réglé. On a vu la couronne servir à quelque chose.',
      },
      {
        label: 'Rappeler que tu ne gouvernes pas',
        approval: -4, sentiment: -1.2, cost: 0, karma: 1, family: 5,
        outcome: 'C’est juste, c’est constitutionnel, et c’est ce qu’on te reproche.',
      },
      {
        label: 'Prendre parti',
        approval: 14, sentiment: -4, cost: 0, karma: 3, family: -12,
        outcome: 'La moitié du pays t’adore. L’autre moitié se demande à quoi tu sers.',
      },
    ],
  },
  {
    id: 'frere',
    title: 'Quelqu’un de la maison a fauté',
    brief: 'Un proche parent a fait quelque chose d’indéfendable, et la presse a tout. On attend de la maison qu’elle réponde.',
    minRank: 3,
    options: [
      {
        label: 'Le retirer de la file',
        approval: 12, sentiment: 3.2, cost: 0.08, karma: 4, family: -22,
        outcome: 'La maison est sauve. Il ne te reparlera pas.',
      },
      {
        label: 'Le défendre',
        approval: -14, sentiment: -3.5, cost: 0.05, karma: -2, family: 18,
        outcome: 'On protège les siens. C’est exactement ce qu’on reproche à la couronne.',
      },
      {
        label: 'Ne rien dire et attendre',
        approval: -6, sentiment: -1.8, cost: 0, karma: -1, family: 4,
        outcome: 'Ça passera. Ça laisse une trace à chaque fois.',
      },
    ],
  },
  {
    id: 'liste',
    title: 'On veut voir les comptes',
    brief: 'Un journal réclame le détail de ce que la maison coûte au pays. Rien n’oblige à répondre.',
    minRank: 2,
    options: [
      {
        label: 'Tout publier',
        approval: 7, sentiment: 4.5, cost: 0.03, karma: 8, family: -16,
        outcome: 'Les chiffres sont mauvais et personne ne peut plus dire qu’on cache.',
      },
      {
        label: 'Publier ce qui vous arrange',
        approval: 3, sentiment: -0.5, cost: 0.02, karma: -4, family: 2,
        outcome: 'On y a cru trois mois.',
      },
      {
        label: 'Réduire la liste civile',
        approval: 10, sentiment: 3, cost: 0.35, karma: 6, family: -20,
        outcome: 'Le geste est réel. Toute la maison le paie, et te le fait savoir.',
      },
    ],
  },
  {
    id: 'terres',
    title: 'Des terres de la maison',
    brief: 'Un domaine improductif que la maison tient depuis quatre siècles. Une commune voudrait le racheter pour trois fois rien.',
    minRank: 2,
    options: [
      {
        label: 'Le céder',
        approval: 8, sentiment: 2.8, cost: 0.2, karma: 7, family: -14,
        outcome: 'On en fera un parc. La maison a un peu moins de tout.',
      },
      {
        label: 'Le vendre au prix fort à quelqu’un d’autre',
        approval: -9, sentiment: -2.5, cost: -0.6, karma: -6, family: 12,
        outcome: 'Les comptes vont mieux. La commune s’en souviendra plus longtemps que toi.',
      },
      {
        label: 'Le garder tel quel',
        approval: -2, sentiment: -0.8, cost: 0.05, karma: 0, family: 6,
        outcome: 'Rien ne change, ce qui est une réponse.',
      },
    ],
  },
  {
    id: 'mariage',
    title: 'Un mariage qui ne plaît pas',
    brief: 'Un héritier veut épouser quelqu’un que la maison juge impossible. On te demande d’arbitrer.',
    minRank: 4,
    options: [
      {
        label: 'Donner ton accord',
        approval: 11, sentiment: 1.8, cost: 0.04, karma: 6, family: -15,
        outcome: 'Le pays trouve ça moderne. La maison trouve ça grave.',
      },
      {
        label: 'Refuser',
        approval: -13, sentiment: -3.2, cost: 0, karma: -7, family: 14,
        outcome: 'La règle est tenue. On la trouve d’un autre siècle, et on a raison.',
      },
      {
        // Un compromis n'est pas une option sans gagnant : c'est une option
        // dont le seul gain est comptable. La maison économise une rente, et
        // c'est tout ce qu'elle y gagne.
        label: 'Accepter, mais retirer le rang',
        approval: -3, sentiment: -0.6, cost: -0.18, karma: -2, family: -8,
        outcome: 'Un compromis que personne ne défend : ni les uns, ni les autres. Il reste une rente de moins à verser.',
      },
    ],
  },
  {
    id: 'referendum',
    title: 'On demande à voter',
    brief: 'Une pétition réclame un référendum sur l’existence même de la couronne. Le gouvernement attend ton avis avant de répondre.',
    minRank: 4,
    options: [
      {
        label: 'Dire que tu t’y soumettras',
        approval: 15, sentiment: 5, cost: 0, karma: 9, family: -25,
        outcome: 'Personne ne s’y attendait. C’est ce qui sauve les couronnes.',
      },
      {
        label: 'Laisser le gouvernement s’en charger',
        approval: -2, sentiment: -1, cost: 0, karma: 0, family: 3,
        outcome: 'Prudent. Et vu comme tel.',
      },
      {
        label: 'Faire jouer les appuis de la maison',
        approval: -10, sentiment: -6, cost: 0.4, karma: -9, family: 10,
        outcome: 'La pétition s’enlise. Ce qui l’a portée ne s’enlise pas.',
      },
    ],
  },
  {
    id: 'catastrophe',
    title: 'Une région dévastée',
    brief: 'Des inondations, des milliers de sinistrés, et une maison assise sur une fortune que tout le monde connaît.',
    minRank: 2,
    options: [
      {
        label: 'Y aller, sans caméras',
        approval: 13, sentiment: 3.6, cost: 0.06, karma: 9, family: -4,
        outcome: 'Trois jours dans la boue. Une photo volée en dira plus que dix communiqués.',
      },
      {
        label: 'Ouvrir la bourse de la maison',
        approval: 8, sentiment: 3, cost: 0.5, karma: 8, family: -18,
        outcome: 'La somme est énorme. La maison mettra dix ans à la revoir.',
      },
      {
        label: 'Un message et une gerbe',
        approval: -7, sentiment: -2.2, cost: 0.01, karma: -3, family: 5,
        outcome: 'On a lu le message. On a compté ce qu’il valait.',
      },
    ],
  },
];

/**
 * Combien d'affaires récentes la couronne ne repose pas.
 *
 * Strictement inférieur au nombre d'affaires : sinon, un règne long finit par
 * les avoir toutes tranchées et l'on ne demande plus jamais rien.
 */
export const AFFAIR_MEMORY = 4;

export function getAffair(id: string): Affair | undefined {
  return AFFAIRS.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qui vous sort de la file                                         */
/* ------------------------------------------------------------------ */

/**
 * Les motifs d'exclusion, et ce qu'ils coûtent au sentiment quand ils
 * frappent quelqu'un de haut placé.
 *
 * Ils ne sont pas décoratifs : chacun est vérifié tous les ans par
 * `advanceRoyalty`, et deux d'entre eux se déclenchent depuis des systèmes qui
 * existaient bien avant celui-ci — la justice et la renommée.
 */
export const REMOVALS = [
  {
    id: 'condamnation', label: 'Une condamnation',
    note: 'On ne siège pas dans l’ordre de succession avec un casier.',
    sentimentCost: 5,
  },
  {
    id: 'scandale', label: 'Un scandale de trop',
    note: 'Ce n’est pas la faute qui écarte, c’est le nombre.',
    sentimentCost: 3.5,
  },
  {
    id: 'abdication', label: 'Le renoncement',
    note: 'On peut partir. Cela se fait, et cela se paie.',
    sentimentCost: 2,
  },
  {
    id: 'abolition', label: 'La fin de la couronne',
    note: 'Personne n’est écarté : il n’y a plus de file.',
    sentimentCost: 0,
  },
] as const;

/**
 * Sous ce seuil de sentiment, l'institution est en sursis.
 *
 * Elle ne tombe pas au premier mauvais chiffre : il faut `COLLAPSE_YEARS`
 * années de suite en dessous, ce qui laisse le temps de redresser — et rend la
 * chute imputable à une politique de conduite, pas à un mauvais tirage.
 */
export const COLLAPSE_LINE = 20;
export const COLLAPSE_YEARS = 4;

/**
 * Ce qui fait qu'une maison vous écarte pour disgrâce.
 *
 * Pas un décompte : la première version retirait le rang au troisième
 * scandale de la vie, et une mesure sur deux cents vies royales a montré ce
 * que ça valait — **quatre-vingt-huit pour cent d'entre elles finissaient
 * écartées**. Un titre visible attire des affaires pendant soixante ans ; en
 * additionner trois n'est pas une règle, c'est une échéance.
 *
 * Ce qui compte est donc le **poids récent** : la somme de ce que pèsent les
 * affaires des dernières années. Trois affaires graves rapprochées écartent ;
 * trois affaires étalées sur une vie ne disent rien de personne.
 */
export const DISGRACE_WINDOW = 8;
export const DISGRACE_LIMIT = 110;

/* ------------------------------------------------------------------ */
/* Entrer dans la maison                                               */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'il faut pour être anobli.
 *
 * Le seul chemin qui se mérite, et il branche la couronne sur ce qui existait
 * déjà : ce qu'on a servi, ce qu'on a gouverné, ce qu'on a donné. On n'entre
 * jamais par l'argent seul — c'est vérifié par un test.
 */
export const ENNOBLE_REPUTATION = 78;
export const ENNOBLE_MERIT = 3;

/** Ce qu'il en coûte de demander à être présenté à la cour. */
export const PRESENTATION_COST = 0.9;

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Ce que le pays pense de la couronne. */
export function sentimentLabel(value: number): string {
  if (value < 20) return 'On demande sa suppression';
  if (value < 35) return 'On n’en veut plus vraiment';
  if (value < 50) return 'On la trouve coûteuse';
  if (value < 65) return 'On y tient sans y penser';
  if (value < 80) return 'On y tient';
  return 'On ne s’imagine pas sans';
}

/** Ce que le pays pense de vous. */
export function standingLabel(value: number): string {
  if (value < 20) return 'On te voudrait ailleurs';
  if (value < 35) return 'On te trouve de trop';
  if (value < 50) return 'On ne sait pas quoi penser de toi';
  if (value < 65) return 'On t’aime bien';
  if (value < 80) return 'On te préfère aux autres';
  return 'On te trouve irréprochable';
}

/** Comment se lit une place dans l'ordre de succession. */
export function placeLabel(place: number): string {
  if (place === 0) return 'Sur le trône';
  if (place === 1) return 'Premier dans l’ordre';
  if (place === 2) return 'Deuxième dans l’ordre';
  if (place === 3) return 'Troisième dans l’ordre';
  if (place <= 10) return `${place}ᵉ dans l’ordre`;
  return `${place}ᵉ — assez loin pour ne jamais y penser`;
}

/** Ce qu'on écrit d'un membre de la maison qu'on ne connaît pas. */
export const KIN_ROLES = [
  'un cousin de la branche aînée',
  'une cousine de la branche aînée',
  'un oncle du côté du trône',
  'une tante du côté du trône',
  'un cousin issu de germain',
  'une cousine issue de germain',
  'un petit-neveu de la maison',
  'une petite-nièce de la maison',
];
