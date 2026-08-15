# Analyse des écarts de gameplay

> Document généré par `npm run parity` depuis `src/data/parity.ts`.
> Ne pas le modifier à la main : la source est la matrice, et la matrice
> est vérifiée par `src/engine/__bench__/parite.test.ts`, qui échoue si une
> ligne se déclare présente en citant un symbole qui n’existe pas.

La référence fonctionnelle est un simulateur de vie complet du marché. Il
ne s’agit pas d’en copier les textes, les visuels ni le code, mais
d’atteindre la même profondeur : les mêmes types de possibilités, de
sous-menus, d’interactions et de conséquences.

## Score de parité

**Total : 76 %**

Le score mesure la profondeur atteinte rapportée à la profondeur attendue,
pas le nombre de boutons. Une capacité prioritaire doit être profonde pour
compter comme acquise ; une extension de confort peut rester légère.

| Domaine | Score | Complètes | Partielles | Absentes |
| --- | ---: | ---: | ---: | ---: |
| Générations | 0 % | 0 | 0 | 1 |
| Réussites | 0 % | 0 | 0 | 1 |
| Fertilité | 25 % | 0 | 1 | 0 |
| Mini-jeux | 35 % | 1 | 0 | 2 |
| Esprit & corps | 40 % | 1 | 0 | 1 |
| Apparence | 43 % | 1 | 0 | 1 |
| Enfants | 50 % | 0 | 2 | 0 |
| Réseaux sociaux | 50 % | 0 | 1 | 0 |
| Voyages | 50 % | 0 | 1 | 0 |
| Véhicules | 56 % | 1 | 1 | 0 |
| Extensions | 63 % | 0 | 4 | 1 |
| Carrières spéciales | 71 % | 1 | 5 | 1 |
| Université | 73 % | 1 | 1 | 0 |
| Amour | 73 % | 1 | 1 | 0 |
| Santé | 73 % | 1 | 1 | 0 |
| Célébrité | 75 % | 6 | 1 | 0 |
| Patrimoine | 80 % | 3 | 0 | 0 |
| Travail | 82 % | 9 | 1 | 0 |
| Famille | 82 % | 4 | 0 | 0 |
| Prison | 82 % | 3 | 1 | 0 |
| Crime | 84 % | 7 | 1 | 0 |
| École | 85 % | 13 | 2 | 0 |
| Shopping | 86 % | 0 | 1 | 0 |
| Immigration | 86 % | 1 | 0 | 0 |
| Jeux d’argent | 86 % | 1 | 0 | 0 |
| Animaux | 86 % | 1 | 0 | 0 |
| Retraite | 86 % | 1 | 0 | 0 |
| Relations | 92 % | 1 | 2 | 0 |
| Enfance | 93 % | 2 | 1 | 0 |
| Finance | 95 % | 2 | 0 | 0 |
| Naissance | 100 % | 2 | 0 | 0 |
| Argent | 100 % | 1 | 0 | 0 |
| Propriétés | 100 % | 1 | 0 | 0 |
| Justice | 100 % | 2 | 0 | 0 |
| Héritage | 100 % | 1 | 0 | 0 |
| Mort | 100 % | 1 | 0 | 0 |

## Ordre de travail recommandé

Priorité la plus haute d’abord, puis profondeur la plus faible : ce sont
les écrans que le joueur ouvre le plus souvent et qui lui rendent le moins.

1. **Relations — Actions disponibles selon le contexte** (priorité 1, profondeur 4/5)
2. **Véhicules — Permis de conduire avec examen** (priorité 2, profondeur 1/5)
3. **Crime — Vol de véhicule avec choix du modèle** (priorité 2, profondeur 1/5)
4. **École — Banque d’événements scolaires** (priorité 2, profondeur 2/5)
5. **École — Clubs et activités** (priorité 2, profondeur 3/5)
6. **Carrières spéciales — Acteur : auditions, rôles, agent, récompenses** (priorité 2, profondeur 4/5)
7. **Carrières spéciales — Musicien : singles, albums, tournées** (priorité 2, profondeur 5/5)
8. **Esprit & corps — Lecture suivie livre par livre** (priorité 3, profondeur 0/5)
9. **Carrières spéciales — Entreprise : produit, prix, employés, concurrence** (priorité 3, profondeur 0/5)
10. **Générations — Continuer avec un descendant** (priorité 3, profondeur 0/5)
11. **Enfants — Adoption avec choix de l’enfant** (priorité 3, profondeur 1/5)
12. **Fertilité — Contraception, traitements, dons** (priorité 3, profondeur 1/5)
13. **Carrières spéciales — Astronaute, armée : boucle dédiée** (priorité 3, profondeur 1/5)
14. **Célébrité — Menu de célébrité** (priorité 3, profondeur 1/5)
15. **Prison — Émeute jouable** (priorité 3, profondeur 1/5)
16. **Université — Vie étudiante distincte du lycée** (priorité 3, profondeur 2/5)

