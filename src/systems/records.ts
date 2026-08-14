/**
 * Le disque, et la route.
 *
 * Trois reproches du catalogue, tous sur la musique, et tous du même ordre :
 * **ce qu'on enregistrait ne vivait pas après avoir été enregistré**. Un
 * album était une soirée bien ou mal passée, et le lendemain il n'en restait
 * rien ; la maison de disques était une formule dans un texte ; la tournée
 * était un engagement de plus, sans dates ni salles à choisir.
 *
 * Quatre principes, et ils tiennent tous à la durée.
 *
 * **1. Une sortie a une vie.** Elle entre au classement à un rang qui dépend
 * de ce qu'elle vaut, de ce qu'on vaut et de qui la pousse ; elle y monte
 * une année encore si elle a bien démarré, puis elle retombe à une vitesse
 * propre au format. Un titre monte vite et s'en va ; une œuvre longue met
 * des années à trouver son public et ne le quitte plus.
 *
 * **2. Elle paie tant qu'on s'en souvient.** Les droits tombent chaque année
 * tant qu'elle est classée, proportionnels au rang. C'est la première fois
 * qu'une carrière de scène produit un revenu sans qu'on travaille — et c'est
 * exactement ce qui manquait.
 *
 * **3. Une maison est un arbitrage, pas un bonus.** Elle avance de l'argent
 * et pousse les sorties, elle prend sa part sur tout, et elle **impose le
 * format** : plus elle est grande, moins on choisit ce qu'on enregistre. On
 * lui doit des disques et l'on n'est libre qu'après les avoir livrés.
 *
 * **4. Une tournée se compose.** On pose des dates, salle par salle, sans
 * savoir ce qu'on remplira. Réserver plus grand paie beaucoup si le public
 * suit et coûte la salle vide s'il ne suit pas ; poser trop de dates finit
 * par les faire annuler.
 *
 * Rien n'imite un catalogue réel : les formats, les maisons et les salles
 * sont génériques, et aucun nom n'appartient à personne.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type {
  ActionResult, GameState, RecordDeal, Release, StageState,
} from '../engine/types.ts';
import {
  FORMATS, LABELS, MAX_DATES, VENUES, chartLabel, fillLabel, getFormat,
  getLabel, getVenue, tourStrain, type Format, type Label, type Venue,
} from '../data/records.ts';
import { getDiscipline } from '../data/stage.ts';
import { feeUnit } from './stage.ts';
import { shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';

export { chartLabel, fillLabel, FORMATS, LABELS, VENUES, MAX_DATES };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'état de scène, mais seulement si c'est de la musique.
 *
 * Tout ce fichier ne concerne qu'une discipline. Le vérifier ici une fois
 * évite de le redemander partout, et garantit qu'un comédien ne peut pas
 * sortir d'album par accident.
 */
export function musicOf(state: GameState): StageState | null {
  const stage = state.player.stage;
  return stage?.disciplineId === 'musique' ? stage : null;
}

/** L'unité monétaire du disque : le cachet de référence du métier. */
export function recordUnit(state: GameState): number {
  const discipline = getDiscipline('musique');
  return discipline ? feeUnit(state, discipline) : 0;
}

export function labelOf(state: GameState): Label | null {
  const stage = musicOf(state);
  return stage?.deal ? getLabel(stage.deal.labelId) ?? null : null;
}

