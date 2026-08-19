# Audit tactile des mini-jeux

§115 : **aucun mini-jeu n'est terminé s'il ne marche qu'à la souris.**

Ce document ne liste pas des impressions. Le test de fumée joue désormais sur
un vrai téléphone — 360×800, `hasTouch`, `isMobile` — et mesure, sur chaque
surface de jeu qu'il ouvre, les six choses qui empêchent réellement de jouer
au doigt.

## Ce qui est mesuré, et pourquoi

| Mesure | Ce qu'elle attrape |
| --- | --- |
| Taille de la surface | Une aire de jeu qui ne tient pas dans l'écran étroit |
| Le doigt change l'état | Le jeu ne réagit qu'à la souris — le défaut que §115 vise |
| Pas de défilement parasite | Le glissé fait défiler la page au lieu de jouer |
| Geste capté (`touch-action: none`) | La cause du précédent, vérifiée à la source |
| Sélection bloquée | Un glissé qui surligne du texte au lieu de jouer |
| Quitter atteignable | §120 : ce qui empêche de sortir est CRITICAL |
| Aucun débordement | La surface pousse la page hors de l'écran |

## Le socle, commun à tous

`components/MiniGameHost.tsx` était déjà correct sur l'essentiel, et il faut
le dire : **événements de pointeur** — pas `mousemove` ni `touchmove`
séparément — avec `setPointerCapture` dès l'appui, donc un glissé qui survit
au doigt sortant de la zone. `touch-action: none` et `user-select: none` sur
le bloc. Souris, doigt et stylet passent par le même chemin.

Deux manques y ont été corrigés :

- **`-webkit-touch-callout: none`** : un appui long ouvrait le menu du
  navigateur — copier, partager, aperçu — au milieu d'un geste de jeu.
- **Le bouton « Partir » faisait trente points.** Mesuré au doigt : on le
  rate. Rien de ce qui empêche de sortir d'un mini-jeu ne peut rester sous le
  seuil.

## Ce qui a été mesuré

| Mini-jeu | Surface | Doigt | Défilement | Geste capté | Sélection | Quitter | Débordement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pickpocket | 328×434 | ✅ | ✅ aucun | ✅ | ✅ | ✅ | ✅ aucun |
| Cambriolage | 328×346 | ✅ | ✅ aucun | ✅ | ✅ | ✅ | ✅ aucun |

Les deux jeux les plus exigeants au doigt — les seuls qui demandent un glissé
continu — passent les six critères sur un écran de 360 points.

## Ce qui reste à mesurer, et pourquoi

Le registre compte douze mini-jeux : `attic`, `burglary`, `chase`, `docking`,
`escape`, `exam`, `grid`, `infiltration`, `performance`, `pickpocket`,
`table`, `walkabout`.

Dix ne sont pas encore sondés, et la raison est la même pour tous : **il faut
atteindre la situation qui les ouvre**. Une partie de scène demande un
musicien qui a un concert, une évasion demande un détenu, un amarrage demande
un astronaute en mission. Le test de fumée sait déjà fabriquer ces
sauvegardes — c'est ainsi qu'il photographie la couronne ou le parloir — mais
chaque mini-jeu demande la sienne.

L'ordre suivant, par exigence tactile décroissante :

1. `escape`, `grid`, `infiltration` — des grilles, donc des cases dont la
   taille au doigt est la question centrale (§37 : ne pas réduire à dix
   points) ;
2. `performance`, `chase`, `docking` — du geste continu, comme le pickpocket ;
3. `exam`, `table`, `attic`, `walkabout` — de la touche simple, le cas le plus
   sûr.

## Ce qui n'a pas été traité

- **L'orientation paysage** : le jeu est conçu en portrait (§105) et rien ne
  la force ; sa gestion n'est pas vérifiée.
- **La reprise après rotation** (§42) : non testée.
- **Le retour haptique** (§113) : aucun point d'accroche n'existe encore.