## MISSING — 8 capacités

Rien dans le jeu ne couvre ces besoins.

### Esprit & corps — Lecture suivie livre par livre

*Priorité 3 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- choisir un livre
- avancer d’année en année
- terminer

### Apparence — Salon, soins, coiffure

*Priorité 4 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- coiffeur
- soins
- massage

### Carrières spéciales — Entreprise : produit, prix, employés, concurrence

*Priorité 3 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- créer une entreprise
- fixer les prix
- embaucher
- marketing
- revendre

### Générations — Continuer avec un descendant

*Priorité 3 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- reprendre la partie dans la peau d’un enfant
- patrimoine et réputation transmis

### Réussites — Défis et succès à débloquer

*Priorité 4 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- liste de défis
- progression
- récompense symbolique

### Mini-jeux — Test de mémoire

*Priorité 4 · profondeur 0/5*

**Aujourd’hui :** rien.

**Mini-jeu attendu :** séquence de symboles qui s’allonge

### Mini-jeux — Test visuel

*Priorité 5 · profondeur 0/5*

**Aujourd’hui :** rien.

**Mini-jeu attendu :** repérer l’intrus parmi des symboles proches

### Extensions — Culte, agence secrète, zoo, casino, course automobile

*Priorité 5 · profondeur 0/5*

**Aujourd’hui :** rien.

## PARTIAL — 28 capacités

Présent, mais il manque des interactions ou des conséquences.

### Enfance — Amis hors de l’école

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Enfants du quartier rencontrés en sortant, selon la sûreté et les relations de voisinage
  <br>*Code : `src/systems/childhood.ts#meetNeighbourChild`*

**Interactions manquantes**

- activités propres aux amis du quartier

### École — Clubs et activités

*Priorité 2 · profondeur 3/5*

**Aujourd’hui :** Rejoindre, quitter, progresser de membre à titulaire puis responsable selon l’ancienneté et le mérite
  <br>*Code : `src/systems/schoolActions.ts#advanceClubs`*

**Interactions manquantes**

- compétitions inter-établissements

### École — Banque d’événements scolaires

*Priorité 2 · profondeur 2/5*

**Aujourd’hui :** Événements d’enfance et d’adolescence génériques
  <br>*Code : `src/data/events/teen.ts`*

**Interactions manquantes**

- contrôle surprise
- professeur injuste
- camarade qui veut copier
- projet de groupe
- nouvel élève
- conflit entre élèves

### Université — Vie étudiante distincte du lycée

*Priorité 3 · profondeur 2/5*

**Aujourd’hui :** Mêmes actions que le secondaire
  <br>*Code : `src/systems/education.ts#advanceEducation`*

**Interactions manquantes**

- colocation
- fraternité ou association
- stage
- mémoire

### Relations — Actions sociales génériques

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Discuter, temps, compliment, cadeau, argent, conseil, dispute, insulte, rupture, ponts coupés, réconciliation
  <br>*Code : `src/systems/relationships.ts#interact`*

**Interactions manquantes**

- prêter et emprunter avec remboursement
- demander un service

### Relations — Actions disponibles selon le contexte

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** getAvailableActions(état, cible, contexte) : une seule source pour le général, l’école et le travail, et chaque action bloquée dit pourquoi
  <br>*Code : `src/systems/actions.ts#getAvailableActions`*

**Interactions manquantes**

- contexte prison encore vide

### Amour — Vie de couple entre les grands moments

