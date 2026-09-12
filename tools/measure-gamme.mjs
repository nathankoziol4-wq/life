/**
 * Ce que vaut la gamme, mesuré sur des maisons jouées vingt-cinq ans.
 *
 * Cinq questions, et chacune peut condamner le système :
 *
 * 1. **ne rien lancer reste-t-il jouable ?** Si la maison qui ne met rien au
 *    point s'effondre, ce n'est pas un choix qu'on ajoute, c'est un impôt ;
 * 2. **lancer à l'aveugle bat-il ne rien faire ?** Si oui sans condition, il
 *    n'y a pas de décision : il y a un bouton qui rapporte ;
 * 3. **le moment compte-t-il ?** C'est la seule chose que ce système prétend
 *    apporter. Le joueur qui attend le bon moment doit battre celui qui lance
 *    dès qu'il peut payer **et** celui qui ne lance jamais ;
 * 4. **une forme domine-t-elle ?** Quatre formes dont une gagne toujours, ce
 *    sont trois lignes mortes ;
 * 5. **l'équipe change-t-elle ce qu'on peut sortir ?** Sinon `needs` est un
 *    nombre décoratif.
 *
 *   node --experimental-strip-types tools/measure-gamme.mjs [maisons]
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { SHAPES } from '../src/data/offer.ts';
import { forecast, foundBusiness, hireStaff, layOffStaff } from '../src/systems/venture.ts';
import { getBusinessKind } from '../src/data/ventures.ts';
import { appeal, launch, launchBlocker, lineOf, phase, retire, wouldBe } from '../src/systems/offer.ts';

const HOUSES = Number(process.argv[2] ?? 60);
const YEARS = 25;

/** Une vie amenée jusqu'au seuil où l'on peut ouvrir une maison. */
function bossAt(seed) {
  const life = createNewLife({ seed });
  for (let i = 0; i < 30 && !life.gameOver && life.player.alive; i += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
  if (life.gameOver || !life.player.alive || life.player.prison) return null;
  life.player.money = 400_000 * life.world.inflation;
  life.player.business = null;
  if (!foundBusiness(createCtx(life), 'cafe').ok) return null;
  const b = life.player.business;
  if (!b) return null;
  /*
   * Une maison qui tourne. Sans demande ni notoriété, tout se vaut parce que
   * rien ne rapporte — c'est le régime dans lequel la décision existe, et c'est
   * la même précaution que pour l'équipe.
   *
   * **On ne touche pas à l'effectif.** Une première version en posait trois, ce
   * qui ajoutait trois salaires à une maison qui n'avait pas la demande pour
   * les payer : le témoin « ne lance jamais » tombait à −658 456 et tout le
   * reste le battait sans rien prouver. Mesurée seule, une maison ordinaire
   * laissée vingt-cinq ans fait −98 777 : c'est cela, la référence.
   */
  b.cash = 250_000 * life.world.inflation;
  b.renown = 62;
  b.quality = 66;
  return life;
}

/**
 * Suit l'effectif sur la demande — commun à toutes les politiques.
 *
 * **Sans cela, la mesure ne dit rien.** Le chiffre d'affaires est
 * `min(capacité, demande)` : si la capacité est ce qui borne, une demande de
 * plus ne change rien du tout et la gamme est décorative par construction.
 * Mesuré ainsi, les quatre formes rendaient exactement la même médiane. Un
 * patron réel embauche quand il refuse du monde et débauche quand il paie des
 * bras inoccupés — c'est ce que fait cette fonction, et c'est le seul régime où
 * la question « la gamme sert-elle à quelque chose ? » a un sens.
 */
function followDemand(life, b, cap) {
  const view = forecast(life);
  /*
   * **Et il s'arrête à la taille naturelle du métier.** `venture.ts` retire de
   * la qualité à chaque bras au-delà du plafond du modèle : une politique qui
   * embauche tant qu'il y a de la demande finit par éroder la maison, et
   * mesurait ma bêtise plutôt que la gamme. Tracée sur une maison, la version
   * gourmande gagnait les neuf premières années puis s'effondrait — cinq
   * salariés pour un plafond de quatre, qualité de 47 à 38.
   */
  const ceiling = Math.min(cap ?? 99, getBusinessKind(b.kindId)?.ceiling ?? 4);
  if (view.demand > view.capacity * 1.15 && b.cash > 0 && b.staff < ceiling) {
    hireStaff(createCtx(life), 1);
  } else if (view.capacity > view.demand * 1.4 && b.staff > 0) {
    layOffStaff(createCtx(life), 1);
  }
}

/** Joue une maison pendant `YEARS` ans avec une politique de lancement. */
function run(seed, policy, cap) {
  const life = bossAt(seed);
  if (!life) return null;
  // On garde le cumul de chaque année : une maison qui ferme emporte son
  // historique avec elle, et la lire à la fin ne rendrait que les survivantes.
  let made = 0;
  let years = 0;
  let last = { line: 0, quality: 0 };
  for (let i = 0; i < YEARS && !life.gameOver && life.player.alive; i += 1) {
    const b = life.player.business;
    if (!b) break;
    policy(life, b);
    followDemand(life, b, cap);
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
    const after = life.player.business;
    if (!after) break;
    made += after.history[0]?.profit ?? 0;
    years += 1;
    last = { line: lineOf(after).length, quality: Math.round(after.quality) };
  }
  return { made, years, alive: Boolean(life.player.business), ...last };
}

const never = () => {};

const always = (life, b) => {
  for (const s of SHAPES) {
    if (launchBlocker(life, s.id) === null) { launch(createCtx(life), s.id); return; }
  }
};

/**
 * Ne lance qu'une forme donnée, et relance quand celle d'avant a passé son
 * sommet.
 *
 * **Il a fallu s'y reprendre.** La première version relançait tant que la
 * meilleure chose n'était pas à son sommet — ce qui, pour une forme qui met
 * quatre ans à monter, veut dire relancer quatre années de suite. Les formes
 * lentes se retrouvaient avec quatre choses au catalogue, la qualité à zéro par
 * éparpillement, et le classement mesurait ma politique et non les formes.
 */
const monoculture = (shapeId) => (life, b) => {
  for (const o of lineOf(b)) if (appeal(o) <= 0.04) retire(createCtx(life), o.id);
  const line = lineOf(b);
  const rising = line.some((o) => !past(o));
  if (rising) return;
  if (launchBlocker(life, shapeId) === null) launch(createCtx(life), shapeId);
};

/** A-t-elle passé son sommet ? */
function past(offer) {
  const shape = SHAPES.find((s) => s.id === offer.shapeId);
  return !shape || offer.age >= shape.climb + shape.hold;
}

/** Le joueur avisé : il prépare la suite quand celle d'avant commence à retomber. */
const timed = (life, b) => {
  const line = lineOf(b);
  for (const o of line) if (appeal(o) <= 0.04) retire(createCtx(life), o.id);
  const alive = lineOf(b);
  if (alive.length >= 2) return;
  // On prépare la suite quand ce qui porte la maison a commencé à retomber,
  // et pas avant : c'est là qu'est la décision.
  if (alive.some((o) => !past(o))) return;
  // Ce qu'on peut se permettre de sortir, avec les gens qu'on a.
  const order = wouldBe(life, 'signature') >= 58
    ? ['signature', 'fond', 'courant']
    : ['fond', 'courant', 'mode'];
  for (const id of order) {
    if (launchBlocker(life, id) === null) { launch(createCtx(life), id); return; }
  }
};

const POLICIES = {
  'ne lance jamais': never,
  'lance dès qu’il peut': always,
  'attend le bon moment': timed,
  ...Object.fromEntries(SHAPES.map((s) => [`seulement « ${s.label.toLowerCase()} »`, monoculture(s.id)])),
};

function sweep(cap) {
  const out = new Map(Object.keys(POLICIES).map((k) => [k, []]));
  let n = 0;
  for (let seed = 500_000; seed < 500_000 + HOUSES * 4 && n < HOUSES; seed += 1) {
    if (!bossAt(seed)) continue;
    n += 1;
    for (const [name, policy] of Object.entries(POLICIES)) {
      const row = run(seed, policy, cap);
      if (row) out.get(name).push(row);
    }
  }
  return { rows: out, n };
}

const big = sweep(undefined);
const results = big.rows;
const houses = big.n;

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const fmt = (x) => Math.round(x).toLocaleString('fr-FR');

console.log(`— ${houses} maisons, ${YEARS} ans chacune, mêmes graines pour toutes les politiques —\n`);
console.log('POLITIQUE'.padEnd(34), 'résultat cumulé'.padStart(17), 'médiane'.padStart(14), 'survit'.padStart(8), 'gamme'.padStart(7), 'qual.'.padStart(6), 'tenue'.padStart(8));
const base = mean(results.get('ne lance jamais').map((r) => r.made));
for (const [name, rows] of results) {
  const made = mean(rows.map((r) => r.made));
  console.log(
    name.padEnd(34),
    fmt(made).padStart(17),
    fmt(median(rows.map((r) => r.made))).padStart(14),
    `${Math.round((rows.filter((r) => r.alive).length / Math.max(1, rows.length)) * 100)} %`.padStart(8),
    mean(rows.map((r) => r.line)).toFixed(1).padStart(7),
    mean(rows.map((r) => r.quality)).toFixed(0).padStart(6),
    `${mean(rows.map((r) => r.years)).toFixed(0)} ans`.padStart(8),
    base !== 0 ? ` (${made > base ? '+' : ''}${Math.round(((made - base) / Math.abs(base)) * 100)} % vs rien)` : '',
  );
}

/*
 * Et les mêmes maisons, mais petites : un seul salarié quoi qu'il arrive.
 * C'est ce qui répond vraiment à « une forme domine-t-elle ? » — une forme qui
 * gagne dans les deux régimes est une forme qui rend les trois autres inutiles.
 */
console.log('\nLES MÊMES, MAIS PETITES (un salarié au plus)');
const small = sweep(1).rows;
const smallBase = mean(small.get('ne lance jamais').map((r) => r.made));
for (const [name, rows] of small) {
  const made = mean(rows.map((r) => r.made));
  console.log(
    name.padEnd(34),
    fmt(made).padStart(17),
    `${Math.round((rows.filter((r) => r.alive).length / Math.max(1, rows.length)) * 100)} %`.padStart(8),
    smallBase !== 0 ? ` (${made > smallBase ? '+' : ''}${Math.round(((made - smallBase) / Math.abs(smallBase)) * 100)} % vs rien)` : '',
  );
}

/*
 * Et le régime où « un coup » est censé exister : la maison va mal **cette
 * année**. C'est la seule forme qui paie l'année même — les trois autres
 * demandent d'attendre un à quatre ans, ce qu'une maison à deux exercices dans
 * le rouge n'a pas. Sans ce test, on ne saurait pas si elle a une place ou si
 * c'est une ligne morte : sur vingt-cinq ans additionnés, l'urgence ne se voit
 * pas.
 */
console.log('\nQUAND LA MAISON VA MAL (on ne lance que dans le rouge)');
{
  const rescue = (shapeId) => (life, b) => {
    if ((b.history[0]?.profit ?? 0) >= 0) return;
    for (const o of lineOf(b)) if (appeal(o) <= 0.04) retire(createCtx(life), o.id);
    if (launchBlocker(life, shapeId) === null) launch(createCtx(life), shapeId);
  };
  const rows = new Map();
  let n = 0;
  for (let seed = 500_000; seed < 500_000 + HOUSES * 4 && n < HOUSES; seed += 1) {
    if (!bossAt(seed)) continue;
    n += 1;
    for (const id of ['rien', ...SHAPES.map((x) => x.id)]) {
      if (!rows.has(id)) rows.set(id, []);
      const out = run(seed, id === 'rien' ? never : rescue(id), 1);
      if (out) rows.get(id).push(out);
    }
  }
  const rb = mean(rows.get('rien').map((r) => r.made));
  for (const [id, list] of rows) {
    const made = mean(list.map((r) => r.made));
    console.log(
      id.padEnd(12), fmt(made).padStart(14),
      `${Math.round((list.filter((r) => r.alive).length / Math.max(1, list.length)) * 100)} %`.padStart(8),
      rb !== 0 ? ` (${made > rb ? '+' : ''}${Math.round(((made - rb) / Math.abs(rb)) * 100)} % vs rien)` : '',
    );
  }
}

console.log('\nCE QUE L’ÉQUIPE CHANGE À CE QU’ON PEUT SORTIR');
{
  const life = bossAt(500_001) ?? bossAt(500_002);
  if (life) {
    const b = life.player.business;
    for (const skill of [25, 50, 75, 95]) {
      b.crew = [{
        personId: 'x', competence: skill, asking: 30_000,
        wage: 30_000, morale: 60, since: life.year, learned: 0,
      }];
      console.log(`   équipe à ${String(skill).padStart(2)} :`,
        SHAPES.map((s) => `${s.id} ${String(wouldBe(life, s.id)).padStart(3)}`).join(' · '));
    }
  }
}
