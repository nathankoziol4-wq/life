# Couverture en mini-jeux

> Document généré par `npm run audit`. Ne pas le modifier à la main.

Une action importante devrait rarement se résoudre par « cliquer, tirer un
nombre, lire le résultat ». Ce tableau liste les actions qui méritent un
mini-jeu et dit lesquelles en ont un.

Le statut n’est pas déclaratif : il est lu dans le registre des mini-jeux.
On ne peut pas cocher une case sans que le jeu existe.

**4 sur 20 — 20 %**

| Action | Mini-jeu | Statut | Objectif |
| --- | --- | --- | --- |
| Vol à la tire | `pickpocket` | **INTERACTIVE** | Approcher, retirer sans brusquer, et partir avant qu’on s’en aperçoive. |
| Cambriolage | `burglary` | **INTERACTIVE** | Prendre ce qui vaut la peine, et ressortir avant qu’on te voie. |
| Fuite après un coup | `chase` | **INTERACTIVE** | Rejoindre une sortie. Ils courent plus vite, mais tournent moins bien. |
| Évasion | `escape` | **INTERACTIVE** | Traverser sans être vu. Les abris cachent, le faisceau ne pardonne pas. |
| Émeute en détention | `riot` | MISSING | — |
| Examen du permis | `driving` | MISSING | — |
| Vol de véhicule | `hotwire` | MISSING | — |
| Vol à l’étalage | `shoplift` | MISSING | — |
| Braquage | `heist` | MISSING | — |
| Entretien d’embauche | `interview` | MISSING | — |
| Examen scolaire | `exam` | MISSING | — |
| Concert | `rhythm` | MISSING | — |
| Audition d’acteur | `audition` | MISSING | — |
| Match sportif | `sport` | MISSING | — |
| Séance photo | `photoshoot` | MISSING | — |
| Mission spatiale | `space` | MISSING | — |
| Enchères | `auction` | MISSING | — |
| Jeux de casino | `casino` | MISSING | — |
| Course hippique | `horserace` | MISSING | — |
| Campagne électorale | `campaign` | MISSING | — |

## Ce qu’un mini-jeu doit respecter ici

- **aucune logique dans React** : un mini-jeu est un état et une fonction
  `step()`, si bien que les tests jouent des parties entières sans
  navigateur et vérifient que bien jouer paie ;
- **le personnage compte autant que le joueur** : la compétence donne du
  temps, de la marge et de l’information, elle ne joue pas à sa place ;
- **on peut ne pas jouer** : « Laisser faire » passe par exactement les
  mêmes conséquences ;
- **rejouable** : le plan est tiré au sort à chaque partie.
