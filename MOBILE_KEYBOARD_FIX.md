# Le clavier virtuel — ce qui a été mesuré, et corrigé

§18 et §71. C'était la dernière case non cochée de la passe mobile, et le
rapport précédent expliquait pourquoi d'une façon qui ne tenait pas :

> « Le clavier virtuel n'est pas testé — aucun champ de saisie n'apparaît dans
> les huit écrans parcourus. »

Vrai du parcours, faux du jeu. Il y a **sept à huit champs de saisie**, et le
tout premier est la première chose qu'un joueur fait : écrire son nom.

---

## Le compte

| Mesure | Avant | Après |
| --- | --- | --- |
| iOS agrandit la page à la mise au point (police < 16 pt) | 7 | **0** |
| Mauvais clavier, ou touche de validation muette | 7 | **0** |
| Champ sous 44 points | 7 | **0** |
| Champ masqué par le clavier | 0 | 0 |
| Rien pour valider une fois le clavier ouvert | 0 | 0 |
| Champ sans intitulé | 1 | **0** |

Sept champs avant, huit après — et ce n'est pas une mesure qui flotte. Le
huitième, « ta propre explication », appartient à une section de la création
qui ne s'ouvre que pour certains points de départ ; il porte la même classe et
la même absence d'attributs que les autres, donc il comptait pour trois
défauts de plus qu'on n'avait pas vus.

L'instrument est dans `tools/audit-clavier.mjs`. Il ouvre le jeu dans un vrai
navigateur à 360×800, va jusqu'à chaque endroit où l'on écrit, lit les
attributs que le navigateur transmettra au clavier, puis **rétrécit la fenêtre
de 336 points** — ce que fait Android quand le clavier monte — et regarde ce
que devient le champ.

Une limite, dite plutôt que sous-entendue : cela reproduit fidèlement Android
et iOS moderne, où la mise en page se réduit. Cela ne reproduit pas l'ancien
comportement d'iOS, où seule la fenêtre *visuelle* rétrécit et où un élément
en position fixe peut se retrouver sous le clavier.

---

## CRITICAL — corrigé

**La page zoomait à la mise au point, et ne revenait jamais.** Sous seize
points de police, Safari agrandit la page dès qu'un champ reçoit le focus.
C'est une règle du système, pas une préférence — et il n'y a pas de retour
automatique. Les sept champs étaient à **15 points** : un point trop bas.

Concrètement : on touchait « Prénom » sur l'écran de création, le jeu doublait
de taille, et l'on finissait de composer son personnage sur une page qu'il
fallait repincer à la main. Le premier écran du jeu.

Le jeton `--text-input: 16px` existe maintenant à part de `--text-body`,
précisément pour qu'on ne l'aligne pas dessus par souci d'harmonie.

**Aucun champ ne demandait le bon clavier.** Pas un seul `inputMode`,
`autoComplete`, `autoCapitalize` ou `enterKeyHint` dans tout le projet. Ce que
ça donnait :

| Champ | Ce qui s'ouvrait | Ce qui s'ouvre |
| --- | --- | --- |
| Prénom, nom | clavier sans majuscule, correcteur actif sur un nom propre | majuscule automatique, correcteur coupé, complétion du carnet d'adresses |
| Montant d'un emprunt | `type="number"` : sur iOS, un clavier complet avec une rangée de chiffres | `inputMode="numeric"` : le pavé numérique |
| Tous | touche « Entrée » qui ne faisait rien | « Suivant » entre prénom et nom, « OK » à la fin |

Le dernier point est le plus gênant des trois. Le clavier d'un téléphone n'a
pas d'échappement : sa seule sortie est la touche de validation. Elle ne
faisait rien — on avait écrit son nom, et il fallait deviner qu'il fallait
toucher ailleurs pour retrouver le bouton que le clavier venait de cacher.
Elle referme désormais le clavier, et sur le changement de nom elle valide
pour de bon.

## HIGH — corrigé

