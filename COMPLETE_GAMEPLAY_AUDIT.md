# Audit complet du gameplay

> Document généré par `npm run audit` depuis `src/data/gameplayAudit.ts`.
> Ne pas le modifier à la main.

La matrice de parité demande « cette capacité existe-t-elle ? ». Ce
document pose la question au niveau en dessous, celui qui compte :
**qu’est-ce que le joueur peut réellement faire ?**

On ne classe donc pas « Crime : complet ». On classe séparément le choix
de la cible, le mini-jeu, la jauge de méfiance, le butin, la fuite,
l’arrestation, le procès et le casier — chacun avec son niveau réel.

| Niveau | Ce que ça veut dire | Nombre |
| --- | --- | --- |
| **MISSING** | N’existe pas. | 24 |
| **PLACEHOLDER** | Un bouton, presque aucune mécanique derrière. | 9 |
| **BASIC** | Fonctionne, mais très superficiel : un tirage, un effet. | 12 |
| **PARTIAL** | Système intéressant, incomplet. | 23 |
| **DEEP** | Suffisamment développé : décisions, conséquences croisées. | 84 |
| **INTERACTIVE** | Le joueur agit lui-même, sa performance compte. | 13 |

**165 feuilles auditées · profondeur globale 65 %**

La profondeur globale pondère chaque feuille par son niveau : une feuille
absente vaut 0, un bouton vide 0,1, un système abouti 0,9, un mini-jeu 1.
Ce n’est pas un pourcentage d’avancement — c’est une moyenne de
profondeur, et elle descend quand on ajoute une feuille manquante à
l’audit. C’est voulu : mieux vaut un score honnête qui baisse qu’un score
flatteur obtenu en fermant les yeux.

## Fonctionnalités orphelines

Aucune. Chaque fonctionnalité existante a au moins une conséquence dans
un autre système — on ne peut en retirer aucune sans que quelque chose
change ailleurs.

## Ordre de travail

Priorité d’abord, profondeur ensuite : à priorité égale, ce qui n’existe
pas du tout passe avant ce qui est seulement superficiel.

