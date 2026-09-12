/**
 * Le nom.
 *
 * **Ce que ce fichier ajoute.** La naissance couvrait tout — parents, fratrie,
 * famille élargie, richesse du foyer, logement, quartier, hérédité, dix-sept
 * milieux composables, adoption et placement — sauf une chose : **naître de
 * quelqu'un**. Le catalogue : « hériter d'une notoriété au berceau ».
 *
 * Ce n'est pas une prime de départ. Un nom n'ouvre que **sa** porte : douze
 * domaines de notoriété existent (`data/fame.ts`), et l'enfant d'un chirurgien
 * ne tire rien du nom d'un musicien. Là où il ouvre, il fait aussi comparer —
 * on démarre plus vite et l'on est jugé plus durement. Partout, il se voit :
 * on est regardé dès l'enfance sans avoir rien fait.
 *
 * Et il s'use. Un parent qu'on n'a pas vu depuis vingt ans n'est plus
 * personne ; le nom ne se renouvelle pas tout seul.
 *
 * **L'arbitrage** est donc : suivre le parent, où le nom vaut le plus et où
 * l'on ne sera jamais que son enfant ; aller ailleurs, où il ne sert presque
 * à rien mais où ce qu'on fait est à soi ; ou **s'en défaire**, ce qui coûte
 * la porte et le lien, et rend le reste.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { GameState, Legacy, Person } from '../engine/types.ts';
import {
  AFTER_DEATH, BORN_KNOWN, DISOWN_FAME, DISOWN_STING, DOOR, DOOR_ELSEWHERE,
  FADE, FORGOTTEN, SHADOW, STANDINGS, WATCHED, getStanding, type Standing,
} from '../data/legacy.ts';
import { FAME_FIELDS, getFameField } from '../data/fame.ts';
import { fullName } from '../engine/context.ts';

/**
 * Un tirage déterministe qui ne consomme rien — même idiome qu'ailleurs.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

export { STANDINGS, getStanding };
export type { Standing };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function legacyOf(state: GameState): Legacy | null {
  const legacy = state.player.legacy;
  if (!legacy || legacy.dropped) return null;
  return legacy.level >= FORGOTTEN ? legacy : null;
}

/** Le parent dont on porte le nom, s'il est encore de ce monde. */
export function bearer(state: GameState): Person | null {
  const legacy = state.player.legacy;
  if (!legacy) return null;
  return state.npcs[legacy.parentId] ?? null;
}

/** Le domaine pour lequel on connaît le parent. */
export function fieldOf(state: GameState) {
  return getFameField(legacyOf(state)?.field ?? 'aucun');
}

/** Ce que le nom pèse aujourd'hui, 0-100. */
export function nameLevel(state: GameState): number {
  return Math.round(legacyOf(state)?.level ?? 0);
}

/**
 * Le nom aide-t-il ici ?
 *
 * **La règle qui empêche le nom d'être une prime générale.** On compare au
 * domaine du parent : dedans, la porte s'ouvre ; dehors, il ne reste qu'un
 * peu de visibilité qui ne décide de rien.
 */
export function doorFor(state: GameState, field: string | null): number {
  const legacy = legacyOf(state);
  if (!legacy) return 1;
  /*
   * **`null` veut dire « rien de public ici », et donc rien du tout.** La
   * première version lui appliquait le même petit bonus qu'à un mauvais
   * domaine : le nom aidait donc partout, y compris à la caisse d'un
   * supermarché, ce qui est exactement ce que tout ce fichier cherche à
   * éviter.
   */
  if (field === null) return 1;
  const weight = (legacy.level / 100) * (getStanding(legacy.standing)?.worth ?? 1);
  return 1 + weight * (field === legacy.field ? DOOR : DOOR_ELSEWHERE);
}

/**
 * Ce qu'on attend de plus, dans le domaine du parent.
 *
 * Le contrepoids de la porte, au même endroit qu'elle : ce qu'on y rate se
 * sait davantage. Sans lui, suivre le parent serait le bon calcul dans tous
 * les cas.
 */
export function shadowFor(state: GameState, field: string | null): number {
  const legacy = legacyOf(state);
  if (!legacy || field === null || field !== legacy.field) return 1;
  return 1 + (legacy.level / 100) * SHADOW;
}

