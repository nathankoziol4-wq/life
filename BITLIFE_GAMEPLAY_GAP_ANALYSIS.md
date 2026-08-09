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

**Total : 60 %**

Le score mesure la profondeur atteinte rapportée à la profondeur attendue,
pas le nombre de boutons. Une capacité prioritaire doit être profonde pour
compter comme acquise ; une extension de confort peut rester légère.

| Domaine | Score | Complètes | Partielles | Absentes |
| --- | ---: | ---: | ---: | ---: |
| Générations | 0 % | 0 | 0 | 1 |
| Réussites | 0 % | 0 | 0 | 1 |
| Mini-jeux | 0 % | 0 | 0 | 3 |
| Carrières spéciales | 20 % | 0 | 5 | 1 |
| Fertilité | 25 % | 0 | 1 | 0 |
| Célébrité | 25 % | 0 | 1 | 0 |
| Extensions | 29 % | 0 | 2 | 2 |
| Crime | 34 % | 1 | 3 | 0 |
| Esprit & corps | 40 % | 1 | 0 | 1 |
| Prison | 40 % | 0 | 3 | 0 |
| Apparence | 43 % | 1 | 0 | 1 |
| Enfants | 50 % | 0 | 2 | 0 |
| Réseaux sociaux | 50 % | 0 | 1 | 0 |
| Voyages | 50 % | 0 | 1 | 0 |
| Véhicules | 56 % | 1 | 1 | 0 |
| Université | 73 % | 1 | 1 | 0 |
| Amour | 73 % | 1 | 1 | 0 |
| Santé | 73 % | 1 | 1 | 0 |
| École | 81 % | 10 | 3 | 0 |
| Travail | 83 % | 5 | 0 | 0 |
| Shopping | 86 % | 0 | 1 | 0 |
| Immigration | 86 % | 1 | 0 | 0 |
| Jeux d’argent | 86 % | 1 | 0 | 0 |
| Animaux | 86 % | 1 | 0 | 0 |
| Retraite | 86 % | 1 | 0 | 0 |
| Relations | 92 % | 1 | 2 | 0 |
| Naissance | 100 % | 2 | 0 | 0 |
| Enfance | 100 % | 1 | 0 | 0 |
| Argent | 100 % | 1 | 0 | 0 |
| Propriétés | 100 % | 1 | 0 | 0 |
| Justice | 100 % | 1 | 0 | 0 |
| Héritage | 100 % | 1 | 0 | 0 |
| Mort | 100 % | 1 | 0 | 0 |

## Ordre de travail recommandé

Priorité la plus haute d’abord, puis profondeur la plus faible : ce sont
les écrans que le joueur ouvre le plus souvent et qui lui rendent le moins.

1. **Relations — Actions disponibles selon le contexte** (priorité 1, profondeur 4/5)
2. **Mini-jeux — Registre de mini-jeux** (priorité 2, profondeur 0/5)
3. **Carrières spéciales — Acteur : auditions, rôles, agent, récompenses** (priorité 2, profondeur 1/5)
4. **Carrières spéciales — Musicien : singles, albums, tournées** (priorité 2, profondeur 1/5)
5. **Carrières spéciales — Athlète : équipe, saisons, transferts, blessures** (priorité 2, profondeur 1/5)
6. **Véhicules — Permis de conduire avec examen** (priorité 2, profondeur 1/5)
7. **Crime — Pickpocket avec choix de cible** (priorité 2, profondeur 1/5)
8. **Crime — Vol de véhicule avec choix du modèle** (priorité 2, profondeur 1/5)
9. **Crime — Cambriolage jouable** (priorité 2, profondeur 1/5)
10. **Prison — Évasion jouable** (priorité 2, profondeur 1/5)
11. **École — Banque d’événements scolaires** (priorité 2, profondeur 2/5)
12. **École — Clubs et activités** (priorité 2, profondeur 3/5)
13. **Esprit & corps — Lecture suivie livre par livre** (priorité 3, profondeur 0/5)
14. **Carrières spéciales — Entreprise : produit, prix, employés, concurrence** (priorité 3, profondeur 0/5)
15. **Générations — Continuer avec un descendant** (priorité 3, profondeur 0/5)
16. **Enfants — Adoption avec choix de l’enfant** (priorité 3, profondeur 1/5)

## MISSING — 10 capacités

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

### Mini-jeux — Registre de mini-jeux

*Priorité 2 · profondeur 0/5*

**Aujourd’hui :** rien.

**Interactions manquantes**

- registre commun
- difficulté selon le contexte
- conséquences en cas d’échec

### Mini-jeux — Test de mémoire

*Priorité 4 · profondeur 0/5*

**Aujourd’hui :** rien.

**Mini-jeu attendu :** séquence de symboles qui s’allonge

### Mini-jeux — Test visuel

*Priorité 5 · profondeur 0/5*

**Aujourd’hui :** rien.

**Mini-jeu attendu :** repérer l’intrus parmi des symboles proches

### Extensions — Royauté

*Priorité 5 · profondeur 0/5*

