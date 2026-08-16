# Profondeur d'interaction

*Généré par `npm run catalog`. On mesure, pour chaque feuille existante,
jusqu'où va la chaîne : menu → sélection → actions → moment joué →
conséquences → impact durable. Une feuille qui s'arrête au menu est un
affichage, pas du gameplay.*

| Niveau | Ce que ça veut dire | Feuilles |
| ---: | --- | ---: |
| 0 | aucune interaction | 6 |
| 1 | un menu | 0 |
| 2 | une sélection | 6 |
| 3 | des actions avec effets | 50 |
| 4 | un moment joué | 10 |
| 5 | des conséquences persistantes | 417 |
| 6 | un impact sur le reste de la vie | 40 |

## Les feuilles qui s'arrêtent trop tôt

Existantes, mais dont la chaîne s'interrompt avant les conséquences durables.

| Niveau | État | Feuille | Note |
| ---: | --- | --- | --- |
| 3 | `COMPLETE` | Vie/Langues/Ce que ça coûte de ne pas parler | sous le seuil, le marché ne propose que des premiers échelons et les liens se nouent mal — vérifié sur les offres, pas seulement annoncé |
| 3 | `COMPLETE` | Éducation/Harcèlement/Aucune réponse universelle | chacune des cinq est la meilleure dans un contexte et la pire dans un autre — vérifié par test |
| 3 | `COMPLETE` | Relations/Registre/Une bibliothèque d’actions filtrée par contexte | — |
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
| 2 | `PLACEHOLDER` | Vie/Personnalité/Talents découverts | un événement « don caché » qui ne mène nulle part : le talent n’est ni stocké, ni cultivable, ni utilisable |
| 3 | `COMPLETE` | Vie/Langues/Parenté entre langues | une langue proche s’apprend vite ; choisir où partir devient une décision et pas une comparaison de salaires |
| 3 | `COMPLETE` | Vie/Mort/Score de vie | — |
| 3 | `COMPLETE` | Éducation/Établissement/Ce que la famille peut payer | le privé et l’internat dépendent du revenu du foyer, pas de ce que l’enfant veut |
| 3 | `COMPLETE` | Éducation/Camarades/Se réconcilier | le temps fait la moitié du travail ; sans cela une classe ne pouvait que se vider |
| 3 | `COMPLETE` | Éducation/Camarades/Dénoncer à un adulte | ce qu’ils en font dépend d’eux ; non entendu, ça se sait et ça coûte |
| 3 | `COMPLETE` | Éducation/Professeurs/Signaler un problème | existait déjà et était classé absent à tort : l’audit avait sa propre erreur |
| 3 | `COMPLETE` | Éducation/Sport/Ce que l’établissement propose | le champ `sports` de l’établissement décidait de rien ; il ouvre ou ferme des sports entiers |
| 3 | `COMPLETE` | Éducation/Sport/Dépendre de ses coéquipiers | seulement dans les sports collectifs : c’est ce qui les distingue d’une épreuve individuelle |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Résolution sans jouer | même chemin de conséquences, jamais plus favorable que bien jouer |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Engagement non honoré | se solde tout seul à la fin de l’année, et mal |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Ce que l’entourage prend | un grand groupe joue mieux et laisse moins |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Titres et rangs | cinq rangs fictifs ; la rente, le devoir attendu et l’exposition montent ensemble |
| 3 | `COMPLETE` | Carrières spéciales/Royauté/Scandales et retrait du rang | le poids récent des affaires, pas leur nombre ; une maison protège qui la sert |
| 3 | `COMPLETE` | Héritage/Défis/Chasses à indices | trois pistes dont on ne voit que le pas suivant, et qui se suivent dans l’ordre |
| 3 | `COMPLETE` | Héritage/Cabinet/Paliers ouverts par le cabinet | il n’accorde aucun avantage — c’est vérifié par un test — et n’ouvre que les défis suivants |
| 3 | `COMPLETE` | Événements/Calendrier/Cinq degrés de rareté | du banal au presque unique ; la comète passe une fois par quatre-vingts ans |
| 3 | `COMPLETE` | Méta/Équilibrage/Karma à rendements décroissants | il valait 99,9 de moyenne à quarante ans ; il revient vers l’ordinaire et répond de moins en moins aux extrêmes |
| 3 | `COMPLETE` | Éducation/Camarades/Offrir quelque chose | ça coûte, et à lien faible le geste se lit pour ce qu’il est |
| 3 | `COMPLETE` | Éducation/Camarades/Faire une farce | un pari sur le groupe : drôle si la classe rit avec toi, sanctionnée sinon |
| 3 | `COMPLETE` | Carrières spéciales/Scène/Sur scène depuis le Parcours | la carrière est visible depuis l’écran principal, pas cachée dans un menu |

## Intégration des PNJ

126 feuilles font réellement intervenir
un personnage non joueur. Les systèmes qui devraient en avoir et n'en ont pas :

- Relations/Amour/Bague de fiançailles
- Relations/Enfants/Traitement de fertilité
- Crime/Organisé/Rangs et progression
- Crime/Organisé/Missions
- Crime/Organisé/Missions imposées et refus
- Crime/Organisé/Quitter la maison
- Crime/Organisé/Prendre la tête
