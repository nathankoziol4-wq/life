/**
 * Moteur annuel (§24).
 *
 * `simulateYear` exécute, dans l'ordre, toutes les étapes d'une année de vie.
 * Cette fonction ne connaît pas l'interface : elle prend un `GameState`,
 * le fait avancer d'un an et renvoie les événements produits.
 */

import { createCtx, fullName } from './context.ts';
import type { GameState, PendingEvent, TimelineEntry } from './types.ts';
import { agePerson } from '../systems/npc.ts';
import { ageUpPlayer, checkPlayerDeath } from '../systems/aging.ts';
import { advanceEducation } from '../systems/education.ts';
import { settleConditions } from '../systems/asking.ts';
import { advanceCareer } from '../systems/careers.ts';
import { advanceVentures } from '../systems/venture.ts';
import { advanceFame, openScandal } from '../systems/fame.ts';
import { advanceStage } from '../systems/stage.ts';
import { advanceService } from '../systems/service.ts';
import { advancePolitics } from '../systems/politics.ts';
import { advanceRoyalty } from '../systems/royalty.ts';
import { awardRibbon, obituary, type Award } from '../systems/ribbons.ts';
import { advanceHeirlooms } from '../systems/heirlooms.ts';
import { advanceHarassment, rollHarassment, rollWitnessScene } from '../systems/bullying.ts';
import { advanceSchoolSport } from '../systems/schoolSport.ts';
import { advanceExams } from '../systems/exams.ts';
import { SCANDAL_KINDS } from '../data/fame.ts';
import { runAnnualFinance } from '../systems/finance.ts';
import { advanceDiseases, rollNewIllness } from '../systems/health.ts';
import { advanceProperties } from '../systems/properties.ts';
import { advanceVehicles } from '../systems/vehicles.ts';
import { advanceRelationships } from '../systems/relationships.ts';
import { advancePrison } from '../systems/prison.ts';
import { advanceFugitive } from '../systems/escape.ts';
import { advanceMarkets, advancePortfolio } from '../systems/investing.ts';
import { advanceUnderworld } from '../systems/underworld.ts';
import { advanceChildhood } from '../systems/childhood.ts';
import { advancePets, advanceValuables } from '../systems/activities.ts';
import { rollRandomEvents } from '../systems/randomEvents.ts';
import { handleRelativeDeath, settleEstate, type EstateShare } from '../systems/inheritance.ts';
import { refreshMarkets } from '../systems/markets.ts';
import { advanceEnvironment } from '../systems/environment.ts';
import { advanceClassLife } from '../systems/school.ts';
import { updatePersonality } from '../systems/psyche.ts';
import { exposureSignals } from '../systems/exposure.ts';
import { advanceNpcPsyche } from '../systems/psyche.ts';
import { netWorth } from '../systems/finance.ts';
import { lifeExpectancy } from './probability.ts';

export interface YearResult {
  /** Nouvelles entrées de timeline générées par l'année. */
  entries: TimelineEntry[];
  /** Événements interactifs à présenter au joueur. */
  pending: PendingEvent[];
  /** Le joueur est-il mort cette année ? */
  died: boolean;
  deathCause: string | null;
  /** Répartition de la succession, si décès. */
  estate: EstateShare[];
}

/**
 * Fait avancer la partie d'une année complète.
 * L'ordre des étapes correspond exactement au cahier des charges §24.
 */
