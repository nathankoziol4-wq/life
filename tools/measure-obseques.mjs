/**
 * Ce que valent les obsèques, mesuré sur des vies jouées.
 *
 * Cinq questions, et chacune peut condamner le système :
 *
 * 1. **combien de fois y a-t-il une scène ?** Un système qu'on rencontre une
 *    vie sur dix ne vaut pas d'être écrit ;
 * 2. **l'assemblée varie-t-elle ?** Si tout le monde enterre son père devant
 *    le même nombre de gens, ce n'est pas une lecture, c'est un décor ;
 * 3. **varie-t-elle avec ce que le joueur a fait de ses relations ?** C'est la
 *    seule chose que ce système prétend dire ;
 * 4. **la forme change-t-elle quelque chose ?** Sinon la dépense est un impôt ;
 * 5. **les six phrases se départagent-elles ?** Si elles tiennent toutes, ou
 *    aucune, le choix est faux.
 *
 *   node --experimental-strip-types tools/measure-obseques.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { FORMS, WORDS } from '../src/data/wake.ts';
import { attendance, holds, turnout, wakeOf } from '../src/systems/wake.ts';

const LIVES = Number(process.argv[2] ?? 200);

const opened = [];      // une entrée par scène rencontrée
const perLife = [];
const wordHolds = new Map(WORDS.map((w) => [w.id, 0]));
const warmHolds = new Map(WORDS.map((w) => [w.id, 0]));
let wordTotal = 0;
const trueCount = [];

for (let seed = 300_000; seed < 300_000 + LIVES; seed += 1) {
  const life = createNewLife({ seed });
  let seen = 0;
  for (let i = 0; i < 110 && !life.gameOver && life.player.alive; i += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];

    const wake = wakeOf(life);
    if (!wake) continue;
    seen += 1;
    const who = life.npcs[wake.whoId];

    // Ce que donnerait chaque forme, toutes choses égales par ailleurs.
    const byForm = {};
    for (const f of FORMS) {
      const trial = { ...wake, formId: f.id };
      byForm[f.id] = attendance(life, trial);
    }
    // Et ce que le joueur a fait de ses gens, comme témoin indépendant.
    const living = Object.values(life.npcs).filter((x) => x.alive && !x.petSpecies);
    const tie = living.length
      ? living.reduce((s, x) => s + x.relationship, 0) / living.length
      : 0;
    /*
     * Le témoin indépendant, restreint au cercle. Une première version le
     * calculait sur **tous** les vivants connus, ce qui comptait cinquante
     * camarades de classe croisés une fois : les vies sociables sortaient
     * « les plus froides » et le témoin disait l'inverse de la vérité.
     */
    const CIRCLE = ['spouse', 'partner', 'son', 'daughter', 'mother', 'father',
      'guardian', 'brother', 'sister', 'grandmother', 'grandfather', 'bestFriend', 'friend'];
    const inner = living.filter((x) => CIRCLE.includes(x.relation));
    const cold = inner.filter((x) => x.estranged || life.year - x.lastInteractionYear > 15).length;

    const all = turnout(life, { ...wake, formId: 'service' });

    /*
     * Le témoin. L'autojoueur ne parle à personne — il ne le peut pas, il n'a
     * pas de doigt — donc `lastInteractionYear` reste à l'année de la
     * rencontre pour tout le monde et le système ne mesurerait que son
     * silence. On refait donc la même scène sur le même état, en ayant gardé
     * le contact : c'est la seule façon de savoir si la salle se remplit quand
     * on s'en est occupé, ou si elle est vide pour tout le monde.
     *
     * **On ne touche qu'à la date du dernier échange et à la brouille**, pas à
     * la force des liens : forcer tout le monde au même chiffre écrasait
     * l'échelle et faisait basculer les quatre formes d'un bloc, ce qui donnait
     * une falaise là où le système a une pente. C'est le témoin qui mentait.
     */
    const warm = { ...life, npcs: { ...life.npcs } };
    for (const x of Object.values(life.npcs)) {
      // Le défunt aussi : c'est de **son** lien que parlent les six phrases, et
      // l'oublier ici faisait afficher deux colonnes identiques.
      if ((!x.alive && x.id !== wake.whoId) || x.petSpecies) continue;
      warm.npcs[x.id] = {
        ...x,
        lastInteractionYear: life.year,
        estranged: false,
      };
    }
    const warmFill = attendance(warm, { ...wake, formId: 'service' });
    const warmByForm = {};
    for (const f of FORMS) warmByForm[f.id] = attendance(warm, { ...wake, formId: f.id });

    opened.push({
      warmFill,
      warmByForm,
      ours: wake.ours,
      relation: who?.relation ?? '?',
      byForm,
      tie,
      coldShare: inner.length ? cold / inner.length : 0,
      known: all.length,
      came: all.filter((t) => t.comes).length,
      held: all.filter((t) => !t.comes).map((t) => t.held),
      // Le contraste **à l'intérieur d'une même scène** : parmi ceux du cercle
      // qui ne sont pas de la famille du mort, ceux qu'on a vus récemment
      // viennent-ils plus que les autres ? Ni l'âge du joueur, ni la taille de
      // sa famille, ni la forme retenue n'entrent là-dedans.
      inner: all
        .filter((t) => !t.forDeceased && t.potential > 0)
        .map((t) => ({ warm: life.year - t.who.lastInteractionYear <= 5, comes: t.comes })),
    });

    if (who) {
      wordTotal += 1;
      for (const w of WORDS) if (holds(life, who, w.claim)) wordHolds.set(w.id, wordHolds.get(w.id) + 1);
      const warmWho = warm.npcs[who.id];
      for (const w of WORDS) if (holds(warm, warmWho, w.claim)) warmHolds.set(w.id, warmHolds.get(w.id) + 1);
      trueCount.push(WORDS.filter((w) => holds(life, who, w.claim)).length);
    }
  }
  perLife.push(seen);
}

