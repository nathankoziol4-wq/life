# Rapport de parité

> Document généré par `npm run audit` depuis `src/data/gameplayAudit.ts`.
> Ne pas le modifier à la main.

Ces pourcentages ne sont pas des estimations : ils sont calculés à partir
de la profondeur déclarée de chaque feuille de l’audit, et chaque feuille
non absente doit citer un symbole réellement exporté du projet.

```
Célébrité............. ██████████████████░░  91 %  (7 feuilles)
Prison................ ████████████████░░░░  81 %  (5 feuilles)
Travail............... ███████████████░░░░░  76 %  (17 feuilles)
École................. ███████████████░░░░░  75 %  (14 feuilles)
Famille............... ██████████████░░░░░░  71 %  (9 feuilles)
Enfance............... ██████████████░░░░░░  70 %  (12 feuilles)
Université............ ██████████████░░░░░░  69 %  (4 feuilles)
Justice............... ████████████░░░░░░░░  60 %  (4 feuilles)
Patrimoine............ ████████████░░░░░░░░  58 %  (12 feuilles)
Relations............. ███████████░░░░░░░░░  57 %  (13 feuilles)
Personnage............ ███████████░░░░░░░░░  55 %  (14 feuilles)
Monde................. ███████████░░░░░░░░░  55 %  (6 feuilles)
Crime................. ██████████░░░░░░░░░░  52 %  (16 feuilles)
Santé................. ██████████░░░░░░░░░░  49 %  (5 feuilles)
Finance............... ████████░░░░░░░░░░░░  41 %  (9 feuilles)
Activités............. ██████░░░░░░░░░░░░░░  32 %  (3 feuilles)
Carrières spéciales... █░░░░░░░░░░░░░░░░░░░   7 %  (7 feuilles)

GLOBAL................ ████████████░░░░░░░░  60 %  (157 feuilles)
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

### Santé — 49 %

- **Consulter, diagnostiquer, traiter** (PARTIAL) — les médecins sont des types abstraits : ni PNJ, ni réputation, ni second avis
- **Procédures, praticien, risque, résultat** (BASIC) — un tirage : ni praticien identifié, ni litige possible en cas de ratage
- **Sport, bien-être, méditation** (PARTIAL) — des activités à effet immédiat ; ni progression, ni discipline suivie, ni régime
- **Lire un livre, progresser dedans** (MISSING) — aucune bibliothèque, aucun livre

### Crime — 52 %

- **La victime se souvient** (MISSING) — la cible est anonyme et disparaît : elle ne devient jamais un PNJ
- **Puzzle fictif** (PLACEHOLDER) — un délit du catalogue : ni choix du véhicule, ni épreuve, ni revente
- **Scène de magasin** (PLACEHOLDER) — un délit du catalogue : aucune scène
- **Minutage, alerte, décision de partir** (PLACEHOLDER) — un délit du catalogue : aucune scène, aucune équipe
- **Diriger : recruter, promouvoir, répartir** (MISSING) — on monte jusqu’au sommet sans que le gameplay change
- **Conflits internes, trahisons** (MISSING) — la maison n’a pas de membres identifiés : personne à trahir
- **Progression criminelle explicite** (BASIC) — une seule statistique `criminality` : ni discrétion, ni sang-froid, ni observation
- **Vendeurs, objets fictifs, arnaques, négociation** (MISSING) — le receleur rachète, mais rien ne s’achète nulle part

### Personnage — 55 %

- **Changer de nom** (BASIC) — aucune conséquence : ni réputation, ni réaction des proches, ni trace administrative
- **Arbre de compétences explicite et progressif** (MISSING) — les compétences sont des statistiques diffuses ; rien à faire progresser délibérément
- **Dons découverts et cultivés** (PLACEHOLDER) — un événement « don caché » sans suite : aucun talent n’est stocké ni cultivable
- **Apparence générée, vieillissante** (PARTIAL) — aucune action pour la modifier hors chirurgie ; pas de style, coiffure, tenue
- **Souvenirs marquants conservés** (PARTIAL) — le joueur les lit, les PNJ ne s’en servent pas dans leurs réactions
- **Habitudes qui coûtent du temps et de l’argent** (PARTIAL) — aucune action pour prendre ou perdre une habitude délibérément
- **Addictions simulées et sevrage** (BASIC) — une statistique `addiction` qui monte ; ni cure, ni rechute, ni entourage qui réagit
- **Ambitions qui orientent la vie** (PARTIAL) — affichées et alimentées, mais le joueur ne peut pas s’en fixer une
- **Succès, défis, titres de fin de vie** (MISSING) — aucun système de succès, de défi ni de titre : rien ne récompense une trajectoire

### Monde — 55 %

- **Changer de pays** (PARTIAL) — un déménagement instantané : ni demande, ni refus, ni adaptation
- **Fil d’actualité du monde** (MISSING) — le monde change en silence : le joueur ne l’apprend jamais
- **Conséquences retardées** (MISSING) — un choix produit son effet immédiatement et n’est jamais rappelé

### Relations — 57 %

- **Rupture, divorce, partage des biens** (PARTIAL) — ni avocat, ni garde des enfants, ni pension, ni relation post-divorce
- **Les ex continuent d’exister** (PLACEHOLDER) — la relation est rétrogradée puis oubliée : aucune action propre à un ex
- **Rivalité et inimitié durables** (MISSING) — une relation peut baisser, jamais devenir une inimitié avec ses propres actions
- **Catalogue et goûts du destinataire** (BASIC) — un montant générique : ni catalogue, ni goûts, ni occasion
- **Donner, demander, prêter, rembourser** (PARTIAL) — donner et demander seulement : aucune dette interpersonnelle suivie
- **Sortir avec quelqu’un : lieu, budget, déroulé** (MISSING) — aucun rendez-vous : la séduction est une suite de clics sans scène
- **Les PNJ se souviennent de ce qu’on leur a fait** (PARTIAL) — relation et opinion évoluent, mais aucun souvenir daté et nommé n’est conservé
- **Les PNJ vivent sans le joueur** (PARTIAL) — ils vieillissent, meurent et prennent quelques initiatives ; ils ne travaillent, ne déménagent ni ne s’enrichissent
