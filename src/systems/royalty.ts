/**
 * La couronne.
 *
 * Le contraire d'une carrière. Une carrière se construit : on postule, on
 * progresse, on est promu. Une couronne ne se construit pas — on y naît, on
 * l'épouse, ou on la reçoit pour ce qu'on a déjà fait ailleurs — et à partir
 * de là, tout ce qu'on peut faire est **ne pas la perdre**.
 *
 * Quatre règles gouvernent ce fichier, et elles ne ressemblent à rien d'autre
 * dans le jeu.
 *
 * **1. La file décide, pas le mérite.** L'ordre de succession est une liste.
 * On y monte quand quelqu'un devant meurt ou renonce, et l'on y descend quand
 * un enfant naît plus près du trône. Aucune action du joueur ne le fait
 * avancer d'une place : c'est la seule progression du jeu qui lui échappe
 * entièrement, et c'est le sujet.
 *
 * **2. Il y a deux opinions, et on ne peut pas jouer les deux.** Ce qu'on
 * pense de *vous* répond à ce que vous faites cette année. Ce qu'on pense de
 * *la couronne* met une génération à bouger, et c'est celle-là qui décide si
 * l'institution existe encore. Plus le titre est haut, plus votre conduite
 * déteint sur l'institution : un baron scandaleux amuse, un souverain
 * scandaleux coûte une monarchie.
 *
 * **3. Les trois portes ne mènent pas au même endroit.** Naître dans la
 * maison met dans la file. L'épouser donne un titre et pas une place — mais
 * les enfants, eux, y sont. Être anobli donne un titre et rien d'autre, ni
 * pour soi ni pour les siens. C'est ce qui fait que « épouser un prince » et
 * « naître prince » ne sont pas la même partie.
 *
 * **4. Tout peut être retiré.** Une condamnation, trois scandales, une
 * abdication : chacun a sa façon de vous sortir de la file. Et si le pays
 * cesse assez longtemps de vouloir d'une couronne, ce n'est pas vous qu'on
 * écarte — c'est elle qu'on supprime, et personne ne la retrouve.
 *
 * Maisons, royaumes et titres sont entièrement fictifs, et aucun pays réel
 * n'est décrit ici comme une monarchie : le royaume est un décor de jeu planté
 * à côté du pays où l'on habite.
 */

