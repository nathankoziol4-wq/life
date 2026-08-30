/**
 * Ce que la création décide vraiment.
 *
 * Le catalogue dit « composer sa famille » absent, « régler le tempérament »
 * partiel et « composer son apparence » absent — mais `OriginDraft` porte
 * déjà `siblings`, `temperament` et `appearance`, et le moteur les lit. Avant
 * d'écrire quoi que ce soit, il faut donc savoir lesquelles de ces feuilles
 * sont vraiment absentes et lesquelles sont des notes périmées.
 *
 * On ne le demande pas au code : on fabrique deux vies qui ne diffèrent que
 * par un champ du brouillon, et on regarde si la vie obtenue en tient compte.
 *
 *   node --experimental-strip-types tools/measure-berceau.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';

const SEED = 4242;

function life(draft) {
  return createNewLife({ seed: SEED, draft });
}

const ref = life({});
console.log(`référence (graine ${SEED}) : ${ref.player.firstName} ${ref.player.lastName}, ${ref.player.sex}`);

/* ---- Le tempérament ---- */
const froid = life({ temperament: { emotionalReactivity: 5, persistence: 5 } });
const chaud = life({ temperament: { emotionalReactivity: 95, persistence: 95 } });
const t = (s) => s.player.psyche?.temperament ?? {};
console.log('\nTEMPÉRAMENT');
console.log(`  réactivité demandée 5 → obtenue ${t(froid).emotionalReactivity} · demandée 95 → obtenue ${t(chaud).emotionalReactivity}`);
console.log(`  ténacité   demandée 5 → obtenue ${t(froid).persistence} · demandée 95 → obtenue ${t(chaud).persistence}`);
console.log(`  effet sur les statistiques : stress ${froid.player.stats.stress} → ${chaud.player.stats.stress}`
  + ` · discipline ${froid.player.stats.discipline} → ${chaud.player.stats.discipline}`);

/* ---- La fratrie ---- */
const seul = life({ siblings: [] });
const nombreux = life({
  siblings: [
    { sex: 'M', ageGap: 3, kind: 'plein' },
    { sex: 'F', ageGap: -2, kind: 'plein' },
    { sex: 'F', ageGap: 6, kind: 'demi' },
  ],
});
const kin = (s) => Object.values(s.npcs).filter((n) => n.relation === 'brother' || n.relation === 'sister');
console.log('\nFRATRIE');
console.log(`  demandée 0 → ${kin(seul).length} PNJ · demandée 3 → ${kin(nombreux).length} PNJ`);
console.log(`  âges obtenus : ${kin(nombreux).map((n) => `${n.firstName} ${n.age}`).join(', ') || '(aucun)'}`);

/* ---- L'apparence ---- */
const brun = life({ appearance: { hairColor: 'noirs', eyeColor: 'verts', build: 'athlétique', targetHeight: 195 } });
const a = brun.player.appearance ?? {};
console.log('\nAPPARENCE');
console.log(`  cheveux demandés « noirs » → ${a.hairColor} · yeux « verts » → ${a.eyeColor}`);
console.log(`  carrure « athlétique » → ${a.build} · taille 195 → ${a.targetHeight}`);
console.log(`  effet sur l’allure : ${ref.player.stats.looks} → ${brun.player.stats.looks}`);

/* ---- La structure familiale ---- */
for (const structure of ['deux parents', 'parent seul', 'adoption']) {
  const s = life({ structure });
  const parents = Object.values(s.npcs).filter((n) => ['mother', 'father', 'stepmother', 'stepfather'].includes(n.relation));
  console.log(`\nSTRUCTURE « ${structure} » → ${parents.length} figure(s) parentale(s) : ${parents.map((p) => p.relation).join(', ')}`);
}

/* ---- Les potentiels hérités ---- */
console.log('\nPOTENTIELS HÉRITÉS (l’enveloppe)');
const tete = life({ gifts: { cognitivePotential: 90, athleticPotential: 35, constitution: 35 } });
const corps = life({ gifts: { cognitivePotential: 35, athleticPotential: 90, constitution: 35 } });
const g = (s) => s.player.genetics ?? {};
console.log(`  demandé cognitif 90 → ${g(tete).cognitivePotential} · athlétique 90 → ${g(corps).athleticPotential}`);
console.log(`  intelligence obtenue : tête ${tete.player.stats.intelligence} · corps ${corps.player.stats.intelligence}`);
console.log(`  forme obtenue        : tête ${tete.player.stats.fitness} · corps ${corps.player.stats.fitness}`);
console.log(`  santé obtenue        : tête ${tete.player.stats.health} · corps ${corps.player.stats.health}`);
console.log(`  référence (rien demandé) : cognitif ${g(ref).cognitivePotential} · int ${ref.player.stats.intelligence}`);

// Composer un seul potentiel ne doit pas décaler le reste de la vie : les
// tirages ont lieu dans tous les cas, choisis ou non.
const unSeul = life({ gifts: { cognitivePotential: 70 } });
console.log(`\n  en ne fixant que le cognitif, le reste est-il intact ?`);
console.log(`    athlétique ${g(ref).athleticPotential} → ${g(unSeul).athleticPotential}`
  + ` · constitution ${g(ref).constitution} → ${g(unSeul).constitution}`
  + ` · prénom ${ref.player.firstName} → ${unSeul.player.firstName}`);