| # | Domaine | Feuille | Niveau | Ce qui manque |
| --- | --- | --- | --- | --- |
| 1 | Personnage | Compétences > Arbre de compétences explicite et progressif | MISSING | les compétences sont des statistiques diffuses ; rien à faire progresser délibérément |
| 2 | École | Examens > Épreuve jouable | MISSING | les notes se calculent seules : passer un examen n’est jamais un moment |
| 3 | Travail | Entretien > Entretien jouable | MISSING | l’embauche est un tirage : l’entretien n’existe pas comme moment |
| 4 | Travail | Cumul > Deuxième emploi salarié | MISSING | un seul contrat de travail à la fois : le cumul de deux employeurs n’existe pas |
| 5 | Relations | Ennemis > Rivalité et inimitié durables | MISSING | une relation peut baisser, jamais devenir une inimitié avec ses propres actions |
| 6 | Relations | Rendez-vous > Sortir avec quelqu’un : lieu, budget, déroulé | MISSING | aucun rendez-vous : la séduction est une suite de clics sans scène |
| 7 | Finance | Placements > Entreprises cotées avec un état propre | MISSING | les supports sont des indices abstraits : aucune société n’a de secteur, de dette ni de résultats |
| 8 | Patrimoine | Collections > Collectionner et voir sa collection | MISSING | aucune notion de collection : les objets sont une liste plate |
| 9 | Crime | Marché noir > Vendeurs, objets fictifs, arnaques, négociation | MISSING | le receleur rachète, mais rien ne s’achète nulle part |
| 10 | Monde | Événements > Conséquences retardées | MISSING | un choix produit son effet immédiatement et n’est jamais rappelé |
| 11 | Carrières spéciales | Acteur > Auditions, agent, rôles, récompenses | PLACEHOLDER | une échelle de salaires nommée « Acteur » : ni audition, ni rôle, ni tournage |
| 12 | Carrières spéciales | Musicien > Groupe, label, album, tournée, royalties | PLACEHOLDER | une échelle de salaires nommée « Musicien » : rien à jouer, rien à sortir |
| 13 | Carrières spéciales | Sport > Club, saison, statistiques, transfert | PLACEHOLDER | une échelle de salaires : ni club, ni saison, ni blessure, ni transfert |
| 14 | Patrimoine | Permis > Examen du permis | PLACEHOLDER | un bouton et un tirage : aucune épreuve |
| 15 | Patrimoine | Enchères > Salle des ventes jouable | PLACEHOLDER | un canal de revente au meilleur taux : personne n’enchérit en face |
| 16 | Personnage | Dépendances > Addictions simulées et sevrage | BASIC | une statistique `addiction` qui monte ; ni cure, ni rechute, ni entourage qui réagit |
| 17 | École | Événements > Banque d’événements scolaires | BASIC | dix événements de catégorie « école » pour treize ans de scolarité |
| 18 | Patrimoine | Objets de valeur > Acheter, revendre | BASIC | quinze objets fixes : ni rareté, ni authenticité, ni provenance |
| 19 | Relations | Mémoire > Les PNJ se souviennent de ce qu’on leur a fait | PARTIAL | relation et opinion évoluent, mais aucun souvenir daté et nommé n’est conservé |
| 20 | Relations | PNJ autonomes > Les PNJ vivent sans le joueur | PARTIAL | ils vieillissent, meurent et prennent quelques initiatives ; ils ne travaillent, ne déménagent ni ne s’enrichissent |
| 21 | Finance | Placements > Courbes historiques consultables | PARTIAL | vingt cours sont conservés mais rien ne les dessine : le joueur ne voit qu’un pourcentage annuel |
| 22 | Enfance | Vacances > Partir en vacances avec la famille | MISSING | les voyages n’existent que pour un adulte qui paie |
| 23 | Finance | Crédit > Score de solvabilité | MISSING | la capacité d’emprunt dépend du revenu seul : aucun historique de remboursement ne compte |
| 24 | Finance | Placements > Actualités financières qui déplacent les cours | MISSING | les cours ne bougent que par la conjoncture et le hasard |
| 25 | Crime | Vol à la tire > La victime se souvient | MISSING | la cible est anonyme et disparaît : elle ne devient jamais un PNJ |
| 26 | Crime | Organisation > Diriger : recruter, promouvoir, répartir | MISSING | on monte jusqu’au sommet sans que le gameplay change |
| 27 | Crime | Organisation > Conflits internes, trahisons | MISSING | la maison n’a pas de membres identifiés : personne à trahir |
| 28 | Justice | Poursuivre > Être celui qui attaque en justice | MISSING | le joueur ne peut jamais porter plainte ni réclamer réparation |
| 29 | Monde | Actualités > Fil d’actualité du monde | MISSING | le monde change en silence : le joueur ne l’apprend jamais |
| 30 | Personnage | Talents > Dons découverts et cultivés | PLACEHOLDER | un événement « don caché » sans suite : aucun talent n’est stocké ni cultivable |

## Personnage

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Identité | Nom, sexe, pays, ville, naissance | **DEEP** | — | origine, relations, finance |
| Identité | Changer de nom | **PARTIAL** | quitter un nom hérité coûte le lien du parent et la porte de son domaine ; pour qui n’a hérité d’aucun nom, cela ne fait toujours rien | identité |
| Personnalité | 12 tempéraments, 27 axes, 17 valeurs, styles | **DEEP** | — | école, travail, relations, crime, finance, santé |
| Personnalité | Dérive annuelle du caractère | **DEEP** | — | exposition, causalité |
| Personnalité | Aucun paramètre décoratif (audit mécanique) | **DEEP** | — | tests |
| Statistiques | Bonheur, santé, esprit, allure, forme, stress… | **DEEP** | — | tout |
| Compétences | Arbre de compétences explicite et progressif | **MISSING** | les compétences sont des statistiques diffuses ; rien à faire progresser délibérément | — |
| Talents | Dons découverts et cultivés | **PLACEHOLDER** | un événement « don caché » sans suite : aucun talent n’est stocké ni cultivable | événements |
| Apparence | Apparence générée, vieillissante | **DEEP** | — | relations, travail, notoriété, santé |
| Apparence | Un registre, lu autrement selon qui regarde | **DEEP** | — | relations, travail, notoriété |
| Souvenirs | Souvenirs marquants conservés | **PARTIAL** | le joueur les lit, les PNJ ne s’en servent pas dans leurs réactions | personnalité |
| Habitudes | Habitudes qui coûtent du temps et de l’argent | **PARTIAL** | aucune action pour prendre ou perdre une habitude délibérément | finance, santé |
| Dépendances | Addictions simulées et sevrage | **BASIC** | une statistique `addiction` qui monte ; ni cure, ni rechute, ni entourage qui réagit | santé, finance |
| Ambitions | Ambitions qui orientent la vie | **PARTIAL** | affichées et alimentées, mais le joueur ne peut pas s’en fixer une | personnalité |
| Objectifs | Succès, défis, titres de fin de vie | **DEEP** | — | héritage, tout |

