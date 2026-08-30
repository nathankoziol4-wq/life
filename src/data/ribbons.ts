/**
 * Les titres : ce qu'une vie aura été, en un mot.
 *
 * À la mort, le jeu ne disait qu'une chose — un score composite, un nombre.
 * Un nombre ne raconte rien : deux vies opposées peuvent le partager, et
 * personne ne se souvient d'un chiffre.
 *
 * Un titre relit la vie entière et en nomme la forme. La règle qui gouverne
 * tout ce fichier tient en une phrase : **aucun titre ne se lit sur une seule
 * statistique**. « Millionnaire » ne serait qu'un seuil de patrimoine ; le
 * titre demande la fortune *et* la façon de l'avoir faite. « Solitaire » ne
 * se déduit pas d'un compteur d'amis mais du croisement de ce qu'on n'a pas
 * eu — ni conjoint, ni enfants, ni proches — avec une vie assez longue pour
 * que ce soit un choix et non un accident.
 *
 * Chaque titre porte un **rang** : plus il est haut, plus il est rare, et
 * c'est le plus haut atteint qui devient le titre de la vie. Les autres
 * restent en mentions — une vie en mérite souvent plusieurs, et les voir
 * toutes dit mieux ce qu'elle a été qu'un seul mot.
 */

import type { LifeRecord } from '../systems/ribbons.ts';

export interface Ribbon {
  id: string;
  label: string;
  /** Ce que le titre dit de la vie, en une phrase. */
  note: string;
  /**
   * Le rang, 1 à 5.
   *
   * 1 : une vie ordinaire aura souvent ce titre. 5 : presque personne.
   * Le plus haut rang obtenu devient le titre ; à rang égal, l'ordre de ce
   * tableau tranche.
   */
  tier: number;
  /** La vie mérite-t-elle ce titre ? */
  test: (r: LifeRecord) => boolean;
}

/* ------------------------------------------------------------------ */

