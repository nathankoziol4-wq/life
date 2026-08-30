/**
 * L'entretien d'embauche.
 *
 * **Ce que ce fichier existe pour régler.** Postuler tenait en un tirage :
 * `applyToJob` calculait une probabilité à partir du diplôme, de
 * l'expérience, de l'intelligence, de l'allure, de la réputation, du casier
 * et de la conjoncture — un très bon calcul — puis lançait le dé. Le message
 * disait « entretien manqué », mais aucun entretien n'avait eu lieu. C'est la
 * chose que le joueur fait le plus souvent dans une vie, et c'était la seule
 * où il n'avait rien à décider.
 *
 * **Ce qui se joue ici est une lecture.** Chaque employeur tient à deux
 * choses parmi quatre, et ne le dit pas. Répondre, c'est parier sur ce qu'il
 * veut entendre : la même phrase ouvre la porte chez l'un et la ferme chez
 * l'autre. Ce n'est pas un examen où il y aurait de bonnes réponses.
 *
 * L'entretien **ne remplace pas** le calcul : il le module. Un dossier faible
 * bien défendu peut passer devant un dossier moyen mal défendu, et c'est tout
 * ce qu'on lui demande. Sans quoi le diplôme et l'expérience ne voudraient
 * plus rien dire, ce qui serait le défaut inverse.
 *
 * Rien ici n'est un conseil pour un vrai entretien : ce sont quatre registres
 * inventés, dans un jeu où l'employeur a des préférences que la vraie vie
 * n'affiche pas en deux mots.
 */

/** Ce à quoi un employeur peut tenir. */
export type Register = 'métier' | 'tenue' | 'élan' | 'entente';

export const REGISTER_LABEL: Record<Register, string> = {
  métier: 'le métier',
  tenue: 'la tenue',
  élan: 'l’élan',
  entente: 'l’entente',
};

/** Ce que chaque registre veut dire, quand on sait le lire. */
export const REGISTER_NOTE: Record<Register, string> = {
  métier: 'Ce que tu sais faire, et comment tu le sais.',
  tenue: 'Qu’on puisse compter sur toi le mardi comme le vendredi.',
  élan: 'Que tu veuilles aller quelque part, et vite.',
  entente: 'Qu’on ait envie de partager un bureau avec toi.',
};

/** Une réponse possible. */
export interface Answer {
  text: string;
  /** Le registre auquel elle s'adresse. C'est le pari du joueur. */
  appeals: Register;
}

/** Une question de l'entretien. */
export interface Question {
  id: string;
  ask: string;
  answers: Answer[];
}

/**
 * Douze questions, **trois** réponses chacune sur les quatre registres.
 *
 * Le registre absent tourne d'une question à l'autre, et c'est ce qui fait la
 * partie. Avec les quatre à chaque fois, un joueur qui avait deviné ce que
 * l'employeur cherchait répondait juste **cent fois sur cent** : mesuré, et
 * ce n'était plus un pari mais une table de correspondance. Il manque
 * maintenant un registre par question — parfois celui qu'on voulait servir —
 * et il faut alors choisir le moins mauvais.
 *
 * Aucune ne nomme un métier : elles se combinent avec n'importe quelle offre,
 * de la caisse au conseil. Et aucune n'a de bonne réponse dans l'absolu.
 */
