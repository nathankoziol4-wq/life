/**
 * Pilote automatique utilisé par les tests d'équilibrage.
 *
 * Il joue comme un joueur raisonnable — études, emploi, sport, couple,
 * immobilier — afin que les statistiques mesurées reflètent une vraie partie
 * et non une vie totalement passive.
 */

import { createCtx, type Ctx } from '../context.ts';
import { createNewLife } from '../newLife.ts';
import { Rng } from '../rng.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState } from '../types.ts';
import type { OriginDraft } from '../origin.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { applyToJob, askForRaise, offerBlocker, retire, setWorkEffort } from '../../systems/careers.ts';
import { enrollUniversity, enrollVocational, setEffort } from '../../systems/education.ts';
import { interact, currentPartner, propose, tryForBaby } from '../../systems/relationships.ts';
import { doSport } from '../../systems/activities.ts';
import { buyProperty } from '../../systems/properties.ts';
import { treatDisease } from '../../systems/health.ts';
import { consultWith, panelOf, register } from '../../systems/practitioners.ts';
import { MAJORS } from '../../data/degrees.ts';
import {
  costOf, hold, inviteClosest, planOf, setSpread, setVenue, weddingBlocker,
} from '../../systems/wedding.ts';
import { VENUES } from '../../data/wedding.ts';

/**
 * Organiser et tenir la noce, comme le ferait quelqu'un de raisonnable : le
 * plus beau lieu qu'on puisse s'offrir, et tout le monde qu'on peut inviter.
 */
function holdWedding(ctx: () => Ctx, state: GameState): void {
  const plan = planOf(state);
  if (!plan || plan.done) return;
  /*
   * Du plus cher au moins cher, **et le repas descend avec le lieu**.
   *
   * Sans la seconde boucle, l'auto-joueur finissait sur la mairie avec un
   * buffet à cinquante-cinq par tête : deux cent vingt francs, que la moitié
   * des personnages n'a pas — l'argent médian à trente ans vaut zéro. Il
   * restait donc fiancé à vie. Mesuré, cela coûtait la moitié des enfants du
   * jeu (0,45 par vie au lieu de 1,01).
   */
  for (const venue of [...VENUES].sort((a, b) => b.cost - a.cost)) {
    for (const spread of ['faste', 'traiteur', 'simple', 'rien']) {
      setVenue(ctx(), venue.id);
      setSpread(ctx(), spread);
      inviteClosest(ctx());
      if (costOf(state) <= state.player.money) {
        if (weddingBlocker(state) === null) hold(ctx());
        return;
      }
    }
  }
}

export interface AutoplayOptions {
  /** 0 = passif, 1 = joueur appliqué. */
  diligence?: number;
  maxYears?: number;
  /** Environnement de départ imposé, pour comparer deux milieux. */
  draft?: Partial<OriginDraft>;
  /**
   * Un geste de plus chaque année, joué après tous les autres.
   *
   * Sert à comparer deux vies sur la même graine en ne changeant qu'une
   * habitude — par exemple travailler la compétence de son métier, ou non.
   * Sans ce crochet, mesurer ce qu'une habitude rapporte demandait de
   * dupliquer l'auto-joueur, et la copie divergeait.
   */
  each?: (state: GameState) => void;
}

export function autoplayLife(seed: number, opts: AutoplayOptions = {}): GameState {
  return autoplayFrom(createNewLife({ seed, draft: opts.draft }), seed, opts);
}

/**
 * Le même joueur, mais sur une partie déjà commencée.
 *
 * **Pourquoi cela existe séparément.** `autoplayLife` part d'une graine et
 * fabrique la vie ; mesurer une *lignée* demande de continuer une partie qui
 * existe déjà — celle que `lineage.ts#continueAs` vient de remettre entre les
 * mains d'un héritier. Sans ce point d'entrée, la seule façon de jouer la
 * génération suivante était `simulateYear` nu, c'est-à-dire un personnage qui
 * ne se met jamais en couple, ne postule jamais et n'a jamais d'enfant : la
 * lignée s'arrêtait alors pour une raison qui tenait à l'instrument et non au
 * jeu.
 */