export const RIBBONS: Ribbon[] = [
  /* ---------------- L'argent ---------------- */
  {
    id: 'entrepreneur', label: 'Entrepreneur', tier: 3,
    note: 'Tu n’as pas cherché d’employeur. Tu en es devenu un.',
    // Pas « avoir eu une entreprise » : l'avoir fait vivre, en avoir vécu, et
    // ne pas s'être contenté d'un salaire à côté.
    test: (r) => r.venturesRun >= 1 && r.selfMadeShare > 0.45
      && r.worth > r.livingCost * 12 && r.jobs <= 3,
  },
  {
    id: 'millionnaire', label: 'Millionnaire', tier: 3,
    note: 'Le chiffre a fini par avoir un zéro de plus que les autres.',
    // La fortune *et* d'où elle vient : un héritage seul ne fait pas ce titre.
    test: (r) => r.worth >= r.livingCost * 60 && r.selfMadeShare > 0.5,
  },
  {
    id: 'heritier', label: 'Héritier', tier: 2,
    note: 'On t’a remis quelque chose. Tu ne l’as pas perdu.',
    test: (r) => r.inherited > r.livingCost * 8 && r.selfMadeShare <= 0.5
      && r.worth >= r.inherited * 0.7,
  },
  {
    id: 'depensier', label: 'Dépensier', tier: 2,
    note: 'Tu as beaucoup gagné. Il n’en reste rien, et tu as tout vu.',
    // Avoir gagné et n'avoir rien gardé : c'est le croisement qui fait le
    // titre. Quelqu'un qui n'a jamais rien eu n'est pas un dépensier.
    test: (r) => r.lifetimeEarnings > r.livingCost * 25
      && r.worth < r.livingCost * 2 && (r.placesSeen >= 4 || r.vehiclesOwned >= 3),
  },
  {
    id: 'proprietaire', label: 'Propriétaire', tier: 3,
    note: 'Des murs à ton nom, et des gens qui vivent dedans.',
    test: (r) => r.propertiesOwned >= 3 && r.rentYears >= 8,
  },
  {
    id: 'investisseur', label: 'Investisseur', tier: 3,
    note: 'Tu as gagné en dormant, ce qui demande d’avoir su attendre.',
    test: (r) => r.investedYears >= 15 && r.worth >= r.livingCost * 25
      && r.passiveShare > 0.35,
  },

  /* ---------------- Le travail ---------------- */
  {
    id: 'bourreau', label: 'Bourreau de travail', tier: 2,
    note: 'Tu as tenu le poste. Il n’est pas resté grand-chose pour le reste.',
    test: (r) => r.yearsWorked >= 35 && r.promotions >= 4
      && r.children <= 1 && r.friends <= 2,
  },
  {
    id: 'erudit', label: 'Érudit', tier: 3,
    note: 'Tu as passé ta vie à comprendre, et tu as fini par y arriver.',
    test: (r) => r.degrees >= 3 && r.intelligence >= 78 && r.booksOrClubs >= 2,
  },
  {
    id: 'artisan', label: 'Homme de métier', tier: 2,
    note: 'Un seul métier, fait longtemps, fait bien.',
    test: (r) => r.yearsWorked >= 25 && r.jobs <= 2 && r.topPerformance >= 70,
  },
  {
    id: 'vagabond', label: 'Sans attaches', tier: 2,
    note: 'Tu n’es jamais resté assez longtemps pour qu’on te retienne.',
    test: (r) => r.jobs >= 6 && r.propertiesOwned === 0 && r.marriages === 0,
  },

  /* ---------------- La famille ---------------- */
  {
    id: 'patriarche', label: 'Patriarche', tier: 4,
    note: 'Une table trop petite, et c’est la seule chose qui t’aura manqué.',
    test: (r) => r.children >= 4 && r.grandchildren >= 3 && r.age >= 70
      && r.familyBond >= 60,
  },
  {
    id: 'parent', label: 'Parent', tier: 1,
    note: 'Tu as élevé quelqu’un, et il est encore là.',
    test: (r) => r.children >= 1 && r.familyBond >= 50,
  },
  {
    id: 'solitaire', label: 'Solitaire', tier: 3,
    note: 'Personne n’est venu. Ce n’était peut-être pas un accident.',
    // Une vie longue sans personne : c'est la durée qui en fait un choix.
    test: (r) => r.age >= 55 && r.marriages === 0 && r.children === 0
      && r.friends === 0,
  },
  {
    id: 'coeur', label: 'Cœur d’artichaut', tier: 2,
    note: 'Tu as beaucoup aimé. Jamais deux fois la même personne.',
    test: (r) => r.partners >= 5 && r.divorces >= 1,
  },
  {
    id: 'fidele', label: 'Une seule vie à deux', tier: 3,
    note: 'Une personne, du début à la fin.',
    test: (r) => r.marriages === 1 && r.divorces === 0 && r.yearsMarried >= 30,
  },

  /* ---------------- Le crime ---------------- */
  {
    id: 'horsLaLoi', label: 'Hors-la-loi', tier: 3,
    note: 'Tu as pris ce qu’on ne t’avait pas donné, et tu en as vécu.',
    // Une condition qu'une vie neutre satisfait déjà n'en est pas une : à
    // « peu de condamnations » seul, le titre se lisait sur le seul compteur
    // de délits. Il demande donc trois choses — le nombre, le rapport entre
    // ce qu'on a fait et ce qu'on a payé, et d'en avoir vécu.
    test: (r) => r.crimesDone >= 12
      && r.crimesDone > r.convictions * 5
      && r.worth > r.livingCost * 3,
  },
  {
    id: 'recidiviste', label: 'Habitué des tribunaux', tier: 2,
    note: 'On finissait par connaître ton nom au greffe.',
    test: (r) => r.convictions >= 4 && r.prisonYears >= 6,
  },
  {
    id: 'parrain', label: 'Le patron', tier: 5,
    note: 'D’autres travaillaient pour toi, et personne ne l’écrivait nulle part.',
    test: (r) => r.orgRank >= 3 && r.crimesDone >= 15 && r.worth > r.livingCost * 20,
  },
  {
    id: 'redresse', label: 'Racheté', tier: 4,
    note: 'Tu as fait le pire, puis vingt ans d’autre chose.',
    // Le titre demande les deux moitiés, et une frontière nette entre elles.
    test: (r) => r.convictions >= 2 && r.cleanYears >= 20 && r.karma >= 60,
  },

  /* ---------------- Le nom ---------------- */
  {
    id: 'icone', label: 'Icône', tier: 5,
    note: 'On saura qui tu étais sans avoir eu à te rencontrer.',
    test: (r) => r.famePeak >= 85 && r.fameYears >= 15 && r.controversy < 45,
  },
  {
    id: 'celebre', label: 'Une tête connue', tier: 3,
    note: 'On t’arrêtait dans la rue, et ça ne t’a pas déplu.',
    test: (r) => r.famePeak >= 55 && r.fameYears >= 6,
  },
  {
    id: 'sulfureux', label: 'Sulfureux', tier: 4,
    note: 'Célèbre, oui. Aimé, c’est autre chose.',
    test: (r) => r.famePeak >= 60 && r.controversy >= 55 && r.scandals >= 2,
  },
  {
    id: 'oublie', label: 'Redevenu personne', tier: 3,
    note: 'Tu as été quelqu’un. Plus personne ne s’en souvient.',
    test: (r) => r.famePeak >= 55 && r.fame < 15 && r.age - r.fameEndAge >= 15,
  },

  /* ---------------- Le monde ---------------- */
  {
    id: 'aventurier', label: 'Aventurier', tier: 3,
    note: 'Tu as vu beaucoup d’endroits, et tu es rentré de tous.',
    test: (r) => r.placesSeen >= 8 && r.countriesLived >= 2,
  },
  {
    id: 'exile', label: 'Parti pour de bon', tier: 3,
    note: 'Tu es né quelque part, tu es mort ailleurs, et c’est tout ce qu’il fallait.',
    test: (r) => r.countriesLived >= 2 && r.diedAbroad && r.age >= 50,
  },
  {
    id: 'sedentaire', label: 'Jamais parti', tier: 2,
    note: 'Tu aurais pu aller partout. Tu es resté dans la même rue.',
    // Il faut avoir pu partir. Sans la condition de moyens, ce titre était
    // le sort par défaut de toute vie jouée sans rien faire — quatre-vingt-
    // sept pour cent d'entre elles le recevaient, ce qui n'est plus un titre
    // mais une constatation.
    test: (r) => r.countriesLived <= 1 && r.placesSeen === 0 && r.age >= 60
      && r.worth > r.livingCost * 6,
  },

  /* ---------------- Le corps, et la chance ---------------- */
  {
    id: 'malchanceux', label: 'Malchanceux', tier: 3,
    note: 'Rien de tout cela n’était de ta faute, et ça n’a rien changé.',
    // Le malheur, mais pas la faute : un casier judiciaire disqualifie.
    test: (r) => r.illnesses >= 3 && r.accidents >= 2 && r.convictions === 0
      && r.worth < r.livingCost * 3,
  },
  {
    id: 'increvable', label: 'Increvable', tier: 4,
    note: 'Tu as traversé ce qui aurait dû t’arrêter.',
    test: (r) => r.illnesses >= 3 && r.age >= 80 && r.health >= 45,
  },
  {
    id: 'athlete', label: 'Athlète', tier: 3,
    note: 'Ton corps a été ton métier, et il a tenu.',
    test: (r) => r.stageId === 'sport' && r.stageJobs >= 12 && r.fitness >= 60,
  },
  {
    id: 'brule', label: 'Consumé', tier: 3,
    note: 'Tu as tout donné, et il n’est rien resté à la fin.',
    test: (r) => r.age <= 55 && (r.famePeak >= 50 || r.worth > r.livingCost * 15)
      && r.happiness < 30,
  },

  /* ---------------- Ce qu'on garde ---------------- */
  {
    id: 'collectionneur', label: 'Collectionneur', tier: 3,
    note: 'Tu as gardé ce que les autres jetaient, et ça valait quelque chose.',
    test: (r) => r.valuablesOwned >= 6 && r.valuablesWorth > r.livingCost * 4,
  },
  {
    id: 'bienfaiteur', label: 'Bienfaiteur', tier: 4,
    note: 'Tu as donné plus que tu n’as gardé, et personne ne t’a rien demandé.',
    test: (r) => r.karma >= 82 && r.given > r.livingCost * 5 && r.convictions === 0,
  },
  {
    id: 'servi', label: 'Au service', tier: 3,
    note: 'Tu as porté un uniforme assez longtemps pour qu’il te porte aussi.',
    test: (r) => r.servedYears >= 15 && r.decorations >= 2,
  },
  {
    id: 'elu', label: 'Homme public', tier: 4,
    note: 'On t’a confié une ville, ou davantage, et tu l’as rendue.',
    test: (r) => r.mandates >= 2 && r.approvalEnd >= 45,
  },

  /* ---------------- La couronne ---------------- */
  // Deux titres, et le second n'est pas une consolation : avoir vu tomber ce
  // dont on héritait est une vie en soi, et le jeu ne le dirait nulle part
  // ailleurs.
  {
    id: 'couronne', label: 'Souverain', tier: 5,
    note: 'Une place que personne ne t’a demandé si tu voulais.',
    test: (r) => r.reigned >= 5,
  },
  {
    id: 'derniere', label: 'Le dernier de la ligne', tier: 4,
    note: 'Ce dont tu étais l’héritier a cessé d’exister de ton vivant.',
    test: (r) => r.crownFell,
  },

  /* ---------------- Le fond du tableau ---------------- */
  {
    id: 'ordinaire', label: 'Une vie ordinaire', tier: 1,
    note: 'Rien d’extraordinaire, et rien de honteux. C’est déjà beaucoup.',
    test: () => true,
  },
];

/**
 * Le libellé du titre « patriarche » dépend du sexe.
 *
 * Une exception, et une seule : partout ailleurs les titres sont neutres par
 * construction. Ici, les deux mots existent et n'ont pas de neutre courant.
 */
export function ribbonLabel(id: string, sex: 'M' | 'F'): string {
  if (id === 'patriarche') return sex === 'F' ? 'Matriarche' : 'Patriarche';
  return RIBBONS.find((r) => r.id === id)?.label ?? id;
}

export function getRibbon(id: string): Ribbon | undefined {
  return RIBBONS.find((r) => r.id === id);
}