*Priorité 3 · profondeur 2/5*

**Aujourd’hui :** Embrasser et passer du temps
  <br>*Code : `src/systems/relationships.ts#interact`*

**Interactions manquantes**

- rendez-vous
- voyage à deux
- parler du couple
- thérapie de couple
- infidélité

### Enfants — Avoir et élever des enfants

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Conception, naissance, adoption, l’enfant grandit comme PNJ
  <br>*Code : `src/systems/relationships.ts#deliverBaby`*

**Interactions manquantes**

- discipliner
- aider aux devoirs
- financer les études
- soutenir une activité

**Conséquences manquantes**

- style parental qui façonne l’enfant devenu adulte

### Enfants — Adoption avec choix de l’enfant

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Une demande unique, acceptée ou refusée
  <br>*Code : `src/systems/activities.ts#adoptChild`*

**Interactions manquantes**

- plusieurs enfants proposés
- profil de chacun
- choix

### Fertilité — Contraception, traitements, dons

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Un traitement de fertilité unique
  <br>*Code : `src/systems/activities.ts#fertilityTreatment`*

**Interactions manquantes**

- contraception
- don
- suivi

### Santé — Choisir son praticien

*Priorité 3 · profondeur 2/5*

**Aujourd’hui :** Plusieurs types de consultation
  <br>*Code : `src/systems/health.ts#consult`*

**Interactions manquantes**

- plusieurs médecins concurrents avec réputation et tarif
- urgences

### Travail — Cumuler plusieurs sources de revenu

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Un budget de temps commun borne emploi, métier indépendant et entreprise ; le cumul de deux contrats salariés reste impossible
  <br>*Code : `src/systems/venture.ts#timeBudget`*

**Interactions manquantes**

- deuxième employeur

### Carrières spéciales — Acteur : auditions, rôles, agent, récompenses

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Neuf rôles proposés selon le niveau, un agent, trois prix, une scène jouée
  <br>*Code : `src/systems/stage.ts#acceptOffer`*

**Interactions manquantes**

- l’essai lui-même ne se joue pas
- répétitions

**Mini-jeu attendu :** performance

### Carrières spéciales — Musicien : singles, albums, tournées

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Neuf engagements du bar au stade, un groupe qu’on auditionne et qui se défait, et une scène jouée
  <br>*Code : `src/systems/stage.ts#settleJob`*

**Interactions manquantes**

- label comme entité
- ventes et classements

**Mini-jeu attendu :** performance

### Carrières spéciales — Politique : campagne, sondages, mandat

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Six mandats du militantisme à la candidature nationale, sans déclin par l’âge
  <br>*Code : `src/data/stage.ts#JOB_TEMPLATES`*

**Interactions manquantes**

- budget de campagne
- sondages
- adversaire nommé
- décisions de mandat

**Mini-jeu attendu :** performance

### Carrières spéciales — Mannequin : agence, castings, défilés

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Six contrats du catalogue à l’égérie, une agence, une carrière volontairement courte
  <br>*Code : `src/data/stage.ts#DISCIPLINES`*

**Interactions manquantes**

- book

**Mini-jeu attendu :** performance

### Carrières spéciales — Astronaute, armée : boucle dédiée

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Deux échelles de salaires
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- missions
- grade et affectation

**Mini-jeu attendu :** puzzle tactique de mission

### Célébrité — Menu de célébrité

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Un compteur d’abonnés et la monétisation
  <br>*Code : `src/systems/activities.ts#monetizeAudience`*

**Interactions manquantes**

- interview
- séance photo
- publicité
- sponsor
- gérer une controverse

### Réseaux sociaux — Plusieurs plateformes, publications, engagement

*Priorité 3 · profondeur 2/5*

**Aujourd’hui :** Une seule audience globale, publication et monétisation
  <br>*Code : `src/systems/activities.ts#postOnSocial`*

**Interactions manquantes**

- plusieurs plateformes
- créer ou supprimer un compte
- commenter
- promouvoir

### Shopping — Magasin structuré par rayon

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Objets de valeur, véhicules et immobilier dans trois écrans séparés
  <br>*Code : `src/systems/activities.ts#buyItem`*

**Interactions manquantes**

