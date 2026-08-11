/**
 * Audit microscopique du gameplay.
 *
 * La matrice de parité (`parity.ts`) demande « cette capacité existe-t-elle ? ».
 * Ce fichier-ci pose la question au niveau en dessous, celui qui compte : pour
 * chaque *feuille* de chaque système, **qu'est-ce que le joueur peut
 * réellement faire ?**
 *
 * Un bouton n'est pas une fonctionnalité. Une catégorie nommée « Crime » n'est
 * pas un système criminel. On ne classe donc pas « Crime : COMPLET », on classe
 * `Crime > Vol à la tire > choix de la cible`, `> mini-jeu`, `> détection`,
 * `> butin`, `> fuite`, `> arrestation`, `> procès`, `> casier` — chacun
 * séparément, chacun avec son niveau réel.
 *
 * ## Les six niveaux
 *
 * | Niveau | Ce que ça veut dire |
 * | --- | --- |
 * | `MISSING` | N'existe pas. |
 * | `PLACEHOLDER` | Un bouton, presque aucune mécanique derrière. |
 * | `BASIC` | Fonctionne, mais très superficiel : un tirage, un effet. |
 * | `PARTIAL` | Système intéressant, incomplet. |
 * | `DEEP` | Suffisamment développé : décisions, conséquences croisées. |
 * | `INTERACTIVE` | Le joueur agit lui-même, sa performance compte. |
 *
 * ## Ce qui empêche ce fichier de mentir
 *
 * Trois règles, vérifiées par `audit.test.ts` :
 *
 * 1. toute feuille qui n'est pas `MISSING` doit citer un symbole réellement
 *    exporté du projet — on ne peut pas s'auto-décerner une fonctionnalité ;
 * 2. toute feuille qui n'est ni `DEEP` ni `INTERACTIVE` doit dire ce qui lui
 *    manque — un aveu vaut mieux qu'une case verte ;
 * 3. toute feuille doit déclarer les systèmes qu'elle touche. Une feuille qui
 *    ne touche rien est une feuille orpheline, et c'est un défaut.
 */

export type Depth =
  | 'MISSING' | 'PLACEHOLDER' | 'BASIC' | 'PARTIAL' | 'DEEP' | 'INTERACTIVE';

/** Poids d'un niveau dans le score de parité, sur 1. */
export const DEPTH_WEIGHT: Record<Depth, number> = {
  MISSING: 0,
  PLACEHOLDER: 0.1,
  BASIC: 0.35,
  PARTIAL: 0.6,
  DEEP: 0.9,
  INTERACTIVE: 1,
};

export interface AuditLeaf {
  /** Grand domaine, tel qu'il apparaît dans le rapport de parité. */
  domain: string;
  /** Le système dans ce domaine. */
  system: string;
  /** La feuille : l'interaction précise qu'on audite. */
  leaf: string;
  depth: Depth;
  /** `fichier#symbole`. Obligatoire dès que le niveau n'est pas MISSING. */
  anchor?: string;
  /** Ce qui manque. Obligatoire tant que ce n'est ni DEEP ni INTERACTIVE. */
  gap?: string;
  /** 1 = à faire en premier, 5 = confort. */
  priority: number;
  /**
   * Les systèmes que cette feuille touche réellement.
   *
   * Ce n'est pas de la documentation : c'est ce qui alimente le graphe des
   * fonctionnalités et la détection des orphelines. Une feuille qui ne
   * connecte rien est un cul-de-sac, et le test le signale.
   */
  connects: string[];
}

/* ================================================================== */
/* PERSONNAGE                                                          */
/* ================================================================== */

const CHARACTER: AuditLeaf[] = [
  {
    domain: 'Personnage', system: 'Identité', leaf: 'Nom, sexe, pays, ville, naissance',
    depth: 'DEEP', anchor: 'src/engine/newLife.ts#createNewLife', priority: 5,
    connects: ['origine', 'relations', 'finance'],
  },
  {
    domain: 'Personnage', system: 'Identité', leaf: 'Changer de nom',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#changeName', priority: 5,
    gap: 'aucune conséquence : ni réputation, ni réaction des proches, ni trace administrative',
    connects: ['identité'],
  },
  {
    domain: 'Personnage', system: 'Personnalité', leaf: '12 tempéraments, 27 axes, 17 valeurs, styles',
    depth: 'DEEP', anchor: 'src/systems/psycheGen.ts#buildPsyche', priority: 5,
    connects: ['école', 'travail', 'relations', 'crime', 'finance', 'santé'],
  },
  {
    domain: 'Personnage', system: 'Personnalité', leaf: 'Dérive annuelle du caractère',
    depth: 'DEEP', anchor: 'src/systems/psyche.ts#updatePersonality', priority: 5,
    connects: ['exposition', 'causalité'],
  },
  {
    domain: 'Personnage', system: 'Personnalité', leaf: 'Aucun paramètre décoratif (audit mécanique)',
    depth: 'DEEP', anchor: 'src/systems/psycheAudit.ts#validatePsycheImpact', priority: 5,
    connects: ['tests'],
  },
  {
    domain: 'Personnage', system: 'Statistiques', leaf: 'Bonheur, santé, esprit, allure, forme, stress…',
    depth: 'DEEP', anchor: 'src/engine/types.ts#Stats', priority: 5,
    connects: ['tout'],
  },
  {
    domain: 'Personnage', system: 'Compétences', leaf: 'Arbre de compétences explicite et progressif',
    depth: 'MISSING', priority: 2,
    gap: 'les compétences sont des statistiques diffuses ; rien à faire progresser délibérément',
    connects: [],
  },
  {
    domain: 'Personnage', system: 'Talents', leaf: 'Dons découverts et cultivés',
    depth: 'PLACEHOLDER', anchor: 'src/data/events/childhood.ts', priority: 3,
    gap: 'un événement « don caché » sans suite : aucun talent n’est stocké ni cultivable',
    connects: ['événements'],
  },
  {
    domain: 'Personnage', system: 'Apparence', leaf: 'Apparence générée, vieillissante',
    depth: 'PARTIAL', anchor: 'src/engine/origin.ts#Appearance', priority: 4,
    gap: 'aucune action pour la modifier hors chirurgie ; pas de style, coiffure, tenue',
    connects: ['relations', 'travail'],
  },
  {
    domain: 'Personnage', system: 'Souvenirs', leaf: 'Souvenirs marquants conservés',
    depth: 'PARTIAL', anchor: 'src/systems/psyche.ts#updatePersonality', priority: 4,
    gap: 'le joueur les lit, les PNJ ne s’en servent pas dans leurs réactions',
    connects: ['personnalité'],
  },
  {
    domain: 'Personnage', system: 'Habitudes', leaf: 'Habitudes qui coûtent du temps et de l’argent',
    depth: 'PARTIAL', anchor: 'src/systems/psyche.ts#habitCostRatio', priority: 3,
    gap: 'aucune action pour prendre ou perdre une habitude délibérément',
    connects: ['finance', 'santé'],
  },
  {
    domain: 'Personnage', system: 'Dépendances', leaf: 'Addictions simulées et sevrage',
    depth: 'BASIC', anchor: 'src/systems/health.ts', priority: 2,
    gap: 'une statistique `addiction` qui monte ; ni cure, ni rechute, ni entourage qui réagit',
    connects: ['santé', 'finance'],
  },
  {
    domain: 'Personnage', system: 'Ambitions', leaf: 'Ambitions qui orientent la vie',
    depth: 'PARTIAL', anchor: 'src/data/ambitions.ts', priority: 4,
    gap: 'affichées et alimentées, mais le joueur ne peut pas s’en fixer une',
    connects: ['personnalité'],
  },
  {
    domain: 'Personnage', system: 'Objectifs', leaf: 'Succès, défis, titres de fin de vie',
    depth: 'MISSING', priority: 2,
    gap: 'aucun système de succès, de défi ni de titre : rien ne récompense une trajectoire',
    connects: [],
  },
];

