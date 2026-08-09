/**
 * Matrice de parité de gameplay.
 *
 * Le but de ce fichier est d'empêcher une illusion précise : croire qu'une
 * fonctionnalité existe parce qu'une catégorie porte son nom. Avoir « École »
 * dans un menu ne veut pas dire avoir un système scolaire ; avoir « Travail »
 * ne veut pas dire avoir une carrière.
 *
 * Chaque ligne décrit une capacité attendue d'un simulateur de vie complet,
 * ce que notre jeu en fait réellement, et ce qui manque. La colonne `anchor`
 * est ce qui rend la matrice honnête : elle désigne un symbole exporté du
 * projet, et le test `parite.test.ts` échoue si une ligne se déclare COMPLETE
 * ou PARTIAL en pointant vers un symbole qui n'existe pas. On ne peut donc pas
 * s'auto-décerner une fonctionnalité.
 *
 * `depth` est une note de profondeur de 0 à 5, distincte du statut :
 *
 *   0 — rien
 *   1 — un bouton qui applique un effet chiffré, sans écran ni contexte
 *   2 — un écran, quelques actions, peu de conséquences croisées
 *   3 — plusieurs actions contextuelles, conséquences sur d'autres systèmes
 *   4 — boucle de jeu propre, événements dédiés, PNJ impliqués
 *   5 — boucle complète, mini-jeu ou arbitrage récurrent, conséquences longues
 *
 * Le score de parité (`parityScore`) se calcule sur la profondeur, pas sur le
 * nombre de boutons : un écran avec douze boutons sans conséquence vaut moins
 * qu'un écran avec trois actions qui changent la suite de la partie.
 */

export type ParityStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING';

export interface ParityEntry {
  /** Grand domaine de gameplay. */
  domain: string;
  /** Capacité attendue, formulée fonctionnellement. */
  feature: string;
  /** Ce que notre jeu propose aujourd'hui, ou `null` si rien. */
  ours: string | null;
  /** Profondeur réelle, 0-5. Voir l'en-tête. */
  depth: number;
  /** Interactions attendues et absentes. */
  missingInteractions?: string[];
  /** Conséquences attendues et absentes. */
  missingConsequences?: string[];
  /** Mini-jeu attendu, le cas échéant. */
  miniGame?: string;
  /** 1 = à faire en premier, 5 = confort. */
  priority: number;
  status: ParityStatus;
  /**
   * `fichier#symbole` prouvant que la fonctionnalité existe vraiment.
   * Obligatoire dès que le statut n'est pas MISSING.
   */
  anchor?: string;
}

