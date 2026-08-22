# Audit du jeu, feuille par feuille

*Généré par `npm run catalog` depuis `src/data/featureCatalog.ts`. Aucun
chiffre n'est écrit à la main : chaque ligne du catalogue est vérifiée contre
le code par `catalogue.test.ts`, qui échoue si une feuille cite un symbole,
un écran, un test ou un mini-jeu qui n'existe pas.*

**645 feuilles auditées · couverture globale 84 %**

La couverture pondère chaque feuille par son impact : une capacité
structurante absente coûte plus qu'un détail. Elle monte quand on complète une
branche, et **elle descend quand on ajoute au catalogue une capacité qui
manquait** — c'est voulu : un audit qui ne peut que monter ne sert à rien.

## Ce que veut dire chaque état

| État | Poids | Définition |
| --- | --- | --- |
| `MISSING` | 0 | N’existe pas. |
| `PLACEHOLDER` | 0.08 | Un bouton ou un texte, presque rien derrière. |
| `BASIC` | 0.35 | Fonctionne, mais c’est un tirage et un effet. |
| `PARTIAL` | 0.6 | Un vrai système, dont des branches manquent. |
| `COMPLETE` | 0.92 | Interface, logique, persistance, conséquences, tests. |
| `INTERACTIVE` | 1 | Le joueur agit lui-même et sa performance compte. |

## Par catégorie

| Catégorie | Feuilles | Terminées | Partielles | Absentes | Interactives | Couverture |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Activités | 34 | 14 | 7 | 13 | 2 | 54 % |
| Santé | 14 | 8 | 3 | 3 | 0 | 70 % |
| Patrimoine | 34 | 26 | 0 | 8 | 0 | 78 % |
| Héritage | 29 | 24 | 0 | 5 | 1 | 81 % |
| Crime | 33 | 25 | 4 | 4 | 7 | 82 % |
| Entreprise | 14 | 12 | 0 | 2 | 0 | 82 % |
| Carrière | 32 | 25 | 4 | 3 | 0 | 82 % |
| Justice | 7 | 6 | 0 | 1 | 0 | 82 % |
| Placements | 22 | 17 | 5 | 0 | 0 | 84 % |
| Relations | 68 | 57 | 6 | 5 | 0 | 85 % |
| Vie | 85 | 71 | 7 | 7 | 0 | 85 % |
| Prison | 13 | 11 | 1 | 1 | 1 | 86 % |
| Événements | 12 | 11 | 0 | 1 | 0 | 86 % |
| Méta | 14 | 12 | 0 | 2 | 0 | 87 % |
| Carrières spéciales | 86 | 79 | 1 | 6 | 8 | 88 % |
| Finance | 15 | 14 | 0 | 1 | 0 | 89 % |
| Enfance | 11 | 10 | 1 | 0 | 0 | 89 % |
| Éducation | 91 | 84 | 7 | 0 | 1 | 90 % |
| Notoriété | 16 | 15 | 1 | 0 | 0 | 91 % |
| Simulation PNJ | 9 | 9 | 0 | 0 | 0 | 92 % |
| Travail | 6 | 6 | 0 | 0 | 0 | 92 % |
| **Total** | **645** | **536** | **47** | **62** | **20** | **84 %** |

## Le prochain chantier

On ne traite pas les feuilles une par une : on termine **la catégorie qui perd
le plus d'impact**, en profondeur, puis la suivante.

| Rang | Catégorie | Impact perdu | Feuilles absentes |
| ---: | --- | ---: | ---: |
| 1 | Vie | 44.0 | 7 |
| 2 | Activités | 42.7 | 13 |
| 3 | Relations | 37.5 | 5 |
| 4 | Éducation | 32.9 | 0 |
| 5 | Carrières spéciales | 32.4 | 6 |
| 6 | Patrimoine | 24.8 | 8 |
| 7 | Crime | 23.3 | 4 |
| 8 | Carrière | 22.0 | 3 |

## L'arbre complet

### Vie

**Création**

- `COMPLETE` Choisir le prénom — `engine/newLife.ts#createNewLife` · test `naissance`
- `COMPLETE` Choisir le nom de famille — `engine/newLife.ts#createNewLife` · test `naissance`
- `COMPLETE` Choisir le sexe — `engine/newLife.ts#createNewLife` · test `naissance`
- `COMPLETE` Choisir le pays — `systems/originGen.ts#resolveDraft` · test `naissance`
- `COMPLETE` Choisir la ville — `systems/originGen.ts#resolveDraft` · test `naissance`
- `COMPLETE` Choisir le milieu social — `data/originPresets.ts` · test `naissance`
- `COMPLETE` Aperçu avant validation — `systems/originGen.ts#previewOrigin` · test `naissance`
- `COMPLETE` Avertissements de cohérence — `systems/originGen.ts#coherenceWarnings` · test `naissance`
- `COMPLETE` Vie entièrement aléatoire — `engine/newLife.ts#createNewLife` · test `naissance`
- `COMPLETE` Régler les statistiques de départ — `data/cradle.ts#GIFTS` · test `berceau` *(trois potentiels hérités sous enveloppe fixe — monter l’un oblige à baisser un autre, et la somme vaut exactement ce que le hasard donnait : composer rend différent, jamais plus fort)*
- `COMPLETE` Régler le tempérament — `systems/psycheGen.ts#buildPsyche` · test `berceau` *(les douze axes se règlent un à un en mode détaillé ; la note « pas choisissable feuille à feuille » était périmée — mesuré, demandé 5 → obtenu 5, avec effet réel sur le stress et la discipline)*
- `PARTIAL` Composer sa famille — `systems/originGen.ts#resolveDraft` · test `berceau` *(structure du foyer et fratrie (nombre, sexe, écart d’âge) deviennent de vraies personnes aux bons âges — vérifié ; le métier et l’âge des parents restent tirés)*
- `COMPLETE` Composer son apparence — `data/cradle.ts#LOOK_POOLS` · test `berceau` *(visage, yeux, cheveux, coiffure, peau, carrure et taille ; l’aperçu passe par le vrai générateur, donc ce qu’on voit avant est ce qui naît)*
- `MISSING` Villes personnalisées *(ajouter ses propres villes au catalogue)*
- `MISSING` Listes de prénoms personnalisées

**Naissance**

- `COMPLETE` Parents générés avec métier et âge — `systems/household.ts#buildHousehold` · test `naissance`
- `COMPLETE` Fratrie générée — `systems/household.ts#buildHousehold` · test `naissance`
- `COMPLETE` Grands-parents et famille élargie — `systems/household.ts#buildHousehold` · test `naissance`
- `COMPLETE` Richesse et revenus du foyer — `systems/originGen.ts#recomputeFinance` · test `milieu`
- `COMPLETE` Logement de départ — `data/housing.ts` · test `milieu`
- `COMPLETE` Quartier de départ — `data/neighborhoods.ts` · test `environnement`
- `COMPLETE` Circonstances familiales particulières — `data/originPresets.ts` · test `milieu`
- `COMPLETE` Prédispositions héréditaires — `systems/originGen.ts#randomGenetics` · test `naissance`
- `MISSING` Animal déjà dans le foyer *(naître dans une maison avec un chien change l’enfance)*
- `MISSING` Événements de naissance rares *(jumeau, naissance prématurée, né en voyage, enfant trouvé)*
- `MISSING` Naître dans une famille célèbre *(hériter d’une notoriété au berceau)*

**Attributs**

- `COMPLETE` Bonheur — `engine/types.ts#Stats` · test `engine`
- `COMPLETE` Santé — `systems/health.ts#healthSummary` · test `engine`
- `COMPLETE` Intelligence — `engine/types.ts#Stats` · test `engine`
- `COMPLETE` Allure — `engine/types.ts#Stats` · test `engine`
- `COMPLETE` Forme physique — `systems/activities.ts#doSport` · test `engine`
- `COMPLETE` Discipline — `engine/types.ts#Stats` · test `personnalite`
- `COMPLETE` Karma — `engine/types.ts#Stats` · test `engine`
- `COMPLETE` Réputation — `engine/types.ts#Stats` · test `travail`
- `COMPLETE` Stress — `engine/types.ts#Stats` · test `engine`
- `COMPLETE` Fertilité — `systems/relationships.ts#tryForBaby` · test `life`
- `BASIC` Dépendance — `engine/types.ts#Stats` *(une jauge qui monte : ni cure, ni rechute, ni entourage qui réagit)*
- `COMPLETE` Criminalité — `systems/crime.ts#commitCrime` · test `life`
- `COMPLETE` Notoriété publique — `systems/fame.ts#advanceFame` · test `notoriete`

**Personnalité**

- `COMPLETE` Tempérament inné — `systems/psycheGen.ts#rollTemperament` · test `personnalite`
- `COMPLETE` Axes de caractère — `systems/psycheGen.ts#initialAxes` · test `personnalite`
- `COMPLETE` Valeurs — `systems/psycheGen.ts#initialValues` · test `personnalite`
- `COMPLETE` Dérive annuelle — `systems/psyche.ts#updatePersonality` · test `personnalite`
- `COMPLETE` Intérêts qui naissent et meurent — `systems/psyche.ts#advanceInterests` · test `personnalite`
- `COMPLETE` Peurs acquises — `systems/psyche.ts#addFear` · test `personnalite`
- `PARTIAL` Habitudes qui coûtent — `systems/psyche.ts#advanceHabits` · test `personnalite` *(on ne peut pas prendre ni perdre une habitude délibérément)*
- `PARTIAL` Ambitions — `systems/psycheGen.ts#pickAmbitions` *(affichées et alimentées, mais le joueur ne s’en fixe aucune)*
- `PARTIAL` Souvenirs marquants — `systems/psyche.ts#applyExperience` · test `personnalite` *(le joueur les lit ; les PNJ ne s’en servent pas)*
- `COMPLETE` Compatibilité entre caractères — `systems/psyche.ts#calculateCompatibility` · test `personnalite`
- `COMPLETE` Aucun paramètre décoratif — `systems/psycheAudit.ts#validatePsycheImpact` · test `personnalite`
- `COMPLETE` Talents découverts — `systems/skills.ts#claimGifts` · test `savoirFaire` *(les trois marqueurs de l’événement d’enfance donnent une avance réelle et révèlent le don, ce qui coûtait autrement trois années d’essais ; le marqueur est consommé)*
- `COMPLETE` Compétences explicites et progressives — `systems/skills.ts#practice` · test `savoirFaire` *(dix compétences, une par famille de métiers ; on devient correct en vivant et solide en le voulant — mesuré, le salaire le plus haut tenu passe de 374 190 à 467 374 pour qui s’y met)*
- `COMPLETE` Don inné, caché jusqu’à ce qu’on le cherche — `systems/skills.ts#aptitudeOf` · test `savoirFaire` *(tiré de la graine sans consommer d’aléa ; l’écran refuse de dire si l’on est doué avant trois essais, ce qui fait de l’enfance le bon moment pour chercher)*
- `COMPLETE` Ce qu’on ne pratique plus rouille — `systems/skills.ts#advanceSkills` · test `savoirFaire` *(jamais sous une part du meilleur niveau atteint : on se rouille, on n’oublie pas qu’on a su faire)*

**Apparence**

- `COMPLETE` Apparence générée — `systems/originGen.ts#randomAppearance` · test `naissance`
- `COMPLETE` Vieillissement visible — `systems/appearance.ts#driftAppearance` · test `allure` *(la carrure suit la forme et sept marques s’inscrivent selon ce qu’on a vécu — des rides quand on a vécu tendu, un teint fatigué quand la santé a lâché, un visage buriné quand le métier était dehors ; la phrase de la fiche change avec elles)*
- `COMPLETE` Coiffure et style — `data/looks.ts#REGISTERS` · test `allure` *(cinq registres, et aucun n’est bon partout : ce qu’un recruteur récompense, un public le pénalise — un test refuse tout registre qui dominerait les autres)*
- `COMPLETE` Salon et soins — `systems/appearance.ts#groom` · test `allure` *(quatre gestes qui remettent de l’entretien, dont un qui ne coûte que du temps ; l’entretien redescend d’un tiers par an et cela se lit sur la fiche avant de se lire dans les chiffres)*
- `COMPLETE` Chirurgie esthétique — `systems/activities.ts#cosmeticSurgery` · test `allure` *(huit procédures, un risque qui monte à chaque fois, une année de convalescence où cela se voit, et un visage trop lisse au bout de quatre — l’ancien reproche parlait de trois manques dont deux existaient déjà ; le troisième était la suite, et c’est lui qui a été ajouté)*
- `COMPLETE` Tatouages et marques — `data/looks.ts#MARKS` · test `allure` *(sept marques, chacune avec sa cause dans la partie ; deux seulement s’effacent, et seulement quand la cause a disparu)*
- `COMPLETE` L’allure se lit selon qui regarde — `systems/appearance.ts#readAs` · test `allure` *(un recruteur, quelqu’un qui vous découvre et un public ne regardent pas la même chose : mesuré, le registre fait passer la chance d’une réponse de 52,4 % à 68,2 % et multiplie l’embauche de 0,82 à 1,23 — et sans registre choisi il rend exactement 1, donc une partie qui l’ignore se joue au chiffre près comme avant)*