export const QUESTIONS: Question[] = [
  {
    id: 'vous',
    ask: 'Parlez-moi de vous.',
    answers: [
      { text: 'Dire que tu es toujours là où tu as dit que tu serais', appeals: 'tenue' },
      { text: 'Dire où tu veux être dans cinq ans', appeals: 'élan' },
      { text: 'Raconter comment tu travailles avec les autres', appeals: 'entente' },
    ],
  },
  {
    id: 'ici',
    ask: 'Pourquoi ici, plutôt qu’ailleurs ?',
    answers: [
      { text: 'Parce que c’est là qu’on fait ce travail sérieusement', appeals: 'métier' },
      { text: 'Parce que ça monte, et que tu veux monter avec', appeals: 'élan' },
      { text: 'Parce que les gens que tu as croisés t’ont plu', appeals: 'entente' },
    ],
  },
  {
    id: 'defaut',
    ask: 'Votre principal défaut ?',
    answers: [
      { text: 'Tu refais une chose jusqu’à ce qu’elle soit juste', appeals: 'métier' },
      { text: 'Tu n’aimes pas qu’on change les règles en cours de route', appeals: 'tenue' },
      { text: 'Tu as du mal à dire non à quelqu’un', appeals: 'entente' },
    ],
  },
  {
    id: 'erreur',
    ask: 'Racontez-moi une fois où vous vous êtes trompé.',
    answers: [
      { text: 'Dire l’erreur, et ce que tu as changé après', appeals: 'métier' },
      { text: 'Dire que tu l’as signalée toi-même, tout de suite', appeals: 'tenue' },
      { text: 'Dire que tu avais tenté quelque chose de trop grand', appeals: 'élan' },
    ],
  },
  {
    id: 'conflit',
    ask: 'Quelqu’un de l’équipe ne fait pas sa part. Vous faites quoi ?',
    answers: [
      { text: 'Le signaler à qui de droit, sans en faire une affaire', appeals: 'tenue' },
      { text: 'Proposer de réorganiser autrement', appeals: 'élan' },
      { text: 'Lui en parler seul à seul d’abord', appeals: 'entente' },
    ],
  },
  {
    id: 'pression',
    ask: 'Une échéance impossible tombe un vendredi soir.',
    answers: [
      { text: 'Découper, et livrer ce qui tient debout', appeals: 'métier' },
      { text: 'Y aller, quitte à y passer le week-end', appeals: 'élan' },
      { text: 'Voir qui peut donner un coup de main', appeals: 'entente' },
    ],
  },
  {
    id: 'salaire',
    ask: 'Vos prétentions ?',
    answers: [
      { text: 'Ce que vaut le poste, et tu sais ce qu’il vaut', appeals: 'métier' },
      { text: 'Ce qui est prévu pour ce niveau, sans discuter', appeals: 'tenue' },
      { text: 'Ce qui ne mettra personne mal à l’aise dans l’équipe', appeals: 'entente' },
    ],
  },
  {
    id: 'avant',
    ask: 'Pourquoi avez-vous quitté le poste d’avant ?',
    answers: [
      { text: 'Tu avais fait le tour de ce qu’il y avait à apprendre', appeals: 'métier' },
      { text: 'Tu es resté jusqu’au bout de ce que tu avais promis', appeals: 'tenue' },
      { text: 'Tu voulais quelque chose de plus grand', appeals: 'élan' },
    ],
  },
  {
    id: 'apprendre',
    ask: 'Comment apprenez-vous quelque chose de neuf ?',
    answers: [
      { text: 'En suivant ce qui est écrit, dans l’ordre', appeals: 'tenue' },
      { text: 'En allant plus vite que ce qu’on te demande', appeals: 'élan' },
      { text: 'En regardant quelqu’un qui sait, et en posant des questions', appeals: 'entente' },
    ],
  },
  {
    id: 'seul',
    ask: 'Vous préférez travailler seul ou à plusieurs ?',
    answers: [
      { text: 'Seul quand c’est difficile, à plusieurs quand c’est long', appeals: 'métier' },
      { text: 'À plusieurs, si tu peux mener', appeals: 'élan' },
      { text: 'À plusieurs, presque toujours', appeals: 'entente' },
    ],
  },
  {
    id: 'critique',
    ask: 'On critique votre travail devant les autres.',
    answers: [
      { text: 'Demander ce qui précisément ne va pas', appeals: 'métier' },
      { text: 'Encaisser, corriger, ne pas y revenir', appeals: 'tenue' },
      { text: 'En reparler après, au calme', appeals: 'entente' },
    ],
  },
  {
    id: 'questions',
    ask: 'Vous avez des questions ?',
    answers: [
      { text: 'Demander à qui tu succèdes, et pourquoi', appeals: 'métier' },
      { text: 'Demander comment se passe une semaine ordinaire', appeals: 'tenue' },
      { text: 'Demander ce qu’il faut faire pour aller plus haut', appeals: 'élan' },
    ],
  },
];

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
