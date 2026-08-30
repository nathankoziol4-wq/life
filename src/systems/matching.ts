/**
 * L'application de rencontre : lire quelqu'un avant de le rencontrer.
 *
 * **Ce que ce fichier remplace.** `useDatingApp` tenait en un tirage. On
 * appuyait, on payait un abonnement, un dé décidait s'il y avait une réponse,
 * et une personne apparaissait dans l'onglet Relations. Aucun profil, aucune
 * comparaison, aucun refus qu'on aurait pu voir venir. Le catalogue le
 * classait `BASIC` — « un bouton qui produit un prétendant » — et c'était
 * exact.
 *
 * **Trois décisions le remplacent.**
 *
 * *Qui est-ce ?* Six profils par an. Chacun **montre** deux choses — des faits
 * sur le profil lui-même, toujours vrais — et **dit** deux choses de
 * lui-même, dont une porte sur un trait que le profil montre aussi. Comparer
 * ces deux-là n'apprend rien sur le trait, qu'on connaît déjà : cela apprend
 * **si cette personne se décrit honnêtement**, et donc s'il faut croire son
 * autre phrase. C'est la mécanique entière, et elle tient en un profil.
 *
 * *À qui écrire ?* Deux messages par an. Sans budget, lire ne serait pas une
 * décision — on écrirait à tout le monde.
 *
 * *Et faut-il viser haut ?* Un profil très sollicité répond rarement. Écrire
 * à celui qu'on a le mieux lu, ou à celui qui répondra : c'est le second
 * arbitrage, et il n'a pas de bonne réponse fixe.
 *
 * **Ce qui arrive ensuite existait déjà.** Une réponse crée quelqu'un, et
 * `dates.ts` prend la suite : les traits sont couverts et se découvrent en
 * sortant. À une différence près — **les deux traits que le profil montrait
 * sont connus dès le premier jour.** On les avait lus ; il serait absurde de
 * les redécouvrir au restaurant. C'est aussi ce qui referme la boucle dans
 * une seule vie : le joueur voit, sur la fiche, que ce que le profil montrait
 * était vrai.
 *
 * **Rien ici ne décrit un service réel** : ni application existante, ni
 * marque, ni procédé de mise en relation véritable.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, Person, Sex } from '../engine/types.ts';
import {
  BATCH, CLAIM_HIGH, CLAIM_LOW, DEMAND, HOOKS, TELL_HIGH, TELL_LOW,
  WRITES_PER_YEAR, type Demand,
} from '../data/profiles.ts';
import { COLD, TRAITS, WARM, type TraitId } from '../data/dates.ts';
import { learn } from './dates.ts';
import { createPerson } from './npc.ts';
import { getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';
import { JOBS } from '../data/jobs.ts';
import { localPrice } from './activities.ts';
import { effectiveLooks, readAs } from './appearance.ts';
import { fullName } from '../engine/context.ts';

/** Ce qu'un profil affirme ou montre d'un trait. */
export type Way = 'haut' | 'bas';

export interface Shown {
  trait: TraitId;
  way: Way;
  line: string;
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  age: number;
  job: string;
  hook: string;
  /** Ce que le profil montre. Toujours vrai. */
  tells: Shown[];
  /** Ce que le profil dit de lui-même. Vrai environ une fois sur deux. */
  claims: Shown[];
  demand: Demand;
  /** La vérité, que l'écran ne montre jamais. */
  truth: Record<TraitId, number>;
}

/**
 * Un tirage stable, dérivé de la partie et non de son hasard courant.
 *
 * La liste de l'année ne doit pas changer entre deux ouvertures de la feuille
 * — on y reviendrait jusqu'à tomber sur un bon profil, et il n'y aurait plus
 * rien à lire. Même procédé que les réseaux et que les soirées : un hachage,
 * pas le `Rng` de la partie, dont toute la suite se décalerait.
 */
function draw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Une valeur franche : ni tiède, ni ambiguë — sinon il n'y a rien à lire. */
function marked(roll: number): number {
  return roll < 0.5 ? 12 + roll * 2 * 26 : WARM + 6 + (roll - 0.5) * 2 * 26;
}

function wayOf(value: number): Way {
  return value >= WARM ? 'haut' : 'bas';
}

/** Le sexe que le personnage cherche, selon son orientation. */
function wantedSex(state: GameState, roll: number): Sex {
  const p = state.player;
  if (p.orientation === 'homo') return p.sex;
  if (p.orientation === 'hetero') return p.sex === 'M' ? 'F' : 'M';
  return roll < 0.5 ? 'M' : 'F';
}

/**
 * Les six profils de l'année.
 *
 * Tout est tiré du couple (graine, année, rang) : la liste est la même à
 * chaque ouverture, et deux parties différentes ne voient pas les mêmes gens.
 */
