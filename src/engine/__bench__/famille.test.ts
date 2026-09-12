/**
 * Le chemin vers un enfant, quand il ne vient pas.
 *
 * **Deux boutons qui promettaient ce qu'ils ne faisaient pas.**
 *
 * `fertilityTreatment` s'annonçait « augmente fortement les chances de
 * conception » : il posait `flags.fertilityTreatment = true` et **ne le
 * retirait jamais**, si bien qu'un achat unique à vingt-cinq ans multipliait
 * les chances par 2,4 et ajoutait vingt-deux points de fertilité pour le reste
 * de la vie. Il n'y avait donc jamais qu'une décision : l'acheter.
 *
 * `adoptChild` s'annonçait « procédure longue et sélective » : elle faisait un
 * tirage, et un enfant apparaissait dans la seconde. Ni dossier, ni délai, ni
 * motif de refus, et aucune façon d'améliorer ses chances autrement qu'en
 * réessayant l'année suivante.
 *
 * Six exigences, dont deux mesurées sur des vies entières :
 *
 * 1. **le protocole ne dure qu'un an**, et le énième vaut moins que le premier ;
 * 2. **un protocole raté coûte au couple**, sans quoi s'acharner serait gratuit ;
 * 3. **le dossier traverse les années**, par étapes nommées ;
 * 4. **ce qui pèse est nommé, et pèse vraiment** — un casier fait tomber le
 *    dossier de quarante-deux points, et cela se voit dans les refus ;
 * 5. **ce qu'on accepte décide de ce qu'on attend** ;
 * 6. **l'enfant qui arrive sait d'où il vient** — la boucle que `roots.ts`
 *    rendait possible et que le marqueur mort `flags.adopted` ne fermait pas.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { OPENNESS, STAGE_YEARS, getOpenness } from '../../data/parenthood.ts';
import {
  advanceParenthood, cycleBlocker, cycleBoost, expectedWait, fileFactors,
  fileFee, fileOf, fileStrength, openBlocker, openFile, parenthoodOf, runCycle,
  setOpenness, withdrawFile,
} from '../../systems/parenthood.ts';
import { conceptionChance } from '../probability.ts';

function adult(seed: number, age = 30): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < age && !state.gameOver; i++) simulateYear(state);
  state.player.money = Math.max(state.player.money, 500_000);
  state.player.yearActions = {};
  return state;
}

/** Le conjoint ou le partenaire, s'il y en a un. */
function partner(state: GameState) {
  return Object.values(state.npcs).find(
    (n) => n.alive && (n.relation === 'spouse' || n.relation === 'partner'),
  );
}

describe('le protocole', () => {
  it('ne vaut que pour l’année où on l’engage', () => {
    /*
     * **La correction principale.** Le marqueur d'avant ne s'effaçait jamais :
     * une seule décision valait pour une vie entière, et il n'y avait plus
     * rien à décider ensuite.
     */
    const state = adult(3);
    expect(cycleBoost(state)).toBe(1);
    expect(runCycle(createCtx(state)).ok).toBe(true);
    expect(cycleBoost(state)).toBeGreaterThan(2);

    state.year += 1;
    expect(cycleBoost(state)).toBe(1);
  });

  it('rend de moins en moins, et le dit', () => {
    const state = adult(5);
    const held = parenthoodOf(state);
    const boosts: number[] = [];
    for (let i = 0; i < 6; i++) {
      held.lastCycle = null;
      const result = runCycle(createCtx(state));
      expect(result.ok).toBe(true);
      boosts.push(cycleBoost(state));
    }
    // Mesuré : ×2,40 puis ×2,15, ×1,94, ×1,77, ×1,63, ×1,52.
    for (let i = 1; i < boosts.length; i++) {
      expect(boosts[i]!).toBeLessThan(boosts[i - 1]!);
    }
    expect(boosts[0]!).toBeGreaterThan(2.2);
    expect(boosts.at(-1)!).toBeLessThan(1.7);
    // Et l'acharnement se paie : le total dépensé est lisible à l'écran.
    expect(held.spent).toBeGreaterThan(0);
    expect(held.cycles).toBe(6);
  });

  it('ne remplace pas l’essai, il l’améliore', () => {
    // Le protocole entre dans `conceptionChance` comme un multiplicateur, et
    // rien d'autre : sans tentative dans l'année, il ne fait rien du tout.
    const args = {
      motherAge: 33, fatherAge: 35, motherFertility: 60, fatherFertility: 60, health: 70,
    };
    const plain = conceptionChance({ ...args, treatment: 1 });
    const helped = conceptionChance({ ...args, treatment: 2.4 });
    expect(helped).toBeGreaterThan(plain);
    // Jamais la certitude : c'est un coup de pouce, pas une commande.
    expect(helped).toBeLessThan(0.8);
  });

  it('coûte au couple quand il ne donne rien', () => {
    /*
     * Et c'est le bilan de l'année qui l'applique, pas l'achat : le protocole
     * ne coûte rien tant qu'on ne sait pas s'il a marché. C'est l'attente et
     * l'échec qui pèsent, ce qui est ce que ce chemin a de dur.
     */
    const state = adult(7);
    const mate = partner(state);
    if (!mate) return;
    runCycle(createCtx(state));
    const before = mate.relationship;
    const mood = state.player.stats.happiness;

    state.year += 1;
    delete state.player.flags.pregnant;
    advanceParenthood(createCtx(state));
    expect(mate.relationship).toBeLessThan(before);
    expect(state.player.stats.happiness).toBeLessThan(mood);
  });

  it('refuse ce qui n’a pas de sens, et le dit', () => {
    const state = adult(9);
    expect(cycleBlocker(state)).toBeNull();
    runCycle(createCtx(state));
    expect(cycleBlocker(state)).toContain('par an');

    parenthoodOf(state).lastCycle = null;
    state.player.age = 62;
    expect(cycleBlocker(state)).toContain('âge');
  });
});

