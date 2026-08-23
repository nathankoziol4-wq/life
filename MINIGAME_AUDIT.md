# Les mini-jeux

*Généré par `npm run catalog`. Un mini-jeu veut dire : **le joueur contrôle
quelque chose**. Une animation suivie d'un tirage n'en est pas un, et
n'apparaît pas comme tel ici.*

## Inscrits au registre (4)

| Identifiant | Où il sert |
| --- | --- |
| `burglary` | Crime/Cambriolage/Repérage des maisons<br>Crime/Cambriolage/Mini-jeu de plan |
| `chase` | Crime/Fuite/Poursuite jouable<br>Crime/Organisé/Mini-jeux de mission |
| `escape` | Prison/Évasion/Mini-jeu jouable |
| `pickpocket` | Crime/Vol à la tire/Choisir sa cible<br>Crime/Vol à la tire/Mini-jeu jouable |

## Ce qui devrait en avoir un

| État | Feuille | Note |
| --- | --- | --- |
| `COMPLETE` | Crime/Coups joués/Le chemin ne change pas le règlement | jouer ou laisser faire aboutit aux mêmes suites, et le tirage est consommé dans les deux cas — sans quoi ouvrir le mini-jeu décalerait toute la partie |
| `COMPLETE` | Justice/Procès/Laisser plaider son avocat | le chemin sans mini-jeu, comme pour les délits : il cède ce qu’il voit de solide et conteste ce qu’il voit de creux — 57,7 % de condamnations contre 57,3 % en s’en occupant soi-même |
| `MISSING` | Prison/Émeute/Mini-jeu dédié | — |

## La règle

- **jouer ou simuler** : tout mini-jeu répétitif doit pouvoir être passé, et
  la simulation doit produire un résultat cohérent avec le niveau du
  personnage ;
- **le résultat combine** la compétence du personnage, la performance du
  joueur, la difficulté et le contexte — le hasard pèse peu ;
- **l'échec compte** : rater doit avoir des suites réelles, sinon le mini-jeu
  est une animation.
