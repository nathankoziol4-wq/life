/**
 * Le nom — naître de quelqu'un que tout le monde connaît.
 *
 * **Ce que ce fichier ouvre.** La naissance est l'un des endroits les mieux
 * fournis du jeu : parents avec métier et âge, fratrie, famille élargie,
 * richesse et revenus du foyer, logement, quartier, prédispositions
 * héréditaires, dix-sept milieux composables, et depuis peu l'adoption et le
 * placement. Une seule chose n'existait pas : **naître de quelqu'un.** Le
 * catalogue le disait en cinq mots — « hériter d'une notoriété au berceau ».
 *
 * Ce n'est pas un drapeau posé sur une vie. Un nom se porte ou se quitte, et
 * les deux coûtent :
 *
 * — **il n'ouvre que sa propre porte.** L'enfant d'un chirurgien ne tire rien
 *   du nom d'un musicien. La notoriété a douze domaines dans ce jeu
 *   (`data/fame.ts`) et le nom n'agit que dans le sien ;
 * — **il fait comparer.** Entrer dans le domaine du parent, c'est démarrer
 *   plus vite et être jugé plus durement — le public attend davantage de
 *   celui qui porte le nom ;
 * — **il se voit dès l'enfance.** On est regardé sans avoir rien fait, ce qui
 *   se paie partout où l'on préférerait passer inaperçu ;
 * — **il s'efface.** Un parent qu'on n'a pas vu depuis vingt ans n'est plus
 *   personne, et le nom avec lui.
 *
 * **Et l'on peut s'en défaire.** `activities.ts#changeName` existait, marqué
 * « aucune conséquence : ni réputation, ni réaction des proches ». Changer de
 * nom en a une désormais : on perd la porte et la comparaison d'un coup, on
 * garde ce qu'on a construit soi-même, et le parent l'apprend.
 */

/* ------------------------------------------------------------------ */
/* De qui l'on naît                                                    */
/* ------------------------------------------------------------------ */

/**
 * Les hauteurs possibles d'un nom, et ce qu'elles pèsent.
 *
 * Trois seulement, et volontairement : au-delà, la différence entre deux
 * échelons ne se sentirait plus et l'on aurait une échelle décorative.
 */
export interface Standing {
  id: string;
  label: string;
  emoji: string;
  /** La notoriété du parent, 0-100. */
  level: number;
  /** Ce que le nom vaut à la naissance, avant le domaine. */
  worth: number;
  line: string;
}

export const STANDINGS: Standing[] = [
  {
    id: 'local', label: 'Connu dans la région', emoji: '📍', level: 34, worth: 0.5,
    line: 'On sait qui c’est à cent kilomètres à la ronde, et nulle part ailleurs.',
  },
  {
    id: 'national', label: 'Un nom que tout le monde connaît', emoji: '📺', level: 62, worth: 1,
    line: 'Les gens croient te connaître avant de t’avoir parlé.',
  },
  {
    id: 'immense', label: 'Une figure', emoji: '🌟', level: 88, worth: 1.7,
    line: 'Tu ne seras jamais présenté autrement que comme son enfant.',
  },
];

export function getStanding(id: string): Standing | undefined {
  return STANDINGS.find((s) => s.id === id);
}

/**
 * La chance qu'une vie prise au hasard commence avec un nom.
 *
 * **Rare, et il faut qu'elle le reste.** Ce n'est pas un milieu de plus dans
 * la liste : c'est une exception, et elle ne vaut que si elle en est une. À
 * une vie sur douze, on la rencontrerait sans y penser et elle cesserait
 * d'être une autre façon de jouer.
 */
export const BORN_KNOWN = 0.035;

/* ------------------------------------------------------------------ */
/* Ce que le nom fait                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ce que le nom donne, **dans son domaine seulement**.
 *
 * C'est la règle qui empêche le nom d'être une prime générale : douze
 * domaines existent, et le nom n'agit que dans le sien. L'enfant d'un
 * chirurgien devenu musicien part de zéro comme tout le monde — sauf qu'on le
 * regarde.
 */
export const DOOR = 0.42;

/**
 * Ce que le nom donne partout ailleurs.
 *
 * Petit, et non nul : un nom connu ouvre un peu partout, mais si peu que ce
 * n'est jamais une raison de choisir sa vie.
 */
export const DOOR_ELSEWHERE = 0.08;

/**
 * Ce que la comparaison ajoute d'attente, dans le domaine du parent.
 *
 * **Le contrepoids de la porte, et au même endroit.** Entrer dans le domaine
 * du parent fait démarrer plus vite *et* juger plus durement : ce qu'on y
 * rate se sait davantage. Sans cela, suivre le parent serait le bon calcul
 * dans tous les cas, et il n'y aurait rien à décider.
 */
export const SHADOW = 0.55;

/**
 * Ce que le nom coûte en discrétion, dès l'enfance.
 *
 * Multiplié dans `fame.ts#recognitionFactor` : on est regardé sans avoir rien
 * fait. C'est le seul effet du nom qui joue avant l'âge adulte.
 */
export const WATCHED = 0.5;

/* ------------------------------------------------------------------ */
/* Ce que le temps en fait                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le nom perd chaque année.
 *
 * **Mesuré, et corrigé pour ça.** À 2,6, un nom même immense était oublié
 * vers vingt-six ans : il ne colorait plus que l'enfance, c'est-à-dire la
 * partie de la vie où presque rien ne s'en sert. À 1,1, les trois hauteurs se
 * distinguent enfin sur la durée — un nom régional s'éteint vers vingt ans,
 * une figure tient une vie entière — et c'est cette différence-là qui donne
 * son sens à l'échelle.
 */
export const FADE = 1.1;

/**
 * Ce qu'il reste du nom à la mort du parent : une coupe, une seule fois.
 *
 * La première version en faisait une **accélération** de l'usure, ce qui
 * contredisait ce que cette ligne dit depuis le début. Un nom mort perd d'un
 * coup ce que la présence du vivant lui donnait, puis s'efface au même rythme
 * que les autres — il ne se renouvelle simplement plus.
 */
export const AFTER_DEATH = 0.72;

/** En dessous de quoi le nom ne veut plus rien dire. */
export const FORGOTTEN = 12;

/* ------------------------------------------------------------------ */
/* S'en défaire                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce que quitter le nom retire au parent, en points de lien.
 *
 * `changeName` était marqué « aucune conséquence : ni réputation, ni réaction
 * des proches » dans le catalogue. En voici une, et elle ne concerne que le
 * parent dont on portait le nom : les autres n'ont pas d'avis là-dessus.
 */
export const DISOWN_STING = 28;

/** Ce que quitter le nom retire de notoriété propre, en points. */
export const DISOWN_FAME = 14;
