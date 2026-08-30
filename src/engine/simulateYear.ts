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
import { advanceMoonlight } from '../systems/moonlight.ts';
import { advanceCircle } from '../systems/circle.ts';
import { advanceVentures } from '../systems/venture.ts';
import { advanceFame, openScandal } from '../systems/fame.ts';
import { advanceStage } from '../systems/stage.ts';
import { advanceService } from '../systems/service.ts';
import { advancePolitics } from '../systems/politics.ts';
import { advanceRoyalty } from '../systems/royalty.ts';
import { advanceChallenges } from '../systems/challenges.ts';
import { advanceLanguages } from '../systems/languages.ts';
import { advanceUpbringing } from '../systems/upbringing.ts';
import { advanceOccasions } from '../systems/occasions.ts';
import { awardRibbon, obituary, type Award } from '../systems/ribbons.ts';
import { advanceHeirlooms } from '../systems/heirlooms.ts';
import { advanceBeast } from '../systems/beast.ts';
import { advanceBirth } from '../systems/birth.ts';
import { advanceHarassment, rollHarassment, rollWitnessScene } from '../systems/bullying.ts';
import { advanceSchoolSport } from '../systems/schoolSport.ts';
import { advanceExams } from '../systems/exams.ts';
import { SCANDAL_KINDS } from '../data/fame.ts';
import { runAnnualFinance } from '../systems/finance.ts';
import { advanceDiseases, rollNewIllness } from '../systems/health.ts';
import { advanceRecovery } from '../systems/recovery.ts';
import { advanceProperties } from '../systems/properties.ts';
import { advanceVehicles } from '../systems/vehicles.ts';
import { advanceRelationships } from '../systems/relationships.ts';
import { advancePromises } from '../systems/socialActs.ts';
import { advanceLives } from '../systems/lives.ts';
import { advanceGrudges } from '../systems/grudges.ts';
import { advanceSkills } from '../systems/skills.ts';
import { advancePractices } from '../systems/practices.ts';
import { advanceRoots } from '../systems/roots.ts';
import { advanceParenthood } from '../systems/parenthood.ts';
import { advanceWedding } from '../systems/wedding.ts';
import { advanceWake } from '../systems/wake.ts';
import { advanceOffice } from '../systems/office.ts';
import { advanceTrial } from '../systems/justice.ts';
import { advanceDismissal } from '../systems/dismissal.ts';
import { advanceLegacy } from '../systems/legacy.ts';
import { advanceHouse } from '../systems/house.ts';
import { advancePrison } from '../systems/prison.ts';
import { advanceFugitive } from '../systems/escape.ts';
import { advanceMarkets, advancePortfolio } from '../systems/investing.ts';
import { advanceUnderworld } from '../systems/underworld.ts';
import { advanceRoute } from '../systems/route.ts';
import { advanceChildhood } from '../systems/childhood.ts';
import { advancePets, advanceValuables } from '../systems/activities.ts';
import { advanceCompanies } from '../systems/shares.ts';
import { rollRandomEvents } from '../systems/randomEvents.ts';
import { composeYear } from '../systems/composed.ts';
import { checkRecords } from '../systems/palmares.ts';
import { driftAppearance } from '../systems/appearance.ts';
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

  // 1 ter. Les obsèques ouvertes l'an dernier ont lieu, qu'on s'en soit occupé
  // ou non. **Avant les décès de l'étape 2**, sans quoi une nouvelle mort
  // trouverait la place prise et il n'y aurait jamais qu'un seul enterrement
  // par vie.
  advanceWake(ctx);

  // 2. Vieillissement des PNJ (et décès éventuels). Ceux qui comptent ont
  // une vie intérieure : leurs goûts évoluent, et ils les transmettent.
  const deceased = [];
  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive) continue;
    if (npc.psyche) advanceNpcPsyche(ctx.rng, npc);
    if (agePerson(ctx, npc)) deceased.push(npc);
  }

  // 2 bis. Leur vie à eux : ils changent de métier, se marient, ont des
  // enfants, tombent malades, partent vivre ailleurs. Avant les relations,
  // parce que le lien de l'année doit tenir compte de ce qui vient d'arriver
  // — celui qui est parti loin s'éloigne dès cette année-là.
  advanceLives(ctx);

  // 3. Évolution des relations et initiatives des PNJ.
  advanceRelationships(ctx);
  // Ce qu'on a promis à quelqu'un se vérifie ici : une promesse suivie d'un
  // vrai moment ensemble rapporte, une promesse oubliée coûte le double.
  advancePromises(ctx);

  // 3 bis. Ceux qui vous en veulent. Après les relations, parce qu'une
  // rancune se lit sur ce que la personne pense de vous une fois l'année
  // passée ; et parce qu'un ennemi agit sur les liens que l'année vient de
  // mettre à jour — c'est en montant les autres contre vous qu'il coûte
  // quelque chose, pas en retirant des points.
  advanceGrudges(ctx);

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

  // 4 ter. Ce qu'on sait faire : le métier exercé, les matières où l'on tient
  // la route et les goûts qu'on entretient nourrissent une compétence ; le
  // reste rouille. Après les examens, dont les notes de l'année comptent ;
  // avant la carrière, qui s'appuie dessus pour tenir le poste.
  advanceSkills(ctx);

  // 5. Carrière et promotions.
  // Le deuxième poste d'abord : ce qu'il paie, ce qu'il fatigue et ce que
  // l'employeur principal vient d'en apprendre doivent peser sur l'année de la
  // carrière, et non sur la suivante.
  advanceMoonlight(ctx);
  advanceCareer(ctx);
  // Et ce qu'on a fondé, qui dérive tout seul — avant le bilan financier, parce
  // que la caisse commune se remplit dans l'année.
  advanceCircle(ctx);

  // 5 bis. Ce qu'on gagne sans employeur : le métier exercé à son compte et
  // l'entreprise qu'on possède. Après la carrière, parce que le temps qui
  // reste dépend du poste occupé ; avant le bilan, pour que ce qui rentre
  // soit imposé comme le reste.
  advanceVentures(ctx);

  // 5 bis 2. Ce qu'on tient dans la durée : arts martiaux, régime, lecture,
  // méditation, jardin. Ici et pas ailleurs, pour trois raisons :
  //
  // — **après le métier**, parce que le budget d'attention se calcule sur les
  //   heures réellement travaillées cette année, et qu'une promotion doit
  //   rétrécir la place disponible l'année où elle arrive ;
  // — **avant la remontée** (`advanceRecovery`), pour que l'année de
  //   méditation qu'on vient de tenir compte contre la rechute de cette
  //   année-là, et non de la suivante ;
  // — **avant le bilan financier**, parce qu'une pratique se paie comme le
  //   reste et qu'une année où l'on ne peut plus la payer doit la lâcher.
  //
  // Les trois autres débouchés — le vieillissement, le harcèlement et le
  // bulletin — passent plus tôt dans l'année et lisent donc le grade de
  // **l'an dernier**. C'est voulu et non un oubli : on affronte un harceleur
  // avec la ceinture qu'on avait en entrant dans l'année, pas avec celle
  // qu'on décrochera en décembre.
  advancePractices(ctx);

  // 5 bis 3. D'où l'on vient, quand ce n'est pas d'ici. Après les pratiques et
  // avant la santé : ce que la recherche coûte au foyer doit peser sur
  // l'ambiance de l'année, pas sur celle de la suivante.
  advanceRoots(ctx);

  // 5 bis 4. Le chemin vers un enfant quand il ne vient pas : le protocole de
  // l'an dernier se solde, et le dossier avance d'une étape. Avant le bilan
  // financier, comme tout ce qui se paie ; après le métier, parce que ce que
  // les services regardent inclut ce qu'on gagne.
  advanceParenthood(ctx);

  // 5 bis 5. Et la noce prévue : si celui qu'on devait épouser n'est plus là,
  // elle s'efface. Après les décès de l'étape 2, forcément.
  advanceWedding(ctx);

  /*
   * 5 bis 6. Et ce qui a pu passer par ses mains au bureau. **Après
   * `advanceCareer`**, qui décide des promotions et des licenciements : ce
   * qu'on approche dépend de la place qu'on occupe *cette année-ci*, et une
   * promotion doit élargir la portée l'année où elle arrive. Après
   * `advanceWorkplace` aussi, pour que le supérieur qui regarde soit celui de
   * l'équipe telle qu'elle est. Voir `systems/office.ts`.
   */
  advanceOffice(ctx);

  /*
   * 5 bis 7. Et les affaires auxquelles on n'a pas répondu. Un procès ouvert
   * et jamais instruit laissait le personnage libre indéfiniment, ce qui
   * retirait toute conséquence à se faire prendre.
   */
  advanceTrial(ctx);

  /*
   * 5 bis 8. Et le dossier d'un départ contesté. **Après `advanceCareer`**,
   * qui est l'un des endroits qui licencient : un dossier ouvert cette année
   * ne doit pas être jugé la même année.
   */
  advanceDismissal(ctx);

  /*
   * 5 bis 9. Et le nom dont on a hérité, qui ne fait rien d'autre que
   * s'user. Après les décès de l'étape 2 : un parent disparu cette année
   * doit compter comme disparu.
   */
  advanceLegacy(ctx);

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
  // Les défis en dernier des systèmes de l'année : ils lisent l'état que tous
  // les autres viennent d'écrire, et un défi qui se conclurait avant que
  // l'année soit jouée compterait une étape trop tôt.
  // L'enfance des enfants : ce qu'on leur a donné dans l'année devient ce
  // qu'ils sont. Avant les défis, qui comptent les enfants.
  advanceUpbringing(ctx);
  // Les langues avant les défis : ce qu'on parle décide de ce qu'on obtient,
  // et un défi doit lire l'état une fois qu'il est écrit.
  advanceLanguages(ctx);
  advanceChallenges(ctx);

  // Les objets de famille : une année de plus dans un tiroir. Ils vieillissent
  // qu'on s'en occupe ou non, et c'est ce qui rend le fait de s'en occuper un
  // choix plutôt qu'une formalité.
  advanceHeirlooms(ctx);

  // 6. Patrimoine : biens, véhicules, objets de valeur, placements. Les
  // cours passent avant le bilan, pour que l'année financière voie la même
  // valeur que celle affichée au joueur.
  // La santé des sociétés cotées dérive d'abord : c'est elle qui penche les
  // cours de l'année, et le joueur a décidé sur le rapport de l'an dernier.
  advanceCompanies(ctx);
  advanceMarkets(ctx);
  advancePortfolio(ctx);
  advanceProperties(ctx);
  advanceVehicles(ctx);
  advanceValuables(ctx);
  // L'attention de l'année se solde **avant** le vieillissement : c'est
  // `advanceBeast` qui décide de l'état dans lequel la bête aborde le tirage
  // de fin, et `advancePets` doit lire celui d'aujourd'hui, pas celui d'hier.
  advanceBeast(ctx);
  advancePets(ctx);

  // 7. Santé — puis ce qu'on fait de ce qui tient. La remontée passe après
  // la dérive naturelle appliquée par le vieillissement : elle agit sur ce
  // qu'elle a laissé.
  // Le rattrapage d'une naissance avant terme passe **avant** la dérive et
  // les maladies : c'est une constitution qu'on rend, et l'année doit ensuite
  // travailler sur celle d'aujourd'hui.
  advanceBirth(ctx);
  rollNewIllness(ctx);
  advanceDiseases(ctx);
  advanceRecovery(ctx);

  // 8. Détention — puis la cavale, qui est l'autre façon de purger une peine.
  advancePrison(ctx);
  advanceFugitive(ctx);

  // 8 ter. Le milieu : la chaleur retombe, les dossiers avancent, la maison
  // monte ou tombe. Après la détention, parce qu'un dossier ne court pas
  // contre quelqu'un qu'on tient déjà.
  advanceUnderworld(ctx);
  // La route passe après le milieu : la chaleur que porter attire doit
  // s'ajouter à celle de l'année, et non se faire écraser par elle.
  advanceRoute(ctx);

  /*
   * Et la maison, quand c'est nous qui la dirigeons. **Après
   * `advanceUnderworld` et non avant** : c'est lui qui décide des rangs, donc
   * de qui dirige cette année-ci. Placé plus haut, on aurait dirigé une
   * maison qu'on venait de quitter.
   */
  advanceHouse(ctx);

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
  /*
   * Et une scène composée, liée à quelqu'un de réel. Elle vient après les
   * écrites et ne les remplace pas : mesuré, une vie voyait quatre-vingt-un
   * événements distincts sur cent soixante-neuf écrits, et deux vies se
   * recouvraient à 72,8 %. Ce qui manquait n'était pas l'architecture mais
   * le volume, et le volume ne s'écrit pas à la main.
   */
  /*
   * Et ce que l'année inscrit sur un visage : la carrure suit la forme, les
   * marques viennent de ce qu'on a vécu, et l'allure qu'on tenait redescend
   * si l'on n'y a rien remis. Placé ici, après les événements, pour que la
   * bagarre de l'année compte dans le bilan de l'année.
   */
  driftAppearance(ctx);
  /*
   * Et l'on regarde si cette vie vient de dépasser toutes les précédentes.
   * Au moment où cela arrive, pas à la mort : une vie qui bat le record de
   * fortune à quarante ans doit l'apprendre à quarante ans, et le garder même
   * si elle finit ruinée.
   *
   * **Ce que le palmarès écrit ne compte pas comme une année remplie.** Il
   * commente l'année, il n'en fait pas partie. Sans cette précaution un record
   * battu supprimait l'occasion qui serait venue occuper une année vide — donc
   * le palmarès changeait la partie, ce qu'il n'a pas le droit de faire, et
   * ce que son propre test a refusé.
   */
  const beforeRecords = ctx.entries.length;
  checkRecords(ctx);
  /*
   * On mesure les lignes réellement écrites, et non le nombre de records
   * battus : la première vie les bat tous et n'en annonce aucun — il n'y
   * avait rien à dépasser. Retrancher les seconds retranchait trop, et la
   * première partie recevait alors des occasions que les suivantes
   * n'avaient pas. Le palmarès changeait encore la partie, plus discrètement.
   */
  const recordLines = ctx.entries.length - beforeRecords;
  composeYear(ctx);
  queueSystemPrompts(ctx);

  // 12. Marchés de l'année suivante.
  refreshMarkets(ctx);

  // 13. Décès du joueur.
  const cause = checkPlayerDeath(ctx);
  if (cause) {
    return { ...killPlayer(ctx, cause), entries: ctx.entries, pending: [] };
  }

  // 14. Les occasions, en tout dernier, parce qu'elles ne se posent que si
  // l'année n'a rien produit d'autre. Une mesure sur quatre mille années
  // jouées avait montré où était le trou : quatorze pour cent des années
  // entre six et treize ans ne produisaient aucune ligne.
  advanceOccasions(ctx, ctx.entries.length - recordLines);

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
