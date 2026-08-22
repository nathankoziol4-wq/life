/**
 * Les placements, et ce qu'on en apprend.
 *
 * Quatre idées structurent ce fichier.
 *
 * **Un cours n'est pas un tirage.** Les prix vivent dans le monde, d'une
 * année sur l'autre, et se souviennent d'où ils viennent. Un fonds qui a
 * perdu quarante pour cent ne repart pas de zéro l'année suivante : il repart
 * de moins quarante, et c'est là qu'on décide si on tient ou si on vend.
 *
 * **Aucun support n'écrase un autre à court terme.** Une médiane plus haute
 * se paie toujours quelque part — un plancher plus bas, un blocage, un ticket
 * plus gros, des frais. Un test le vérifie sur six ans, l'horizon auquel un
 * joueur décide vraiment. Sur quarante ans, en revanche, le risque paie : le
 * jeu récompense d'avoir commencé tôt, pas d'avoir été téméraire.
 *
 * **La diversification est la seule chose gratuite du système.** Les supports
 * ne bougent pas ensemble — certains montent quand les autres tombent — si
 * bien que répartir réduit la casse sans réduire la pente. C'est aussi
 * vérifié par un test, sur des portefeuilles de même mise.
 *
 * **Comprendre s'apprend, et surtout se paie.** Le personnage a une culture
 * financière qui décide de ce qu'il peut acheter et de ce qu'il voit avant
 * d'acheter. Elle monte avec les études et l'expérience — et d'un coup après
 * une perte sèche, parce que c'est ainsi qu'on apprend.
 */

import { Rng, clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, AssetMarket, GameState, Holding } from '../engine/types.ts';
import { ASSETS, getAsset, type AssetDef } from '../data/assets.ts';
import { NEWS } from '../data/marketNews.ts';
import { getCountry } from '../data/countries.ts';

/** Base de tous les cours au premier jour. */
const BASE_PRICE = 100;

/* ------------------------------------------------------------------ */
/* Le marché                                                           */
/* ------------------------------------------------------------------ */

/** Cours de départ, à la naissance. */
export function initialAssetPrices(): Record<string, AssetMarket> {
  const out: Record<string, AssetMarket> = {};
  for (const asset of ASSETS) {
    out[asset.id] = {
      price: BASE_PRICE, history: [BASE_PRICE], lastChange: 0, crashed: false,
    };
  }
  return out;
}

/**
 * Fait passer une année sur les cours.
 *
 * Trois termes, et un seul est partagé : la conjoncture. C'est ce qui fait
 * que tout tombe en même temps lors d'une récession — et donc que le seul
 * abri est un support dont le `beta` est négatif, pas un support prudent.
 */