**Environnement**

- `COMPLETE` Quartier vivant — `systems/environment.ts#advanceEnvironment` · test `environnement`
- `COMPLETE` Économie locale — `systems/contexts.ts#getLocalOpportunities` · test `environnement`
- `PARTIAL` Déménager de ville — `systems/activities.ts#moveToCity` *(le quartier, le logement et le marché local suivent bien (`relocatePlayer`) ; l’entourage, lui, reste intact — on ne perd personne en déménageant)*
- `COMPLETE` Émigrer — `systems/activities.ts#immigrate` · test `langues` *(la note « ni dossier, ni refus » était périmée : le visa dépend de l’ouverture, du diplôme, de la fortune et du casier, et se refuse — un test le vérifie désormais au lieu de le croire)*
- `COMPLETE` Aucun paramètre décoratif — `systems/environmentAudit.ts#validateEnvironmentImpact` · test `environnement`
- `PARTIAL` Événements mondiaux — `systems/markets.ts#refreshMarkets` · test `placements` *(récession et croissance existent ; ni crise du logement, ni bouleversement technique, ni événement local majeur)*

**Langues**

- `COMPLETE` Langue natale du pays de naissance — `systems/languages.ts#nativeLanguages` · test `langues` *(quinze langues, une par pays jouable, plus les langues de secours qui rendent certaines destinations abordables)*
- `COMPLETE` Apprendre en vivant sur place — `systems/languages.ts#immersionGain` · test `langues` *(l’âge décide : le seul endroit du jeu où le moment d’un choix pèse autant que le choix)*
- `COMPLETE` Parenté entre langues — `data/languages.ts#kinship` · test `langues` *(une langue proche s’apprend vite ; choisir où partir devient une décision et pas une comparaison de salaires)*
- `COMPLETE` Prendre des cours — `systems/languages.ts#study` · test `langues` *(bien moins efficace que d’y vivre, et le seul moyen d’apprendre ce qu’on n’entend pas autour de soi)*
- `COMPLETE` Ce que ça coûte de ne pas parler — `systems/languages.ts#workFactor` · test `langues` *(sous le seuil, le marché ne propose que des premiers échelons et les liens se nouent mal — vérifié sur les offres, pas seulement annoncé)*
- `COMPLETE` L’oubli — `systems/languages.ts#advanceLanguages` · test `langues` *(ce qu’on n’emploie plus se perd, sans jamais descendre sous ce qu’on a vraiment su)*
- `MISSING` Accent et registre *(une langue est un seul nombre : ni accent, ni écrit contre oral, ni registre)*

**Âge**

- `COMPLETE` Passage d’année — `engine/simulateYear.ts#simulateYear` · test `engine`
- `COMPLETE` Espérance de vie contextuelle — `engine/probability.ts#lifeExpectancy` · test `engine`

**Mort**

- `COMPLETE` Causes multiples — `systems/aging.ts#checkPlayerDeath` · test `engine`
- `COMPLETE` Récapitulatif de fin de vie — `engine/simulateYear.ts#buildSummary` · test `engine`
- `COMPLETE` Score de vie — `engine/simulateYear.ts#buildSummary` · test `engine`
- `MISSING` Obsèques *(qui vient, ce qui se dit, ce que ça coûte)*

**Bilan**

- `COMPLETE` Titre de fin de vie — `data/ribbons.ts#RIBBONS` · test `titres` *(36 titres, chacun lu sur au moins trois dimensions croisées — un test le vérifie mécaniquement en poussant chaque statistique seule. S’appuie sur une chronique de seize compteurs et sur les lieux vus, sans quoi l’état final ne dirait pas ce qui s’est passé)*
- `COMPLETE` Mentions — `systems/ribbons.ts#awardRibbon` · test `titres` *(une vie en mérite souvent plusieurs ; le plus rare devient le titre, les autres restent en mentions)*
- `COMPLETE` Épitaphe — `systems/ribbons.ts#obituary` · test `titres` *(écrite depuis le dossier et non depuis un modèle : une vie sans travail n’a pas de phrase sur le travail)*

**Satisfaction**

- `COMPLETE` Bilan de satisfaction de vie — `systems/psyche.ts#lifeSatisfaction` · test `personnalite`

**Causalité**

- `COMPLETE` D’où vient ce qu’on est devenu — `systems/causality.ts#explainTrajectory` · test `personnalite`

### Héritage

**Objets de famille**

- `INTERACTIVE` Les trouver — `systems/minigames/attic.ts#attic` · mini-jeu `attic` · test `heritage` *(une pièce noire, une lampe qui s’avive quand on approche, trois fouilles et des leurres qui répondent comme le bon objet)*
- `COMPLETE` L’âge fait la valeur — `data/heirlooms.ts#ageFactor` · test `heritage` *(le seul placement du jeu qui demande de la patience et non de l’argent : un carnet gardé deux siècles et demi dépasse un tableau acheté hier)*
- `COMPLETE` Les tenir — `systems/heirlooms.ts#restore` · test `heritage` *(l’état baisse tout seul à une vitesse propre à l’objet ; reprendre coûte de l’argent et de l’authenticité, et cinq reprises font une copie)*
- `COMPLETE` Vendre, donner — `systems/heirlooms.ts#sell` · test `heritage` *(vendre ce que la famille a tenu cent ans se paie ailleurs qu’en argent ; donner le fait sortir de la lignée pour de bon)*
- `COMPLETE` Traverser les générations — `systems/lineage.ts#continueAs` · test `heritage` *(la seule chose du jeu qui passe en gardant son identité ; chaque génération ajoute une ligne à son histoire, même celles qui n’y ont pas touché)*

**Collections**

- `COMPLETE` Ce qu’une vie a rassemblé — `screens/CollectionScreen.tsx` · test `heritage` *(métiers tenus, diplômes, distinctions, titres, biens, véhicules, animaux, lieux vus — rassemblés là où le jeu les savait déjà sans jamais les montrer)*
- `MISSING` Registre des collections

**Succession**

- `COMPLETE` Testament et parts — `systems/activities.ts#updateWill` · test `life`
- `COMPLETE` Ordre légal à défaut — `systems/inheritance.ts#settleEstate` · test `lignee`
- `COMPLETE` Hériter d’un proche — `systems/inheritance.ts#handleRelativeDeath` · test `life`

**Lignée**

- `COMPLETE` Continuer par un descendant — `systems/lineage.ts#continueAs` · test `lignee`
- `COMPLETE` Parenté recalculée — `systems/lineage.ts#relationTo` · test `lignee`
- `COMPLETE` Le milieu de départ hérité — `systems/lineage.ts#tierFromWealth` · test `lignee`
- `COMPLETE` Générations enregistrées — `systems/lineage.ts#heirsOf` · test `lignee`
- `MISSING` Arbre généalogique *(la lignée est une liste ; aucun arbre à parcourir)*
- `MISSING` Patrimoine cumulé des générations

**Titres**

- `COMPLETE` Titres symboliques de fin de vie — `systems/ribbons.ts#awardRibbon` · test `titres` *(quarante titres sur cinq paliers ; la vie entière est relue à la mort et le plus rare qu’elle mérite est décerné, les autres restant en mentions)*

**Succès**

- `COMPLETE` Système de succès — `systems/palmares.ts#checkRecords` · test `palmares` *(dix-sept records, et ce ne sont pas des paliers fixes : chacun se compare à ce que le joueur a fait de mieux jusque-là — la première vie les établit, la dixième n’en bat plus qu’un, et au-delà de la vingtième plus rien. C’est la seule chose du jeu qui compare une vie aux autres ; les défis se jurent à l’avance, les titres ne se lisent qu’à la mort)*
- `COMPLETE` Reconnu pendant la vie — `systems/palmares.ts#checkRecords` · test `palmares` *(le record se range l’année où il tombe et se garde même si la vie finit mal ; et ce qu’il écrit ne compte pas comme une année remplie — sans cette précaution, un record battu supprimait l’occasion qui aurait occupé une année vide, donc le palmarès changeait la partie)*
- `COMPLETE` Aucun avantage accordé — `engine/save.ts#saveBest` · test `palmares` *(même règle que le cabinet, et vérifiée de la même façon : une partie dont le palmarès est plein est identique, au point de statistique près, à la même partie dont il est vide)*

**Défis**

- `COMPLETE` Objectifs multiples à remplir — `data/challenges.ts#CHALLENGES` · test `defis` *(dix-sept défis sur cinq paliers ; ce que le joueur décide de faire d’une vie, distinct des ambitions du personnage et des titres de fin de vie)*
- `COMPLETE` Suivi de progression — `systems/challenges.ts#stepsOf` · test `defis` *(les étapes se lisent pendant la vie et ne se reperdent jamais)*
- `COMPLETE` Serments — `systems/vows.ts#vowActive` · test `defis` *(accepter interdit quelque chose pour le reste de la vie, et le moteur refuse ce qui est juré au lieu de le faire arriver)*
- `COMPLETE` Chasses à indices — `systems/challenges.ts#stepsOf` · test `defis` *(trois pistes dont on ne voit que le pas suivant, et qui se suivent dans l’ordre)*
- `COMPLETE` Défis de lignée — `systems/challenges.ts#carryChallenges` · test `defis` *(le seul compte du jeu que la mort fait avancer)*
- `MISSING` Défis à durée limitée *(aucun défi saisonnier ni daté : tous restent disponibles indéfiniment)*

**Cabinet**

- `COMPLETE` Trophées conservés entre les parties — `engine/save.ts#loadVault` · test `defis` *(la seule mémoire qui survit à une partie neuve ; elle garde la vie qui a gagné chaque pièce)*
- `COMPLETE` Paliers ouverts par le cabinet — `systems/challenges.ts#tierOpen` · test `defis` *(il n’accorde aucun avantage — c’est vérifié par un test — et n’ouvre que les défis suivants)*

**Chasses**

- `MISSING` Chasses aux objets saisonnières

### Éducation

**Établissement**

- `COMPLETE` Cycles successifs — `systems/education.ts#advanceEducation` · test `ecole`
- `COMPLETE` Établissement nommé et situé — `data/schools.ts` · test `ecole`
- `COMPLETE` Qualité qui dépend du quartier — `systems/contexts.ts#getEducationContext` · test `environnement`
- `COMPLETE` Année en cours affichée — `systems/education.ts#isInSchool` · test `ecole`
- `COMPLETE` Changer d’établissement — `systems/education.ts#changeSchool` · test `ecole` *(dérogation, privé, internat — chacun avec son prix, et tout ce qu’on avait construit reste derrière)*
- `COMPLETE` Ce que la famille peut payer — `systems/education.ts#transferOptions` · test `ecole` *(le privé et l’internat dépendent du revenu du foyer, pas de ce que l’enfant veut)*
- `COMPLETE` Redoubler — `systems/education.ts#advanceEducation` · test `ecole` *(la moyenne, l’assiduité et ce que l’établissement fait des élèves en difficulté ; la classe monte sans toi)*

**Notes**

- `COMPLETE` Moyenne générale — `systems/education.ts#advanceEducation` · test `ecole`
- `COMPLETE` Rythme de travail choisi — `systems/education.ts#setEffort` · test `ecole`
- `COMPLETE` Travailler davantage ponctuellement — `systems/schoolActions.ts#studyHarder` · test `ecole`
- `COMPLETE` Matières distinctes — `data/subjects.ts#SUBJECTS` · test `examens` *(dix matières ; le talent brut et le travail régulier n’y rendent pas la même chose)*
- `COMPLETE` Points forts et points faibles — `systems/exams.ts#strengths` · test `examens` *(deux élèves de même moyenne peuvent avoir des bulletins opposés)*
- `COMPLETE` Facilités propres à chacun — `systems/exams.ts#aptitudeFor` · test `examens` *(tirées une fois par vie et stables : on est bon en langues à douze ans comme à dix-sept)*
- `COMPLETE` Orientation par le bulletin — `systems/exams.ts#majorFit` · test `examens` *(une filière lit ses trois matières à elle, pas la moyenne générale)*
- `INTERACTIVE` Examen jouable — `systems/exams.ts#settleExam` · mini-jeu `exam` · test `examens` *(ce qui s’y joue est le temps, pas le savoir : quelles questions attaquer, et quand lâcher)*
- `COMPLETE` Session manquée — `systems/exams.ts#advanceExams` · test `examens` *(ne pas s’y présenter compte comme un zéro, y compris après avoir quitté l’école)*
- `COMPLETE` Bulletins et mentions — `systems/exams.ts#report` · test `examens` *(le bulletin est tenu année par année et remis à zéro à chaque cycle)*
- `COMPLETE` Triche à un examen — `systems/exams.ts#setCheating` · mini-jeu `exam` · test `examens` *(un raccourci abstrait — une jauge d’attention qui monte — et une copie annulée si l’on est pris)*