import { clamp, clampStat, toward } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, Crown, GameState, RoyalKin,
} from '../engine/types.ts';
import type { MiniGameContext, MiniGameResult } from '../engine/minigame.ts';
import { blend } from '../engine/minigame.ts';
import {
  AFFAIRS, AFFAIR_MEMORY, COLLAPSE_LINE, COLLAPSE_YEARS, CONSORT_DROP, DISGRACE_LIMIT,
  DISGRACE_WINDOW, DUTIES, DUTY_AGE, DUTY_RAMP, ENNOBLE_MERIT,
  ENNOBLE_REPUTATION, FATIGUE, HOUSES,
  KIN_ROLES, MAX_DUTIES, PRESENTATION_COST, TITLES, getAffair, getDuty,
  getHouse, getTitle, placeLabel, sentimentLabel, standingLabel, titleForPlace,
  titleLabel,
  type Affair, type Aptitude, type Duty, type House, type Title,
} from '../data/royalty.ts';
import { getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';
import { createPerson } from './npc.ts';
import { shiftStat, shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';

export {
  AFFAIRS, DUTIES, HOUSES, TITLES, placeLabel, sentimentLabel, standingLabel,
  titleLabel,
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function crownOf(state: GameState): Crown | null {
  return state.player.crown;
}

/** La position tient-elle encore ? Un titre retiré ou aboli ne donne rien. */
export function inCourt(state: GameState): boolean {
  const crown = state.player.crown;
  return Boolean(crown && !crown.removed && !crown.abolished);
}

export function houseOf(state: GameState): House | null {
  const crown = state.player.crown;
  return crown ? getHouse(crown.houseId) ?? null : null;
}

export function titleOf(state: GameState): Title | null {
  const crown = state.player.crown;
  return crown ? getTitle(crown.titleId) ?? null : null;
}

/** Le titre écrit pour la personne qui le porte. */
export function myTitle(state: GameState): string {
  const crown = state.player.crown;
  return crown ? titleLabel(crown.titleId, state.player.sex) : '';
}

/** L'unité monétaire d'une maison, à l'échelle du pays et de l'époque. */
export function royalUnit(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return country.salaryIndex * state.world.inflation;
}

/**
 * Jusqu'où le rang fait connaître, et pas plus loin.
 *
 * Un plafond commun à tout ce qui, dans ce fichier, rend célèbre : la rente
 * de visibilité du rang et les engagements tenus. Deux compteurs séparés
 * poussaient auparavant la notoriété sans limite, et n'importe quel cousin de
 * la maison finissait au plafond du jeu après quarante ans de rubans coupés —
 * avec, pour conséquence mesurée, les trois quarts des vies royales écartées
 * pour disgrâce, le système de renommée faisant dépendre les affaires de
 * l'exposition.
 *
 * Un comte reste quelqu'un qu'on ne connaît pas. Un souverain est connu de
 * tout le monde. C'est le rang qui expose, pas l'ancienneté.
 */
export function fameReach(state: GameState): number {
  const title = titleOf(state);
  const crown = state.player.crown;
  if (!title || !crown) return 0;
  return title.visibility * (0.8 + crown.standing / 130);
}

/** La rente annuelle du titre porté. */
export function stipendOf(state: GameState): number {
  const title = titleOf(state);
  if (!title || !inCourt(state)) return 0;
  return Math.round(title.stipend * royalUnit(state));
}

/**
 * L'ordre de succession : ceux qui sont vivants, dans la file, et pas écartés.
 *
 * C'est la seule liste qui compte. Tout le reste — les titres, les rentes, ce
 * qu'on attend de vous — s'en déduit.
 */
export function succession(state: GameState): RoyalKin[] {
  const crown = state.player.crown;
  if (!crown || crown.abolished) return [];
  return crown.line.filter((k) => k.heir && k.alive && !k.removed);
}

/** Ta place dans l'ordre. 0 = sur le trône, -1 = tu n'y es pas. */
export function placeOf(state: GameState): number {
  return succession(state).findIndex((k) => k.personId === 'player');
}

/** Le souverain régnant, s'il y en a un. */
export function sovereignOf(state: GameState): RoyalKin | null {
  return succession(state)[0] ?? null;
}

/** Règnes-tu ? */
export function reigns(state: GameState): boolean {
  return inCourt(state) && placeOf(state) === 0;
}

/** Ton entrée dans la file, quelle qu'elle soit. */
function selfKin(crown: Crown): RoyalKin | undefined {
  return crown.line.find((k) => k.personId === 'player');
}

/* ------------------------------------------------------------------ */
/* Fabriquer une maison                                                */
/* ------------------------------------------------------------------ */

/**
 * Un parent de la maison qu'on ne rencontrera jamais.
 *
 * Il porte un nom et un âge parce que la file doit être lisible — savoir que
 * l'on est derrière quelqu'un de quatre-vingt-onze ans n'est pas la même
 * information que d'être derrière un enfant de six.
 */
function makeKin(ctx: Ctx, house: House, age: number, i: number): RoyalKin {
  const { state, rng } = ctx;
  const names = getNameSet(getCountry(state.player.countryId).nameSet);
  const role = KIN_ROLES[i % KIN_ROLES.length];
  const female = role.startsWith('une');
  const first = rng.pick(female ? names.female : names.male);
  state.idCounter += 1;
  return {
    id: `kin_${state.idCounter}`,
    name: `${first} de ${house.name}`,
    role,
    age,
    alive: true,
    heir: true,
  };
}

/**
 * Une file plausible autour d'une place donnée.
 *
 * Devant : des gens plus vieux, qui partiront. Derrière : des gens plus
 * jeunes, qui ne partiront pas. C'est ce qui fait qu'une place lointaine est
 * une place lointaine pour la vie, et qu'attendre n'est pas une stratégie.
 */
function buildLine(ctx: Ctx, house: House, place: number): RoyalKin[] {
  const { rng } = ctx;
  const line: RoyalKin[] = [];
  // Le souverain d'abord : c'est lui qu'on attend, et il est vieux.
  //
  // Ceux qui suivent descendent en âge, et **descendent sous celui du
  // joueur**. La première version ne mettait devant lui que des gens plus
  // âgés que lui, ce qui paraissait logique et était faux deux fois : une
  // file de succession n'est pas triée par âge — un petit-fils de six ans
  // passe avant un cousin de soixante — et surtout une file uniquement
  // composée de vieillards ne fait que se vider. Personne devant n'étant plus
  // en âge d'avoir des enfants, elle ne se remplissait jamais, et le trône
  // finissait par revenir à tout le monde.
  for (let i = 0; i < place; i++) {
    const age = i === 0
      ? rng.int(66, 84)
      : Math.max(1, Math.round(66 - (i / Math.max(1, place)) * 54 + rng.int(-9, 9)));
    line.push(makeKin(ctx, house, age, i));
  }
  line.push({
    id: 'kin_player',
    name: fullName(ctx.state.player),
    personId: 'player',
    role: 'toi',
    age: ctx.state.player.age,
    alive: true,
    heir: true,
  });
  // Derrière : une branche cadette qui ne bougera pas. Son âge est
  // indépendant de celui du joueur — la file n'est pas triée par âge, et la
  // caler sur lui donnait, pour un nouveau-né, trois cousins nés très
  // exactement la même année que lui.
  const behind = 2 + rng.int(0, 3);
  for (let i = 0; i < behind; i++) {
    line.push(makeKin(ctx, house, rng.int(0, 46), place + i + 3));
  }
  return line;
}

/** Une position neuve, à partir d'une maison et d'une porte d'entrée. */
function newCrown(
  ctx: Ctx, house: House, entry: Crown['entry'], line: RoyalKin[], titleId: string,
): Crown {
  return {
    houseId: house.id,
    entry,
    since: ctx.state.year,
    titleId,
    line,
    // On n'arrive pas aimé ni détesté : on arrive inconnu.
    standing: 52,
    sentiment: house.sentiment,
    faltering: 0,
    duties: {},
    lifetimeDuties: 0,
    pending: null,
    record: [],
    earnedThisYear: 0,
    reigned: 0,
    removed: null,
    abolished: false,
  };
}

/* ------------------------------------------------------------------ */
/* Porte 1 : y naître                                                  */
/* ------------------------------------------------------------------ */

/**
 * Un tirage stable, tiré de la graine et non du générateur.
 *
 * Consommer un tirage à chaque naissance déplacerait toute la suite du hasard
 * pour l'immense majorité des vies, qui ne seront jamais royales. Ici la
 * graine seule décide, et le générateur n'est touché que dans la branche
 * royale — c'est-à-dire dans une vie qui, de toute façon, ne ressemble à
 * aucune autre.
 */
function seedDraw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Quelle part des naissances fortunées se fait dans une maison régnante. */
export const BORN_ROYAL = 0.3;

/**
 * Naître dedans.
 *
 * Réservé aux naissances les plus fortunées — non par symbolisme mais parce
 * que le foyer généré doit être cohérent avec ce qu'on raconte : on ne naît
 * pas prince dans un logement social. Appelé une fois, à la création d'une
 * vie.
 */
export function maybeBornRoyal(ctx: Ctx, tierId: string): boolean {
  const { state, rng } = ctx;
  if (state.player.crown) return false;
  if (tierId !== 'rich') return false;
  if (seedDraw(state.seed, 7) >= BORN_ROYAL) return false;

  const house = HOUSES[Math.floor(seedDraw(state.seed, 11) * HOUSES.length)] ?? HOUSES[0];
  // Jamais premier : le jeu commencerait par la fin. Assez près pour que la
  // file bouge de son vivant, assez loin pour que ce ne soit pas acquis.
  const place = 2 + rng.int(0, 4);
  const line = buildLine(ctx, house, place);
  const crown = newCrown(ctx, house, 'naissance', line, titleForPlace(place));
  state.player.crown = crown;
  ctx.log(
    'life',
    `Tu nais dans la maison ${house.name}, ${placeLabel(place).toLowerCase()} pour ${house.realm}.`,
    'neutral',
  );
  return true;
}

/* ------------------------------------------------------------------ */
/* Porte 2 : l'épouser                                                 */
/* ------------------------------------------------------------------ */

/** Ce qu'il faut pour se faire présenter à la cour. */
export function presentationBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.crown) return 'Tu es déjà de la maison.';
  if (p.age < 18) return 'Il faut avoir dix-huit ans.';
  if (p.flags.presented) return 'Tu y as déjà été présenté.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.convictions.length > 0) return 'On ne présente pas un casier à la cour.';
  if (p.stats.reputation < 62) return 'Il faudrait qu’on dise du bien de toi — 62 de réputation.';
  if (p.money < presentationCost(state)) {
    return `Il faut de quoi s’y présenter — ${Math.round(presentationCost(state))}.`;
  }
  return null;
}

export function presentationCost(state: GameState): number {
  return Math.round(PRESENTATION_COST * 40_000 * royalUnit(state));
}

/**
 * Se faire présenter.
 *
 * Cela n'ouvre rien : cela crée quelqu'un. Ce qui suit relève du système de
 * relations, exactement comme n'importe quelle rencontre — et c'est voulu.
 * Épouser un membre d'une maison ne doit pas être un bouton mais un mariage,
 * avec tout ce qu'un mariage demande dans ce jeu.
 */
export function seekPresentation(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const blocker = presentationBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const cost = presentationCost(state);
  state.player.money -= cost;
  state.player.flags.presented = true;

  const house = rng.pick(HOUSES);
  // Ce qu'on vaut décide de qui l'on rencontre, pas du fait d'en rencontrer.
  const worth = state.player.stats.reputation + state.player.fame.level * 0.4;
  const place = worth > 82 ? 1 + rng.int(0, 2) : worth > 70 ? 4 + rng.int(0, 5) : 9 + rng.int(0, 8);
  // Quelqu'un que le personnage peut réellement épouser : une présentation
  // ne se demande qu'une fois, et tirer le sexe au hasard fermait la porte
  // pour la vie entière à une fois sur deux.
  const wanted: 'M' | 'F' = state.player.orientation === 'homo'
    ? state.player.sex
    : state.player.orientation === 'hetero'
      ? (state.player.sex === 'M' ? 'F' : 'M')
      : (rng.chance(0.5) ? 'M' : 'F');
  const kin = createPerson(ctx, {
    relation: 'acquaintance',
    sex: wanted,
    age: clamp(state.player.age + rng.int(-7, 7), 19, 70),
    lastName: `de ${house.name}`,
    withJob: false,
    relationship: rng.int(30, 48),
    wealthBase: house.fortune * royalUnit(state) * 0.02,
  });
  kin.flags.royalHouse = house.id;
  kin.flags.royalPlace = place;
  kin.jobTitle = titleLabel(titleForPlace(place), kin.sex);

  shiftStat(state, 'happiness', 4);
  ctx.log(
    'life',
    `On te présente à la maison ${house.name}. Tu y rencontres ${fullName(kin)}.`,
    'good',
  );
  return {
    ok: true,
    title: 'Présenté à la cour',
    tone: 'good',
    message: `${fullName(kin)}, ${kin.jobTitle?.toLowerCase()} — ${placeLabel(place).toLowerCase()}. Le reste ne dépend plus du protocole.`,
  };
}

/**
 * Épouser quelqu'un de la maison.
 *
 * Détecté et non déclenché : le joueur se marie comme il se marie toujours, et
 * la couronne s'aperçoit après coup que le conjoint en était. Un conjoint
 * reçoit un titre et **jamais une place** — mais les enfants qui naîtront
 * seront dans la file, ce qui rend cette porte différente des deux autres.
 */
function catchMarriage(ctx: Ctx): void {
  const { state, rng } = ctx;
  if (state.player.crown) return;
  const spouse = Object.values(state.npcs).find(
    (n) => n.alive && n.relation === 'spouse' && typeof n.flags.royalHouse === 'string',
  );
  if (!spouse) return;
  const house = getHouse(String(spouse.flags.royalHouse));
  if (!house) return;

  const place = Number(spouse.flags.royalPlace ?? 8);
  const line = buildLine(ctx, house, place);
  // Le conjoint prend la place qu'on avait prévue pour le joueur ; le joueur
  // vient à côté, sans y être.
  const seat = line.find((k) => k.personId === 'player');
  if (seat) {
    seat.name = fullName(spouse);
    seat.personId = spouse.id;
    seat.role = 'ton conjoint';
    seat.age = spouse.age;
  }
  line.push({
    id: 'kin_player',
    name: fullName(state.player),
    personId: 'player',
    role: 'toi, par alliance',
    age: state.player.age,
    alive: true,
    heir: false,
  });

  // Le rang du conjoint, d'un cran en dessous : on partage le nom, pas le
  // trône. C'est la règle qui rend cette porte distincte de la naissance.
  const rank = Math.max(1, (getTitle(titleForPlace(place))?.rank ?? 2) - CONSORT_DROP);
  const title = TITLES.find((t) => t.rank === rank) ?? TITLES[0];
  const crown = newCrown(ctx, house, 'mariage', line, title.id);
  crown.standing = clampStat(46 + rng.int(0, 8));
  state.player.crown = crown;
  ctx.log(
    'life',
    `En épousant ${fullName(spouse)}, tu entres dans la maison ${house.name}. On t’appellera ${titleLabel(title.id, state.player.sex).toLowerCase()}.`,
    'good',
  );
  applyExperience(ctx, 'entréeÀLaCour');
}

/* ------------------------------------------------------------------ */
/* Porte 3 : le mériter                                                */
/* ------------------------------------------------------------------ */

/**
 * Ce qui compte comme un service rendu.
 *
 * Chaque ligne branche la couronne sur un système qui existait avant elle. On
 * n'entre jamais par la fortune seule : c'est ce que le test vérifie, et c'est
 * la seule chose qui distingue un anobli d'un riche.
 */
export function meritOf(state: GameState): { label: string; got: boolean }[] {
  const p = state.player;
  return [
    { label: 'Avoir servi sous l’uniforme', got: Boolean(p.veteran && p.veteran.decorations.length > 0) },
    { label: 'Avoir exercé un mandat public', got: Boolean(p.flags.heldOffice) },
    { label: 'Avoir donné une fortune', got: p.chronicle.given >= 200_000 * royalUnit(state) },
    { label: 'Être connu pour ce que tu fais', got: p.fame.level >= 40 && p.fame.goodwill >= 60 },
    { label: 'Avoir bâti quelque chose qui tient', got: p.chronicle.venturesRun > 0 && p.money > 1_000_000 * royalUnit(state) },
    { label: 'Un diplôme d’un niveau rare', got: p.education.level >= 4 },
  ];
}

export function meritCount(state: GameState): number {
  return meritOf(state).filter((m) => m.got).length;
}

export function ennobleBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.crown) return 'Tu es déjà de la maison.';
  if (p.age < 35) return 'On n’anoblit pas une promesse.';
  if (p.criminalRecord.convictions.length > 0) return 'Un casier ferme cette porte, définitivement.';
  if (p.stats.reputation < ENNOBLE_REPUTATION) {
    return `Il faut une réputation sans reproche — ${ENNOBLE_REPUTATION}.`;
  }
  if (meritCount(state) < ENNOBLE_MERIT) {
    return `Il faut avoir rendu des services — ${ENNOBLE_MERIT} sur les six.`;
  }
  return null;
}

