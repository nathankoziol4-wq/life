/**
 * Ce qu'une société publie, et ce que le cours n'a pas encore vu.
 *
 * **Ce que ce fichier règle.** Le catalogue disait : « les supports sont des
 * indices abstraits : aucune société n'a de nom ni d'histoire ». On
 * répartissait entre des classes — un fonds, un panier, un jeton — et l'on
 * attendait. Il n'y avait rien à comprendre, donc rien à faire de mieux que
 * répartir.
 *
 * **Une société a une santé, et le cours la suit avec du retard.** C'est tout
 * le système, et c'est une idée simple : ce qui est déjà arrivé est dans le
 * prix ; ce qui est en train d'arriver n'y est pas encore. Chaque société tient
 * une santé cachée qui dérive d'une année sur l'autre, et le cours de l'année
 * suivante penche du côté où cette santé est allée.
 *
 * **Ce qu'elle publie ne se vaut donc pas.** Un rapport mêle deux natures de
 * faits : ceux qui décrivent ce qui s'est déjà produit — le titre a monté, la
 * direction s'est augmentée, on en dit du bien — et ceux qui décrivent ce qui
 * est en train de se produire : le carnet se remplit, la marge s'effrite, trois
 * dirigeants sont partis. Les premiers sont les plus faciles à lire et
 * n'apprennent rien de ce qui vient. Les seconds sont le jeu.
 *
 * **Et c'est là que la culture financière sert enfin à quelque chose.** Elle
 * ne donne aucun rendement : elle décide combien de faits on lit, et à partir
 * de quel niveau le rapport dit lesquels regardent devant. Quelqu'un qui n'y
 * connaît rien voit un fait sur trois et ne sait pas de quelle nature il est.
 *
 * **Acheter une société sans la lire est pire que d'acheter le panier.** Une
 * part seule est plus agitée qu'un panier — c'est le prix de la
 * concentration — et si l'on ne prend pas l'information qui va avec, on prend
 * le risque sans la contrepartie. Un test le mesure.
 *
 * **Tout est fictif** : ni société réelle, ni marché réel, ni conseil. Ce
 * fichier décrit un jeu.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { GameState } from '../engine/types.ts';
import {
  COMPANIES, FACTS, assetIdOf, companyOfAsset, getCompany, getFact,
  type CompanyDef, type FactDef,
} from '../data/companies.ts';
import { literacy, marketOf } from './investing.ts';

/** La santé de départ d'une société, avant toute dérive. */
export const BASE_HEALTH = 50;

/** Combien de faits un rapport contient, au plus. */
export const FACTS_PER_REPORT = 3;

/** Ce que la santé d'une société pèse sur son cours de l'année suivante. */
export const HEALTH_PULL = 0.6;

/* ------------------------------------------------------------------ */
/* La santé                                                            */
/* ------------------------------------------------------------------ */

/** La santé cachée d'une société, de 0 à 100. */
export function healthOf(state: GameState, companyId: string): number {
  return state.world.companyHealth?.[companyId] ?? BASE_HEALTH;
}

/** De combien elle a bougé l'an dernier. */
export function healthMove(state: GameState, companyId: string): number {
  return state.world.companyMove?.[companyId] ?? 0;
}

/**
 * Faire dériver la santé de chaque société.
 *
 * Appelé **avant** que les cours ne bougent : la santé de cette année décide
 * du cours de cette année, ce qui est exactement le décalage qu'on veut. Le
 * joueur, lui, a lu le rapport de l'année précédente.
 */
export function advanceCompanies(ctx: Ctx): void {
  const { state, rng } = ctx;
  const w = state.world;
  w.companyHealth ??= {};
  w.companyMove ??= {};
  w.companyLag ??= {};
  for (const company of COMPANIES) {
    const before = healthOf(state, company.id);
    /*
     * **Le cours retarde d'un an sur la santé, et c'est tout le système.**
     *
     * Premier jet : la santé de l'année poussait le cours de la même année.
     * Mesuré sur cent parties et quarante ans, lire ce qui regarde devant
     * rapportait alors 7,6 % là où lire ce qui regarde derrière rapportait
     * 9,9 % — l'inverse exact de ce que le système prétend enseigner. La
     * cause : sans décalage, ce que le rapport annonçait était déjà dans le
     * prix au moment où on le lisait, tandis que le cours de l'an dernier,
     * lui, révélait encore une santé qui dure. On garde donc la santé de
     * l'année précédente pour pousser le cours de celle-ci : le rapport que
     * le joueur a sous les yeux parle d'une santé que le marché n'a pas
     * encore payée.
     */
    w.companyLag[company.id] = before;
    /*
     * Une société revient lentement vers l'ordinaire — sans quoi les meilleures
     * resteraient les meilleures pour toujours et il n'y aurait plus rien à
     * lire au bout de dix ans. La conjoncture pousse tout le monde dans le
     * même sens, ce qui est aussi vrai des vraies difficultés que des vraies
     * embellies.
     */
    const pullToMiddle = (BASE_HEALTH - before) * 0.18;
    const weather = w.economy * 6;
    const own = rng.gauss(0, 13, -34, 34);
    const after = clamp(before + pullToMiddle + weather + own, 3, 97);
    w.companyHealth[company.id] = after;
    w.companyMove[company.id] = after - before;
  }
}

/**
 * Ce que la santé d'une société ajoute à son cours, en fraction d'écart-type.
 *
 * Rapporté à l'agitation du support, comme les nouvelles de marché : une même
 * santé pèse alors partout la même fraction du hasard, et une grande maison
 * calme n'est pas décidée par un signal qui se perdrait dans une jeune pousse.
 */