**Comportement**

- `COMPLETE` Dossier disciplinaire persistant — `systems/schoolActions.ts#discipline` · test `ecole`
- `COMPLETE` Sécher les cours — `systems/schoolActions.ts#skipSchool` · test `ecole`
- `COMPLETE` Manquer de respect — `systems/schoolActions.ts#disrespect` · test `ecole`
- `COMPLETE` Escalade des sanctions — `systems/schoolActions.ts#discipline` · test `ecole`
- `COMPLETE` Exclusion définitive — `systems/schoolActions.ts#discipline` · test `ecole`
- `COMPLETE` Abandonner l’école — `systems/education.ts#dropOut` · test `ecole`
- `PARTIAL` Convocation des parents — `systems/schoolActions.ts#discipline` · test `ecole` *(la convocation existe dans le dossier ; les parents ne réagissent pas comme une scène)*

**Camarades**

- `COMPLETE` Classe peuplée de PNJ persistants — `systems/school.ts#buildSchoolClass` · test `ecole`
- `COMPLETE` Parler — `systems/schoolActions.ts#classmateAction` · test `ecole`
- `COMPLETE` Complimenter — `systems/schoolActions.ts#classmateAction` · test `ecole`
- `COMPLETE` Taquiner — `systems/schoolActions.ts#classmateAction` · test `ecole`
- `COMPLETE` Se lier d’amitié — `systems/school.ts#friendshipChance` · test `ecole`
- `COMPLETE` Passer du temps ensemble — `systems/relationships.ts#interact` · test `ecole`
- `COMPLETE` Insulter — `systems/relationships.ts#interact` · test `ecole`
- `PARTIAL` Devenir meilleur ami — `systems/relationships.ts#makeFriend` *(le lien « meilleur ami » existe mais rien ne permet d’y accéder délibérément)*
- `COMPLETE` Inviter à sortir — `systems/schoolActions.ts#classmateAction` · test `ecole` *(le premier amour scolaire ; un refus devant témoins coûte davantage qu’un refus discret)*
- `COMPLETE` Offrir quelque chose — `systems/schoolActions.ts#classmateAction` · test `ecole` *(ça coûte, et à lien faible le geste se lit pour ce qu’il est)*
- `COMPLETE` Faire une farce — `systems/schoolActions.ts#classmateAction` · test `ecole` *(un pari sur le groupe : drôle si la classe rit avec toi, sanctionnée sinon)*
- `COMPLETE` Se réconcilier — `systems/schoolActions.ts#classmateAction` · test `ecole` *(le temps fait la moitié du travail ; sans cela une classe ne pouvait que se vider)*
- `COMPLETE` Dénoncer à un adulte — `systems/schoolActions.ts#classmateAction` · test `ecole` *(ce qu’ils en font dépend d’eux ; non entendu, ça se sait et ça coûte)*

**Harcèlement**

- `COMPLETE` Être victime — `systems/bullying.ts#openHarassment` · test `harcelement` *(une situation qui dure, avec quelqu’un dedans, et non un souvenir)*
- `COMPLETE` Un harceleur identifié — `systems/bullying.ts#pickBully` · test `harcelement` *(un camarade choisi pour ce qu’il est, qui reste dans la partie après)*
- `COMPLETE` Registres distincts — `data/bullying.ts#BULLYING_KINDS` · test `harcelement` *(moqueries, mise à l’écart, rumeurs, racket, bousculades — chacun abîme autre chose)*
- `COMPLETE` Ça s’aggrave si on ne fait rien — `systems/bullying.ts#advanceHarassment` · test `harcelement` *(l’ampleur monte seule, et déborde sur les notes et l’assiduité)*
- `COMPLETE` Ignorer — `systems/bullying.ts#respond` · test `harcelement` *(la meilleure réponse au tout début, la pire ensuite)*
- `COMPLETE` Affronter — `systems/bullying.ts#respond` · test `harcelement` *(dépend de s’il est seul ; sanctionné par l’établissement dans les deux cas)*
- `COMPLETE` Signaler à l’établissement — `systems/bullying.ts#respond` · test `harcelement` *(dépend de ce que cet établissement-là en fait ; se paie quand ça n’aboutit pas)*
- `COMPLETE` En parler à ses parents — `systems/bullying.ts#respond` · test `harcelement` *(la réponse la moins risquée, donc pas la plus forte)*
- `COMPLETE` S’appuyer sur les autres — `systems/bullying.ts#alliesOf` · test `harcelement` *(la meilleure sortie, et la seule qui exige d’avoir déjà quelqu’un)*
- `COMPLETE` Aucune réponse universelle — `systems/bullying.ts#responseOdds` · test `harcelement` *(chacune des cinq est la meilleure dans un contexte et la pire dans un autre — vérifié par test)*
- `COMPLETE` Être témoin — `systems/bullying.ts#witness` · test `harcelement` *(quatre choix dont ne rien faire et s’y mettre aussi ; le silence coûte à l’intérieur)*
- `COMPLETE` Être soi-même le harceleur — `systems/bullying.ts#pickOn` · test `harcelement` *(possible, et compté : karma, amitiés, et le dossier au bout de deux fois)*

**Professeurs**

- `COMPLETE` Personnel persistant — `systems/school.ts#staffOf` · test `ecole`
- `COMPLETE` Demander de l’aide — `systems/schoolActions.ts#teacherAction` · test `ecole`
- `COMPLETE` Se faire bien voir — `systems/schoolActions.ts#teacherAction` · test `ecole`
- `COMPLETE` Signaler un problème — `systems/schoolActions.ts#teacherAction` · test `ecole` *(existait déjà et était classé absent à tort : l’audit avait sa propre erreur)*

**Direction**

- `PARTIAL` Convocation et sanction — `systems/schoolActions.ts#discipline` · test `ecole` *(les sanctions tombent ; le chef d’établissement n’est pas un PNJ à qui parler)*
- `COMPLETE` Plaider sa cause — `systems/schoolActions.ts#teacherAction` · test `ecole` *(la seule action qui efface une ligne du dossier ; dépend du dossier, pas de la sympathie)*

**Groupes**

- `COMPLETE` Groupes sociaux de la classe — `systems/school.ts#peersSharing` · test `ecole`
- `COMPLETE` Demander à rejoindre — `systems/schoolActions.ts#joinPeerGroup` · test `ecole`
- `COMPLETE` Être refusé — `systems/schoolActions.ts#joinPeerGroup` · test `ecole`
- `COMPLETE` Quitter un groupe — `systems/schoolActions.ts#leavePeerGroup` · test `ecole`
- `COMPLETE` L’accès dépend de ce qu’on est — `systems/schoolActions.ts#joinPeerGroup` · test `ecole`

**Clubs**

- `COMPLETE` Catalogue de clubs — `systems/education.ts#availableClubs` · test `ecole`
- `COMPLETE` Rejoindre — `systems/education.ts#joinClub` · test `ecole`
- `COMPLETE` Quitter — `systems/schoolActions.ts#leaveClub` · test `ecole`
- `COMPLETE` Ancienneté et rang — `systems/schoolActions.ts#advanceClubs` · test `ecole`
- `COMPLETE` Devenir responsable — `systems/schoolActions.ts#advanceClubs` · test `ecole`

**Sport**

- `PARTIAL` Équipe de l’établissement — `systems/education.ts#availableClubs` · test `ecole` *(les clubs sportifs existent comme clubs ; ni sélection, ni entraînement, ni compétition)*
- `COMPLETE` Passer une sélection — `systems/schoolSport.ts#trySelection` · test `sportScolaire` *(on peut être écarté, et l’être coûte ; le nombre de places compte autant que le niveau)*
- `COMPLETE` Ce que l’établissement propose — `systems/schoolSport.ts#offeredSports` · test `sportScolaire` *(le champ `sports` de l’établissement décidait de rien ; il ouvre ou ferme des sports entiers)*
- `COMPLETE` Entraînements — `systems/schoolSport.ts#train` · test `sportScolaire` *(deux séances par an, à rendements décroissants, et ça prend sur les devoirs)*
- `COMPLETE` Groupes et temps de jeu — `data/schoolSports.ts#SQUADS` · test `sportScolaire` *(espoirs, réserve, première, sélection — monter est le seul progrès qui se voit du dehors)*
- `COMPLETE` Saison et résultat — `systems/schoolSport.ts#advanceSchoolSport` · test `sportScolaire` *(soldée chaque année ; une bonne année personnelle peut être gâchée par l’équipe)*
- `COMPLETE` Dépendre de ses coéquipiers — `systems/schoolSport.ts#teammateQuality` · test `sportScolaire` *(seulement dans les sports collectifs : c’est ce qui les distingue d’une épreuve individuelle)*
- `COMPLETE` Devenir capitaine — `systems/schoolSport.ts#runForCaptain` · test `sportScolaire` *(le brassard va à celui qu’on suit, pas au meilleur ; un test le vérifie)*
- `COMPLETE` Blessure — `systems/schoolSport.ts#train` · test `sportScolaire` *(proportionnelle au contact du sport ; fait perdre ce qu’on avait construit)*
- `COMPLETE` Être remarqué — `systems/schoolSport.ts#advanceSchoolSport` · test `sportScolaire` *(les recruteurs viennent voir ce qui se voit : un excellent joueur d’aviron reste inconnu)*
- `COMPLETE` Bourse sportive — `systems/schoolSport.ts#scholarshipGap` · test `sportScolaire` *(niveau, recruteurs et moyenne ; elle paie réellement les frais d’université)*

**Popularité**

- `COMPLETE` Popularité dans l’établissement — `systems/school.ts#advanceClassLife` · test `ecole`
- `COMPLETE` Standing dans son groupe — `systems/schoolActions.ts#joinPeerGroup` · test `ecole`
- `PARTIAL` Réputation scolaire distincte — `systems/school.ts#advanceClassLife` · test `ecole` *(popularité et réputation générale se confondent en partie)*

**Supérieur**

- `COMPLETE` Candidater à l’université — `systems/education.ts#enrollUniversity` · test `ecole`
- `COMPLETE` Choisir une filière — `data/degrees.ts` · test `ecole`
- `COMPLETE` Être refusé — `systems/education.ts#enrollUniversity` · test `ecole`
- `COMPLETE` Bourse — `systems/education.ts#applyScholarship` · test `ecole`
- `COMPLETE` Prêt étudiant — `systems/finance.ts#addLoan` · test `ecole`
- `COMPLETE` Les parents paient — `systems/finance.ts#familySupport` · test `milieu`
- `COMPLETE` Formation professionnelle — `systems/education.ts#enrollVocational` · test `ecole`
- `COMPLETE` Cycle supérieur — `systems/education.ts#enrollGraduate` · test `ecole`
- `PARTIAL` Écoles spécialisées par pays — `data/degrees.ts` *(les cursus existent ; ils ne varient pas selon le pays)*
- `PARTIAL` Vie étudiante — `systems/cohort.ts#spendYear` · test `promotion` *(une promotion de trois à quatre personnes, et trois façons de passer l’année qui s’arbitrent — réviser paie en notes, sortir paie en confrères ; ceux qu’on garde pèsent à l’embauche, mais seulement dans la filière du diplôme et deux ans après leur sortie. Restent absents : professeurs et logement étudiant)*
- `COMPLETE` Abandonner ses études supérieures — `systems/education.ts#dropOut` · test `ecole`

### Relations

**Registre**

- `COMPLETE` Une bibliothèque d’actions filtrée par contexte — `systems/actions.ts#getAvailableActions` · test `choix` *(quatre contextes et la famille adulte ; mesuré, une mère passe de 10 actions sur toute une vie à 15, et de 8 identiques à tout âge à un menu qui change à 6, 16, 35 et 70 ans)*
- `COMPLETE` La manière de s’y prendre — `data/approaches.ts#APPROACHES` · test `choix` *(dix tons, et aucun n’est meilleur partout : ce qui monte les chances coûte sur le lien, et ce qui décide vraiment est le caractère de la personne — qu’on ne connaît que si on l’a découvert)*
- `COMPLETE` Une décision en crée d’autres — `systems/socialActs.ts#lend` · test `choix` *(prêter ouvre « réclamer », rendre service ouvre « demander ce service », promettre ouvre une échéance que le moteur vérifie seul à la fin de l’année)*
- `COMPLETE` Chaque action bloquée dit pourquoi — `systems/actions.ts#getAvailableActions` · test `travail`
- `COMPLETE` Lien et opinion distincts — `engine/types.ts#Person` · test `life`

**Types**

