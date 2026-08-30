/**
 * Fabrique une sauvegarde de quelqu'un qui **détient** des placements.
 *
 * Pourquoi une de plus, à côté de `fixture-investor.mjs` : celle-là s'arrête
 * à « de quoi placer ». Elle garde la première vie assez riche pour que le
 * marché ne soit pas entièrement grisé, et n'achète rien. La moitié haute de
 * l'écran de portefeuille — ce qu'on détient, la ligne bloquée, la
 * répartition, la vente — n'a donc jamais été relevée par aucune mesure,
 * alors que c'est le cœur de cet écran.
 *
 * Et pourquoi ne pas simplement faire placer `fixture-investor` : parce que
 * cette sauvegarde-là est la partie de référence de cinq autres outils — les
 * audits mobile, paysage, clavier, performance, et le test de fumée. La faire
 * acheter la laisse plus vieille et sans liquidités, ce qui déplacerait en
 * silence la base de comparaison de tout ce monde. Un fichier de plus coûte
 * moins cher qu'une mesure qui change sans qu'on sache pourquoi.
 *
 * Rien n'est posé à la main : on part de la même recherche de graine, puis on
 * place par `invest` — donc à travers le ticket minimum, les frais et le
 * blocage de littératie. Un support qu'on ne comprend pas est refusé ici
 * exactement comme il le serait à l'écran.
 *
 *   node --experimental-strip-types tools/fixture-placements.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { ASSETS } from '../src/data/assets.ts';
import {
  holdingsOf, invest, isLocked, minimumTicket,
} from '../src/systems/investing.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/**
 * Assez pour placer **et** pour vivre l'année qui suit.
 *
 * Trois fois le ticket suffisait à placer, et c'est ce que mesurait la
 * première version. Le personnage retenu se trouvait sans emploi à
 * quarante-cinq ans avec trois emprunts : l'année suivante ramenait ses
 * liquidités à zéro, et un portefeuille sans liquidités grise le marché
 * entier — on obtenait la moitié haute de l'écran en échange de la moitié
 * basse. Huit fois le ticket est le seuil qui laisse les deux vivantes ; la
 * vérification qui compte est celle de la fin, sur l'état réellement obtenu.
 */
function reachable(state) {
  const fund = ASSETS.find((a) => a.id === 'realestatefund');
  return state.player.money >= minimumTicket(state, fund) * 8;
}

function wealthyLife(skip = 0) {
  let found = 0;
  for (let seed = 91_000; seed < 91_600; seed++) {
    const life = createNewLife({ seed });
    play(life, 45);
    if (life.gameOver || !life.player.alive) continue;
    if (life.player.prison || life.player.criminalRecord.wanted) continue;
    if (!reachable(life)) continue;
    // On saute les parties déjà essayées : sans cela, chaque essai rendrait
    // la même et la boucle du dessus tournerait à vide.
    if (found++ < skip) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un adulte avec de l’épargne');
}

/**
 * **La recherche vérifie ce qu'elle cherche, pas un indice de ce qu'elle
 * cherche.**
 *
 * Ce fichier disait déjà que « la vérification qui compte est celle de la
 * fin, sur l'état réellement obtenu » — et pourtant la recherche s'arrêtait
 * sur un seuil approché, huit fois le ticket, choisi parce qu'il avait
 * marché. Un changement sans rapport, ailleurs dans le moteur, a décalé le
 * tirage : la graine retenue s'est retrouvée à sec après ses deux années, et
 * la fabrique est morte sur sa propre vérification finale.
 *
 * On place et l'on joue donc **à l'intérieur** de la recherche, et l'on
 * garde la première partie qui satisfait vraiment les trois conditions.
 */
function usableLife() {
  const problems = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    let life;
    try {
      life = wealthyLife(attempt);
    } catch {
      break;
    }
    const holdings = placeSome(life);
    if (holdings.length < 3) { problems.push('portefeuille trop maigre'); continue; }
    play(life, 2);
    if (!holdingsOf(life).some((h) => isLocked(life, h))) {
      problems.push('aucune ligne bloquée'); continue;
    }
    if (holdingsOf(life).length < 3) { problems.push('portefeuille trop maigre'); continue; }
    if (life.player.money <= 0) { problems.push('sans liquidités'); continue; }
    return life;
  }
  throw new Error(`aucune partie utilisable — ${problems.join(', ') || 'aucune graine'}`);
}

/**
 * Placer, comme le joueur le ferait.
 *
 * Le support à blocage long vient **en premier** : il doit rester bloqué à
 * l'arrivée, et c'est le nombre d'années jouées ensuite qui en décide. C'est
 * le seul moyen d'obtenir une ligne « bloqué jusqu'en … », un état que
 * l'écran sait afficher et que rien n'avait jamais produit.
 *
 * On place la valeur du ticket et pas davantage : ce qu'on cherche est un
 * portefeuille à plusieurs lignes, pas un gros portefeuille. Ce qui reste sur
 * le compte garde le marché ouvert, et donc les deux états de la même ligne
 * — détenue et achetable — lisibles dans la même partie.
 */
function placeSome(life) {
  const wanted = ['realestatefund', 'index', 'gold', 'bonds'];
  for (const id of wanted) {
    const asset = ASSETS.find((a) => a.id === id);
    // Un identifiant inexistant se rattrape ici plutôt que de ne rien faire.
    // Premier jet : il visait « livret », « obligations », « actions » — trois
    // noms qui n'existent pas — et la fabrique plaçait donc une seule ligne en
    // silence, ce qui ressemblait beaucoup à un succès.
    if (!asset) throw new Error(`support inconnu : ${id}`);
    const amount = minimumTicket(life, asset);
    if (life.player.money < amount) continue;
    invest(createCtx(life), asset.id, amount);
  }
  return holdingsOf(life);
}

/*
 * Les deux années de plus sont jouées dans `usableLife` : sans elles tout vaut
 * son prix de revient, le résultat latent est nul partout et l'écran n'a rien
 * à dire. Deux et pas davantage, pour que le support bloqué trois ans le soit
 * encore. Les trois conditions que cette sauvegarde existe pour montrer sont
 * vérifiées là-bas, sur l'état réellement obtenu.
 */
const state = usableLife();

state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
