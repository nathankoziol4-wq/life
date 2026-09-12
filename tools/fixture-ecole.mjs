/**
 * Fabrique une sauvegarde de parent dont l'enfant est en âge d'être quelque
 * part.
 *
 * Pourquoi : l'écran ne montre l'essentiel — onze établissements, leurs frais,
 * l'accord annoncé pour cet enfant-là — qu'à condition d'avoir un enfant entre
 * six et dix-huit ans et de quoi payer au moins une partie de la liste.
 * L'autojoueur de la maison se met en couple et a des enfants, mais rarement au
 * bon âge au bon moment.
 *
 * Rien n'est truqué du côté de l'enfant : il vient d'une vie jouée avec
 * `autoplayLife`, avec la tenue et la tête que son enfance lui a données. Seul
 * l'argent est posé — ce qu'on veut montrer est le choix, pas la probabilité de
 * pouvoir se l'offrir.
 *
 *   node --experimental-strip-types tools/fixture-ecole.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { atSchoolAge, optionsFor } from '../src/systems/schooling.ts';

/*
 * `autoplayLife` joue jusqu'à la mort : on l'arrête donc à une année choisie,
 * et l'on balaie les années pour tomber sur celle où un enfant a le bon âge.
 * Une première version bouclait avec un pas de 7 919 sur un intervalle de
 * 4 000 — c'est-à-dire une seule graine, essayée une seule fois.
 */
function parentLife() {
  for (let i = 0; i < 400; i += 1) {
    const seed = i * 7919 + 3;
    const years = 30 + (i % 22);
    const life = autoplayLife(seed, { maxYears: years });
    if (!life.player.alive || life.player.prison) continue;
    const kids = Object.values(life.npcs)
      .filter((x) => x.alive && (x.relation === 'son' || x.relation === 'daughter'));
    const atAge = kids.filter((k) => atSchoolAge(k));
    if (atAge.length === 0) continue;

    life.player.money = 400_000 * life.world.inflation;
    // L'écran doit avoir des lignes ouvertes et des lignes fermées : c'est le
    // contraste entre ce qu'on peut et ce qu'on ne peut pas qui se lit.
    const rows = optionsFor(life, atAge[0]);
    if (rows.filter((r) => r.why === null).length < 4) continue;
    if (rows.filter((r) => r.why !== null).length < 1) continue;

    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un parent avec un enfant scolarisable');
}

const state = parentLife();
process.stdout.write(JSON.stringify(state));