## Enfance

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Foyer | Parents, fratrie, famille élargie générés | **DEEP** | — | relations, finance, école |
| Demander | Demander un objet, une permission, de l’argent | **DEEP** | — | relations, finance, exposition, école |
| Demander | Conditions tenues ou trahies l’année suivante | **DEEP** | — | relations, école |
| Argent de poche | Argent de poche récurrent | **BASIC** | un versement automatique ; ni négociation, ni suppression en cas de bêtise | finance |
| Discipline | Punitions et réactions parentales | **PARTIAL** | les parents réagissent aux incidents scolaires seulement, pas à la vie à la maison | école, relations |
| Lien familial | Le lien s’érode quand on ne fait rien | **DEEP** | — | relations, foyer |
| Activités familiales | Faire quelque chose avec ses parents | **DEEP** | — | relations, exposition, personnalité, finance |
| Activités familiales | Ce que l’accompagnant met dedans | **DEEP** | — | foyer, relations |
| Amis d’enfance | Amis hors école | **PARTIAL** | on se fait des amis du quartier, mais rien à faire avec eux hors des interactions générales | relations, environnement |
| Premières passions | Découvrir un intérêt et le cultiver | **DEEP** | — | personnalité, université, travail |
| Événements | Banque d’événements 0-12 ans | **PARTIAL** | quatorze événements éligibles avant 5 ans et quarante-trois avant 10, contre plus de quatre-vingts à l’âge adulte : c’est mieux, ce n’est pas égal | événements, exposition |
| Vacances | Partir en vacances avec la famille | **MISSING** | les voyages n’existent que pour un adulte qui paie | — |

## École

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Établissement | Établissement, règlement, niveau | **DEEP** | — | origine, notes, relations |
| Notes | Moyenne, effort, progression par cycle | **DEEP** | — | université, travail, relations |
| Comportement | Dossier disciplinaire à escalade | **DEEP** | — | relations, notes, parents |
| Camarades | Classe complète, chacun un PNJ | **DEEP** | — | relations |
| Camarades | Aider, taquiner, provoquer, défendre, signaler | **DEEP** | — | relations, popularité, comportement |
| Professeurs | Personnel avec compétence, sévérité, intégrité | **DEEP** | — | notes, relations |
| Professeurs | Question, soutien, contestation, irrespect | **DEEP** | — | notes, comportement, relations |
| Popularité | Six dimensions calculées chaque année | **DEEP** | — | relations, personnalité |
| Groupes | Groupes sociaux, intégration, départ | **DEEP** | — | popularité, relations |
| Clubs | Rejoindre, progresser, quitter | **PARTIAL** | aucune compétition inter-établissements, aucun résultat visible | popularité, personnalité |
| Examens | Épreuve jouable | **MISSING** | les notes se calculent seules : passer un examen n’est jamais un moment | — |
| Sanctions | Retenue, convocation, exclusion, renvoi | **DEEP** | — | parents, notes |
| Changer d’école | Changement volontaire ou subi | **PARTIAL** | l’école change avec le quartier ; le joueur ne peut pas la choisir | environnement |
| Événements | Banque d’événements scolaires | **BASIC** | dix événements de catégorie « école » pour treize ans de scolarité | événements |