- bijoux
- cadeaux
- biens de luxe selon la fortune

### Véhicules — Permis de conduire avec examen

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Une action au résultat probabiliste, sans épreuve
  <br>*Code : `src/systems/activities.ts#getDrivingLicense`*

**Interactions manquantes**

- examen avec questions générées
- échec et repassage

**Mini-jeu attendu :** questionnaire de code fictif

### Voyages — Vacances avec destination et classe

*Priorité 3 · profondeur 2/5*

**Aujourd’hui :** Choix d’une destination, effets sur humeur et argent
  <br>*Code : `src/systems/activities.ts#takeVacation`*

**Interactions manquantes**

- classe de voyage
- inviter quelqu’un
- événements sur place

### Crime — Vol de véhicule avec choix du modèle

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Un délit générique
  <br>*Code : `src/systems/crime.ts#commitCrime`*

**Interactions manquantes**

- choisir un véhicule
- garder ou revendre

### Prison — Émeute jouable

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Une activité de détention au résultat tiré
  <br>*Code : `src/systems/prison.ts#doPrisonActivity`*

**Mini-jeu attendu :** rallier des détenus sans se faire intercepter

### Extensions — Investissement et marchés

*Priorité 4 · profondeur 2/5*

**Aujourd’hui :** Immobilier locatif et objets de valeur qui prennent ou perdent de la valeur
  <br>*Code : `src/systems/activities.ts#advanceValuables`*

**Interactions manquantes**

- placements financiers
- portefeuille

### Extensions — Marché noir fictif

*Priorité 5 · profondeur 2/5*

**Aujourd’hui :** Blanchiment et revente par canal
  <br>*Code : `src/systems/crime.ts#launderMoney`*

**Interactions manquantes**

- catalogue d’articles
- négociation

### Extensions — Royauté

*Priorité 5 · profondeur 4/5*

**Aujourd’hui :** Maisons fictives, ordre de succession, devoirs, abdication
  <br>*Code : `src/systems/royalty.ts#succession`*

**Interactions manquantes**

- intrigues de cour
- diplomatie entre maisons

### Extensions — Défis, succès et coffre

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Défis à serments, chasses à indices, cabinet inter-parties
  <br>*Code : `src/systems/challenges.ts#advanceChallenges`*

**Interactions manquantes**

- défis datés ou saisonniers

## COMPLETE — 70 capacités

Suffisamment poussé : ne rien casser en passant.

### Naissance — Choix du milieu de naissance

*Priorité 5 · profondeur 5/5*

**Aujourd’hui :** Treize contextes, réglage détaillé de chaque couche, aperçus qualitatifs
  <br>*Code : `src/systems/originGen.ts#previewOrigin`*

### Naissance — Caractère de départ

*Priorité 5 · profondeur 5/5*

**Aujourd’hui :** Tempérament réglable, 27 axes, 17 valeurs, exposition calculée
  <br>*Code : `src/systems/psycheGen.ts#buildPsyche`*

### Enfance — Demander quelque chose aux parents

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Téléphone, ordinateur, animal, activité, couvre-feu, argent de poche — accepté, refusé, ou accordé sous condition vérifiée l’année suivante
  <br>*Code : `src/systems/asking.ts#askParent`*

### Enfance — Activités familiales de l’enfance

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Seize activités ordinaires — lire, cuisiner, bricoler, planter, camper — chacune avec un accompagnant à choisir, trois issues selon ce qu’il y met, et une trace dans l’exposition qui décide des goûts adultes
  <br>*Code : `src/systems/childhood.ts#doFamilyActivity`*

### École — Fiche d’établissement consultable

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Écran dédié : établissement, dossier de comportement, place dans la classe, gens, clubs, groupes
  <br>*Code : `src/screens/SchoolScreen.tsx#SchoolScreen`*

### École — Effort scolaire

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Trois rythmes qui pèsent sur les notes, le stress et le temps libre
  <br>*Code : `src/systems/education.ts#setEffort`*

### École — Sécher les cours avec conséquences graduées

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Escalade réelle : avertissement, retenue, convocation, exclusion, renvoi — selon le dossier et le règlement
  <br>*Code : `src/systems/schoolActions.ts#skipSchool`*

