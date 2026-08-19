# Audit mobile

Mesuré, pas déclaré : le jeu est ouvert dans un vrai navigateur à cinq
largeurs de téléphone, et l'on lit ce que le moteur de rendu calcule. Chaque
ligne ci-dessous désigne un élément réel, avec sa taille réelle.

Seuils retenus : **44 points** pour une cible tactile, **12 points** pour un
texte lisible sans zoomer, **8 points** entre deux cibles voisines.

## Ce qui a été testé

- 360×800 — petit Android
- 375×812 — iPhone standard
- 390×844 — iPhone 14
- 393×852 — Pixel
- 430×932 — grand iPhone

- Journal de vie
- Parcours
- Proches
- Avoirs
- Agenda
- Fiche d’un proche
- Profil
- Santé

## Le compte

| Écran | Débordement | Cibles < 44 pt | Cibles serrées | Texte coupé | Texte < 12 pt | Masqué |
| --- | --- | --- | --- | --- | --- | --- |
| Journal de vie | 0 | 0 | 0 | 0 | 0 | 0 |
| Parcours | 0 | 0 | 0 | 0 | 0 | 0 |
| Proches | 0 | 0 | 0 | 0 | 0 | 0 |
| Avoirs | 0 | 0 | 0 | 0 | 0 | 0 |
| Agenda | 0 | 0 | 0 | 0 | 0 | 0 |
| Fiche d’un proche | 0 | 0 | 0 | 0 | 0 | 0 |
| Profil | 0 | 0 | 0 | 0 | 0 | 0 |
| Santé | 0 | 0 | 0 | 0 | 0 | 0 |

Total : **0** débordements, **0** cibles trop petites,
**0** couples trop serrés, **0** textes illisibles,
**0** éléments sous la barre.

Pages qui défilent latéralement : **0 sur 40**.

---

### CRITICAL — ce qui déborde de l’écran

Rien à signaler.

### CRITICAL — ce qu’on ne peut pas toucher (< 44 pt)

Rien à signaler.

### HIGH — ce que la barre du bas recouvre

Rien à signaler.

### HIGH — deux cibles trop proches

Rien à signaler.

### HIGH — texte coupé par une ellipse

Rien à signaler.

### MEDIUM — texte sous 12 points

Rien à signaler.


---

*Rapport produit par `tools/audit-mobile.mjs`. Relancer après chaque
correction : les chiffres sont la seule preuve que quelque chose a bougé.*
