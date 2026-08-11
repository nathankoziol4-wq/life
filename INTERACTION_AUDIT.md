# Profondeur d'interaction

*Généré par `npm run catalog`. On mesure, pour chaque feuille existante,
jusqu'où va la chaîne : menu → sélection → actions → moment joué →
conséquences → impact durable. Une feuille qui s'arrête au menu est un
affichage, pas du gameplay.*

| Niveau | Ce que ça veut dire | Feuilles |
| ---: | --- | ---: |
| 0 | aucune interaction | 6 |
| 1 | un menu | 0 |
| 2 | une sélection | 11 |
| 3 | des actions avec effets | 20 |
| 4 | un moment joué | 0 |
| 5 | des conséquences persistantes | 310 |
| 6 | un impact sur le reste de la vie | 37 |

## Les feuilles qui s'arrêtent trop tôt

Existantes, mais dont la chaîne s'interrompt avant les conséquences durables.

| Niveau | État | Feuille | Note |
| ---: | --- | --- | --- |
| 3 | `COMPLETE` | Relations/Registre/Une bibliothèque d’actions filtrée par contexte | — |
| 3 | `COMPLETE` | Carrière/Recherche/Conditions d’accès vérifiées | — |
| 3 | `COMPLETE` | Carrière/Équipe/Le soutien pèse sur la carrière | — |
| 3 | `COMPLETE` | Événements/Format/Conditions riches | — |
| 3 | `COMPLETE` | Enfance/Activités/L’engagement de l’adulte compte | — |
| 3 | `COMPLETE` | Relations/Amour/Orientation respectée | — |
| 3 | `COMPLETE` | Santé/Maladies/Coût des soins selon le pays | — |
| 3 | `COMPLETE` | Justice/Sévérité/Variation par pays | — |
| 2 | `PLACEHOLDER` | Vie/Personnalité/Talents découverts | un événement « don caché » qui ne mène nulle part : le talent n’est ni stocké, ni cultivable, ni utilisable |
| 3 | `COMPLETE` | Vie/Mort/Score de vie | — |
| 2 | `PLACEHOLDER` | Carrières spéciales/Acteur/Échelle de salaires | un métier « comédien » comme un autre |
| 2 | `PLACEHOLDER` | Carrières spéciales/Musique/Échelle de salaires | un métier « musicien » comme un autre |
| 2 | `PLACEHOLDER` | Carrières spéciales/Sport/Échelle de salaires | un métier « sportif » comme un autre |
| 2 | `PLACEHOLDER` | Carrières spéciales/Politique/Métier existant | un métier « politique » comme un autre |
| 2 | `PLACEHOLDER` | Carrières spéciales/Mannequin/Métier existant | un métier « mannequin » comme un autre |
| 2 | `BASIC` | Activités/Administratif/Changer de nom | aucune conséquence : ni réputation, ni réaction des proches |

## Intégration des PNJ

96 feuilles font réellement intervenir
un personnage non joueur. Les systèmes qui devraient en avoir et n'en ont pas :

- Relations/Amour/Bague de fiançailles
- Relations/Enfants/Traitement de fertilité
- Crime/Organisé/Rangs et progression
- Crime/Organisé/Missions
- Crime/Organisé/Missions imposées et refus
- Crime/Organisé/Quitter la maison
- Crime/Organisé/Prendre la tête
