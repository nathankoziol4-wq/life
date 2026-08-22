# Audit de l’orientation paysage

## D’abord : le verrou n’en est pas un

`manifest.webmanifest` déclare `"orientation": "portrait"`, et les rapports
précédents s’en contentaient — « le jeu est conçu en portrait, rien ne la
force ». Cette ligne ne vaut que pour une application **installée**, en mode
autonome, et seulement sur Android. Dans un onglet de navigateur, et sur iOS
quoi qu’il arrive, tourner le téléphone tourne le jeu.

Le paysage n’est donc pas un cas exotique : c’est le cas de tout joueur qui
se couche avec son téléphone. Il est mesuré ici avec **la même sonde qu’en
portrait** (`tools/sonde-mobile.mjs`), plus deux mesures qui n’ont de sens
que couché.

La ligne du manifeste est conservée : elle sert les joueurs qui installent
le jeu sur Android, et elle ne coûte rien aux autres. Elle cesse simplement
de tenir lieu de réponse.

Testé sur 4 tailles × 6 écrans.

## Le compte

| Mesure | Paysage |
| --- | --- |
| Débordement horizontal | 0 |
| Cibles sous 44 points | 0 |
| Cibles trop serrées (< 8 pt) | 0 |
| Texte coupé par une ellipse | 0 |
| Texte sous 12 points | 0 |
| Contenu masqué par la barre | 0 |
| Écrans dont le bas est inatteignable | 0 |
| Écrans laissant moins de 180 pt au contenu | 0 |

## Ce qui reste au contenu

C’est la mesure propre au paysage : la hauteur de l’écran moins l’en-tête et
la barre du bas, qui ne rétrécissaient pas quand le téléphone se couche.

**Avant correction**, sur 800×360 : en-tête 113 pt, barre 101 pt — soit
**214 points d’habillage sur 360**, 59 % de l’écran, et 146 points laissés
au jeu. Dix-huit des vingt-quatre écrans mesurés passaient sous le seuil.

La correction ne change pas la mise en page — le jeu reste une colonne, et
c’est la bonne forme. Elle reprend la hauteur à l’habillage, qui n’en avait
pas besoin, en laissant intactes les deux règles qui appartiennent au doigt
et non à l’écran : 44 points pour une cible, 12 pour un texte.

| Taille | En-tête | Barre | Reste au contenu | |
| --- | --- | --- | --- | --- |
| 800x360 — petit Android couché | 97 pt | 67 pt | **196 pt** | ✅ |
| 812x375 — iPhone standard couché | 97 pt | 67 pt | **211 pt** | ✅ |
| 844x390 — iPhone 14 couché | 97 pt | 67 pt | **226 pt** | ✅ |
| 932x430 — grand iPhone couché | 97 pt | 67 pt | **266 pt** | ✅ |

Le pire cas mesuré laisse **196 points** au contenu.

## §42 — ce qui survit à la rotation

| Ce qui doit survivre | Résultat |
| --- | --- |
| La partie en cours | ✅ intacte |
| La feuille ouverte (Youssef Tazi) | ✅ toujours là |
| Le mini-jeu en cours | ✅ toujours en cours |
| La surface du mini-jeu tient dans l’écran | ✅ (278 pt de haut) |
