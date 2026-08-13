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

**Score d’interactivité : 51 %**

10 interactives · 38 arbitrées · 9 passives

Une action arbitrée compte pour une demi-action interactive : décider n’est
pas jouer, mais c’est déjà beaucoup mieux que lire.

## Ordre de travail

1. **Crime — Vol de véhicule** (PASSIVE, priorité 2)
   <br>*Manque : puzzle fictif de précision sous jauge de détection*
2. **Crime — Braquage** (PASSIVE, priorité 2)
   <br>*Manque : minutage, niveau d’alerte, décision de partir*
3. **Véhicules — Permis de conduire** (PASSIVE, priorité 2)
   <br>*Manque : questionnaire fictif généré, échec et repassage*
4. **École — Répondre au harcèlement** (ARBITRÉE, priorité 2)
5. **Finance — Investir** (ARBITRÉE, priorité 2)
6. **Crime — Vol à l’étalage** (PASSIVE, priorité 3)
   <br>*Manque : déplacement dans le magasin, surveillance, sortie*
7. **Crime — Missions du milieu** (ARBITRÉE, priorité 3)
8. **Crime — Gérer la chaleur** (ARBITRÉE, priorité 3)
9. **Prison — Émeute** (PASSIVE, priorité 3)
   <br>*Manque : rallier des détenus sans se faire intercepter*
10. **Justice — Procès** (ARBITRÉE, priorité 3)
   <br>*Manque : séquence à choix pendant l’audience*
11. **Travail — Entretien d’embauche** (PASSIVE, priorité 3)
   <br>*Manque : questions contextuelles selon le métier et le caractère*
12. **Carrières spéciales — Accepter un engagement** (ARBITRÉE, priorité 3)

## PASSIVE — 9 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Vol de véhicule | puzzle fictif de précision sous jauge de détection |
| Crime | Braquage | minutage, niveau d’alerte, décision de partir |
| Crime | Vol à l’étalage | déplacement dans le magasin, surveillance, sortie |
| Prison | Émeute | rallier des détenus sans se faire intercepter |
| Véhicules | Permis de conduire | questionnaire fictif généré, échec et repassage |
| École | Examens scolaires | épreuve optionnelle, avec résolution automatique par défaut |
| Travail | Entretien d’embauche | questions contextuelles selon le métier et le caractère |
| Cinéma | Audition | l’essai lui-même ne se joue pas : on est retenu selon son niveau |
| Astronaute | Mission spatiale | puzzle de procédure fictive |

## ARBITRÉE — 38 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Choix de la cible | — |
| Crime | Missions du milieu | — |
| Crime | Tenir son carnet | — |
| Crime | Gérer la chaleur | — |
| Justice | Enquête en cours | — |
| Prison | Préparer une évasion | — |
| Prison | Vivre avec les détenus | — |
| Prison | Se rendre ou tenir la cavale | — |
| Justice | Procès | séquence à choix pendant l’audience |
| Justice | Choix de l’avocat | — |
| Enfance | Demander à ses parents | — |
| Enfance | Faire quelque chose en famille | — |
| Enfance | Sortir voir qui est dehors | — |
| École | Manquer de respect | — |
| Travail | Demander une promotion | — |
| Travail | Fixer son tarif à son compte | — |
| Travail | Accepter une commande | — |
| Travail | Ouvrir une entreprise | — |
| Travail | Régler effectif, prix et présence | — |
| Travail | Vendre son entreprise | — |
| Patrimoine | Choisir un locataire | — |
| Patrimoine | Fixer un loyer | — |
| Patrimoine | Trancher une demande de travaux | — |
| Famille | Choisir par qui continuer la lignée | — |
| Célébrité | Donner une interview | — |
| Célébrité | Répondre à une affaire | — |
| Célébrité | Accepter une apparition | — |
| Carrières spéciales | Accepter un engagement | — |
| Carrières spéciales | Prendre un agent | — |
| École | Répondre au harcèlement | — |
| École | Voir quelqu’un se faire prendre à partie | — |
| École | Passer une sélection sportive | — |
| École | Tricher à un examen | — |
| École | Se présenter comme capitaine | — |
| Finance | Investir | — |
| Finance | Répartir son portefeuille | — |
| Finance | Vendre au bon moment | — |
| Jeux d’argent | Casino | — |

## INTERACTIVE — 10 actions

| Domaine | Action | Manque |
| --- | --- | --- |
| Crime | Vol à la tire | mini-jeu `pickpocket` |
| Crime | Cambriolage | mini-jeu `burglary` |
| Crime | Fuite après un coup | mini-jeu `chase` |
| Prison | Évasion | mini-jeu `escape` |
| Musique | Concert | mini-jeu `performance` |
| Sport | Match ou compétition | mini-jeu `performance` |
| Cinéma | Tenir un rôle | mini-jeu `performance` |
| Mannequinat | Séance photo ou défilé | mini-jeu `performance` |
| Politique | Tenir un mandat | mini-jeu `performance` |
| École | Passer un examen | mini-jeu `exam` |

## Mini-jeux inscrits

| Identifiant | Catégorie | Objectif |
| --- | --- | --- |
| `burglary` | crime | Prendre ce qui vaut la peine, et ressortir avant qu’on te voie. |
| `chase` | crime | Rejoindre une sortie. Ils courent plus vite, mais tournent moins bien. |
| `escape` | crime | Traverser sans être vu. Les abris cachent, le faisceau ne pardonne pas. |
| `exam` | examen | Choisis tes questions et tiens l’appui pour les travailler. Le temps ne s’arrête pas. |
| `performance` | carrière | Reste sur la ligne, et tiens les moments qui comptent. |
| `pickpocket` | crime | Approcher, retirer sans brusquer, et partir avant qu’on s’en aperçoive. |

Chaque mini-jeu est une fonction `step()` sans interface : les tests jouent
des parties entières sans navigateur, et « Résoudre automatiquement » passe
par exactement la même résolution que le jeu manuel.
