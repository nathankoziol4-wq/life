/**
 * Savoir d'où l'on vient.
 *
 * **Ce que ce fichier répare, mesuré et non supposé.** `FamilyStructure`
 * compte sept valeurs. Deux d'entre elles — « adoption » et « famille
 * d'accueil » — existaient dans le type, dans `household.ts#rolesFor`, dans la
 * table de pénalités d'ambiance et sur l'écran de création. Elles faisaient
 * exactement trois choses : renommer les parents, ajouter une pénalité, et
 * s'afficher. Le personnage n'apprenait jamais qu'il avait été adopté, aucun
 * parent biologique n'existait nulle part, et il n'y avait rien à chercher.
 *
 * Pire : sur quatre cents naissances aléatoires, **aucune** ne tombait sur ces
 * structures. Quatre enfances sur sept n'arrivaient qu'à qui les composait à
 * la main. C'est corrigé dans `data/originPresets.ts` ; ce fichier-ci s'occupe
 * de ce qui se passe ensuite.
 *
 * Quatre règles, et chacune existe pour qu'il y ait une décision.
 *
 * **1. On ne le sait pas d'emblée, et la façon dont on l'apprend compte.** Un
 * foyer qui parle le dit tôt et bien ; un foyer fermé laisse la chose sortir
 * seule — par un papier, par une remarque — et cela coûte, au moral comme au
 * lien. Le joueur ne choisit pas ce moment : il le subit, comme un enfant.
 *
 * **2. Chercher se paie de deux monnaies.** L'argent, et ceux qui vous ont
 * élevé. La piste la moins chère du catalogue est celle qui les blesse le
 * plus, la plus solide n'ouvre qu'à la majorité, et une tension trop haute les
 * fait se fermer pour de bon. Une piste par an : chercher prend du temps.
 *
 * **3. Ce qu'on achète n'est pas un meilleur résultat, c'est le droit de
 * renoncer.** Qui ils sont est fixé à la naissance ; des pistes solides
 * finissent par le révéler **avant** qu'on y aille. Un joueur bien renseigné
 * évite une mauvaise rencontre — mais rien n'empêche jamais d'arriver trop
 * tard, parce que cela, personne ne peut le savoir d'avance.
 *
 * **4. Renoncer est une vraie option.** `letGo` existe et rapporte quelque
 * chose : la paix. Un système où ne pas jouer est toujours perdant n'offre pas
 * de choix, il offre une corvée — et une vie sur quatre trouve mieux en
 * s'arrêtant qu'en continuant.
 *
 * Rien ici ne décrit de démarche réelle : un « registre », un « organisme »,
 * un « service de recherche » sont des noms de jeu, et ce qu'ils rendent est
 * un nombre.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { FOUND_TRAIL } from '../data/birth.ts';
import { fullName } from '../engine/context.ts';
import type { ActionResult, GameState, Person, RootsState } from '../engine/types.ts';
import {
  CLEAR, CLOSED, COOLS, ENOUGH, HALF_GONE, LEADS, PER_YEAR, REFUSES, WELCOMES,
  getLead, type Lead,
} from '../data/roots.ts';
import { getCountry } from '../data/countries.ts';
import { createPerson, noteHistory } from './npc.ts';
import { shiftStats } from './stats.ts';

export { LEADS, getLead };
export type { Lead };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** L'état de la question, ou `null` si elle ne se pose pas dans cette vie. */
export function rootsOf(state: GameState): RootsState | null {
  return state.player.roots;
}

/** Sait-on qu'on vient d'ailleurs ? */
export function knows(state: GameState): boolean {
  return rootsOf(state)?.knownYear !== null && rootsOf(state) !== null;
}

/** La recherche est-elle close, d'une façon ou d'une autre ? */
export function settled(state: GameState): boolean {
  const roots = rootsOf(state);
  return roots !== null && roots.outcome !== null;
}