## Université

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Admission | Candidature, filière, admission calculée | **DEEP** | — | notes, finance, travail |
| Coût | Frais annuels, bourse, prêt étudiant | **DEEP** | — | finance, dettes |
| Cursus | Abandon, études supérieures, formation professionnelle | **PARTIAL** | aucun changement de filière en cours de route | travail |
| Vie étudiante | Vie sociale distincte du lycée | **BASIC** | la vie de classe du secondaire est réutilisée telle quelle : ni colocation, ni association, ni soirée étudiante | relations |

## Travail

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Recherche | Marché d’offres persistant, candidature | **DEEP** | — | finance, université, environnement |
| Entretien | Entretien jouable | **MISSING** | l’embauche est un tirage : l’entretien n’existe pas comme moment | — |
| Poste | Salaire, heures, performance, implication | **DEEP** | — | finance, santé, relations |
| Équipe | Collègues, supérieur, rôles, influence | **DEEP** | — | relations, promotion |
| Équipe | Couvrir, se plaindre, s’attribuer, signaler | **DEEP** | — | relations, performance |
| Promotion | Promotion selon résultats et appuis | **DEEP** | — | finance, relations |
| Sortie | Démission, licenciement, retraite, pension | **DEEP** | — | finance |
| Cumul | Deuxième emploi salarié | **MISSING** | un seul contrat de travail à la fois : le cumul de deux employeurs n’existe pas | — |
| Indépendant | Vingt métiers à son compte, tarif, clientèle, savoir-faire | **DEEP** | — | finance, personnalité, notoriété, environnement |
| Indépendant | Fixer son tarif : un optimum par métier, à deviner | **INTERACTIVE** | — | finance |
| Indépendant | Commandes nommées, à prendre ou à laisser | **DEEP** | — | finance, réputation |
| Entreprise | Ouvrir : apport, emprunt, dix-huit modèles | **DEEP** | — | finance, université |
| Entreprise | Arbitrer capacité et demande : effectif, prix, présence, investissement | **INTERACTIVE** | — | finance, relations, environnement |
| Entreprise | Gérant salarié, qui tient la maison ou se sert | **DEEP** | — | relations |
| Entreprise | Vendre : repreneurs, clauses, ou dépôt de bilan | **DEEP** | — | finance, réputation |
| Cumul | Budget de temps partagé entre emploi, métier et entreprise | **PARTIAL** | le temps est bien fini, mais on ne peut toujours pas cumuler deux emplois salariés | santé |
| Événements | Banque d’événements professionnels | **BASIC** | huit événements de catégorie « travail » pour quarante ans de carrière | événements |

## Carrières spéciales

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Acteur | Auditions, agent, rôles, récompenses | **PLACEHOLDER** | une échelle de salaires nommée « Acteur » : ni audition, ni rôle, ni tournage | finance |
| Musicien | Groupe, label, album, tournée, royalties | **PLACEHOLDER** | une échelle de salaires nommée « Musicien » : rien à jouer, rien à sortir | finance |
| Sport | Club, saison, statistiques, transfert | **PLACEHOLDER** | une échelle de salaires : ni club, ni saison, ni blessure, ni transfert | finance |
| Politique | Élections, campagne, mandat, sondages | **PLACEHOLDER** | une échelle de salaires : aucune élection ne se tient | finance |
| Astronaute | Formation, missions, exploration | **PLACEHOLDER** | une échelle de salaires : aucune mission | finance |
| Mannequin | Agence, casting, défilés, campagnes | **MISSING** | le métier n’existe pas | — |
| Agent secret | Agence, missions, gadgets fictifs | **MISSING** | le métier n’existe pas | — |