- `COMPLETE` Mère et père — `systems/household.ts#buildHousehold` · test `milieu`
- `COMPLETE` Beaux-parents — `systems/household.ts#buildHousehold` · test `milieu`
- `COMPLETE` Frères et sœurs — `systems/household.ts#buildHousehold` · test `milieu`
- `COMPLETE` Grands-parents — `systems/childhood.ts#grandparents` · test `enfance`
- `COMPLETE` Oncles, tantes, cousins — `systems/lineage.ts#relationTo` · test `lignee`
- `COMPLETE` Amis — `systems/relationships.ts#makeFriend` · test `life`
- `PARTIAL` Meilleur ami — `systems/relationships.ts#advanceRelationships` *(le statut existe ; rien ne permet de le viser)*
- `COMPLETE` Ennemis — `systems/grudges.ts#wrong` · test `inimities` *(une rancune naît d’un tort commis envers quelqu’un dont l’opinion est déjà basse, puis elle agit : rumeur, gens montés contre vous, route barrée au travail — mesuré avant, douze insultes laissaient la relation intacte)*
- `COMPLETE` Conjoint — `systems/relationships.ts#marry` · test `life`
- `COMPLETE` Partenaire — `systems/relationships.ts#startRelationship` · test `life`
- `COMPLETE` Ex — `systems/relationships.ts#breakUp` · test `life`
- `COMPLETE` Enfants — `systems/relationships.ts#deliverBaby` · test `lignee`
- `COMPLETE` Petits-enfants — `systems/lineage.ts#relationTo` · test `lignee`
- `COMPLETE` Collègues — `systems/workplace.ts#buildTeam` · test `travail`
- `COMPLETE` Supérieur — `systems/workplace.ts#bossOf` · test `travail`
- `COMPLETE` Camarades de classe — `systems/school.ts#classmatesOf` · test `ecole`
- `COMPLETE` Professeurs — `systems/school.ts#staffOf` · test `ecole`
- `COMPLETE` Codétenus — `systems/prison.ts#inmateAction` · test `evasion`
- `PARTIAL` Voisins — `systems/childhood.ts#neighbourhoodFriends` · test `enfance` *(les enfants du quartier existent avant douze ans ; aucun voisin adulte)*
- `COMPLETE` Locataires — `systems/tenancy.ts#acceptTenant` · test `locataires`
- `COMPLETE` Contacts du milieu — `systems/underworld.ts#contactsOf` · test `milieu`

**Actions**

- `COMPLETE` Passer du temps — `systems/relationships.ts#interact` · test `life`
- `COMPLETE` Complimenter — `systems/relationships.ts#interact` · test `life`
- `COMPLETE` Insulter — `systems/relationships.ts#interact` · test `life`
- `COMPLETE` Se disputer — `systems/relationships.ts#interact` · test `life`
- `COMPLETE` Offrir un cadeau — `systems/relationships.ts#interact` · test `life`
- `COMPLETE` Donner de l’argent — `systems/finance.ts#giveMoney` · test `life`
- `COMPLETE` Demander de l’argent — `systems/finance.ts#askForMoney` · test `demander`
- `COMPLETE` Demander conseil — `systems/relationships.ts#interact` · test `travail`
- `COMPLETE` S’excuser — `systems/grudges.ts#apologise` · test `inimities` *(avant que ce soit irréparable, ce que `reconnect` ne permettait pas — il n’ouvrait qu’une fois les ponts coupés, soit 1,2 % des gens ; ça coûte, ça peut être refusé, et le temps rend les mêmes mots audibles)*
- `COMPLETE` Se réconcilier — `systems/grudges.ts#sorryOdds` · test `inimities` *(une rancune refroidit sans jamais s’éteindre seule ; seules des excuses acceptées lèvent le plancher, après quoi elle disparaît pour de bon)*
- `MISSING` Faire une farce
- `MISSING` Partir en voyage ensemble *(les vacances existent mais sans compagnon)*
- `PARTIAL` Emprunter et rembourser — `systems/finance.ts#askForMoney` *(demander existe ; aucune dette envers un proche à rembourser)*
- `COMPLETE` Couper les ponts — `systems/relationships.ts#interact` · test `inimities` *(la note « le joueur ne le décide jamais » était périmée : `cutTies` est un bouton depuis longtemps — et il laisse désormais une rancune plutôt qu’un simple silence)*

**Amour**

- `COMPLETE` Rencontrer quelqu’un — `systems/relationships.ts#meetRomanticProspect` · test `life`
- `COMPLETE` Application de rencontre — `systems/matching.ts#writeTo` · test `rencontres` *(six profils par an et deux messages : un profil montre deux traits (toujours vrai) et en affirme trois (vrai une fois sur deux), dont un que le profil montre aussi — c’est cette phrase vérifiable qui dit si la personne se décrit honnêtement ; mesuré, lire un profil vise juste 72,5 % du temps contre 58,9 % pour qui le croit sur parole)*
- `COMPLETE` Profils à comparer — `systems/matching.ts#profilesFor` · test `rencontres` *(la liste de l’année est tirée de la graine et ne change pas si on la rouvre : on ne relance pas jusqu’à tomber sur quelqu’un)*
- `COMPLETE` Rester sans réponse — `systems/matching.ts#odds` · test `rencontres` *(un profil très sollicité répond trois fois moins souvent ; avec deux messages par an, viser haut est un pari)*
- `COMPLETE` Orientation respectée — `systems/relationships.ts#isRomanticallyCompatible` · test `life`
- `COMPLETE` Se mettre en couple — `systems/relationships.ts#startRelationship` · test `life`
- `COMPLETE` Demander en mariage — `systems/relationships.ts#propose` · test `life`
- `COMPLETE` Bague de fiançailles — `systems/activities.ts#buyEngagementRing` · test `life`
- `COMPLETE` Se marier — `systems/relationships.ts#marry` · test `life`
- `COMPLETE` Contrat de mariage — `systems/relationships.ts#signPrenup` · test `life`
- `COMPLETE` Rompre — `systems/relationships.ts#breakUp` · test `life`
- `COMPLETE` Divorcer — `systems/relationships.ts#divorce` · test `life`
- `COMPLETE` Choisir un avocat de divorce — `data/separation.ts#COUNSELS` · test `separation` *(trois représentations et quatre postures ; aucune ne domine les autres — l’argent, les enfants et la paix se disputent la même procédure, et l’aperçu dit à l’avance ce qu’elle donnerait)*
- `COMPLETE` Garde des enfants — `systems/separation.ts#custodyScore` · test `separation` *(ce qu’on a fait de leur enfance pèse plus que l’avocat ; l’enfant qui part cesse réellement de s’élever — l’ancienne procédure les comptait pour fixer une pension puis les laissait où ils étaient)*
- `MISSING` Mariage : lieu, budget, invités *(se marier est instantané et gratuit)*
- `COMPLETE` Rendez-vous galant — `systems/dates.ts#settleDate` · test `rendezvous` *(huit endroits et douze moments à trois réponses ; ce qu’une soirée met à l’épreuve, on l’apprend — mesuré, un joueur qui sort finit avec des partenaires loyaux à 60 % contre 49 % pour qui se contente de cliquer)*
- `PARTIAL` Infidélité — `data/events/relationships.ts` *(des événements de tromperie existent ; le joueur ne peut pas en décider)*
- `MISSING` Renouveler ses vœux

**Enfants**

- `COMPLETE` Essayer d’avoir un enfant — `systems/relationships.ts#tryForBaby` · test `life`
- `COMPLETE` Naissance — `systems/relationships.ts#deliverBaby` · test `lignee`
- `BASIC` Traitement de fertilité — `systems/activities.ts#fertilityTreatment` *(un bouton, un coût, un bonus permanent)*
- `BASIC` Adopter — `systems/activities.ts#adoptChild` *(ni profils, ni dossier, ni délai, ni refus)*
- `COMPLETE` Élever : discipline et attention — `systems/upbringing.ts#rear` · test `elever` *(six gestes, deux par enfant et par an ; la main donnée agit chaque année et les deux extrêmes sont mesurément pires que la bande du milieu)*
- `COMPLETE` Payer les études de son enfant — `data/upbringing.ts#REARINGS` · test `elever` *(l’argent compte et perd contre la présence — mesuré sur sept façons d’élever, pas affirmé)*
- `COMPLETE` Suivre sa scolarité — `systems/upbringing.ts#advanceUpbringing` · test `elever` *(une moyenne qui suit ce qu’on suit et ce qu’il vaut)*
- `COMPLETE` L’enfant élevé devient le personnage suivant — `systems/upbringing.ts#settleChildhood` · test `elever` *(la seule boucle complète du jeu : ce qu’on écrit dans une enfance est ce que `continueAs` reprend)*
- `MISSING` Choisir son école *(on paie « ce qu’il faut » sans choisir d’établissement)*
- `COMPLETE` Coût des enfants — `systems/finance.ts#familyCost` · test `life`

### Enfance

**Activités**

- `COMPLETE` Faire quelque chose avec sa famille — `systems/childhood.ts#doFamilyActivity` · test `enfance`
- `COMPLETE` Choisir avec qui — `systems/childhood.ts#companionsFor` · test `enfance`
- `COMPLETE` L’engagement de l’adulte compte — `systems/childhood.ts#engagementOf` · test `enfance`
- `COMPLETE` Ça sème des goûts — `systems/exposure.ts#exposureTo` · test `enfance`
- `COMPLETE` Sortir voir les enfants du quartier — `systems/childhood.ts#meetNeighbourChild` · test `enfance`

**Demander**

- `COMPLETE` Demander un objet — `systems/asking.ts#askParent` · test `demander`
- `COMPLETE` Demander une permission — `systems/asking.ts#availableRequests` · test `demander`
- `COMPLETE` Demander de l’argent de poche — `systems/finance.ts#allowance` · test `demander`
- `COMPLETE` Demander un animal — `systems/asking.ts#availableRequests` · test `demander`
- `COMPLETE` Négocier une contrepartie — `systems/asking.ts#settleConditions` · test `demander`

**Densité**

- `PARTIAL` Événements avant six ans — `data/events/childhood.ts` · test `enfance` *(quatorze événements éligibles avant cinq ans, contre une quarantaine à l’âge adulte)*

### Carrière

**Recherche**

- `COMPLETE` Marché d’offres persistant — `systems/careers.ts#applyToJob` · test `travail`
- `COMPLETE` Offres renouvelées chaque année — `systems/markets.ts#refreshMarkets` · test `travail`
- `COMPLETE` Conditions d’accès vérifiées — `systems/careers.ts#offerBlocker` · test `travail`
- `COMPLETE` Refus expliqué — `systems/careers.ts#offerBlocker` · test `travail`
- `PARTIAL` Temps partiel — `systems/workplace.ts#setHours` · test `travail` *(on réduit ses heures dans un poste ; aucune offre à temps partiel dédiée)*
- `PARTIAL` Petits boulots adolescents — `data/jobs.ts` · test `travail` *(les métiers existent dès quatorze ans mais rien n’arbitre école contre travail)*

**Entretien**

- `COMPLETE` Entretien jouable — `systems/interview.ts#fitOf` · test `entretien` *(quatre questions à trois réponses ; l’employeur tient à deux registres sur quatre et ne le dit pas — mesuré, qui devine un registre répond juste à 84 % contre 64 % en laissant faire et 50 % à l’aveugle, soit un facteur d’embauche de 1,42 contre 1,21 et 1,05)*

**Poste**

- `COMPLETE` Salaire, heures, performance — `systems/workplace.ts#setHours` · test `travail`
- `COMPLETE` Implication choisie — `systems/careers.ts#setWorkEffort` · test `travail`
- `COMPLETE` Satisfaction distincte de la performance — `systems/workplace.ts#computeSatisfaction` · test `travail`
- `COMPLETE` Congés — `systems/workplace.ts#takeLeave` · test `travail`
- `COMPLETE` Changer d’horaires — `systems/workplace.ts#setHours` · test `travail`
- `COMPLETE` Demander une mutation — `systems/workplace.ts#requestTransfer` · test `travail`

**Équipe**

- `COMPLETE` Collègues, rivaux, mentor — `systems/workplace.ts#buildTeam` · test `travail`
- `COMPLETE` Actions de bureau — `systems/workplace.ts#workAction` · test `travail`
- `COMPLETE` Le soutien pèse sur la carrière — `systems/workplace.ts#workplaceSupport` · test `travail`

**Promotion**

- `COMPLETE` Demander une augmentation — `systems/careers.ts#askForRaise` · test `travail`
- `COMPLETE` Demander une promotion — `systems/workplace.ts#askPromotion` · test `travail`
- `COMPLETE` Échelle hiérarchique complète — `systems/careers.ts#promote` · test `travail`
- `COMPLETE` Rétrogradation — `systems/careers.ts#demote` · test `travail`

**Sortie**

- `COMPLETE` Démissionner — `systems/careers.ts#quitJob` · test `travail`
- `COMPLETE` Avertissements au dossier — `systems/workplace.ts#advanceWorkplace` · test `travail`
- `COMPLETE` Licenciement — `systems/careers.ts#fire` · test `travail`
- `MISSING` Contester un licenciement *(aucun entretien préalable, aucun recours, aucune seconde chance)*

**Retraite**