describe('le dossier', () => {
  it('traverse les années au lieu de se résoudre au tirage', () => {
    const state = adult(11);
    expect(fileOf(state)).toBeNull();
    expect(openFile(createCtx(state), 'grand').ok).toBe(true);

    const file = fileOf(state)!;
    expect(file.stage).toBe('dossier');
    // Constitution puis enquête avant même de commencer à attendre.
    for (let i = 0; i < STAGE_YEARS.dossier; i++) advanceParenthood(createCtx(state));
    expect(file.stage).toBe('enquête');
    for (let i = 0; i < STAGE_YEARS.enquête; i++) advanceParenthood(createCtx(state));
    expect(['attente', 'refusé']).toContain(file.stage);
  });

  it('nomme ce qui pèse, et ce qui pèse pèse vraiment', () => {
    /*
     * **La différence entre un dossier et un tirage.** Mesuré sur trente-neuf
     * vies conduites jusqu'au bout : dossier ordinaire 48, quatre refus ; avec
     * un casier 6, vingt-quatre refus ; avec une dépendance 18, quatorze
     * refus. Ce sont les poids nommés qui décident, et l'écran les affiche un
     * par un pour qu'on puisse aller les corriger.
     */
    const plain = adult(13);
    expect(fileFactors(plain).length).toBeGreaterThan(2);

    /*
     * **On mesure la somme des poids, pas la solidité affichée.**
     * `fileStrength` borne à [0,02 · 0,97], et un dossier déjà faible touche le
     * plancher : le casier retirait bien ses 0,42, mais 0,02 n'est pas
     * inférieur à 0,32 − 0,3. Le test échouait sur la borne, pas sur le poids —
     * il ne tenait que tant que la graine 13 rendait un dossier assez solide
     * pour avoir de la place sous lui.
     */
    const raw = (s: GameState) => fileFactors(s).reduce((t, f) => t + f.weight, 0);
    const base = raw(plain);

    const marked = adult(13);
    marked.player.criminalRecord.convictions.push({
      crimeId: 'vol', year: marked.year, sentenceYears: 1, fine: 0,
    } as never);
    expect(raw(marked)).toBeLessThan(base - 0.3);
    expect(fileFactors(marked).some((f) => f.label.includes('casier'))).toBe(true);
    // Et cela se voit aussi sur ce que l'écran affiche, borne comprise.
    expect(fileStrength(marked)).toBeLessThan(fileStrength(plain));

    const hooked = adult(13);
    hooked.player.stats.addiction = 80;
    expect(raw(hooked)).toBeLessThan(base - 0.2);
    expect(fileStrength(hooked)).toBeLessThan(fileStrength(plain));

    // Et le côté positif compte aussi : mesuré, 21 avec tout juste de quoi
    // payer, 47 à l'aise, 59 marié et bien vu.
    const poor = adult(13);
    poor.player.money = fileFee(poor) + 100;
    const rich = adult(13);
    rich.player.money = fileFee(rich) * 12;
    expect(fileStrength(rich)).toBeGreaterThan(fileStrength(poor) + 0.15);
  });

  it('refuse en disant pourquoi, et on peut rouvrir', () => {
    const state = adult(17);
    state.player.criminalRecord.convictions.push({
      crimeId: 'vol', year: state.year, sentenceYears: 1, fine: 0,
    } as never);
    openFile(createCtx(state), 'grand');

    let refused = false;
    for (let i = 0; i < 12 && !refused; i++) {
      advanceParenthood(createCtx(state));
      refused = fileOf(state)?.stage === 'refusé';
    }
    if (!refused) return;
    const file = fileOf(state)!;
    // Un refus muet ne serait qu'un tirage perdu ; nommé, c'est quelque chose
    // qu'on peut aller corriger.
    expect(file.refusedFor).toBeTruthy();
    expect(file.refusedFor).toContain('casier');
    // Et l'on peut rouvrir — en repartant du début.
    expect(openBlocker(state, 'grand')).toBeNull();
  });

  it('se retire, et rouvrir repart du début', () => {
    const state = adult(19);
    openFile(createCtx(state), 'bebe');
    for (let i = 0; i < 3; i++) advanceParenthood(createCtx(state));
    expect(withdrawFile(createCtx(state)).ok).toBe(true);
    expect(fileOf(state)).toBeNull();

    expect(openFile(createCtx(state), 'bebe').ok).toBe(true);
    expect(fileOf(state)!.stage).toBe('dossier');
  });
});

