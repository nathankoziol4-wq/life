/**
 * Ce qu'on fait avec sa famille quand on est petit.
 *
 * Le catalogue est volontairement ordinaire. Ce ne sont pas des « quêtes » :
 * ce sont les choses dont on se souvient trente ans plus tard sans savoir
 * pourquoi — une après-midi à bricoler, un gâteau raté, une nuit dehors à
 * regarder le ciel.
 *
 * Chaque activité porte trois textes, et c'est la partie importante du
 * fichier : le même geste ne raconte pas la même chose selon qu'il a été
 * partagé ou subi. `great` quand l'adulte était vraiment là, `plain` quand il
 * était là sans y être, `sour` quand il avait la tête ailleurs.
 *
 * `exposes` relie l'activité au système d'exposition : ce qu'on fait à sept
 * ans alimente les intérêts, donc plus tard les études et le métier. C'est
 * pour ça que l'enfance compte — pas pour les points de bonheur.
 */

import type { StatKey } from '../engine/types.ts';

export interface FamilyActivity {
  id: string;
  label: string;
  emoji: string;
  /** Une ligne, telle que l'enfant la formulerait. */
  hint: string;
  minAge: number;
  maxAge: number;
  /** Avec qui ça se fait. */
  with: 'parent' | 'fratrie' | 'grand-parent' | 'famille';
  /** Coût pour le foyer, en unités de base. Zéro pour presque tout. */
  cost: number;
  /** Effets propres, amplifiés quand le moment est réussi. */
  stats?: Partial<Record<StatKey, number>>;
  /** L'intérêt que ça met à portée, s'il y en a un. */
  exposes?: string;
  /** Le moment réussi. `{qui}` est remplacé par le prénom. */
  great: string;
  /** Le moment ordinaire. */
  plain: string;
  /** Le moment gâché. */
  sour: string;
}