/* ================================================================== */
/* ENFANCE                                                             */
/* ================================================================== */

const CHILDHOOD: AuditLeaf[] = [
  {
    domain: 'Enfance', system: 'Foyer', leaf: 'Parents, fratrie, famille élargie générés',
    depth: 'DEEP', anchor: 'src/systems/household.ts#buildHousehold', priority: 5,
    connects: ['relations', 'finance', 'école'],
  },
  {
    domain: 'Enfance', system: 'Demander', leaf: 'Demander un objet, une permission, de l’argent',
    depth: 'DEEP', anchor: 'src/systems/asking.ts#askParent', priority: 5,
    connects: ['relations', 'finance', 'exposition', 'école'],
  },
  {
    domain: 'Enfance', system: 'Demander', leaf: 'Conditions tenues ou trahies l’année suivante',
    depth: 'DEEP', anchor: 'src/systems/asking.ts#settleConditions', priority: 5,
    connects: ['relations', 'école'],
  },
  {
    domain: 'Enfance', system: 'Argent de poche', leaf: 'Argent de poche récurrent',
    depth: 'BASIC', anchor: 'src/systems/finance.ts#allowance', priority: 3,
    gap: 'un versement automatique ; ni négociation, ni suppression en cas de bêtise',
    connects: ['finance'],
  },
  {
    domain: 'Enfance', system: 'Discipline', leaf: 'Punitions et réactions parentales',
    depth: 'PARTIAL', anchor: 'src/systems/schoolActions.ts#disrespect', priority: 3,
    gap: 'les parents réagissent aux incidents scolaires seulement, pas à la vie à la maison',
    connects: ['école', 'relations'],
  },
  {
    domain: 'Enfance', system: 'Lien familial', leaf: 'Le lien s’érode quand on ne fait rien',
    depth: 'DEEP', anchor: 'src/systems/childhood.ts#advanceChildhood', priority: 5,
    connects: ['relations', 'foyer'],
  },
  {
    domain: 'Enfance', system: 'Activités familiales', leaf: 'Faire quelque chose avec ses parents',
    depth: 'DEEP', anchor: 'src/systems/childhood.ts#doFamilyActivity', priority: 5,
    connects: ['relations', 'exposition', 'personnalité', 'finance'],
  },
  {
    domain: 'Enfance', system: 'Activités familiales', leaf: 'Ce que l’accompagnant met dedans',
    depth: 'DEEP', anchor: 'src/systems/childhood.ts#engagementOf', priority: 5,
    connects: ['foyer', 'relations'],
  },
  {
    domain: 'Enfance', system: 'Amis d’enfance', leaf: 'Amis hors école',
    depth: 'PARTIAL', anchor: 'src/systems/childhood.ts#meetNeighbourChild', priority: 3,
    gap: 'on se fait des amis du quartier, mais rien à faire avec eux hors des interactions générales',
    connects: ['relations', 'environnement'],
  },
  {
    domain: 'Enfance', system: 'Premières passions', leaf: 'Découvrir un intérêt et le cultiver',
    depth: 'DEEP', anchor: 'src/systems/exposure.ts#exposureSignals', priority: 5,
    connects: ['personnalité', 'université', 'travail'],
  },
  {
    domain: 'Enfance', system: 'Événements', leaf: 'Banque d’événements 0-12 ans',
    depth: 'PARTIAL', anchor: 'src/data/events/childhood.ts', priority: 3,
    gap: 'quatorze événements éligibles avant 5 ans et quarante-trois avant 10, contre plus de quatre-vingts à l’âge adulte : c’est mieux, ce n’est pas égal',
    connects: ['événements', 'exposition'],
  },
  {
    domain: 'Enfance', system: 'Vacances', leaf: 'Partir en vacances avec la famille',
    depth: 'MISSING', priority: 3,
    gap: 'les voyages n’existent que pour un adulte qui paie',
    connects: [],
  },
];

/* ================================================================== */
/* ÉCOLE                                                               */
/* ================================================================== */

const SCHOOL: AuditLeaf[] = [
  {
    domain: 'École', system: 'Établissement', leaf: 'Établissement, règlement, niveau',
    depth: 'DEEP', anchor: 'src/systems/school.ts#advanceClassLife', priority: 5,
    connects: ['origine', 'notes', 'relations'],
  },
  {
    domain: 'École', system: 'Notes', leaf: 'Moyenne, effort, progression par cycle',
    depth: 'DEEP', anchor: 'src/systems/education.ts#advanceEducation', priority: 5,
    connects: ['université', 'travail', 'relations'],
  },
  {
    domain: 'École', system: 'Comportement', leaf: 'Dossier disciplinaire à escalade',
    depth: 'DEEP', anchor: 'src/systems/schoolActions.ts#skipSchool', priority: 5,
    connects: ['relations', 'notes', 'parents'],
  },
  {
    domain: 'École', system: 'Camarades', leaf: 'Classe complète, chacun un PNJ',
    depth: 'DEEP', anchor: 'src/systems/school.ts#classmatesOf', priority: 5,
    connects: ['relations'],
  },
  {
    domain: 'École', system: 'Camarades', leaf: 'Aider, taquiner, provoquer, défendre, signaler',
    depth: 'DEEP', anchor: 'src/systems/schoolActions.ts#classmateAction', priority: 5,
    connects: ['relations', 'popularité', 'comportement'],
  },
  {
    domain: 'École', system: 'Professeurs', leaf: 'Personnel avec compétence, sévérité, intégrité',
    depth: 'DEEP', anchor: 'src/systems/school.ts#staffOf', priority: 5,
    connects: ['notes', 'relations'],
  },
  {
    domain: 'École', system: 'Professeurs', leaf: 'Question, soutien, contestation, irrespect',
    depth: 'DEEP', anchor: 'src/systems/schoolActions.ts#teacherAction', priority: 5,
    connects: ['notes', 'comportement', 'relations'],
  },
  {
    domain: 'École', system: 'Popularité', leaf: 'Six dimensions calculées chaque année',
    depth: 'DEEP', anchor: 'src/systems/school.ts#advanceClassLife', priority: 5,
    connects: ['relations', 'personnalité'],
  },
  {
    domain: 'École', system: 'Groupes', leaf: 'Groupes sociaux, intégration, départ',
    depth: 'DEEP', anchor: 'src/systems/schoolActions.ts#joinPeerGroup', priority: 5,
    connects: ['popularité', 'relations'],
  },
  {
    domain: 'École', system: 'Clubs', leaf: 'Rejoindre, progresser, quitter',
    depth: 'PARTIAL', anchor: 'src/systems/schoolActions.ts#advanceClubs', priority: 3,
    gap: 'aucune compétition inter-établissements, aucun résultat visible',
    connects: ['popularité', 'personnalité'],
  },
  {
    domain: 'École', system: 'Examens', leaf: 'Épreuve jouable',
    depth: 'MISSING', priority: 2,
    gap: 'les notes se calculent seules : passer un examen n’est jamais un moment',
    connects: [],
  },
  {
    domain: 'École', system: 'Sanctions', leaf: 'Retenue, convocation, exclusion, renvoi',
    depth: 'DEEP', anchor: 'src/systems/schoolActions.ts#skipSchool', priority: 5,
    connects: ['parents', 'notes'],
  },
  {
    domain: 'École', system: 'Changer d’école', leaf: 'Changement volontaire ou subi',
    depth: 'PARTIAL', anchor: 'src/systems/environment.ts#advanceEnvironment', priority: 3,
    gap: 'l’école change avec le quartier ; le joueur ne peut pas la choisir',
    connects: ['environnement'],
  },
  {
    domain: 'École', system: 'Événements', leaf: 'Banque d’événements scolaires',
    depth: 'BASIC', anchor: 'src/data/events/teen.ts', priority: 2,
    gap: 'dix événements de catégorie « école » pour treize ans de scolarité',
    connects: ['événements'],
  },
];

