# La densité par âge

*Généré par `npm run audit:densite`. Deux mesures : ce que le catalogue
autorise à cet âge, et ce dans quoi le moteur peut réellement tirer une
année donnée — conditions complètes comprises. La seconde peut être bien
plus basse que la première, et c’est elle qui compte.*

**189 événements au catalogue, 150 vies jouées.**

| Tranche | Âges | Au catalogue | Réellement tirables |
| --- | ---: | ---: | ---: |
| Avant l’école | 0–5 | 61 | 25.1 |
| L’école primaire | 6–10 | 52 | 29.6 |
| Le collège | 11–14 | 57 | 25.0 |
| Le lycée | 15–17 | 63 | 34.8 |
| Les débuts | 18–25 | 111 | 35.5 |
| L’âge adulte | 26–44 | 98 | 28.9 |
| La deuxième moitié | 45–64 | 100 | 29.1 |
| Après soixante-cinq | 65–… | 99 | 27.2 |

La tranche la plus pauvre est **Le collège** (25.0 tirables
une année donnée), la plus riche **Les débuts** (35.5).
L’écart est de **1.4×**.

Un âge qu’on traverse sans que rien n’arrive est un trou que personne ne
voit : un écran vide ressemble à un écran calme. C’est à cela que sert cette
page, et c’est pourquoi `enfance.test.ts` en tient un plancher, année par
année et non en moyenne.

## Année par année

*La moyenne par tranche cache les falaises. « Avant l’école » rendait 13,3 —
bas, mais lisible comme une pente ; année par année c’était 1,4 à un an et
2,8 à deux ans, puis 21,7 à quatre. Les vingt événements ajoutés par un audit
précédent commençaient tous à trois ans ou plus, et la moyenne les masquait.*

| Âge | Tirables | Âge | Tirables |
| ---: | ---: | ---: | ---: |
| 1 | 13.1 | 11 | 18.8 |
| 2 | 21.1 | 12 | 26.8 |
| 3 | 27.5 | 13 | 25.9 |
| 4 | 30.3 | 14 | 28.5 |
| 5 | 34.0 | 15 | 30.4 |
| 6 | 33.5 | 16 | 38.8 |
| 7 | 32.9 | 17 | 35.1 |
| 8 | 31.6 | 18 | 40.8 |
| 9 | 26.1 | 19 | 37.4 |
| 10 | 23.7 |  |  |

**Aucune année creuse** : toutes passent 10 événements tirables.

