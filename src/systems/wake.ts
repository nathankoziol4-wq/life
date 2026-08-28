/**
 * Ceux qui viennent.
 *
 * **Ce que ce fichier ajoute à ce qui existait.** Un décès de proche faisait
 * ceci, et rien d'autre : `inheritance.ts#handleRelativeDeath` retirait du
 * bonheur, ajoutait du stress, virait une part d'héritage et écrivait une
 * ligne. Trente-deux personnes mouraient par vie, treize d'entre elles étaient
 * des proches, et le joueur ne faisait jamais rien — il lisait. Le catalogue le
 * disait en trois mots : « qui vient, ce qui se dit, ce que ça coûte ».
 *
 * Les trois sont là, et ils ne sont pas de même nature.
 *
 * **Ce que ça coûte se choisit.** Quatre formes, de « rien » à « tout ce qu'il
 * faut ». « Rien » est gratuit et le restera : un système où l'on ne peut pas
 * enterrer quelqu'un parce qu'on est pauvre n'est pas un arbitrage. Ce que la
 * dépense achète n'est pas du décorum, c'est de la **portée** — combien loin la
 * nouvelle va, et combien de gens se déplaceront pour ça.
 *
 * **Ce qui se dit se choisit aussi, et peut être faux.** Six phrases, chacune
 * appuyée sur une chose vérifiable dans la sauvegarde : lui avoir parlé
 * récemment, ne plus lui parler, l'avoir connu depuis l'enfance, avoir été mal
 * vu de lui, qu'il ait bâti quelque chose. Le jeu ne dit pas laquelle est
 * juste. **Il affiche le fait à côté**, et laisse lire. Ceux qui connaissaient
 * le défunt, eux, savent : une phrase creuse coûte plus qu'elle ne rapporte.
 *
 * **Qui vient ne se choisit pas.** C'est toute la différence avec la noce, qui
 * est l'autre grande assemblée du jeu : là-bas on invite et le refus est une
 * place manquante ; ici personne n'invite. On vient parce qu'on était de la
 * famille du mort, ou parce qu'on tient au vivant, et on ne vient pas parce
 * qu'on est fâché, parce qu'on est loin dans le temps, parce qu'on est en
 * prison, ou parce qu'on est trop vieux pour le voyage. **Aucun tirage
 * n'intervient** : l'assemblée est la lecture de ce que le joueur a fait de ses
 * relations pendant quarante ans, rendue le seul jour où il ne peut plus rien
 * y changer.
 *
 * La seule prise qu'on garde sur elle est d'aller le dire soi-même, à trois
 * personnes au plus. C'est peu, et c'est exprès : le reste a été décidé
 * beaucoup plus tôt.
 *
 * **Et l'on n'organise pas toujours.** Quand quelqu'un de plus proche du défunt
 * est encore là — le fils quand meurt la grand-mère — c'est lui qui s'en
 * occupe, et l'on assiste : pas de forme à choisir, pas de facture, seulement
 * ce qu'on dit. Les deux moitiés du système ne sont pas la même scène.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person, WakeState } from '../engine/types.ts';
import {
  COMES, DEFAULT_FORM, EMPTY_STING, ESTRANGED, FORGOTTEN, FOR_YOU, FRAIL,
  FRAIL_AGE, FRAIL_HEALTH, HELD_JOY, HOLLOW_WORD, NOTHING_HELD, STRANGER_FLOOR,
  TELLS, TOLD_PULL, TRUE_WORD, getForm, getWord,
} from '../data/wake.ts';
import { getCountry } from '../data/countries.ts';
import { noteHistory } from './npc.ts';

/* ------------------------------------------------------------------ */
/* Qui a le droit à des obsèques                                       */
/* ------------------------------------------------------------------ */

/** Les liens pour lesquels on se déplace, et donc pour lesquels il y a une scène. */
const MOURNED: string[] = [
  'mother', 'father', 'guardian', 'stepmother', 'stepfather',
  'brother', 'sister', 'son', 'daughter', 'grandmother', 'grandfather',
  'spouse', 'partner', 'bestFriend',
];

/**
 * À quelle distance du défunt on se tient, du plus proche au plus lointain.
 *
 * Sert à trancher **qui organise**, et rien d'autre. Ce n'est pas une mesure
 * d'affection : on peut détester son père et devoir quand même s'occuper de
 * l'enterrement. Le conjoint passe avant les enfants, les enfants avant les
 * parents — un parent qui enterre son fils est déjà une anomalie, et le jeu ne
 * lui demande pas en plus de s'en charger si le fils avait une famille à lui.
 */