export function profilesFor(state: GameState): Profile[] {
  const p = state.player;
  const names = getNameSet(getCountry(p.countryId).nameSet);
  const out: Profile[] = [];
  for (let i = 0; i < BATCH; i++) {
    const key = Number(state.seed) + state.year * 1009 + i * 7919;
    const d = (n: number) => draw(key, 31 + n * 17);

    const truth = {} as Record<TraitId, number>;
    for (const [n, trait] of TRAITS.entries()) truth[trait] = marked(d(n));

    /*
     * Deux traits montrés, et une affirmation qui porte sur le premier.
     *
     * C'est ce recouvrement qui rend la lecture possible : sans lui, les
     * quatre lignes d'un profil seraient quatre informations indépendantes
     * et croire ou non les affirmations serait un pur pari.
     */
    const order = [...TRAITS].sort((a, b) => d(TRAITS.indexOf(a) + 40) - d(TRAITS.indexOf(b) + 40));
    const [shownA, shownB, gambleA, gambleB] = order as [TraitId, TraitId, TraitId, TraitId];

    const tells: Shown[] = [shownA, shownB].map((trait) => {
      const way = wayOf(truth[trait]);
      return { trait, way, line: way === 'haut' ? TELL_HIGH[trait] : TELL_LOW[trait] };
    });

    /*
     * **Qui se décrit honnêtement, et qui se décrit comme il voudrait être.**
     *
     * Ce n'est pas tout ou rien : quelqu'un d'honnête se trompe encore une
     * fois sur dix sur son propre compte, et quelqu'un qui s'arrange avec la
     * vérité tombe juste une fois sur quatre. Une seule phrase vérifiée ne
     * démontre donc rien — elle penche. C'est voulu : une déduction certaine
     * ne serait plus une lecture, seulement une case à cocher.
     */
    const honest = d(60) < 0.5;
    const tellsTruth = (n: number) => d(n) < (honest ? 0.9 : 0.25);
    const say = (trait: TraitId, right: boolean): Shown => {
      const real = wayOf(truth[trait]);
      const way: Way = right ? real : real === 'haut' ? 'bas' : 'haut';
      return { trait, way, line: way === 'haut' ? CLAIM_HIGH[trait] : CLAIM_LOW[trait] };
    };
    /*
     * **Une phrase vérifiable, deux paris.**
     *
     * Premier jet : une seule phrase en pari. Mesuré de bout en bout, le
     * joueur qui déduit ne gagnait alors que 6,8 points sur celui qui croit
     * tout ce qu'il lit — parce qu'avec deux traits montrés sur cinq et six
     * profils par an, il se trouvait presque toujours quelqu'un qui *montrait*
     * le trait cherché, et la déduction ne servait à rien. Un système qui ne
     * mord qu'une fois sur cinq n'est pas un système. Deux paris plutôt qu'un
     * : il reste un seul trait dont le profil ne dit rien du tout.
     */
    const claims = [
      say(shownA, tellsTruth(61)), say(gambleA, tellsTruth(62)), say(gambleB, tellsTruth(63)),
    ];

    const sex = wantedSex(state, d(70));
    const first = sex === 'M' ? names.male : names.female;
    const age = Math.max(18, Math.round(p.age - 6 + d(71) * 12));
    const job = JOBS[Math.floor(d(72) * JOBS.length) % JOBS.length]!;
    const level = job.levels[Math.min(job.levels.length - 1, Math.floor((age - 22) / 9) + 1)]
      ?? job.levels[0]!;

    out.push({
      id: `m${state.year}_${i}`,
      firstName: first[Math.floor(d(73) * first.length) % first.length]!,
      lastName: names.surnames[Math.floor(d(74) * names.surnames.length) % names.surnames.length]!,
      sex,
      age,
      job: level.title,
      hook: HOOKS[Math.floor(d(75) * HOOKS.length) % HOOKS.length]!,
      tells,
      claims,
      demand: DEMAND[Math.floor(d(76) * DEMAND.length) % DEMAND.length]!,
      truth,
    });
  }
  return out;
}

/** Combien de messages on a envoyés cette année. */
export function writesThisYear(state: GameState): number {
  return Number(state.player.yearActions.matchWrites ?? 0);
}

/** A-t-on déjà écrit à celui-là ? */
export function alreadyWrote(state: GameState, profileId: string): boolean {
  return state.player.yearActions[`wrote_${profileId}`] === 1;
}

/** Ce que l'abonnement coûte ici et maintenant. */
export function subscription(state: GameState): number {
  return localPrice(state, 18);
}

/** Pourquoi l'on ne peut pas ouvrir l'application, le cas échéant. */
export function appBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.age < 18) return 'Réservé aux majeurs.';
  if (p.prison) return 'Pas depuis la détention.';
  return null;
}

/** Pourquoi l'on ne peut pas écrire à celui-là, le cas échéant. */
export function writeBlocker(state: GameState, profile: Profile): string | null {
  const shut = appBlocker(state);
  if (shut) return shut;
  if (alreadyWrote(state, profile.id)) return `Tu as déjà écrit à ${profile.firstName}.`;
  if (writesThisYear(state) >= WRITES_PER_YEAR) {
    return `Deux messages par an, pas plus. Tu les as envoyés.`;
  }
  if (state.player.money < subscription(state)) {
    return `L’abonnement coûte ${subscription(state)}.`;
  }
  return null;
}