/* ================================================================== */
/* UNIVERSITÉ                                                          */
/* ================================================================== */

const UNIVERSITY: AuditLeaf[] = [
  {
    domain: 'Université', system: 'Admission', leaf: 'Candidature, filière, admission calculée',
    depth: 'DEEP', anchor: 'src/systems/education.ts#enrollUniversity', priority: 5,
    connects: ['notes', 'finance', 'travail'],
  },
  {
    domain: 'Université', system: 'Coût', leaf: 'Frais annuels, bourse, prêt étudiant',
    depth: 'DEEP', anchor: 'src/systems/education.ts#applyScholarship', priority: 5,
    connects: ['finance', 'dettes'],
  },
  {
    domain: 'Université', system: 'Cursus', leaf: 'Abandon, études supérieures, formation professionnelle',
    depth: 'PARTIAL', anchor: 'src/systems/education.ts#enrollGraduate', priority: 4,
    gap: 'aucun changement de filière en cours de route',
    connects: ['travail'],
  },
  {
    domain: 'Université', system: 'Vie étudiante', leaf: 'Vie sociale distincte du lycée',
    depth: 'BASIC', anchor: 'src/systems/school.ts#advanceClassLife', priority: 3,
    gap: 'la vie de classe du secondaire est réutilisée telle quelle : ni colocation, ni association, ni soirée étudiante',
    connects: ['relations'],
  },
];

/* ================================================================== */
/* TRAVAIL                                                             */
/* ================================================================== */

const WORK: AuditLeaf[] = [
  {
    domain: 'Travail', system: 'Recherche', leaf: 'Marché d’offres persistant, candidature',
    depth: 'DEEP', anchor: 'src/systems/careers.ts#applyToJob', priority: 5,
    connects: ['finance', 'université', 'environnement'],
  },
  {
    domain: 'Travail', system: 'Entretien', leaf: 'Entretien jouable',
    depth: 'MISSING', priority: 2,
    gap: 'l’embauche est un tirage : l’entretien n’existe pas comme moment',
    connects: [],
  },
  {
    domain: 'Travail', system: 'Poste', leaf: 'Salaire, heures, performance, implication',
    depth: 'DEEP', anchor: 'src/systems/workplace.ts#setHours', priority: 5,
    connects: ['finance', 'santé', 'relations'],
  },
  {
    domain: 'Travail', system: 'Équipe', leaf: 'Collègues, supérieur, rôles, influence',
    depth: 'DEEP', anchor: 'src/systems/workplace.ts#teamOf', priority: 5,
    connects: ['relations', 'promotion'],
  },
  {
    domain: 'Travail', system: 'Équipe', leaf: 'Couvrir, se plaindre, s’attribuer, signaler',
    depth: 'DEEP', anchor: 'src/systems/workplace.ts#workAction', priority: 5,
    connects: ['relations', 'performance'],
  },
  {
    domain: 'Travail', system: 'Promotion', leaf: 'Promotion selon résultats et appuis',
    depth: 'DEEP', anchor: 'src/systems/workplace.ts#askPromotion', priority: 5,
    connects: ['finance', 'relations'],
  },
  {
    domain: 'Travail', system: 'Sortie', leaf: 'Démission, licenciement, retraite, pension',
    depth: 'DEEP', anchor: 'src/systems/careers.ts#retire', priority: 5,
    connects: ['finance'],
  },
  {
    domain: 'Travail', system: 'Cumul', leaf: 'Deuxième emploi salarié',
    depth: 'MISSING', priority: 2,
    gap: 'un seul contrat de travail à la fois : le cumul de deux employeurs n’existe pas',
    connects: [],
  },
  {
    domain: 'Travail', system: 'Indépendant', leaf: 'Vingt métiers à son compte, tarif, clientèle, savoir-faire',
    depth: 'DEEP', anchor: 'src/systems/venture.ts#startFreelance', priority: 5,
    connects: ['finance', 'personnalité', 'notoriété', 'environnement'],
  },
  {
    domain: 'Travail', system: 'Indépendant', leaf: 'Fixer son tarif : un optimum par métier, à deviner',
    depth: 'INTERACTIVE', anchor: 'src/systems/venture.ts#setFee', priority: 5,
    connects: ['finance'],
  },
  {
    domain: 'Travail', system: 'Indépendant', leaf: 'Commandes nommées, à prendre ou à laisser',
    depth: 'DEEP', anchor: 'src/systems/venture.ts#takeGig', priority: 5,
    connects: ['finance', 'réputation'],
  },
  {
    domain: 'Travail', system: 'Entreprise', leaf: 'Ouvrir : apport, emprunt, dix-huit modèles',
    depth: 'DEEP', anchor: 'src/systems/venture.ts#foundBusiness', priority: 5,
    connects: ['finance', 'université'],
  },
  {
    domain: 'Travail', system: 'Entreprise', leaf: 'Arbitrer capacité et demande : effectif, prix, présence, investissement',
    depth: 'INTERACTIVE', anchor: 'src/systems/venture.ts#forecast', priority: 5,
    connects: ['finance', 'relations', 'environnement'],
  },
  {
    domain: 'Travail', system: 'Entreprise', leaf: 'Gérant salarié, qui tient la maison ou se sert',
    depth: 'DEEP', anchor: 'src/systems/venture.ts#hireManager', priority: 5,
    connects: ['relations'],
  },
  {
    domain: 'Travail', system: 'Entreprise', leaf: 'Vendre : repreneurs, clauses, ou dépôt de bilan',
    depth: 'DEEP', anchor: 'src/systems/venture.ts#listBusiness', priority: 5,
    connects: ['finance', 'réputation'],
  },
  {
    domain: 'Travail', system: 'Cumul', leaf: 'Budget de temps partagé entre emploi, métier et entreprise',
    depth: 'PARTIAL', anchor: 'src/systems/venture.ts#timeBudget', priority: 3,
    gap: 'le temps est bien fini, mais on ne peut toujours pas cumuler deux emplois salariés',
    connects: ['santé'],
  },
  {
    domain: 'Travail', system: 'Événements', leaf: 'Banque d’événements professionnels',
    depth: 'BASIC', anchor: 'src/data/events/adult.ts', priority: 3,
    gap: 'huit événements de catégorie « travail » pour quarante ans de carrière',
    connects: ['événements'],
  },
];

