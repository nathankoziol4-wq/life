/**
 * La notoriété publique.
 *
 * Le jeu confondait trois choses sous un seul nombre d'abonnés : **combien de
 * gens savent qui tu es**, **ce qu'ils en pensent**, et **ce que pensent ceux
 * qui te connaissent vraiment**. La dernière est la réputation, elle existait
 * déjà. Les deux premières manquaient, et elles ne varient pas ensemble : on
 * peut être très connu et détesté, ou estimé de tous ceux qui vous croisent
 * sans que personne d'autre ait entendu votre nom.
 *
 * Ce fichier décrit trois choses :
 *
 * - **ce pour quoi on est connu** (`FAME_FIELDS`), qui décide du ton de tout
 *   le reste — on ne parle pas à quelqu'un de connu pour ses films comme à
 *   quelqu'un de connu pour un procès ;
 * - **les apparitions** (`PUBLIC_GIGS`), ce qu'un nom permet de faire ;
 * - **les questions d'entretien** (`INTERVIEW_BEATS`), parce qu'une interview
 *   n'est pas un tirage : c'est une suite de réponses, et chacune coûte
 *   quelque chose.
 */

/* ------------------------------------------------------------------ */
/* Ce pour quoi on est connu                                           */
/* ------------------------------------------------------------------ */

export interface FameField {
  id: string;
  label: string;
  emoji: string;
  /** Comment on présente la personne. */
  billing: string;
  /** Ce que ce genre de notoriété rapporte, relativement. */
  worth: number;
  /** Sa fragilité : combien elle se retourne vite. */
  fragility: number;
}

export const FAME_FIELDS: FameField[] = [
  { id: 'aucun', label: 'Personne', emoji: '👤', billing: 'quelqu’un', worth: 0, fragility: 1 },
  { id: 'écran', label: 'Le cinéma', emoji: '🎬', billing: 'un visage qu’on a vu', worth: 1.25, fragility: 1 },
  { id: 'scène', label: 'La musique', emoji: '🎤', billing: 'une voix qu’on connaît', worth: 1.15, fragility: 1.1 },
  { id: 'terrain', label: 'Le sport', emoji: '🏟️', billing: 'un nom sur un maillot', worth: 1.3, fragility: 0.9 },
  { id: 'plateau', label: 'Les médias', emoji: '📺', billing: 'quelqu’un qu’on voit partout', worth: 1, fragility: 1.2 },
  { id: 'réseaux', label: 'Les réseaux', emoji: '📱', billing: 'un compte que des millions suivent', worth: 0.85, fragility: 1.5 },
  { id: 'pages', label: 'Les livres', emoji: '📕', billing: 'un nom sur une couverture', worth: 0.7, fragility: 0.7 },
  { id: 'podium', label: 'La mode', emoji: '👗', billing: 'un visage de campagne', worth: 1.1, fragility: 1.3 },
  { id: 'tribune', label: 'La politique', emoji: '🗳️', billing: 'quelqu’un qui parle au nom des autres', worth: 0.75, fragility: 1.6 },
  { id: 'affaires', label: 'Les affaires', emoji: '🏢', billing: 'un nom d’enseigne', worth: 0.9, fragility: 0.9 },
  { id: 'fourneaux', label: 'La cuisine', emoji: '🍽️', billing: 'une table dont on parle', worth: 0.9, fragility: 0.8 },
  { id: 'faits', label: 'Les faits divers', emoji: '📰', billing: 'un nom qu’on a lu quelque part', worth: 0.3, fragility: 2 },
];

export function getFameField(id: string): FameField {
  return FAME_FIELDS.find((f) => f.id === id) ?? FAME_FIELDS[0];
}

/**
 * Ce que rend visible chaque métier **salarié**.
 *
 * Une table plutôt qu'un champ ajouté à tous les métiers : seuls quelques-uns
 * exposent réellement quelqu'un au public, et les autres n'auraient porté
 * qu'un zéro.
 *
 * Comédien, musicien, sportif, mannequin et politique n'y figurent plus :
 * ce ne sont plus des postes de la grille mais des carrières jouées, et
 * `data/stage.ts` porte leur visibilité — chacune avec son `fameField`. Les
 * garder ici les aurait rendus connus deux fois.
 */
export const PUBLIC_JOBS: Record<string, { visibility: number; field: string }> = {
  journalist: { visibility: 7, field: 'plateau' },
  influencer: { visibility: 9, field: 'réseaux' },
  writer: { visibility: 6, field: 'pages' },
  chef: { visibility: 5, field: 'fourneaux' },
};