### École — Abandonner les études

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Action disponible dès 16 ans, avec effets sur les diplômes
  <br>*Code : `src/systems/education.ts#dropOut`*

### École — Liste de camarades consultable

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Bouton Camarades, fiche par élève avec passions, groupe et ce qui vous rapproche
  <br>*Code : `src/systems/school.ts#classmatesOf`*

### École — Interactions riches avec un camarade

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Aider, demander de l’aide, taquiner, faire une farce, offrir, se déclarer, se réconcilier, provoquer, prendre sa défense, signaler, en parler à un adulte, meilleur ami — plus les interactions générales
  <br>*Code : `src/systems/schoolActions.ts#classmateAction`*

### École — Enseignants comme PNJ

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Professeur principal, professeurs, directeur, conseiller — chacun avec compétence, sévérité, popularité, intégrité
  <br>*Code : `src/systems/school.ts#staffOf`*

### École — Manquer de respect avec réaction non binaire

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Six réactions issues du caractère de la cible, sanction scolaire graduée, parents avertis, réputation qui monte ou descend selon le public
  <br>*Code : `src/systems/schoolActions.ts#disrespect`*

### École — Popularité multidimensionnelle

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Connu, apprécié, respecté, influent, intimidant, drôle — calculés chaque année
  <br>*Code : `src/systems/school.ts#advanceClassLife`*

### École — Groupes sociaux et intégration

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Groupes émergents, tentative d’intégration calculée sur les goûts partagés, les membres connus et la réputation
  <br>*Code : `src/systems/schoolActions.ts#joinPeerGroup`*

### École — Bulletin par matière et orientation

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Dix matières notées à part, points forts et faibles calculés, et une filière qui lit ses matières à elle
  <br>*Code : `src/systems/exams.ts#majorFit`*

### École — Examen jouable et triche

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Une copie où l’on choisit ses questions contre le chronomètre, et un raccourci qui fait monter l’attention du surveillant
  <br>*Code : `src/systems/exams.ts#settleExam`*

**Mini-jeu attendu :** exam

### École — Harcèlement subi et infligé

*Priorité 3 · profondeur 5/5*

**Aujourd’hui :** Un harceleur nommé, cinq registres, cinq réponses dont aucune ne marche partout, la scène du témoin, et l’autre côté
  <br>*Code : `src/systems/bullying.ts#respond`*

### Université — Filières, admission, frais, bourse

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Vingt filières, admission calculée, frais annuels, bourse
  <br>*Code : `src/systems/education.ts#enrollUniversity`*

### Relations — Fiche complète par personne

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Fiche avec personnalité, historique, statistiques de lien
  <br>*Code : `src/screens/RelationshipsScreen.tsx#RelationshipsScreen`*

### Amour — Rencontre, couple, mariage, divorce

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Application de rencontre, sortir ensemble, bague, demande, mariage, contrat, rupture, divorce
  <br>*Code : `src/systems/relationships.ts#propose`*

### Santé — Maladies, diagnostic, traitement, coût

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Cinquante pathologies, aggravation, traitements, prise en charge par pays
  <br>*Code : `src/systems/health.ts#treatDisease`*

### Esprit & corps — Sport, bien-être, méditation

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Sports variés, bien-être, effets sur forme, humeur et stress
  <br>*Code : `src/systems/activities.ts#doSport`*

### Apparence — Chirurgie esthétique

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Plusieurs interventions, avec ratés possibles
  <br>*Code : `src/systems/activities.ts#cosmeticSurgery`*

### Travail — Fiche emploi détaillée

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Écran dédié : poste, employeur, salaire, ancienneté, performance, satisfaction, heures, appuis, équipe, prochain palier
  <br>*Code : `src/screens/WorkScreen.tsx#WorkScreen`*

### Travail — Actions professionnelles

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Implication, augmentation, promotion, congés, horaires, mutation, démission, retraite
  <br>*Code : `src/systems/workplace.ts#askPromotion`*

### Travail — Collègues comme PNJ

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Équipe complète à l’embauche : collègues, rivaux, mentor, ressources humaines — chacun avec compétence et influence
  <br>*Code : `src/systems/workplace.ts#buildTeam`*