function playerRank(deceased: Person): number {
  // `deceased.relation` dit ce que le défunt était **pour le joueur** ; le rang
  // du joueur auprès de lui est donc le miroir : la mère du joueur a pour
  // survivant un enfant, son fils a pour survivant un parent.
  const mirror: Record<string, number> = {
    spouse: 0, partner: 0,
    mother: 1, father: 1, guardian: 1, stepmother: 1, stepfather: 1,
    son: 2, daughter: 2,
    brother: 3, sister: 3,
    grandmother: 4, grandfather: 4,
    bestFriend: 8,
  };
  return mirror[deceased.relation] ?? 9;
}

/** Le rang d'un PNJ auprès du défunt, déduit des liens de parenté enregistrés. */
function npcRank(state: GameState, who: Person, deceased: Person): number {
  if (who.id === deceased.partnerId || who.partnerId === deceased.id) return 0;
  if (deceased.parentIds.includes(who.id)) return 2;
  if (who.parentIds.includes(deceased.id)) return 1;
  // Fratrie : un parent en commun.
  const shared = who.parentIds.some((id) => deceased.parentIds.includes(id));
  if (shared && who.parentIds.length > 0) return 3;
  // Petits-enfants et grands-parents, par un saut de plus.
  for (const id of who.parentIds) {
    const mid = state.npcs[id];
    if (mid && mid.parentIds.includes(deceased.id)) return 4;
  }
  for (const id of deceased.parentIds) {
    const mid = state.npcs[id];
    if (mid && mid.parentIds.includes(who.id)) return 4;
  }
  return 9;
}