/* ------------------------------------------------------------------ */
/* Les apparitions                                                     */
/* ------------------------------------------------------------------ */

export interface PublicGig {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, en une phrase. */
  what: string;
  /** Notoriété minimale pour qu'on te le propose. */
  minFame: number;
  /** Ce que ça paie, relativement à la notoriété. */
  pay: number;
  /** Ce que ça apporte en notoriété. */
  fame: number;
  /** Ce que ça peut coûter en controverse. */
  risk: number;
  /** Ce que ça prend en nerfs. */
  toll: number;
  /** Nombre de fois par an. */
  perYear: number;
  /** Effet sur l'estime du public quand ça se passe bien. */
  goodwill: number;
}

export const PUBLIC_GIGS: PublicGig[] = [
  {
    id: 'interview', label: 'Donner une interview', emoji: '🎙️',
    what: 'Une heure de questions, dont trois auxquelles tu n’avais pas pensé',
    minFame: 12, pay: 0.12, fame: 7, risk: 0.4, toll: 8, perYear: 2, goodwill: 4,
  },
  {
    id: 'shoot', label: 'Une séance photo', emoji: '📷',
    what: 'Douze heures pour quatre images, et une couverture peut-être',
    minFame: 18, pay: 0.5, fame: 5, risk: 0.15, toll: 10, perYear: 2, goodwill: 2,
  },
  {
    id: 'ad', label: 'Une publicité', emoji: '💼',
    what: 'Une marque loue ton nom. On te dira quoi en penser',
    minFame: 25, pay: 1.6, fame: 4, risk: 0.5, toll: 6, perYear: 2, goodwill: -2,
  },
  {
    id: 'gala', label: 'Un gala', emoji: '🥂',
    what: 'On te paie pour être là et pour être vu là',
    minFame: 30, pay: 0.6, fame: 6, risk: 0.3, toll: 9, perYear: 3, goodwill: 1,
  },
  {
    id: 'show', label: 'Passer sur un plateau', emoji: '📺',
    what: 'Sept minutes, en direct, avec quelqu’un qui veut du clip',
    minFame: 35, pay: 0.35, fame: 11, risk: 0.6, toll: 12, perYear: 2, goodwill: 3,
  },
  {
    id: 'charity', label: 'Prêter ton nom à une cause', emoji: '🤍',
    what: 'Tu ne gagnes rien. On te regarde autrement',
    minFame: 15, pay: -0.1, fame: 4, risk: 0.2, toll: 6, perYear: 1, goodwill: 12,
  },
  {
    id: 'talk', label: 'Une conférence', emoji: '🎤',
    what: 'Quarante minutes devant des gens qui ont payé pour t’entendre',
    minFame: 28, pay: 0.8, fame: 4, risk: 0.2, toll: 8, perYear: 3, goodwill: 5,
  },
  {
    id: 'memoir', label: 'Publier tes mémoires', emoji: '📖',
    what: 'Raconter sa vie avant que quelqu’un d’autre la raconte mal',
    minFame: 45, pay: 1.1, fame: 9, risk: 0.75, toll: 20, perYear: 1, goodwill: 3,
  },
  {
    id: 'reality', label: 'Une émission de télé-réalité', emoji: '🎥',
    what: 'Beaucoup d’argent, beaucoup de monde, et le montage ne t’appartient pas',
    minFame: 20, pay: 1.9, fame: 18, risk: 1.4, toll: 26, perYear: 1, goodwill: -10,
  },
  {
    id: 'tour', label: 'Une tournée de promotion', emoji: '✈️',
    what: 'Six villes, six fois les mêmes questions',
    minFame: 40, pay: 0.9, fame: 13, risk: 0.35, toll: 24, perYear: 1, goodwill: 2,
  },
];

export function getGig(id: string): PublicGig | undefined {
  return PUBLIC_GIGS.find((g) => g.id === id);
}

/* ------------------------------------------------------------------ */
/* L'interview                                                         */
/* ------------------------------------------------------------------ */

/**
 * Une question et ses réponses possibles.
 *
 * Chaque réponse déplace trois choses qui ne vont pas ensemble : ce que
 * l'entretien fait connaître (`fame`), ce qu'il donne à reprocher
 * (`controversy`), et ce que le public en retient de bon (`goodwill`). Il
 * n'existe donc pas de bonne réponse — seulement une réponse qui vous
 * ressemble, et son prix.
 */