export function advanceMarkets(ctx: Ctx): void {
  const { state, rng } = ctx;
  const w = state.world;
  w.assetPrices ??= initialAssetPrices();

  /*
   * **Ce qui s'est dit l'an dernier agit cette année.**
   *
   * `state.year` a déjà été incrémenté quand on arrive ici : les nouvelles à
   * appliquer sont donc celles de l'année qu'on vient de quitter, c'est-à-dire
   * exactement celles que le joueur avait sous les yeux au moment de décider.
   * Prendre `state.year` rendrait le signal inutilisable — il annoncerait ce
   * qui vient déjà de se produire.
   */
  const pulls = new Map<string, number>();
  for (const item of newsAt(state, state.year - 1)) {
    pulls.set(item.assetId, (pulls.get(item.assetId) ?? 0) + item.pull);
  }

  for (const asset of ASSETS) {
    const market = (w.assetPrices[asset.id] ??= {
      price: BASE_PRICE, history: [BASE_PRICE], lastChange: 0, crashed: false,
    });

    // On compose en logarithme, et ce n'est pas un détail d'implémentation.
    // Additionner directement des pourcentages annuels donne un résultat
    // faux dans le mauvais sens : perdre trente pour cent puis en reprendre
    // trente ne ramène pas au point de départ, si bien qu'un support très
    // agité finissait *toujours* ruiné, quelle que soit sa pente. Les jetons
    // et les projets tombaient à zéro dans cent parties sur cent — un pari
    // qu'on ne peut pas gagner n'est pas un pari.
    const inflationDrag = 0.018 + w.economy * 0.006;
    let growth = Math.log(1 + asset.drift)
      - inflationDrag * (1 - asset.beta * 0.35)
      // Le terme partagé, et c'est le plus important du fichier : c'est lui
      // qui fait tomber tout le marché en même temps, donc lui qui donne un
      // sens à répartir. Trop faible, la diversification ne servait à rien
      // parce que rien n'était corrélé à rien.
      + w.economy * asset.beta * 0.17
      /*
       * Ce qui se disait penche le cours, **à la mesure de l'agitation du
       * support**.
       *
       * Premier jet : la nouvelle ajoutait sa valeur telle quelle. Mesuré,
       * cela donnait 80 % d'accord entre le sens annoncé et le sens obtenu —
       * une recette, pas un signal. La cause tient au rapport des deux
       * termes : sur un livret dont le bruit propre vaut 0,004, une poussée
       * de 0,05 décide de tout ; sur un jeton à 0,5, la même poussée ne se
       * voit pas. Le même texte valait donc certitude ici et rien du tout là.
       *
       * En rapportant la poussée à l'écart-type du support, une nouvelle
       * pèse partout la même fraction du hasard : elle penche, elle ne
       * décide pas, et elle le fait autant sur le calme que sur l'agité.
       */
      + (pulls.get(asset.id) ?? 0) * asset.volatility
      + rng.gauss(0, asset.volatility, -3, 3);

    const crashed = rng.chance(asset.crashRisk * (1 + Math.max(0, -w.economy) * 0.8));
    // Un décrochage retire une fraction de la valeur, pas un nombre de points :
    // c'est ce qui rend un support risqué réellement dangereux sans le
    // condamner d'avance.
    if (crashed) growth += Math.log(1 - (0.22 + rng.next() * Math.min(0.6, asset.volatility)));

    const change = clamp(Math.exp(growth) - 1, -0.95, 4);
    market.price = Math.max(0.5, market.price * (1 + change));
    market.lastChange = change;
    market.crashed = crashed;
    market.history.push(Math.round(market.price * 100) / 100);
    if (market.history.length > 20) market.history.shift();
  }
}

export function marketOf(state: GameState, assetId: string): AssetMarket {
  const prices = (state.world.assetPrices ??= initialAssetPrices());
  return (prices[assetId] ??= {
    price: BASE_PRICE, history: [BASE_PRICE], lastChange: 0, crashed: false,
  });
}

/** Prix d'une part, exprimé dans la monnaie du pays et de l'époque. */
export function unitPrice(state: GameState, asset: AssetDef): number {
  const country = getCountry(state.player.countryId);
  return marketOf(state, asset.id).price * country.salaryIndex * state.world.inflation;
}

/** Ticket d'entrée du support, à l'échelle du pays et de l'époque. */
export function minimumTicket(state: GameState, asset: AssetDef): number {
  const country = getCountry(state.player.countryId);
  return Math.round(asset.minimum * country.salaryIndex * state.world.inflation);
}

/* ------------------------------------------------------------------ */
/* Le portefeuille                                                     */
/* ------------------------------------------------------------------ */

export function holdingsOf(state: GameState): Holding[] {
  return (state.player.holdings ??= []);
}

/** Ce que vaut une ligne aujourd'hui. */
export function holdingValue(state: GameState, holding: Holding): number {
  const asset = getAsset(holding.assetId);
  if (!asset) return 0;
  return Math.round(holding.units * unitPrice(state, asset));
}

/** Ce que la ligne a coûté. */
export function holdingCost(holding: Holding): number {
  return Math.round(holding.units * holding.costBasis);
}

/** Valeur totale du portefeuille. */
export function portfolioValue(state: GameState): number {
  return holdingsOf(state).reduce((sum, h) => sum + holdingValue(state, h), 0);
}

/** Plus ou moins-value latente, en monnaie. */
export function unrealizedGain(state: GameState): number {
  return holdingsOf(state).reduce(
    (sum, h) => sum + holdingValue(state, h) - holdingCost(h), 0,
  );
}

/**
 * Concentration du portefeuille, 0-1.
 *
 * Zéro veut dire « réparti sur tout ce qui existe », un veut dire « tout au
 * même endroit ». C'est la somme des carrés des parts : elle punit une grosse
 * ligne bien plus qu'elle ne récompense trois petites, ce qui est exactement
 * ce qu'on veut faire sentir.
 */