/* ================================================================== */
/* CARRIÈRES SPÉCIALES                                                 */
/* ================================================================== */

const SPECIAL: AuditLeaf[] = [
  {
    domain: 'Carrières spéciales', system: 'Acteur', leaf: 'Auditions, agent, rôles, récompenses',
    depth: 'PLACEHOLDER', anchor: 'src/data/jobs.ts', priority: 2,
    gap: 'une échelle de salaires nommée « Acteur » : ni audition, ni rôle, ni tournage',
    connects: ['finance'],
  },
  {
    domain: 'Carrières spéciales', system: 'Musicien', leaf: 'Groupe, label, album, tournée, royalties',
    depth: 'PLACEHOLDER', anchor: 'src/data/jobs.ts', priority: 2,
    gap: 'une échelle de salaires nommée « Musicien » : rien à jouer, rien à sortir',
    connects: ['finance'],
  },
  {
    domain: 'Carrières spéciales', system: 'Sport', leaf: 'Club, saison, statistiques, transfert',
    depth: 'PLACEHOLDER', anchor: 'src/data/jobs.ts', priority: 2,
    gap: 'une échelle de salaires : ni club, ni saison, ni blessure, ni transfert',
    connects: ['finance'],
  },
  {
    domain: 'Carrières spéciales', system: 'Politique', leaf: 'Élections, campagne, mandat, sondages',
    depth: 'PLACEHOLDER', anchor: 'src/data/jobs.ts', priority: 3,
    gap: 'une échelle de salaires : aucune élection ne se tient',
    connects: ['finance'],
  },
  {
    domain: 'Carrières spéciales', system: 'Astronaute', leaf: 'Formation, missions, exploration',
    depth: 'PLACEHOLDER', anchor: 'src/data/jobs.ts', priority: 4,
    gap: 'une échelle de salaires : aucune mission',
    connects: ['finance'],
  },
  {
    domain: 'Carrières spéciales', system: 'Mannequin', leaf: 'Agence, casting, défilés, campagnes',
    depth: 'MISSING', priority: 4,
    gap: 'le métier n’existe pas',
    connects: [],
  },
  {
    domain: 'Carrières spéciales', system: 'Agent secret', leaf: 'Agence, missions, gadgets fictifs',
    depth: 'MISSING', priority: 5,
    gap: 'le métier n’existe pas',
    connects: [],
  },
];

/* ================================================================== */
/* CÉLÉBRITÉ                                                           */
/* ================================================================== */

const FAME: AuditLeaf[] = [
  {
    domain: 'Célébrité', system: 'Notoriété publique', leaf: 'Trois axes séparés : connu, reproché, estimé',
    depth: 'DEEP', anchor: 'src/systems/fame.ts#advanceFame', priority: 5,
    connects: ['travail', 'crime', 'personnalité', 'finance'],
  },
  {
    domain: 'Célébrité', system: 'Notoriété publique', leaf: 'Ce qui rend connu, ligne par ligne, et ce que l’oubli emporte',
    depth: 'DEEP', anchor: 'src/systems/fame.ts#fameSources', priority: 5,
    connects: ['travail', 'crime'],
  },
  {
    domain: 'Célébrité', system: 'Notoriété publique', leaf: 'Ce qu’un visage connu coûte : reconnaissance, nerfs, vie privée',
    depth: 'DEEP', anchor: 'src/systems/fame.ts#recognitionFactor', priority: 4,
    connects: ['crime', 'santé'],
  },
  {
    domain: 'Célébrité', system: 'Affaires', leaf: 'Scandales, et quatre réponses dont aucune n’est la bonne',
    depth: 'DEEP', anchor: 'src/systems/fame.ts#respondToScandal', priority: 5,
    connects: ['réputation', 'personnalité'],
  },
  {
    domain: 'Célébrité', system: 'Réseaux sociaux', leaf: 'Publier, monétiser',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#postOnSocial', priority: 2,
    gap: 'une seule audience globale, un tirage de viralité ; ni plateformes, ni commentaires, ni sponsors',
    connects: ['finance'],
  },
  {
    domain: 'Célébrité', system: 'Apparitions', leaf: 'Dix apparitions échelonnées, payées au nom',
    depth: 'DEEP', anchor: 'src/systems/fame.ts#doGig', priority: 5,
    connects: ['finance', 'santé'],
  },
  {
    domain: 'Célébrité', system: 'Apparitions', leaf: 'L’interview comme scène : trois questions, aucune bonne réponse',
    depth: 'INTERACTIVE', anchor: 'src/systems/fame.ts#answerInterview', priority: 5,
    connects: ['réputation'],
  },
];

/* ================================================================== */
/* RELATIONS                                                           */
/* ================================================================== */

