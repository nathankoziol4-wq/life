/**
 * Ce que séduire demande aujourd'hui, et ce qu'on y apprend.
 *
 * Le catalogue dit « aucun rendez-vous : la séduction est une suite de clics
 * sans scène ». Avant d'écrire quoi que ce soit, deux questions.
 *
 * **Combien de gestes séparent une rencontre d'un couple ?** Si un seul
 * suffit, il n'y a pas de cour ; s'il en faut quinze, il y a une corvée.
 *
 * **Qu'apprend-on de quelqu'un en le fréquentant ?** C'est la vraie question.
 * Le moteur fait dépendre presque tout de la personnalité du PNJ — chaleur,
 * loyauté, caractère, ambition, générosité —, et l'écran de la fiche affiche
 * ces cinq nombres **dès la première rencontre**. Il n'y a donc rien à
 * découvrir : on lit l'âme d'un inconnu, puis on décide.
 *
 *   node --experimental-strip-types tools/measure-rendezvous.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { createCtx } from '../src/engine/context.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { Rng } from '../src/engine/rng.ts';
import {
  interact, isRomanticallyCompatible, meetRomanticProspect,
} from '../src/systems/relationships.ts';

/* ------------------------------------------------------------------ */
/* 1. Ce qu'une vie ordinaire produit                                  */
/* ------------------------------------------------------------------ */

const LIVES = 60;
let lives = 0, married = 0, everCoupled = 0, partners = 0, weddingSpend = 0;
let loyalPartners = 0, warmPartners = 0;

for (let seed = 60_000; seed < 60_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  lives++;
  if (life.player.chronicle.marriages > 0) married++;
  const seen = Object.values(life.npcs).filter(
    (n) => n.relation === 'spouse' || n.relation === 'partner' || n.relation === 'ex',
  );
  if (seen.length > 0) everCoupled++;
  partners += seen.length;
  for (const s of seen) {
    if (s.personality.loyalty >= 60) loyalPartners++;
    if (s.personality.warmth >= 60) warmPartners++;
  }
  weddingSpend += life.timeline.filter((e) => /Coût de la cérémonie/.test(e.text)).length;
}

console.log(`${lives} vies jouées`);
console.log(`  vies qui se marient        : ${(married / lives * 100).toFixed(0)} %`);
console.log(`  vies qui ont connu un couple : ${(everCoupled / lives * 100).toFixed(0)} %`);
console.log(`  partenaires par vie        : ${(partners / lives).toFixed(2)}`);
console.log(`  partenaires plutôt loyaux  : ${partners ? (loyalPartners / partners * 100).toFixed(0) : 0} %`
  + ` · plutôt chaleureux : ${partners ? (warmPartners / partners * 100).toFixed(0) : 0} %`);
console.log(`  cérémonies notées au journal : ${weddingSpend}`);

/* ------------------------------------------------------------------ */
/* 2. Combien de gestes pour passer d'inconnu à couple                 */
/* ------------------------------------------------------------------ */

const TRIES = 300;
let coupled = 0, gestures = 0, refusedFirst = 0, neverCoupled = 0;

for (let t = 0; t < TRIES; t++) {
  const state = createNewLife({ seed: 700_000 + t });
  const rng = new Rng({ rngState: (t * 2654435761 + 3) >>> 0 });
  // On amène le personnage à un âge où courtiser a un sens.
  for (let y = 0; y < 22 && state.player.alive; y++) simulateYear(state);
  if (!state.player.alive) continue;

  const target = meetRomanticProspect(createCtx(state), rng.float(0.4, 0.9));
  if (!isRomanticallyCompatible(state.player.sex, state.player.orientation, target)) continue;

  let steps = 0;
  let done = false;
  for (let year = 0; year < 12 && !done && state.player.alive; year++) {
    for (let i = 0; i < 3 && !done; i++) {
      const action = i === 2 ? 'askOut' : 'talk';
      const out = interact(createCtx(state), target.id, action);
      if (!out.ok) break;
      steps++;
      if (action === 'askOut') {
        if (steps === 3 && out.title !== 'C’est un oui') refusedFirst++;
        if (target.relation === 'partner') { done = true; coupled++; gestures += steps; }
      }
    }
    simulateYear(state);
    target.interactionsThisYear = 0;
  }
  if (!done) neverCoupled++;
}

console.log(`\nD'INCONNU À COUPLE — ${TRIES} tentatives`);
console.log(`  finissent en couple        : ${(coupled / TRIES * 100).toFixed(0)} %`);
console.log(`  gestes nécessaires, moyenne: ${coupled ? (gestures / coupled).toFixed(1) : '—'}`);
console.log(`  n'aboutissent jamais       : ${(neverCoupled / TRIES * 100).toFixed(0)} %`);

