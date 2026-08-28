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
    /*
     * « Treize contextes » ci-dessus était vrai et incomplet : les treize
     * préréglages ne couvraient que trois des sept structures familiales, si
     * bien qu'une vie non composée à la main naissait toujours dans l'une des
     * mêmes trois. Les quatre autres arrivent maintenant.
     */
    domain: 'Naissance', feature: 'Naître ailleurs que chez les siens',
    ours: 'Adoption, famille d’accueil et enfant trouvé : on l’apprend, on peut chercher par six pistes, ce qu’on trouve n’est bon qu’une fois sur trois, et renoncer rapporte quelque chose. L’enfant trouvé part de rien — 31,9 % sur sa meilleure piste contre 58 % pour une adoption',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/roots.ts#goAndSee',
  },
  {
    domain: 'Naissance', feature: 'Les circonstances de l’arrivée',
    ours: 'Jumeau, né avant terme, né ailleurs, enfant trouvé, une bête déjà dans la maison — tirées sans aléa, jamais choisies, et chacune branchée sur un système existant',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/birth.ts#settleBirth',
  },
  {
    domain: 'Naissance', feature: 'Caractère de départ',
    ours: 'Tempérament réglable, 27 axes, 17 valeurs, exposition calculée',
    depth: 5, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/psycheGen.ts#buildPsyche',
  },
  {
    domain: 'Enfance', feature: 'Demander quelque chose aux parents',
    ours: 'Téléphone, ordinateur, animal, activité, couvre-feu, argent de poche — accepté, refusé, ou accordé sous condition vérifiée l’année suivante',
    depth: 5, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/asking.ts#askParent',
  },

  /* ---------------- École ---------------- */
  {
    domain: 'Enfance', feature: 'Activités familiales de l’enfance',
    ours: 'Seize activités ordinaires — lire, cuisiner, bricoler, planter, camper — chacune avec un accompagnant à choisir, trois issues selon ce qu’il y met, et une trace dans l’exposition qui décide des goûts adultes',
    depth: 5, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/childhood.ts#doFamilyActivity',
  },
  {
    domain: 'Enfance', feature: 'Amis hors de l’école',
    ours: 'Enfants du quartier rencontrés en sortant, selon la sûreté et les relations de voisinage',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['activités propres aux amis du quartier'],
    anchor: 'src/systems/childhood.ts#meetNeighbourChild',
  },
  {
    domain: 'École', feature: 'Fiche d’établissement consultable',
    ours: 'Écran dédié : établissement, dossier de comportement, place dans la classe, gens, clubs, groupes',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/screens/SchoolScreen.tsx#SchoolScreen',
  },
  {
    domain: 'École', feature: 'Effort scolaire',
    ours: 'Trois rythmes qui pèsent sur les notes, le stress et le temps libre',
    depth: 3, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/education.ts#setEffort',
  },
  {
    domain: 'École', feature: 'Sécher les cours avec conséquences graduées',
    ours: 'Escalade réelle : avertissement, retenue, convocation, exclusion, renvoi — selon le dossier et le règlement',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/schoolActions.ts#skipSchool',
  },
  {
    domain: 'École', feature: 'Abandonner les études',
    ours: 'Action disponible dès 16 ans, avec effets sur les diplômes',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/education.ts#dropOut',
  },
  {
    domain: 'École', feature: 'Liste de camarades consultable',
    ours: 'Bouton Camarades, fiche par élève avec passions, groupe et ce qui vous rapproche',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/school.ts#classmatesOf',
  },
  {
    domain: 'École', feature: 'Interactions riches avec un camarade',
    ours: 'Aider, demander de l’aide, taquiner, faire une farce, offrir, se déclarer, se réconcilier, provoquer, prendre sa défense, signaler, en parler à un adulte, meilleur ami — plus les interactions générales',
    depth: 5, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/schoolActions.ts#classmateAction',
  },
  {
    domain: 'École', feature: 'Enseignants comme PNJ',
    ours: 'Professeur principal, professeurs, directeur, conseiller — chacun avec compétence, sévérité, popularité, intégrité',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/school.ts#staffOf',
  },
  {
    domain: 'École', feature: 'Manquer de respect avec réaction non binaire',
    ours: 'Six réactions issues du caractère de la cible, sanction scolaire graduée, parents avertis, réputation qui monte ou descend selon le public',
    depth: 5, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/schoolActions.ts#disrespect',
  },
  {
    domain: 'École', feature: 'Clubs et activités',
    ours: 'Rejoindre, quitter, progresser de membre à titulaire puis responsable selon l’ancienneté et le mérite',
    depth: 3, priority: 2, status: 'PARTIAL',
    missingInteractions: ['compétitions inter-établissements'],
    anchor: 'src/systems/schoolActions.ts#advanceClubs',
  },
  {
    domain: 'École', feature: 'Popularité multidimensionnelle',
    ours: 'Connu, apprécié, respecté, influent, intimidant, drôle — calculés chaque année',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/school.ts#advanceClassLife',
  },
  {
    domain: 'École', feature: 'Groupes sociaux et intégration',
    ours: 'Groupes émergents, tentative d’intégration calculée sur les goûts partagés, les membres connus et la réputation',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/schoolActions.ts#joinPeerGroup',
  },
  {
    domain: 'École', feature: 'Banque d’événements scolaires',
    ours: 'Événements d’enfance et d’adolescence génériques',
    depth: 2, priority: 2, status: 'PARTIAL',
    missingInteractions: ['contrôle surprise', 'professeur injuste', 'camarade qui veut copier', 'projet de groupe', 'nouvel élève', 'conflit entre élèves'],
    anchor: 'src/data/events/teen.ts',
  },
  {
    domain: 'École', feature: 'Bulletin par matière et orientation',
    ours: 'Dix matières notées à part, points forts et faibles calculés, et une filière qui lit ses matières à elle',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/exams.ts#majorFit',
  },
  {
    domain: 'École', feature: 'Examen jouable et triche',
    ours: 'Une copie où l’on choisit ses questions contre le chronomètre, et un raccourci qui fait monter l’attention du surveillant',
    depth: 5, priority: 1, status: 'COMPLETE',
    miniGame: 'exam',
    anchor: 'src/systems/exams.ts#settleExam',
  },
  {
    domain: 'École', feature: 'Harcèlement subi et infligé',
    ours: 'Un harceleur nommé, cinq registres, cinq réponses dont aucune ne marche partout, la scène du témoin, et l’autre côté',
    depth: 5, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/bullying.ts#respond',
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
    ours: 'Discuter, temps, compliment, cadeau, argent, conseil, dispute, insulte, rupture, ponts coupés, réconciliation',
    depth: 4, priority: 3, status: 'PARTIAL',
    missingInteractions: ['prêter et emprunter avec remboursement', 'demander un service'],
    anchor: 'src/systems/relationships.ts#interact',
  },
  {
    domain: 'Relations', feature: 'Actions disponibles selon le contexte',
    ours: 'getAvailableActions(état, cible, contexte) : une seule source pour le général, l’école et le travail, et chaque action bloquée dit pourquoi',
    depth: 4, priority: 1, status: 'PARTIAL',
    missingInteractions: ['contexte prison encore vide'],
    anchor: 'src/systems/actions.ts#getAvailableActions',
  },
  {
    domain: 'Amour', feature: 'Rencontre, couple, mariage, divorce',
    ours: 'Application de rencontre, sortir ensemble, bague, demande, mariage, contrat, rupture, divorce',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/relationships.ts#propose',
  },
  {
    domain: 'Patrimoine', feature: 'Le locataire comme personne',
    ours: 'On passe le voir — gratuitement, une fois par an — et l’on apprend ce que le loyer pèse sur lui ; puis on peut étaler, effacer, baisser ou échanger contre de l’entretien, et chaque geste se paie et se rembourse différemment',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/tenant.ts#arrange',
  },
  {
    domain: 'Relations', feature: 'Donner ce qu’on possède',
    ours: 'Argent, véhicules et biens passent de son vivant — et ce qu’un cadeau vaut se calcule sur ce que la personne a déjà et sur ce qu’il coûte au donneur, avec un rendement qui sature',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/giving.ts#worthTo',
  },
  {
    domain: 'Crime', feature: 'Diriger une organisation',
    ours: 'Trois postes à tenir avec moins de gens qu’il n’en faut, une part à fixer qui achète la paix ou remplit la caisse, et des rancunes qui montent chez ceux qu’on ne place pas jusqu’à ce que l’un se lève',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/house.ts#assign',
  },
  {
    domain: 'Naissance', feature: 'Naître de quelqu’un de connu',
    ours: 'Le parent connu est l’un des parents réels ; son nom n’ouvre que son domaine, y fait comparer plus durement, se voit partout dès l’enfance, s’use chaque année, et se quitte en changeant de nom',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/legacy.ts#bestowName',
  },
  {
    domain: 'Justice', feature: 'Conduire son procès',
    ours: 'Cinq charges à solidité cachée, un crédit fini qu’on dépense en contestant, et un avocat qui achète de la vue plutôt qu’un verdict',
    depth: 5, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/hearing.ts#answer',
  },
  {
    domain: 'Travail', feature: 'Ce qu’on peut faire d’un licenciement',
    ours: 'Un dossier dont la force a été faite pendant les années de poste — ancienneté, avertissements, appuis, performance — puis deux issues qui ne se dominent pas : négocier une somme sûre, ou contester et risquer une marque',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/dismissal.ts#contest',
  },
  {
    domain: 'Crime', feature: 'Se servir là où l’on travaille',
    ours: 'Ce qu’on approche vient de la place occupée et des années qu’on y a faites ; on décide une part et non une somme, chaque année, et le soupçon ne redescend que les années tranquilles',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/office.ts#help',
  },
  {
    domain: 'Amour', feature: 'Organiser son mariage',
    ours: 'Quatre lieux et quatre repas, un budget qui se recalcule à chaque invité, et une liste bornée par les places du lieu — ceux qu’on laisse dehors le remarquent',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/wedding.ts#hold',
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
    /*
     * Reste PARTIAL, et volontairement : on choisit désormais **ce qu'on
     * accepte d'accueillir** — un tout-petit, un enfant plus grand, une
     * fratrie, un enfant qui demande davantage — et ce choix décide de
     * l'attente. Mais on ne choisit toujours pas entre des enfants nommés qu'on
     * nous proposerait. Passer la ligne à COMPLETE parce qu'un choix voisin
     * est arrivé serait se décerner une fonctionnalité qu'on n'a pas.
     */
    domain: 'Enfants', feature: 'Adoption avec choix de l’enfant',
    ours: 'Un dossier sur plusieurs années, quatre ouvertures qui décident de l’attente, une enquête qui refuse en disant pourquoi',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['plusieurs enfants proposés', 'profil de chacun'],
    anchor: 'src/systems/parenthood.ts#advanceParenthood',
  },
  {
    domain: 'Fertilité', feature: 'Contraception, traitements, dons',
    ours: 'Des protocoles annuels qui s’épuisent, coûtent selon le pays et pèsent sur le couple',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['contraception', 'don'],
    anchor: 'src/systems/parenthood.ts#runCycle',
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
    ours: 'Un cabinet de gens nommés, compétence cachée, réputation et prix comme seuls indices, médecin traitant, second avis, urgences',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/practitioners.ts#panelOf',
  },
  {
    domain: 'Esprit & corps', feature: 'Sport, bien-être, méditation',
    ours: 'Sports variés, bien-être, effets sur forme, humeur et stress',
    depth: 3, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/activities.ts#doSport',
  },
  {
    /*
     * Le cœur du système d'engagement : cinq disciplines, un budget
     * d'attention borné qui rétrécit avec la vie qu'on mène, des grades qu'il
     * faut aller chercher et qui se perdent si l'on lâche. C'est la seule
     * boucle du jeu qui récompense de n'avoir rien changé pendant longtemps.
     */
    domain: 'Esprit & corps', feature: 'Tenir une discipline dans la durée',
    ours: 'Cinq pratiques, budget d’attention borné, grades à décrocher, perte à l’abandon, effets dans quatre autres systèmes',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/practices.ts#advancePractices',
  },
  {
    /*
     * Reste PARTIAL, et volontairement : la progression de lecture existe
     * maintenant (cinq paliers, un effet réel sur tout le bulletin), mais on
     * ne choisit toujours pas de livre et l'on n'en termine aucun. Passer la
     * ligne à COMPLETE parce qu'un système voisin est arrivé serait exactement
     * la façon de se décerner une fonctionnalité qu'on n'a pas.
     */
    domain: 'Esprit & corps', feature: 'Lecture suivie livre par livre',
    ours: 'Une pratique de lecture à cinq paliers, sans titre ni ouvrage individuel',
    depth: 2, priority: 3, status: 'PARTIAL',
    missingInteractions: ['choisir un livre', 'terminer un ouvrage nommé'],
    anchor: 'src/systems/practices.ts#readingEdge',
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
    ours: 'Écran dédié : poste, employeur, salaire, ancienneté, performance, satisfaction, heures, appuis, équipe, prochain palier',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/screens/WorkScreen.tsx#WorkScreen',
  },
  {
    domain: 'Travail', feature: 'Actions professionnelles',
    ours: 'Implication, augmentation, promotion, congés, horaires, mutation, démission, retraite',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/workplace.ts#askPromotion',
  },
  {
    domain: 'Travail', feature: 'Collègues comme PNJ',
    ours: 'Équipe complète à l’embauche : collègues, rivaux, mentor, ressources humaines — chacun avec compétence et influence',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/workplace.ts#buildTeam',
  },
  {
    domain: 'Travail', feature: 'Supérieur hiérarchique',
    ours: 'Supérieur identifié, interactions dédiées, et un soutien qui pèse réellement sur la promotion comme sur le licenciement',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/workplace.ts#bossOf',
  },
  {
    domain: 'Travail', feature: 'Carrière, promotions, licenciement',
    ours: 'Échelles hiérarchiques complètes, promotion, rétrogradation, licenciement',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/careers.ts#advanceCareer',
  },

  /* ---------------- À son compte ---------------- */
  {
    domain: 'Travail', feature: 'Travailler sans employeur',
    ours: 'Vingt métiers exercés à son compte, avec tarif libre, clientèle, savoir-faire, litiges et commandes nommées',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/venture.ts#startFreelance',
  },
  {
    domain: 'Travail', feature: 'Fixer son prix',
    ours: 'Le tarif est le levier central : chaque métier a sa propre élasticité, invisible, et le prix est lu comme une promesse comparée au travail livré',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/venture.ts#feePromise',
  },
  {
    domain: 'Travail', feature: 'Posséder une entreprise',
    ours: 'Dix-huit modèles, apport et emprunt, trésorerie propre, effectif, prix, présence du patron, investissement, gérant salarié',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/venture.ts#foundBusiness',
  },
  {
    domain: 'Travail', feature: 'Faire grandir puis revendre une entreprise',
    ours: 'Valorisation au résultat et à la clientèle, repreneurs avec clauses distinctes, ou dépôt de bilan avec caution personnelle',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/venture.ts#listBusiness',
  },
  {
    domain: 'Travail', feature: 'Cumuler plusieurs sources de revenu',
    ours: 'Un budget de temps commun borne emploi, métier indépendant et entreprise ; le cumul de deux contrats salariés reste impossible',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['deuxième employeur'],
    anchor: 'src/systems/venture.ts#timeBudget',
  },

  /* ---------------- Le locatif ---------------- */
  {
    domain: 'Patrimoine', feature: 'Locataires comme PNJ',
    ours: 'Le locataire est une personne complète, choisie parmi des dossiers ; elle a un nom, des revenus, une opinion de toi, et reste dans la partie après son départ',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/tenancy.ts#acceptTenant',
  },
  {
    domain: 'Patrimoine', feature: 'Fixer son loyer',
    ours: 'Le loyer demandé sélectionne le locataire : demander cher ne fait pas fuir tout le monde, cela fait fuir ceux qui ont le choix — il reste ceux qui se serrent, et qui cessent de payer',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/tenancy.ts#setAskingRent',
  },
  {
    domain: 'Patrimoine', feature: 'Vie d’un bail',
    ours: 'Vacance, impayés, usure selon le soin du locataire, demandes de travaux à trancher, renouvellement, hausse de loyer, procédure de départ',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/tenancy.ts#advanceTenancy',
  },

  /* ---------------- La lignée ---------------- */
  {
    domain: 'Famille', feature: 'Continuer par un descendant',
    ours: 'La mort ne termine plus la partie : on reprend par un enfant ou un petit-enfant, et l’année, l’économie, la famille et la timeline continuent',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/lineage.ts#continueAs',
  },
  {
    domain: 'Famille', feature: 'Parenté recalculée à la reprise',
    ours: 'Le lien de chaque PNJ est recalculé en remontant la filiation : le conjoint du défunt devient un parent, les autres enfants des frères et sœurs, et les liens du bureau s’effacent',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/lineage.ts#relationTo',
  },
  {
    domain: 'Famille', feature: 'Transmission entre générations',
    ours: 'Ce qu’on laisse décide du milieu de départ du descendant — capitaux économique et culturel, niveau d’études, préréglage d’enfance — et pas seulement de son solde bancaire',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/lineage.ts#tierFromWealth',
  },
  {
    domain: 'Famille', feature: 'Historique de lignée',
    ours: 'Une ligne par génération — nom, dates, métier, patrimoine, notoriété — et chaque ancêtre reste un PNJ retrouvable dans la famille',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/lineage.ts#heirsOf',
  },

  /* ---------------- Notoriété ---------------- */
  {
    domain: 'Célébrité', feature: 'Notoriété distincte de la réputation',
    ours: 'Trois axes séparés : combien de gens te connaissent, ce qu’ils ont à te reprocher, ce qu’ils retiennent de bon — la réputation restant ce qu’en pensent ceux qui te croisent',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#advanceFame',
  },
  {
    domain: 'Célébrité', feature: 'Entretenir un nom',
    ours: 'La notoriété retombe d’autant plus vite qu’elle est haute ; l’écran nomme ligne par ligne ce qui l’alimente et ce que l’oubli emporte',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#fameSources',
  },
  {
    domain: 'Célébrité', feature: 'Apparitions publiques',
    ours: 'Dix apparitions échelonnées par seuil de notoriété — interview, séance photo, publicité, gala, plateau, cause, conférence, mémoires, télé-réalité, tournée',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#doGig',
  },
  {
    domain: 'Célébrité', feature: 'Interview jouable',
    ours: 'Trois questions tirées parmi celles qui te concernent, trois réponses chacune, et aucune ne domine les autres sur les trois axes',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#answerInterview',
  },
  {
    domain: 'Célébrité', feature: 'Scandales et gestion de crise',
    ours: 'Huit affaires, quatre réponses : s’excuser, se taire, démentir, contre-attaquer — chacune la meilleure dans un cas et la pire dans un autre',
    depth: 4, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#respondToScandal',
  },
  {
    domain: 'Célébrité', feature: 'Ce que la célébrité coûte',
    ours: 'Un visage connu se fait reconnaître : le risque d’arrestation, le stress et l’usure de la vie privée suivent la courbe',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/fame.ts#recognitionFactor',
  },

  /* ---------------- Carrières spéciales ---------------- */
  {
    domain: 'Carrières spéciales', feature: 'Acteur : auditions, rôles, agent, récompenses',
    ours: 'Neuf rôles proposés selon le niveau, un agent, trois prix, une scène jouée',
    depth: 4, priority: 2, status: 'PARTIAL',
    missingInteractions: ['l’essai lui-même ne se joue pas', 'répétitions'],
    miniGame: 'performance',
    anchor: 'src/systems/stage.ts#acceptOffer',
  },
  {
    domain: 'Carrières spéciales', feature: 'Musicien : singles, albums, tournées',
    ours: 'Neuf engagements du bar au stade, un groupe qu’on auditionne et qui se défait, et une scène jouée',
    depth: 5, priority: 2, status: 'PARTIAL',
    missingInteractions: ['label comme entité', 'ventes et classements'],
    miniGame: 'performance',
    anchor: 'src/systems/stage.ts#settleJob',
  },
  {
    domain: 'Carrières spéciales', feature: 'Athlète : équipe, saisons, transferts, blessures',
    ours: 'Une filière scolaire avec sélection et recruteurs, puis sept engagements du club local à la sélection, une équipe, un entraîneur et des contrats pluriannuels',
    depth: 5, priority: 2, status: 'COMPLETE',
    miniGame: 'performance',
    anchor: 'src/systems/stage.ts#advanceStage',
  },
  {
    domain: 'Carrières spéciales', feature: 'Entreprise : produit, prix, employés, concurrence',
    ours: null,
    depth: 0, priority: 3, status: 'MISSING',
    missingInteractions: ['créer une entreprise', 'fixer les prix', 'embaucher', 'marketing', 'revendre'],
  },
  {
    domain: 'Carrières spéciales', feature: 'Politique : campagne, sondages, mandat',
    ours: 'Six mandats du militantisme à la candidature nationale, sans déclin par l’âge',
    depth: 3, priority: 3, status: 'PARTIAL',
    missingInteractions: ['budget de campagne', 'sondages', 'adversaire nommé', 'décisions de mandat'],
    miniGame: 'performance',
    anchor: 'src/data/stage.ts#JOB_TEMPLATES',
  },
  {
    domain: 'Carrières spéciales', feature: 'Mannequin : agence, castings, défilés',
    ours: 'Six contrats du catalogue à l’égérie, une agence, une carrière volontairement courte',
    depth: 4, priority: 3, status: 'PARTIAL',
    missingInteractions: ['book'],
    miniGame: 'performance',
    anchor: 'src/data/stage.ts#DISCIPLINES',
  },
  {
    domain: 'Carrières spéciales', feature: 'Astronaute, armée : boucle dédiée',
    ours: 'Deux échelles de salaires',
    depth: 1, priority: 3, status: 'PARTIAL',
    missingInteractions: ['missions', 'grade et affectation'],
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
    ours: 'Quatre maisons fictives aux tempéraments distincts, cinq sujets, un goût par public tiré une fois pour la partie et jamais annoncé, une lassitude qui oblige à tourner, et la suspension de compte',
    depth: 4, priority: 3, status: 'PARTIAL',
    missingInteractions: ['créer ou supprimer un compte', 'commenter chez les autres', 'promouvoir une publication'],
    anchor: 'src/systems/social.ts#publish',
  },

  /* ---------------- Argent et possessions ---------------- */
  {
    domain: 'Argent', feature: 'Budget annuel, impôts, emprunts, faillite',
    ours: 'Bilan annuel détaillé, fiscalité par pays, prêts, faillite',
    depth: 5, priority: 5, status: 'COMPLETE',
    anchor: 'src/systems/finance.ts#runAnnualFinance',
  },
  {
    domain: 'Finance', feature: 'Investir : supports variés, portefeuille suivi',
    ours: 'Dix supports fictifs aux cours persistants, portefeuille avec prix de revient, frais, blocages, impôt sur la plus-value, et une culture financière qui décide de ce qu’on peut acheter',
    depth: 5, priority: 1, status: 'COMPLETE',
    anchor: 'src/systems/investing.ts#invest',
  },
  {
    domain: 'Finance', feature: 'Marché vivant et diversification',
    ours: 'Conjoncture partagée, décrochages, valeur refuge à corrélation négative — répartir réduit réellement le pire cas',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/investing.ts#advanceMarkets',
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
    ours: 'Mini-jeu jouable : cible mobile, jauge de méfiance, arbitrage vitesse contre discrétion, cinq issues distinctes — ou résolution automatique',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/pickpocketing.ts#resolvePickpocket',
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
    ours: 'Mini-jeu jouable : plan tiré au sort, occupants qui patrouillent, jauges de bruit et de charge, arbitrage entre remplir le sac et ressortir — cinq issues, dont deux qui débouchent sur une fuite',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/burglary.ts#resolveBurglary',
  },
  {
    domain: 'Crime', feature: 'Fuite après un coup manqué',
    ours: 'Mini-jeu jouable : rejoindre une sortie, souffle limité, poursuivants qui perdent la trace dans les angles — réutilisable par tout ce qui déclenche une course',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/burglary.ts#resolveEscape',
  },
  {
    domain: 'Crime', feature: 'Milieu organisé : hiérarchie, missions, territoire',
    ours: 'Maisons avec style, six rangs, respect, territoire disputé avec une maison rivale, six types de missions dont trois passent par un mini-jeu, refus et échec chiffrés, et une porte de sortie qui se paie',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/underworld.ts#settleMission',
  },
  {
    domain: 'Crime', feature: 'Attention policière distincte de la réputation',
    ours: 'Chaleur 0-100 qui monte avec les délits, retombe avec le temps, pèse sur les arrestations et ouvre des enquêtes — indépendante de la notoriété dans le milieu',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/underworld.ts#addHeat',
  },
  {
    domain: 'Crime', feature: 'Carnet de contacts du milieu',
    ours: 'Receleur, indicateur, chauffeur, logeur, avocat — chacun trouvé au hasard, de qualité inconnue, rendant un service mesurable, et susceptible de parler',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/underworld.ts#askService',
  },
  {
    domain: 'Justice', feature: 'Enquête avant l’arrestation',
    ours: 'Dossier qui avance année après année, qu’on peut apprendre, ralentir ou faire fermer',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/underworld.ts#openInvestigation',
  },
  {
    domain: 'Justice', feature: 'Arrestation, avocat, procès, appel, casier',
    ours: 'Choix d’avocat, procès plaidé, appel, effacement du casier',
    depth: 4, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/justice.ts#goToTrial',
  },
  {
    domain: 'Prison', feature: 'Vie carcérale',
    ours: 'Établissement, régime, peine, dossier et respect en opposition, activités, codétenus avec leurs propres actions, protection, conditionnelle',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/prison.ts#inmateAction',
  },
  {
    domain: 'Prison', feature: 'Évasion jouable',
    ours: 'Préparation sur plusieurs années, puis mini-jeu jouable : cour, rondes, abris, projecteur, jauge de vigilance — et une course pour finir',
    depth: 5, priority: 2, status: 'COMPLETE',
    anchor: 'src/systems/escape.ts#resolveEscapeAttempt',
  },
  {
    domain: 'Prison', feature: 'Vie de fugitif après une évasion',
    ours: 'Cavale durable : aucun emploi déclarable, reprise possible chaque année, proches qui s’éloignent, reddition et prescription',
    depth: 4, priority: 3, status: 'COMPLETE',
    anchor: 'src/systems/escape.ts#advanceFugitive',
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
    ours: 'Refuge, éleveur ou animalerie ; des moments comptés à répartir entre sortir, soigner et dresser ; un lien qui achète des années ; confier ou rendre',
    depth: 5, priority: 4, status: 'COMPLETE',
    anchor: 'src/systems/beast.ts#spendMoment',
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
    ours: 'MiniGameEngine : jeux sans interface, registre commun, difficulté issue du contexte, mélange joueur/personnage, résolution automatique',
    depth: 4, priority: 2, status: 'COMPLETE',
    anchor: 'src/engine/minigame.ts#registerMiniGame',
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
    ours: 'Maisons fictives, ordre de succession, devoirs, abdication',
    depth: 4, priority: 5, status: 'PARTIAL',
    missingInteractions: ['intrigues de cour', 'diplomatie entre maisons'],
    anchor: 'src/systems/royalty.ts#succession',
  },
  {
    domain: 'Extensions', feature: 'Défis, succès et coffre',
    ours: 'Défis à serments, chasses à indices, cabinet inter-parties',
    depth: 4, priority: 4, status: 'PARTIAL',
    missingInteractions: ['défis datés ou saisonniers'],
    anchor: 'src/systems/challenges.ts#advanceChallenges',
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