export const FAMILY_ACTIVITIES: FamilyActivity[] = [
  {
    id: 'story',
    label: 'Se faire lire une histoire',
    emoji: '📖',
    hint: 'Le soir, avant de dormir',
    minAge: 3, maxAge: 8, with: 'parent', cost: 0,
    stats: { intelligence: 1.6 },
    exposes: 'lecture',
    great: '{qui} fait les voix. Tu redemandes la même histoire tous les soirs pendant un mois.',
    plain: '{qui} lit jusqu’au bout, un peu vite. Tu t’endors avant la fin.',
    sour: 'Deux pages, puis « demain ». Tu regardes le plafond longtemps.',
  },
  {
    id: 'cook',
    label: 'Cuisiner ensemble',
    emoji: '🥣',
    hint: 'Surtout goûter la pâte',
    minAge: 4, maxAge: 14, with: 'parent', cost: 0,
    stats: { happiness: 1 },
    exposes: 'cuisine',
    great: '{qui} te laisse tout casser. Le gâteau est raté et vous le mangez quand même.',
    plain: 'Tu tiens le saladier pendant que {qui} fait le reste.',
    sour: '{qui} reprend le fouet au bout de deux minutes. Tu regardes.',
  },
  {
    id: 'outside',
    label: 'Jouer dehors',
    emoji: '⚽',
    hint: 'Jusqu’à ce qu’on appelle pour rentrer',
    minAge: 4, maxAge: 13, with: 'famille', cost: 0,
    stats: { fitness: 2, happiness: 1 },
    exposes: 'football',
    great: 'Vous y passez tout l’après-midi. Tu rentres épuisé et content.',
    plain: 'Une demi-heure, puis il faut rentrer.',
    sour: '{qui} regarde son téléphone assis sur un banc. Tu joues seul.',
  },
  {
    id: 'build',
    label: 'Bricoler quelque chose',
    emoji: '🔧',
    hint: 'Ça ne tient pas droit, mais ça tient',
    minAge: 6, maxAge: 15, with: 'parent', cost: 0,
    stats: { intelligence: 1.4 },
    exposes: 'bricolage',
    great: '{qui} te laisse tenir les outils. Ce que vous fabriquez existe encore des années après.',
    plain: 'Vous montez le meuble. Tu passes les vis.',
    sour: '{qui} s’énerve contre la notice. Tu t’éloignes sans rien dire.',
  },
  {
    id: 'garden',
    label: 'Planter quelque chose',
    emoji: '🌱',
    hint: 'Et revenir voir tous les jours',
    minAge: 4, maxAge: 13, with: 'famille', cost: 0,
    stats: { happiness: 1.2 },
    exposes: 'jardinage',
    great: 'Tu reviens voir tous les matins. Quand ça sort de terre, tu appelles tout le monde.',
    plain: 'Vous plantez trois graines. Tu oublies de les arroser.',
    sour: '{qui} fait tout et te dit de ne pas marcher là.',
  },
  {
    id: 'film',
    label: 'Regarder un film en famille',
    emoji: '🍿',
    hint: 'Sous une couverture',
    minAge: 3, maxAge: 15, with: 'famille', cost: 0,
    stats: { happiness: 2 },
    exposes: 'cinéma',
    great: 'Personne ne parle pendant deux heures. C’est rare, et tu le sais déjà.',
    plain: 'Le film est trop long pour toi. Tu tiens jusqu’au milieu.',
    sour: '{qui} s’endort au bout d’un quart d’heure.',
  },
  {
    id: 'museum',
    label: 'Aller voir quelque chose',
    emoji: '🏛️',
    hint: 'Un musée, une expo, un vieux truc',
    minAge: 5, maxAge: 15, with: 'parent', cost: 18,
    stats: { intelligence: 2.2 },
    exposes: 'dessin',
    great: '{qui} t’explique tout, même ce qu’il ne sait pas. Tu poses cent questions.',
    plain: 'Vous traversez les salles. Tu retiens deux ou trois choses.',
    sour: 'Tu traînes des pieds, {qui} soupire. Vous partez avant la fin.',
  },
  {
    id: 'music',
    label: 'Écouter sa musique',
    emoji: '🎧',
    hint: 'Celle de quand ils étaient jeunes',
    minAge: 6, maxAge: 15, with: 'parent', cost: 0,
    stats: { happiness: 1.4 },
    exposes: 'musique',
    great: '{qui} monte le son et te raconte d’où vient chaque morceau. Tu les reconnais toute ta vie.',
    plain: 'Tu écoutes poliment. Ce n’est pas ta musique.',
    sour: '« Tu ne peux pas comprendre. » Vous n’en reparlez pas.',
  },
  {
    id: 'zoo',
    label: 'Aller voir les animaux',
    emoji: '🦁',
    hint: 'Et vouloir tous les ramener',
    minAge: 3, maxAge: 12, with: 'famille', cost: 30,
    stats: { happiness: 2.4 },
    exposes: 'animaux',
    great: 'Tu restes vingt minutes devant le même enclos. Personne ne te presse.',
    plain: 'Vous faites le tour. Il pleut un peu.',
    sour: 'Tout le monde est fatigué avant la moitié. Vous rentrez.',
  },
  {
    id: 'talk',
    label: 'Poser mille questions',
    emoji: '❓',
    hint: 'Pourquoi le ciel, pourquoi la mort, pourquoi tout',
    minAge: 4, maxAge: 12, with: 'parent', cost: 0,
    stats: { intelligence: 1.8 },
    great: '{qui} répond sérieusement, même aux questions impossibles. Tu retiens qu’on a le droit de demander.',
    plain: '{qui} répond aux deux premières, puis « je ne sais pas ».',
    sour: '« Arrête avec tes questions. » Tu apprends à les garder pour toi.',
  },
  {
    id: 'chores',
    label: 'Aider à la maison',
    emoji: '🧹',
    hint: 'Pour de vrai, pas pour faire semblant',
    minAge: 5, maxAge: 15, with: 'parent', cost: 0,
    stats: { discipline: 2 },
    great: 'On te confie une vraie tâche et on te fait confiance. Tu la refais toutes les semaines.',
    plain: 'Tu ranges ce qu’on te dit de ranger.',
    sour: 'On refait derrière toi sans rien dire. Tu le vois.',
  },
  {
    id: 'sibling_game',
    label: 'Inventer un jeu',
    emoji: '🎲',
    hint: 'Avec des règles que vous seuls comprenez',
    minAge: 4, maxAge: 14, with: 'fratrie', cost: 0,
    stats: { happiness: 2, intelligence: 1.2 },
    great: 'Vous y jouez tout l’été. Les règles changent tous les jours et personne ne triche vraiment.',
    plain: 'Vous jouez un moment, puis chacun repart de son côté.',
    sour: '{qui} change les règles pour gagner. Ça finit mal.',
  },
  {
    id: 'sibling_secret',
    label: 'Faire une bêtise ensemble',
    emoji: '🤫',
    hint: 'Et ne rien dire',
    minAge: 6, maxAge: 15, with: 'fratrie', cost: 0,
    stats: { happiness: 2.4 },
    great: 'Vous ne vous êtes pas fait prendre. Vous en riez encore vingt ans plus tard.',
    plain: 'Ce n’était pas très grave, et personne n’a rien remarqué.',
    sour: '{qui} te dénonce avant même qu’on demande.',
  },
  {
    id: 'grandparent_story',
    label: 'Écouter les vieilles histoires',
    emoji: '👵',
    hint: 'Toujours les mêmes, et c’est bien',
    minAge: 4, maxAge: 15, with: 'grand-parent', cost: 0,
    stats: { intelligence: 1.4, happiness: 1.6 },
    exposes: 'histoire',
    great: '{qui} raconte la même histoire pour la dixième fois, avec un détail en plus. Tu la retiendras.',
    plain: '{qui} raconte, tu écoutes à moitié.',
    sour: '{qui} s’embrouille et s’agace de s’embrouiller.',
  },
  {
    id: 'grandparent_craft',
    label: 'Apprendre un truc d’avant',
    emoji: '🧶',
    hint: 'Coudre, pêcher, réparer, jouer aux cartes',
    minAge: 6, maxAge: 15, with: 'grand-parent', cost: 0,
    stats: { intelligence: 1.2, discipline: 1.4 },
    exposes: 'bricolage',
    great: 'Tu y arrives au bout de la troisième fois. {qui} ne dit rien mais tu vois bien.',
    plain: 'C’est plus dur que ça n’en a l’air. Vous arrêtez avant la fin.',
    sour: '{qui} n’a pas la patience, et toi non plus.',
  },
  {
    id: 'camp',
    label: 'Dormir dehors',
    emoji: '🏕️',
    hint: 'Dans le jardin ou plus loin',
    minAge: 6, maxAge: 15, with: 'famille', cost: 12,
    stats: { fitness: 1.4, happiness: 2.2 },
    exposes: 'randonnée',
    great: 'Vous regardez le ciel jusqu’à très tard. Tu ne te souviendras pas de quoi vous parliez.',
    plain: 'Il fait froid, tu rentres au milieu de la nuit.',
    sour: 'Personne n’avait envie. Vous pliez tout au bout d’une heure.',
  },
];

export const FAMILY_ACTIVITY_MAP = new Map(FAMILY_ACTIVITIES.map((a) => [a.id, a]));