- `COMPLETE` Liquider sa pension — `systems/careers.ts#retire` · test `travail`
- `COMPLETE` Pension calculée sur la carrière — `systems/careers.ts#retire` · test `travail`
- `PARTIAL` Vie de retraité — `data/events/misc.ts` *(des événements de senior existent ; aucune activité propre à la retraite)*

**Cumul**

- `MISSING` Deuxième employeur *(un seul contrat de travail à la fois)*
- `COMPLETE` Budget de temps partagé — `systems/venture.ts#timeBudget` · test `independant`

**Historique**

- `COMPLETE` Parcours conservé — `engine/types.ts#Player` · test `travail`

**Collection**

- `MISSING` Registre des métiers exercés *(aucune collection de carrières : exercer trente métiers ne laisse aucune trace)*

**Événements**

- `PARTIAL` Banque d’événements professionnels — `data/events/adult.ts` *(une dizaine d’événements de travail pour quarante ans de carrière)*

### Travail

**Indépendant**

- `COMPLETE` Vingt métiers à son compte — `systems/venture.ts#startFreelance` · test `independant`
- `COMPLETE` Fixer son tarif — `systems/venture.ts#setFee` · test `independant`
- `COMPLETE` Clientèle qui se construit et s’érode — `systems/venture.ts#expectedMissions` · test `independant`
- `COMPLETE` Commandes nommées à prendre ou laisser — `systems/venture.ts#takeGig` · test `independant`
- `COMPLETE` Litiges et impayés — `systems/venture.ts#advanceVentures` · test `independant`

**Temps**

- `COMPLETE` Le temps est fini — `systems/venture.ts#timeBudget` · test `independant`

### Entreprise

**Création**

- `COMPLETE` Dix-huit modèles — `systems/venture.ts#foundBusiness` · test `independant`
- `COMPLETE` Apport et emprunt professionnel — `systems/venture.ts#borrowable` · test `independant`

**Gestion**

- `COMPLETE` Arbitrer capacité et demande — `systems/venture.ts#forecast` · test `independant`
- `COMPLETE` Embaucher et licencier — `systems/venture.ts#hireStaff` · test `independant`
- `COMPLETE` Politique de prix — `systems/venture.ts#setPricing` · test `independant`
- `COMPLETE` Présence du patron — `systems/venture.ts#setInvolvement` · test `independant`
- `COMPLETE` Investir en qualité ou en notoriété — `systems/venture.ts#investInBusiness` · test `independant`
- `COMPLETE` Trésorerie propre et prélèvements — `systems/venture.ts#drawFromBusiness` · test `independant`
- `COMPLETE` Gérant salarié — `systems/venture.ts#hireManager` · test `independant`

**Sortie**

- `COMPLETE` Repreneurs et clauses — `systems/venture.ts#listBusiness` · test `independant`
- `COMPLETE` Dépôt de bilan et caution personnelle — `systems/venture.ts#closeBusiness` · test `independant`

**Produit**

- `MISSING` Un produit avec qualité et demande propres *(l’entreprise vend « du chiffre » : aucun produit nommé, aucun lancement)*

**Employés**

- `MISSING` Salariés comme PNJ *(l’effectif est un nombre ; seul le gérant est une personne)*

**Événements**

- `COMPLETE` Fournisseur, concurrent, conflit social — `data/events/venture.ts` · test `independant`

### Carrières spéciales

**Scène**

- `COMPLETE` Choisir une discipline — `systems/stage.ts#startDiscipline` · test `scene` *(cinq métiers, un seul cadre : on ne postule pas, on est appelé)*
- `COMPLETE` Métier acquis — `systems/stage.ts#craftLabel` · test `scene` *(c’est lui qui décide de ce qu’on vous propose ; il se perd quand on ne travaille pas)*
- `COMPLETE` Propositions filtrées par le niveau — `systems/stage.ts#rollOffers` · test `scene` *(on ne voit pas ce qu’on ne mérite pas, ni ce qu’on a dépassé)*
- `COMPLETE` Accepter ou refuser — `systems/stage.ts#acceptOffer` · test `scene` *(refuser n’est pas gratuit ; deux engagements par an au plus)*
- `COMPLETE` Accueil du public — `systems/stage.ts#settleJob` · test `scene` *(décide du cachet, du métier gagné, du nom et de ce qu’on proposera ensuite)*
- `COMPLETE` Prendre plus grand que soi — `systems/stage.ts#settleJob` · test `scene` *(l’enjeu module l’accueil : réussir un rôle facile n’impressionne personne)*
- `INTERACTIVE` Tenir devant un public — `systems/stage.ts#performanceContext` · mini-jeu `performance` · test `scene` *(suivre une ligne, tenir les moments ; ne rien tenter est le pire résultat)*
- `COMPLETE` Résolution sans jouer — `systems/stage.ts#autoPerform` · test `scene` *(même chemin de conséquences, jamais plus favorable que bien jouer)*
- `COMPLETE` Fatigue et usure — `systems/stage.ts#advanceStage` · test `scene` *(retranche à la prestation, se récupère lentement)*
- `COMPLETE` Déclin par l’âge — `systems/stage.ts#ageFactor` · test `scene` *(pente propre à chaque métier : brutale au sport, nulle en politique)*
- `COMPLETE` Engagement non honoré — `systems/stage.ts#advanceStage` · test `scene` *(se solde tout seul à la fin de l’année, et mal)*
- `COMPLETE` Changer de voie — `systems/stage.ts#quitDiscipline` · test `scene` *(ce qu’on savait faire ailleurs compte un peu, jamais entièrement)*
- `COMPLETE` Cachets imposés — `systems/stage.ts#stageEarnings` · test `scene` *(crédités à la signature, imposés au bilan, jamais encaissés deux fois)*
- `COMPLETE` Ceux avec qui on exerce — `systems/stage.ts#crewQuality` · test `scene` *(un seul entourage pour les cinq métiers, avec un poids propre à chacun)*
- `COMPLETE` Entente du groupe — `systems/stage.ts#rehearse` · test `scene` *(on ne garde pas les gens en les recrutant ; cinq très bons qui se détestent jouent moins bien que trois qui s’écoutent)*
- `COMPLETE` Départs et débauchages — `systems/stage.ts#advanceStage` · test `scene` *(on perd celui qu’on ne fait pas jouer et on use celui qu’on ne fait pas travailler)*
- `COMPLETE` Ce que l’entourage prend — `systems/stage.ts#crewCut` · test `scene` *(un grand groupe joue mieux et laisse moins)*
- `COMPLETE` Sur scène depuis le Parcours — `systems/stage.ts#stageOf` · test `scene` *(la carrière est visible depuis l’écran principal, pas cachée dans un menu)*

**Acteur**

- `COMPLETE` Le métier — `data/stage.ts#DISCIPLINES` · test `scene` *(le poste salarié « Comédien » a quitté la grille : le métier est la carrière jouée, et il n’existe plus en double)*
- `INTERACTIVE` Auditions — `systems/casting.ts#askTryout` · mini-jeu `performance` · test `essai` *(une deuxième liste : ce pour quoi on peut essayer, jusqu’à trente points au-dessus de soi. L’essai se joue, il est court, et l’on peut rentrer les mains vides)*
- `COMPLETE` Manière de jouer l’essai — `data/casting.ts#APPROACHES` · test `essai` *(jouer ce qu’on attend passe souvent et ne mène nulle part ; jouer contre son type passe rarement et change une carrière)*
- `COMPLETE` Rôles à choisir — `data/stage.ts#JOB_TEMPLATES` · test `scene` *(neuf rôles, de la figuration au premier rôle ; le mieux payé n’est pas le plus utile)*
- `COMPLETE` Agent — `systems/stage.ts#hireAgent` · test `scene` *(un vrai PNJ : plus de propositions, mieux payées, quinze pour cent de tout)*
- `COMPLETE` Progression du talent — `systems/stage.ts#settleJob` · test `scene` *(on progresse d’autant plus qu’on s’est étiré)*
- `COMPLETE` Récompenses — `data/stage.ts#ACCOLADES` · test `scene` *(trois prix, chacun avec ses conditions ; jamais deux fois)*
- `INTERACTIVE` Mini-jeu de jeu d’acteur — `systems/minigames/performance.ts#performance` · mini-jeu `performance` · test `scene` *(suivre l’émotion, tenir les répliques ; le jeu est commun aux cinq métiers)*

**Musique**

- `COMPLETE` Le métier — `data/stage.ts#DISCIPLINES` · test `scene` *(le poste salarié « Musicien » a quitté la grille : plus de carrière fantôme payée au mois à côté de celle qu’on joue)*
- `COMPLETE` Apprendre un instrument — `systems/stage.ts#craftLabel` · test `scene` *(l’instrument est le métier acquis : il monte en jouant, il se perd sans)*
- `COMPLETE` Groupe et compagnons — `systems/stage.ts#crewOf` · test `scene` *(auditions, répétitions et départs ; un groupe qui joue mal tire la prestation vers le bas)*
- `COMPLETE` Maison de disques — `data/records.ts#LABELS` · test `disque` *(quatre niveaux ; elle avance, elle pousse, elle prend sa part et elle impose le format — plus elle est grande, moins on choisit)*
- `COMPLETE` Sortir un titre ou un album — `systems/records.ts#startRecording` · test `disque` *(six formats, un classement qui monte puis retombe à la vitesse du format, et des droits qui tombent chaque année tant qu’on est classé)*
- `COMPLETE` Droits et revenus du catalogue — `systems/records.ts#royaltyFor` · test `disque` *(le premier revenu d’une carrière de scène qui tombe sans qu’on travaille ; la première place vaut plusieurs fois la dixième)*
- `COMPLETE` Tournée — `systems/records.ts#hitTheRoad` · test `disque` *(on pose ses dates salle par salle ; réserver plus grand paie si le public suit et coûte la salle vide sinon, et trop de dates finissent par sauter)*
- `INTERACTIVE` Mini-jeu de rythme — `systems/minigames/performance.ts#performance` · mini-jeu `performance` · test `scene` *(suivre la note, tenir les envolées ; pas un jeu de rythme propre à la musique)*

**Sport**

- `COMPLETE` Le métier — `data/stage.ts#DISCIPLINES` · test `scene` *(le poste salarié « Sportif professionnel » a quitté la grille : la filière scolaire mène à la carrière jouée, pas à une fiche de paie)*
- `COMPLETE` Filière scolaire vers le professionnel — `systems/schoolSport.ts#sportHeadStart` · test `sportScolaire` *(dix ans de lycée démarrent la carrière ailleurs qu’à zéro : c’est le raccord qui manquait)*
- `COMPLETE` Équipe, entraîneur, coéquipiers — `systems/stage.ts#hireCoach` · test `scene` *(de vrais coéquipiers et un entraîneur ; c’est au sport qu’ils pèsent le plus)*
- `COMPLETE` Contrats pluriannuels — `systems/stage.ts#signContract` · test `scene` *(la sécurité contre la liberté : garanti chaque année, et interdit de prendre mieux ailleurs)*
- `COMPLETE` Blessures — `systems/stage.ts#settleJob` · test `scene` *(propre au sport, liée à l’usure ; écarte plusieurs années et coûte de la santé)*
- `COMPLETE` Titres et récompenses — `data/stage.ts#ACCOLADES` · test `scene`
- `PARTIAL` Mini-jeux sportifs — `systems/minigames/performance.ts#performance` · mini-jeu `performance` · test `scene` *(une épreuve jouable, mais la même pour tous les sports)*

**Politique**

- `COMPLETE` Le métier — `data/stage.ts#DISCIPLINES` · test `scene` *(le poste salarié « Politique » a quitté la grille : on ne devient pas maire en postulant, on se présente)*
- `COMPLETE` Campagne électorale — `systems/politics.ts#declareRun` · test `tribune` *(cinq sièges, six coups à jouer, un programme de trois axes au plus et un adversaire nommé)*
- `COMPLETE` Programme et promesses — `data/politics.ts#PLANKS` · test `tribune` *(aucun axe ne plaît à tout le monde, et deux axes peuvent se contredire — ceux qui lisent le programme le remarquent)*
- `COMPLETE` Budget de campagne — `data/politics.ts#FUNDING` · test `tribune` *(collecte, gros donateurs, fortune personnelle ; l’argent facile se paie en casseroles pendant le mandat)*
- `COMPLETE` Sondages et adversaire — `data/politics.ts#BLOCS` · test `tribune` *(six blocs qui pèsent leur taille fois leur participation ; l’adversaire est un PNJ qui fait sa propre campagne)*
- `INTERACTIVE` Débat télévisé — `systems/politics.ts#settleDebate` · mini-jeu `performance` · test `tribune` *(le seul coup qui dépende du joueur et non de sa caisse ; il déplace dans les deux sens)*
- `COMPLETE` Exercer le mandat — `data/politics.ts#DECISIONS` · test `tribune` *(une décision par an, et aucune option ne contente tout le monde — un test le vérifie sur tout le catalogue)*
- `COMPLETE` Réélection et scandales — `systems/politics.ts#holdElection` · test `tribune` *(un vrai scrutin, et l’opinion laissée par le mandat en est le point de départ ; une affaire peut sortir avant le vote)*