describe('ce qu’on accepte', () => {
  it('décide de ce qu’on attend', () => {
    const state = adult(23);
    const waits = OPENNESS.map((o) => expectedWait(state, o.id));
    // Un nourrisson est ce que presque tous demandent, donc la file la plus
    // longue. Mesuré de bout en bout : 10 ans contre 5.
    expect(waits[0]!).toBeGreaterThan(waits.at(-1)!);
    for (let i = 1; i < waits.length; i++) {
      expect(waits[i]!, OPENNESS[i]!.id).toBeLessThanOrEqual(waits[i - 1]!);
    }
  });

  it('se change sans repartir de zéro', () => {
    const state = adult(29);
    openFile(createCtx(state), 'bebe');
    const file = fileOf(state)!;
    for (let i = 0; i < 4; i++) advanceParenthood(createCtx(state));
    if (file.stage === 'refusé') return;
    const waited = file.inStage;

    const long = file.wait;
    expect(setOpenness(createCtx(state), 'besoins').ok).toBe(true);
    expect(file.wait).toBeLessThan(long);
    // Les années déjà passées comptent : sans cela, changer d'avis serait
    // toujours perdant, et personne ne le ferait jamais.
    expect(file.inStage).toBe(waited);
    expect(setOpenness(createCtx(state), 'besoins').ok).toBe(false);
  });

  it('fait arriver ce qui a été demandé', () => {
    const state = adult(31);
    openFile(createCtx(state), 'fratrie');
    const before = Object.values(state.npcs).filter((n) => n.flags.adopted).length;
    for (let i = 0; i < 40 && fileOf(state)!.stage !== 'arrivé'; i++) {
      if (fileOf(state)!.stage === 'refusé') return;
      state.year += 1;
      advanceParenthood(createCtx(state));
    }
    const kids = Object.values(state.npcs).filter((n) => n.flags.adopted);
    expect(kids.length - before).toBe(getOpenness('fratrie')!.count);
    expect(parenthoodOf(state).arrived).toBe(getOpenness('fratrie')!.count);
    for (const kid of kids) {
      expect(['son', 'daughter']).toContain(kid.relation);
      // Il arrive avec une histoire, et le lien de départ le dit.
      expect(kid.history.length).toBeGreaterThan(0);
    }
  });
});

describe('la boucle', () => {
  it('rend à l’enfant adopté la question qu’on lui a fait poser', () => {
    /*
     * `flags.adopted` existait depuis toujours et **n'était relu nulle part** :
     * pas un système du jeu ne distinguait un enfant adopté d'un autre, et
     * reprendre la partie avec lui donnait un milieu tiré au sort. C'est la
     * boucle que `roots.ts` rendait possible et que personne ne fermait.
     */
    const source = readFileSync(
      new URL('../../systems/lineage.ts', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain("flags.adopted === true ? 'adopted'");
    expect(source).toContain('seedRoots');
  });
});

describe('l’écran', () => {
  it('montre ce que ça demande, pas ce que ça coûte seulement', () => {
    const source = readFileSync(
      new URL('../../screens/ParenthoodScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    // Les poids nommés, l'attente par ouverture, et le total dépensé : les
    // trois choses sans lesquelles ni le dossier ni le protocole ne seraient
    // des décisions.
    expect(source).toContain('fileFactors');
    expect(source).toContain('expectedWait');
    expect(source).toContain('spent');
    expect(source).toContain('withdrawFile');
  });

  it('n’annonce plus ce qu’il ne fait pas', () => {
    const source = readFileSync(
      new URL('../../screens/RelationshipsScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    // Les deux libellés d'avant décrivaient précisément ce que le code ne
    // faisait pas. Ils ne doivent pas revenir.
    expect(source).not.toContain('Procédure longue et sélective');
    expect(source).not.toContain('Augmente fortement les chances');
  });
});