const RELATIONS: AuditLeaf[] = [
  {
    domain: 'Relations', system: 'Socle', leaf: 'Actions contextuelles décidées à un seul endroit',
    depth: 'DEEP', anchor: 'src/systems/actions.ts#getAvailableActions', priority: 5,
    connects: ['école', 'travail', 'prison', 'relations'],
  },
  {
    domain: 'Relations', system: 'Lien', leaf: 'Discuter, temps, compliment, cadeau, conseil',
    depth: 'DEEP', anchor: 'src/systems/relationships.ts#interact', priority: 5,
    connects: ['personnalité', 'finance'],
  },
  {
    domain: 'Relations', system: 'Conflit', leaf: 'Dispute, insulte, couper les ponts, renouer',
    depth: 'DEEP', anchor: 'src/systems/relationships.ts#interact', priority: 5,
    connects: ['personnalité'],
  },
  {
    domain: 'Relations', system: 'Amour', leaf: 'Séduire, sortir ensemble, demande, mariage',
    depth: 'DEEP', anchor: 'src/systems/relationships.ts#propose', priority: 5,
    connects: ['finance', 'famille'],
  },
  {
    domain: 'Relations', system: 'Rupture', leaf: 'Rupture, divorce, partage des biens',
    depth: 'PARTIAL', anchor: 'src/systems/relationships.ts#divorce', priority: 3,
    gap: 'ni avocat, ni garde des enfants, ni pension, ni relation post-divorce',
    connects: ['finance', 'famille'],
  },
  {
    domain: 'Relations', system: 'Ex', leaf: 'Les ex continuent d’exister',
    depth: 'PLACEHOLDER', anchor: 'src/systems/relationships.ts#breakUp', priority: 3,
    gap: 'la relation est rétrogradée puis oubliée : aucune action propre à un ex',
    connects: ['relations'],
  },
  {
    domain: 'Relations', system: 'Ennemis', leaf: 'Rivalité et inimitié durables',
    depth: 'MISSING', priority: 2,
    gap: 'une relation peut baisser, jamais devenir une inimitié avec ses propres actions',
    connects: [],
  },
  {
    domain: 'Relations', system: 'Cadeaux', leaf: 'Catalogue et goûts du destinataire',
    depth: 'BASIC', anchor: 'src/systems/relationships.ts#interact', priority: 3,
    gap: 'un montant générique : ni catalogue, ni goûts, ni occasion',
    connects: ['finance'],
  },
  {
    domain: 'Relations', system: 'Argent', leaf: 'Donner, demander, prêter, rembourser',
    depth: 'PARTIAL', anchor: 'src/systems/finance.ts#giveMoney', priority: 3,
    gap: 'donner et demander seulement : aucune dette interpersonnelle suivie',
    connects: ['finance', 'relations'],
  },
  {
    domain: 'Relations', system: 'Rencontres', leaf: 'Application de rencontres',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#useDatingApp', priority: 3,
    gap: 'un tirage de prétendant : ni profils, ni critères, ni conversation',
    connects: ['relations'],
  },
  {
    domain: 'Relations', system: 'Rendez-vous', leaf: 'Sortir avec quelqu’un : lieu, budget, déroulé',
    depth: 'MISSING', priority: 2,
    gap: 'aucun rendez-vous : la séduction est une suite de clics sans scène',
    connects: [],
  },
  {
    domain: 'Relations', system: 'Mémoire', leaf: 'Les PNJ se souviennent de ce qu’on leur a fait',
    depth: 'PARTIAL', anchor: 'src/engine/types.ts#Person', priority: 2,
    gap: 'relation et opinion évoluent, mais aucun souvenir daté et nommé n’est conservé',
    connects: ['relations'],
  },
  {
    domain: 'Relations', system: 'PNJ autonomes', leaf: 'Les PNJ vivent sans le joueur',
    depth: 'PARTIAL', anchor: 'src/systems/relationships.ts#advanceRelationships', priority: 2,
    gap: 'ils vieillissent, meurent et prennent quelques initiatives ; ils ne travaillent, ne déménagent ni ne s’enrichissent',
    connects: ['relations'],
  },
];

/* ================================================================== */
/* FAMILLE                                                             */
/* ================================================================== */

const FAMILY: AuditLeaf[] = [
  {
    domain: 'Famille', system: 'Enfants', leaf: 'Concevoir, naître, grandir',
    depth: 'PARTIAL', anchor: 'src/systems/relationships.ts#tryForBaby', priority: 3,
    gap: 'les enfants existent et vieillissent, mais les actions ne changent pas avec leur âge',
    connects: ['relations', 'finance'],
  },
  {
    domain: 'Famille', system: 'Adoption', leaf: 'Procédure d’adoption',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#adoptChild', priority: 3,
    gap: 'un bouton et un tirage : ni profils, ni dossier, ni évaluation',
    connects: ['relations', 'finance'],
  },
  {
    domain: 'Famille', system: 'Fertilité', leaf: 'Parcours médicaux',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#fertilityTreatment', priority: 4,
    gap: 'un traitement générique à taux fixe',
    connects: ['santé', 'finance'],
  },
  {
    domain: 'Famille', system: 'Animaux', leaf: 'Adopter, nourrir, promener, soigner',
    depth: 'PARTIAL', anchor: 'src/systems/activities.ts#playWithPet', priority: 3,
    gap: 'ni refuge, ni dressage, ni comportement propre à l’animal ; le vétérinaire est un bouton',
    connects: ['finance', 'bonheur'],
  },
  {
    domain: 'Famille', system: 'Héritage', leaf: 'Testament, succession, répartition',
    depth: 'DEEP', anchor: 'src/systems/inheritance.ts#settleEstate', priority: 5,
    connects: ['finance', 'relations', 'propriétés'],
  },
  {
    domain: 'Famille', system: 'Continuer', leaf: 'Reprendre un descendant : le monde, la famille et le nom continuent',
    depth: 'DEEP', anchor: 'src/systems/lineage.ts#continueAs', priority: 5,
    connects: ['finance', 'relations', 'environnement', 'héritage'],
  },
  {
    domain: 'Famille', system: 'Continuer', leaf: 'La parenté recalculée depuis le nouveau point de vue',
    depth: 'DEEP', anchor: 'src/systems/lineage.ts#relationTo', priority: 5,
    connects: ['relations'],
  },
  {
    domain: 'Famille', system: 'Continuer', leaf: 'Le milieu de départ hérité de la fortune transmise',
    depth: 'DEEP', anchor: 'src/systems/lineage.ts#tierFromWealth', priority: 5,
    connects: ['environnement', 'finance', 'université'],
  },
  {
    domain: 'Famille', system: 'Continuer', leaf: 'La lignée : une ligne par génération, un ancêtre retrouvable',
    depth: 'DEEP', anchor: 'src/systems/lineage.ts#heirsOf', priority: 4,
    connects: ['relations'],
  },
];

/* ================================================================== */
/* SANTÉ                                                               */
/* ================================================================== */

const HEALTH: AuditLeaf[] = [
  {
    domain: 'Santé', system: 'Maladies', leaf: 'Cinquante maladies, chroniques, silencieuses',
    depth: 'DEEP', anchor: 'src/systems/health.ts#advanceDiseases', priority: 5,
    connects: ['finance', 'travail', 'décès'],
  },
  {
    domain: 'Santé', system: 'Consultation', leaf: 'Consulter, diagnostiquer, traiter',
    depth: 'PARTIAL', anchor: 'src/systems/health.ts#consult', priority: 3,
    gap: 'les médecins sont des types abstraits : ni PNJ, ni réputation, ni second avis',
    connects: ['finance'],
  },
  {
    domain: 'Santé', system: 'Chirurgie esthétique', leaf: 'Procédures, praticien, risque, résultat',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#cosmeticSurgery', priority: 4,
    gap: 'un tirage : ni praticien identifié, ni litige possible en cas de ratage',
    connects: ['apparence', 'finance'],
  },
  {
    domain: 'Santé', system: 'Corps et esprit', leaf: 'Sport, bien-être, méditation',
    depth: 'PARTIAL', anchor: 'src/systems/activities.ts#doSport', priority: 3,
    gap: 'des activités à effet immédiat ; ni progression, ni discipline suivie, ni régime',
    connects: ['santé', 'personnalité'],
  },
  {
    domain: 'Santé', system: 'Lecture', leaf: 'Lire un livre, progresser dedans',
    depth: 'MISSING', priority: 4,
    gap: 'aucune bibliothèque, aucun livre',
    connects: [],
  },
];