**Mannequin**

- `COMPLETE` Le métier — `data/stage.ts#DISCIPLINES` · test `scene` *(le poste salarié « Mannequin » a quitté la grille : les contrats se prennent un par un, pas au mois)*
- `COMPLETE` Agence et book — `systems/casting.ts#bookStrength` · test `essai` *(un book qui vaut par sa variété et non son épaisseur, qui vieillit, et sans lequel aucune agence ne vous reçoit)*
- `COMPLETE` Castings et défilés — `data/stage.ts#JOB_TEMPLATES` · test `scene` *(six contrats, du catalogue à l’égérie, sur une carrière volontairement courte)*
- `INTERACTIVE` Mini-jeu de pose — `systems/minigames/performance.ts#performance` · mini-jeu `performance` · test `scene` *(tenir la ligne du corps, tenir les passages)*

**Astronaute**

- `COMPLETE` Sélection et formation — `systems/service.ts#enlist` · test `service` *(diplôme, condition physique et casier vide ; trois ans d’entraînement avant qu’on ne confie quoi que ce soit)*
- `COMPLETE` Missions — `data/service.ts#DUTIES` · test `service` *(huit affectations, du simulateur à la mission lointaine ; certaines durent des années et l’on peut ne pas revenir)*
- `INTERACTIVE` Mini-jeux de mission — `systems/minigames/docking.ts#docking` · mini-jeu `docking` · test `service` *(un problème d’inertie : on pousse, la machine continue, et il faut arriver aligné et lent)*

**Agent secret**

- `COMPLETE` Agence fictive — `data/service.ts#CORPS` · test `service` *(une maison sans nom réel, où l’on ne postule pas : elle approche qui a déjà le profil, et donne une couverture)*
- `COMPLETE` Missions — `data/service.ts#DUTIES` · test `service` *(huit opérations entièrement fictives, sans lieu ni méthode ; c’est le métier le plus dangereux des trois)*
- `INTERACTIVE` Mini-jeux d’infiltration — `systems/minigames/infiltration.ts#infiltration` · mini-jeu `infiltration` · test `service` *(une jauge d’attention et des passages : attendre son moment ou pousser. Abstrait de bout en bout, rien d’applicable)*

**Militaire**

- `COMPLETE` Engagement — `systems/service.ts#enlist` · test `service` *(une sélection qu’on peut rater, des classes, et une solde réduite tant qu’elles durent)*
- `COMPLETE` Grades et avancement — `data/service.ts#RANKS` · test `service` *(sept échelons ; il faut la réputation *et* l’ancienneté, et l’on ne monte que d’un par an)*
- `COMPLETE` Déploiements — `systems/service.ts#rollDuties` · test `service` *(ce qu’on vous propose dépend du grade et de la préparation ; décliner coûte de la réputation)*
- `COMPLETE` Blessures et pertes — `systems/service.ts#settleDuty` · test `service` *(une mission peut écarter plusieurs années ou tuer ; bien la mener réduit ce qu’elle coûte)*
- `COMPLETE` Décorations — `data/service.ts#DECORATIONS` · test `service` *(quatre par maison ; certaines ne se donnent qu’aux blessés)*
- `COMPLETE` Fin de service et pension — `systems/service.ts#leaveService` · test `service` *(honneurs, fin de contrat ou réforme ; le dossier et la pension survivent à la sortie)*

**Médecine**

- `COMPLETE` Cursus long — `data/degrees.ts` · test `ecole`

**Course automobile**

- `MISSING` Écurie et championnat

**Zoo**

- `MISSING` Gérer un parc animalier

**Casino**

- `MISSING` Exploiter un casino

**Royauté**

- `COMPLETE` Naître dans une maison régnante — `systems/royalty.ts#maybeBornRoyal` · test `couronne` *(rare et tiré de la graine seule ; jamais directement sur le trône)*
- `COMPLETE` Entrer par le mariage — `systems/royalty.ts#seekPresentation` · test `couronne` *(une présentation crée un PNJ ; le reste est un mariage ordinaire, et un conjoint n’a jamais de place dans l’ordre)*
- `COMPLETE` Être anobli pour services rendus — `systems/royalty.ts#ennoble` · test `couronne` *(six services possibles, trois exigés ; la fortune seule n’ouvre rien)*
- `COMPLETE` Titres et rangs — `data/royalty.ts#TITLES` · test `couronne` *(cinq rangs fictifs ; la rente, le devoir attendu et l’exposition montent ensemble)*
- `COMPLETE` Ordre de succession — `systems/royalty.ts#succession` · test `couronne` *(aucune action ne fait monter d’une place ; la file se vide par les morts et se remplit par les naissances)*
- `COMPLETE` Accession au trône — `systems/royalty.ts#advanceRoyalty` · test `couronne`
- `COMPLETE` Devoirs et engagements — `data/royalty.ts#DUTIES` · test `couronne` *(huit engagements, cinq aptitudes distinctes, et un quota annuel que le rang fixe)*
- `COMPLETE` Le bain de foule — `systems/minigames/walkabout.ts#walkabout` · mini-jeu `walkabout` · test `couronne` *(l’allure et le choix de qui l’on fait attendre ; il faut arriver au bout)*
- `COMPLETE` Opinion sur soi et sur la couronne — `systems/royalty.ts#advanceRoyalty` · test `couronne` *(deux jauges jamais confondues ; la lente décide de la survie de l’institution)*
- `COMPLETE` Affaires à trancher — `data/royalty.ts#AFFAIRS` · test `couronne` *(sept affaires ; aucune option sans perdant, et le silence coûte)*
- `COMPLETE` Scandales et retrait du rang — `systems/royalty.ts#disgrace` · test `couronne` *(le poids récent des affaires, pas leur nombre ; une maison protège qui la sert)*
- `COMPLETE` Abdication — `systems/royalty.ts#abdicate` · test `couronne` *(on sort de la file définitivement et l’on descend de deux rangs)*
- `COMPLETE` Abolition de la couronne — `systems/royalty.ts#advanceRoyalty` · test `couronne` *(quatre années consécutives sous le seuil ; personne ne la retrouve)*
- `COMPLETE` Transmission du rang à l’héritier — `systems/royalty.ts#inheritCrown` · test `couronne` *(la seule chose du jeu qui se transmette en montant ; un titre d’anobli s’éteint en trois générations)*
- `MISSING` Cour et vie de palais *(aucune intrigue interne : la maison n’a pas de factions ni de rivalités nommées)*
- `MISSING` Diplomatie entre maisons *(les visites au-dehors sont un engagement, pas une relation suivie avec une autre maison)*

**Communauté**

- `MISSING` Fonder un mouvement

### Activités

**Corps**

- `COMPLETE` Faire du sport — `systems/activities.ts#doSport` · test `engine`
- `COMPLETE` L’accès dépend du quartier — `systems/activities.ts#sportAvailable` · test `environnement`
- `COMPLETE` Bien-être et détente — `systems/activities.ts#doWellness` · test `engine`
- `PARTIAL` Méditation — `data/activities.ts` *(une entrée du catalogue bien-être, sans progression propre)*
- `MISSING` Régime alimentaire *(aucun régime à suivre, aucun effet progressif)*
- `MISSING` Arts martiaux avec grades
- `MISSING` Lecture avec progression *(aucun livre, aucune bibliothèque, aucune progression de lecture)*
- `PARTIAL` Jardinage — `data/childhood.ts` · test `enfance` *(seulement comme activité d’enfance)*

**Sorties**

- `COMPLETE` Sortir le soir — `systems/activities.ts#goOut` · test `engine`
- `BASIC` Vacances — `systems/activities.ts#takeVacation` *(destination et budget existent ; ni classe de voyage, ni compagnon, ni événement de séjour)*
- `MISSING` Activités de plein air *(randonnée, camping, pêche, escalade)*

**Animaux**

- `COMPLETE` Adopter un animal — `systems/activities.ts#adoptPetSpecies` · test `engine`
- `COMPLETE` Jouer avec son animal — `systems/activities.ts#playWithPet` · test `engine`
- `COMPLETE` Vétérinaire — `systems/activities.ts#vetVisit` · test `engine`
- `COMPLETE` Vieillissement et mort — `systems/activities.ts#advancePets` · test `engine`
- `MISSING` Provenance : refuge, éleveur, animalerie
- `MISSING` Promener, laver, dresser
- `MISSING` Donner ou rendre un animal
- `PARTIAL` Événements d’animaux — `data/events/everyday.ts` *(quelques événements ; loin d’une vraie banque)*

**Achats**

- `COMPLETE` Boutique d’objets — `systems/activities.ts#buyItem` · test `engine`
- `COMPLETE` Revendre un objet — `systems/activities.ts#sellValuable` · test `engine`
- `COMPLETE` Canaux de revente différents — `data/activities.ts` · test `engine`
- `MISSING` Offrir un objet à quelqu’un

**Administratif**

- `BASIC` Changer de nom — `systems/activities.ts#changeName` *(aucune conséquence : ni réputation, ni réaction des proches)*
- `BASIC` Permis de conduire — `systems/activities.ts#getDrivingLicense` *(un tirage : aucun examen jouable)*
- `MISSING` Permis bateau et pilote
- `COMPLETE` Testament — `systems/activities.ts#updateWill` · test `life`

**Jeu**

- `BASIC` Loterie — `systems/activities.ts#playLottery` *(un tirage : ni billet, ni numéros, ni tirage à regarder)*
- `INTERACTIVE` Casino — `systems/minigames/table.ts#TABLE` · mini-jeu `table` · test `table` *(une table jouable : retourner un jeton ou empocher, et suivre ce qui est sorti du sac est un vrai avantage — mesuré, un joueur attentif finit devant un joueur au jugé. La maison garde sa part)*
- `INTERACTIVE` Jeu de table jouable — `systems/minigames/table.ts#bustOdds` · mini-jeu `table` · test `table` *(un jeu entièrement fictif plutôt qu’un jeu de casino réel : ni cartes, ni tapis, ni règle empruntée — une rangée de jetons et une seule décision répétée)*
- `MISSING` Roulette jouable
- `MISSING` Machine à sous jouable
- `MISSING` Courses hippiques
- `MISSING` Paris sportifs

### Santé

**Maladies**

- `COMPLETE` Catalogue de pathologies — `data/diseases.ts` · test `engine`
- `COMPLETE` Apparition contextuelle — `systems/health.ts#rollNewIllness` · test `engine`
- `COMPLETE` Gravité et progression — `systems/health.ts#advanceDiseases` · test `engine`
- `COMPLETE` Se soigner — `systems/health.ts#treatDisease` · test `engine`
- `COMPLETE` Coût des soins selon le pays — `systems/health.ts#treatmentCost` · test `engine`
- `COMPLETE` Consultation — `systems/health.ts#consult` · test `engine`
- `COMPLETE` Blessures — `systems/health.ts#injure` · test `engine`

**Praticiens**

- `MISSING` Choisir son médecin *(les soins sont anonymes : ni praticien, ni réputation, ni prix comparés)*
- `MISSING` Spécialistes

**Urgences**

- `PARTIAL` Événement médical urgent — `data/events/adult.ts` *(des événements de santé existent ; aucune urgence à trancher dans l’instant)*

**Mental**

- `PARTIAL` Stress suivi et soigné — `systems/activities.ts#doWellness` · test `engine` *(le stress baisse avec le bien-être ; aucun suivi psychologique dédié)*
- `PARTIAL` Accompagnement psychologique — `systems/recovery.ts#enrol` · test `dependance` *(un suivi individuel et un groupe de parole existent, avec coût annuel, effet et rechute — mais ils ne traitent que la dépendance : ni les maladies mentales du catalogue ni le stress n’ont de suivi propre)*
- `COMPLETE` Dépendance : cure et rechute — `systems/recovery.ts#advanceRecovery` · test `dependance` *(quatre façons d’arrêter, une chance de rechute qui se lit avant de décider et double si l’on retourne jouer ; mesuré, 98 % s’en sortent en arrêtant tout et 20 % en continuant, avec seize rechutes)*

**Recours**

- `MISSING` Procédure après un soin raté

### Patrimoine

**Immobilier**

- `COMPLETE` Marché de biens — `systems/properties.ts#buyProperty` · test `locataires`
- `COMPLETE` Acheter comptant ou à crédit — `systems/properties.ts#mortgageRate` · test `locataires`
- `COMPLETE` Vendre — `systems/properties.ts#sellProperty` · test `locataires`
- `COMPLETE` Travaux et rénovation — `systems/properties.ts#renovate` · test `locataires`
- `COMPLETE` État qui se dégrade — `systems/properties.ts#advanceProperties` · test `locataires`
- `COMPLETE` Sinistres — `systems/properties.ts#advanceProperties` · test `locataires`
- `COMPLETE` Changer de résidence — `systems/properties.ts#setResidence` · test `locataires`
- `COMPLETE` Confort du logement — `systems/properties.ts#housingComfort` · test `locataires`
- `MISSING` Offrir un bien

