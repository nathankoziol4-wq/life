# Parité des fonctionnalités pendant la refonte

Ce document existe pour une seule raison : **une refonte d'interface fait
disparaître des fonctionnalités sans que personne s'en aperçoive.** Un écran
réécrit oublie une ligne, et la ligne oubliée est une action que le joueur ne
peut plus faire — alors que le système derrière fonctionne toujours.

La règle : après chaque écran migré, l'ancien proposait *X* actions, le
nouveau doit en proposer *au moins X*. Rien ne se perd, tout se déplace.

Le garde-fou n'est pas ce document — un document ne vérifie rien. C'est
`tools/smoke.mjs`, qui ouvre le jeu dans un vrai navigateur et parcourt chaque
écran : si une action disparaît, sa vérification passe au rouge.

---

## Ce qui est migré

| Ancien | Nouveau | Fonctionnalités | État |
| --- | --- | --- | --- |
| `components/CharacterHeader.tsx` | `ui/components/AppHeader.tsx` | avatar, nom, âge, situation, argent, 4 jauges, accès au profil | **migré** — et enrichi : pastilles d'état (détenu, recherché, marié, retraité, connu), une teinte par jauge |
| `components/LifeTimeline.tsx` | `ui/components/LifeFeed.tsx` | regroupement par âge, défilement auto vers l'année jouée, ton par entrée | **migré** — et enrichi : repère d'année lisible, icône et teinte par famille d'événement |
| `components/Navigation.tsx` | `ui/components/TabBar.tsx` | 4 destinations, bouton « +1 an », état bloqué | **migré** — et corrigé : le journal devient une destination fixe au lieu d'un état caché ; repère de position visible autrement que par la couleur |
| — | `screens/ProfileScreen.tsx` → « Apparence » | choix du thème | **ajouté** — clair, sombre, ou comme l'appareil |

### Ce qui a changé pour le joueur

- **Le journal ne se cache plus.** L'onglet actif se transformait en
  « Journal », si bien que le repère se déplaçait sous le doigt. Cinq
  destinations fixes désormais.
- **Les jauges se distinguent.** Quatre barres de la même couleur ne se
  lisaient pas d'un coup d'œil ; chacune porte maintenant sa teinte.
- **Les états se voient.** Détenu, recherché, marié, retraité, connu :
  autant de choses qui changent la partie et qu'il fallait aller chercher.
- **Le thème se choisit.** Les jetons des deux thèmes existaient, mais rien
  ne permettait de demander l'un plutôt que l'autre : un téléphone réglé en
  sombre imposait le sombre. « Appareil » reste le défaut ; ce n'est plus une
  fatalité.

---

## Ce qui reste en ancienne interface

Ces écrans fonctionnent et gardent toutes leurs actions ; ils n'ont pas encore
été repris. Ils héritent déjà des nouveaux jetons — donc du mode sombre — mais
pas encore des nouvelles primitives ni de la nouvelle disposition.

| Écran | Lignes | Ordre de reprise (§133) |
| --- | --- | --- |
| `components/ActivityMenu.tsx` | 1058 | 6 — activités |
| `screens/SchoolScreen.tsx` | 1305 | 5 — carrière |
| `screens/AssetsScreen.tsx` | 930 | 7 — avoirs |
| `screens/CreationScreen.tsx` | 886 | 11 — création |
| `screens/RelationshipsScreen.tsx` | 849 | 4 — relations |
| `screens/OccupationScreen.tsx` | 737 | 5 — carrière |
| `screens/StageScreen.tsx` | 699 | 10 — carrières spéciales |
| `screens/VentureScreen.tsx` | 534 | 8 — entreprise |
| `screens/CampaignScreen.tsx` | 510 | 10 — carrières spéciales |
| `screens/ServiceScreen.tsx` | 503 | 10 — carrières spéciales |
| … 22 autres écrans | | |

---

## Ce que la mesure disait avant de commencer

```
32 écrans · 12 535 lignes
11 composants · 2 445 lignes
1 771 lignes de CSS · 193 classes
443 `style={{}}` écrits à la main dans 39 fichiers
37 tailles de police en dur · 72 valeurs numériques en dur
jetons : couleurs, rayons, ombres — mais ni typographie, ni espacement,
         ni mouvement, ni mode sombre
```

C'est ce dernier point qui commandait l'ordre des travaux : tant que les
valeurs sont écrites dans les écrans, aucun thème ne peut exister, et chaque
écran repris rouvre la même discussion. Les jetons d'abord, donc.