/* ================================================================== */
/* FINANCE                                                             */
/* ================================================================== */

const FINANCE: AuditLeaf[] = [
  {
    domain: 'Finance', system: 'Budget', leaf: 'Bilan annuel, impôts, coût de la vie',
    depth: 'DEEP', anchor: 'src/systems/finance.ts#runAnnualFinance', priority: 5,
    connects: ['travail', 'propriétés', 'famille'],
  },
  {
    domain: 'Finance', system: 'Dettes', leaf: 'Prêts, hypothèques, faillite',
    depth: 'DEEP', anchor: 'src/systems/finance.ts#takePersonalLoan', priority: 5,
    connects: ['propriétés', 'finance'],
  },
  {
    domain: 'Finance', system: 'Crédit', leaf: 'Score de solvabilité',
    depth: 'MISSING', priority: 3,
    gap: 'la capacité d’emprunt dépend du revenu seul : aucun historique de remboursement ne compte',
    connects: [],
  },
  {
    domain: 'Finance', system: 'Placements', leaf: 'Dix supports, cours persistants, portefeuille',
    depth: 'DEEP', anchor: 'src/systems/investing.ts#invest', priority: 5,
    connects: ['finance', 'personnalité'],
  },
  {
    domain: 'Finance', system: 'Placements', leaf: 'Courbes historiques consultables',
    depth: 'PARTIAL', anchor: 'src/engine/types.ts#AssetMarket', priority: 2,
    gap: 'vingt cours sont conservés mais rien ne les dessine : le joueur ne voit qu’un pourcentage annuel',
    connects: ['finance'],
  },
  {
    domain: 'Finance', system: 'Placements', leaf: 'Entreprises cotées avec un état propre',
    depth: 'MISSING', priority: 2,
    gap: 'les supports sont des indices abstraits : aucune société n’a de secteur, de dette ni de résultats',
    connects: [],
  },
  {
    domain: 'Finance', system: 'Placements', leaf: 'Actualités financières qui déplacent les cours',
    depth: 'MISSING', priority: 3,
    gap: 'les cours ne bougent que par la conjoncture et le hasard',
    connects: [],
  },
  {
    domain: 'Finance', system: 'Placements', leaf: 'Conseiller financier',
    depth: 'MISSING', priority: 4,
    gap: 'personne à qui demander conseil, personne à qui déléguer',
    connects: [],
  },
  {
    domain: 'Finance', system: 'Jeux d’argent', leaf: 'Loterie et casino',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#playCasino', priority: 3,
    gap: 'un tirage par jeu : aucun jeu de casino n’est jouable, la loterie n’a pas d’interface',
    connects: ['finance'],
  },
];

/* ================================================================== */
/* PATRIMOINE                                                          */
/* ================================================================== */

const ASSETS: AuditLeaf[] = [
  {
    domain: 'Patrimoine', system: 'Immobilier', leaf: 'Acheter, hypothéquer, rénover, vendre',
    depth: 'DEEP', anchor: 'src/systems/properties.ts#buyProperty', priority: 5,
    connects: ['finance', 'environnement'],
  },
  {
    domain: 'Patrimoine', system: 'Locatif', leaf: 'Fixer son loyer : le prix sélectionne le locataire',
    depth: 'INTERACTIVE', anchor: 'src/systems/tenancy.ts#setAskingRent', priority: 5,
    connects: ['finance', 'relations', 'environnement'],
  },
  {
    domain: 'Patrimoine', system: 'Locatif', leaf: 'Vacance, renouvellement de bail, hausse de loyer',
    depth: 'DEEP', anchor: 'src/systems/tenancy.ts#renewLease', priority: 5,
    connects: ['finance'],
  },
  {
    domain: 'Patrimoine', system: 'Locataires', leaf: 'Le locataire est un PNJ, choisi parmi des dossiers',
    depth: 'DEEP', anchor: 'src/systems/tenancy.ts#acceptTenant', priority: 5,
    connects: ['relations', 'finance'],
  },
  {
    domain: 'Patrimoine', system: 'Locataires', leaf: 'Impayés, usure, demandes de travaux, expulsion',
    depth: 'DEEP', anchor: 'src/systems/tenancy.ts#advanceTenancy', priority: 5,
    connects: ['finance', 'relations'],
  },
  {
    domain: 'Patrimoine', system: 'Locataires', leaf: 'Répondre à une réparation : faire, bâcler, ignorer',
    depth: 'DEEP', anchor: 'src/systems/tenancy.ts#handleRepair', priority: 5,
    connects: ['finance', 'relations'],
  },
  {
    domain: 'Patrimoine', system: 'Véhicules', leaf: 'Acheter, entretenir, revendre',
    depth: 'DEEP', anchor: 'src/systems/vehicles.ts#buyVehicle', priority: 5,
    connects: ['finance'],
  },
  {
    domain: 'Patrimoine', system: 'Permis', leaf: 'Examen du permis',
    depth: 'PLACEHOLDER', anchor: 'src/systems/activities.ts#getDrivingLicense', priority: 2,
    gap: 'un bouton et un tirage : aucune épreuve',
    connects: ['véhicules'],
  },
  {
    domain: 'Patrimoine', system: 'Objets de valeur', leaf: 'Acheter, revendre',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#buyItem', priority: 2,
    gap: 'quinze objets fixes : ni rareté, ni authenticité, ni provenance',
    connects: ['finance'],
  },
  {
    domain: 'Patrimoine', system: 'Collections', leaf: 'Collectionner et voir sa collection',
    depth: 'MISSING', priority: 2,
    gap: 'aucune notion de collection : les objets sont une liste plate',
    connects: [],
  },
  {
    domain: 'Patrimoine', system: 'Enchères', leaf: 'Salle des ventes jouable',
    depth: 'PLACEHOLDER', anchor: 'src/data/activities.ts', priority: 2,
    gap: 'un canal de revente au meilleur taux : personne n’enchérit en face',
    connects: ['finance'],
  },
  {
    domain: 'Patrimoine', system: 'Luxe', leaf: 'Bateaux, avions, œuvres d’art',
    depth: 'MISSING', priority: 4,
    gap: 'le patrimoine s’arrête aux voitures et aux bijoux',
    connects: [],
  },
];

/* ================================================================== */
/* CRIME                                                               */
/* ================================================================== */