export function concentration(state: GameState): number {
  const total = portfolioValue(state);
  if (total <= 0) return 0;
  return holdingsOf(state).reduce((sum, h) => {
    const share = holdingValue(state, h) / total;
    return sum + share * share;
  }, 0);
}

/** L'année à partir de laquelle une ligne redevient vendable. */
export function unlockYear(holding: Holding): number {
  return holding.boughtYear + (getAsset(holding.assetId)?.lockYears ?? 0);
}

export function isLocked(state: GameState, holding: Holding): boolean {
  return state.year < unlockYear(holding);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on comprend                                                   */
/* ------------------------------------------------------------------ */

/**
 * Ce que le personnage comprend aux placements.
 *
 * Elle ne s'achète pas et ne se règle pas : elle vient des études, du métier,
 * de ce qu'on a déjà fait — et d'un bond après une perte sèche, parce que
 * c'est ainsi qu'on apprend vraiment.
 */
export function literacy(state: GameState): number {
  return clampStat(state.player.financialLiteracy ?? 0);
}

/** Pourquoi ce support est hors de portée, le cas échéant. */
export function assetBlocker(state: GameState, asset: AssetDef): string | null {
  const p = state.player;
  if (p.age < 16) return 'Il faut être majeur, ou presque.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Il faudrait un nom et un compte. Tu n’as ni l’un ni l’autre.';
  if (literacy(state) < asset.literacy) {
    return `Tu ne comprends pas ce que c’est. Commence par plus simple.`;
  }
  if (p.money < minimumTicket(state, asset)) {
    return `Il en faut au moins ${minimumTicket(state, asset)}.`;
  }
  return null;
}

/**
 * Ce que le joueur voit avant d'acheter.
 *
 * Un novice lit une phrase, quelqu'un qui s'y connaît lit la pente et le
 * risque. C'est le même principe que la jauge cachée des mini-jeux : le
 * personnage ne joue pas à la place du joueur, il lui donne de la lumière.
 */
export function assetInsight(state: GameState, asset: AssetDef): {
  risk: string;
  horizon: string;
  detail: string | null;
} {
  const known = literacy(state);
  const risk = asset.volatility > 0.5 ? 'très agité'
    : asset.volatility > 0.2 ? 'agité'
      : asset.volatility > 0.08 ? 'calme' : 'très calme';
  const horizon = asset.lockYears > 0
    ? `bloqué ${asset.lockYears} an${asset.lockYears > 1 ? 's' : ''}`
    : 'disponible à tout moment';

  if (known < 30) return { risk, horizon, detail: null };
  const shelter = asset.beta < 0
    ? 'monte quand le reste tombe'
    : asset.beta > 1.2 ? 'amplifie la conjoncture' : 'suit la conjoncture';
  return {
    risk,
    horizon,
    detail: `${shelter} · décrochage ${Math.round(asset.crashRisk * 100)} % par an`
      + ` · frais ${(asset.fee * 100).toFixed(1)} %`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qui se dit                                                       */
/* ------------------------------------------------------------------ */

/** Une nouvelle de l'année, telle que le moteur la connaît. */
export interface MarketNews {
  id: string;
  assetId: string;
  text: string;
  /** Ce que ça fera vraiment au cours. Le joueur ne le lit jamais tel quel. */
  pull: number;
}

/**
 * Un tirage **indépendant de celui de la partie**.
 *
 * Ajouter des tirages dans `ctx.rng` décalerait toute la suite du hasard :
 * les mêmes graines ne donneraient plus les mêmes vies, les vingt-huit
 * sauvegardes fabriquées changeraient de personnage, et le témoin de parité
 * — trois mille quatre cents entrées — deviendrait illisible d'un coup. Le
 * jeu n'aurait pas changé, la mesure si.
 *
 * Les nouvelles sont donc dérivées de la graine, de l'année et du support :
 * reproductibles, vérifiables, et sans effet sur quoi que ce soit d'autre.
 */
function newsRng(state: GameState, year: number, salt: number): Rng {
  const seed = Math.imul(state.seed ^ (year * 0x9e37_79b9), 0x85eb_ca6b) ^ salt;
  return new Rng({ rngState: seed | 0 });
}

/**
 * Ce qui se dit pendant l'année `year`, et qui agira sur l'année suivante.
 *
 * Trois nouvelles par an, sur trois supports différents : assez pour qu'il y
 * ait quelque chose à lire, trop peu pour couvrir le marché — savoir sur quoi
 * on n'a aucune information fait partie de l'information.
 */
export function newsAt(state: GameState, year: number): MarketNews[] {
  const out: MarketNews[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const rng = newsRng(state, year, i * 7919);
    // On tire parmi les supports encore libres, sinon deux nouvelles
    // pourraient porter sur le même et l'une écraserait la lecture de l'autre.
    /*
     * **Certains supports n'ont pas de nouvelles qui vaillent.**
     *
     * Sur un livret, l'écart-type propre vaut 0,004 quand l'érosion des prix
     * en retire 0,018 : le sens de l'année est décidé d'avance, et aucune
     * phrase ne peut le retourner. Mesuré, le sens annoncé et le sens obtenu
     * s'y accordaient à **39 %** — la nouvelle y était *anti*-prédictive,
     * puisqu'elle promettait une hausse sur un support qui baisse presque
     * toujours. Mieux vaut n'en publier aucune que d'en publier une fausse.
     */
    const pool = ASSETS.filter((a) => !taken.has(a.id) && a.volatility >= 0.02);
    if (pool.length === 0) break;
    const asset = pool[rng.int(0, pool.length - 1)]!;
    taken.add(asset.id);
    const list = NEWS[asset.klass];
    const item = list[rng.int(0, list.length - 1)]!;
    out.push({
      id: `${year}_${asset.id}`, assetId: asset.id, text: item.text, pull: item.pull,
    });
  }
  return out;
}

/** Ce qui se dit cette année, du point de vue du joueur. */
export function newsFor(state: GameState): MarketNews[] {
  return newsAt(state, state.year);
}

/**
 * Ce que le joueur arrive à lire d'une nouvelle.
 *
 * Le fait est certain ; la lecture ne l'est pas. Sous trente, on voit qu'il
 * se passe quelque chose sans savoir de quel côté — et c'est honnête, pas
 * punitif : la phrase est là, elle se lit, seul le sens échappe. Au-delà de
 * soixante-dix, on lit la force en plus du sens.
 *
 * Le brouillage est **déterministe** : relire la même nouvelle ne donne pas
 * une autre réponse. Sans cela, il suffirait de fermer la feuille et de la
 * rouvrir jusqu'à tomber sur la bonne.
 */
export function readNews(state: GameState, item: MarketNews): string {
  const known = literacy(state);
  if (known < 30) return 'Tu n’en tires rien de précis.';

  // Entre 30 et 70, le sens est lu, mais pas toujours le bon : la même
  // nouvelle est mal comprise une fois sur trois à 30, presque jamais à 70.
  const wrongOdds = Math.max(0, (70 - known) / 40) * 0.34;
  const flip = newsRng(state, 0, item.id.length * 31 + item.text.length).next() < wrongOdds;
  const seen = flip ? -item.pull : item.pull;

  const way = seen > 0 ? 'plutôt bon' : 'plutôt mauvais';
  if (known < 70) return `Pour ce support, ${way} — à ton avis.`;
  // Les seuils sont en écarts-types, comme les poussées : un demi sigma est
  // le maximum du catalogue, un cinquième la moyenne.
  const force = Math.abs(seen) > 0.38 ? 'très marqué'
    : Math.abs(seen) > 0.18 ? 'net' : 'léger';
  return `Pour ce support : ${way}, effet ${force}.`;
}

/** Ce que coûte un avis extérieur. */
export function adviceCost(state: GameState): number {
  return Math.max(120, Math.round(portfolioValue(state) * 0.012));
}

/** Pourquoi l'on ne peut pas consulter, le cas échéant. */
export function adviceBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.prison) return 'Personne ne prend rendez-vous ici.';
  if (Number(p.yearActions.advice ?? 0) >= 1) return 'Tu l’as déjà consulté cette année.';
  if (p.money < adviceCost(state)) return `Il te faudrait ${adviceCost(state)}.`;
  return null;
}

/**
 * L'avis de quelqu'un dont c'est le métier.
 *
 * Il ne se trompe pas sur le sens, et c'est ce qu'on paie. Mais il vit de ce
 * qu'il place : sur un support à frais élevés, il **appuie** — le sens reste
 * juste, la force est exagérée. Le joueur peut s'en apercevoir en comparant
 * avec ce que le cours a fait ensuite, et c'est le seul moyen de l'apprendre.
 *
 * On ne fabrique pas ici de méthode transposable : c'est un personnage de jeu
 * qui lit des nouvelles de jeu sur des supports qui n'existent pas.
 */
export function advice(item: MarketNews): string {
  const asset = getAsset(item.assetId);
  const way = item.pull > 0 ? 'favorable' : 'défavorable';
  const pushed = (asset?.fee ?? 0) > 0.01 && item.pull > 0;
  const force = pushed ? 'très marqué'
    : Math.abs(item.pull) > 0.38 ? 'très marqué'
      : Math.abs(item.pull) > 0.18 ? 'net' : 'léger';
  return `${way}, effet ${force}.`;
}

/** A-t-on payé l'avis cette année ? */
export function adviceReady(state: GameState): boolean {
  return Number(state.player.yearActions.advice ?? 0) >= 1;
}

/**
 * Payer pour qu'on vous lise les nouvelles.
 *
 * L'avis vaut pour toute l'année et pour toutes les nouvelles : ce qu'on
 * achète est une lecture, pas un renseignement à l'unité. Une fois par an,
 * sinon il suffirait de repayer jusqu'à obtenir la réponse qui arrange.
 */
export function consult(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const blocker = adviceBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const cost = adviceCost(state);
  p.money -= cost;
  p.yearActions.advice = 1;
  return {
    ok: true,
    title: 'Tu prends l’avis',
    message: 'Il lit les nouvelles de l’année et te dit ce qu’il en pense. '
      + 'Il ne se trompe pas sur le sens — reste à savoir ce qu’il gagne à te '
      + 'pousser dans un sens plutôt que l’autre.',
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* Acheter et vendre                                                   */
/* ------------------------------------------------------------------ */

/** Place `amount` sur un support. */
export function invest(ctx: Ctx, assetId: string, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const asset = getAsset(assetId);
  if (!asset) return { ok: false, message: 'Support inconnu.' };

  const blocker = assetBlocker(state, asset);
  if (blocker) return { ok: false, title: asset.name, message: blocker };

  const spend = Math.min(Math.round(amount), p.money);
  const ticket = minimumTicket(state, asset);
  if (spend < ticket) {
    return { ok: false, title: asset.name, message: `Le ticket minimum est de ${ticket}.` };
  }

  const fees = Math.round(spend * asset.fee);
  const net = spend - fees;
  const price = unitPrice(state, asset);
  const units = net / price;

  p.money -= spend;
  const holdings = holdingsOf(state);
  const existing = holdings.find((h) => h.assetId === assetId);
  if (existing) {
    // Prix de revient moyen : c'est lui qui rend la plus-value honnête quand
    // on renforce une ligne au plus bas.
    const totalCost = existing.units * existing.costBasis + spend;
    existing.units += units;
    existing.costBasis = totalCost / existing.units;
    // Un renforcement rebloque la ligne : on ne contourne pas un blocage en
    // rachetant une part la veille de la revente.
    existing.boughtYear = state.year;
  } else {
    holdings.push({
      assetId, units, costBasis: spend / units, boughtYear: state.year, realized: 0,
    });
  }

  // Placer son argent apprend quelque chose, la première fois surtout.
  p.financialLiteracy = clampStat(literacy(state) + (existing ? 0.6 : 3));

  ctx.log('money', `Placement : ${spend} sur ${asset.name}.`, 'neutral');
  return {
    ok: true, title: asset.name, tone: 'neutral',
    message: `${spend} placés, dont ${fees} de frais.`
      + (asset.lockYears > 0
        ? ` Rien ne sera récupérable avant ${state.year + asset.lockYears}.`
        : ''),
  };
}

/** Revend une fraction d'une ligne, `share` allant de 0 à 1. */
export function divest(ctx: Ctx, assetId: string, share: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const asset = getAsset(assetId);
  const holding = holdingsOf(state).find((h) => h.assetId === assetId);
  if (!asset || !holding) return { ok: false, message: 'Tu ne détiens pas cela.' };

  if (isLocked(state, holding)) {
    return {
      ok: false, title: asset.name,
      message: `Bloqué jusqu’en ${unlockYear(holding)}. C’était le marché.`,
    };
  }

  const part = clamp(share, 0.01, 1);
  const units = holding.units * part;
  const gross = Math.round(units * unitPrice(state, asset));
  const fees = Math.round(gross * asset.fee);
  const cost = Math.round(units * holding.costBasis);
  const gain = gross - fees - cost;

  // L'impôt ne porte que sur la plus-value, et seulement si elle existe.
  const country = getCountry(p.countryId);
  const tax = gain > 0 ? Math.round(gain * country.taxRate * 0.6) : 0;
  const proceeds = gross - fees - tax;

  p.money += proceeds;
  holding.units -= units;
  holding.realized += gain - tax;
  if (holding.units <= 1e-6) {
    p.holdings = holdingsOf(state).filter((h) => h !== holding);
  }

  // Une perte sèche enseigne davantage qu'un gain : c'est peu flatteur, mais
  // c'est la seule façon de faire monter la culture financière autrement
  // qu'en attendant.
  p.financialLiteracy = clampStat(literacy(state) + (gain < 0 ? 4 : 1));
  if (gain < 0) {
    p.stats.stress = clampStat(p.stats.stress + Math.min(12, Math.abs(gain) / Math.max(1, cost) * 25));
  }

  ctx.log('money', `Vente : ${asset.name}, ${gain >= 0 ? '+' : ''}${gain}.`, gain >= 0 ? 'good' : 'bad');
  return {
    ok: true,
    title: asset.name,
    tone: gain >= 0 ? 'good' : 'bad',
    message: gain >= 0
      ? `${proceeds} récupérés, dont ${gain} de plus-value${tax > 0 ? ` (${tax} d’impôt)` : ''}.`
      : `${proceeds} récupérés. Tu perds ${-gain} sur cette ligne.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année du portefeuille                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le portefeuille fait au personnage, une fois les cours passés.
 *
 * Il ne suffit pas que l'argent monte et descende : une année où l'on perd
 * un tiers de ce qu'on a se sent, et se sent d'autant plus qu'on est
 * inquiet de nature. C'est ce qui distingue un tableau de chiffres d'une vie.
 */
export function advancePortfolio(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const holdings = holdingsOf(state);

  // Les études et le métier enseignent, doucement.
  const bookish = p.education.level >= 4 ? 1.2 : p.education.level >= 3 ? 0.8 : 0.4;
  p.financialLiteracy = clampStat(literacy(state) + bookish + p.stats.intelligence / 220);

  if (holdings.length === 0) return;

  const value = portfolioValue(state);
  const cost = holdings.reduce((sum, h) => sum + holdingCost(h), 0);
  if (cost <= 0) return;
  const ratio = value / cost;

  // Une position détruite fait mal, et le tempérament décide de combien :
  // quelqu'un de stable encaisse, quelqu'un qui l'est peu ne dort plus.
  const anxious = 1 + (50 - p.psyche.emotion.stability) / 140;
  if (ratio < 0.7) {
    p.stats.stress = clampStat(p.stats.stress + 8 * anxious);
    p.stats.happiness = clampStat(p.stats.happiness - 5 * anxious);
    ctx.log('money', 'Ton portefeuille a fondu cette année.', 'bad');
  } else if (ratio > 1.4) {
    p.stats.happiness = clampStat(p.stats.happiness + 4);
    ctx.log('money', 'Tes placements ont bien travaillé cette année.', 'good');
  }

  // Tout miser sur une ligne se paie en sommeil, gain ou pas.
  if (concentration(state) > 0.7 && value > p.money) {
    p.stats.stress = clampStat(p.stats.stress + 3 * anxious);
  }
}

/**
 * Ce que le portefeuille rapporte au bilan annuel.
 *
 * Seule la part *distribuée* compte comme revenu : le reste est une
 * plus-value latente, qui ne paie pas les courses.
 */
export function portfolioIncome(state: GameState): number {
  return holdingsOf(state).reduce((sum, h) => {
    const asset = getAsset(h.assetId);
    if (!asset) return sum;
    // Ce qui verse quelque chose : l'épargne, les obligations, la pierre.
    const yieldRate = asset.klass === 'épargne' ? 0.9
      : asset.klass === 'obligation' ? 0.7
        : asset.klass === 'pierre' ? 0.55 : 0;
    if (yieldRate === 0) return sum;
    return sum + holdingValue(state, h) * asset.drift * yieldRate;
  }, 0);
}