/**
 * Ce que le personnage vaut sur l'application.
 *
 * Repris tel quel de l'ancienne fonction : ce n'était pas ce qui clochait.
 */
export function appeal(state: GameState): number {
  const p = state.player;
  const country = getCountry(p.countryId);
  // L'allure telle qu'un tiers la voit : la statistique moins ce que la vie a
  // inscrit. Le registre, lui, s'applique plus loin — sur la chance elle-même.
  return (effectiveLooks(state) * 0.55 + p.stats.reputation * 0.2 + p.stats.happiness * 0.15
    + Math.min(100, (p.money / (40_000 * country.salaryIndex)) * 100) * 0.1) / 100;
}

/** La chance d'obtenir une réponse de celui-là. */
export function odds(state: GameState, profile: Profile): number {
  // Et l'allure qu'on tient, qui multiplie la chance plutôt que de se diluer
  // dans une statistique. Sans registre choisi, `readAs` rend exactement 1.
  return clamp(
    (0.2 + appeal(state) * 0.7) * profile.demand.factor * readAs(state, 'rencontre'),
    0.04, 0.94,
  );
}

/**
 * Écrire à quelqu'un.
 *
 * S'il répond, il entre dans la partie avec **la personnalité que le profil
 * disait la vérité ou non sur elle** — c'est le point du système : ce qu'on a
 * lu décide de qui l'on rencontre. Les deux traits que le profil *montrait*
 * sont déjà connus ; les trois autres restent à découvrir en sortant.
 */
export function writeTo(ctx: Ctx, profileId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const profile = profilesFor(state).find((x) => x.id === profileId);
  if (!profile) return { ok: false, message: 'Ce profil n’est plus là.' };
  const blocker = writeBlocker(state, profile);
  if (blocker) return { ok: false, title: profile.firstName, message: blocker };

  const cost = subscription(state);
  p.money -= cost;
  p.yearActions.matchWrites = writesThisYear(state) + 1;
  p.yearActions[`wrote_${profile.id}`] = 1;

  if (!rng.chance(odds(state, profile))) {
    p.stats.happiness = clampStat(p.stats.happiness - 3);
    return {
      ok: true,
      title: 'Pas de réponse',
      message: `${profile.firstName} n’a jamais répondu. ${
        profile.demand.factor < 1 ? 'Il fallait s’y attendre, vu la file.' : 'Ça arrive.'}`,
      tone: 'bad',
    };
  }

  const person = createPerson(ctx, {
    relation: 'crush',
    sex: profile.sex,
    age: profile.age,
    relationship: rng.int(28, 46),
    opinion: rng.int(32, 58),
    withJob: true,
  });
  person.firstName = profile.firstName;
  person.lastName = profile.lastName;
  person.jobTitle = profile.job;
  // La vérité du profil devient la personne. C'est ici que la lecture paie.
  for (const trait of TRAITS) person.personality[trait] = clampStat(profile.truth[trait]);
  // Ce qu'on a vu sur le profil, on ne le redécouvre pas au restaurant.
  for (const shown of profile.tells) learn(person, shown.trait);

  p.stats.happiness = clampStat(p.stats.happiness + 4);
  ctx.log('love', `${fullName(person)} t’a répondu sur l’application.`, 'good');
  return {
    ok: true,
    title: 'Elle ou il répond',
    message: `${fullName(person)}, ${person.age} ans. Retrouve-${
      profile.sex === 'F' ? 'la' : 'le'} dans l’onglet Relations.`,
    tone: 'good',
  };
}

/**
 * Ce qu'un profil laisse deviner d'un trait, pour qui sait lire.
 *
 * Exporté pour les tests, et pour eux seuls : l'écran ne s'en sert pas — ce
 * serait faire à la place du joueur la seule chose que le système lui
 * demande. Rend `null` quand le profil ne dit rien de ce trait.
 */
export function reading(profile: Profile, trait: TraitId): Way | null {
  const shown = profile.tells.find((t) => t.trait === trait);
  if (shown) return shown.way;
  const said = profile.claims.find((c) => c.trait === trait);
  if (!said) return null;
  // La phrase vérifiable : celle qui porte sur un trait également montré.
  const check = profile.claims.find((c) => profile.tells.some((t) => t.trait === c.trait));
  const proof = check && profile.tells.find((t) => t.trait === check.trait);
  if (!check || !proof) return said.way;
  // Démentie par ce que le profil montre : on retourne l'autre phrase.
  return check.way === proof.way ? said.way : said.way === 'haut' ? 'bas' : 'haut';
}

/** Le mot qui va avec un trait franc, pour l'écran. */
export function wayWord(way: Way): string {
  return way === 'haut' ? 'plutôt oui' : 'plutôt non';
}

/** Un trait est-il vraiment marqué chez quelqu'un ? */
export function reallyIs(person: Person, trait: TraitId, way: Way): boolean {
  const value = person.personality[trait];
  return way === 'haut' ? value >= WARM : value <= COLD;
}