/** Les sorties parues, de la plus récente à la plus ancienne. */
export function released(state: GameState): Release[] {
  const stage = musicOf(state);
  if (!stage) return [];
  return stage.releases.filter((r) => r.year !== null)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/** Ce qui est encore en production. */
export function inProduction(state: GameState): Release | null {
  const stage = musicOf(state);
  return stage?.releases.find((r) => r.year === null) ?? null;
}

/** La meilleure place jamais atteinte, toutes sorties confondues. */
export function bestChart(state: GameState): number {
  const parts = released(state).filter((r) => r.peak > 0).map((r) => r.peak);
  return parts.length > 0 ? Math.min(...parts) : 0;
}

/** Ce que le catalogue rapporte cette année. */
export function royaltiesOf(state: GameState): number {
  const stage = musicOf(state);
  if (!stage) return 0;
  return stage.releases.reduce((sum, r) => sum + royaltyFor(state, r), 0);
}

/**
 * Ce qu'une sortie rapporte cette année.
 *
 * Nul si elle n'est pas classée : un disque oublié ne paie rien. Le rang
 * compte beaucoup plus que linéairement — la première place vaut plusieurs
 * fois la dixième, ce qui est le cœur du métier.
 */
export function royaltyFor(state: GameState, release: Release): number {
  const format = getFormat(release.formatId);
  if (!format || release.year === null || release.rank <= 0) return 0;
  const strength = Math.pow(Math.max(0, 201 - release.rank) / 200, 2.4);
  return Math.round(recordUnit(state) * format.royalty * strength);
}

/* ------------------------------------------------------------------ */
/* Enregistrer                                                         */
/* ------------------------------------------------------------------ */

export function recordBlocker(state: GameState, format: Format): string | null {
  const stage = musicOf(state);
  if (!stage) return 'Ce n’est pas ton métier.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (inProduction(state)) return 'Tu es déjà en train d’enregistrer.';
  if (stage.craft < format.craft) {
    return `Il faut savoir jouer — ${format.craft} de métier.`;
  }
  const deal = stage.deal;
  const label = deal ? getLabel(deal.labelId) : null;
  // Ce que la maison impose : plus elle est grande, moins on choisit. C'est
  // le vrai prix d'un contrat, et il ne se compte pas en argent.
  // Trois ans, pas deux : une maison installée *veut* des albums, c'est le
  // silence long qu'elle refuse. À `span > 1`, signer une grande maison
  // interdisait l'album — exactement l'inverse de ce que la règle voulait
  // dire, et cela ne laissait qu'un catalogue de titres isolés.
  if (label && label.control > 0.5 && format.span > 2) {
    return `${label.label} ne te laissera pas partir trois ans sans rien sortir.`;
  }
  if (label && label.control > 0.75 && format.id === 'live') {
    return `${label.label} veut du neuf, pas des reprises de scène.`;
  }
  const cost = productionCost(state, format);
  if (!label && state.player.money < cost) return 'Tu n’as pas de quoi le produire.';
  return null;
}

/** Ce que produire coûte. Avec une maison, c'est elle qui paie. */
export function productionCost(state: GameState, format: Format): number {
  return Math.round(recordUnit(state) * format.cost);
}

/** Des titres génériques, tirés au sort. Aucun n'existe. */
const TITLE_HEADS = [
  'Ce qui reste', 'Août', 'La ligne', 'Sans bruit', 'Vingt heures', 'Le détour',
  'Nord', 'Rien de grave', 'Les autres', 'Encore une', 'À découvert', 'Le seuil',
  'Bleu de travail', 'On verra', 'La dernière fois', 'Comme avant', 'Hors saison',
];

export function startRecording(ctx: Ctx, formatId: string): ActionResult {
  const { state, rng } = ctx;
  const stage = musicOf(state);
  const format = getFormat(formatId);
  if (!stage || !format) return { ok: false, message: 'Ce n’est pas ton métier.' };
  const blocker = recordBlocker(state, format);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const label = labelOf(state);
  const cost = productionCost(state, format);
  if (!label) state.player.money -= cost;

  stage.releases.push({
    id: `rel_${state.year}_${stage.releases.length}`,
    formatId: format.id,
    title: rng.pick(TITLE_HEADS),
    year: null,
    yearsLeft: format.span,
    labelId: label?.id ?? null,
    quality: 0,
    peak: 0,
    rank: 0,
    weeks: 0,
    earned: 0,
  });
  ctx.log('work', `Tu commences ${format.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: format.label,
    tone: 'neutral',
    message: `${format.what}. ${format.span > 1 ? `${format.span} ans avant qu’on l’entende.` : 'Il sortira l’an prochain.'}${
      label ? ` ${label.label} paie la production.` : ` ${cost} de ta poche.`}`,
  };
}

/**
 * La sortie, une fois la production finie.
 *
 * Le rang d'entrée mélange ce que vaut le disque, ce qu'on vaut soi-même, ce
 * que la maison pousse, et une part d'incertitude qui ne se réduit jamais :
 * personne ne sait à l'avance ce qui marche.
 */
function publish(ctx: Ctx, release: Release): void {
  const { state, rng } = ctx;
  const stage = musicOf(state);
  const format = getFormat(release.formatId);
  if (!stage || !format) return;

  const label = release.labelId ? getLabel(release.labelId) : null;
  release.year = state.year;
  // Ce que vaut le disque : le métier d'abord, l'entourage et le nom ensuite.
  release.quality = clampStat(
    stage.craft * 0.62 + state.player.fame.level * 0.14
    + (stage.cohesion - 50) * 0.12 + rng.float(-11, 11),
  );

  const force = (release.quality / 100) * format.reach * (label?.push ?? 1)
    * (0.55 + state.player.fame.level / 130);
  // Un rang, pas un score : plus la force est grande, plus on entre haut.
  //
  // L'exposant compte plus que le facteur. À une puissance de un, le sommet
  // du classement était hors d'atteinte : une carrière de vingt ans avec
  // douze albums plafonnait à la quarante-quatrième place, quel que soit le
  // métier. Ce qui distingue une bonne carrière d'une très grande doit se
  // voir précisément là — dans les dix premiers rangs.
  const entry = Math.round(
    200 / (0.3 + Math.pow(force, 1.6) * 3.6) * rng.float(0.7, 1.28),
  );
  release.rank = entry <= 200 ? Math.max(1, entry) : 0;
  release.peak = release.rank;
  release.weeks = release.rank > 0 ? 1 : 0;

  if (release.rank > 0) {
    state.player.fame.level = clampStat(
      state.player.fame.level + Math.max(0, 22 - release.rank * 0.2) * format.reach * 0.5,
    );
  }
  stage.craft = clamp(stage.craft + format.growth * 0.3, 0, 100);
  if (stage.deal) stage.deal.owed = Math.max(0, stage.deal.owed - 1);

  ctx.log(
    'work',
    `« ${release.title} » paraît — ${chartLabel(release.rank).toLowerCase()}.`,
    release.rank > 0 && release.rank <= 40 ? 'good' : release.rank > 0 ? 'neutral' : 'bad',
  );
  if (release.rank === 1) applyExperience(ctx, 'grandeRéussite');
}

/* ------------------------------------------------------------------ */
/* La maison                                                           */
/* ------------------------------------------------------------------ */

/** Ce qu'on peut espérer signer aujourd'hui. */
export function labelOffers(state: GameState): Label[] {
  const stage = musicOf(state);
  if (!stage) return [];
  return LABELS.filter(
    (l) => l.id !== 'auto'
      && stage.craft >= l.craft
      && state.player.fame.level >= l.fame,
  );
}

export function signBlocker(state: GameState, label: Label): string | null {
  const stage = musicOf(state);
  if (!stage) return 'Ce n’est pas ton métier.';
  if (stage.deal) return 'Tu as déjà une maison, et des disques à lui livrer.';
  if (stage.craft < label.craft) return `Il faut ${label.craft} de métier.`;
  if (state.player.fame.level < label.fame) return `Il faut ${label.fame} de notoriété.`;
  return null;
}

export function signLabel(ctx: Ctx, labelId: string): ActionResult {
  const { state } = ctx;
  const stage = musicOf(state);
  const label = getLabel(labelId);
  if (!stage || !label) return { ok: false, message: 'Cette maison n’existe pas.' };
  const blocker = signBlocker(state, label);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const advance = Math.round(recordUnit(state) * label.advance);
  state.player.money += advance;
  const deal: RecordDeal = {
    labelId: label.id,
    since: state.year,
    owed: label.owed,
    advance,
    recouped: 0,
  };
  stage.deal = deal;
  ctx.log('work', `Tu signes chez ${label.label.toLowerCase()}.`, 'good');
  return {
    ok: true,
    title: label.label,
    tone: 'good',
    message: `${label.what}. ${advance > 0 ? `${advance} d’avance, à rembourser sur les droits. ` : ''}${
      label.owed} disque(s) à livrer, et ${Math.round(label.cut * 100)} % de tout.`,
  };
}

export function breakDealBlocker(state: GameState): string | null {
  const stage = musicOf(state);
  if (!stage?.deal) return 'Tu n’as pas de maison.';
  return null;
}

/**
 * Rompre.
 *
 * On peut, et cela coûte exactement ce qu'on doit encore : l'avance non
 * remboursée, plus une pénalité par disque non livré. C'est ce qui fait
 * réfléchir avant de signer une grande maison pour l'avance.
 */
export function breakDeal(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const stage = musicOf(state);
  const deal = stage?.deal;
  const label = deal ? getLabel(deal.labelId) : null;
  if (!stage || !deal || !label) return { ok: false, message: 'Tu n’as pas de maison.' };

  const owed = Math.max(0, deal.advance - deal.recouped)
    + Math.round(recordUnit(state) * deal.owed * 2.5);
  state.player.money -= owed;
  stage.deal = null;
  ctx.log('work', `Tu quittes ${label.label.toLowerCase()}.`, 'bad');
  shiftStats(state, { reputation: -4 });
  return {
    ok: true,
    title: 'Contrat rompu',
    tone: 'bad',
    message: `${owed} pour en sortir. ${deal.owed > 0 ? 'On ne te rappellera pas de sitôt.' : 'Tu es libre.'}`,
  };
}

/* ------------------------------------------------------------------ */
/* La route                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on peut attirer, 0-100.
 *
 * Le nom d'abord, le métier ensuite, et surtout **le catalogue** : c'est ce
 * qu'on a sorti qui remplit une salle, pas ce qu'on sait jouer. Une carrière
 * sans disque ne dépasse jamais les petites salles, et c'est voulu.
 */
export function pull(state: GameState): number {
  const stage = musicOf(state);
  if (!stage) return 0;
  const catalogue = released(state).reduce(
    (sum, r) => sum + Math.max(0, 201 - (r.peak || 201)) / 200, 0,
  );
  return clampStat(
    state.player.fame.level * 0.5 + stage.craft * 0.22 + Math.min(30, catalogue * 9),
  );
}

/** Les salles qu'on peut espérer remplir. Les autres restent visibles. */
export function reachableVenues(state: GameState): Venue[] {
  const draw = pull(state);
  return VENUES.filter((v) => v.draw <= draw + 20);
}

export function tourBlocker(state: GameState): string | null {
  const stage = musicOf(state);
  if (!stage) return 'Ce n’est pas ton métier.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (stage.tour?.running) return 'Tu es déjà sur la route.';
  if (state.year < stage.injuredUntil) return 'Tu n’es pas en état.';
  return null;
}

/** Poser une date. On compose sa tournée salle par salle. */
export function addDate(ctx: Ctx, venueId: string): ActionResult {
  const { state } = ctx;
  const stage = musicOf(state);
  const venue = getVenue(venueId);
  if (!stage || !venue) return { ok: false, message: 'Cette salle n’existe pas.' };
  const blocker = tourBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const tour = stage.tour && !stage.tour.running && stage.tour.since === state.year
    ? stage.tour
    : {
      since: state.year, dates: [], played: 0, earned: 0, spent: 0,
      cancelled: 0, fill: 0, running: false,
    };
  if (tour.dates.length >= MAX_DATES) {
    return { ok: false, title: 'Impossible', message: `${MAX_DATES} dates au plus.` };
  }
  tour.dates.push(venue.id);
  stage.tour = tour;
  return {
    ok: true,
    title: venue.label,
    tone: 'neutral',
    message: `${tour.dates.length} date(s) posée(s). ${venue.seats} places à remplir.`,
  };
}

export function dropDate(ctx: Ctx, index: number): ActionResult {
  const { state } = ctx;
  const stage = musicOf(state);
  const tour = stage?.tour;
  if (!stage || !tour || tour.running) return { ok: false, message: 'Rien à retirer.' };
  if (index < 0 || index >= tour.dates.length) return { ok: false, message: 'Cette date n’existe pas.' };
  tour.dates.splice(index, 1);
  if (tour.dates.length === 0) stage.tour = null;
  return { ok: true, title: 'Date retirée', tone: 'neutral', message: 'Une de moins.' };
}

/** Ce qu'une tournée coûte à monter, avant d'avoir joué quoi que ce soit. */
export function tourCost(state: GameState): number {
  const stage = musicOf(state);
  if (!stage?.tour) return 0;
  return Math.round(stage.tour.dates.reduce(
    (sum, id) => sum + (getVenue(id)?.cost ?? 0), 0,
  ) * recordUnit(state));
}

/**
 * Partir.
 *
 * Tout se règle ici : chaque date se remplit selon ce qu'on attire et ce que
 * la salle demande, la fatigue s'accumule, et les dernières dates sautent si
 * l'on a vu trop grand. C'est le moment où l'on découvre ce qu'on valait.
 */
export function hitTheRoad(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const stage = musicOf(state);
  const tour = stage?.tour;
  if (!stage || !tour) return { ok: false, message: 'Tu n’as pas posé de dates.' };
  const blocker = tourBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  if (tour.dates.length === 0) return { ok: false, message: 'Tu n’as pas posé de dates.' };

  const cost = tourCost(state);
  if (state.player.money < cost) {
    return { ok: false, title: 'Impossible', message: 'Tu n’as pas de quoi la monter.' };
  }
  state.player.money -= cost;
  tour.spent = cost;
  tour.running = true;

  const draw = pull(state);
  const strain = tourStrain(tour.dates.length, state.player.stats.fitness);
  let gross = 0;
  let fillSum = 0;
  let played = 0;
  let cancelled = 0;
  let fatigue = stage.fatigue;

  for (const venueId of tour.dates) {
    const venue = getVenue(venueId);
    if (!venue) continue;
    // Au-delà d'un certain épuisement, on annule. C'est ce qui punit une
    // tournée trop longue sans la rendre impossible.
    if (fatigue > 88 && rng.chance((fatigue - 88) / 24)) {
      cancelled += 1;
      continue;
    }
    // Le remplissage : ce qu'on attire contre ce que la salle demande. Voir
    // trop grand ne rate pas complètement, il laisse des trous.
    const fill = clamp(
      0.35 + (draw - venue.draw) / 42 + rng.float(-0.12, 0.12), 0.05, 1,
    );
    gross += venue.gross * fill;
    fillSum += fill;
    played += 1;
    fatigue = clampStat(fatigue + venue.toll + strain * 0.1);
  }

  const label = labelOf(state);
  const net = Math.round(gross * recordUnit(state) * (1 - (label?.cut ?? 0)));
  state.player.money += net;
  stage.earnedThisYear += Math.max(0, net);
  stage.fatigue = fatigue;
  tour.earned = net;
  tour.played = played;
  tour.cancelled = cancelled;
  tour.fill = played > 0 ? fillSum / played : 0;

  const bump = played * (tour.fill > 0.7 ? 0.9 : 0.3);
  state.player.fame.level = clampStat(state.player.fame.level + bump);
  stage.craft = clamp(stage.craft + played * 0.35, 0, 100);
  shiftStats(state, { fitness: -Math.round(strain * 0.25), happiness: tour.fill > 0.7 ? 5 : -6 });

  ctx.log(
    'work',
    `Tournée : ${played} date(s), ${fillLabel(tour.fill).toLowerCase()}.`,
    net > cost ? 'good' : 'bad',
  );
  return {
    ok: true,
    title: 'De retour',
    tone: net > cost ? 'good' : 'bad',
    message: `${played} date(s) jouée(s)${cancelled > 0 ? `, ${cancelled} annulée(s)` : ''}. ${
      fillLabel(tour.fill)}. ${net} encaissés pour ${cost} engagés.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année de disque.
 *
 * La production avance, les sorties paraissent, et le classement bouge. Rien
 * n'est tiré au hasard ici sauf la marge d'une entrée : une carrière de
 * disque doit être lisible d'une année sur l'autre.
 */
export function advanceRecords(ctx: Ctx): void {
  const { state, rng } = ctx;
  const stage = musicOf(state);
  if (!stage) return;

  for (const release of stage.releases) {
    // La production. Une sortie qui paraît cette année **touche cette
    // année** : c'est celle où elle se vend le plus, et la sauter revenait à
    // n'être payé qu'à partir du déclin. Un album entré à la quatre-vingt-
    // huitième place et retombé l'année suivante n'avait jamais rien
    // rapporté du tout.
    const fresh = release.year === null;
    if (fresh) {
      release.yearsLeft -= 1;
      if (release.yearsLeft > 0) continue;
      publish(ctx, release);
    }

    // Le classement : une sortie bien partie monte encore une année, puis
    // tout retombe. C'est ce qui donne sa forme à une carrière.
    const format = getFormat(release.formatId);
    if (!format || release.rank <= 0) continue;
    if (!fresh) release.weeks += 1;
    if (!fresh && release.weeks === 2 && release.rank <= 60 && rng.chance(0.45)) {
      // Près du sommet, on ne gagne plus des dizaines de places : on prend
      // les dernières une par une. Sans cette exception, la première place
      // restait mathématiquement hors d'atteinte quelle que soit la carrière.
      release.rank = release.rank <= 10
        ? Math.max(1, release.rank - 2)
        : Math.max(1, Math.round(release.rank * 0.62));
      release.peak = Math.min(release.peak || release.rank, release.rank);
    } else if (!fresh) {
      release.rank = Math.round(release.rank * (1 + format.decay) + 3);
      if (release.rank > 200) release.rank = 0;
    }

    const royalty = royaltyFor(state, release);
    if (royalty > 0) {
      const label = release.labelId ? getLabel(release.labelId) : null;
      const cut = Math.round(royalty * (label?.cut ?? 0));
      let mine = royalty - cut;
      // L'avance se rembourse sur les droits avant qu'on touche quoi que ce
      // soit : c'est ce qui fait qu'une avance n'est pas un cadeau.
      if (stage.deal && stage.deal.recouped < stage.deal.advance) {
        const take = Math.min(mine, stage.deal.advance - stage.deal.recouped);
        stage.deal.recouped += take;
        mine -= take;
      }
      state.player.money += mine;
      stage.earnedThisYear += Math.max(0, mine);
      release.earned += mine;
    }
  }

  // Une maison à qui l'on ne livre rien finit par s'en aller.
  const deal = stage.deal;
  if (deal && deal.owed > 0 && state.year - deal.since > deal.owed + 4) {
    const label = getLabel(deal.labelId);
    stage.deal = null;
    ctx.log('work', `${label?.label ?? 'La maison'} met fin au contrat.`, 'bad');
  }

  // Une tournée finie ne court pas d'une année sur l'autre.
  if (stage.tour?.running) stage.tour.running = false;
}
