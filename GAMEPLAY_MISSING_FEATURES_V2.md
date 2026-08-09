# Ce que le joueur peut faire, et ce qu’il ne fait que lire

> Document généré par `npm run audit:interactif` depuis
> `src/systems/interactiveAudit.ts`. Ne pas le modifier à la main.

La matrice de parité demande « cette fonctionnalité existe-t-elle ? ».
Ce document pose une autre question : **le joueur a-t-il quelque chose à
faire, ou seulement quelque chose à lire ?**

| Niveau | Ce que ça veut dire |
| --- | --- |
| **INTERACTIVE** | Un mini-jeu : le joueur agit, sa performance compte. |
| **ARBITRÉE** | Pas de mini-jeu, mais des décisions dont le résultat dépend. |
| **PASSIVE** | Un bouton, un tirage, un texte à lire. |

**Score d’interactivité : 21 %**

1 interactives · 8 arbitrées · 15 passives

Une action arbitrée compte pour une demi-action interactive : décider n’est
pas jouer, mais c’est déjà beaucoup mieux que lire.

## Ordre de travail

1. **Crime — Cambriolage** (PASSIVE, priorité 1)
   <br>*Manque : plan procédural, exploration, butin à arbitrer, bruit, occupants*
2. **Prison — Évasion** (PASSIVE, priorité 1)
   <br>*Manque : plan procédural, gardien mobile, zones surveillées*
3. **Finance — Investir** (PASSIVE, priorité 1)
   <br>*Manque : aucun portefeuille : le système n’existe pas encore*
4. **Crime — Vol de véhicule** (PASSIVE, priorité 2)
   <br>*Manque : puzzle fictif de précision sous jauge de détection*
5. **Crime — Braquage** (PASSIVE, priorité 2)
   <br>*Manque : minutage, niveau d’alerte, décision de partir*
6. **Crime — Fuite après un coup** (ARBITRÉE, priorité 2)
   <br>*Manque : phase de fuite jouable plutôt qu’un tirage d’échappée*
7. **Véhicules — Permis de conduire** (PASSIVE, priorité 2)
   <br>*Manque : questionnaire fictif généré, échec et repassage*
8. **Crime — Vol à l’étalage** (PASSIVE, priorité 3)
   <br>*Manque : déplacement dans le magasin, surveillance, sortie*
9. **Prison — Émeute** (PASSIVE, priorité 3)
   <br>*Manque : rallier des détenus sans se faire intercepter*
10. **Justice — Procès** (ARBITRÉE, priorité 3)
   <br>*Manque : séquence à choix pendant l’audience*
11. **Travail — Entretien d’embauche** (PASSIVE, priorité 3)
   <br>*Manque : questions contextuelles selon le métier et le caractère*
12. **Musique — Concert** (PASSIVE, priorité 3)
   <br>*Manque : mini-jeu de rythme*

## PASSIVE — 15 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Cambriolage | plan procédural, exploration, butin à arbitrer, bruit, occupants |
| Crime | Vol de véhicule | puzzle fictif de précision sous jauge de détection |
| Crime | Braquage | minutage, niveau d’alerte, décision de partir |
| Crime | Vol à l’étalage | déplacement dans le magasin, surveillance, sortie |
| Prison | Évasion | plan procédural, gardien mobile, zones surveillées |
| Prison | Émeute | rallier des détenus sans se faire intercepter |
| Véhicules | Permis de conduire | questionnaire fictif généré, échec et repassage |
| École | Examens scolaires | épreuve optionnelle, avec résolution automatique par défaut |
| Travail | Entretien d’embauche | questions contextuelles selon le métier et le caractère |
| Musique | Concert | mini-jeu de rythme |
| Sport | Match ou compétition | visée et minutage selon le sport |
| Cinéma | Audition | mémorisation d’une réplique, minutage |
| Mannequinat | Séance photo | pose et minutage |
| Astronaute | Mission spatiale | puzzle de procédure fictive |
| Finance | Investir | aucun portefeuille : le système n’existe pas encore |

## ARBITRÉE — 8 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Fuite après un coup | phase de fuite jouable plutôt qu’un tirage d’échappée |
| Crime | Choix de la cible | — |
| Justice | Procès | séquence à choix pendant l’audience |
| Justice | Choix de l’avocat | — |
| Enfance | Demander à ses parents | — |
| École | Manquer de respect | — |
| Travail | Demander une promotion | — |
| Jeux d’argent | Casino | — |

## INTERACTIVE — 1 action

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Vol à la tire | mini-jeu `pickpocket` |

## Mini-jeux inscrits

| Identifiant | Catégorie | Objectif |
| --- | --- | --- |
| `pickpocket` | crime | Approcher, retirer sans brusquer, et partir avant qu’on s’en aperçoive. |

Chaque mini-jeu est une fonction `step()` sans interface : les tests jouent
des parties entières sans navigateur, et « Résoudre automatiquement » passe
par exactement la même résolution que le jeu manuel.
