# Profondeur d'interaction

*Généré par `npm run catalog`. On mesure, pour chaque feuille existante,
jusqu'où va la chaîne : menu → sélection → actions → moment joué →
conséquences → impact durable. Une feuille qui s'arrête au menu est un
affichage, pas du gameplay.*

| Niveau | Ce que ça veut dire | Feuilles |
| ---: | --- | ---: |
| 0 | aucune interaction | 6 |
| 1 | un menu | 0 |
| 2 | une sélection | 12 |
| 3 | des actions avec effets | 26 |
| 4 | un moment joué | 4 |
| 5 | des conséquences persistantes | 344 |
| 6 | un impact sur le reste de la vie | 37 |

## Les feuilles qui s'arrêtent trop tôt

Existantes, mais dont la chaîne s'interrompt avant les conséquences durables.

| Niveau | État | Feuille | Note |
| ---: | --- | --- | --- |
| 3 | `COMPLETE` | Éducation/Harcèlement/Aucune réponse universelle | chacune des cinq est la meilleure dans un contexte et la pire dans un autre — vérifié par test |
| 3 | `COMPLETE` | Relations/Registre/Une bibliothèque d’actions filtrée par contexte | — |
| 3 | `COMPLETE` | Carrière/Recherche/Conditions d’accès vérifiées | — |
| 3 | `COMPLETE` | Carrière/Équipe/Le soutien pèse sur la carrière | — |
| 3 | `COMPLETE` | Événements/Format/Conditions riches | — |
| 3 | `COMPLETE` | Enfance/Activités/L’engagement de l’adulte compte | — |
| 3 | `COMPLETE` | Relations/Amour/Orientation respectée | — |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Prendre plus grand que soi | l’enjeu module l’accueil : réussir un rôle facile n’impressionne personne |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Déclin par l’âge | pente propre à chaque métier : brutale au sport, nulle en politique |
| 3 | `COMPLETE` | Santé/Maladies/Coût des soins selon le pays | — |
| 3 | `COMPLETE` | Justice/Sévérité/Variation par pays | — |
| 2 | `PLACEHOLDER` | Vie/Personnalité/Talents découverts | un événement « don caché » qui ne mène nulle part : le talent n’est ni stocké, ni cultivable, ni utilisable |
| 3 | `COMPLETE` | Vie/Mort/Score de vie | — |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Résolution sans jouer | même chemin de conséquences, jamais plus favorable que bien jouer |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Engagement non honoré | se solde tout seul à la fin de l’année, et mal |
| 2 | `PLACEHOLDER` | Carrières spéciales/Musique/Maison de disques | la maison qui propose est une formule, pas une entité avec un contrat |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Sur scène depuis le Parcours | la carrière est visible depuis l’écran principal, pas cachée dans un menu |
| 2 | `PLACEHOLDER` | Carrières spéciales/Acteur/Échelle de salaires | le métier « comédien » de la grille reste un salaire ; la carrière jouée vit ailleurs |
| 2 | `PLACEHOLDER` | Carrières spéciales/Musique/Échelle de salaires | le métier « musicien » de la grille reste un salaire |
| 2 | `PLACEHOLDER` | Carrières spéciales/Sport/Échelle de salaires | le métier « sportif » de la grille reste un salaire |
| 2 | `PLACEHOLDER` | Carrières spéciales/Politique/Métier existant | le métier « politique » de la grille reste un salaire |
| 2 | `PLACEHOLDER` | Carrières spéciales/Mannequin/Métier existant | le métier « mannequin » de la grille reste un salaire |
| 2 | `BASIC` | Activités/Administratif/Changer de nom | aucune conséquence : ni réputation, ni réaction des proches |

## Intégration des PNJ

104 feuilles font réellement intervenir
un personnage non joueur. Les systèmes qui devraient en avoir et n'en ont pas :

- Relations/Amour/Bague de fiançailles
- Relations/Enfants/Traitement de fertilité
- Crime/Organisé/Rangs et progression
- Crime/Organisé/Missions
- Crime/Organisé/Missions imposées et refus
- Crime/Organisé/Quitter la maison
- Crime/Organisé/Prendre la tête
