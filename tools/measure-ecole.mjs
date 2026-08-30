/**
 * Ce que vaut le choix de l'école, mesuré sur des enfances jouées.
 *
 * Cinq questions, et chacune peut condamner le système :
 *
 * 1. **y a-t-il seulement un enfant ?** Un système greffé sur la parentalité ne
 *    vaut rien si l'on n'a jamais d'enfant ;
 * 2. **ne rien choisir reste-t-il jouable ?** Sinon ce n'est pas un choix
 *    qu'on ajoute, c'est un impôt sur ceux qui n'y pensent pas ;
 * 3. **est-ce autre chose qu'une échelle de prix ?** Si le plus cher gagne sur
 *    tous les axes, les dix autres lignes sont mortes ;
 * 4. **l'accord entre l'enfant et le lieu compte-t-il ?** C'est la seule chose
 *    que ce système prétend dire de plus que « paie et gagne » ;
 * 5. **cela se voit-il à la fin ?** L'enfance close est ce que reprendra
 *    `lineage.ts#continueAs` : si rien n'y change, rien n'a eu lieu.
 *
 *   node --experimental-strip-types tools/measure-ecole.mjs [enfances]
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { DEMANDS } from '../src/data/schooling.ts';
import { createPerson } from '../src/systems/npc.ts';
import { upbringingOf } from '../src/systems/upbringing.ts';
import { SELECTIVE, FROM } from '../src/data/schooling.ts';
import { archetypeOf, enrol, fitOf, tuitionOf } from '../src/systems/schooling.ts';

const RUNS = Number(process.argv[2] ?? 40);

/* 1 — y a-t-il un enfant ? Mesuré avec l'autojoueur de la maison, qui, lui,
 * se met en couple et essaie d'avoir des enfants. */
{
  let withKid = 0;
  let total = 0;
  for (let i = 0; i < 200; i += 1) {
    const st = autoplayLife(i * 7919 + 3);
    const kids = Object.values(st.npcs).filter((x) => x.relation === 'son' || x.relation === 'daughter');
    if (kids.length) withKid += 1;
    total += kids.length;
  }
  console.log('1. Y A-T-IL UN ENFANT');
  console.log(`   vies avec au moins un enfant : ${(withKid / 2).toFixed(1)} % · ${(total / 200).toFixed(2)} par vie`);
}

/**
 * Élève un enfant de six à dix-huit ans dans un établissement donné.
 *
 * L'enfant est posé sur une vie réelle — le parent a un revenu, un pays, une
 * inflation — mais c'est le même enfant pour tous les établissements : sans
 * cela on comparerait des enfances différentes.
 */