**Locatif**

- `COMPLETE` Fixer son loyer — `systems/tenancy.ts#setAskingRent` · test `locataires`
- `COMPLETE` Publier une annonce — `systems/tenancy.ts#listForRent` · test `locataires`
- `COMPLETE` Choisir parmi des dossiers — `systems/tenancy.ts#acceptTenant` · test `locataires`
- `COMPLETE` Impayés — `systems/tenancy.ts#advanceTenancy` · test `locataires`
- `COMPLETE` Vacance locative — `systems/tenancy.ts#advanceTenancy` · test `locataires`
- `COMPLETE` Demandes de travaux à trancher — `systems/tenancy.ts#handleRepair` · test `locataires`
- `COMPLETE` Renouvellement et hausse de loyer — `systems/tenancy.ts#renewLease` · test `locataires`
- `COMPLETE` Procédure de départ — `systems/tenancy.ts#evictTenant` · test `locataires`
- `MISSING` Parler à son locataire *(on décide pour lui, on ne lui parle jamais)*
- `MISSING` Gestion déléguée

**Véhicules**

- `COMPLETE` Marché de véhicules — `systems/vehicles.ts#buyVehicle` · test `engine`
- `COMPLETE` Revendre — `systems/vehicles.ts#sellVehicle` · test `engine`
- `COMPLETE` Entretien et pannes — `systems/vehicles.ts#serviceVehicle` · test `engine`
- `COMPLETE` Kilométrage et fiabilité — `systems/vehicles.ts#advanceVehicles` · test `engine`
- `MISSING` Concessionnaires distincts
- `MISSING` Offrir un véhicule

**Bateaux**

- `MISSING` Marché dédié

**Aéronefs**

- `MISSING` Marché dédié

**Objets**

- `COMPLETE` Objets de valeur — `systems/activities.ts#advanceValuables` · test `engine`
- `COMPLETE` Authenticité et expertise — `systems/objects.ts#appraise` · test `objets` *(le doute coûte dans les deux sens : vendre sans savoir décote, et savoir peut révéler une copie. Qui sait lire juge lui-même, gratuitement et de moins en moins mal)*
- `COMPLETE` Ventes aux enchères — `systems/objects.ts#auction` · test `objets` *(la seule vente d’où l’on peut repartir avec son objet : on pose une réserve, la salle prend sa commission même si personne ne suit. Les trois « canaux » d’avant n’étaient que trois multiplicateurs)*
- `COMPLETE` Chiner hors boutique — `systems/objects.ts#hunt` · test `objets` *(brocante, vente après décès, lot fermé : on y paie une fraction du catalogue sans savoir ce qu’on rapporte. Mesuré avant : 0 % des vies possédaient le moindre objet, parce qu’on achetait au prix affiché ce qu’on revendrait à 60 %)*
- `COMPLETE` Œuvres d’art avec provenance — `data/objects.ts#PROVENANCES` · test `objets` *(chaque objet garde d’où il vient, et la provenance décide de ce qu’il a des chances d’être : moins cher veut dire moins sûr)*
- `MISSING` Objets de famille transmis

**Collections**

- `COMPLETE` Collectionner — `systems/objects.ts#setBonus` · test `objets` *(trois ensembles, comptés en pièces distinctes et authentifiées ; un ensemble complet multiplie la valeur — la seule chose du jeu qui récompense de ne *pas* vendre)*

### Finance

**Bilan**

- `COMPLETE` Revenus, charges, net annuel — `systems/finance.ts#runAnnualFinance` · test `engine`
- `COMPLETE` Patrimoine net — `systems/finance.ts#netWorth` · test `engine`
- `COMPLETE` Historique sur plusieurs exercices — `engine/types.ts#FinanceSnapshot` · test `engine`

**Coût de la vie**

- `COMPLETE` Loyer — `systems/finance.ts#annualRent` · test `engine`
- `COMPLETE` Train de vie ajusté aux revenus — `systems/finance.ts#livingCost` · test `engine`
- `COMPLETE` Charges familiales — `systems/finance.ts#familyCost` · test `engine`
- `COMPLETE` Privations quand ça ne rentre pas — `systems/finance.ts#runAnnualFinance` · test `engine`

**Fiscalité**

- `COMPLETE` Impôt progressif par pays — `systems/finance.ts#computeTax` · test `engine`
- `MISSING` Optimisation fiscale

**Aide**

- `COMPLETE` Aide sociale — `systems/finance.ts#socialSupport` · test `engine`
- `COMPLETE` Aide familiale pendant les études — `systems/finance.ts#familySupport` · test `milieu`

**Dette**

- `COMPLETE` Prêt personnel — `systems/finance.ts#takePersonalLoan` · test `engine`
- `COMPLETE` Rembourser par anticipation — `systems/finance.ts#repayLoan` · test `engine`
- `COMPLETE` Capacité d’emprunt — `systems/finance.ts#borrowingCapacity` · test `engine`
- `COMPLETE` Dépôt de bilan — `systems/finance.ts#declareBankruptcy` · test `balance`

### Placements

**Marché**

- `COMPLETE` Cours qui évoluent — `systems/investing.ts#advanceMarkets` · test `placements`
- `COMPLETE` Supports variés — `data/assets.ts` · test `placements`
- `COMPLETE` Acheter — `systems/investing.ts#invest` · test `placements`
- `COMPLETE` Vendre — `systems/investing.ts#divest` · test `placements`
- `COMPLETE` Prix de revient et plus-value — `systems/investing.ts#unrealizedGain` · test `placements`
- `COMPLETE` Ticket minimum — `systems/investing.ts#minimumTicket` · test `placements`
- `COMPLETE` Blocage de certains supports — `systems/investing.ts#isLocked` · test `placements`
- `COMPLETE` Revenus du portefeuille — `systems/investing.ts#portfolioIncome` · test `placements`
- `COMPLETE` Concentration et diversification — `systems/investing.ts#concentration` · test `placements`

**Compréhension**

- `COMPLETE` Culture financière — `systems/investing.ts#literacy` · test `placements`
- `COMPLETE` Ce qu’on voit avant d’acheter — `systems/investing.ts#assetInsight` · test `placements`

**Sociétés**

- `COMPLETE` Entreprises cotées nommées — `data/companies.ts#COMPANIES` · test `societes` *(dix maisons fictives, chacune avec son secteur, sa taille et son histoire ; ce sont des supports ordinaires — même portefeuille, mêmes frais, même impôt — et les deux anciennes lignes « grande entreprise » et « petite société » sont redevenues ce qu’elles étaient déjà en fait : des paniers)*
- `COMPLETE` Rapport annuel à lire — `systems/shares.ts#reportFor` · test `societes` *(chaque maison publie trois faits mêlant ce qui est déjà dans le cours et ce que le cours n’a pas encore vu ; mesuré sur soixante parties, lire ce qui regarde devant rend 14,6 % par an contre 8,0 % pour ce qui regarde derrière, 6,4 % au hasard et 5,6 % pour le panier)*
- `COMPLETE` Santé propre à chaque société — `systems/shares.ts#advanceCompanies` · test `societes` *(jamais affichée : elle pousse le cours de l’année suivante, ce qui laisse un an au joueur pour la lire dans le rapport — sans ce décalage, mesuré, lire l’avenir rapportait moins que lire le passé)*
- `COMPLETE` Le risque d’une part seule — `data/companies.ts#assetForCompany` · test `societes` *(une maison seule est toujours plus agitée que le panier de sa catégorie : acheter sans lire donne un premier décile à −20,1 % contre −8,6 % pour le panier, soit le risque sans la contrepartie)*
- `BASIC` Quantité de titres détenus — `systems/investing.ts#invest` · test `placements` *(le nombre de parts se lit à côté de la somme placée ; c’est un affichage, sans conséquence propre)*

**Historique**

- `BASIC` Graphique de cours — `systems/investing.ts#advanceMarkets` · test `placements` *(vingt ans de cours, sans axe ni chiffre : ce qui se lit est une forme, et cela ne décide de rien tout seul)*

**Information**

- `COMPLETE` Actualité financière — `systems/investing.ts#newsFor` · test `nouvelles` *(trois nouvelles par an qui penchent vraiment le cours : sens annoncé et sens obtenu s’accordent à 64,5 %)*
- `COMPLETE` Conseiller — `systems/investing.ts#consult` · test `nouvelles` *(il ne se trompe pas sur le sens, et appuie sur ce qui le paie)*

**Cryptomonnaie**

- `PARTIAL` Marché volatil — `data/assets.ts` · test `placements` *(un support très volatil existe ; ni portefeuille propre, ni cycles)*

**Obligations**

- `PARTIAL` Émetteur, échéance, rendement — `data/assets.ts` · test `placements` *(une ligne « obligations » sans émetteur ni maturité)*

**Transmission**

- `PARTIAL` Portefeuille transmissible — `systems/inheritance.ts#settleEstate` · test `lignee` *(la valeur est transmise en espèces ; les positions ne survivent pas)*

### Crime

**Catalogue**

- `COMPLETE` Délits variés — `data/crimes.ts` · test `life`
- `COMPLETE` Conditions d’accès — `systems/crime.ts#crimeBlocker` · test `life`

**Vol à la tire**

- `INTERACTIVE` Choisir sa cible — `systems/pickpocketing.ts#availableTargets` · mini-jeu `pickpocket` · test `minijeux`
- `INTERACTIVE` Mini-jeu jouable — `systems/pickpocketing.ts#resolvePickpocket` · mini-jeu `pickpocket` · test `minijeux`
- `COMPLETE` Simuler au lieu de jouer — `systems/pickpocketing.ts#autoPickpocket` · test `minijeux`

**Cambriolage**

- `INTERACTIVE` Repérage des maisons — `systems/burglary.ts#availableHouses` · mini-jeu `burglary` · test `minijeux`
- `INTERACTIVE` Mini-jeu de plan — `systems/burglary.ts#resolveBurglary` · mini-jeu `burglary` · test `minijeux`

**Fuite**

- `INTERACTIVE` Poursuite jouable — `systems/burglary.ts#chaseContext` · mini-jeu `chase` · test `minijeux`

**Détection**

- `COMPLETE` Chaleur policière — `systems/underworld.ts#heatOf` · test `milieu`
- `COMPLETE` Enquêtes ouvertes — `systems/underworld.ts#openInvestigation` · test `milieu`
- `COMPLETE` Un visage connu se fait reconnaître — `systems/fame.ts#recognitionFactor` · test `notoriete`

**Historique**

- `COMPLETE` Casier judiciaire — `engine/types.ts#CriminalRecord` · test `life`
- `COMPLETE` Notoriété criminelle — `systems/crime.ts#commitCrime` · test `milieu`

**Vol de véhicule**

- `INTERACTIVE` Mini-jeu dédié — `systems/minigames/rings.ts#RINGS` · mini-jeu `rings` · test `boitier` *(un boîtier entièrement inventé — des anneaux engrenés qui ne reproduisent aucun mécanisme réel et n’apprennent rien d’applicable ailleurs ; toucher un anneau entraîne ceux du dedans, il y a donc un ordre, et mesuré sur deux cents parties qui le trouve ouvre 94 % du temps contre 0 % pour qui tape au hasard)*

**Vol à l’étalage**

- `INTERACTIVE` Mini-jeu dédié — `systems/minigames/rings.ts#RINGS` · mini-jeu `rings` · test `boitier` *(le même boîtier, en plus petit et repères visibles : trois anneaux de six crans, ouverts 100 % du temps par qui a compris l’ordre et 12 % par qui tape au hasard)*

**Coups joués**

- `COMPLETE` Le chemin ne change pas le règlement — `systems/crime.ts#commitCrime` · test `boitier` *(jouer ou laisser faire aboutit aux mêmes suites, et le tirage est consommé dans les deux cas — sans quoi ouvrir le mini-jeu décalerait toute la partie)*

**Braquage**

- `BASIC` Minutage et niveau d’alerte — `data/crimes.ts` *(un délit du catalogue résolu par tirage)*

**Colis**

- `MISSING` Récupération opportuniste

**Bureau**

- `MISSING` Délit financier au travail *(travailler quelque part n’ouvre aucune possibilité criminelle)*

**Délinquance**

- `PARTIAL` Petites infractions d’adolescent — `data/crimes.ts` *(les délits sont ouverts par âge mais rien n’est propre à l’adolescence)*

**Blanchiment**

- `COMPLETE` Faire disparaître l’origine — `systems/crime.ts#launderMoney` · test `milieu`

**Organisé**