const n = opened.length;
const pct = (x) => `${(x * 100).toFixed(1)} %`;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
};

console.log(`— ${LIVES} vies, ${n} obsèques rencontrées —\n`);

console.log('1. COMBIEN DE FOIS');
console.log(`   scènes par vie          : ${mean(perLife).toFixed(2)} (médiane ${quantile(perLife, 0.5)})`);
console.log(`   vies sans aucune scène  : ${pct(perLife.filter((x) => x === 0).length / perLife.length)}`);
console.log(`   dont c'est à nous       : ${pct(opened.filter((o) => o.ours).length / Math.max(1, n))}`);
const byRelation = new Map();
for (const o of opened) byRelation.set(o.relation, (byRelation.get(o.relation) ?? 0) + 1);
console.log(`   qui l'on enterre        : ${[...byRelation].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);

console.log('\n2. L’ASSEMBLÉE VARIE-T-ELLE (à forme égale : « un service »)');
const att = opened.map((o) => o.byForm.service);
console.log(`   remplissage moyen       : ${pct(mean(att))}`);
console.log(`   p10 / médiane / p90     : ${pct(quantile(att, 0.1))} / ${pct(quantile(att, 0.5))} / ${pct(quantile(att, 0.9))}`);
const bands = [0, 0, 0, 0, 0];
for (const a of att) bands[Math.min(4, Math.floor(a * 5))] += 1;
console.log(`   par cinquième           : ${bands.map((b) => pct(b / Math.max(1, n))).join(' · ')}`);
console.log(`   personnes présentes     : ${mean(opened.map((o) => o.came)).toFixed(1)} sur ${mean(opened.map((o) => o.known)).toFixed(1)} connues`);
console.log(`   lien moyen aux vivants  : ${mean(opened.map((o) => o.tie)).toFixed(1)} sur 100`);

console.log('\n3. SUIT-ELLE CE QU’ON A FAIT DES GENS');
console.log(`   tel que joué            : ${pct(mean(att))}`);
console.log(`   les mêmes, contact gardé: ${pct(mean(opened.map((o) => o.warmFill)))}`);
const gained = opened.filter((o) => o.warmFill > o.byForm.service + 0.01).length;
console.log(`   scènes que cela change  : ${pct(gained / Math.max(1, n))}`);
/*
 * Et le témoin dans la scène. Comparer des vies entre elles ne marche pas ici :
 * une vie où tout le monde est « froid » est d'abord une vie longue, où les
 * amis sont morts et où il ne reste que la famille — qui, elle, vient toujours.
 * Mesuré, le tiers le plus froid sortait à 15,6 % contre 13,5 % au moins froid,
 * c'est-à-dire l'inverse de ce que le système raconte, et pour une raison qui
 * n'a rien à voir avec lui. On compare donc **à l'intérieur d'une même scène**.
 */
const innerAll = opened.flatMap((o) => o.inner);
const warmOnes = innerAll.filter((x) => x.warm);
const coldOnes = innerAll.filter((x) => !x.warm);
console.log(`   du cercle, vus récemment: ${pct(warmOnes.filter((x) => x.comes).length / Math.max(1, warmOnes.length))} viennent (${warmOnes.length} cas)`);
console.log(`   du cercle, laissés filer: ${pct(coldOnes.filter((x) => x.comes).length / Math.max(1, coldOnes.length))} viennent (${coldOnes.length} cas)`);
const held = new Map();
for (const o of opened) for (const h of o.held) held.set(h, (held.get(h) ?? 0) + 1);
const heldTotal = [...held.values()].reduce((s, x) => s + x, 0);
console.log(`   ce qui retient les gens : ${[...held].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / Math.max(1, heldTotal))}`).join(', ')}`);

console.log('\n4. LA FORME CHANGE-T-ELLE QUELQUE CHOSE');
console.log('   (tel que joué, puis le cercle tenu — sans quoi rien ne bouge : ce qui');
console.log('    limite une vie muette est le silence, pas le budget)');
for (const f of FORMS) {
  console.log(`   ${f.label.padEnd(24)} : ${pct(mean(opened.map((o) => o.byForm[f.id])))}  →  ${pct(mean(opened.map((o) => o.warmByForm[f.id])))}`);
}

console.log('\n5. LES SIX PHRASES SE DÉPARTAGENT-ELLES');
console.log(`   phrases vraies par scène: ${mean(trueCount).toFixed(2)} sur ${WORDS.length} (médiane ${quantile(trueCount, 0.5)})`);
const allTrue = trueCount.filter((c) => c >= WORDS.length - 1).length;
console.log(`   scènes où presque tout est vrai : ${pct(allTrue / Math.max(1, trueCount.length))}`);
console.log('   (tel que joué, puis en ayant tenu le lien avec le défunt)');
for (const w of WORDS) {
  const a = pct(wordHolds.get(w.id) / Math.max(1, wordTotal));
  const b = pct(warmHolds.get(w.id) / Math.max(1, wordTotal));
  console.log(`   ${w.label.padEnd(30)} : ${a.padStart(7)}  →  ${b.padStart(7)}`);
}