## Célébrité

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Notoriété publique | Trois axes séparés : connu, reproché, estimé | **DEEP** | — | travail, crime, personnalité, finance |
| Notoriété publique | Ce qui rend connu, ligne par ligne, et ce que l’oubli emporte | **DEEP** | — | travail, crime |
| Notoriété publique | Ce qu’un visage connu coûte : reconnaissance, nerfs, vie privée | **DEEP** | — | crime, santé |
| Affaires | Scandales, et quatre réponses dont aucune n’est la bonne | **DEEP** | — | réputation, personnalité |
| Réseaux sociaux | Où publier, quoi publier, combien de fois | **DEEP** | — | finance, réputation |
| Apparitions | Dix apparitions échelonnées, payées au nom | **DEEP** | — | finance, santé |
| Apparitions | L’interview comme scène : trois questions, aucune bonne réponse | **INTERACTIVE** | — | réputation |

## Relations

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Socle | Actions contextuelles décidées à un seul endroit | **DEEP** | — | école, travail, prison, relations |
| Lien | Discuter, temps, compliment, cadeau, conseil | **DEEP** | — | personnalité, finance |
| Conflit | Dispute, insulte, couper les ponts, renouer | **DEEP** | — | personnalité |
| Amour | Séduire, sortir ensemble, demande, mariage | **DEEP** | — | finance, famille |
| Noce | Lieu, tables, liste d’invités | **DEEP** | — | finance, relations, famille |
| Rupture | Rupture, divorce, partage des biens | **PARTIAL** | ni avocat, ni garde des enfants, ni pension, ni relation post-divorce | finance, famille |
| Ex | Les ex continuent d’exister | **PLACEHOLDER** | la relation est rétrogradée puis oubliée : aucune action propre à un ex | relations |
| Ennemis | Rivalité et inimitié durables | **MISSING** | une relation peut baisser, jamais devenir une inimitié avec ses propres actions | — |
| Cadeaux | Catalogue et goûts du destinataire | **BASIC** | un montant générique : ni catalogue, ni goûts, ni occasion | finance |
| Argent | Donner, demander, prêter, rembourser | **PARTIAL** | donner et demander seulement : aucune dette interpersonnelle suivie | finance, relations |
| Rencontres | Lire six profils, en choisir deux | **DEEP** | — | relations, finance |
| Rendez-vous | Sortir avec quelqu’un : lieu, budget, déroulé | **MISSING** | aucun rendez-vous : la séduction est une suite de clics sans scène | — |
| Mémoire | Les PNJ se souviennent de ce qu’on leur a fait | **PARTIAL** | relation et opinion évoluent, mais aucun souvenir daté et nommé n’est conservé | relations |
| PNJ autonomes | Les PNJ vivent sans le joueur | **PARTIAL** | ils vieillissent, meurent et prennent quelques initiatives ; ils ne travaillent, ne déménagent ni ne s’enrichissent | relations |

## Crime

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Maison | Placer ses gens, et vivre avec les rancunes | **DEEP** | — | crime, relations, finance |
| Bureau | Se servir là où l’on travaille | **DEEP** | — | carrière, justice, finance |
| Vol à la tire | Choix de la cible | **DEEP** | — | environnement |
| Vol à la tire | Mini-jeu jouable | **INTERACTIVE** | — | crime, chaleur |
| Vol à la tire | Jauge de méfiance, réaction de la cible | **INTERACTIVE** | — | crime |
| Vol à la tire | La victime se souvient | **MISSING** | la cible est anonyme et disparaît : elle ne devient jamais un PNJ | — |
| Cambriolage | Plan procédural, occupants, bruit, charge | **INTERACTIVE** | — | crime, chaleur, fuite |
| Fuite | Course jouable, réutilisable | **INTERACTIVE** | — | crime, prison, justice |
| Vol de véhicule | Puzzle fictif | **INTERACTIVE** | — | crime, justice |
| Vol à l’étalage | Scène de magasin | **INTERACTIVE** | — | crime, justice |
| Braquage | Minutage, alerte, décision de partir | **INTERACTIVE** | — | crime, justice, finance |
| Chaleur | Attention policière distincte de la notoriété | **DEEP** | — | justice, crime |
| Carnet | Receleur, indicateur, chauffeur, logeur, avocat | **DEEP** | — | crime, justice, relations |
| Organisation | Rangs, respect, territoire, missions | **DEEP** | — | crime, finance, chaleur |
| Organisation | Diriger : recruter, promouvoir, répartir | **MISSING** | on monte jusqu’au sommet sans que le gameplay change | — |
| Organisation | Conflits internes, trahisons | **MISSING** | la maison n’a pas de membres identifiés : personne à trahir | — |
| Compétences | Progression criminelle explicite | **BASIC** | une seule statistique `criminality` : ni discrétion, ni sang-froid, ni observation | crime |
| Marché noir | Vendeurs, objets fictifs, arnaques, négociation | **MISSING** | le receleur rachète, mais rien ne s’achète nulle part | — |