const CRIME: AuditLeaf[] = [
  {
    domain: 'Crime', system: 'Vol à la tire', leaf: 'Choix de la cible',
    depth: 'DEEP', anchor: 'src/systems/pickpocketing.ts#availableTargets', priority: 5,
    connects: ['environnement'],
  },
  {
    domain: 'Crime', system: 'Vol à la tire', leaf: 'Mini-jeu jouable',
    depth: 'INTERACTIVE', anchor: 'src/systems/minigames/pickpocket.ts#PICKPOCKET', priority: 5,
    connects: ['crime', 'chaleur'],
  },
  {
    domain: 'Crime', system: 'Vol à la tire', leaf: 'Jauge de méfiance, réaction de la cible',
    depth: 'INTERACTIVE', anchor: 'src/systems/minigames/pickpocket.ts#pickpocketOutcome', priority: 5,
    connects: ['crime'],
  },
  {
    domain: 'Crime', system: 'Vol à la tire', leaf: 'La victime se souvient',
    depth: 'MISSING', priority: 3,
    gap: 'la cible est anonyme et disparaît : elle ne devient jamais un PNJ',
    connects: [],
  },
  {
    domain: 'Crime', system: 'Cambriolage', leaf: 'Plan procédural, occupants, bruit, charge',
    depth: 'INTERACTIVE', anchor: 'src/systems/minigames/burglary.ts#BURGLARY', priority: 5,
    connects: ['crime', 'chaleur', 'fuite'],
  },
  {
    domain: 'Crime', system: 'Fuite', leaf: 'Course jouable, réutilisable',
    depth: 'INTERACTIVE', anchor: 'src/systems/minigames/chase.ts#CHASE', priority: 5,
    connects: ['crime', 'prison', 'justice'],
  },
  {
    domain: 'Crime', system: 'Vol de véhicule', leaf: 'Puzzle fictif',
    depth: 'PLACEHOLDER', anchor: 'src/systems/crime.ts#commitCrime', priority: 2,
    gap: 'un délit du catalogue : ni choix du véhicule, ni épreuve, ni revente',
    connects: ['crime'],
  },
  {
    domain: 'Crime', system: 'Vol à l’étalage', leaf: 'Scène de magasin',
    depth: 'PLACEHOLDER', anchor: 'src/systems/crime.ts#commitCrime', priority: 2,
    gap: 'un délit du catalogue : aucune scène',
    connects: ['crime'],
  },
  {
    domain: 'Crime', system: 'Braquage', leaf: 'Minutage, alerte, décision de partir',
    depth: 'PLACEHOLDER', anchor: 'src/systems/crime.ts#commitCrime', priority: 2,
    gap: 'un délit du catalogue : aucune scène, aucune équipe',
    connects: ['crime'],
  },
  {
    domain: 'Crime', system: 'Chaleur', leaf: 'Attention policière distincte de la notoriété',
    depth: 'DEEP', anchor: 'src/systems/underworld.ts#addHeat', priority: 5,
    connects: ['justice', 'crime'],
  },
  {
    domain: 'Crime', system: 'Carnet', leaf: 'Receleur, indicateur, chauffeur, logeur, avocat',
    depth: 'DEEP', anchor: 'src/systems/underworld.ts#askService', priority: 5,
    connects: ['crime', 'justice', 'relations'],
  },
  {
    domain: 'Crime', system: 'Organisation', leaf: 'Rangs, respect, territoire, missions',
    depth: 'DEEP', anchor: 'src/systems/underworld.ts#settleMission', priority: 5,
    connects: ['crime', 'finance', 'chaleur'],
  },
  {
    domain: 'Crime', system: 'Organisation', leaf: 'Diriger : recruter, promouvoir, répartir',
    depth: 'MISSING', priority: 3,
    gap: 'on monte jusqu’au sommet sans que le gameplay change',
    connects: [],
  },
  {
    domain: 'Crime', system: 'Organisation', leaf: 'Conflits internes, trahisons',
    depth: 'MISSING', priority: 3,
    gap: 'la maison n’a pas de membres identifiés : personne à trahir',
    connects: [],
  },
  {
    domain: 'Crime', system: 'Compétences', leaf: 'Progression criminelle explicite',
    depth: 'BASIC', anchor: 'src/systems/crime.ts#commitCrime', priority: 3,
    gap: 'une seule statistique `criminality` : ni discrétion, ni sang-froid, ni observation',
    connects: ['crime'],
  },
  {
    domain: 'Crime', system: 'Marché noir', leaf: 'Vendeurs, objets fictifs, arnaques, négociation',
    depth: 'MISSING', priority: 2,
    gap: 'le receleur rachète, mais rien ne s’achète nulle part',
    connects: [],
  },
];

/* ================================================================== */
/* JUSTICE ET PRISON                                                   */
/* ================================================================== */

const JUSTICE: AuditLeaf[] = [
  {
    domain: 'Justice', system: 'Arrestation', leaf: 'Interpellation, saisie, dossier',
    depth: 'DEEP', anchor: 'src/systems/justice.ts#arrest', priority: 5,
    connects: ['crime', 'prison'],
  },
  {
    domain: 'Justice', system: 'Enquête', leaf: 'Dossier qui avance sur plusieurs années',
    depth: 'DEEP', anchor: 'src/systems/underworld.ts#openInvestigation', priority: 5,
    connects: ['crime', 'justice'],
  },
  {
    domain: 'Justice', system: 'Procès', leaf: 'Avocat, preuves, verdict, appel',
    depth: 'PARTIAL', anchor: 'src/systems/justice.ts#goToTrial', priority: 3,
    gap: 'le choix de l’avocat décide de tout : l’audience elle-même ne se joue pas',
    connects: ['prison', 'finance'],
  },
  {
    domain: 'Justice', system: 'Poursuivre', leaf: 'Être celui qui attaque en justice',
    depth: 'MISSING', priority: 3,
    gap: 'le joueur ne peut jamais porter plainte ni réclamer réparation',
    connects: [],
  },
  {
    domain: 'Prison', system: 'Détention', leaf: 'Régime, dossier, respect, codétenus',
    depth: 'DEEP', anchor: 'src/systems/prison.ts#inmateAction', priority: 5,
    connects: ['relations', 'santé', 'évasion'],
  },
  {
    domain: 'Prison', system: 'Conditionnelle', leaf: 'Commission, refus successifs',
    depth: 'DEEP', anchor: 'src/systems/prison.ts#requestParole', priority: 5,
    connects: ['justice'],
  },
  {
    domain: 'Prison', system: 'Évasion', leaf: 'Préparation puis traversée jouable',
    depth: 'INTERACTIVE', anchor: 'src/systems/minigames/escape.ts#ESCAPE', priority: 5,
    connects: ['prison', 'fuite', 'cavale'],
  },
  {
    domain: 'Prison', system: 'Cavale', leaf: 'Vie de fugitif, reddition, prescription',
    depth: 'DEEP', anchor: 'src/systems/escape.ts#advanceFugitive', priority: 5,
    connects: ['travail', 'relations', 'justice'],
  },
  {
    domain: 'Prison', system: 'Émeute', leaf: 'Rallier des détenus, jauge de tension',
    depth: 'BASIC', anchor: 'src/systems/prison.ts#doPrisonActivity', priority: 3,
    gap: 'un bouton et un tirage : aucun ralliement, aucune tension à gérer',
    connects: ['prison'],
  },
];