/**
 * Recevoir un titre.
 *
 * Un anobli n'est dans aucune file : il porte un nom, tient des engagements,
 * touche une rente, et sa descendance n'héritera que du nom. C'est le chemin
 * le plus long et celui qui mène le moins loin — ce qui est exactement le
 * propos.
 */
export function ennoble(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const blocker = ennobleBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const house = rng.pick(HOUSES);
  const merits = meritCount(state);
  const titleId = merits >= 5 ? 'duc' : merits >= 4 ? 'comte' : 'baron';
  const line: RoyalKin[] = [{
    id: 'kin_player',
    name: fullName(state.player),
    personId: 'player',
    role: 'toi, par lettres',
    age: state.player.age,
    alive: true,
    heir: false,
  }];
  const crown = newCrown(ctx, house, 'anoblissement', line, titleId);
  // On arrive avec ce qu'on a fait : un anobli est déjà quelqu'un.
  crown.standing = clampStat(58 + merits * 3);
  state.player.crown = crown;

  shiftStats(state, { reputation: 6, happiness: 8 });
  applyExperience(ctx, 'entréeÀLaCour');
  ctx.log(
    'life',
    `La maison ${house.name} te fait ${titleLabel(titleId, state.player.sex).toLowerCase()}.`,
    'good',
  );
  return {
    ok: true,
    title: titleLabel(titleId, state.player.sex),
    tone: 'good',
    message: `${house.motto}. Tu portes un titre et aucune place : la file ne s’ouvre pas à ceux qui ont mérité d’y entrer.`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qui passe à la génération suivante                               */
/* ------------------------------------------------------------------ */

/**
 * La position, reprise par un descendant.
 *
 * C'est le seul endroit du jeu où mourir fait gagner quelque chose : l'enfant
 * qui reprend la partie monte d'autant de crans que son parent en occupait, et
 * une vie entière passée troisième dans l'ordre peut ne servir qu'à ce que le
 * suivant soit premier.
 *
 * Ce qui passe et ce qui ne passe pas est la règle du système :
 * - **le sentiment passe**, parce que c'est celui du pays envers la couronne
 *   et qu'il ne recommence pas à zéro parce que quelqu'un est mort ;
 * - **ce qu'on pensait de toi ne passe pas**, ou à peine : l'enfant n'est pas
 *   son parent, et devra se faire juger seul ;
 * - **un anobli ne transmet qu'un nom** : le titre descend d'un rang à chaque
 *   génération, et finit par ne plus rien être.
 */
export function inheritCrown(state: GameState, heirId: string): Crown | null {
  const old = state.player.crown;
  if (!old || old.abolished || old.removed) return null;

  const line = old.line.map((k) => ({ ...k }));
  const parent = line.find((k) => k.personId === 'player');
  if (parent) {
    parent.alive = false;
    parent.personId = undefined;
    parent.role = 'ton ascendant';
    parent.name = fullName(state.player);
  }

  const carried = (seat: RoyalKin[], titleId: string, entry: Crown['entry']): Crown => ({
    ...old,
    entry,
    since: state.year,
    titleId,
    line: seat,
    // Le pays garde son idée de la couronne ; il n'a pas d'idée de toi.
    standing: clampStat(48 + (old.standing - 50) * 0.25),
    duties: {},
    lifetimeDuties: 0,
    pending: null,
    record: [],
    earnedThisYear: 0,
    reigned: 0,
    removed: null,
    abolished: false,
  });

  const seat = line.find((k) => k.personId === heirId);
  if (seat && seat.heir && seat.alive) {
    seat.personId = 'player';
    seat.role = 'toi';
    const place = line.filter((k) => k.heir && k.alive && !k.removed)
      .findIndex((k) => k.personId === 'player');
    return carried(line, titleForPlace(Math.max(0, place)), 'naissance');
  }

  // Un anobli ne met personne dans la file : ses enfants héritent d'un nom
  // qui vaut un rang de moins, et de rien d'autre. Au bout de trois
  // générations il ne reste plus qu'un baron, puis plus rien du tout.
  if (old.entry === 'anoblissement') {
    const rank = (getTitle(old.titleId)?.rank ?? 1) - 1;
    if (rank < 1) return null;
    const fallen = TITLES.find((t) => t.rank === rank) ?? TITLES[0];
    return carried([{
      id: 'kin_player',
      name: '',
      personId: 'player',
      role: 'toi, par le nom',
      age: 0,
      alive: true,
      heir: false,
    }], fallen.id, 'anoblissement');
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Les engagements                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'année attend de toi.
 *
 * Rien avant `DUTY_AGE`, puis une montée par paliers. Un enfant porte un
 * titre et une place dans la file ; il ne représente personne.
 */
export function expectedDuties(state: GameState): number {
  const title = titleOf(state);
  if (!title || !inCourt(state)) return 0;
  const age = state.player.age;
  if (age < DUTY_AGE) return 0;
  const ramp = Math.min(1, (age - DUTY_AGE + 2) / DUTY_RAMP);
  return Math.max(1, Math.round(title.expected * ramp));
}

/** Ce que tu as tenu cette année. */
export function dutiesDone(state: GameState): number {
  const crown = state.player.crown;
  if (!crown) return 0;
  return Object.values(crown.duties).reduce((sum, n) => sum + n, 0);
}

/** Les engagements auxquels ton rang te donne accès. */
export function availableDuties(state: GameState): Duty[] {
  const title = titleOf(state);
  if (!title || !inCourt(state)) return [];
  return DUTIES.filter((d) => d.minRank <= title.rank);
}

export function dutyCost(state: GameState, duty: Duty): number {
  return Math.round(duty.cost * stipendOf(state));
}

export function dutyBlocker(state: GameState, duty: Duty): string | null {
  const crown = state.player.crown;
  const title = titleOf(state);
  if (!crown || !title || !inCourt(state)) return 'Tu n’es d’aucune maison.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (state.player.age < DUTY_AGE) return `On n’envoie personne représenter la maison avant ${DUTY_AGE} ans.`;
  if (duty.minRank > title.rank) return 'Ton rang ne t’y donne pas accès.';
  if (dutiesDone(state) >= MAX_DUTIES) return 'L’année est pleine.';
  if (state.player.money < dutyCost(state, duty)) {
    return `Il faut le financer — ${dutyCost(state, duty)}.`;
  }
  return null;
}

/**
 * Ce que refaire la même chose rapporte de moins.
 *
 * Sept rubans coupés ne font pas sept fois un ruban : au troisième, la presse
 * ne vient plus. C'est ce qui interdit de remplir son quota avec le devoir le
 * moins cher.
 */
export function fatigueOf(state: GameState, duty: Duty): number {
  const crown = state.player.crown;
  const done = crown?.duties[duty.id] ?? 0;
  return Math.max(0.25, 1 - done * FATIGUE);
}

/**
 * Ce que vaut le personnage pour un exercice donné.
 *
 * Composée plutôt que brute : sans cela, les huit engagements seraient huit
 * habillages du même chiffre, et choisir lequel tenir n'aurait aucun sens.
 * Chaque aptitude mêle une statistique visible et la façon de parler du
 * personnage, qui existait déjà et que rien n'utilisait ici.
 */
export function aptitude(state: GameState, asks: Aptitude): number {
  const p = state.player;
  const talk = p.psyche.communication;
  switch (asks) {
    case 'présence':
      return clampStat(p.stats.looks * 0.45 + talk.warmth * 0.3 + talk.expressiveness * 0.25);
    case 'parole':
      return clampStat(talk.assertiveness * 0.35 + talk.expressiveness * 0.3 + talk.composure * 0.35);
    case 'tenue':
      return clampStat(p.stats.discipline * 0.5 + talk.composure * 0.3 + talk.tact * 0.2);
    case 'jugement':
      return clampStat(p.stats.intelligence * 0.55 + talk.tact * 0.25 + talk.composure * 0.2);
    case 'nom':
    default:
      return clampStat(p.stats.reputation * 0.7 + p.fame.goodwill * 0.3);
  }
}

/** Ce que le personnage apporte à un engagement joué. */
export function dutyContext(state: GameState, duty: Duty): MiniGameContext {
  const p = state.player;
  const title = titleOf(state);
  // Le métier s'apprend : on tient sa dixième cérémonie mieux que sa première.
  const skill = clampStat(
    aptitude(state, duty.asks) * 0.7
    + (p.crown?.standing ?? 50) * 0.2
    + Math.min(20, (p.crown?.lifetimeDuties ?? 0) * 1.4),
  );
  // Plus le rang est haut, plus la foule est nombreuse et l'exercice tendu.
  const difficulty = clamp(28 + (title?.rank ?? 1) * 8 + (60 - (p.crown?.sentiment ?? 60)) * 0.5, 10, 92);
  return {
    skill,
    difficulty,
    mode: 'normal',
    grace: {
      time: 1 + skill / 220,
      pressure: 1 - skill / 320,
      tolerance: 20 + skill / 4,
      insight: skill >= 60,
    },
  };
}

/**
 * Tenir un engagement.
 *
 * `result` vient du mini-jeu quand il y en a un ; sans lui, le personnage s'en
 * tire seul et la règle du §3 s'applique — ne pas jouer n'est jamais puni,
 * seulement moins bon que bien jouer.
 */
export function performDuty(ctx: Ctx, dutyId: string, result?: MiniGameResult): ActionResult {
  const { state, rng } = ctx;
  const duty = getDuty(dutyId);
  const crown = state.player.crown;
  if (!duty || !crown) return { ok: false, message: 'Rien à tenir.' };
  const blocker = dutyBlocker(state, duty);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const context = dutyContext(state, duty);
  // `blend` rend une fraction 0-1 : tout ce fichier travaille en 0-100.
  /*
   * **Ne pas jouer n'est jamais puni.** C'est la règle annoncée trois lignes
   * plus haut, et le calcul ne la tenait pas : `skill * 0,62 + [-14 ; +18] +
   * 18` tombe sous 45 — donc en note négative, donc en perte de rang — dès que
   * l'aptitude descend sous 66, ce qui est le cas de la plupart des jeunes
   * altesses. La règle ne tenait que par le tirage, et une mesure sur d'autres
   * graines l'a mise en défaut aussitôt. On plancher donc le chemin
   * automatique juste au-dessus de la neutralité.
   *
   * Ce plancher ne vaut **que** pour qui ne joue pas. Jouer mal reste pire que
   * ne pas jouer : c'est le pari, et c'est ce qui donne un sens au fait de
   * jouer. La règle promet seulement que l'abstention n'est jamais punie, pas
   * qu'elle vaut mieux qu'une bonne prestation.
   */
  const outcome = result
    ? clampStat(blend(context, result, 0.45) * 100)
    : Math.max(48, clampStat(context.skill * 0.62 + rng.float(-14, 18) + 18));
  const wear = fatigueOf(state, duty);
  // Un engagement réussi vaut son plein ; un engagement raté vaut moins que
  // rien, parce qu'on s'est montré et qu'on a été mauvais.
  const grade = (outcome - 45) / 55;

  const cost = dutyCost(state, duty);
  state.player.money -= cost;

  crown.standing = clampStat(crown.standing + duty.approval * grade * wear);
  crown.sentiment = clamp(
    crown.sentiment + duty.sentiment * grade * wear * (titleOf(state)?.weight ?? 0.3), 0, 100,
  );
  crown.duties[duty.id] = (crown.duties[duty.id] ?? 0) + 1;
  crown.lifetimeDuties += 1;

  shiftStats(state, {
    stress: duty.strain * (1.3 - context.skill / 160),
    karma: grade > 0 ? duty.karma : 0,
    reputation: duty.approval * grade * 0.25,
  });
  // Vers le plafond du rang, jamais au-delà : tenir beaucoup d'engagements
  // fait connaître dans les limites de ce qu'on est, et pas plus.
  state.player.fame.level = toward(
    state.player.fame.level, fameReach(state), duty.fame * Math.max(0, grade) * wear,
  );

  const good = grade > 0.25;
  ctx.log(
    'work',
    `${duty.label} — ${good ? 'et c’était bien' : grade > -0.1 ? 'sans plus' : 'et cela s’est vu'}.`,
    good ? 'good' : grade > -0.1 ? 'neutral' : 'bad',
  );
  return {
    ok: true,
    title: duty.label,
    tone: good ? 'good' : grade > -0.1 ? 'neutral' : 'bad',
    message: `${result?.notes?.[0] ?? duty.note} ${standingLabel(crown.standing)}. ${
      dutiesDone(state)}/${expectedDuties(state)} pour l’année.`,
  };
}

/* ------------------------------------------------------------------ */
/* Les affaires                                                        */
/* ------------------------------------------------------------------ */

/** L'affaire posée, tant qu'elle n'est pas tranchée. */
export function pendingAffair(state: GameState): Affair | null {
  const crown = state.player.crown;
  return crown?.pending ? getAffair(crown.pending) ?? null : null;
}

/**
 * Trancher.
 *
 * La question est toujours la même : parler ou se taire, et au profit de qui.
 * Aucune option ne contente tout le monde — c'est vérifié par un test, comme
 * pour les décisions de mandat.
 */
export function arbitrate(ctx: Ctx, index: number): ActionResult {
  const { state } = ctx;
  const crown = state.player.crown;
  const affair = pendingAffair(state);
  if (!crown || !affair) return { ok: false, message: 'Rien à trancher.' };
  const option = affair.options[index];
  if (!option) return { ok: false, message: 'Ce choix n’existe pas.' };

  crown.standing = clampStat(crown.standing + option.approval);
  crown.sentiment = clamp(crown.sentiment + option.sentiment, 0, 100);
  const cost = Math.round(option.cost * stipendOf(state));
  if (cost !== 0) state.player.money -= cost;
  shiftStat(state, 'karma', option.karma);

  // Les siens ont un avis, et ils sont dans la partie : une décision qui sauve
  // la couronne peut coûter une famille.
  if (option.family !== 0) {
    for (const npc of Object.values(state.npcs)) {
      const close = ['spouse', 'son', 'daughter', 'father', 'mother', 'brother', 'sister'];
      if (!npc.alive || !close.includes(npc.relation)) continue;
      npc.relationship = clampStat(npc.relationship + option.family);
      npc.opinion = clampStat(npc.opinion + option.family * 0.7);
    }
  }

  crown.record.push(`${affair.title} — ${option.label.toLowerCase()}`);
  crown.pending = null;
  ctx.log('work', `${affair.title} : ${option.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: option.label,
    tone: option.sentiment >= 2 ? 'good' : option.sentiment <= -2 ? 'bad' : 'neutral',
    message: `${option.outcome} ${sentimentLabel(crown.sentiment)}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Renoncer                                                            */
/* ------------------------------------------------------------------ */

export function abdicateBlocker(state: GameState): string | null {
  if (!inCourt(state)) return 'Tu n’es d’aucune maison.';
  return null;
}

/**
 * Partir.
 *
 * On peut toujours. On sort de la file définitivement — la place ne se
 * reprend pas — on garde un titre diminué, et l'institution encaisse le coup.
 * Un souverain qui abdique fait plus de mal qu'un cousin qui s'en va : c'est
 * le poids du titre, comme partout ici.
 */
export function abdicate(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const crown = state.player.crown;
  const title = titleOf(state);
  if (!crown || !title) return { ok: false, message: 'Tu n’es d’aucune maison.' };

  const wasSovereign = reigns(state);
  const seat = selfKin(crown);
  if (seat) { seat.removed = 'abdication'; seat.heir = false; }

  const fallen = TITLES.find((t) => t.rank === Math.max(1, title.rank - 2)) ?? TITLES[0];
  crown.titleId = fallen.id;
  crown.sentiment = clamp(crown.sentiment - 2 - title.weight * 4, 0, 100);
  crown.standing = clampStat(crown.standing - 12);
  crown.record.push(`Renoncement — ${state.year}`);

  shiftStats(state, { reputation: -6, happiness: 6, stress: -14 });
  applyExperience(ctx, 'renoncement');
  ctx.log(
    'life',
    wasSovereign ? 'Tu abdiques. La couronne passe au suivant.' : 'Tu renonces à ta place dans l’ordre.',
    'neutral',
  );
  return {
    ok: true,
    title: 'Renoncement',
    tone: 'neutral',
    message: `On t’appellera ${titleLabel(fallen.id, state.player.sex).toLowerCase()}. La place, elle, ne se reprend pas.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que la rente a versé depuis le dernier bilan.
 *
 * Comme partout : l'argent est crédité au moment où il est gagné, et ce
 * compteur ne sert qu'à l'assiette imposable — le bilan retranche ce qu'il y
 * trouve pour ne pas l'encaisser deux fois.
 */
export function royalEarnings(state: GameState): number {
  const crown = state.player.crown;
  return crown ? Math.max(0, Math.round(crown.earnedThisYear)) : 0;
}

export function clearRoyalYear(state: GameState): void {
  if (state.player.crown) state.player.crown.earnedThisYear = 0;
}

/** Les enfants du joueur qui devraient être dans la file et n'y sont pas. */
function enrolChildren(ctx: Ctx): void {
  const { state } = ctx;
  const crown = state.player.crown;
  if (!crown || crown.abolished) return;
  const seat = selfKin(crown);
  if (!seat) return;

  // Un anobli ne transmet pas de place : ses enfants n'entrent jamais dans la
  // file. Un conjoint, si — c'est toute la différence entre les deux portes.
  const transmits = crown.entry !== 'anoblissement';
  const behindId = crown.entry === 'mariage'
    ? crown.line.find((k) => k.role === 'ton conjoint')?.id ?? seat.id
    : seat.id;

  const mine = (k: RoyalKin) => k.role === 'ton fils' || k.role === 'ta fille';
  for (const npc of Object.values(state.npcs)) {
    if (npc.relation !== 'son' && npc.relation !== 'daughter') continue;
    if (!npc.alive) continue;
    if (crown.line.some((k) => k.personId === npc.id)) continue;
    const at = crown.line.findIndex((k) => k.id === behindId);
    if (at < 0) continue;
    // Derrière le parent qui transmet, et derrière les aînés déjà inscrits :
    // c'est ce qui fait qu'un enfant de plus recule toute la branche cadette
    // d'un cran, sans jamais dépasser ses aînés.
    const elders = crown.line.filter(mine).length;
    crown.line.splice(at + 1 + elders, 0, {
      id: `kin_${npc.id}`,
      name: fullName(npc),
      personId: npc.id,
      role: npc.sex === 'M' ? 'ton fils' : 'ta fille',
      age: npc.age,
      alive: true,
      heir: transmits,
    });
    if (transmits) {
      ctx.log('family', `${npc.firstName} entre dans l’ordre de succession.`, 'neutral');
    }
  }
}

/**
 * Ce que les affaires récentes pèsent, en poids cumulé.
 *
 * Lisible depuis l'écran : quelqu'un sur le point d'être écarté doit pouvoir
 * le voir venir, sinon la sanction n'est pas une règle mais une surprise.
 */
export function disgrace(state: GameState): number {
  const year = state.year;
  return state.player.fame.scandals
    .filter((s) => year - s.year <= DISGRACE_WINDOW)
    .reduce((sum, s) => sum + s.weight, 0);
}

/**
 * Ce que la maison tolère avant de vous écarter.
 *
 * Le seuil monte avec ce qu'on pense de vous et avec ce que vous avez tenu :
 * une maison protège qui lui sert, et lâche qui ne lui sert plus.
 */
export function disgraceLimit(state: GameState): number {
  const crown = state.player.crown;
  if (!crown) return DISGRACE_LIMIT;
  return DISGRACE_LIMIT * (
    0.7 + crown.standing / 110 + Math.min(0.5, crown.lifetimeDuties / 45)
  );
}

/** Ce que la conduite de l'année fait à ce qu'on pense de toi. */
function conductShift(state: GameState): number {
  const p = state.player;
  let shift = (p.stats.reputation - 50) * 0.08 + (p.stats.karma - 50) * 0.05;
  if (p.fame.controversy > 40) shift -= (p.fame.controversy - 40) * 0.14;
  if (p.prison) shift -= 22;
  if (p.criminalRecord.wanted) shift -= 15;
  if (p.stats.addiction > 55) shift -= 6;
  return shift;
}

/**
 * Une année de couronne.
 *
 * L'ordre suit la logique : on est payé, on est jugé sur ce qu'on a tenu, on
 * répond de sa conduite, la famille bouge, la file bouge, et le pays fait
 * lentement son idée. L'abolition vient en dernier, parce qu'elle rend tout le
 * reste sans objet.
 */
export function advanceRoyalty(ctx: Ctx): void {
  const { state, rng } = ctx;
  if (!state.player.crown) { catchMarriage(ctx); return; }
  const crown = state.player.crown;
  if (crown.abolished) return;

  const house = getHouse(crown.houseId);
  if (!house) return;

  /* 1. La rente, si l'on est encore de la maison. */
  if (!crown.removed) {
    const pay = stipendOf(state);
    state.player.money += pay;
    crown.earnedThisYear += pay;
  }

  /* 2. Ce qu'on attendait de toi. */
  const expected = expectedDuties(state);
  const done = dutiesDone(state);
  if (!crown.removed && expected > 0) {
    const missing = Math.max(0, expected - done);
    if (missing > 0) {
      crown.standing = clampStat(crown.standing - missing * 3.5);
      crown.sentiment = clamp(
        crown.sentiment - missing * 0.5 * (titleOf(state)?.weight ?? 0.3), 0, 100,
      );
      if (missing >= expected) {
        ctx.log('work', 'Tu n’as rien tenu cette année, et la maison l’a compté.', 'bad');
      }
    } else if (done > expected) {
      // En faire plus que le nécessaire se voit, et pas seulement chez soi.
      crown.standing = clampStat(crown.standing + Math.min(3, done - expected) * 2);
    }
  }
  crown.duties = {};

  /* 3. Ce que tu es, indépendamment de ce que tu fais. */
  if (!crown.removed) {
    crown.standing = clampStat(crown.standing + conductShift(state));
    // L'opinion retourne lentement vers le milieu : rien ne tient tout seul.
    crown.standing = clampStat(crown.standing + (50 - crown.standing) * 0.09);
  }

  /* 4. Ce qui te sort de la file. */
  if (!crown.removed) {
    const seat = selfKin(crown);
    const convictions = state.player.criminalRecord.convictions.length;
    let motive: string | null = null;
    if (convictions > 0) motive = 'condamnation';
    // Ce qu'une maison tolère dépend de ce que vous lui rapportez : on ne
    // défend pas de la même façon quelqu'un qu'on aime et qui tient son rang,
    // et quelqu'un qu'on ne voit qu'aux mauvaises nouvelles. C'est ce qui
    // rend l'exclusion évitable en jouant, plutôt que subie.
    else if (disgrace(state) >= disgraceLimit(state)) motive = 'scandale';
    if (motive) {
      crown.removed = motive;
      if (seat) { seat.removed = motive; seat.heir = false; }
      const weight = titleOf(state)?.weight ?? 0.3;
      crown.sentiment = clamp(
        crown.sentiment - (motive === 'condamnation' ? 5 : 3.5) * (0.5 + weight), 0, 100,
      );
      shiftStats(state, { reputation: -10, happiness: -12 });
      ctx.log(
        'life',
        motive === 'condamnation'
          ? 'La maison te retire ton rang : on ne siège pas avec un casier.'
          : 'La maison te retire ton rang. Ce n’est pas la faute, c’est le nombre.',
        'bad',
      );
    }
  }

  /* 5. Les enfants entrent dans la file. */
  enrolChildren(ctx);

  /* 6. La file vieillit, et se vide. */
  const myPlace = placeOf(state);
  for (const [index, kin] of crown.line.entries()) {
    if (!kin.alive) continue;
    if (kin.personId === 'player') { kin.age = state.player.age; continue; }
    if (kin.personId) {
      // Une vraie personne : c'est la partie qui décide de sa vie, pas nous.
      const real = person(state, kin.personId);
      if (real) { kin.age = real.age; kin.alive = real.alive; }
      continue;
    }
    kin.age += 1;
    // Une mortalité qui monte avec l'âge, et rien d'autre : la file doit
    // avancer d'elle-même, sans que le joueur puisse la pousser.
    const risk = kin.age < 55 ? 0.006 : Math.min(0.34, Math.pow((kin.age - 50) / 42, 2.4) * 0.3);
    if (rng.chance(risk)) {
      kin.alive = false;
      // On ne rapporte que ce qui change quelque chose : la mort d'un cadet
      // que le joueur n'a jamais vu et qui était derrière lui n'est pas une
      // nouvelle, c'est du bruit.
      if (myPlace < 0 || index < crown.line.findIndex((k) => k.personId === 'player')) {
        ctx.log('life', `${kin.name} s’éteint. La file avance.`, 'neutral');
      }
    }
  }

  /* 6 bis. La file se remplit aussi.
   *
   * Sans cela, elle ne fait que se vider : qui vit assez longtemps monte sur
   * le trône à coup sûr, et « attendre » devient une stratégie gagnante. Une
   * naissance dans une branche placée devant repousse tout ce qui suit — c'est
   * la seule chose qui rende une place lointaine réellement lointaine, et la
   * seule qui puisse faire reculer le joueur sans qu'il ait rien fait. */
  {
    let mine = crown.line.findIndex((k) => k.personId === 'player');
    for (let i = 0; i < crown.line.length; i++) {
      const kin = crown.line[i];
      // Les vraies personnes de la partie font leurs enfants ailleurs, et
      // `enrolChildren` s'en occupe. Ici, seulement les branches abstraites.
      if (!kin.alive || kin.removed || !kin.heir || kin.personId) continue;
      // Derrière soi, une naissance ne change rien à sa propre place.
      if (mine >= 0 && i >= mine) break;
      if (kin.age < 20 || kin.age > 44) continue;
      if (!rng.chance(0.06)) continue;
      crown.line.splice(i + 1, 0, makeKin(ctx, house, 0, i + 5));
      i += 1;
      if (mine >= 0) mine += 1;
      ctx.log(
        'life',
        `Une naissance dans la maison ${house.name}. Tu recules d’un rang.`,
        'neutral',
      );
    }
  }

  /* 7. Monter sur le trône. */
  const place = placeOf(state);
  if (place >= 0 && !crown.removed) {
    const owed = titleForPlace(place);
    if (owed !== crown.titleId) {
      const rose = (getTitle(owed)?.rank ?? 0) > (getTitle(crown.titleId)?.rank ?? 0);
      crown.titleId = owed;
      ctx.log(
        'life',
        rose
          ? `Tu montes d’un rang : on t’appellera ${titleLabel(owed, state.player.sex).toLowerCase()}.`
          : `Tu recules dans l’ordre : ${titleLabel(owed, state.player.sex).toLowerCase()}.`,
        rose ? 'good' : 'neutral',
      );
    }
    if (place === 0) {
      // Le compte des années de règne est le seul repère fiable : comparer la
      // place d'avant et d'après ne voit rien quand le souverain est mort
      // ailleurs dans l'année, ce qui est le cas dès qu'il s'agit d'une vraie
      // personne de la partie.
      if (crown.reigned === 0) {
        crown.record.push(`Accession — ${state.year}`);
        shiftStats(state, { reputation: 14, stress: 16 });
        applyExperience(ctx, 'accession');
        ctx.log(
          'life',
          `${fullName(state.player)} monte sur le trône de ${house.realm}.`,
          'good',
        );
      }
      crown.reigned += 1;
    }
  }

  /* 8. Ce que le pays finit par penser de la couronne. */
  const weight = titleOf(state)?.weight ?? 0.3;
  const pull = crown.removed ? 0 : (crown.standing - 50) * 0.06 * weight;
  // Le sentiment revient vers ce que la maison vaut d'elle-même : son
  // ancienneté est un amortisseur, et c'est tout ce qu'elle est.
  const anchor = clamp(house.sentiment - 8 + house.generations * 0.6, 0, 100);
  crown.sentiment = clamp(
    crown.sentiment + (anchor - crown.sentiment) * 0.05 + pull - 0.35, 0, 100,
  );

  /* 9. La notoriété que le rang donne, qu'on le veuille ou non.
   *
   * Un **plafond**, et non un gain annuel. La première version ajoutait deux
   * ou trois points par an sans limite : tout titulaire finissait à cent de
   * notoriété, c'est-à-dire aussi connu qu'il est possible de l'être, ce qui
   * n'a aucun sens pour un cousin de la maison. Pire, le système de renommée
   * fait dépendre les affaires du niveau d'exposition — une mesure sur deux
   * cents vies royales a montré qu'aux trois quarts elles finissaient
   * écartées pour disgrâce, parce que le titre les avait rendues trop
   * célèbres pour survivre à leur propre visibilité.
   *
   * Le rang décide désormais du **niveau où l'on se stabilise**, et rien de
   * plus : un baron reste inconnu, un souverain est célèbre, et c'est le rang
   * qui expose, pas la durée. */
  if (!crown.removed) {
    const title = titleOf(state);
    if (title) {
      state.player.fame.level = toward(state.player.fame.level, fameReach(state), 3.5);
      state.player.fame.peak = Math.max(state.player.fame.peak, state.player.fame.level);
    }
  }

  /* 10. L'affaire de l'année. */
  if (crown.pending) {
    // Ne rien trancher est une réponse, et c'est la plus coûteuse.
    crown.standing = clampStat(crown.standing - 5);
    crown.sentiment = clamp(crown.sentiment - 1.2 * weight, 0, 100);
    crown.record.push(`${getAffair(crown.pending)?.title ?? 'Une affaire'} — laissée sans réponse`);
    ctx.log('work', 'Tu n’as rien répondu, et le silence a été lu.', 'bad');
    crown.pending = null;
  }
  // On ne demande pas à un enfant d'arbitrer une crise nationale : les
  // affaires ne se posent qu'à partir du même âge que les engagements. Sans
  // cette borne, une enfance entière de « laissée sans réponse » précédait le
  // premier choix réel du joueur.
  if (!crown.removed && state.player.age >= DUTY_AGE) {
    const rank = titleOf(state)?.rank ?? 1;
    // Ce qu'on a déjà tranché ne revient pas — mais pas pour toujours. Sept
    // affaires interdites à vie laissaient les trois dernières décennies d'un
    // règne sans une seule décision à prendre. On n'en écarte donc que les
    // dernières, ce qui laisse toujours de quoi poser une question.
    const seen = new Set(crown.record.slice(-AFFAIR_MEMORY).map((r) => r.split(' — ')[0]));
    const pool = AFFAIRS.filter((a) => a.minRank <= rank && !seen.has(a.title));
    if (pool.length > 0 && rng.chance(0.34 + rank * 0.07)) {
      crown.pending = rng.pick(pool).id;
      ctx.log('work', `${getAffair(crown.pending)?.title} — on attend une réponse.`, 'neutral');
    }
  }

  /* 11. La fin, s'il y a une fin. */
  if (crown.sentiment < COLLAPSE_LINE) {
    crown.faltering += 1;
    if (crown.faltering === 1) {
      ctx.log('life', `On parle ouvertement de supprimer la couronne de ${house.realm}.`, 'bad');
    }
    if (crown.faltering >= COLLAPSE_YEARS) {
      crown.abolished = true;
      crown.record.push(`Abolition — ${state.year}`);
      shiftStats(state, { happiness: -18, reputation: -6 });
      applyExperience(ctx, 'abolition');
      ctx.log(
        'life',
        `La couronne de ${house.realm} est abolie. Il n’y a plus de file, et plus de rang.`,
        'bad',
      );
    }
  } else if (crown.faltering > 0) {
    crown.faltering = 0;
    ctx.log('life', 'On ne parle plus de supprimer la couronne.', 'good');
  }
}