export function autoplayFrom(
  state: GameState, seed: number, opts: AutoplayOptions = {},
): GameState {
  const diligence = opts.diligence ?? 1;
  const maxYears = opts.maxYears ?? 140;
  const rng = new Rng({ rngState: (seed * 2654435761) >>> 0 });

  for (let i = 0; i < maxYears; i++) {
    const result = simulateYear(state);
    if (result.died) break;

    // Répond aux événements en attente.
    let guard = 0;
    while (state.pending.length && guard++ < 20) {
      const ev = state.pending[0];
      resolvePending(createCtx(state), ev.id, rng.int(0, ev.choices.length - 1));
    }
    if (!state.player.alive) break;
    act(state, rng, diligence);
    opts.each?.(state);
  }
  return state;
}

/** Ce qu'il faut de mieux payé pour que changer de poste vaille la peine. */
const WORTH_MOVING = 1.25;

function act(state: GameState, rng: Rng, diligence: number): void {
  const p = state.player;
  if (p.prison) return;
  const ctx = () => createCtx(state);

  // Travail scolaire.
  if (p.age >= 6 && p.age <= 24 && rng.chance(diligence)) {
    setEffort(ctx(), rng.chance(0.6) ? 'hard' : 'normal');
  }

  // Études supérieures à la sortie du lycée.
  if (p.education.stage === 'graduated' && p.education.level === 1 && p.age >= 18 && p.age <= 22) {
    if (p.stats.intelligence >= 62 && rng.chance(diligence * 0.8)) {
      const major = rng.pick(MAJORS.filter((m) => m.minIntelligence <= p.stats.intelligence));
      if (major) enrollUniversity(ctx(), major.id);
    } else if (rng.chance(diligence * 0.6)) {
      enrollVocational(ctx(), rng.pick(['voc_trades', 'voc_mechanic', 'voc_culinary', 'voc_it', 'voc_realestate']));
    }
  }

  // Recherche d'emploi.
  const studying = ['university', 'graduate', 'vocational', 'high', 'middle', 'primary', 'nursery'].includes(p.education.stage);
  if (!p.job && !p.retired && p.age >= 18 && !(studying && p.age < 24)) {
    const eligible = state.world.jobOffers
      .filter((o) => !offerBlocker(state, o))
      .sort((a, b) => b.salary - a.salary);
    for (const offer of eligible.slice(0, 4)) {
      if (applyToJob(ctx(), offer.id).ok && p.job) break;
    }
  }

  /*
   * **Changer de poste quand le marché paie franchement mieux.**
   *
   * Il manquait, et cela se voyait dès qu'on mesurait une carrière : la
   * recherche d'emploi ci-dessus est gardée par `!p.job`, si bien qu'une fois
   * embauché, ce joueur ne postulait plus jamais — trente ans au même poste,
   * quelle que soit l'offre. Ce n'était pas un joueur raisonnable, c'était un
   * joueur résigné.
   *
   * Le trou s'est vu en mesurant les lignées. Un héritier arrive désormais
   * avec le métier qu'il exerçait (`lineage.ts#carryOwnLife`) — donc *avec*
   * un emploi — et se trouvait de ce fait enfermé dedans, tandis que le témoin
   * auquel on le comparait avait, lui, choisi la mieux payée des offres. Le
   * même héritier laisse 11 008 sans cette mobilité et 39 591 avec : l'écart
   * mesuré tenait à l'instrument, pas au jeu.
   *
   * Le seuil est franc — un quart de plus — pour ne pas transformer ce joueur
   * en sauteur de poste : ce qu'on veut est quelqu'un qui saisit une vraie
   * occasion, pas quelqu'un qui optimise chaque année.
   */
  if (p.job && !p.retired && !p.prison) {
    const better = state.world.jobOffers
      .filter((o) => !offerBlocker(state, o) && o.salary > p.job!.salary * WORTH_MOVING)
      .sort((a, b) => b.salary - a.salary)[0];
    if (better && rng.chance(diligence * 0.8)) applyToJob(ctx(), better.id);
  }

  // Vie professionnelle.
  if (p.job) {
    setWorkEffort(ctx(), p.stats.stress > 70 ? 'normal' : rng.chance(0.4) ? 'overtime' : 'normal');
    if (p.job.yearsAtJob >= 2 && rng.chance(0.5)) askForRaise(ctx());
  }
  if (!p.retired && p.age >= 65) retire(ctx());

  // Santé.
  if (p.age >= 12 && rng.chance(diligence * 0.7)) {
    doSport(ctx(), rng.pick(['run', 'gym', 'swim', 'walk', 'cycling', 'team']));
  }
  const sick = p.diseases.find((d) => !d.diagnosed);
  if (sick && rng.chance(0.5)) {
    /*
     * Un joueur raisonnable prend un médecin et y retourne, plutôt que d'en
     * essayer un nouveau chaque fois. Il choisit sur ce qu'il peut voir — la
     * réputation — et non sur la compétence, qui est cachée : c'est tout
     * l'intérêt du système, et l'auto-joueur ne doit pas tricher avec.
     */
    const here = panelOf(state).filter((d) => d.specialtyId === 'gp');
    const pick = here.sort((a, b) => b.renown - a.renown)[0];
    if (pick) {
      if (state.player.doctorId === null) register(ctx(), pick.id);
      consultWith(ctx(), state.player.doctorId ?? pick.id);
    }
  }
  for (const d of p.diseases.filter((x) => x.diagnosed && !x.treated)) {
    treatDisease(ctx(), d.id);
  }

  // Vie sentimentale et familiale.
  const partner = currentPartner(state);
  if (partner) {
    interact(ctx(), partner.id, rng.chance(0.5) ? 'time' : 'talk');
    if (partner.relation === 'partner' && p.age >= 23 && rng.chance(0.55)) propose(ctx(), partner);
    /*
     * **Et la noce, qu'il faut désormais tenir.**
     *
     * Une demande acceptée fiance ; elle ne marie plus. L'auto-joueur
     * s'arrêtait donc aux fiançailles, et le garde-fou d'équilibrage l'a dit
     * tout de suite : **mariés 16 % au lieu de 47 %, enfants 0,07 au lieu de
     * 1,01**. Il choisit maintenant ce qu'un joueur raisonnable choisirait —
     * le plus beau lieu qu'il puisse payer, la liste remplie au plus proche —
     * et il y va dès que c'est possible.
     */
    holdWedding(ctx, state);
    /*
     * **Fiancé compte comme engagé.** Le garde-fou lisait `relation ===
     * 'spouse'`, ce qui voulait dire « marié » ; mais le moment de la vie
     * qu'il visait — la demande acceptée — s'appelle maintenant « fiancé »
     * pendant l'année de préparation. À lire l'étiquette plutôt que le
     * moment, l'auto-joueur perdait une année d'essais par vie : 0,92 enfant
     * au lieu de 1,02. Le moteur, lui, n'a jamais demandé le mariage pour
     * concevoir — voir `relationships.ts#tryForBaby`.
     */
    const engaged = Boolean(planOf(state) && !planOf(state)?.done);
    const committed = partner.relation === 'spouse' || engaged;
    if (committed && p.age >= 24 && p.age <= 42 && rng.chance(0.75)) tryForBaby(ctx());
  } else if (p.age >= 18) {
    const crush = Object.values(state.npcs).find(
      (x) => x.alive && (x.relation === 'crush' || x.relation === 'classmate' || x.relation === 'coworker'),
    );
    if (crush && rng.chance(0.5)) interact(ctx(), crush.id, 'askOut');
  }

  // Entretien des liens familiaux.
  const family = Object.values(state.npcs).filter(
    (x) => x.alive && !x.estranged && ['mother', 'father', 'son', 'daughter', 'brother', 'sister'].includes(x.relation),
  );
  for (const member of family.slice(0, 2)) {
    if (rng.chance(0.4)) interact(ctx(), member.id, 'talk');
  }

  // Immobilier dès que possible.
  if (p.age >= 25 && !p.properties.length && p.job) {
    const affordable = state.world.propertyListings
      .filter((l) => p.money >= Math.round(l.price * 0.2))
      .sort((a, b) => b.price - a.price)[0];
    if (affordable) buyProperty(ctx(), affordable.id, 'mortgage');
  }
}