/* ================================================================== */
/* ACTIVITÉS ET MONDE                                                  */
/* ================================================================== */

const WORLD: AuditLeaf[] = [
  {
    domain: 'Activités', system: 'Loisirs', leaf: 'Sorties, voyages, animaux, réseaux',
    depth: 'PARTIAL', anchor: 'src/systems/activities.ts#goOut', priority: 3,
    gap: 'des boutons à effet immédiat : ni lieu, ni accompagnant, ni scène',
    connects: ['bonheur', 'relations', 'finance'],
  },
  {
    domain: 'Activités', system: 'Plein air', leaf: 'Randonnée, pêche, camping, navigation',
    depth: 'MISSING', priority: 4,
    gap: 'aucune activité de plein air',
    connects: [],
  },
  {
    domain: 'Activités', system: 'Voyages', leaf: 'Destination, budget, accompagnants',
    depth: 'BASIC', anchor: 'src/systems/activities.ts#takeVacation', priority: 3,
    gap: 'une destination et un prix : personne ne vient, rien n’arrive sur place',
    connects: ['bonheur', 'finance'],
  },
  {
    domain: 'Monde', system: 'Environnement vivant', leaf: 'Quartier, économie, foyer qui dérivent',
    depth: 'DEEP', anchor: 'src/systems/environment.ts#advanceEnvironment', priority: 5,
    connects: ['école', 'travail', 'finance', 'propriétés'],
  },
  {
    domain: 'Monde', system: 'Immigration', leaf: 'Changer de pays',
    depth: 'PARTIAL', anchor: 'src/systems/activities.ts#immigrate', priority: 4,
    gap: 'un déménagement instantané : ni demande, ni refus, ni adaptation',
    connects: ['environnement', 'finance'],
  },
  {
    domain: 'Monde', system: 'Actualités', leaf: 'Fil d’actualité du monde',
    depth: 'MISSING', priority: 3,
    gap: 'le monde change en silence : le joueur ne l’apprend jamais',
    connects: [],
  },
  {
    domain: 'Monde', system: 'Événements', leaf: 'Événements à choix multiples',
    depth: 'DEEP', anchor: 'src/systems/randomEvents.ts#rollRandomEvents', priority: 5,
    connects: ['tout'],
  },
  {
    domain: 'Monde', system: 'Événements', leaf: 'Conséquences retardées',
    depth: 'MISSING', priority: 2,
    gap: 'un choix produit son effet immédiatement et n’est jamais rappelé',
    connects: [],
  },
];

export const GAMEPLAY_AUDIT: AuditLeaf[] = [
  ...CHARACTER, ...CHILDHOOD, ...SCHOOL, ...UNIVERSITY, ...WORK, ...SPECIAL,
  ...FAME, ...RELATIONS, ...FAMILY, ...HEALTH, ...FINANCE, ...ASSETS,
  ...CRIME, ...JUSTICE, ...WORLD,
];

/* ------------------------------------------------------------------ */
/* Lectures                                                            */
/* ------------------------------------------------------------------ */

/** Score d'un ensemble de feuilles, en pourcentage. */
export function scoreOf(leaves: AuditLeaf[]): number {
  if (leaves.length === 0) return 0;
  const total = leaves.reduce((sum, l) => sum + DEPTH_WEIGHT[l.depth], 0);
  return Math.round((total / leaves.length) * 100);
}

/** Score par domaine, du plus faible au plus fort. */
export function scoreByDomain(): { domain: string; score: number; leaves: number }[] {
  const domains = [...new Set(GAMEPLAY_AUDIT.map((l) => l.domain))];
  return domains
    .map((domain) => {
      const leaves = GAMEPLAY_AUDIT.filter((l) => l.domain === domain);
      return { domain, score: scoreOf(leaves), leaves: leaves.length };
    })
    .sort((a, b) => a.score - b.score);
}

/** Score global. */
export function overallScore(): number {
  return scoreOf(GAMEPLAY_AUDIT);
}

/** Répartition par niveau. */
export function byDepth(): Record<Depth, number> {
  const out: Record<Depth, number> = {
    MISSING: 0, PLACEHOLDER: 0, BASIC: 0, PARTIAL: 0, DEEP: 0, INTERACTIVE: 0,
  };
  for (const leaf of GAMEPLAY_AUDIT) out[leaf.depth] += 1;
  return out;
}

/**
 * L'ordre de travail.
 *
 * Priorité d'abord, puis profondeur : à priorité égale, ce qui n'existe pas
 * du tout passe avant ce qui est seulement superficiel.
 */
export function workOrder(limit = 40): AuditLeaf[] {
  const rank: Record<Depth, number> = {
    MISSING: 0, PLACEHOLDER: 1, BASIC: 2, PARTIAL: 3, DEEP: 4, INTERACTIVE: 5,
  };
  return [...GAMEPLAY_AUDIT]
    .filter((l) => l.depth !== 'DEEP' && l.depth !== 'INTERACTIVE')
    .sort((a, b) => a.priority - b.priority || rank[a.depth] - rank[b.depth])
    .slice(0, limit);
}

/**
 * Les feuilles orphelines.
 *
 * Une fonctionnalité qui ne touche aucun autre système est un cul-de-sac : on
 * peut la retirer du jeu sans que rien ne change. C'est le signal demandé au
 * §151, et il ne s'applique qu'à ce qui existe — ce qui manque ne connecte
 * évidemment rien.
 */
export function orphans(): AuditLeaf[] {
  return GAMEPLAY_AUDIT.filter(
    (l) => l.depth !== 'MISSING' && l.connects.length === 0,
  );
}

/** Vérifie que l'audit se tient. Utilisé par les tests et les rapports. */
export function auditProblems(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const leaf of GAMEPLAY_AUDIT) {
    const label = `${leaf.domain} > ${leaf.system} > ${leaf.leaf}`;
    if (seen.has(label)) problems.push(`${label} : feuille en double.`);
    seen.add(label);

    if (leaf.depth === 'MISSING') {
      if (leaf.anchor) problems.push(`${label} : absente mais cite un symbole.`);
      if (!leaf.gap) problems.push(`${label} : absente sans dire ce qui manque.`);
    } else if (!leaf.anchor) {
      problems.push(`${label} : ${leaf.depth} sans symbole citable.`);
    }

    if (leaf.depth !== 'DEEP' && leaf.depth !== 'INTERACTIVE' && !leaf.gap) {
      problems.push(`${label} : ${leaf.depth} sans manque déclaré.`);
    }
    if ((leaf.depth === 'DEEP' || leaf.depth === 'INTERACTIVE') && leaf.gap) {
      problems.push(`${label} : déclarée aboutie tout en listant un manque.`);
    }
    if (leaf.priority < 1 || leaf.priority > 5) {
      problems.push(`${label} : priorité hors de 1-5.`);
    }
  }
  return problems;
}