export function simulateYear(state: GameState): YearResult {
  const ctx = createCtx(state);
  const p = state.player;

  if (!p.alive || state.gameOver) {
    return { entries: [], pending: [], died: true, deathCause: p.deathCause, estate: [] };
  }

  // 1. Nouvelle année, nouvel âge.
  state.year += 1;
  p.age += 1;
  p.yearActions = {};
  state.pending = [];

  // 1 bis. L'environnement bouge avant le personnage : le quartier, l'économie
  // locale et le foyer forment le décor dans lequel se joue l'année.
  advanceEnvironment(ctx);
  ageUpPlayer(ctx);

  // 2. Vieillissement des PNJ (et décès éventuels). Ceux qui comptent ont
  // une vie intérieure : leurs goûts évoluent, et ils les transmettent.
  const deceased = [];
  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    if (npc.psyche) advanceNpcPsyche(ctx.rng, npc);
    if (agePerson(ctx, npc)) deceased.push(npc);
  }

  // 3. Évolution des relations et initiatives des PNJ.
  advanceRelationships(ctx);

  // 3 bis. L'enfance : ce qui se perd quand on ne fait rien avec sa famille,
  // et les amis du quartier qui déménagent. Avant l'école, parce que la
  // maison vient avant la classe.
  advanceChildhood(ctx);

  // 4. Études, puis la vie de classe : amitiés, groupes, place dans la cour.
  // Une session d'examens laissée en plan se solde avant tout le reste : elle
  // appartient à l'année écoulée, et ne pas s'y présenter compte comme un
  // zéro même pour qui a quitté l'école entre-temps.
  advanceExams(ctx);
  advanceEducation(ctx);
  advanceClassLife(ctx);
  // Ce qui se passe dans la cour. `advanceHarassment` d'abord : une situation
  // en cours empire avant qu'on puisse en ouvrir une nouvelle, sans quoi une
  // année pourrait à la fois régler et rouvrir.
  advanceHarassment(ctx);
  rollHarassment(ctx);
  rollWitnessScene(ctx);
  // La saison, après la vie de classe : ce sont les camarades qui composent
  // l'équipe, et il faut donc qu'ils aient été mis à jour.
  advanceSchoolSport(ctx);
  // Les promesses faites aux parents se jugent sur l'année écoulée : il faut
  // donc que la moyenne et le comportement de cette année soient calculés.
  settleConditions(ctx);

  // 5. Carrière et promotions.
  advanceCareer(ctx);

  // 5 bis. Ce qu'on gagne sans employeur : le métier exercé à son compte et
  // l'entreprise qu'on possède. Après la carrière, parce que le temps qui
  // reste dépend du poste occupé ; avant le bilan, pour que ce qui rentre
  // soit imposé comme le reste.
  advanceVentures(ctx);

  // 5 ter. Ce que le public sait de toi. Après le métier et l'entreprise,
  // parce que ce sont eux qui rendent connu ; avant le bilan, pour que les
  // cachets soient imposés comme le reste.
  advanceFame(ctx);

  // 5 quater. Les métiers de scène. Après la notoriété, parce que ce qu'on
  // vous propose l'année prochaine dépend du nom que vous avez ce soir ;
  // avant le bilan, pour que les cachets soient imposés comme le reste.
  advanceStage(ctx);

  // 5 quinquies. Servir. Après la scène, parce qu'une maison ne recrute pas
  // sur la notoriété ; avant le bilan, pour que la solde et les primes
  // soient imposées comme le reste. C'est aussi ici qu'on peut mourir en
  // mission — la vérification de survie qui suit s'en aperçoit.
  advanceService(ctx);

  // 5 sexies. La tribune. Après la scène, parce que c'est le métier politique
  // acquis là-bas qui décide de ce à quoi on peut se présenter ; avant le
  // bilan, pour que l'indemnité soit imposée comme le reste. C'est aussi ici
  // que se tient le scrutin, à la fin de l'année de candidature.
  advancePolitics(ctx);
  // La couronne après la tribune : un mandat public est l'un des services
  // qui ouvrent l'anoblissement, et il doit être enregistré avant qu'on juge.
  advanceRoyalty(ctx);

  // Les objets de famille : une année de plus dans un tiroir. Ils vieillissent
  // qu'on s'en occupe ou non, et c'est ce qui rend le fait de s'en occuper un
  // choix plutôt qu'une formalité.
  advanceHeirlooms(ctx);

  // 6. Patrimoine : biens, véhicules, objets de valeur, placements. Les
  // cours passent avant le bilan, pour que l'année financière voie la même
  // valeur que celle affichée au joueur.
  advanceMarkets(ctx);
  advancePortfolio(ctx);
  advanceProperties(ctx);
  advanceVehicles(ctx);
  advanceValuables(ctx);
  advancePets(ctx);

  // 7. Santé.
  rollNewIllness(ctx);
  advanceDiseases(ctx);

  // 8. Détention — puis la cavale, qui est l'autre façon de purger une peine.
  advancePrison(ctx);
  advanceFugitive(ctx);

  // 8 ter. Le milieu : la chaleur retombe, les dossiers avancent, la maison
  // monte ou tombe. Après la détention, parce qu'un dossier ne court pas
  // contre quelqu'un qu'on tient déjà.
  advanceUnderworld(ctx);

  // 8 bis. La personnalité : intérêts, habitudes, peurs, ambitions, estime
  // de soi. Elle est mise à jour après les événements de l'année, pour que
  // ceux-ci comptent, et avant le bilan, pour que les habitudes soient payées.
  updatePersonality(ctx, {
    signals: exposureSignals(state),
    success: yearSuccess(state),
    warmth: perceivedWarmth(state),
    pressure: p.origin.pressure,
  });

  // 9. Bilan financier annuel.
  runAnnualFinance(ctx);

  // 10. Successions ouvertes par les décès de l'étape 2.
  for (const npc of deceased) {
    handleRelativeDeath(ctx, npc);
  }

  // 11. Événements aléatoires contextuels.
  rollRandomEvents(ctx);
  queueSystemPrompts(ctx);

  // 12. Marchés de l'année suivante.
  refreshMarkets(ctx);

  // 13. Décès du joueur.
  const cause = checkPlayerDeath(ctx);
  if (cause) {
    return { ...killPlayer(ctx, cause), entries: ctx.entries, pending: [] };
  }

  // Journal d'anniversaire, discret mais utile pour rythmer la timeline.
  if (p.age % 10 === 0 && p.age > 0) {
    ctx.log('life', `Tu as ${p.age} ans.`, 'neutral');
  }

  return {
    entries: ctx.entries,
    pending: [...state.pending],
    died: false,
    deathCause: null,
    estate: [],
  };
}