**Aujourd’hui :** rien.

### Extensions — Culte, agence secrète, zoo, casino, course automobile

*Priorité 5 · profondeur 0/5*

**Aujourd’hui :** rien.

## PARTIAL — 29 capacités

Présent, mais il manque des interactions ou des conséquences.

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

### École — Harcèlement subi et infligé

*Priorité 3 · profondeur 4/5*

**Aujourd’hui :** Harcèlement subi simulé, défense d’une victime et signalement jouables
  <br>*Code : `src/systems/schoolActions.ts#classmateAction`*

**Interactions manquantes**

- harceler quelqu’un délibérément et en subir les suites

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

### Carrières spéciales — Acteur : auditions, rôles, agent, récompenses

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Une échelle de salaires nommée « Acteur »
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- auditions
- agent
- choix de rôle
- répétitions
- récompenses

### Carrières spéciales — Musicien : singles, albums, tournées

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Une échelle de salaires nommée « Musicien »
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- groupe ou solo
- label
- sortir un titre
- concerts
- certifications

### Carrières spéciales — Athlète : équipe, saisons, transferts, blessures

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Échelles de salaires sportives
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- équipe
- saison
- entraînement
- transfert
- blessure de carrière

### Carrières spéciales — Politique : campagne, sondages, mandat

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Une échelle de salaires nommée « Politique »
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- candidature
- budget de campagne
- sondages
- décisions de mandat
- réélection

### Carrières spéciales — Astronaute, mannequin, armée : boucle dédiée

*Priorité 3 · profondeur 1/5*

**Aujourd’hui :** Trois échelles de salaires
  <br>*Code : `src/data/jobs.ts`*

**Interactions manquantes**

- missions
- book et défilés
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

### Crime — Pickpocket avec choix de cible

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Un délit au résultat purement probabiliste
  <br>*Code : `src/systems/crime.ts#commitCrime`*

**Interactions manquantes**

- plusieurs cibles au profil différent
- arbitrage gain contre risque

### Crime — Vol de véhicule avec choix du modèle

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Un délit générique
  <br>*Code : `src/systems/crime.ts#commitCrime`*

**Interactions manquantes**

- choisir un véhicule
- garder ou revendre

### Crime — Cambriolage jouable

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Un délit au résultat tiré une fois
  <br>*Code : `src/systems/crime.ts#commitCrime`*

**Interactions manquantes**

- exploration
- décider quand repartir

**Mini-jeu attendu :** plan procédural : pièces, butin, bruit, occupant, sortie

### Prison — Vie carcérale

*Priorité 3 · profondeur 3/5*

**Aujourd’hui :** Établissement, peine, comportement, activités, conditionnelle
  <br>*Code : `src/systems/prison.ts#doPrisonActivity`*

**Interactions manquantes**

- liste des détenus
- parler à un détenu
- niveau de sécurité visible

### Prison — Évasion jouable

*Priorité 2 · profondeur 1/5*

**Aujourd’hui :** Une tentative au résultat tiré une fois
  <br>*Code : `src/systems/prison.ts#attemptEscape`*

**Mini-jeu attendu :** plan procédural : gardien mobile, portes, zones surveillées

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

## COMPLETE — 35 capacités

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

*Priorité 1 · profondeur 4/5*

**Aujourd’hui :** Aider, demander de l’aide, taquiner, provoquer, prendre sa défense, signaler, meilleur ami — plus les interactions générales
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

### Argent — Budget annuel, impôts, emprunts, faillite

*Priorité 5 · profondeur 5/5*

**Aujourd’hui :** Bilan annuel détaillé, fiscalité par pays, prêts, faillite
  <br>*Code : `src/systems/finance.ts#runAnnualFinance`*

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

### Justice — Arrestation, avocat, procès, appel, casier

*Priorité 4 · profondeur 4/5*

**Aujourd’hui :** Choix d’avocat, procès plaidé, appel, effacement du casier
  <br>*Code : `src/systems/justice.ts#goToTrial`*

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

## Mini-jeux à créer

Chacun doit remplir le même rôle fonctionnel que sa référence sans en
reprendre le plateau, les graphismes ni les règles exactes.

| Domaine | Rôle | Statut |
| --- | --- | --- |
| Carrières spéciales | puzzle tactique de mission | PARTIAL |
| Véhicules | questionnaire de code fictif | PARTIAL |
| Crime | plan procédural : pièces, butin, bruit, occupant, sortie | PARTIAL |
| Prison | plan procédural : gardien mobile, portes, zones surveillées | PARTIAL |
| Prison | rallier des détenus sans se faire intercepter | PARTIAL |
| Mini-jeux | séquence de symboles qui s’allonge | MISSING |
| Mini-jeux | repérer l’intrus parmi des symboles proches | MISSING |

## Condition de fin

Une capacité n’est pas terminée quand un écran lui ressemble. Elle l’est
quand elle est jouable, qu’elle produit des conséquences ailleurs, qu’elle
est sauvegardée, qu’elle possède ses événements et qu’elle est testée.
