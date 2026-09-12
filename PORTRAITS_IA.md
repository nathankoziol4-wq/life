# Passer le portrait à des images générées

Ce document existe parce que la demande — « génère les têtes avec l'IA, ne les
code pas » — est réalisable, mais pas de la façon dont elle se formule
naturellement. Il dit ce qu'il faut produire, en quelle quantité, avec quelles
consignes, et ce qui reste à faire côté code une fois les images là.

## Pourquoi on ne génère pas des têtes, mais des calques

Le portrait actuel croise huit axes :

| Axe | Valeurs | Source |
| --- | --- | --- |
| Teint | 7 | `SKIN_TONES` |
| Couleur de cheveux | 7 | `HAIR_COLORS` |
| Coiffure | 7 | `HAIR_STYLES` |
| Couleur des yeux | 7 | `EYE_COLORS` |
| Forme du visage | 6 | `FACE_SHAPES` |
| Pilosité | 5 | `FACIAL_HAIR` |
| Humeur | 5 | déduite de la santé et du bonheur |
| Âge | continu | déduit de l'âge du personnage |

Une tête générée par combinaison, c'est **plus de deux millions d'images**, et
le nombre remonte dès qu'on ajoute une coiffure. Ce n'est pas une question de
budget de génération : c'est la mauvaise unité.

L'unité juste est le **calque**. On génère chaque pièce séparément — une tête
nue par teint et par tranche d'âge, une chevelure par coiffure et par couleur,
une barbe par style et par couleur — et on les empile à l'exécution. Le nombre
passe de deux millions à **environ cent trente**.

C'est exactement l'architecture actuelle. Le dessin vectoriel empile déjà ces
mêmes calques ; on remplace la matière, pas la structure.

## Ce qu'il faut générer

Toutes les images : **PNG, fond transparent, 600 × 600**, cadrées sur la même
grille (voir « L'alignement » plus bas).

| Calque | Combinaisons | Nombre |
| --- | --- | --- |
| Tête nue (visage, oreilles, nez, joues) | 7 teints × 4 âges | 28 |
| Yeux (paire ouverte) | 7 couleurs | 7 |
| Sourcils | 7 couleurs de cheveux | 7 |
| Bouches | 5 humeurs × 2 familles de teint | 10 |
| Chevelures | 7 coiffures × 7 couleurs | 49 |
| Barbes | 4 styles × 7 couleurs | 28 |
| **Total** | | **129** |

Les quatre tranches d'âge de la tête nue : **enfant** (0–12), **jeune adulte**
(13–40), **mûr** (41–64), **âgé** (65+). Le grisonnement des cheveux et de la
barbe ne demande pas d'images en plus : il se calcule en mélangeant vers le
gris, comme aujourd'hui.

Les paupières tombantes des humeurs `lassitude` et `mal` restent calculées :
ce sont des masques posés sur les yeux, pas des images.

## L'alignement, et pourquoi tout se joue là

**C'est le seul point qui peut faire échouer l'ensemble.** Une chevelure
générée pour une tête doit se poser sur les six autres sans flotter ni mordre.
Un modèle d'image ne garantit rien de tel tout seul.

La méthode qui marche : générer **d'abord une tête nue de référence**, puis
demander chaque autre calque *en montrant cette tête*, avec la consigne
explicite de la laisser visible et de ne dessiner que la pièce demandée.
Ensuite on efface la tête de référence dans le résultat.

Repères sur la grille 600 × 600, repris du dessin actuel (grille 200
multipliée par 3) :

- sommet du crâne : **y = 66**
- centre des yeux : **y = 342**, x = 213 et x = 387
- bas du nez : **y = 402**
- ligne des lèvres : **y = 456**
- menton : **y = 552**
- largeur du visage aux tempes : **x = 78 à x = 522**

## Les consignes de génération

Le style à tenir, commun à toutes les images — c'est celui de la référence
donnée pour le portrait actuel :

> Illustration vectorielle douce, style emoji Apple. Aucun contour, aucun trait
> d'encre. Le volume vient de dégradés doux : clair en haut à gauche, plus
> sombre sur les bords. Aplats propres, pas de texture, pas de grain. Fond
> parfaitement transparent. Vue strictement de face, centrée, symétrique dans
> son cadrage.

Puis, par calque :

**Tête nue** — « Une tête ronde vue de face, sans cheveux, sans sourcils, sans
bouche, yeux fermés lisses. Joues pleines, petit menton arrondi, oreilles
petites et légèrement décollées à hauteur des yeux. Teint *{teint}*. Âge
apparent : *{tranche}*. »

**Yeux** — « Une paire d'yeux seule, sur fond transparent, sans visage autour.
Grands et ronds, iris *{couleur}* large occupant presque toute l'ouverture, un
gros éclat blanc en haut à gauche et un petit en bas à droite. »

**Chevelure** — « Une chevelure seule, sur fond transparent, sans visage. Vue
de face. *{description de la coiffure}*. Couleur *{couleur}*, avec un reflet
brillant sur le haut du crâne. Elle encadre le visage : elle descend de chaque
côté jusque sous la ligne des yeux et couvre le haut des oreilles. »

**Barbe** — « Une pilosité de visage seule, sur fond transparent, sans visage.
*{description}*. Couleur *{couleur}*. Elle laisse la bouche entièrement
dégagée. »

Les sept descriptions de coiffure et les quatre de pilosité sont les valeurs
de `HAIR_STYLES` et `FACIAL_HAIR` dans `src/data/cradle.ts`.

## Où les déposer, et ce que je fais ensuite

Déposer dans `public/portraits/`, nommées par calque et valeurs, séparées par
des tirets, sans accent ni espace :

```
public/portraits/tete-mate-adulte.png
public/portraits/cheveux-mi-longs-auburn.png
public/portraits/barbe-bouc-noirs.png
```

Ce qui reste à écrire côté code, une fois les images là :

1. un composant qui empile les calques au lieu de dessiner des tracés ;
2. une table qui traduit les mots du jeu vers les noms de fichiers, avec le
   même repli muet qu'aujourd'hui — et le test qui va avec, parce qu'un fichier
   manquant ne casse rien : il laisse un trou ;
3. le préchargement du médaillon de l'en-tête, qui est visible sur tous les
   écrans et ne doit pas clignoter à chaque année ;
4. une mesure du poids : cent trente PNG de 600 × 600 pèsent lourd dans le
   paquet, et le jeu se joue sur téléphone.

**Le dessin vectoriel reste.** Il ne coûte rien au paquet, il se met à
l'échelle sans se pixelliser, et il sert de repli tant que toutes les images
n'existent pas. Un portrait à moitié en images et à moitié en tracés est pire
que l'un ou l'autre ; le basculement se fera d'un coup, quand les cent trente
seront là.

## Ce que cette session ne peut pas faire

Aucun outil de génération d'image n'est disponible ici. Ce document est donc
la moitié réalisable de la demande : la spécification exacte de ce qu'il faut
produire, écrite pour que la génération puisse se faire ailleurs et que le
câblage soit mécanique ensuite.