/** Ajoute les sollicitations générées par les systèmes (hors bibliothèque). */
function queueSystemPrompts(ctx: Ctx0): void {
  const { state } = ctx;
  const p = state.player;

  // Le conjoint demande explicitement un enfant.
  if (Number(p.flags.partnerWantsChild ?? 0) === state.year) {
    p.flags.partnerWantsChild = 0;
    const partner = Object.values(state.npcs).find((x) => x.alive && x.relation === 'spouse');
    if (partner) {
      state.pending.push({
        id: ctx.id('ev'),
        eventId: 're_partner_wants_child',
        title: 'Une conversation sérieuse',
        text: `${partner.firstName} veut un enfant. Pas un jour, pas plus tard : maintenant.`,
        choices: [
          { label: 'Dire oui', outcome: '0' },
          { label: 'Demander du temps', outcome: '1' },
          { label: 'Dire non, définitivement', outcome: '2' },
        ],
        personId: partner.id,
        icon: '👶',
      });
    }
  }

  // Rappel de procès en attente.
  if (typeof p.flags.pendingTrial === 'string' && p.flags.pendingTrial) {
    ctx.log('justice', 'Ton procès approche : choisis un avocat depuis le menu Justice.', 'bad');
  }

  // Une affaire à laquelle on n'a pas répondu se règle toute seule au bout
  // d'un an — par le silence, qui est rarement le meilleur choix. Il faut
  // donc que le joueur sache qu'elle est là.
  const scandal = openScandal(state);
  if (scandal && scandal.year === state.year) {
    const kind = SCANDAL_KINDS.find((k) => k.id === scandal.kindId);
    ctx.log('random', `${kind?.headline ?? 'Une affaire'} : il va falloir décider quoi en dire, depuis « Ton nom ».`, 'bad');
  }
}

type Ctx0 = ReturnType<typeof createCtx>;

/** Met fin à la partie et règle la succession. */
export function killPlayer(ctx: Ctx0, cause: string): Omit<YearResult, 'entries' | 'pending'> {
  const { state } = ctx;
  const p = state.player;
  p.alive = false;
  p.deathCause = cause;
  p.deathYear = state.year;
  state.gameOver = true;

  ctx.log('death', `Tu es mort${p.sex === 'F' ? 'e' : ''} à ${p.age} ans, ${cause}.`, 'bad');
  // Le patrimoine est figé avant répartition : c'est lui qui sera affiché
  // dans le récapitulatif de fin de vie.
  p.flags.finalNetWorth = netWorth(state);
  const estate = settleEstate(ctx);
  for (const share of estate) {
    ctx.log('money', `${share.name} hérite de ${share.amount}.`, 'neutral');
  }
  return { died: true, deathCause: cause, estate };
}

/** Résumé de fin de partie (§20). */
export interface LifeSummary {
  name: string;
  ageAtDeath: number;
  cause: string;
  netWorth: number;
  topJob: string;
  education: string;
  partners: number;
  children: number;
  arrests: number;
  convictions: number;
  yearsInPrison: number;
  properties: number;
  vehicles: number;
  followers: number;
  /** Le plus haut niveau de notoriété atteint, et ce pour quoi. */
  famePeak: number;
  fameField: string;
  finalStats: GameState['player']['stats'];
  highlights: TimelineEntry[];
  estate: EstateShare[];
  score: number;
  /**
   * Le titre de la vie, et les autres qu'elle a mérités.
   *
   * Le score seul ne racontait rien : deux vies opposées pouvaient le
   * partager. Le titre relit la vie entière et en nomme la forme.
   */
  ribbon: Award;
  /** Deux ou trois phrases sur ce qu'aura été cette vie. */
  epitaph: string;
}