function raise(seed, schoolId, discipline, intelligence) {
  const life = createNewLife({ seed });
  for (let i = 0; i < 30 && !life.gameOver && life.player.alive; i += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
  if (life.gameOver || !life.player.alive) return null;
  // De quoi payer : on mesure le choix, pas la probabilité de pouvoir se
  // l'offrir. Ce que coûte l'école est mesuré à part, plus bas.
  life.player.money = 40_000_000;

  const ctx = createCtx(life);
  const child = createPerson(ctx, { age: 6, relation: 'son', sex: 'M' });
  child.relation = 'son';
  child.age = 6;
  child.personality.discipline = discipline;
  child.stats.intelligence = intelligence;
  child.stats.happiness = 55;
  child.upbringing = {
    attention: 0, schooling: 0, invested: 0, hand: 0, mark: 10,
    doneThisYear: 0, record: [], grownYear: null,
  };
  life.npcs[child.id] = child;

  /*
   * Trois établissements ne s'achètent pas : on n'y entre qu'à partir d'un âge
   * et d'une moyenne. Les inscrire à six ans échouait, et la mesure rendait
   * « aucune graine » pour les trois — c'est-à-dire pour les seuls dont ce
   * système dit qu'ils se méritent. On attend donc l'âge, en restant d'ici là
   * dans le public du quartier.
   */
  const wait = SELECTIVE[schoolId] ?? FROM;
  if (schoolId && wait > FROM) enrol(createCtx(life), child.id, 'publicOrdinary');
  else if (schoolId && !enrol(createCtx(life), child.id, schoolId).ok) return null;

  let enrolled = !schoolId || wait <= FROM;
  for (let i = 0; i < 12 && life.player.alive; i += 1) {
    if (!enrolled && life.npcs[child.id].age >= wait) {
      enrolled = enrol(createCtx(life), child.id, schoolId).ok;
    }
    simulateYear(life);
    const c2 = createCtx(life);
    for (const p of [...life.pending]) resolvePending(c2, p.id, 0);
    life.pending = [];
  }
  if (schoolId && !enrolled) return null;
  const grown = life.npcs[child.id];
  const record = upbringingOf(grown);
  return {
    intelligence: Math.round(grown.stats.intelligence),
    happiness: Math.round(grown.stats.happiness),
    discipline: Math.round(grown.personality.discipline),
    reputation: Math.round(grown.stats.reputation),
    bond: Math.round(grown.relationship),
    mark: Number(record.mark.toFixed(1)),
    // Ce que l'école a réellement pris, et non ce que douze ans de vie ont
    // coûté : la première version mesurait la seconde, et rendait six millions
    // et demi pour « rien de choisi ».
    paid: Math.round(record.invested * 42_000),
  };
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const fmt = (x) => Math.round(x).toLocaleString('fr-FR');
const seeds = [];
for (let s = 950_000; seeds.length < RUNS && s < 950_000 + RUNS * 4; s += 1) {
  if (raise(s, null, 50, 50)) seeds.push(s);
}

/* 2 et 3 — chaque établissement, sur le même enfant moyen. */
console.log('\n2-3. UN ENFANT MOYEN (tenue 50, tête 50), DE SIX À DIX-HUIT ANS');
console.log('ÉTABLISSEMENT'.padEnd(34), 'tête'.padStart(6), 'humeur'.padStart(8), 'tenue'.padStart(7), 'réput.'.padStart(8), 'lien'.padStart(6), 'moy.'.padStart(6), 'payé'.padStart(12));
const rows = [['— rien de choisi —', null], ...DEMANDS.map((d) => [archetypeOf(d.id).label, d.id])];
const table = new Map();
for (const [label, id] of rows) {
  const out = seeds.map((s) => raise(s, id, 50, 50)).filter(Boolean);
  if (out.length === 0) { console.log(`${label.padEnd(34)} : aucune graine`); continue; }
  table.set(id ?? 'rien', out);
  console.log(
    label.padEnd(34),
    mean(out.map((r) => r.intelligence)).toFixed(0).padStart(6),
    mean(out.map((r) => r.happiness)).toFixed(0).padStart(8),
    mean(out.map((r) => r.discipline)).toFixed(0).padStart(7),
    mean(out.map((r) => r.reputation)).toFixed(0).padStart(8),
    mean(out.map((r) => r.bond)).toFixed(0).padStart(6),
    mean(out.map((r) => r.mark)).toFixed(1).padStart(6),
    fmt(mean(out.map((r) => r.paid))).padStart(12),
  );
}

console.log('\n3 bis. LE PLUS CHER GAGNE-T-IL SUR TOUT');
{
  const best = (key) => [...table].sort((a, b) => mean(b[1].map((r) => r[key])) - mean(a[1].map((r) => r[key])))[0][0];
  const axes = ['intelligence', 'happiness', 'discipline', 'reputation', 'bond'];
  for (const key of axes) console.log(`   meilleur en ${key.padEnd(13)} : ${best(key)}`);
  console.log(`   établissements distincts en tête : ${new Set(axes.map(best)).size} sur ${axes.length}`);
}

/* 4 — l'accord entre l'enfant et le lieu. */
console.log('\n4. L’ACCORD ENTRE L’ENFANT ET LE LIEU');
/*
 * On prend `boarding` et non `privateElite` : les sélectifs refusent l'enfant
 * qui ne suit pas — c'est précisément ce qu'ils font — et la comparaison
 * rendait « aucune graine » pour la moitié qui nous intéresse. L'internat, lui,
 * accepte tout le monde et demande beaucoup : c'est là que l'accord se voit.
 */
for (const id of ['boarding', 'alternative']) {
  const label = archetypeOf(id).label;
  for (const [who, d, i] of [['suit', 85, 80], ['ne suit pas', 22, 30]]) {
    const out = seeds.slice(0, Math.min(20, seeds.length))
      .map((s) => raise(s, id, d, i)).filter(Boolean);
    if (out.length === 0) { console.log(`   ${label} · ${who} : aucune graine`); continue; }
    const fit = fitOf({ personality: { discipline: d }, stats: { intelligence: i } }, id);
    console.log(
      `   ${label.padEnd(30)} · enfant qui ${who.padEnd(12)} :`
      + ` tête ${mean(out.map((r) => r.intelligence)).toFixed(0).padStart(3)}`
      + ` · humeur ${mean(out.map((r) => r.happiness)).toFixed(0).padStart(3)}`
      + ` · accord ${fit.toFixed(2)}`,
    );
  }
}

/* 5 — ce que cela coûte vraiment, rapporté à un revenu. */
console.log('\n5. CE QUE CELA COÛTE PAR AN');
{
  const life = createNewLife({ seed: seeds[0] });
  for (const d of DEMANDS) {
    const cost = tuitionOf(life, d.id);
    if (cost > 0) console.log(`   ${archetypeOf(d.id).label.padEnd(34)} : ${fmt(cost)}`);
  }
  console.log('   (les autres sont gratuits)');
}