/** Y a-t-il, quelque part, quelqu'un de plus proche que nous pour s'en charger ? */
export function arrangedByUs(state: GameState, deceased: Person): boolean {
  const mine = playerRank(deceased);
  if (mine >= 9) return false;
  for (const who of Object.values(state.npcs)) {
    if (!who.alive || who.petSpecies || who.id === deceased.id) continue;
    if (npcRank(state, who, deceased) < mine) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function wakeOf(state: GameState): WakeState | null {
  const wake = state.player.wake ?? null;
  return wake && !wake.done ? wake : null;
}

/** Le défunt, tant que la scène est ouverte. */
export function mourned(state: GameState): Person | null {
  const wake = wakeOf(state);
  return wake ? state.npcs[wake.whoId] ?? null : null;
}

/** Ce que la forme retenue coûterait, dans la monnaie du pays et de l'année. */
export function costOf(state: GameState, formId?: string | null): number {
  const wake = wakeOf(state);
  if (!wake || !wake.ours) return 0;
  const form = getForm(formId ?? wake.formId ?? DEFAULT_FORM);
  if (!form) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(form.cost * country.costIndex * state.world.inflation);
}

/* ------------------------------------------------------------------ */
/* Qui vient                                                           */
/* ------------------------------------------------------------------ */

/** Ce qui retient quelqu'un, quand quelque chose le retient. */
export type Held =
  | null
  | 'brouille'
  | 'détenu'
  | 'oubli'
  | 'grandÂge'
  | 'portée'
  | 'lien'
  | 'inconnu';

export interface Turnout {
  who: Person;
  /** La force qui le fait venir, de 0 à quelque chose au-dessus de 1. */
  pull: number;
  /** Ce qu'elle aurait valu si tout avait été bien fait. */
  potential: number;
  comes: boolean;
  /** Ce qui le retient, quand il ne vient pas. */
  held: Held;
  /** Venait-il pour le mort, ou pour le vivant ? */
  forDeceased: boolean;
}

/** Ce que le rang auprès du défunt vaut, du conjoint au petit-enfant. */
const KIN_PULL = [0.95, 0.9, 0.9, 0.8, 0.62];

/**
 * Ceux dont la place est structurelle, quoi qu'on en ait fait.
 *
 * Pris par le **rôle** et non par le lien : c'est ce qui permet de compter
 * comme une absence quelqu'un qu'on a laissé partir, au lieu de le faire
 * disparaître du décompte avec le lien qu'on n'a pas tenu.
 */
const CIRCLE: string[] = [
  'spouse', 'partner', 'son', 'daughter', 'mother', 'father', 'guardian',
  'brother', 'sister', 'grandmother', 'grandfather', 'bestFriend', 'friend',
];

interface Pulls {
  kin: number; raw: number; fade: number; mine: number;
  reach: number; near: number; stop: number;
}

/**
 * Ce qui retient quelqu'un — celle des raisons qui, à elle seule, suffit.
 *
 * On la trouve en la retirant : si la personne viendrait sans la brouille,
 * c'est la brouille ; sans l'oubli, c'est l'oubli ; si tout aurait porté,
 * c'est la portée. Une première version la déduisait d'une comparaison entre
 * ce qu'on obtenait et ce qu'on aurait pu obtenir, ce qui donnait « il ne sera
 * pas prévenu à temps » à la moitié des absents — y compris à des gens qu'on
 * n'avait pas appelés depuis vingt ans et qui n'auraient pas fait le
 * déplacement de toute façon. C'est le genre de raison qui ment.
 */
function reasonFor(who: Person, p: Pulls, circle: boolean): Held {
  if (who.incarcerated) return 'détenu';
  const at = (mine: number, stop: number) => Math.max(p.kin * p.near, mine * p.reach) * stop;
  if (p.stop < 1 && at(p.mine, 1) >= COMES) return 'grandÂge';
  if (who.estranged && at(p.raw * p.fade, p.stop) >= COMES) return 'brouille';
  if (p.fade < 1 && at(p.raw * (who.estranged ? ESTRANGED : 1), p.stop) >= COMES) return 'oubli';
  if (Math.max(p.kin, p.mine) * p.stop >= COMES) return 'portée';
  // Ni brouille, ni oubli daté, ni distance : le lien lui-même s'est aminci
  // jusqu'à ne plus rien peser. On le distingue de l'étranger, parce que ce
  // n'est pas la même phrase à lire — l'un n'est jamais venu, l'autre est parti.
  return circle ? 'lien' : 'inconnu';
}

/**
 * Ce qui fait venir chacun — et ce qui l'en empêche.
 *
 * Rien ici n'est tiré. **Deux foules, et il a fallu les mesurer pour
 * comprendre qu'il en fallait deux** : la première version n'en avait qu'une,
 * et appliquait à tout le monde l'oubli du joueur. Résultat mesuré sur 1 138
 * obsèques : 0,1 personne présente sur 53 connues, quatre-vingt-dix-neuf virgule
 * neuf pour cent des scènes dans le premier cinquième. La faute était une
 * confusion de sujet — `lastInteractionYear` dit depuis quand **le joueur** n'a
 * pas parlé à quelqu'un, et ce n'est pas ce qui décide si cette personne
 * enterre sa propre mère.
 *
 * Donc : **le sang vient pour le mort**, et ce que le joueur a fait ou non ne
 * l'y regarde pas. **Les autres viennent pour le vivant**, et là tout compte —
 * le lien, le temps qui a passé, la brouille. C'est de cette seconde foule que
 * le système parle.
 */
export function turnout(state: GameState, wake: WakeState): Turnout[] {
  const deceased = state.npcs[wake.whoId];
  if (!deceased) return [];
  const form = getForm(wake.formId ?? DEFAULT_FORM);
  const reach = form?.reach ?? 0;
  const near = form?.near ?? 0;
  const out: Turnout[] = [];

  for (const who of Object.values(state.npcs)) {
    if (!who.alive || who.petSpecies || who.id === deceased.id) continue;

    const rank = npcRank(state, who, deceased);
    const forDeceased = rank <= 4;
    // On vient à l'enterrement de son père même si l'on n'aime pas le neveu
    // qui l'organise, et même si l'on n'a pas parlé au neveu depuis trente ans.
    const kin = KIN_PULL[rank] ?? 0;

    // Et l'on vient pour le vivant, à hauteur de ce qu'on lui doit — ce qui se
    // défait, lui, avec tout ce que le joueur a laissé se défaire.
    const raw = STRANGER_FLOOR + (who.relationship / 100) * FOR_YOU;
    const gap = state.year - who.lastInteractionYear;
    const fade = gap > 0 ? 1 - Math.min(1, gap / FORGOTTEN) * 0.6 : 1;
    const mine = raw * fade * (who.estranged ? ESTRANGED : 1);

    // Ce qui empêche, quel que soit le motif : cela s'applique aux deux foules.
    let stop = 1;
    if (who.age >= FRAIL_AGE || who.stats.health < FRAIL_HEALTH) stop = FRAIL;
    if (who.incarcerated) stop = 0;

    /*
     * Ce que le joueur pouvait obtenir au mieux : la place que cette personne
     * **aurait** eue s'il avait tenu le lien. Elle ne se déduit donc ni du lien
     * actuel ni de la dernière fois qu'on s'est parlé — ce sont précisément les
     * deux choses qu'on lui reproche, et les compter dans le dénominateur les
     * effaçait. Mesuré, cela donnait l'inverse de ce que le système raconte :
     * les vies où tout le monde avait été laissé filer obtenaient 60,6 % de
     * remplissage contre 10,4 % aux autres, parce que les absents étaient
     * sortis du décompte au lieu d'y manquer.
     *
     * La place est donc structurelle : la famille du mort, et le cercle du
     * joueur pris par le rôle, qui, lui, ne se défait pas.
     *
     * Sauf pour qui ne peut pas y être quoi qu'on fasse. Un détenu et un
     * mourant sortent du décompte : ce ne sont pas des absences qu'on aurait
     * pu éviter, et les compter reviendrait à reprocher au joueur d'avoir eu
     * une tante de quatre-vingt-dix ans.
     */
    const structural = forDeceased || CIRCLE.includes(who.relation);
    const potential = structural && stop >= 1 ? 1 : 0;
    let pull = Math.max(kin * near, mine * reach) * stop;

    // Et la seule prise qui reste au joueur ce jour-là.
    if (wake.toldIds.includes(who.id) && !who.incarcerated) pull += TOLD_PULL;

    const comes = pull >= COMES;
    out.push({
      who, pull, potential, comes, forDeceased,
      held: comes ? null : reasonFor(who, { kin, raw, fade, mine, reach, near, stop }, potential > 0),
    });
  }

  return out.sort((a, b) => b.pull - a.pull);
}

/** Ce qui retient quelqu'un, dit en français. */
export function heldLabel(held: Held, who: Person, state: GameState): string {
  switch (held) {
    case 'brouille': return 'Vous ne vous parlez plus.';
    case 'détenu': return 'Il est détenu.';
    case 'oubli': return `Tu ne lui as pas parlé depuis ${Math.max(1, state.year - who.lastInteractionYear)} ans.`;
    case 'grandÂge': return 'Il n’est plus en état de faire le voyage.';
    case 'portée': return 'Il ne sera pas prévenu à temps.';
    case 'lien': return `Ce qu’il vous restait : ${Math.round(who.relationship)} sur 100.`;
    case 'inconnu': return 'Il ne le connaissait pas, et il ne te doit rien.';
    default: return '';
  }
}

/** Ceux qui viendront, tels que les choses se présentent. */
export function coming(state: GameState): Turnout[] {
  const wake = wakeOf(state);
  return wake ? turnout(state, wake).filter((t) => t.comes) : [];
}

/**
 * Ce que vaut l'assemblée, de 0 à 1.
 *
 * Pondéré : la présence de la fille du mort pèse plus que celle d'un collègue.
 * Rapporté à ce qui aurait été possible — un homme qui n'a plus personne de
 * vivant ne rate pas ses obsèques parce qu'il n'y a que quatre chaises.
 */
export function attendance(state: GameState, wake: WakeState): number {
  const all = turnout(state, wake);
  if (all.length === 0) return 0;
  let got = 0;
  let could = 0;
  for (const t of all) {
    /*
     * Le dénominateur est **ce qui serait venu si tout avait été bien fait**,
     * et non tous ceux que le joueur a croisés. Sans cela une vie sociale
     * remplie punit : mesuré, cinquante-trois personnes connues au moment d'un
     * décès, dont l'immense majorité n'avait aucune raison d'être là. Une
     * assemblée ne se juge pas au nombre de gens qui manquent à l'appel d'un
     * appel que personne n'a fait.
     */
    if (t.potential <= 0) continue;
    const weight = t.forDeceased ? 3 : 1;
    could += weight;
    if (t.comes) got += weight;
  }
  return could > 0 ? clamp(got / could, 0, 1) : 0;
}

/* ------------------------------------------------------------------ */
/* Ce qu'on dit                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce sur quoi une phrase s'appuie, dans les faits.
 *
 * Rendu pour l'écran : c'est ce qui s'affiche sous chaque phrase, pour que le
 * joueur puisse choisir en connaissance de cause plutôt qu'au hasard. Le jeu ne
 * dit pas « vrai » ou « faux », il dit ce qu'il sait.
 */
export function evidence(state: GameState, who: Person, claim: string): string {
  const gap = Math.max(0, state.year - who.lastInteractionYear);
  switch (claim) {
    case 'présence':
      return gap <= 1 ? 'Vous vous êtes parlé cette année.' : `Vous ne vous étiez pas parlé depuis ${gap} ans.`;
    case 'silence':
      return who.estranged ? 'Vous aviez coupé les ponts.'
        : gap >= 6 ? `${gap} ans sans un mot.` : 'Vous vous parliez encore.';
    case 'durée': {
      const known = Math.max(0, state.year - who.metYear);
      return `Tu l’as connu ${known} ans.`;
    }
    case 'rancune':
      return `Ce qu’il pensait de toi : ${Math.round(who.opinion)} sur 100.`;
    case 'œuvre':
      return who.jobTitle ? `${who.jobTitle}, toute sa vie.` : 'Il n’a jamais eu de métier à lui.';
    default:
      return 'C’est vrai de tout le monde.';
  }
}

/** La phrase tient-elle ? */
export function holds(state: GameState, who: Person, claim: string): boolean {
  const gap = Math.max(0, state.year - who.lastInteractionYear);
  switch (claim) {
    /*
     * Trente, et non quarante-cinq : sur l'échelle réelle du jeu, un
     * grand-parent est à 33 et un parent à 40 — mesuré sur soixante vies. À
     * quarante-cinq, « tu étais là » était faux pour la moitié des gens qu'on
     * enterre, y compris ceux qu'on avait vus l'année même.
     */
    case 'présence': return gap <= 2 && who.relationship >= 30;
    case 'silence': return who.estranged || gap >= 6;
    case 'durée': return state.year - who.metYear >= 15;
    case 'rancune': return who.opinion < 45;
    case 'œuvre': return Boolean(who.jobTitle) && who.wealth > 0;
    default: return true;
  }
}

/** Ceux qui sauraient si la phrase était creuse : la famille du défunt. */
function knewHim(state: GameState, wake: WakeState): Person[] {
  return turnout(state, wake).filter((t) => t.comes && t.forDeceased).map((t) => t.who);
}

/* ------------------------------------------------------------------ */
/* Ouvrir                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ouvre des obsèques au décès d'un proche.
 *
 * Appelé par `inheritance.ts#handleRelativeDeath`, qui garde tout le reste :
 * l'héritage, le choc, la ligne du journal. Ce système ne remplace rien, il
 * ajoute ce qui manquait entre les deux — la journée elle-même.
 *
 * **Une seule à la fois.** Deux parents qui meurent la même année ne font pas
 * deux écrans : le premier tient, le second passe sans qu'on s'en occupe. C'est
 * dur et c'est juste — on n'est à deux endroits ni ce jour-là ni jamais.
 */
export function openWake(ctx: Ctx, deceased: Person): void {
  const { state } = ctx;
  if (!MOURNED.includes(deceased.relation)) return;
  if (wakeOf(state)) return;
  state.player.wake = {
    whoId: deceased.id,
    year: state.year,
    formId: null,
    ours: arrangedByUs(state, deceased),
    speaker: 'personne',
    speakerId: null,
    wordId: null,
    toldIds: [],
    done: false,
  };
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

export function setForm(ctx: Ctx, formId: string): ActionResult {
  const wake = wakeOf(ctx.state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à organiser.' };
  if (!wake.ours) return { ok: false, message: 'Ce n’est pas toi qui t’en occupes.' };
  if (!getForm(formId)) return { ok: false, message: 'Cela ne se fait pas.' };
  wake.formId = formId;
  return { ok: true, message: getForm(formId)!.line };
}

export function setWord(ctx: Ctx, wordId: string): ActionResult {
  const wake = wakeOf(ctx.state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à dire.' };
  if (!getWord(wordId)) return { ok: false, message: 'Cela ne se dit pas.' };
  wake.wordId = wordId;
  wake.speaker = 'toi';
  wake.speakerId = null;
  return { ok: true, message: 'Tu prendras la parole.' };
}

/**
 * Laisser la parole à quelqu'un d'autre.
 *
 * Ce n'est pas un renoncement : celui qui parle à notre place parle de ce
 * qu'**il** savait, et s'il était plus proche du mort que nous, cela vaut mieux
 * que la meilleure phrase qu'on aurait trouvée. Le prix est de n'avoir rien dit
 * soi-même.
 */
export function letSpeak(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const wake = wakeOf(state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à dire.' };
  const who = person(state, personId);
  if (!who || !who.alive) return { ok: false, message: 'Il n’est pas là.' };
  if (!turnout(state, wake).some((t) => t.who.id === personId && t.comes)) {
    return { ok: false, message: 'Il ne sera pas là.' };
  }
  wake.speaker = 'autre';
  wake.speakerId = personId;
  wake.wordId = null;
  return { ok: true, message: `${who.firstName} parlera.` };
}

export function saySilence(ctx: Ctx): ActionResult {
  const wake = wakeOf(ctx.state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à dire.' };
  wake.speaker = 'personne';
  wake.speakerId = null;
  wake.wordId = null;
  return { ok: true, message: 'Personne ne parlera.' };
}

export function tellBlocker(state: GameState, personId: string): string | null {
  const wake = wakeOf(state);
  if (!wake) return 'Il n’y a rien à annoncer.';
  if (wake.toldIds.includes(personId)) return null;
  if (wake.toldIds.length >= TELLS) return `Tu n’as le temps que d’en prévenir ${TELLS}.`;
  const who = state.npcs[personId];
  if (!who?.alive) return 'Il n’est plus là.';
  if (who.incarcerated) return 'Il est détenu ; il ne pourra pas venir.';
  return null;
}

/**
 * Aller le dire soi-même.
 *
 * La seule chose qu'on puisse encore changer ce jour-là, et elle est bornée à
 * trois personnes. Tout le reste — qui a envie de venir — a été décidé pendant
 * les quarante années d'avant.
 */
export function tell(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const wake = wakeOf(state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à annoncer.' };
  const who = person(state, personId);
  if (!who) return { ok: false, message: 'Il n’est plus là.' };
  if (wake.toldIds.includes(personId)) {
    wake.toldIds = wake.toldIds.filter((id) => id !== personId);
    return { ok: true, message: `Tu ne passeras pas chez ${who.firstName}.` };
  }
  const why = tellBlocker(state, personId);
  if (why) return { ok: false, message: why };
  wake.toldIds.push(personId);
  return { ok: true, message: `Tu iras le dire à ${who.firstName} toi-même.` };
}

/* ------------------------------------------------------------------ */
/* Le jour                                                             */
/* ------------------------------------------------------------------ */

export function holdBlocker(state: GameState): string | null {
  const wake = wakeOf(state);
  if (!wake) return 'Il n’y a rien à tenir.';
  if (wake.ours && !wake.formId) return 'Il faut décider de ce qu’on organise.';
  const cost = costOf(state);
  if (cost > state.player.money) return 'Tu n’as pas de quoi.';
  return null;
}

/**
 * Le jour même.
 *
 * Tout ce qui suit est déterminé : l'assemblée est celle que `turnout` calcule,
 * la phrase tient ou ne tient pas selon `holds`, et le prix est le prix. Aucun
 * tirage n'entre ici — c'est la promesse du système, et son test l'assure sur
 * le corps de cette fonction.
 */
export function hold(ctx: Ctx, forced = false): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const wake = wakeOf(state);
  if (!wake) return { ok: false, message: 'Il n’y a rien à tenir.' };
  const deceased = state.npcs[wake.whoId];
  if (!deceased) { wake.done = true; return { ok: false, message: 'Il n’y a plus personne.' }; }
  if (!forced) {
    const why = holdBlocker(state);
    if (why) return { ok: false, message: why };
  }
  if (wake.ours && !wake.formId) wake.formId = DEFAULT_FORM;

  const cost = costOf(state);
  const paid = Math.min(cost, Math.max(0, p.money));
  p.money -= paid;

  const came = turnout(state, wake).filter((t) => t.comes);
  const filled = attendance(state, wake);
  const kin = knewHim(state, wake);

  const lines: string[] = [];
  const form = getForm(wake.formId ?? DEFAULT_FORM);
  lines.push(
    came.length === 0
      ? `Personne n’est venu. Tu as enterré ${fullName(deceased)} seul.`
      : `${came.length} personne${came.length > 1 ? 's sont venues' : ' est venue'}.`,
  );

  // Ce que la journée laisse au joueur : la salle pleine console, la salle
  // vide reste. Les deux sont proportionnés à ce qui aurait pu être là.
  const joy = Math.round(HELD_JOY * filled - EMPTY_STING * (1 - filled));
  p.stats.happiness = clampStat(p.stats.happiness + joy);
  p.stats.stress = clampStat(p.stats.stress - joy * 0.5);

  // Ce qu'on a dit, et devant qui.
  if (wake.speaker === 'toi' && wake.wordId) {
    const word = getWord(wake.wordId)!;
    const true_ = holds(state, deceased, word.claim);
    lines.push(true_ ? word.line : word.hollow);
    const move = true_ ? TRUE_WORD : -HOLLOW_WORD;
    for (const who of kin) {
      who.opinion = clampStat(who.opinion + move);
      who.relationship = clampStat(who.relationship + move * 0.5);
    }
  } else if (wake.speaker === 'autre' && wake.speakerId) {
    const speaker = state.npcs[wake.speakerId];
    if (speaker) {
      lines.push(`${speaker.firstName} a parlé à ta place, et l’a mieux fait que tu ne l’aurais fait.`);
      speaker.opinion = clampStat(speaker.opinion + TRUE_WORD);
      speaker.relationship = clampStat(speaker.relationship + TRUE_WORD);
    }
  } else if (came.length > 0) {
    lines.push('Personne n’a rien dit. Le silence a duré ce qu’il fallait.');
  }

  // Et ce que la famille retient de ce qu'on a organisé — ou pas.
  if (wake.ours && wake.formId === 'rien') {
    for (const who of kin) who.opinion = clampStat(who.opinion - NOTHING_HELD);
    // Ceux qui ne sont pas venus l'apprennent tout de même.
    for (const t of turnout(state, wake)) {
      if (!t.comes && t.forDeceased) t.who.opinion = clampStat(t.who.opinion - NOTHING_HELD);
    }
    lines.push('Il n’y a pas eu de jour. La famille s’en souviendra de celui-là.');
  }

  /*
   * Ce que la journée laisse d'écrit. Elle va dans l'histoire du défunt, qui
   * reste lisible sur sa fiche : c'est le seul endroit où l'assemblée survit à
   * la journée. Une première version rangeait la liste des présents dans l'état
   * de la scène — un champ écrit, jamais relu, effacé avec la scène.
   */
  const named = came.slice(0, 3).map((t) => t.who.firstName);
  const rest = came.length - named.length;
  noteHistory(state, deceased, [
    form ? `Obsèques : ${form.label.toLowerCase()}.` : 'Obsèques.',
    came.length === 0
      ? 'Personne n’est venu.'
      : `${named.join(', ')}${rest > 0 ? ` et ${rest} autre${rest > 1 ? 's' : ''}` : ''} étai${came.length > 1 ? 'ent' : 't'} là.`,
  ].join(' '));
  wake.done = true;

  const text = lines.join(' ');
  ctx.log('death', `${fullName(deceased)} — ${text}`, filled >= 0.6 ? 'neutral' : 'bad');
  return {
    ok: true,
    title: fullName(deceased),
    message: paid > 0 ? `${text} Cela t’a coûté ${paid}.` : text,
    tone: filled >= 0.6 ? 'neutral' : 'bad',
  };
}

/**
 * Ce qui se passe si l'on n'a rien fait.
 *
 * Le jour a lieu quand même. La famille organise au plus court, personne ne
 * parle, et le joueur y est sans y avoir été — ce qui est exactement l'ancien
 * comportement du jeu, gardé comme le cas où l'on ne s'en occupe pas. Ne rien
 * faire n'est donc pas puni ; c'est seulement moins que ce qu'on aurait pu.
 */
export function advanceWake(ctx: Ctx): void {
  const { state } = ctx;
  const wake = wakeOf(state);
  if (!wake) return;
  if (state.year <= wake.year) return;
  if (!wake.formId) wake.formId = DEFAULT_FORM;
  hold(ctx, true);
}

/* ------------------------------------------------------------------ */
/* Ce qui se lit sur la ligne d'accueil                                */
/* ------------------------------------------------------------------ */

export function summary(state: GameState): string {
  const wake = wakeOf(state);
  const who = mourned(state);
  if (!wake || !who) return '';
  const n = coming(state).length;
  if (wake.ours && !wake.formId) return `${who.firstName} — rien n’est décidé.`;
  return `${who.firstName} — ${n} personne${n > 1 ? 's viendraient' : ' viendrait'}.`;
}

export { TELLS };