### Travail — Supérieur hiérarchique

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Supérieur identifié, interactions dédiées, et un soutien qui pèse réellement sur la promotion comme sur le licenciement
  <br>*Code : `src/systems/workplace.ts#bossOf`*

### Travail — Carrière, promotions, licenciement

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Échelles hiérarchiques complètes, promotion, rétrogradation, licenciement
  <br>*Code : `src/systems/careers.ts#advanceCareer`*

### Travail — Travailler sans employeur

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Vingt métiers exercés à son compte, avec tarif libre, clientèle, savoir-faire, litiges et commandes nommées
  <br>*Code : `src/systems/venture.ts#startFreelance`*

### Travail — Fixer son prix

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Le tarif est le levier central : chaque métier a sa propre élasticité, invisible, et le prix est lu comme une promesse comparée au travail livré
  <br>*Code : `src/systems/venture.ts#feePromise`*

### Travail — Posséder une entreprise

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Dix-huit modèles, apport et emprunt, trésorerie propre, effectif, prix, présence du patron, investissement, gérant salarié
  <br>*Code : `src/systems/venture.ts#foundBusiness`*

### Travail — Faire grandir puis revendre une entreprise

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Valorisation au résultat et à la clientèle, repreneurs avec clauses distinctes, ou dépôt de bilan avec caution personnelle
  <br>*Code : `src/systems/venture.ts#listBusiness`*

### Patrimoine — Locataires comme PNJ

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Le locataire est une personne complète, choisie parmi des dossiers ; elle a un nom, des revenus, une opinion de toi, et reste dans la partie après son départ
  <br>*Code : `src/systems/tenancy.ts#acceptTenant`*

### Patrimoine — Fixer son loyer

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Le loyer demandé sélectionne le locataire : demander cher ne fait pas fuir tout le monde, cela fait fuir ceux qui ont le choix — il reste ceux qui se serrent, et qui cessent de payer
  <br>*Code : `src/systems/tenancy.ts#setAskingRent`*

### Patrimoine — Vie d’un bail

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Vacance, impayés, usure selon le soin du locataire, demandes de travaux à trancher, renouvellement, hausse de loyer, procédure de départ
  <br>*Code : `src/systems/tenancy.ts#advanceTenancy`*

### Famille — Continuer par un descendant

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** La mort ne termine plus la partie : on reprend par un enfant ou un petit-enfant, et l’année, l’économie, la famille et la timeline continuent
  <br>*Code : `src/systems/lineage.ts#continueAs`*

### Famille — Parenté recalculée à la reprise

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Le lien de chaque PNJ est recalculé en remontant la filiation : le conjoint du défunt devient un parent, les autres enfants des frères et sœurs, et les liens du bureau s’effacent
  <br>*Code : `src/systems/lineage.ts#relationTo`*

### Famille — Transmission entre générations

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Ce qu’on laisse décide du milieu de départ du descendant — capitaux économique et culturel, niveau d’études, préréglage d’enfance — et pas seulement de son solde bancaire
  <br>*Code : `src/systems/lineage.ts#tierFromWealth`*

### Famille — Historique de lignée

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Une ligne par génération — nom, dates, métier, patrimoine, notoriété — et chaque ancêtre reste un PNJ retrouvable dans la famille
  <br>*Code : `src/systems/lineage.ts#heirsOf`*

### Célébrité — Notoriété distincte de la réputation

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Trois axes séparés : combien de gens te connaissent, ce qu’ils ont à te reprocher, ce qu’ils retiennent de bon — la réputation restant ce qu’en pensent ceux qui te croisent
  <br>*Code : `src/systems/fame.ts#advanceFame`*

### Célébrité — Entretenir un nom

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** La notoriété retombe d’autant plus vite qu’elle est haute ; l’écran nomme ligne par ligne ce qui l’alimente et ce que l’oubli emporte
  <br>*Code : `src/systems/fame.ts#fameSources`*

### Célébrité — Apparitions publiques

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Dix apparitions échelonnées par seuil de notoriété — interview, séance photo, publicité, gala, plateau, cause, conférence, mémoires, télé-réalité, tournée
  <br>*Code : `src/systems/fame.ts#doGig`*