/** Ce que le nom coûte en discrétion, partout et dès l'enfance. */
export function watchedFactor(state: GameState): number {
  const legacy = legacyOf(state);
  if (!legacy) return 1;
  return 1 + (legacy.level / 100) * WATCHED;
}

/** Comment on te présente, tant que tu n'as rien fait toi-même. */
export function billing(state: GameState): string {
  const legacy = legacyOf(state);
  if (!legacy) return '';
  const parent = bearer(state);
  const field = getFameField(legacy.field);
  const who = parent ? fullName(parent) : legacy.parentName;
  return `${who} — ${field.billing}`;
}

/** Une ligne pour l'écran du personnage. */
export function summary(state: GameState): string {
  const legacy = legacyOf(state);
  if (!legacy) return '';
  const standing = getStanding(legacy.standing);
  const parent = bearer(state);
  const alive = parent?.alive === true;
  return `${legacy.parentName} · ${standing?.label.toLowerCase() ?? ''}`
    + ` · ${getFameField(legacy.field).label.toLowerCase()}`
    + (alive ? '' : ' · disparu');
}

/* ------------------------------------------------------------------ */
/* Naître                                                              */
/* ------------------------------------------------------------------ */

/**
 * Donner un nom à une naissance, quand le tirage le veut.
 *
 * Appelé par `household.ts#buildHousehold`, une fois les parents créés : le
 * parent célèbre est **l'un d'eux**, et non une figure ajoutée. C'est ce qui
 * fait qu'on peut lui parler, se fâcher avec lui, et hériter de lui — tout ce
 * que le jeu sait déjà faire d'un parent.
 */
export function bestowName(ctx: Ctx, parents: Person[]): void {
  const { state } = ctx;
  if (parents.length === 0) return;
  /*
   * **Aucun tirage consommé, et c'est indispensable ici.**
   *
   * `buildHousehold` tourne à la création de **toutes** les vies. Un
   * `rng.chance` y décalerait la suite pseudo-aléatoire de chaque partie dès
   * l'année zéro — mesuré, cela a fait tomber quatre tests d'équilibrage
   * sans qu'aucune règle du jeu ait changé. Le hachage déterministe donne le
   * même résultat sans rien prélever, comme dans `practitioners.ts`,
   * `roots.ts` et `hearing.ts`.
   */
  if (hash(state.seed, 7717) >= BORN_KNOWN) return;

  const pick = <T>(xs: T[], salt: number): T => xs[Math.floor(hash(state.seed, salt) * xs.length)]!;
  const parent = pick(parents, 7718);
  // Jamais « aucun » : on est connu pour quelque chose ou l'on n'est pas connu.
  const field = pick(FAME_FIELDS.filter((f) => f.id !== 'aucun'), 7719);
  const standing = pick(STANDINGS, 7720);

  state.player.legacy = {
    parentId: parent.id,
    parentName: fullName(parent),
    field: field.id,
    standing: standing.id,
    level: standing.level,
    dropped: false,
  };
  /*
   * Le parent est réellement connu : sa notoriété n'est pas une décoration du
   * joueur, elle est à lui. Sans cela, un enfant de star aurait une mère dont
   * le jeu ignore qu'elle est célèbre — et qui se ferait embaucher comme
   * n'importe qui.
   */
  parent.flags.famous = standing.level;
  parent.flags.fameField = field.id;
}

/* ------------------------------------------------------------------ */
/* Vieillir                                                            */
/* ------------------------------------------------------------------ */

/**
 * Une année sous le nom.
 *
 * Il ne fait rien d'autre que **s'user**. C'est délibéré : un nom n'est pas
 * un revenu, c'est un capital qui fond si l'on n'en fait rien — et la seule
 * façon de le remplacer est de se faire un nom à soi, ce que le système de
 * notoriété sait déjà faire.
 */
export function advanceLegacy(ctx: Ctx): void {
  const { state } = ctx;
  const legacy = state.player.legacy;
  if (!legacy || legacy.dropped) return;

  const parent = state.npcs[legacy.parentId];
  const gone = !parent?.alive;
  // La mort du parent coupe une fois, et ne change pas le rythme ensuite.
  if (gone && !legacy.mourned) {
    legacy.mourned = true;
    legacy.level = clampStat(legacy.level * AFTER_DEATH);
  }
  legacy.level = clampStat(legacy.level - FADE);

  if (parent?.alive) parent.flags.famous = Math.round(legacy.level);

  if (legacy.level < FORGOTTEN && !legacy.faded) {
    legacy.faded = true;
    ctx.log('life', `Plus personne ne fait le rapprochement avec ${legacy.parentName}.`, 'neutral');
  }
}