export interface InterviewAnswer {
  label: string;
  fame: number;
  controversy: number;
  goodwill: number;
  /** Ce qui en est dit ensuite. */
  note: string;
}

export interface InterviewBeat {
  id: string;
  question: string;
  /** Seulement si la personne est connue pour ça. */
  fields?: string[];
  /** Seulement au-delà de cette notoriété. */
  minFame?: number;
  answers: InterviewAnswer[];
}

export const INTERVIEW_BEATS: InterviewBeat[] = [
  {
    id: 'origin',
    question: 'On va commencer par le début. D’où est-ce que vous venez, exactement ?',
    answers: [
      { label: 'Raconter d’où tu viens, sans arranger', fame: 2, controversy: 0, goodwill: 9, note: 'Le passage sera coupé au montage, mais quelqu’un le remettra en ligne.' },
      { label: 'Enjoliver un peu', fame: 4, controversy: 6, goodwill: 2, note: 'Ça sonne bien. Trois personnes qui t’ont connu à l’époque vont le lire.' },
      { label: 'Dire que ça ne regarde personne', fame: 1, controversy: 3, goodwill: -2, note: 'Le silence se remarque plus que la réponse.' },
    ],
  },
  {
    id: 'money',
    question: 'Est-ce que vous gagnez beaucoup d’argent ?',
    answers: [
      { label: 'Donner le chiffre', fame: 8, controversy: 9, goodwill: -4, note: 'Le chiffre fera le titre. Rien d’autre de l’entretien ne sera lu.' },
      { label: 'Botter en touche', fame: 1, controversy: 1, goodwill: 1, note: 'On passe à la suite. C’était une question pour voir.' },
      { label: 'Dire que la question est indécente', fame: 5, controversy: 7, goodwill: 3, note: 'Ça fait un extrait. Les avis se partagent exactement en deux.' },
    ],
  },
  {
    id: 'rival',
    question: 'Que pensez-vous de ce qu’a dit quelqu’un de votre milieu la semaine dernière ?',
    answers: [
      { label: 'Répondre franchement', fame: 9, controversy: 11, goodwill: 0, note: 'Il y aura une réponse à ta réponse, et ce sera reparti.' },
      { label: 'Refuser d’entrer là-dedans', fame: 0, controversy: -3, goodwill: 7, note: 'Le journaliste insiste. Tu ne bouges pas.' },
      { label: 'Dire du bien, même si tu n’en penses rien', fame: 2, controversy: 0, goodwill: 4, note: 'Élégant. Personne n’y croit tout à fait.' },
    ],
  },
  {
    id: 'private',
    question: 'Vous parle-t-on encore de votre vie privée ?',
    minFame: 25,
    answers: [
      { label: 'Ouvrir la porte', fame: 12, controversy: 8, goodwill: 3, note: 'Tu viens de décider que ce sujet t’appartiendrait de moins en moins.' },
      { label: 'Fermer la porte', fame: -1, controversy: 2, goodwill: 5, note: 'On te le reprochera comme de la froideur. C’est le prix.' },
      { label: 'Retourner la question', fame: 4, controversy: 4, goodwill: 6, note: 'Le journaliste rit. L’extrait tournera.' },
    ],
  },
  {
    id: 'mistake',
    question: 'Il y a une chose que beaucoup vous reprochent. Vous voulez en parler ?',
    minFame: 20,
    answers: [
      { label: 'Reconnaître, sans se justifier', fame: 5, controversy: -12, goodwill: 12, note: 'C’est la seule réponse qui fait vraiment retomber quelque chose.' },
      { label: 'Expliquer le contexte', fame: 4, controversy: 2, goodwill: 1, note: 'Une explication ressemble toujours un peu à une excuse.' },
      { label: 'Nier en bloc', fame: 7, controversy: 14, goodwill: -8, note: 'Le montage mettra ta phrase à côté de ce qui la contredit.' },
    ],
  },
  {
    id: 'craft',
    question: 'Comment travaillez-vous, concrètement ?',
    fields: ['écran', 'scène', 'pages', 'fourneaux', 'affaires'],
    answers: [
      { label: 'Entrer dans le détail', fame: 1, controversy: 0, goodwill: 10, note: 'Les gens du métier liront ça deux fois.' },
      { label: 'Faire court', fame: 2, controversy: 0, goodwill: 2, note: 'Passage sans relief. Ce n’est pas grave.' },
      { label: 'Répondre par une formule', fame: 6, controversy: 3, goodwill: -2, note: 'La formule sera reprise partout, et elle finira par te lasser.' },
    ],
  },
  {
    id: 'next',
    question: 'Et après ? Vous avez un projet ?',
    answers: [
      { label: 'Annoncer quelque chose que tu n’as pas encore', fame: 11, controversy: 7, goodwill: -2, note: 'Il faudra le faire, maintenant.' },
      { label: 'Rester vague', fame: 2, controversy: 0, goodwill: 2, note: 'Personne n’en retiendra rien, ce qui est peut-être l’objectif.' },
      { label: 'Dire que tu ne sais pas', fame: 0, controversy: 1, goodwill: 8, note: 'Rare, dans ce genre d’entretien. Ça se remarque.' },
    ],
  },
  {
    id: 'people',
    question: 'Qu’est-ce que ça fait, d’être reconnu dans la rue ?',
    minFame: 35,
    answers: [
      { label: 'Dire que c’est un privilège', fame: 2, controversy: 0, goodwill: 6, note: 'La réponse attendue, bien donnée.' },
      { label: 'Dire que c’est parfois insupportable', fame: 6, controversy: 8, goodwill: 2, note: 'Certains trouveront ça honnête, d’autres ingrat.' },
      { label: 'Raconter une fois où ça s’est mal passé', fame: 9, controversy: 3, goodwill: 7, note: 'L’histoire circulera plus que tout le reste.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Les affaires                                                        */
/* ------------------------------------------------------------------ */

export interface ScandalKind {
  id: string;
  /** Ce qu'on te reproche. */
  headline: string;
  /** Le corps de l'affaire. */
  body: string;
  /** Poids de la controverse qu'elle apporte. */
  weight: number;
  /** Sur quoi elle tombe de préférence. */
  fields?: string[];
}

export const SCANDAL_KINDS: ScandalKind[] = [
  {
    id: 'vieuxpropos', headline: 'Une vieille phrase ressort', weight: 1,
    body: 'Quelque chose que tu as dit il y a longtemps circule à nouveau, sans le contexte qui l’expliquait — s’il l’expliquait.',
  },
  {
    id: 'exigences', headline: 'On raconte que tu es invivable', weight: 0.9,
    body: 'Des gens qui ont travaillé avec toi parlent, sans donner leur nom. Certains détails sont faux. D’autres non.',
  },
  {
    id: 'argent', headline: 'Une question d’argent', weight: 1.2,
    body: 'Un montage financier tout à fait légal se lit très mal quand il est raconté à voix haute.',
  },
  {
    id: 'promesse', headline: 'Une promesse non tenue', weight: 0.8,
    body: 'Ce que tu avais annoncé n’est pas arrivé, et quelqu’un a ressorti l’annonce.',
  },
  {
    id: 'dispute', headline: 'Une altercation filmée', weight: 1.1,
    body: 'Vingt secondes de vidéo. On ne voit pas ce qui précède, et personne ne le demandera.',
  },
  {
    id: 'sponsor', headline: 'La marque que tu défendais', weight: 1,
    fields: ['réseaux', 'podium', 'terrain'],
    body: 'Ce pour quoi tu as posé s’avère être exactement ce que tu disais détester.',
  },
  {
    id: 'plagiat', headline: 'Une ressemblance troublante', weight: 1.1,
    fields: ['pages', 'scène', 'écran'],
    body: 'Une comparaison circule entre ton travail et celui de quelqu’un d’autre. Les deux images sont côte à côte.',
  },
  {
    id: 'vote', headline: 'Un revirement', weight: 1.3,
    fields: ['tribune'],
    body: 'Tu as défendu l’inverse il y a trois ans, et la vidéo dure quatre minutes.',
  },
];

/** Les façons de répondre à une affaire. */
export const SCANDAL_RESPONSES = [
  {
    id: 'excuse', label: 'Présenter des excuses', emoji: '🙇',
    note: 'Ce qui retombe le plus vite, et ce qui coûte le plus à ceux qui te défendaient.',
  },
  {
    id: 'silence', label: 'Ne rien dire', emoji: '🤐',
    note: 'Souvent efficace, parfois interprété comme un aveu. Ça dépend de ce qu’on te reproche.',
  },
  {
    id: 'nier', label: 'Démentir fermement', emoji: '🗣️',
    note: 'Tient si c’est vrai. Double la mise si ça ne l’est pas.',
  },
  {
    id: 'contre', label: 'Contre-attaquer', emoji: '⚔️',
    note: 'Fait parler de toi davantage, dans les deux sens à la fois.',
  },
] as const;

export type ScandalResponse = typeof SCANDAL_RESPONSES[number]['id'];