### Célébrité — Interview jouable

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Trois questions tirées parmi celles qui te concernent, trois réponses chacune, et aucune ne domine les autres sur les trois axes
  <br>*Code : `src/systems/fame.ts#answerInterview`*

### Célébrité — Scandales et gestion de crise

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Huit affaires, quatre réponses : s’excuser, se taire, démentir, contre-attaquer — chacune la meilleure dans un cas et la pire dans un autre
  <br>*Code : `src/systems/fame.ts#respondToScandal`*

### Célébrité — Ce que la célébrité coûte

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Un visage connu se fait reconnaître : le risque d’arrestation, le stress et l’usure de la vie privée suivent la courbe
  <br>*Code : `src/systems/fame.ts#recognitionFactor`*

### Carrières spéciales — Athlète : équipe, saisons, transferts, blessures

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Une filière scolaire avec sélection et recruteurs, puis sept engagements du club local à la sélection, une équipe, un entraîneur et des contrats pluriannuels
  <br>*Code : `src/systems/stage.ts#advanceStage`*

**Mini-jeu attendu :** performance

### Argent — Budget annuel, impôts, emprunts, faillite

*Priorité 5 · profondeur 5/5*

**Aujourd’hui :** Bilan annuel détaillé, fiscalité par pays, prêts, faillite
  <br>*Code : `src/systems/finance.ts#runAnnualFinance`*

### Finance — Investir : supports variés, portefeuille suivi

*Priorité 1 · profondeur 5/5*

**Aujourd’hui :** Dix supports fictifs aux cours persistants, portefeuille avec prix de revient, frais, blocages, impôt sur la plus-value, et une culture financière qui décide de ce qu’on peut acheter
  <br>*Code : `src/systems/investing.ts#invest`*

### Finance — Marché vivant et diversification

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Conjoncture partagée, décrochages, valeur refuge à corrélation négative — répartir réduit réellement le pire cas
  <br>*Code : `src/systems/investing.ts#advanceMarkets`*

### Propriétés — Acheter, vendre, rénover, louer

*Priorité 5 · profondeur 4/5*

**Aujourd’hui :** Achat comptant ou crédit, vente, rénovations, mise en location, résidence principale
  <br>*Code : `src/systems/properties.ts#renovate`*

### Véhicules — Acheter, entretenir, réparer, vendre

*Priorité 5 · profondeur 4/5*

**Aujourd’hui :** Achat, entretien, réparation, vente, vieillissement
  <br>*Code : `src/systems/vehicles.ts#serviceVehicle`*

### Immigration — Émigrer vers un autre pays

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Demande de visa avec conditions et refus possible
  <br>*Code : `src/systems/activities.ts#immigrate`*

### Crime — Catalogue de délits fictifs

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Quatorze délits avec gain, risque et peine
  <br>*Code : `src/systems/crime.ts#commitCrime`*

### Crime — Pickpocket avec choix de cible

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Mini-jeu jouable : cible mobile, jauge de méfiance, arbitrage vitesse contre discrétion, cinq issues distinctes — ou résolution automatique
  <br>*Code : `src/systems/pickpocketing.ts#resolvePickpocket`*

### Crime — Cambriolage jouable

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Mini-jeu jouable : plan tiré au sort, occupants qui patrouillent, jauges de bruit et de charge, arbitrage entre remplir le sac et ressortir — cinq issues, dont deux qui débouchent sur une fuite
  <br>*Code : `src/systems/burglary.ts#resolveBurglary`*

### Crime — Fuite après un coup manqué

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Mini-jeu jouable : rejoindre une sortie, souffle limité, poursuivants qui perdent la trace dans les angles — réutilisable par tout ce qui déclenche une course
  <br>*Code : `src/systems/burglary.ts#resolveEscape`*

### Crime — Milieu organisé : hiérarchie, missions, territoire

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Maisons avec style, six rangs, respect, territoire disputé avec une maison rivale, six types de missions dont trois passent par un mini-jeu, refus et échec chiffrés, et une porte de sortie qui se paie
  <br>*Code : `src/systems/underworld.ts#settleMission`*