/** Ceux qui t'élèvent — au sens du foyer, quel que soit le lien affiché. */
export function raisedBy(state: GameState): Person[] {
  return state.player.origin.parents
    .map((r) => state.npcs[r.personId])
    .filter((x): x is Person => Boolean(x?.alive));
}

/**
 * Une empreinte de la graine, stable et sans coût.
 *
 * Reprise de `systems/skills.ts#seedDraw`, et pour la même raison : tirer la
 * disposition au berceau décalerait la séquence aléatoire de toutes les vies,
 * et ferait dépendre ce qu'on trouvera de l'ordre dans lequel on a regardé les
 * choses.
 */
function seedDraw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Qui elle est, décidé à la naissance et jamais retiré.
 *
 * De 0 à 1 : au-dessus de `WELCOMES` elle t'attendait, en dessous de `REFUSES`
 * ce que tu apprendras ne te plaira pas, entre les deux la porte reste fermée.
 * Fixe pour une graine donnée — donc une piste solide peut le révéler à
 * l'avance sans mentir, et relancer la recherche ne change rien.
 */
export function disposition(state: GameState): number {
  return seedDraw(state.seed, 7717);
}

/** Ce que la piste rassemblée permet de deviner, ou `null`. */
export function whatYouKnow(state: GameState): 'accueil' | 'refus' | 'dur' | null {
  const roots = rootsOf(state);
  if (!roots || roots.soundness < CLEAR || roots.trail < ENOUGH * 0.6) return null;
  const d = disposition(state);
  return d >= WELCOMES ? 'accueil' : d >= REFUSES ? 'refus' : 'dur';
}

/** Peut-on aller voir ? */
export function canGo(state: GameState): boolean {
  const roots = rootsOf(state);
  return roots !== null && roots.knownYear !== null
    && roots.outcome === null && roots.trail >= ENOUGH;
}

/** Se sont-ils fermés ? */
export function closedOff(state: GameState): boolean {
  return (rootsOf(state)?.strain ?? 0) >= CLOSED;
}

/** Combien de pistes il reste à suivre cette année. */
export function leftThisYear(state: GameState): number {
  return Math.max(0, PER_YEAR - Number(state.player.yearActions.roots ?? 0));
}

/** Ce qu'une piste coûte ici. */
export function priceOf(state: GameState, lead: Lead): number {
  const country = getCountry(state.player.countryId);
  return Math.round(lead.cost * country.costIndex * state.world.inflation);
}

/* ------------------------------------------------------------------ */
/* Le point de départ                                                  */
/* ------------------------------------------------------------------ */

/**
 * Poser la question, si elle se pose.
 *
 * Appelé une fois, à la construction de la vie, après le foyer : il faut la
 * structure familiale pour savoir s'il y a lieu.
 */
export function seedRoots(state: GameState): void {
  const structure = state.player.origin.structure;
  if (structure !== 'adoption' && structure !== 'famille d’accueil') {
    state.player.roots = null;
    return;
  }
  state.player.roots = {
    how: structure === 'adoption' ? 'adoption' : 'accueil',
    knownYear: null,
    toldBy: null,
    tried: [],
    trail: 0,
    soundness: 0,
    strain: 0,
    outcome: null,
    metYear: null,
  };
}

/* ------------------------------------------------------------------ */
/* L'apprendre                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ce que le foyer sait dire.
 *
 * La moyenne de communication des adultes qui vous élèvent, telle qu'elle est
 * déjà calculée pour tout le reste de l'enfance. Un foyer qui parle le dit
 * tôt ; un foyer fermé ne le dit pas, et la chose finit par sortir seule.
 */
function openness(state: GameState): number {
  const parents = state.player.origin.parents;
  if (parents.length === 0) return 40;
  return parents.reduce((s, r) => s + r.style.communication, 0) / parents.length;
}

/**
 * L'apprendre — et de quelle manière.
 *
 * Un enfant placé le sait forcément très tôt : il a vu les adultes changer.
 * Un enfant adopté peut l'ignorer longtemps, et c'est là que la manière
 * compte. Trois façons, et deux d'entre elles font mal.
 */
