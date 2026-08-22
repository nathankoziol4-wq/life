# Profondeur d'interaction

*Généré par `npm run catalog`. On mesure, pour chaque feuille existante,
jusqu'où va la chaîne : menu → sélection → actions → moment joué →
conséquences → impact durable. Une feuille qui s'arrête au menu est un
affichage, pas du gameplay.*

| Niveau | Ce que ça veut dire | Feuilles |
| ---: | --- | ---: |
| 0 | aucune interaction | 6 |
| 1 | un menu | 0 |
| 2 | une sélection | 7 |
| 3 | des actions avec effets | 58 |
| 4 | un moment joué | 10 |
| 5 | des conséquences persistantes | 457 |
| 6 | un impact sur le reste de la vie | 59 |

## Les feuilles qui s'arrêtent trop tôt

Existantes, mais dont la chaîne s'interrompt avant les conséquences durables.

| Niveau | État | Feuille | Note |
| ---: | --- | --- | --- |
| 3 | `COMPLETE` | Vie/Langues/Ce que ça coûte de ne pas parler | sous le seuil, le marché ne propose que des premiers échelons et les liens se nouent mal — vérifié sur les offres, pas seulement annoncé |
| 3 | `COMPLETE` | Éducation/Harcèlement/Aucune réponse universelle | chacune des cinq est la meilleure dans un contexte et la pire dans un autre — vérifié par test |
| 3 | `COMPLETE` | Relations/Registre/Une bibliothèque d’actions filtrée par contexte | quatre contextes et la famille adulte ; mesuré, une mère passe de 10 actions sur toute une vie à 15, et de 8 identiques à tout âge à un menu qui change à 6, 16, 35 et 70 ans |
| 3 | `COMPLETE` | Carrière/Recherche/Conditions d’accès vérifiées | — |
| 3 | `COMPLETE` | Carrière/Équipe/Le soutien pèse sur la carrière | — |
| 3 | `COMPLETE` | Événements/Format/Conditions riches | — |
| 3 | `COMPLETE` | Éducation/Notes/Orientation par le bulletin | une filière lit ses trois matières à elle, pas la moyenne générale |
| 3 | `COMPLETE` | Enfance/Activités/L’engagement de l’adulte compte | — |
| 3 | `COMPLETE` | Relations/Amour/Orientation respectée | — |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Prendre plus grand que soi | l’enjeu module l’accueil : réussir un rôle facile n’impressionne personne |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Déclin par l’âge | pente propre à chaque métier : brutale au sport, nulle en politique |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Ordre de succession | aucune action ne fait monter d’une place ; la file se vide par les morts et se remplit par les naissances |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Opinion sur soi et sur la couronne | deux jauges jamais confondues ; la lente décide de la survie de l’institution |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Transmission du rang à l’héritier | la seule chose du jeu qui se transmette en montant ; un titre d’anobli s’éteint en trois générations |
| 3 | `COMPLETE` | Santé/Maladies/Coût des soins selon le pays | — |
| 3 | `COMPLETE` | Justice/Sévérité/Variation par pays | — |
| 3 | `COMPLETE` | Événements/Densité/Aucune année vide | mesuré : 3,4 % d’années vides et 14 % entre six et treize ans, ramenés à 0,1 % — l’occasion ne se pose que si l’année n’a rien produit d’autre |
| 3 | `COMPLETE` | Méta/Équilibrage/Point de passage unique des statistiques | sept canaux faisaient monter l’intelligence et vingt-six le karma, chacun avec ses règles ou sans règle |
| 3 | `COMPLETE` | Méta/Équilibrage/Moyenne scolaire centrée | elle valait 15,2 sur 20 : un élève ordinaire obtient désormais une note ordinaire, et le haut reste atteignable |
| 3 | `COMPLETE` | Vie/Langues/Parenté entre langues | une langue proche s’apprend vite ; choisir où partir devient une décision et pas une comparaison de salaires |
| 3 | `COMPLETE` | Vie/Mort/Score de vie | — |
| 3 | `COMPLETE` | Éducation/Établissement/Ce que la famille peut payer | le privé et l’internat dépendent du revenu du foyer, pas de ce que l’enfant veut |
| 3 | `COMPLETE` | Éducation/Camarades/Se réconcilier | le temps fait la moitié du travail ; sans cela une classe ne pouvait que se vider |
| 3 | `COMPLETE` | Éducation/Camarades/Dénoncer à un adulte | ce qu’ils en font dépend d’eux ; non entendu, ça se sait et ça coûte |
| 3 | `COMPLETE` | Éducation/Professeurs/Signaler un problème | existait déjà et était classé absent à tort : l’audit avait sa propre erreur |
| 3 | `COMPLETE` | Éducation/Sport/Ce que l’établissement propose | le champ `sports` de l’établissement décidait de rien ; il ouvre ou ferme des sports entiers |
| 3 | `COMPLETE` | Éducation/Sport/Dépendre de ses coéquipiers | seulement dans les sports collectifs : c’est ce qui les distingue d’une épreuve individuelle |
| 3 | `COMPLETE` | Relations/Amour/Fiançailles | une demande acceptée ne marie plus dans la seconde : elle ouvre un an de préparation, pendant lequel la vie peut s’en mêler — si le fiancé meurt, la noce s’efface |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Résolution sans jouer | même chemin de conséquences, jamais plus favorable que bien jouer |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Engagement non honoré | se solde tout seul à la fin de l’année, et mal |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Ce que l’entourage prend | un grand groupe joue mieux et laisse moins |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Titres et rangs | cinq rangs fictifs ; la rente, le devoir attendu et l’exposition montent ensemble |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Scandales et retrait du rang | le poids récent des affaires, pas leur nombre ; une maison protège qui la sert |
| 3 | `COMPLETE` | Placements/Sociétés/Santé propre à chaque société | jamais affichée : elle pousse le cours de l’année suivante, ce qui laisse un an au joueur pour la lire dans le rapport — sans ce décalage, mesuré, lire l’avenir rapportait moins que lire le passé |
| 3 | `COMPLETE` | Placements/Sociétés/Le risque d’une part seule | une maison seule est toujours plus agitée que le panier de sa catégorie : acheter sans lire donne un premier décile à −20,1 % contre −8,6 % pour le panier, soit le risque sans la contrepartie |
| 2 | `BASIC` | Placements/Sociétés/Quantité de titres détenus | le nombre de parts se lit à côté de la somme placée ; c’est un affichage, sans conséquence propre |
| 2 | `BASIC` | Placements/Historique/Graphique de cours | vingt ans de cours, sans axe ni chiffre : ce qui se lit est une forme, et cela ne décide de rien tout seul |
| 3 | `COMPLETE` | Crime/Coups joués/Le chemin ne change pas le règlement | jouer ou laisser faire aboutit aux mêmes suites, et le tirage est consommé dans les deux cas — sans quoi ouvrir le mini-jeu décalerait toute la partie |
| 3 | `COMPLETE` | Crime/Braquage/Décider quand partir | la limite est tirée entre 82 et 100 et jamais montrée : sans elle, l’alerte étant affichée et sa montée calculable, partir plus tard ne risquait rien et pousser n’était jamais un pari |
| 3 | `COMPLETE` | Crime/Braquage/La prise décide du gain | ce qu’on emporte vient du nombre de passes réussies, sinon partir tout de suite et rester jusqu’au bout paieraient pareil et la seule décision du minutage n’aurait aucune conséquence |

## Intégration des PNJ

148 feuilles font réellement intervenir
un personnage non joueur. Les systèmes qui devraient en avoir et n'en ont pas :

- Relations/Registre/La manière de s’y prendre
- Relations/Registre/Une décision en crée d’autres
- Relations/Amour/Profils à comparer
- Relations/Amour/Rester sans réponse
- Relations/Amour/Bague de fiançailles
- Relations/Amour/Choisir un avocat de divorce
- Relations/Enfants/Traitement de fertilité
- Relations/Enfants/Ce qu’on accepte d’accueillir
- Crime/Organisé/Rangs et progression
- Crime/Organisé/Missions
- Crime/Organisé/Missions imposées et refus
- Crime/Organisé/Quitter la maison
- Crime/Organisé/Mini-jeux de mission
- Crime/Organisé/Prendre la tête