export function buildSummary(state: GameState, estate: EstateShare[], worth: number): LifeSummary {
  const p = state.player;
  const npcs = Object.values(state.npcs);
  const children = npcs.filter((x) => x.relation === 'son' || x.relation === 'daughter').length;
  const partners = npcs.filter((x) => ['spouse', 'partner', 'ex'].includes(x.relation)).length;
  const yearsInPrison = p.criminalRecord.convictions.reduce((s, c) => s + c.sentenceYears, 0);
  const topJob = p.careerHistory.length
    ? p.careerHistory[p.careerHistory.length - 1].title
    : 'Sans profession';

  const highlights = state.timeline
    .filter((e) => e.tone !== 'neutral' && ['life', 'love', 'work', 'family', 'death', 'justice', 'school', 'money'].includes(e.kind))
    .slice(-14);

  // Score composite : longévité, patrimoine, accomplissements, relations.
  const score = Math.round(
    p.age * 8
    + Math.log10(Math.max(1, worth)) * 90
    + p.education.degrees.length * 55
    + children * 40
    + (p.stats.happiness + p.stats.karma) * 2
    + p.careerHistory.length * 18
    + p.fame.peak * 2.5 - p.fame.controversy * 1.5
    - p.criminalRecord.convictions.length * 30,
  );

  return {
    ribbon: awardRibbon(state),
    epitaph: obituary(state),
    name: fullName(p),
    ageAtDeath: p.age,
    cause: p.deathCause ?? 'de causes inconnues',
    netWorth: worth,
    topJob,
    education: p.education.degrees.length
      ? p.education.degrees[p.education.degrees.length - 1].name
      : 'Aucun diplôme',
    partners,
    children,
    arrests: p.criminalRecord.arrests,
    convictions: p.criminalRecord.convictions.length,
    yearsInPrison,
    properties: p.properties.length,
    vehicles: p.vehicles.length,
    followers: p.followers,
    famePeak: Math.round(p.fame.peak),
    fameField: p.fame.field,
    finalStats: p.stats,
    highlights,
    estate,
    score: Math.max(0, score),
  };
}

/** Espérance de vie estimée, affichée dans le profil. */
export function estimatedLifespan(state: GameState): number {
  return lifeExpectancy(state.player);
}


/**
 * Succès perçu de l'année, entre -1 et +1.
 *
 * Ce n'est pas une mesure objective de réussite : c'est ce que la personne
 * ressent, et c'est cela qui construit ou érode l'estime de soi.
 */
export function yearSuccess(state: GameState): number {
  const p = state.player;
  let score = 0;
  if (p.education.stage !== 'none' && p.education.grades > 0) {
    score += (p.education.grades - 10) / 14;
  }
  if (p.job) {
    score += (p.job.performance - 50) / 130;
  }
  score += (p.stats.happiness - 55) / 190;
  score -= (p.stats.stress - 40) / 200;
  if (p.origin.finance.financialStress > 70) score -= 0.15;
  return Math.max(-1, Math.min(1, score));
}

/**
 * Chaleur reçue de l'entourage, 0-100.
 *
 * Additionne ce que donnent réellement les parents présents, les amis proches
 * et le conjoint. C'est l'autre grand moteur de l'estime de soi.
 */
export function perceivedWarmth(state: GameState): number {
  const p = state.player;
  const o = p.origin;
  const parents = o.parents.filter((r) => r.inHousehold);
  const fromParents = parents.length > 0
    ? parents.reduce((sum, r) => sum + r.bond.affection * 0.6 + r.bond.closeness * 0.4, 0) / parents.length
    : 0;

  const friends = Object.values(state.npcs).filter(
    (x) => x.alive && !x.estranged && ['friend', 'bestFriend', 'spouse', 'partner'].includes(x.relation),
  );
  const fromFriends = friends.length > 0
    ? friends.reduce((sum, x) => sum + x.relationship, 0) / friends.length
    : 0;

  // Chez l'enfant, la famille pèse presque tout ; chez l'adulte, elle recule.
  const familyWeight = p.age < 16 ? 0.75 : p.age < 25 ? 0.45 : 0.3;
  return Math.round(fromParents * familyWeight + fromFriends * (1 - familyWeight));
}