## Vie

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Nom | Naître de quelqu’un, et en faire quelque chose | **DEEP** | — | notoriété, carrière, relations |

## Justice

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Audience | Conduire sa défense, charge par charge | **INTERACTIVE** | — | justice, crime, finance |
| Arrestation | Interpellation, saisie, dossier | **DEEP** | — | crime, prison |
| Enquête | Dossier qui avance sur plusieurs années | **DEEP** | — | crime, justice |
| Procès | Avocat, preuves, verdict, appel | **PARTIAL** | le choix de l’avocat décide de tout : l’audience elle-même ne se joue pas | prison, finance |
| Poursuivre | Être celui qui attaque en justice | **MISSING** | le joueur ne peut jamais porter plainte ni réclamer réparation | — |

## Carrière

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Dossier | Négocier ou contester son départ | **DEEP** | — | carrière, finance, relations |

## Famille

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Enfants | Concevoir, naître, grandir | **PARTIAL** | les enfants existent et vieillissent, mais les actions ne changent pas avec leur âge | relations, finance |
| Adoption | Procédure d’adoption | **DEEP** | — | relations, finance |
| Fertilité | Parcours médicaux | **PARTIAL** | des protocoles annuels qui s’épuisent et pèsent sur le couple ; ni contraception, ni don | santé, finance |
| Animaux | Adopter, nourrir, promener, soigner | **PARTIAL** | ni refuge, ni dressage, ni comportement propre à l’animal ; le vétérinaire est un bouton | finance, bonheur |
| Héritage | Testament, succession, répartition | **DEEP** | — | finance, relations, propriétés |
| Continuer | Reprendre un descendant : le monde, la famille et le nom continuent | **DEEP** | — | finance, relations, environnement, héritage |
| Continuer | La parenté recalculée depuis le nouveau point de vue | **DEEP** | — | relations |
| Continuer | Le milieu de départ hérité de la fortune transmise | **DEEP** | — | environnement, finance, université |
| Continuer | La lignée : une ligne par génération, un ancêtre retrouvable | **DEEP** | — | relations |

## Santé

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Maladies | Cinquante maladies, chroniques, silencieuses | **DEEP** | — | finance, travail, décès |
| Consultation | Consulter, diagnostiquer, traiter | **DEEP** | — | finance |
| Chirurgie esthétique | Procédures, praticien, risque, résultat | **BASIC** | un tirage : ni praticien identifié, ni litige possible en cas de ratage | apparence, finance |
| Corps et esprit | Sport, bien-être, méditation | **PARTIAL** | des activités à effet immédiat ; ni progression, ni discipline suivie, ni régime | santé, personnalité |
| Lecture | Lire un livre, progresser dedans | **MISSING** | aucune bibliothèque, aucun livre | — |