function tellingChance(state: GameState): number {
  const p = state.player;
  const roots = p.roots;
  if (!roots) return 0;
  // Un placement ne se cache pas : on a changé de maison.
  if (roots.how === 'accueil') return p.age >= 5 ? 1 : 0.35;
  const open = openness(state);
  // Rien avant quatre ans : ce n'est pas une conversation qu'on a avec un
  // enfant de deux ans, et le jeu n'a rien à en faire.
  if (p.age < 4) return 0;
  // Un foyer qui parle le dit entre six et dix ans ; un foyer fermé laisse la
  // chose traîner, et elle sort d'elle-même à l'adolescence ou plus tard.
  return clamp((open - 30) / 260 + (p.age - 4) * 0.035, 0.02, 0.9);
}

/** Poser l'apprentissage, avec ce qu'il coûte selon la manière. */
function learnIt(ctx: Ctx, how: 'parents' | 'hasard' | 'proche'): void {
  const { state } = ctx;
  const roots = state.player.roots;
  if (!roots || roots.knownYear !== null) return;
  roots.knownYear = state.year;
  roots.toldBy = how;

  if (how === 'parents') {
    ctx.log('life',
      roots.how === 'accueil'
        ? 'On t’a expliqué, avec des mots d’adulte, pourquoi tu vis ici.'
        : 'Ils te l’ont dit eux-mêmes, un soir, sans que tu aies rien demandé : tu as été adopté.',
      'neutral');
    shiftStats(state, { happiness: -4, stress: 5 });
    return;
  }

  /*
   * L'apprendre autrement coûte davantage, et cela ne tient pas à la nouvelle
   * : cela tient à ce qu'on l'a cachée. C'est le lien avec ceux qui vous ont
   * élevé qui paie, et il ne se répare pas tout seul.
   */
  shiftStats(state, { happiness: -12, stress: 14 });
  for (const parent of raisedBy(state)) {
    parent.relationship = clamp(parent.relationship - 14, 0, 100);
    noteHistory(state, parent, 'Tu as appris par toi-même ce qu’ils ne t’avaient pas dit.');
  }
  ctx.log('life',
    how === 'hasard'
      ? 'Un papier au fond d’un tiroir, et tout ce que tu croyais savoir de ta naissance change de forme.'
      : 'Une phrase de trop chez quelqu’un de la famille, et tu apprends de travers ce qu’on aurait dû te dire.',
    'bad');
}

/* ------------------------------------------------------------------ */
/* Chercher                                                            */
/* ------------------------------------------------------------------ */

/** Les pistes ouvertes à cet âge. */
export function availableLeads(state: GameState): Lead[] {
  return LEADS.filter((lead) => state.player.age >= lead.from);
}

/** Ce qui empêche de suivre cette piste, ou rien. */
export function leadBlocker(state: GameState, id: string): string | null {
  const lead = getLead(id);
  if (!lead) return 'Rien de tel.';
  const roots = rootsOf(state);
  if (!roots) return 'Cette question ne se pose pas pour toi.';
  if (roots.knownYear === null) return 'Tu ne cherches rien.';
  if (roots.outcome !== null) return 'C’est derrière toi.';
  const p = state.player;
  if (p.age < lead.from) return `Pas avant ${lead.from} ans.`;
  if (lead.once && roots.tried.includes(id)) return 'Tu n’as eu qu’une demande, et tu l’as faite.';
  if (leftThisYear(state) <= 0) return 'Une piste par an : le reste, c’est de l’attente.';
  if (lead.needs === 'foyer') {
    if (raisedBy(state).length === 0) return 'Il n’y a plus personne à qui demander.';
    if (closedOff(state)) return 'Tu as trop insisté. Ils se sont fermés.';
  }
  // Un tiroir ne se ferme pas parce qu'ils ne te parlent plus : il faut une
  // maison, pas leur accord. C'est ce qui laisse une sortie à qui a tout brûlé.
  if (lead.needs === 'maison' && p.age > 24 && raisedBy(state).length === 0) {
    return 'Cette maison n’existe plus.';
  }
  if (lead.needs === 'famille' && relativesWhoKnew(state).length === 0) {
    return 'Personne de la famille ne reste pour en parler.';
  }
  const price = priceOf(state, lead);
  if (p.money < price) return `Il te faudrait ${price.toLocaleString('fr-FR')} $.`;
  return null;
}

