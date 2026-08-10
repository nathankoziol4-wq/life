# Rapport de parité

> Document généré par `npm run audit` depuis `src/data/gameplayAudit.ts`.
> Ne pas le modifier à la main.

Ces pourcentages ne sont pas des estimations : ils sont calculés à partir
de la profondeur déclarée de chaque feuille de l’audit, et chaque feuille
non absente doit citer un symbole réellement exporté du projet.

```
Prison................ ████████████████░░░░  81 %  (5 feuilles)
École................. ███████████████░░░░░  75 %  (14 feuilles)
Enfance............... ██████████████░░░░░░  70 %  (12 feuilles)
Université............ ██████████████░░░░░░  69 %  (4 feuilles)
Justice............... ████████████░░░░░░░░  60 %  (4 feuilles)
Personnage............ ███████████░░░░░░░░░  55 %  (14 feuilles)
Travail............... ██████████░░░░░░░░░░  52 %  (11 feuilles)
Relations............. ██████████░░░░░░░░░░  52 %  (13 feuilles)
Crime................. ██████████░░░░░░░░░░  52 %  (16 feuilles)
Santé................. ██████████░░░░░░░░░░  49 %  (5 feuilles)
Monde................. ██████████░░░░░░░░░░  48 %  (5 feuilles)
Famille............... █████████░░░░░░░░░░░  47 %  (6 feuilles)
Finance............... ████████░░░░░░░░░░░░  41 %  (9 feuilles)
Activités............. ██████░░░░░░░░░░░░░░  32 %  (3 feuilles)
Patrimoine............ ██████░░░░░░░░░░░░░░  30 %  (9 feuilles)
Célébrité............. ██░░░░░░░░░░░░░░░░░░  12 %  (3 feuilles)
Carrières spéciales... █░░░░░░░░░░░░░░░░░░░   7 %  (7 feuilles)

GLOBAL................ ██████████░░░░░░░░░░  52 %  (140 feuilles)
```

## Comment lire ce tableau

Un domaine à 80 % n’est pas « presque fini » : c’est un domaine dont les
feuilles sont en moyenne profondes. Un domaine à 10 % contient surtout des
boutons et des absences.

Le score descend quand on découvre un manque et qu’on l’ajoute à l’audit.
C’est le comportement recherché.

## Les plus faibles, dans l’ordre

### Carrières spéciales — 7 %

- **Auditions, agent, rôles, récompenses** (PLACEHOLDER) — une échelle de salaires nommée « Acteur » : ni audition, ni rôle, ni tournage
- **Groupe, label, album, tournée, royalties** (PLACEHOLDER) — une échelle de salaires nommée « Musicien » : rien à jouer, rien à sortir
- **Club, saison, statistiques, transfert** (PLACEHOLDER) — une échelle de salaires : ni club, ni saison, ni blessure, ni transfert
- **Élections, campagne, mandat, sondages** (PLACEHOLDER) — une échelle de salaires : aucune élection ne se tient
- **Formation, missions, exploration** (PLACEHOLDER) — une échelle de salaires : aucune mission
- **Agence, casting, défilés, campagnes** (MISSING) — le métier n’existe pas
- **Agence, missions, gadgets fictifs** (MISSING) — le métier n’existe pas

### Célébrité — 12 %

- **Célébrité distincte de la réputation** (MISSING) — seuls des `followers` existent ; ni célébrité, ni controverse, ni public
- **Publier, monétiser** (BASIC) — une seule audience globale, un tirage de viralité ; ni plateformes, ni commentaires, ni sponsors
- **Interview, publicité, séance photo, événement** (MISSING) — aucune action de célébrité

### Patrimoine — 30 %

- **Mettre en location** (BASIC) — un interrupteur et un loyer fixe : ni locataire, ni vacance, ni impayé, ni réparation
- **Locataires comme PNJ** (MISSING) — personne n’habite les biens loués
- **Examen du permis** (PLACEHOLDER) — un bouton et un tirage : aucune épreuve
- **Acheter, revendre** (BASIC) — quinze objets fixes : ni rareté, ni authenticité, ni provenance
- **Collectionner et voir sa collection** (MISSING) — aucune notion de collection : les objets sont une liste plate
- **Salle des ventes jouable** (PLACEHOLDER) — un canal de revente au meilleur taux : personne n’enchérit en face
- **Bateaux, avions, œuvres d’art** (MISSING) — le patrimoine s’arrête aux voitures et aux bijoux

### Activités — 32 %

- **Sorties, voyages, animaux, réseaux** (PARTIAL) — des boutons à effet immédiat : ni lieu, ni accompagnant, ni scène
- **Randonnée, pêche, camping, navigation** (MISSING) — aucune activité de plein air
- **Destination, budget, accompagnants** (BASIC) — une destination et un prix : personne ne vient, rien n’arrive sur place

### Finance — 41 %

- **Score de solvabilité** (MISSING) — la capacité d’emprunt dépend du revenu seul : aucun historique de remboursement ne compte
- **Courbes historiques consultables** (PARTIAL) — vingt cours sont conservés mais rien ne les dessine : le joueur ne voit qu’un pourcentage annuel
- **Entreprises cotées avec un état propre** (MISSING) — les supports sont des indices abstraits : aucune société n’a de secteur, de dette ni de résultats
- **Actualités financières qui déplacent les cours** (MISSING) — les cours ne bougent que par la conjoncture et le hasard
- **Conseiller financier** (MISSING) — personne à qui demander conseil, personne à qui déléguer
- **Loterie et casino** (BASIC) — un tirage par jeu : aucun jeu de casino n’est jouable, la loterie n’a pas d’interface

### Famille — 47 %

- **Concevoir, naître, grandir** (PARTIAL) — les enfants existent et vieillissent, mais les actions ne changent pas avec leur âge
- **Procédure d’adoption** (BASIC) — un bouton et un tirage : ni profils, ni dossier, ni évaluation
- **Parcours médicaux** (BASIC) — un traitement générique à taux fixe
- **Adopter, nourrir, promener, soigner** (PARTIAL) — ni refuge, ni dressage, ni comportement propre à l’animal ; le vétérinaire est un bouton
- **Reprendre un descendant après le décès** (MISSING) — la mort termine la partie : le monde et le patrimoine sont perdus

### Monde — 48 %

- **Changer de pays** (PARTIAL) — un déménagement instantané : ni demande, ni refus, ni adaptation
- **Fil d’actualité du monde** (MISSING) — le monde change en silence : le joueur ne l’apprend jamais
- **Conséquences retardées** (MISSING) — un choix produit son effet immédiatement et n’est jamais rappelé

### Santé — 49 %

- **Consulter, diagnostiquer, traiter** (PARTIAL) — les médecins sont des types abstraits : ni PNJ, ni réputation, ni second avis
- **Procédures, praticien, risque, résultat** (BASIC) — un tirage : ni praticien identifié, ni litige possible en cas de ratage
- **Sport, bien-être, méditation** (PARTIAL) — des activités à effet immédiat ; ni progression, ni discipline suivie, ni régime
- **Lire un livre, progresser dedans** (MISSING) — aucune bibliothèque, aucun livre