- `COMPLETE` Rejoindre une organisation — `systems/underworld.ts#joinOrganization` · test `milieu`
- `COMPLETE` Rangs et progression — `systems/underworld.ts#rankOf` · test `milieu`
- `COMPLETE` Membres persistants — `systems/underworld.ts#underworldPeople` · test `milieu`
- `COMPLETE` Missions — `systems/underworld.ts#runMission` · test `milieu`
- `COMPLETE` Missions imposées et refus — `systems/underworld.ts#refuseMission` · test `milieu`
- `COMPLETE` Carnet de contacts — `systems/underworld.ts#contactsOf` · test `milieu`
- `COMPLETE` Services rendus par les contacts — `systems/underworld.ts#askService` · test `milieu`
- `COMPLETE` Quitter la maison — `systems/underworld.ts#leaveOrganization` · test `milieu`
- `PARTIAL` Mini-jeux de mission — `systems/underworld.ts#missionContext` · mini-jeu `chase` · test `missions` *(porter un paquet se joue à la course, récupérer ce qui manque au cambriolage — le champ « miniGame » était déclaré dans les données et rien ne le lisait. Les quatre autres missions se règlent encore par tirage)*
- `MISSING` Luttes internes
- `PARTIAL` Prendre la tête — `systems/underworld.ts#rankOf` · test `milieu` *(le rang de patron existe ; il n’ouvre aucun gameplay de direction)*

**Trafic**

- `MISSING` Économie de contrebande fictive

### Justice

**Arrestation**

- `COMPLETE` Séquence d’arrestation — `systems/justice.ts#arrest` · test `life`

**Procès**

- `COMPLETE` Choisir un avocat — `systems/justice.ts#goToTrial` · test `life`
- `COMPLETE` Verdict et peine — `systems/justice.ts#incarcerate` · test `life`
- `COMPLETE` Faire appel — `systems/justice.ts#appeal` · test `life`
- `MISSING` Audience jouable *(le procès est un calcul : aucune scène, aucune plaidoirie à conduire)*

**Casier**

- `COMPLETE` Effacement — `systems/justice.ts#requestExpungement` · test `life`

**Sévérité**

- `COMPLETE` Variation par pays — `data/countries.ts` · test `life`

### Prison

**Détention**

- `COMPLETE` Niveaux de sécurité — `systems/prison.ts#advancePrison` · test `evasion`
- `COMPLETE` Activités carcérales — `systems/prison.ts#doPrisonActivity` · test `evasion`
- `COMPLETE` Codétenus persistants — `systems/prison.ts#inmateAction` · test `evasion`
- `COMPLETE` Se faire protéger — `systems/prison.ts#inmateAction` · test `evasion`
- `COMPLETE` Visites — `systems/lives.ts#visit` · test `leurs` *(une fois l’an, au parloir ; elle ne raccourcit rien — elle change l’état dans lequel il en sort et tient le lien pendant qu’il est hors d’atteinte)*
- `PARTIAL` Travail en détention — `systems/prison.ts#doPrisonActivity` · test `evasion` *(une activité parmi d’autres, sans rémunération réelle)*

**Libération**

- `COMPLETE` Conditionnelle — `systems/prison.ts#requestParole` · test `evasion`
- `COMPLETE` Sortie en fin de peine — `systems/prison.ts#release` · test `evasion`

**Évasion**

- `COMPLETE` Préparer — `systems/escape.ts#prepareEscape` · test `evasion`
- `INTERACTIVE` Mini-jeu jouable — `systems/escape.ts#resolveEscapeAttempt` · mini-jeu `escape` · test `evasion`
- `COMPLETE` Cavale — `systems/escape.ts#goOnTheRun` · test `evasion`
- `COMPLETE` Se rendre — `systems/escape.ts#surrender` · test `evasion`

**Émeute**

- `MISSING` Mini-jeu dédié

### Notoriété

**Axes**

- `COMPLETE` Combien de gens te connaissent — `systems/fame.ts#advanceFame` · test `notoriete`
- `COMPLETE` Ce qu’on a à te reprocher — `systems/fame.ts#heatLabel` · test `notoriete`
- `COMPLETE` Ce que le public retient de bon — `systems/fame.ts#publicStanding` · test `notoriete`

**Entretien**

- `COMPLETE` Ce qui rend connu, ligne par ligne — `systems/fame.ts#fameSources` · test `notoriete`
- `COMPLETE` Ça retombe si on n’entretient pas — `systems/fame.ts#fameDecay` · test `notoriete`

**Apparitions**

- `COMPLETE` Dix apparitions échelonnées — `systems/fame.ts#doGig` · test `notoriete`
- `COMPLETE` Interview jouable — `systems/fame.ts#answerInterview` · test `notoriete`

**Affaires**

- `COMPLETE` Scandales — `systems/fame.ts#openScandal` · test `notoriete`
- `COMPLETE` Quatre réponses, aucune bonne — `systems/fame.ts#respondToScandal` · test `notoriete`

**Coût**

- `COMPLETE` Vie privée et reconnaissance — `systems/fame.ts#recognitionFactor` · test `notoriete`

**Réseaux**

- `COMPLETE` Publier — `systems/social.ts#publish` · test `reseaux` *(où, quoi, et combien de fois : le goût de chaque public est tiré une fois pour la partie et jamais annoncé — mesuré, publier ce qu’un public aime rapporte 1,35 fois publier au hasard (médiane sur trois cents parties))*
- `COMPLETE` Monétiser son audience — `systems/activities.ts#monetizeAudience` · test `notoriete`
- `COMPLETE` Plusieurs réseaux distincts — `data/networks.ts#NETWORKS` · test `reseaux` *(quatre maisons fictives qui diffèrent par la taille du public, ce qu’il supporte et ce qu’elle pardonne ; leurs goûts ne se ressemblent pas et changent d’une partie à l’autre)*
- `COMPLETE` Choisir le sujet d’une publication — `data/networks.ts#SUBJECTS` · test `reseaux` *(cinq sujets, du sans risque à ce qui se retourne ; répéter le même au même endroit rapporte de moins en moins, ce qui oblige à tourner)*
- `COMPLETE` Suspension de compte — `systems/social.ts#suspendedOn` · test `reseaux` *(sanction de jeu sur une maison de jeu : le compte ferme pour l’année, et d’autant plus volontiers que la maison est peu patiente)*
- `PARTIAL` Offres de partenariat selon l’audience — `systems/activities.ts#monetizeAudience` · test `notoriete` *(une seule offre générique par an, sans marque ni négociation)*

### Événements

**Format**

- `COMPLETE` Format déclaratif de données — `data/events/types.ts` · test `inventory`
- `COMPLETE` Conditions riches — `systems/randomEvents.ts#matchesCondition` · test `inventory`
- `COMPLETE` Choix multiples et issues pondérées — `systems/randomEvents.ts#resolvePending` · test `inventory`
- `COMPLETE` Effets spéciaux délégués au moteur — `systems/randomEvents.ts#applyEffects` · test `inventory`

**Volume**

- `COMPLETE` Banque d’événements — `data/events/index.ts` · test `composees` *(cent soixante-neuf scènes écrites, plus quatorze scènes composées qui se lient à un vrai proche : mesuré, ce que le joueur lit passe de 97 à 156 scènes distinctes par vie et le recouvrement entre deux vies de 55,5 % à 35,8 %)*
- `COMPLETE` Génération procédurale — `systems/composed.ts#composeYear` · test `composees` *(une scène par an liée à un PNJ réel : ce n’est pas du texte tiré au sort, c’est le caractère de la personne qui décide de l’issue — les quatorze scènes ont toutes un bon choix qui dépend d’elle, et savoir à qui l’on a affaire rapporte 45 % de plus que le meilleur jeu aveugle)*
- `COMPLETE` Scènes qui apprennent quelqu’un — `systems/composed.ts#stands` · test `composees` *(l’autre chemin vers les traits d’un proche : sortir avec lui est délibéré et coûte de l’argent, une scène composée arrive et l’apprend malgré soi)*

**Calendrier**

- `COMPLETE` Occasions datées et récurrentes — `data/occasions.ts#OCCASIONS` · test `occasions` *(quatorze occasions fictives réparties sur l’année ; le mois décide, et le parcours du calendrier tourne d’une année sur l’autre)*
- `COMPLETE` Cinq degrés de rareté — `data/occasions.ts#RARITY_ODDS` · test `occasions` *(du banal au presque unique ; la comète passe une fois par quatre-vingts ans)*
- `COMPLETE` Souvenirs sans valeur — `data/occasions.ts#KEEPSAKES` · test `occasions` *(des objets qui ne valent rien, à côté de ceux qui valent de l’argent — la différence est le propos)*

**Densité**

- `COMPLETE` Aucune année vide — `systems/occasions.ts#advanceOccasions` · test `occasions` *(mesuré : 3,4 % d’années vides et 14 % entre six et treize ans, ramenés à 0,1 % — l’occasion ne se pose que si l’année n’a rien produit d’autre)*
- `MISSING` Audit d’âge automatique *(la densité par tranche d’âge se mesure à la main, pas en continu)*

### Simulation PNJ

**Vie propre**

- `COMPLETE` Les PNJ vieillissent et meurent — `systems/npc.ts#agePerson` · test `life`
- `COMPLETE` Caractère qui évolue — `systems/psyche.ts#advanceNpcPsyche` · test `personnalite`
- `COMPLETE` Initiatives des PNJ — `systems/lives.ts#advanceLives` · test `leurs` *(quatorze tournants, un par personne et par an au plus ; le caractère et les statistiques poussent, et 98 % des gens du jeu ont désormais une histoire contre 51 % avant)*
- `COMPLETE` Se marier de leur côté — `systems/lives.ts#takeTurn` · test `leurs` *(rencontre, puis mariage d’autant plus probable que l’histoire dure ; le conjoint d’un frère existe vraiment et devient de la belle-famille)*
- `COMPLETE` Avoir des enfants — `systems/lives.ts#childRelation` · test `leurs` *(un vrai PNJ enregistré, neveu ou nièce, qui grandit et prendra ses propres tournants ; chaque enfant rend le suivant moins probable)*
- `COMPLETE` Changer de métier, s’enrichir, tomber — `systems/lives.ts#nextRung` · test `leurs` *(embauche, échelon nommé, reconversion, licenciement, belle affaire et revers ; leur patrimoine décide de ce qu’on hérite, et la ruine est passée de 53,9 % à moins de 5 %)*
- `COMPLETE` Tomber malade, aller en prison — `systems/lives.ts#advanceLife` · test `leurs` *(une maladie use tant qu’elle dure et peut emporter ; une peine se purge année par année et rien ne l’abrège)*

**Demandes**

- `COMPLETE` Un PNJ demande de l’aide — `systems/lives.ts#askAmount` · test `leurs` *(qui perd son travail, tombe malade ou entre en prison se tourne vers le premier cercle ; le montant est plafonné à une part de ce qu’on a, sinon on répond qu’on n’a rien)*

**Historique**

- `COMPLETE` Chaque PNJ garde son histoire — `systems/npc.ts#noteHistory` · test `life`

### Méta

**Équilibrage**

- `COMPLETE` Plafond cognitif propre à chacun — `systems/stats.ts#cognitiveCeilingOf` · test `derive` *(l’héritage, le capital culturel du foyer et le goût de l’étude ; l’intelligence ne monte plus jusqu’à cent en attendant)*
- `COMPLETE` Point de passage unique des statistiques — `systems/stats.ts#shiftStat` · test `derive` *(sept canaux faisaient monter l’intelligence et vingt-six le karma, chacun avec ses règles ou sans règle)*
- `COMPLETE` Karma à rendements décroissants — `systems/stats.ts#shiftStat` · test `derive` *(il valait 99,9 de moyenne à quarante ans ; il revient vers l’ordinaire et répond de moins en moins aux extrêmes)*
- `COMPLETE` Moyenne scolaire centrée — `engine/probability.ts#computeGrade` · test `derive` *(elle valait 15,2 sur 20 : un élève ordinaire obtient désormais une note ordinaire, et le haut reste atteignable)*

**Sauvegarde**

- `COMPLETE` Tout est persisté — `engine/save.ts#saveGame` · test `transfert`
- `COMPLETE` Export et import — `engine/save.ts#exportSave` · test `transfert`
- `COMPLETE` Générateur déterministe dans la sauvegarde — `engine/rng.ts#Rng` · test `transfert`
- `MISSING` Revenir à un état antérieur *(aucun historique d’états : la sauvegarde est un point unique)*

**Tests**

- `COMPLETE` Audits mécaniques anti-décoratifs — `systems/environmentAudit.ts#validateEnvironmentImpact` · test `environnement`
- `COMPLETE` Catalogue ancré au code — `data/featureCatalog.ts#ALL_FEATURES` · test `catalogue`
- `COMPLETE` Détection des boutons morts — `data/gameplayAudit.ts#auditProblems` · test `audit`
- `COMPLETE` Test de fumée en navigateur — `engine/save.ts#parseSave` · test `transfert`

**Interface**

- `COMPLETE` Retour visuel des actions — `components/Modal.tsx#Modal`
- `MISSING` Sons *(aucun point d’accroche audio)*