/** Les parents éloignés qui pourraient savoir. */
export function relativesWhoKnew(state: GameState): Person[] {
  return Object.values(state.npcs).filter(
    (n) => n.alive && ['aunt', 'uncle', 'grandmother', 'grandfather', 'cousin'].includes(n.relation),
  );
}

/**
 * Les chances que cette piste donne quelque chose.
 *
 * Exposées, et l'écran les affiche : décider de fouiller un tiroir à 38 %
 * est une décision, s'apercevoir après coup que c'était sans espoir n'en est
 * pas une. Deux choses les modulent — ce qu'on a déjà (les dernières pistes
 * sont les plus dures) et, pour ce qui passe par le foyer, la tension qu'on y
 * a mise.
 */
export function leadOdds(state: GameState, id: string): number {
  const lead = getLead(id);
  const roots = rootsOf(state);
  if (!lead || !roots) return 0;
  // Ce qu'il reste à trouver : les derniers points coûtent plus cher que les
  // premiers, sinon la recherche serait une formalité à répétition. Le
  // coefficient était 0,45 et il faisait durer la recherche vingt ans en
  // médiane — une vie entière à cliquer une ligne par an, ce qui n'est pas
  // une décision mais une file d'attente.
  const room = 1 - (roots.trail / ENOUGH) * 0.25;
  const strained = lead.needs === 'foyer' ? 1 - (roots.strain / 100) * 0.7 : 1;
  /*
   * Ce qu'on a déjà tiré de cette piste-là. Elle s'épuise — sinon il suffirait
   * de cliquer la même ligne chaque année — mais **elle ne s'épuise pas
   * indéfiniment.** Sans le plafond de six, le coefficient descendait à 4 % au
   * bout de vingt tentatives : mesuré, un personnage qui n'avait qu'une seule
   * avenue ouverte cliquait la même ligne cinquante-cinq années de suite pour
   * atteindre 56 points sur cent, et mourait dessus. Une ligne qu'on peut
   * appuyer et qui ne peut plus rien rendre est un piège, pas une difficulté.
   */
  const already = Math.min(6, roots.tried.filter((x) => x === id).length);
  /*
   * L'enfant trouvé cherche plus mal, et pour une raison précise : les autres
   * partent d'un dossier. Une adoption a une administration, un placement a un
   * service et des gens qui ont signé. Personne ne sait de qui est né un
   * enfant trouvé, et il n'y a donc rien à demander — chaque piste rend moins.
   * C'est la seule différence entre les trois manières d'être arrivé, et elle
   * suffit : le reste du système fonctionne à l'identique.
   */
  const start = roots.how === 'trouvé' ? FOUND_TRAIL : 1;
  return clamp(lead.odds * room * strained * start * 0.9 ** already, 0.08, 0.95);
}