/* ------------------------------------------------------------------ */
/* S'en défaire                                                        */
/* ------------------------------------------------------------------ */

/**
 * Quitter le nom.
 *
 * Appelé par `activities.ts#changeName` quand le nom de famille change.
 * **C'est la conséquence qui manquait à cette action** : le catalogue la
 * disait « aucune conséquence : ni réputation, ni réaction des proches ». Le
 * parent l'apprend, la porte se ferme, et ce qu'on avait bâti soi-même reste.
 */
export function dropName(ctx: Ctx): string | null {
  const { state } = ctx;
  const legacy = state.player.legacy;
  if (!legacy || legacy.dropped) return null;
  legacy.dropped = true;

  const parent = state.npcs[legacy.parentId];
  if (parent?.alive) {
    parent.relationship = clampStat(parent.relationship - DISOWN_STING);
    parent.opinion = clampStat(parent.opinion - DISOWN_STING);
  }
  // On perd ce que le nom portait, pas ce qu'on a fait soi-même.
  if (state.player.fame) {
    state.player.fame.level = clampStat(state.player.fame.level - DISOWN_FAME);
  }
  return parent?.alive
    ? `${parent.firstName} l’a appris avant tout le monde.`
    : `Le nom de ${legacy.parentName} s’arrête à toi.`;
}

/** Ce que le nom ferait perdre si on le quittait, pour le dire à l'avance. */
export function dropCost(state: GameState): { fame: number; parent: string | null } {
  const legacy = legacyOf(state);
  if (!legacy) return { fame: 0, parent: null };
  const parent = bearer(state);
  return {
    fame: Math.min(DISOWN_FAME, Math.round(state.player.fame?.level ?? 0)),
    parent: parent?.alive ? parent.firstName : null,
  };
}

/** Ce que le nom vaut, en mots, pour un domaine donné. */
export function saysFor(state: GameState, field: string | null): string {
  const legacy = legacyOf(state);
  if (!legacy) return '';
  if (field === legacy.field) {
    return `Le nom ouvre ici — et c’est ici qu’on te comparera à ${legacy.parentName}.`;
  }
  return `Le nom ne t’aide presque pas ici. On te regardera quand même.`;
}

/** Le facteur d'embauche, lu par `careers.ts#applyToJob`. */
export function hiringEdge(state: GameState, category: string | null): number {
  const legacy = legacyOf(state);
  if (!legacy) return 1;
  /*
   * Les métiers n'ont pas de « domaine de notoriété » : on rapproche par la
   * catégorie du métier, ce qui est grossier et suffisant — le nom d'une
   * famille de médecins aide à entrer en médecine, et nulle part ailleurs.
   */
  const field = FIELD_BY_CATEGORY[category ?? ''] ?? null;
  return clamp(doorFor(state, field), 1, 1.8);
}

/**
 * Le pont entre les catégories de métiers et les domaines de notoriété.
 *
 * Volontairement partiel : la plupart des métiers ne relèvent d'aucun domaine
 * public, et leur donner un lien inventé ferait ouvrir le nom partout — ce
 * que tout ce fichier cherche à éviter.
 */
const FIELD_BY_CATEGORY: Record<string, string> = {
  /*
   * **Les libellés exacts de `data/jobs.ts`.** Deux des sept premières
   * entrées étaient fausses — « Droit » pour « Droit & Justice », « Arts »
   * pour « Arts & Spectacle » — et ne correspondaient donc à rien,
   * silencieusement. Un test vérifie maintenant que chaque clé existe
   * réellement dans la grille des métiers.
   */
  'Arts & Spectacle': 'écran',
  'Médias': 'plateau',
  'Sport': 'terrain',
  'Restauration': 'fourneaux',
  'Finance': 'affaires',
  'Droit & Justice': 'tribune',
  'Fonction publique': 'tribune',
  'Sciences': 'pages',
};