## Finance

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Budget | Bilan annuel, impôts, coût de la vie | **DEEP** | — | travail, propriétés, famille |
| Dettes | Prêts, hypothèques, faillite | **DEEP** | — | propriétés, finance |
| Crédit | Score de solvabilité | **MISSING** | la capacité d’emprunt dépend du revenu seul : aucun historique de remboursement ne compte | — |
| Placements | Dix supports, cours persistants, portefeuille | **DEEP** | — | finance, personnalité |
| Placements | Dix sociétés nommées, et leur rapport annuel | **DEEP** | — | finance, éducation |
| Placements | Courbes historiques consultables | **PARTIAL** | vingt cours sont conservés mais rien ne les dessine : le joueur ne voit qu’un pourcentage annuel | finance |
| Placements | Entreprises cotées avec un état propre | **MISSING** | les supports sont des indices abstraits : aucune société n’a de secteur, de dette ni de résultats | — |
| Placements | Actualités financières qui déplacent les cours | **MISSING** | les cours ne bougent que par la conjoncture et le hasard | — |
| Placements | Conseiller financier | **MISSING** | personne à qui demander conseil, personne à qui déléguer | — |
| Jeux d’argent | Loterie et casino | **BASIC** | un tirage par jeu : aucun jeu de casino n’est jouable, la loterie n’a pas d’interface | finance |

## Patrimoine

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Immobilier | Acheter, hypothéquer, rénover, vendre | **DEEP** | — | finance, environnement |
| Locatif | Fixer son loyer : le prix sélectionne le locataire | **INTERACTIVE** | — | finance, relations, environnement |
| Locatif | Vacance, renouvellement de bail, hausse de loyer | **DEEP** | — | finance |
| Locataires | Le locataire est un PNJ, choisi parmi des dossiers | **DEEP** | — | relations, finance |
| Locataires | Impayés, usure, demandes de travaux, expulsion | **DEEP** | — | finance, relations |
| Locataires | Répondre à une réparation : faire, bâcler, ignorer | **DEEP** | — | finance, relations |
| Véhicules | Acheter, entretenir, revendre | **DEEP** | — | finance |
| Permis | Examen du permis | **PLACEHOLDER** | un bouton et un tirage : aucune épreuve | véhicules |
| Objets de valeur | Acheter, revendre | **BASIC** | quinze objets fixes : ni rareté, ni authenticité, ni provenance | finance |
| Collections | Collectionner et voir sa collection | **MISSING** | aucune notion de collection : les objets sont une liste plate | — |
| Enchères | Salle des ventes jouable | **PLACEHOLDER** | un canal de revente au meilleur taux : personne n’enchérit en face | finance |
| Luxe | Bateaux, avions, œuvres d’art | **MISSING** | le patrimoine s’arrête aux voitures et aux bijoux | — |

## Prison

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Détention | Régime, dossier, respect, codétenus | **DEEP** | — | relations, santé, évasion |
| Conditionnelle | Commission, refus successifs | **DEEP** | — | justice |
| Évasion | Préparation puis traversée jouable | **INTERACTIVE** | — | prison, fuite, cavale |
| Cavale | Vie de fugitif, reddition, prescription | **DEEP** | — | travail, relations, justice |
| Émeute | Rallier des détenus, jauge de tension | **BASIC** | un bouton et un tirage : aucun ralliement, aucune tension à gérer | prison |

## Activités

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Loisirs | Sorties, voyages, animaux, réseaux | **PARTIAL** | des boutons à effet immédiat : ni lieu, ni accompagnant, ni scène | bonheur, relations, finance |
| Plein air | Randonnée, pêche, camping, navigation | **MISSING** | aucune activité de plein air | — |
| Voyages | Destination, budget, accompagnants | **BASIC** | une destination et un prix : personne ne vient, rien n’arrive sur place | bonheur, finance |

## Monde

| Système | Feuille | Niveau | Manque | Touche |
| --- | --- | --- | --- | --- |
| Environnement vivant | Quartier, économie, foyer qui dérivent | **DEEP** | — | école, travail, finance, propriétés |
| Immigration | Changer de pays | **PARTIAL** | un déménagement instantané : ni demande, ni refus, ni adaptation | environnement, finance |
| Actualités | Fil d’actualité du monde | **MISSING** | le monde change en silence : le joueur ne l’apprend jamais | — |
| Événements | Événements à choix multiples | **DEEP** | — | tout |
| Événements | Scènes composées avec un proche réel | **DEEP** | — | relations, personnalité, tout |
| Événements | Conséquences retardées | **MISSING** | un choix produit son effet immédiatement et n’est jamais rappelé | — |