/** Suivre une piste. */
export function follow(ctx: Ctx, id: string): ActionResult {
  const { state, rng } = ctx;
  const lead = getLead(id);
  if (!lead) return { ok: false, message: 'Rien de tel.' };
  const why = leadBlocker(state, id);
  if (why) return { ok: false, title: lead.label, message: why };

  const p = state.player;
  const roots = p.roots!;
  p.money -= priceOf(state, lead);
  p.yearActions.roots = Number(p.yearActions.roots ?? 0) + 1;
  roots.tried.push(id);

  // Ce que ça coûte à ceux qui t'ont élevé — que ça donne quelque chose ou
  // non. C'est ce qui empêche de tout essayer dans l'ordre.
  if (lead.strain > 0) {
    roots.strain = clamp(roots.strain + lead.strain, 0, 100);
    for (const parent of raisedBy(state)) {
      parent.relationship = clamp(parent.relationship - lead.strain * 0.35, 0, 100);
    }
  }

  if (!rng.chance(leadOdds(state, id))) {
    return {
      ok: true,
      title: lead.label,
      tone: 'bad',
      message: id === 'registre'
        ? 'Le dossier est scellé. Il n’y aura pas de seconde demande.'
        : 'Rien. Une année de plus, et toujours le même trou à la place.',
    };
  }

  const gain = rng.int(lead.gives[0], lead.gives[1]);
  const before = roots.trail;
  // La solidité est une moyenne pondérée par ce que chaque piste a apporté :
  // deux tiroirs fouillés ne valent pas un dossier, et le mélange se voit.
  roots.soundness = (roots.soundness * before + lead.soundness * gain)
    / Math.max(1, before + gain);
  roots.trail = Math.min(ENOUGH, before + gain);

  const full = roots.trail >= ENOUGH;
  return {
    ok: true,
    title: lead.label,
    tone: 'good',
    message: full
      ? 'Tu as de quoi la retrouver. Reste à décider si tu y vas.'
      : `Un nom, une ville, une date. Tu avances (${Math.round(roots.trail)} sur ${ENOUGH}).`,
  };
}

/* ------------------------------------------------------------------ */
/* Y aller, ou pas                                                     */
/* ------------------------------------------------------------------ */

/** Sont-ils encore là ? Se joue le jour où l'on y va, jamais avant. */
function stillThere(state: GameState, rng: Ctx['rng']): boolean {
  // La chance tombe avec l'âge : à vingt ans on les trouve presque toujours,
  // à `HALF_GONE` une fois sur deux, et très rarement passé quatre-vingts.
  const odds = clamp(1 - (state.player.age / HALF_GONE) ** 2 * 0.5, 0.06, 0.97);
  return rng.chance(odds);
}

