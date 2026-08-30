# Audit du clavier virtuel

Mesuré par `tools/audit-clavier.mjs`, sur un écran de 360×800 avec
`hasTouch`. Le clavier est simulé comme Android le fait : la fenêtre
perd 336 points de haut, et l'on regarde ce que devient le champ.

**8 champs de saisie** dans le jeu, sur 4 endroits visités.

| Défaut | Champs |
| --- | --- |
| iOS agrandit la page à la mise au point (police < 16 pt) | 0 |
| Mauvais clavier ou touche muette | 0 |
| Champ sous 44 points | 0 |
| Champ masqué par le clavier | 0 |
| Rien pour valider une fois le clavier ouvert | 0 |
| Champ sans intitulé | 0 |

## Les champs trouvés

| Où | Type | Police | Hauteur | inputMode | autoCapitalize | enterKeyHint |
| --- | --- | --- | --- | --- | --- | --- |
| Juste un nom et un pays · Prénom (optionnel) | `text` | 16 pt | 47.2 pt | — | words | next |
| Juste un nom et un pays · Nom (optionnel) | `text` | 16 pt | 47.2 pt | — | words | done |
| Création détaillée — identité · Prénom | `text` | 16 pt | 47.2 pt | — | words | next |
| Création détaillée — identité · Nom | `text` | 16 pt | 47.2 pt | — | words | done |
| Création détaillée — identité · Ta propre explication | `text` | 16 pt | 47.2 pt | — | sentences | done |
| Changement de nom, en cours de partie · Prénom | `text` | 16 pt | 47.2 pt | — | words | next |
| Changement de nom, en cours de partie · Nom | `text` | 16 pt | 47.2 pt | — | words | done |
| Montant d’un emprunt · Montant | `text` | 16 pt | 47.2 pt | numeric | none | done |