### Crime — Attention policière distincte de la réputation

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** Chaleur 0-100 qui monte avec les délits, retombe avec le temps, pèse sur les arrestations et ouvre des enquêtes — indépendante de la notoriété dans le milieu
  <br>*Code : `src/systems/underworld.ts#addHeat`*

### Crime — Carnet de contacts du milieu

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Receleur, indicateur, chauffeur, logeur, avocat — chacun trouvé au hasard, de qualité inconnue, rendant un service mesurable, et susceptible de parler
  <br>*Code : `src/systems/underworld.ts#askService`*

### Justice — Enquête avant l’arrestation

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Dossier qui avance année après année, qu’on peut apprendre, ralentir ou faire fermer
  <br>*Code : `src/systems/underworld.ts#openInvestigation`*

### Justice — Arrestation, avocat, procès, appel, casier

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Choix d’avocat, procès plaidé, appel, effacement du casier
  <br>*Code : `src/systems/justice.ts#goToTrial`*

### Prison — Vie carcérale

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Établissement, régime, peine, dossier et respect en opposition, activités, codétenus avec leurs propres actions, protection, conditionnelle
  <br>*Code : `src/systems/prison.ts#inmateAction`*

### Prison — Évasion jouable

*Priorité 2 · profondeur 5/5*

**Aujourd’hui :** Préparation sur plusieurs années, puis mini-jeu jouable : cour, rondes, abris, projecteur, jauge de vigilance — et une course pour finir
  <br>*Code : `src/systems/escape.ts#resolveEscapeAttempt`*

### Prison — Vie de fugitif après une évasion

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Cavale durable : aucun emploi déclarable, reprise possible chaque année, proches qui s’éloignent, reddition et prescription
  <br>*Code : `src/systems/escape.ts#advanceFugitive`*

### Jeux d’argent — Loterie et casino

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Loterie et plusieurs jeux de casino avec mise
  <br>*Code : `src/systems/activities.ts#playCasino`*

### Animaux — Adopter, jouer, soigner

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Adoption, jeu, vétérinaire, vieillissement
  <br>*Code : `src/systems/activities.ts#adoptPetSpecies`*

### Retraite — Pension et fin de carrière

*Priorité 4 · profondeur 3/5*

**Aujourd’hui :** Départ à la retraite, pension calculée sur la carrière
  <br>*Code : `src/systems/careers.ts#retire`*

### Héritage — Testament et succession

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Testament par bénéficiaire, ordre légal, droits de succession
  <br>*Code : `src/systems/inheritance.ts#settleEstate`*

### Mort — Fin de vie et récapitulatif

*Priorité 5 · profondeur 4/5*

**Aujourd’hui :** Causes variées, récapitulatif, cimetière des vies passées
  <br>*Code : `src/engine/save.ts`*

### Mini-jeux — Registre de mini-jeux

*Priorité 2 · profondeur 4/5*

**Aujourd’hui :** MiniGameEngine : jeux sans interface, registre commun, difficulté issue du contexte, mélange joueur/personnage, résolution automatique
  <br>*Code : `src/engine/minigame.ts#registerMiniGame`*

## Mini-jeux à créer

Chacun doit remplir le même rôle fonctionnel que sa référence sans en
reprendre le plateau, les graphismes ni les règles exactes.

| Domaine | Rôle | Statut |
| --- | --- | --- |
| École | exam | COMPLETE |
| Carrières spéciales | performance | PARTIAL |
| Carrières spéciales | performance | PARTIAL |
| Carrières spéciales | performance | COMPLETE |
| Carrières spéciales | performance | PARTIAL |
| Carrières spéciales | performance | PARTIAL |
| Carrières spéciales | puzzle tactique de mission | PARTIAL |
| Véhicules | questionnaire de code fictif | PARTIAL |
| Prison | rallier des détenus sans se faire intercepter | PARTIAL |
| Mini-jeux | séquence de symboles qui s’allonge | MISSING |
| Mini-jeux | repérer l’intrus parmi des symboles proches | MISSING |

## Condition de fin

Une capacité n’est pas terminée quand un écran lui ressemble. Elle l’est
quand elle est jouable, qu’elle produit des conséquences ailleurs, qu’elle
est sauvegardée, qu’elle possède ses événements et qu’elle est testée.