/** Aller voir. Une fois, sans retour. */
export function goAndSee(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const roots = state.player.roots;
  if (!roots) return { ok: false, message: 'Cette question ne se pose pas pour toi.' };
  if (roots.outcome !== null) return { ok: false, message: 'C’est derrière toi.' };
  if (!canGo(state)) {
    return { ok: false, title: 'Y aller', message: `Il te manque des éléments (${Math.round(roots.trail)} sur ${ENOUGH}).` };
  }

  roots.metYear = state.year;
  const d = disposition(state);
  const here = stillThere(state, rng);
  const outcome = !here ? 'tard' : d >= WELCOMES ? 'accueil' : d >= REFUSES ? 'refus' : 'dur';
  roots.outcome = outcome;

  const sex = rng.chance(0.72) ? 'F' : 'M';
  const parentAge = state.player.age + rng.int(19, 34);

  if (outcome === 'tard') {
    /*
     * La seule issue que rien ne permet d'éviter, et c'est voulu : on peut
     * savoir qui elle est, jamais si elle sera encore là. Il reste ce qu'elle
     * a laissé — des gens qui portent la moitié de vous et ne vous ont jamais
     * vu.
     */
    const count = rng.int(0, 2);
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const sib = createPerson(ctx, {
        relation: rng.chance(0.5) ? 'brother' : 'sister',
        age: state.player.age + rng.int(-9, 9),
        relationship: rng.int(28, 52),
        opinion: rng.int(30, 58),
      });
      names.push(sib.firstName);
    }
    shiftStats(state, { happiness: -9, stress: 8 });
    ctx.log('life',
      count > 0
        ? `Elle est morte il y a des années. Tu rencontres ${names.join(' et ')} — la moitié de toi, chez des inconnus.`
        : 'Elle est morte il y a des années. Tu arrives dans une maison où plus personne ne t’attendait.',
      'bad');
    return {
      ok: true,
      title: 'Trop tard',
      tone: 'bad',
      message: count > 0
        ? `Quelques années de trop. Il reste ${names.join(' et ')}, qui ne savaient pas que tu existais.`
        : 'Quelques années de trop, et une adresse où il n’y a plus personne.',
    };
  }

  const birth = createPerson(ctx, {
    relation: sex === 'F' ? 'birthMother' : 'birthFather',
    sex,
    age: parentAge,
    relationship: outcome === 'accueil' ? rng.int(52, 74) : rng.int(6, 22),
    opinion: outcome === 'accueil' ? rng.int(60, 88) : rng.int(8, 30),
    withJob: true,
  });

  if (outcome === 'accueil') {
    shiftStats(state, { happiness: 16, stress: -10 });
    noteHistory(state, birth, 'Tu l’as retrouvée, et elle t’a ouvert la porte.');
    ctx.log('life', `Tu retrouves ${fullName(birth)}. Elle t’attendait sans y croire.`, 'good');
    return {
      ok: true,
      title: fullName(birth),
      tone: 'good',
      message: 'Elle t’attendait sans oser l’espérer. Il y a des années à rattraper, et vous avez le temps.',
    };
  }

  if (outcome === 'refus') {
    birth.estranged = true;
    shiftStats(state, { happiness: -14, stress: 16 });
    noteHistory(state, birth, 'Tu l’as retrouvée. Elle n’a pas voulu.');
    ctx.log('life', `Tu retrouves ${fullName(birth)}. Elle ne veut pas te connaître.`, 'bad');
    return {
      ok: true,
      title: fullName(birth),
      tone: 'bad',
      message: 'Tu sais son nom, sa ville, son visage. Elle ne veut rien de tout cela. C’est fini, et tu le sais maintenant.',
    };
  }

  birth.estranged = true;
  shiftStats(state, { happiness: -20, stress: 22 });
  noteHistory(state, birth, 'Tu as appris pourquoi. Tu aurais préféré ne pas.');
  ctx.log('life', `Tu retrouves ${fullName(birth)}, et tu apprends pourquoi tu es parti.`, 'bad');
  return {
    ok: true,
    title: fullName(birth),
    tone: 'bad',
    message: 'Tu voulais une raison. Tu en as une, et elle ne t’aide pas. Il y a des questions dont la réponse ne répare rien.',
  };
}

/**
 * Renoncer.
 *
 * **Ce qui empêche le système d'être une corvée.** Un joueur qui s'arrête doit
 * gagner quelque chose, sinon « ne pas chercher » n'est pas un choix mais un
 * contenu manqué. Ici, s'arrêter rend au foyer ce que la recherche lui avait
 * pris, et pose quelque chose : on cesse d'attendre une réponse.
 *
 * Et c'est définitif. Une décision qu'on peut défaire n'en est pas une.
 */
export function letGo(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const roots = state.player.roots;
  if (!roots) return { ok: false, message: 'Cette question ne se pose pas pour toi.' };
  if (roots.knownYear === null) return { ok: false, message: 'Tu ne cherches rien.' };
  if (roots.outcome !== null) return { ok: false, message: 'C’est déjà derrière toi.' };

  roots.outcome = 'refus';
  roots.metYear = state.year;
  // On marque que c'est un renoncement et non une porte fermée : les deux
  // referment la recherche, ils ne racontent pas la même vie.
  state.player.flags.rootsLetGo = state.year;

  const repaired = Math.min(roots.strain, 26);
  roots.strain = clamp(roots.strain - repaired, 0, 100);
  for (const parent of raisedBy(state)) {
    parent.relationship = clamp(parent.relationship + repaired * 0.4, 0, 100);
    noteHistory(state, parent, 'Tu as cessé de chercher ailleurs.');
  }
  shiftStats(state, { happiness: 8, stress: -12 });
  ctx.log('life', 'Tu arrêtes de chercher. Ceux qui t’ont élevé sont ceux que tu as.', 'good');
  return {
    ok: true,
    title: 'Laisser tomber',
    tone: 'good',
    message: 'Tu ne sauras pas. Ce que tu récupères, c’est le reste de ta vie sans cette question dedans.',
  };
}