export function healthPull(state: GameState, assetId: string): number {
  const company = companyOfAsset(assetId);
  if (!company) return 0;
  // La santé d'il y a un an, pas celle d'aujourd'hui : voir le décalage
  // expliqué dans `advanceCompanies`.
  const health = state.world.companyLag?.[company.id] ?? BASE_HEALTH;
  return ((health - BASE_HEALTH) / 50) * HEALTH_PULL;
}

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

/** Un tirage stable : le rapport ne change pas si l'on rouvre la feuille. */
function draw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Combien de faits le personnage sait lire dans un rapport. */
export function factsRead(state: GameState): number {
  const level = literacy(state);
  if (level >= 62) return FACTS_PER_REPORT;
  if (level >= 38) return 2;
  return 1;
}

/**
 * Sait-on distinguer ce qui regarde devant de ce qui regarde derrière ?
 *
 * C'est le seul endroit du jeu où la culture financière donne une information
 * plutôt qu'un droit d'achat. En dessous, on lit les mêmes phrases sans savoir
 * lesquelles comptent.
 */
export function readsAhead(state: GameState): boolean {
  return literacy(state) >= 55;
}

/**
 * Le rapport d'une société, tel qu'il se lit cette année.
 *
 * Les faits sortent de l'état réel de la société : le sens d'un fait d'avenir
 * suit le mouvement de sa santé, le sens d'un fait de passé suit le mouvement
 * de son cours. C'est ce qui les rend utiles ou inutiles, et non une étiquette
 * posée dessus.
 */
export function reportFor(state: GameState, company: CompanyDef): FactDef[] {
  const key = Number(state.seed) + state.year * 733 + company.id.length * 97
    + company.id.charCodeAt(0) * 13;
  const move = healthMove(state, company.id);
  const quote = marketOf(state, assetIdOf(company)).lastChange;

  /*
   * **Ce qui regarde devant suit le niveau, pas le mouvement.**
   *
   * C'est le niveau de santé qui poussera le cours l'an prochain. Le
   * mouvement, lui, revient vers l'ordinaire — une santé qui vient de bondir
   * a plutôt tendance à redescendre — si bien qu'un fait calé sur le
   * mouvement annonçait exactement le contraire de ce qui allait arriver.
   */
  const health = healthOf(state, company.id);
  const wantAhead: 1 | -1 = health >= BASE_HEALTH ? 1 : -1;
  const wantPast: 1 | -1 = quote >= 0 ? 1 : -1;

  const pool = (kind: FactDef['kind'], way: 1 | -1) => FACTS
    .filter((f) => f.kind === kind && f.way === way);

  const out: FactDef[] = [];
  /*
   * **Un rapport parle toujours au moins une fois de l'avenir**, sans quoi il
   * n'y aurait rien à trouver et lire ne servirait à rien. Il parle aussi du
   * passé, parce que c'est ce dont on parle le plus et que le jeu consiste à
   * ne pas s'y arrêter.
   */
  const ahead = pool('avenir', wantAhead);
  const past = pool('passé', wantPast);
  const pick = (list: FactDef[], salt: number) => list[Math.floor(draw(key, salt) * list.length) % list.length];

  // L'ordre est tiré lui aussi : le fait d'avenir n'est pas toujours le premier,
  // sinon la position suffirait à le reconnaître et il n'y aurait rien à savoir.
  const first = draw(key, 5) < 0.5;
  const aheadFact = pick(ahead, 11);
  const pastFact = pick(past, 23);
  if (first) out.push(aheadFact, pastFact);
  else out.push(pastFact, aheadFact);

  // Le troisième fait est un second regard vers l'avenir, ou un second vers le
  // passé : c'est ce qui empêche de compter les faits pour deviner.
  // Le troisième fait suit le mouvement récent plutôt que le niveau : il est
  // vrai, il regarde devant, et il n'annonce pourtant pas la même chose. C'est
  // ce qui empêche de compter les faits d'avenir pour se décider sans les lire.
  const third = draw(key, 31) < 0.5
    ? pick(pool('avenir', move >= 0 ? 1 : -1), 41)
    : pick(pool('passé', wantPast), 43);
  if (third && !out.includes(third)) out.push(third);

  return out.slice(0, FACTS_PER_REPORT);
}

/** Ce que le joueur voit vraiment du rapport, selon ce qu'il sait. */
export function visibleReport(state: GameState, company: CompanyDef): FactDef[] {
  return reportFor(state, company).slice(0, factsRead(state));
}

/**
 * Ce qu'un lecteur attentif conclut d'un rapport, s'il sait lire.
 *
 * Exporté pour les tests et pour eux seuls : l'écran ne s'en sert pas. Faire à
 * la place du joueur la seule chose que ce système lui demande viderait le
 * système. Rend +1, −1, ou 0 quand le rapport ne penche pas.
 */
export function verdict(state: GameState, company: CompanyDef, ahead = true): number {
  const facts = visibleReport(state, company);
  const kept = ahead ? facts.filter((f) => f.kind === 'avenir') : facts.filter((f) => f.kind === 'passé');
  const sum = kept.reduce((n, f) => n + f.way, 0);
  return Math.sign(sum);
}

/** Les sociétés, pour l'écran. */
export function companies(): CompanyDef[] {
  return COMPANIES;
}

export { getCompany, getFact, assetIdOf, companyOfAsset };