/* ------------------------------------------------------------------ */
/* 3. Ce qu'on sait de quelqu'un, et depuis quand                      */
/* ------------------------------------------------------------------ */

const state = createNewLife({ seed: 4242 });
for (let y = 0; y < 20; y++) simulateYear(state);
const stranger = meetRomanticProspect(createCtx(state), 0.7);
console.log(`\nCE QU'ON SAIT D'UN INCONNU, À LA SECONDE OÙ ON LE RENCONTRE`);
console.log(`  ${stranger.firstName}, rencontré à l'instant — lien ${Math.round(stranger.relationship)}`);
for (const [k, v] of Object.entries(stranger.personality)) {
  console.log(`    ${k.padEnd(12)} ${Math.round(v)}  (affiché tel quel sur sa fiche)`);
}

/* ------------------------------------------------------------------ */
/* 4. Est-ce que sortir permet de choisir ?                            */
/* ------------------------------------------------------------------ */

/**
 * L'affirmation du système, et la seule qui compte : **fréquenter quelqu'un
 * doit permettre de choisir**. On compare deux joueurs sur les mêmes vies.
 *
 * Le premier clique : il parle, il demande, il épouse le premier qui dit oui.
 * Le second sort : il emmène quelqu'un quelque part, découvre un trait ou
 * deux, et **passe son chemin** si ce qu'il découvre ne lui plaît pas.
 *
 * Si les deux finissent avec les mêmes personnes, la soirée n'est qu'un
 * décor et le système ne vaut rien.
 */
import { PLACES } from '../src/data/dates.ts';
import { knows, settleDate, unknownTraits } from '../src/systems/dates.ts';

const ROUNDS = 250;
const kept = { clique: [], courtise: [] };
const passed = { clique: 0, courtise: 0 };

for (let t = 0; t < ROUNDS; t++) {
  for (const style of ['clique', 'courtise']) {
    const st = createNewLife({ seed: 900_000 + t });
    const r = new Rng({ rngState: (t * 40_503 + 11) >>> 0 });
    for (let y = 0; y < 24 && st.player.alive; y++) simulateYear(st);
    if (!st.player.alive) continue;
    st.player.money = Math.max(st.player.money, 40_000);

    let chosen = null;
    // Cinq rencontres sur une vie : on peut en refuser quatre.
    for (let met = 0; met < 5 && !chosen; met++) {
      const who = meetRomanticProspect(createCtx(st), r.float(0.4, 0.9));
      if (!isRomanticallyCompatible(st.player.sex, st.player.orientation, who)) continue;

      if (style === 'courtise') {
        // Deux soirées : on choisit où aller, et on répond au hasard —
        // c'est volontaire, on mesure ce que *découvrir* apporte, pas ce
        // qu'un bon joueur de soirée apporte en plus.
        for (let out = 0; out < 2 && unknownTraits(who).length > 0; out++) {
          const place = PLACES[r.int(0, PLACES.length - 1)];
          const picks = [0, 1, 2].map(() => ['warmth', 'loyalty', 'generosity', 'temper', 'ambition'][r.int(0, 4)]);
          settleDate(createCtx(st), who.id, place.id, picks);
        }
        // Ce qu'on sait, on s'en sert : on passe son chemin devant quelqu'un
        // dont on a découvert qu'il ne s'attache pas, ou qu'il explose.
        // Ce qu'un joueur ferait : passer devant quelqu'un dont il a
        // découvert qu'il ne s'attache pas, ou qui s'emporte.
        const bad = (knows(who, 'loyalty') && who.personality.loyalty < 50)
          || (knows(who, 'temper') && who.personality.temper > 62);
        if (bad && met < 4) { passed.courtise++; continue; }
      }
      chosen = who;
    }
    if (chosen) kept[style].push(chosen.personality);
  }
}

console.log(`\nSORTIR PERMET-IL DE CHOISIR ? ${ROUNDS} vies, deux façons de jouer`);
for (const style of ['clique', 'courtise']) {
  const all = kept[style];
  if (all.length === 0) { console.log(`  ${style} : personne`); continue; }
  const loyal = all.filter((x) => x.loyalty >= 60).length / all.length;
  const calme = all.filter((x) => x.temper <= 40).length / all.length;
  const moyenne = all.reduce((s2, x) => s2 + x.loyalty, 0) / all.length;
  console.log(`  ${style.padEnd(9)} loyaux ${(loyal * 100).toFixed(0)} %`
    + ` · posés ${(calme * 100).toFixed(0)} %`
    + ` · loyauté moyenne ${moyenne.toFixed(1)}`
    + ` · passés leur chemin ${passed[style]}`);
}