/** A-t-on renoncé, plutôt que s'être heurté à une porte ? */
export function letGoYear(state: GameState): number | null {
  const year = state.player.flags.rootsLetGo;
  return year === undefined ? null : Number(year);
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

export function advanceRoots(ctx: Ctx): void {
  const { state, rng } = ctx;
  const roots = state.player.roots;
  if (!roots) return;

  /*
   * Ce que la recherche pèse sur le foyer, chaque année où elle dure.
   *
   * **Mesuré avant : le coup ponctuel ne se voyait pas.** Une demande retirait
   * neuf points de lien, que la dérive annuelle rendait en deux ans ; au plus
   * bas, un enfant qui avait harcelé ses parents pendant vingt ans finissait à
   * 21 de lien contre 29 pour un enfant qui n'avait jamais rien demandé. Huit
   * points d'écart pour la règle centrale du système : elle était décorative.
   *
   * Une tension n'est pas un coup, c'est un état — tant qu'ils savent que vous
   * cherchez, le lien ne remonte pas. D'où une pression continue, tant que la
   * recherche dure, qui s'arrête le jour où elle se referme.
   */
  if (roots.outcome === null && roots.strain > 0) {
    for (const parent of raisedBy(state)) {
      parent.relationship = clamp(parent.relationship - roots.strain * 0.1, 0, 100);
    }
  }

  // La tension retombe quand on les laisse tranquilles. Lentement : une
  // question posée trois fois ne s'oublie pas en un an.
  if (Number(state.player.yearActions.roots ?? 0) === 0) {
    roots.strain = clamp(roots.strain - COOLS, 0, 100);
  }

  if (roots.knownYear !== null) return;

  if (rng.chance(tellingChance(state))) {
    /*
     * Qui le dit dépend du foyer. Un foyer qui communique le dit lui-même ; un
     * foyer fermé ne dit rien, et alors c'est un papier ou quelqu'un de la
     * famille qui s'en charge — mal.
     */
    const open = openness(state);
    const how = rng.chance(clamp(open / 100, 0.1, 0.9))
      ? 'parents'
      : rng.chance(0.55) ? 'hasard' : 'proche';
    learnIt(ctx, how);
  } else if (state.player.age >= 25) {
    // Passé un certain âge, la chose finit toujours par sortir. Une vie
    // entière sans jamais l'apprendre priverait le joueur du système entier
    // sans qu'aucune décision n'ait été prise.
    learnIt(ctx, 'hasard');
  }
}

/** Ce qu'on peut en dire en une ligne, pour le menu. */
export function summary(state: GameState): string {
  const roots = rootsOf(state);
  if (!roots) return '';
  if (roots.knownYear === null) return 'Rien à en dire pour l’instant.';
  if (roots.outcome !== null) {
    if (letGoYear(state) !== null) return 'Tu as arrêté de chercher. Ça tient.';
    return {
      accueil: 'Tu l’as retrouvée, et elle t’a ouvert la porte.',
      refus: 'Tu sais qui elle est. Elle n’a pas voulu.',
      tard: 'Tu es arrivé quelques années trop tard.',
      dur: 'Tu sais pourquoi. Ça n’aide pas.',
    }[roots.outcome];
  }
  if (roots.trail >= ENOUGH) return 'Tu as de quoi la retrouver. Reste à décider.';
  const said = whatYouKnow(state);
  if (said) return `Tu commences à savoir à qui tu as affaire (${Math.round(roots.trail)} sur ${ENOUGH}).`;
  return `Tu cherches, et tu n’en es qu’à ${Math.round(roots.trail)} sur ${ENOUGH}.`;
}