export const PARITY_MATRIX: ParityEntry[] = [
  /* ---------------- Naissance et enfance ---------------- */
  {
    domain: 'Naissance', feature: 'Choix du milieu de naissance',
    ours: 'Treize contextes, réglage détaillé de chaque couche, aperçus qualitatifs',
    depth: 5, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/originGen.ts#previewOrigin',
  },
  {
    domain: 'Naissance', feature: 'Caractère de départ',
    ours: 'Tempérament réglable, 27 axes, 17 valeurs, exposition calculée',
    depth: 5, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/psycheGen.ts#buildPsyche',
  },
  {
    domain: 'Enfance', feature: 'Demander quelque chose aux parents',
    ours: 'Interactions génériques (discuter, compliment, demander de l’argent)',
    depth: 2, priority: 1, status: 'PARTIAL',
    missingInteractions: ['demander un animal', 'demander une activité', 'demander une permission', 'négociation avec condition'],
    missingConsequences: ['refus qui marque la relation', 'condition posée puis vérifiée l’année suivante'],
    anchor: 'src/systems/relationships.ts#interact',
  },

  /* ---------------- École ---------------- */
  {
    domain: 'École', feature: 'Fiche d’établissement consultable',
    ours: 'Une ligne dans « Parcours » avec le nom et la moyenne',
    depth: 1, priority: 1, status: 'PARTIAL',
    missingInteractions: ['écran dédié', 'réputation', 'comportement', 'années restantes', 'liste du personnel'],
    anchor: 'src/screens/OccupationScreen.tsx#OccupationScreen',
  },
  {
    domain: 'École', feature: 'Effort scolaire',
    ours: 'Trois rythmes qui pèsent sur les notes, le stress et le temps libre',
    depth: 3, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/education.ts#setEffort',
  },
  {
    domain: 'École', feature: 'Sécher les cours avec conséquences graduées',
    ours: 'Une action au résultat unique',
    depth: 1, priority: 1, status: 'PARTIAL',
    missingConsequences: ['avertissement', 'retenue', 'convocation des parents', 'exclusion temporaire', 'récidive suivie dans le temps'],
    anchor: 'src/systems/education.ts#skipClass',
  },
  {
    domain: 'École', feature: 'Abandonner les études',
    ours: 'Action disponible dès 16 ans, avec effets sur les diplômes',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/education.ts#dropOut',
  },
  {
    domain: 'École', feature: 'Liste de camarades consultable',
    ours: 'Les camarades existent comme PNJ complets mais ne sont pas listés depuis l’école',
    depth: 2, priority: 1, status: 'PARTIAL',
    missingInteractions: ['bouton Camarades', 'fiche par élève depuis l’école', 'groupe social visible'],
    anchor: 'src/systems/school.ts#buildSchoolClass',
  },
  {
    domain: 'École', feature: 'Interactions riches avec un camarade',
    ours: 'Les douze interactions sociales génériques',
    depth: 2, priority: 1, status: 'PARTIAL',
    missingInteractions: ['aider pour les cours', 'demander de l’aide', 'taquiner', 'provoquer', 'signaler', 'demander à devenir meilleur ami'],
    missingConsequences: ['réaction dépendant du caractère de la cible', 'répercussion sur la réputation en classe'],
    anchor: 'src/systems/relationships.ts#interact',
  },
  {
    domain: 'École', feature: 'Enseignants comme PNJ',
    ours: null,
    depth: 0, priority: 1, status: 'MISSING',
    missingInteractions: ['professeur principal', 'directeur', 'conseiller', 'parler', 'demander de l’aide', 'se plaindre', 'manquer de respect'],
  },
  {
    domain: 'École', feature: 'Manquer de respect avec réaction non binaire',
    ours: 'Insulter existe, mais la réaction est calculée sans escalade scolaire',
    depth: 1, priority: 1, status: 'PARTIAL',
    missingConsequences: ['ignorer / répondre / signaler', 'sanction scolaire', 'parents avertis', 'réputation qui monte ou descend selon le public'],
    anchor: 'src/systems/relationships.ts#interact',
  },
  {
    domain: 'École', feature: 'Clubs et activités',
    ours: 'Clubs rejoignables avec effets sur les statistiques',
    depth: 2, priority: 2, status: 'PARTIAL',
    missingInteractions: ['quitter un club', 'progresser', 'devenir capitaine ou responsable'],
    missingConsequences: ['compétitions', 'titre reconnu dans le dossier'],
    anchor: 'src/systems/education.ts#joinClub',
  },
  {
    domain: 'École', feature: 'Popularité multidimensionnelle',
    ours: 'Connu, apprécié, respecté, influent, intimidant, drôle — calculés chaque année',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/school.ts#advanceClassLife',
  },
  {
    domain: 'École', feature: 'Groupes sociaux et intégration',
    ours: 'Les groupes émergent tout seuls mais le joueur ne peut pas tenter d’en intégrer un',
    depth: 2, priority: 2, status: 'PARTIAL',
    missingInteractions: ['tenter d’intégrer un groupe', 'quitter un groupe'],
    anchor: 'src/systems/school.ts#advanceClassLife',
  },
  {
    domain: 'École', feature: 'Banque d’événements scolaires',
    ours: 'Événements d’enfance et d’adolescence génériques',
    depth: 2, priority: 2, status: 'PARTIAL',
    missingInteractions: ['contrôle surprise', 'professeur injuste', 'camarade qui veut copier', 'projet de groupe', 'nouvel élève', 'conflit entre élèves'],
    anchor: 'src/data/events/teen.ts',
  },
  {
    domain: 'École', feature: 'Harcèlement subi et infligé',
    ours: 'Le harcèlement subi est simulé et laisse une trace durable',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['harceler quelqu’un', 'défendre une victime', 'signaler'],
    anchor: 'src/systems/school.ts#advanceClassLife',
  },

  /* ---------------- Université ---------------- */
  {
    domain: 'Université', feature: 'Filières, admission, frais, bourse',
    ours: 'Vingt filières, admission calculée, frais annuels, bourse',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/education.ts#enrollUniversity',
  },
  {
    domain: 'Université', feature: 'Vie étudiante distincte du lycée',
    ours: 'Mêmes actions que le secondaire',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['colocation', 'fraternité ou association', 'stage', 'mémoire'],
    anchor: 'src/systems/education.ts#advanceEducation',
  },

  /* ---------------- Relations ---------------- */
  {
    domain: 'Relations', feature: 'Fiche complète par personne',
    ours: 'Fiche avec personnalité, historique, statistiques de lien',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/screens/RelationshipsScreen.tsx#RelationshipsScreen',
  },
  {
    domain: 'Relations', feature: 'Actions sociales génériques',
    ours: 'Discuter, temps, compliment, cadeau, argent, dispute, insulte, rupture, ponts coupés, réconciliation',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['demander conseil', 'prêter', 'emprunter', 'demander un service'],
    anchor: 'src/systems/relationships.ts#interact',
  },
  {
    domain: 'Relations', feature: 'Actions disponibles selon le contexte',
    ours: 'Filtrage à la main dans l’écran, dispersé et incomplet',
    depth: 2, priority: 1, status: 'PARTIAL',
    missingInteractions: ['une fonction unique getAvailableActions(acteur, cible, contexte)'],
    anchor: 'src/screens/RelationshipsScreen.tsx#RelationshipsScreen',
  },
  {
    domain: 'Amour', feature: 'Rencontre, couple, mariage, divorce',
    ours: 'Application de rencontre, sortir ensemble, bague, demande, mariage, contrat, rupture, divorce',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/relationships.ts#propose',
  },
  {
    domain: 'Amour', feature: 'Vie de couple entre les grands moments',
    ours: 'Embrasser et passer du temps',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['rendez-vous', 'voyage à deux', 'parler du couple', 'thérapie de couple', 'infidélité'],
    anchor: 'src/systems/relationships.ts#interact',
  },
  {
    domain: 'Enfants', feature: 'Avoir et élever des enfants',
    ours: 'Conception, naissance, adoption, l’enfant grandit comme PNJ',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['discipliner', 'aider aux devoirs', 'financer les études', 'soutenir une activité'],
    missingConsequences: ['style parental qui façonne l’enfant devenu adulte'],
    anchor: 'src/systems/relationships.ts#deliverBaby',
  },
  {
    domain: 'Enfants', feature: 'Adoption avec choix de l’enfant',
    ours: 'Une demande unique, acceptée ou refusée',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['plusieurs enfants proposés', 'profil de chacun', 'choix'],
    anchor: 'src/systems/activities.ts#adoptChild',
  },
  {
    domain: 'Fertilité', feature: 'Contraception, traitements, dons',
    ours: 'Un traitement de fertilité unique',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['contraception', 'don', 'suivi'],
    anchor: 'src/systems/activities.ts#fertilityTreatment',
  },

  /* ---------------- Santé, esprit et corps ---------------- */
  {
    domain: 'Santé', feature: 'Maladies, diagnostic, traitement, coût',
    ours: 'Cinquante pathologies, aggravation, traitements, prise en charge par pays',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/health.ts#treatDisease',
  },
  {
    domain: 'Santé', feature: 'Choisir son praticien',
    ours: 'Plusieurs types de consultation',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['plusieurs médecins concurrents avec réputation et tarif', 'urgences'],
    anchor: 'src/systems/health.ts#consult',
  },
  {
    domain: 'Esprit & corps', feature: 'Sport, bien-être, méditation',
    ours: 'Sports variés, bien-être, effets sur forme, humeur et stress',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#doSport',
  },
  {
    domain: 'Esprit & corps', feature: 'Lecture suivie livre par livre',
    ours: null,
    depth: 0, priority: 3, status: 'MISSING',
    missingInteractions: ['choisir un livre', 'avancer d’année en année', 'terminer'],
  },
  {
    domain: 'Apparence', feature: 'Chirurgie esthétique',
    ours: 'Plusieurs interventions, avec ratés possibles',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#cosmeticSurgery',
  },
  {
    domain: 'Apparence', feature: 'Salon, soins, coiffure',
    ours: null,
    depth: 0, priority: 4, status: 'MISSING',
    missingInteractions: ['coiffeur', 'soins', 'massage'],
  },

  /* ---------------- Travail ---------------- */
  {
    domain: 'Travail', feature: 'Fiche emploi détaillée',
    ours: 'Poste, employeur, salaire, ancienneté, performance, implication',
    depth: 3, priority: 1, status: 'PARTIAL',
    missingInteractions: ['satisfaction', 'heures travaillées', 'liste des collègues', 'supérieur identifié', 'promotions visibles'],
    anchor: 'src/screens/OccupationScreen.tsx#OccupationScreen',
  },
  {
    domain: 'Travail', feature: 'Actions professionnelles',
    ours: 'Implication, augmentation, démission, retraite',
    depth: 2, priority: 1, status: 'PARTIAL',
    missingInteractions: ['demander une promotion', 'prendre des congés', 'demander une mutation', 'se plaindre', 'signaler un collègue'],
    anchor: 'src/systems/careers.ts#askForRaise',
  },
  {
    domain: 'Travail', feature: 'Collègues comme PNJ',
    ours: 'La relation « collègue » existe dans le modèle mais aucun collègue n’est créé',
    depth: 1, priority: 1, status: 'PARTIAL',
    missingInteractions: ['collègues générés à l’embauche', 'interactions dédiées', 'ressources humaines'],
    anchor: 'src/engine/types.ts#Person',
  },
  {
    domain: 'Travail', feature: 'Supérieur hiérarchique',
    ours: null,
    depth: 0, priority: 1, status: 'MISSING',
    missingInteractions: ['complimenter', 'parler du travail', 'demander une promotion', 'manquer de respect'],
    missingConsequences: ['influence sur la promotion et le licenciement'],
  },
  {
    domain: 'Travail', feature: 'Carrière, promotions, licenciement',
    ours: 'Échelles hiérarchiques complètes, promotion, rétrogradation, licenciement',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/careers.ts#advanceCareer',
  },

  /* ---------------- Carrières spéciales ---------------- */
  {
    domain: 'Carrières spéciales', feature: 'Acteur : auditions, rôles, agent, récompenses',
    ours: 'Une échelle de salaires nommée « Acteur »',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['auditions', 'agent', 'choix de rôle', 'répétitions', 'récompenses'],
    anchor: 'src/data/jobs.ts',
  },
  {
    domain: 'Carrières spéciales', feature: 'Musicien : singles, albums, tournées',
    ours: 'Une échelle de salaires nommée « Musicien »',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['groupe ou solo', 'label', 'sortir un titre', 'concerts', 'certifications'],
    anchor: 'src/data/jobs.ts',
  },
  {
    domain: 'Carrières spéciales', feature: 'Athlète : équipe, saisons, transferts, blessures',
    ours: 'Échelles de salaires sportives',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['équipe', 'saison', 'entraînement', 'transfert', 'blessure de carrière'],
    anchor: 'src/data/jobs.ts',
  },
  {
    domain: 'Carrières spéciales', feature: 'Entreprise : produit, prix, employés, concurrence',
    ours: null,
    depth: 0, priority: 3, status: 'MISSING',
    missingInteractions: ['créer une entreprise', 'fixer les prix', 'embaucher', 'marketing', 'revendre'],
  },
  {
    domain: 'Carrières spéciales', feature: 'Politique : campagne, sondages, mandat',
    ours: 'Une échelle de salaires nommée « Politique »',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['candidature', 'budget de campagne', 'sondages', 'décisions de mandat', 'réélection'],
    anchor: 'src/data/jobs.ts',
  },
  {
    domain: 'Carrières spéciales', feature: 'Astronaute, mannequin, armée : boucle dédiée',
    ours: 'Trois échelles de salaires',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['missions', 'book et défilés', 'grade et affectation'],
    miniGame: 'puzzle tactique de mission',
    anchor: 'src/data/jobs.ts',
  },
  {
    domain: 'Célébrité', feature: 'Menu de célébrité',
    ours: 'Un compteur d’abonnés et la monétisation',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['interview', 'séance photo', 'publicité', 'sponsor', 'gérer une controverse'],
    anchor: 'src/systems/activities.ts#monetizeAudience',
  },
  {
    domain: 'Réseaux sociaux', feature: 'Plusieurs plateformes, publications, engagement',
    ours: 'Une seule audience globale, publication et monétisation',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['plusieurs plateformes', 'créer ou supprimer un compte', 'commenter', 'promouvoir'],
    anchor: 'src/systems/activities.ts#postOnSocial',
  },

  /* ---------------- Argent et possessions ---------------- */
  {
    domain: 'Argent', feature: 'Budget annuel, impôts, emprunts, faillite',
    ours: 'Bilan annuel détaillé, fiscalité par pays, prêts, faillite',
    depth: 5, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/finance.ts#runAnnualFinance',
  },
  {
    domain: 'Shopping', feature: 'Magasin structuré par rayon',
    ours: 'Objets de valeur, véhicules et immobilier dans trois écrans séparés',
    depth: 3, priority: 4, status: 'PARTIAL',
    missingInteractions: ['bijoux', 'cadeaux', 'biens de luxe selon la fortune'],
    anchor: 'src/systems/activities.ts#buyItem',
  },
  {
    domain: 'Propriétés', feature: 'Acheter, vendre, rénover, louer',
    ours: 'Achat comptant ou crédit, vente, rénovations, mise en location, résidence principale',
    depth: 4, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/properties.ts#renovate',
  },
  {
    domain: 'Véhicules', feature: 'Acheter, entretenir, réparer, vendre',
    ours: 'Achat, entretien, réparation, vente, vieillissement',
    depth: 4, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/vehicles.ts#serviceVehicle',
  },
  {
    domain: 'Véhicules', feature: 'Permis de conduire avec examen',
    ours: 'Une action au résultat probabiliste, sans épreuve',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['examen avec questions générées', 'échec et repassage'],
    miniGame: 'questionnaire de code fictif',
    anchor: 'src/systems/activities.ts#getDrivingLicense',
  },

  /* ---------------- Voyages ---------------- */
  {
    domain: 'Voyages', feature: 'Vacances avec destination et classe',
    ours: 'Choix d’une destination, effets sur humeur et argent',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['classe de voyage', 'inviter quelqu’un', 'événements sur place'],
    anchor: 'src/systems/activities.ts#takeVacation',
  },
  {
    domain: 'Immigration', feature: 'Émigrer vers un autre pays',
    ours: 'Demande de visa avec conditions et refus possible',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#immigrate',
  },

  /* ---------------- Crime, justice, prison ---------------- */
  {
    domain: 'Crime', feature: 'Catalogue de délits fictifs',
    ours: 'Quatorze délits avec gain, risque et peine',
    depth: 3, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/crime.ts#commitCrime',
  },
  {
    domain: 'Crime', feature: 'Pickpocket avec choix de cible',
    ours: 'Un délit au résultat purement probabiliste',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['plusieurs cibles au profil différent', 'arbitrage gain contre risque'],
    anchor: 'src/systems/crime.ts#commitCrime',
  },
  {
    domain: 'Crime', feature: 'Vol de véhicule avec choix du modèle',
    ours: 'Un délit générique',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['choisir un véhicule', 'garder ou revendre'],
    anchor: 'src/systems/crime.ts#commitCrime',
  },
  {
    domain: 'Crime', feature: 'Cambriolage jouable',
    ours: 'Un délit au résultat tiré une fois',
    depth: 1, priority: 2, status: 'PARTIAL',
    missingInteractions: ['exploration', 'décider quand repartir'],
    miniGame: 'plan procédural : pièces, butin, bruit, occupant, sortie',
    anchor: 'src/systems/crime.ts#commitCrime',
  },
  {
    domain: 'Justice', feature: 'Arrestation, avocat, procès, appel, casier',
    ours: 'Choix d’avocat, procès plaidé, appel, effacement du casier',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/justice.ts#goToTrial',
  },
  {
    domain: 'Prison', feature: 'Vie carcérale',
    ours: 'Établissement, peine, comportement, activités, conditionnelle',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['liste des détenus', 'parler à un détenu', 'niveau de sécurité visible'],
    anchor: 'src/systems/prison.ts#doPrisonActivity',
  },
  {
    domain: 'Prison', feature: 'Évasion jouable',
    ours: 'Une tentative au résultat tiré une fois',
    depth: 1, priority: 2, status: 'PARTIAL',
    miniGame: 'plan procédural : gardien mobile, portes, zones surveillées',
    anchor: 'src/systems/prison.ts#attemptEscape',
  },
  {
    domain: 'Prison', feature: 'Émeute jouable',
    ours: 'Une activité de détention au résultat tiré',
    depth: 1, priority: 3, status: 'PARTIAL',
    miniGame: 'rallier des détenus sans se faire intercepter',
    anchor: 'src/systems/prison.ts#doPrisonActivity',
  },

  /* ---------------- Divers ---------------- */
  {
    domain: 'Jeux d’argent', feature: 'Loterie et casino',
    ours: 'Loterie et plusieurs jeux de casino avec mise',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#playCasino',
  },
  {
    domain: 'Animaux', feature: 'Adopter, jouer, soigner',
    ours: 'Adoption, jeu, vétérinaire, vieillissement',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#adoptPetSpecies',
  },
  {
    domain: 'Retraite', feature: 'Pension et fin de carrière',
    ours: 'Départ à la retraite, pension calculée sur la carrière',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/careers.ts#retire',
  },
  {
    domain: 'Héritage', feature: 'Testament et succession',
    ours: 'Testament par bénéficiaire, ordre légal, droits de succession',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/inheritance.ts#settleEstate',
  },
  {
    domain: 'Générations', feature: 'Continuer avec un descendant',
    ours: null,
    depth: 0, priority: 3, status: 'MISSING',
    missingInteractions: ['reprendre la partie dans la peau d’un enfant', 'patrimoine et réputation transmis'],
  },
  {
    domain: 'Mort', feature: 'Fin de vie et récapitulatif',
    ours: 'Causes variées, récapitulatif, cimetière des vies passées',
    depth: 4, priority: 5, status: 'COMPLETE',
    anchor: 'src/engine/save.ts',
  },
  {
    domain: 'Réussites', feature: 'Défis et succès à débloquer',
    ours: null,
    depth: 0, priority: 4, status: 'MISSING',
    missingInteractions: ['liste de défis', 'progression', 'récompense symbolique'],
  },
  {
    domain: 'Mini-jeux', feature: 'Registre de mini-jeux',
    ours: null,
    depth: 0, priority: 2, status: 'MISSING',
    missingInteractions: ['registre commun', 'difficulté selon le contexte', 'conséquences en cas d’échec'],
  },
  {
    domain: 'Mini-jeux', feature: 'Test de mémoire',
    ours: null,
    depth: 0, priority: 4, status: 'MISSING',
    miniGame: 'séquence de symboles qui s’allonge',
  },
  {
    domain: 'Mini-jeux', feature: 'Test visuel',
    ours: null,
    depth: 0, priority: 5, status: 'MISSING',
    miniGame: 'repérer l’intrus parmi des symboles proches',
  },

  /* ---------------- Extensions ---------------- */
  {
    domain: 'Extensions', feature: 'Investissement et marchés',
    ours: 'Immobilier locatif et objets de valeur qui prennent ou perdent de la valeur',
    depth: 2, priority: 4, status: 'PARTIAL',
    missingInteractions: ['placements financiers', 'portefeuille'],
    anchor: 'src/systems/activities.ts#advanceValuables',
  },
  {
    domain: 'Extensions', feature: 'Marché noir fictif',
    ours: 'Blanchiment et revente par canal',
    depth: 2, priority: 5, status: 'PARTIAL',
    missingInteractions: ['catalogue d’articles', 'négociation'],
    anchor: 'src/systems/crime.ts#launderMoney',
  },
  {
    domain: 'Extensions', feature: 'Royauté',
    ours: null,
    depth: 0, priority: 5, status: 'MISSING',
  },
  {
    domain: 'Extensions', feature: 'Culte, agence secrète, zoo, casino, course automobile',
    ours: null,
    depth: 0, priority: 5, status: 'MISSING',
  },
];

