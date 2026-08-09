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

**Score d’interactivité : 33 %**

4 interactives · 10 arbitrées · 13 passives

Une action arbitrée compte pour une demi-action interactive : décider n’est
pas jouer, mais c’est déjà beaucoup mieux que lire.

## Ordre de travail

1. **Finance — Investir** (PASSIVE, priorité 1)
   <br>*Manque : aucun portefeuille : le système n’existe pas encore*
2. **Crime — Vol de véhicule** (PASSIVE, priorité 2)
   <br>*Manque : puzzle fictif de précision sous jauge de détection*
3. **Crime — Braquage** (PASSIVE, priorité 2)
   <br>*Manque : minutage, niveau d’alerte, décision de partir*
4. **Véhicules — Permis de conduire** (PASSIVE, priorité 2)
   <br>*Manque : questionnaire fictif généré, échec et repassage*
5. **Crime — Vol à l’étalage** (PASSIVE, priorité 3)
   <br>*Manque : déplacement dans le magasin, surveillance, sortie*
6. **Prison — Émeute** (PASSIVE, priorité 3)
   <br>*Manque : rallier des détenus sans se faire intercepter*
7. **Justice — Procès** (ARBITRÉE, priorité 3)
   <br>*Manque : séquence à choix pendant l’audience*
8. **Travail — Entretien d’embauche** (PASSIVE, priorité 3)
   <br>*Manque : questions contextuelles selon le métier et le caractère*
9. **Musique — Concert** (PASSIVE, priorité 3)
   <br>*Manque : mini-jeu de rythme*
10. **Sport — Match ou compétition** (PASSIVE, priorité 3)
   <br>*Manque : visée et minutage selon le sport*
11. **Cinéma — Audition** (PASSIVE, priorité 3)
   <br>*Manque : mémorisation d’une réplique, minutage*
12. **Crime — Choix de la cible** (ARBITRÉE, priorité 4)

## PASSIVE — 13 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Vol de véhicule | puzzle fictif de précision sous jauge de détection |
| Crime | Braquage | minutage, niveau d’alerte, décision de partir |
| Crime | Vol à l’étalage | déplacement dans le magasin, surveillance, sortie |
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

## ARBITRÉE — 10 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Choix de la cible | — |
| Prison | Préparer une évasion | — |
| Prison | Vivre avec les détenus | — |
| Prison | Se rendre ou tenir la cavale | — |
| Justice | Procès | séquence à choix pendant l’audience |
| Justice | Choix de l’avocat | — |
| Enfance | Demander à ses parents | — |
| École | Manquer de respect | — |
| Travail | Demander une promotion | — |
| Jeux d’argent | Casino | — |

## INTERACTIVE — 4 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Vol à la tire | mini-jeu `pickpocket` |
| Crime | Cambriolage | mini-jeu `burglary` |
| Crime | Fuite après un coup | mini-jeu `chase` |
| Prison | Évasion | mini-jeu `escape` |

## Mini-jeux inscrits

| Identifiant | Catégorie | Objectif |
| --- | --- | --- |
| `burglary` | crime | Prendre ce qui vaut la peine, et ressortir avant qu’on te voie. |
| `chase` | crime | Rejoindre une sortie. Ils courent plus vite, mais tournent moins bien. |
| `escape` | crime | Traverser sans être vu. Les abris cachent, le faisceau ne pardonne pas. |
| `pickpocket` | crime | Approcher, retirer sans brusquer, et partir avant qu’on s’en aperçoive. |

Chaque mini-jeu est une fonction `step()` sans interface : les tests jouent
des parties entières sans navigateur, et « Résoudre automatiquement » passe
par exactement la même résolution que le jeu manuel.
