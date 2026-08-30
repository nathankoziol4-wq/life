/**
 * Les langues.
 *
 * Le catalogue disait d'émigrer : « ni dossier, ni délai, ni refus, ni langue
 * à apprendre ». Trois de ces quatre reproches étaient périmés — le visa
 * existe, avec ses conditions et son refus. Le quatrième ne l'était pas, et
 * c'était le plus important : **changer de pays ne coûtait que de l'argent**.
 *
 * Tout le reste du jeu traite un pays comme une collection de multiplicateurs
 * — salaires, loyers, impôt, sévérité. Ils font qu'un pays est plus cher ou
 * plus sûr qu'un autre ; ils ne font pas qu'on y soit *étranger*. La langue,
 * si. C'est la seule chose qui distingue vraiment « vivre ailleurs » de
 * « vivre ici avec d'autres chiffres ».
 *
 * Trois règles, et elles tiennent tout le système.
 *
 * **1. Elle s'apprend surtout en vivant.** L'immersion rapporte plus que
 * n'importe quel cours, et beaucoup plus jeune que vieux. Partir à vingt ans
 * et partir à cinquante ne sont pas la même décision — c'est le seul endroit
 * du jeu où l'âge au moment d'un choix compte autant.
 *
 * **2. Ce qu'on sait déjà aide.** Une langue proche de celles qu'on parle
 * s'apprend vite ; une langue lointaine, non. Ce n'est pas une affirmation
 * sur les langues réelles : c'est une règle de jeu, volontairement grossière,
 * qui donne un sens à la destination qu'on choisit.
 *
 * **3. Elle se paie tant qu'on ne l'a pas.** Sous un certain niveau, on ne
 * trouve que ce que trouvent les gens qui ne parlent pas : du travail en
 * dessous de ce qu'on vaut, et des liens qui se nouent mal. C'est dur, et
 * c'est ce qui donne du poids à la décision d'émigrer.
 *
 * Les familles sont des regroupements de jeu, pas une classification savante :
 * elles servent uniquement à décider ce qui s'apprend vite.
 */

export interface Language {
  id: string;
  label: string;
  /** Regroupement de jeu : ce qui se ressemble s'apprend vite. */
  family: string;
}

export const LANGUAGES: Language[] = [
  { id: 'fr', label: 'français', family: 'romane' },
  { id: 'es', label: 'espagnol', family: 'romane' },
  { id: 'it', label: 'italien', family: 'romane' },
  { id: 'pt', label: 'portugais', family: 'romane' },
  { id: 'en', label: 'anglais', family: 'germanique' },
  { id: 'de', label: 'allemand', family: 'germanique' },
  { id: 'nl', label: 'néerlandais', family: 'germanique' },
  { id: 'sv', label: 'suédois', family: 'germanique' },
  { id: 'no', label: 'norvégien', family: 'germanique' },
  { id: 'ru', label: 'russe', family: 'slave' },
  { id: 'ar', label: 'arabe', family: 'sémitique' },
  { id: 'hi', label: 'hindi', family: 'indo-aryenne' },
  { id: 'zh', label: 'chinois', family: 'sinitique' },
  { id: 'ja', label: 'japonais', family: 'japonique' },
  { id: 'ko', label: 'coréen', family: 'coréenne' },
];

export function getLanguage(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

/* ------------------------------------------------------------------ */
/* Où l'on parle quoi                                                  */
/* ------------------------------------------------------------------ */

/** La langue qu'il faut pour travailler et se lier dans chaque pays. */
export const COUNTRY_LANGUAGE: Record<string, string> = {
  fr: 'fr', us: 'en', uk: 'en', de: 'de', es: 'es', it: 'it', ca: 'en',
  jp: 'ja', kr: 'ko', cn: 'zh', in: 'hi', br: 'pt', mx: 'es', ru: 'ru',
  se: 'sv', no: 'no', ma: 'ar', eg: 'ar', ng: 'en', za: 'en', au: 'en',
  ch: 'de', ar: 'es', nl: 'nl',
};

/**
 * Les langues qui dépannent sur place.
 *
 * Un pays où l'on en parle plusieurs pardonne : on y trouve du travail sans
 * la première. C'est ce qui rend certaines destinations bien plus abordables
 * que d'autres, indépendamment de leurs salaires.
 */
export const COUNTRY_ALSO: Record<string, string[]> = {
  ca: ['fr'], ch: ['fr', 'it'], ma: ['fr'], in: ['en'], za: ['en'],
  ng: ['en'], nl: ['en'], se: ['en'], no: ['en', 'sv'], eg: ['en'],
};

export function languagesOfCountry(countryId: string): string[] {
  const main = COUNTRY_LANGUAGE[countryId];
  return main ? [main, ...(COUNTRY_ALSO[countryId] ?? [])] : [];
}

/* ------------------------------------------------------------------ */
/* Ce qui s'apprend vite                                               */
/* ------------------------------------------------------------------ */

/**
 * À quel point une langue en rappelle une autre, 0 à 1.
 *
 * Sert de multiplicateur d'apprentissage. Volontairement grossier : trois
 * paliers, et rien de plus. Ce qu'on veut, c'est que choisir où partir compte.
 */
export function kinship(a: string, b: string): number {
  if (a === b) return 1;
  const one = getLanguage(a);
  const two = getLanguage(b);
  if (!one || !two) return 0.15;
  return one.family === two.family ? 0.55 : 0.15;
}

/** Ce que les langues déjà sues font pour une nouvelle. */
export function easeFor(known: Record<string, number>, target: string): number {
  let best = 0;
  for (const [id, level] of Object.entries(known)) {
    if (id === target) continue;
    best = Math.max(best, kinship(id, target) * (level / 100));
  }
  // Un plancher : même sans rien de proche, on apprend.
  return 0.55 + best * 0.65;
}

/* ------------------------------------------------------------------ */
/* Les seuils                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sous ce niveau, on ne trouve que ce que trouvent ceux qui ne parlent pas.
 *
 * C'est le seuil qui donne son poids à l'expatriation : au-dessous, le
 * diplôme et l'expérience ne servent presque à rien.
 */
export const WORK_FLOOR = 45;

/** Sous ce niveau, les liens se nouent mal. */
export const SOCIAL_FLOOR = 35;

/** Au-dessus, plus personne ne remarque que ce n'est pas ta langue. */
export const FLUENT = 85;

/** Ce que rapporte une année d'immersion, avant tous les modificateurs. */
export const IMMERSION = 11;

/** Ce qu'une langue inutilisée perd par an. */
export const RUST = 0.8;

/** Ce qu'un cours coûte, en unités de coût de la vie. */
export const LESSON_COST = 0.045;

/** Ce qu'un cours rapporte, avant modificateurs. */
export const LESSON_GAIN = 9;

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function fluencyLabel(level: number): string {
  if (level <= 0) return 'Pas un mot';
  if (level < 20) return 'Quelques mots';
  if (level < 40) return 'De quoi se débrouiller';
  if (level < 60) return 'Conversation simple';
  if (level < FLUENT) return 'À l’aise';
  if (level < 97) return 'Comme un natif, presque';
  return 'Langue maternelle';
}

/** Ce que le pays d'accueil te renvoie, quand tu ne parles pas. */
export function strandedLabel(level: number): string {
  if (level >= WORK_FLOOR) return '';
  if (level < 15) return 'Tu ne comprends presque rien de ce qu’on te dit.';
  if (level < SOCIAL_FLOOR) return 'Tu suis la moitié d’une conversation, et on le voit.';
  return 'Tu te fais comprendre. On te propose ce qu’on propose à quelqu’un qui se fait comprendre.';
}