/* ------------------------------------------------------------------ */
/* Score de parité                                                     */
/* ------------------------------------------------------------------ */

export interface DomainScore {
  domain: string;
  /** Pourcentage de profondeur atteinte sur la profondeur attendue. */
  score: number;
  entries: number;
  complete: number;
  partial: number;
  missing: number;
}

/**
 * Profondeur attendue d'une capacité, selon sa priorité.
 *
 * Une capacité prioritaire doit être profonde pour compter comme acquise ;
 * une extension de confort peut rester légère sans pénaliser le score. C'est
 * ce qui empêche de gonfler la note en multipliant les petites fonctions.
 */
function expectedDepth(priority: number): number {
  return priority <= 1 ? 5 : priority === 2 ? 4.5 : priority === 3 ? 4 : 3.5;
}

/** Score par domaine, puis score global pondéré par le nombre de capacités. */
export function parityScore(matrix: ParityEntry[] = PARITY_MATRIX): {
  domains: DomainScore[];
  total: number;
} {
  const byDomain = new Map<string, ParityEntry[]>();
  for (const entry of matrix) {
    const list = byDomain.get(entry.domain) ?? [];
    list.push(entry);
    byDomain.set(entry.domain, list);
  }

  const domains: DomainScore[] = [...byDomain].map(([domain, entries]) => {
    let got = 0;
    let want = 0;
    for (const e of entries) {
      const target = expectedDepth(e.priority);
      got += Math.min(e.depth, target);
      want += target;
    }
    return {
      domain,
      score: want === 0 ? 0 : Math.round((got / want) * 100),
      entries: entries.length,
      complete: entries.filter((e) => e.status === 'COMPLETE').length,
      partial: entries.filter((e) => e.status === 'PARTIAL').length,
      missing: entries.filter((e) => e.status === 'MISSING').length,
    };
  }).sort((a, b) => a.score - b.score);

  let got = 0;
  let want = 0;
  for (const e of matrix) {
    const target = expectedDepth(e.priority);
    got += Math.min(e.depth, target);
    want += target;
  }

  return { domains, total: want === 0 ? 0 : Math.round((got / want) * 100) };
}

/** Les manques à traiter en premier : priorité haute et profondeur faible. */
export function nextPriorities(matrix: ParityEntry[] = PARITY_MATRIX, limit = 12): ParityEntry[] {
  return [...matrix]
    .filter((e) => e.status !== 'COMPLETE')
    .sort((a, b) => a.priority - b.priority || a.depth - b.depth)
    .slice(0, limit);
}