**Les champs faisaient 41 points de haut.** Le même défaut que le bouton de
retour et les parts d'un contrôle segmenté avant eux, au même endroit du
raisonnement : une taille choisie à l'œil sur un écran d'ordinateur. Ils font
47.

**Le montant n'avait pas de nom.** Ni intitulé visible, ni `aria-label` : une
voix de synthèse annonçait « champ de texte », et le curseur juste au-dessus
n'était pas nommé non plus. Les deux le sont.

**Toucher l'intitulé ne mettait pas le champ au point.** Les `<label>`
n'avaient pas de `for` — ils étaient décoratifs. Une cible de douze points de
haut qui ne fait rien, juste au-dessus du champ qu'on essaie d'atteindre.

## Ce qui allait déjà

**Le clavier ne masque aucun champ**, sur aucun des huit, et il reste toujours
de quoi valider. C'est la conséquence directe d'une décision antérieure : la
barre du bas est revenue **dans le flux** pendant la passe mobile. Une barre
en position fixe se serait posée sur le clavier ou l'aurait recouvert ; celle
d'ici se réduit avec la page, sans rien à corriger.

---

## Comment c'est corrigé, et pourquoi là

Sept champs répartis dans quatre écrans, c'est sept occasions d'oublier un
attribut — et ils avaient tous été oubliés sept fois. Les réglages ne sont
donc pas au point d'appel mais dans un composant, `TextField`
(`src/components/Modal.tsx`), avec quatre contrats nommés :

| Contrat | Pour | Ce qu'il demande |
| --- | --- | --- |
| `given` | un prénom | majuscule aux mots, pas de correcteur, complétion « prénom », touche « suivant » |
| `family` | un nom | idem, complétion « nom », touche « OK » |
| `sentence` | une phrase écrite par le joueur | majuscule en début de phrase, correcteur bienvenu |
| `amount` | une somme | pavé numérique, et un filtre qui ne laisse passer que des chiffres |

C'est le même raisonnement que `StartWhenReady` la semaine dernière : quand un
défaut se répète à chaque appel, c'est que le point d'appel n'est pas le bon
endroit pour le corriger.

---

## Ce que l'audit lui-même a dû apprendre

**Il cherchait les champs à la racine.** Premier passage : « écran d'accueil —
aucun champ de saisie trouvé ». C'était vrai — ils sont derrière le troisième
bouton, dans une modale. Et « changer de nom introuvable » : la ligne vit dans
les Démarches, pas sur l'agenda. Deux endroits sur quatre manqués, trois
champs mesurés sur sept.

Il l'a **dit**, et c'est le seul point qui compte ici : un outil qui se tait
quand il ne trouve pas rapporte zéro défaut et sonne comme un succès.

Ce qui amène au défaut trouvé en chemin, ailleurs.

### L'audit mobile mesurait six écrans en croyant en mesurer huit

`tools/audit-mobile.mjs` visite huit écrans en cliquant sur les onglets par
leur nom. La barre de navigation a été refaite pendant la refonte : « Parcours »
est devenu « Études », « Proches » est devenu « Gens ». Les deux entrées
correspondantes ne cliquaient donc plus rien — et la fonction `tab()` se
taisait quand elle ne trouvait pas d'onglet.

Résultat : l'audit remesurait le journal en croyant visiter deux autres
écrans. **« Zéro défaut sur huit écrans » valait pour six.** Les noms sont
corrigés, `tab()` lève désormais, et ce que le parcours n'ouvre pas est écrit
en clair au lieu d'être avalé.

Relancé sur les huit vrais écrans, le résultat tient : zéro sur les six
mesures, 0/40 pages qui défilent latéralement. Le chiffre était juste ; c'est
la raison de le croire qui manquait.

---

## Ce qui reste

- **L'ancien iOS**, où le clavier se superpose au lieu de réduire la page :
  non reproduit ici.
- **L'orientation paysage** : toujours pas testée (§105).
- **La performance en jeu** : `MOBILE_PERFORMANCE_AUDIT.md` reste à faire.
