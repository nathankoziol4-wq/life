/**
 * Vérifications de l'audit du gameplay.
 *
 * Un audit est plus dangereux qu'absent : il donne l'impression d'un travail
 * fait alors qu'il n'est qu'une liste d'affirmations. Ces tests le rattachent
 * au code, et ajoutent les trois détecteurs demandés :
 *
 * - **§151 — features orphelines** : un système sans conséquence ailleurs ;
 * - **§152 — boutons vides** : une action visible qui n'appelle rien ;
 * - **§153 — périodes vides** : un âge où le joueur n'a rien à faire.
 *
 * Les deux derniers sont statiques ou simulés, pas déclaratifs : ils lisent
 * le code et l'état du jeu, pas un tableau qu'on aurait rempli à la main.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { GAMEPLAY_AUDIT, auditProblems, orphans, overallScore } from '../../data/gameplayAudit.ts';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { ALL_EVENTS } from '../../data/events/index.ts';
import type { GameState } from '../types.ts';

const ROOT = new URL('../../../', import.meta.url).pathname;

/* ------------------------------------------------------------------ */

describe('audit du gameplay', () => {
  it('ne se contredit pas', () => {
    expect(auditProblems()).toEqual([]);
  });

  it('rattache chaque feuille non absente à du code réel', () => {
    for (const leaf of GAMEPLAY_AUDIT) {
      if (leaf.depth === 'MISSING') continue;
      const label = `${leaf.domain} > ${leaf.system} > ${leaf.leaf}`;
      const [file, symbol] = leaf.anchor!.split('#');
      expect(existsSync(ROOT + file), `${label} : fichier introuvable (${file})`).toBe(true);
      if (!symbol) continue;
      const source = readFileSync(ROOT + file, 'utf8');
      const declared = new RegExp(
        `(export (function|const|interface|type|class) ${symbol}\\b)|(export \\{[^}]*\\b${symbol}\\b)`,
      );
      expect(declared.test(source), `${label} : ${symbol} n’est pas exporté par ${file}`).toBe(true);
    }
  });

  it('couvre tous les grands domaines du jeu', () => {
    const domains = new Set(GAMEPLAY_AUDIT.map((l) => l.domain));
    for (const expected of [
      'Personnage', 'Enfance', 'École', 'Université', 'Travail', 'Relations',
      'Famille', 'Santé', 'Finance', 'Patrimoine', 'Crime', 'Justice', 'Prison',
      'Activités', 'Monde', 'Célébrité', 'Carrières spéciales',
    ]) {
      expect(domains, `domaine absent de l’audit : ${expected}`).toContain(expected);
    }
    // Un audit qui ne descend pas au niveau des feuilles ne sert à rien.
    expect(GAMEPLAY_AUDIT.length).toBeGreaterThan(100);
  });

  it('reste honnête sur son propre score', () => {
    // Le score vient des niveaux déclarés, pas d'un chiffre écrit à la main.
    const score = overallScore();
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

/* ------------------------------------------------------------------ */
/* §151 — les fonctionnalités orphelines                               */
/* ------------------------------------------------------------------ */

describe('détection des fonctionnalités orphelines', () => {
  it('ne laisse aucun système sans conséquence ailleurs', () => {
    // Une fonctionnalité qu'on peut retirer sans que rien ne change n'est pas
    // une fonctionnalité : c'est une décoration.
    expect(orphans().map((l) => `${l.domain} > ${l.leaf}`)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* §152 — les boutons vides                                            */
/* ------------------------------------------------------------------ */

/**
 * Tous les fichiers d'interface, y compris ceux du nouveau système.
 *
 * La liste était figée sur deux dossiers. La refonte déplace l'interface vers
 * `src/ui/`, et sans ce parcours récursif chaque écran migré serait sorti
 * silencieusement de la surveillance — un bouton vide y serait redevenu
 * possible le jour où il change de dossier.
 */
function uiFiles(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(ROOT + dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.tsx')) {
        out.push({ path, source: readFileSync(ROOT + path, 'utf8') });
      }
    }
  };
  for (const dir of ['src/screens', 'src/components', 'src/ui']) walk(dir);
  return out;
}

describe('détection des boutons vides', () => {
  it('n’affiche aucun gestionnaire de clic qui ne fait rien', () => {
    // Le cas qu'on traque : `onClick={() => {}}`. C'est le faux bouton par
    // excellence — il réagit visuellement et ne change rien au jeu.
    const empty: string[] = [];
    for (const { path, source } of uiFiles()) {
      for (const [index, line] of source.split('\n').entries()) {
        if (/onClick=\{\(\)\s*=>\s*\{\s*\}\}/.test(line)) {
          empty.push(`${path}:${index + 1}`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it('n’appelle que des fonctions de jeu réellement exportées', () => {
    // Chaque `run((ctx) => quelqueChose(...))` doit désigner une fonction
    // exportée par un système. Une faute de frappe ou un renommage oublié
    // produirait un bouton mort, et le typage seul ne le dirait pas si la
    // fonction existait ailleurs sous un autre sens.
    const exported = new Set<string>();
    for (const name of readdirSync(ROOT + 'src/systems')) {
      if (!name.endsWith('.ts')) continue;
      const source = readFileSync(`${ROOT}src/systems/${name}`, 'utf8');
      for (const match of source.matchAll(/export function (\w+)/g)) exported.add(match[1]);
    }

    const unknown: string[] = [];
    for (const { path, source } of uiFiles()) {
      for (const match of source.matchAll(/run\(\s*\(ctx\)\s*=>\s*(\w+)\(/g)) {
        if (!exported.has(match[1])) unknown.push(`${path} → ${match[1]}()`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('branche chaque action d’un écran sur un système', () => {
    // Un écran qui n'importe rien des systèmes ne peut rien faire arriver.
    // Les écrans purement descriptifs sont nommés ici, et devoir les nommer
    // est le garde-fou : on ne peut pas en ajouter un par distraction.
    const descriptive = new Set([
      'src/screens/StartScreen.tsx', 'src/screens/SummaryScreen.tsx',
      'src/screens/CharacterScreen.tsx', 'src/screens/TrajectoryScreen.tsx',
      'src/components/StatsBar.tsx',
      'src/components/Modal.tsx', 'src/components/PersonalityPanel.tsx',
      'src/components/RelationshipCard.tsx', 'src/components/PlanView.tsx',
      'src/components/EventModal.tsx', 'src/components/MiniGameHost.tsx',
      'src/screens/CreationScreen.tsx',
      // Le nouveau système : des primitives et une coquille, qui disposent
      // ce qu'on leur donne et n'appellent aucun système par construction.
      // `list.tsx` en fait partie — c'est le vocabulaire des listes, quatre
      // composants qui reçoivent un libellé et un `onClick` et ne savent rien
      // de ce qu'il déclenche. Devoir l'inscrire ici est le garde-fou qui
      // fonctionne : la règle a fait échouer l'intégration continue le jour
      // où le fichier est apparu, et il a fallu ce geste délibéré.
      'src/ui/components/primitives.tsx', 'src/ui/components/BottomSheet.tsx',
      'src/ui/components/list.tsx',
      'src/ui/components/AppHeader.tsx', 'src/ui/components/LifeFeed.tsx',
      'src/ui/components/TabBar.tsx', 'src/ui/theme/ThemeProvider.tsx',
      'src/ui/GameContext.tsx',
    ]);
    const inert: string[] = [];
    for (const { path, source } of uiFiles()) {
      if (descriptive.has(path)) continue;
      if (!/from '\.\.\/systems\//.test(source)) inert.push(path);
    }
    expect(inert).toEqual([]);
  });

  it('ne retire pas son geste à une ligne qu’elle déclare fermée', () => {
    /*
     * **Une ligne refusée doit rester un bouton.**
     *
     * Le motif traqué : `<Row closed={…} onClick={raison ? undefined : …} />`.
     * Privée de son geste, la ligne n'est plus rendue comme un bouton mais
     * comme un bloc — hors de l'ordre de tabulation, hors de l'arbre
     * d'accessibilité, et donc jamais annoncée par une voix de synthèse. Or
     * `closed` existe précisément pour refuser l'appui *sans* faire
     * disparaître la ligne : `Row` ignore déjà le clic dans ce cas, et
     * retirer le gestionnaire par-dessus ne protège de rien tout en coûtant
     * l'annonce.
     *
     * Le défaut s'est glissé dans quatre écrans déjà migrés, et il a fallu
     * que l'inventaire de parité apprenne à compter ce qui est *actionnable*
     * pour qu'il se voie : 243 lignes fermées du jeu n'étaient pas des
     * boutons, dont tout le tableau des offres d'emploi.
     *
     * La règle ne vise que les lignes qui se déclarent fermées. Une ligne
     * sans `closed` qui n'a pas de geste est un relevé — la note d'un examen
     * déjà passé, une ligne de bilan — et c'est légitime.
     */
    const guilty: string[] = [];
    for (const { path, source } of uiFiles()) {
      // Chaque élément `<Row …/>` pris isolément : la règle porte sur la
      // combinaison de deux attributs du *même* élément, pas du fichier.
      for (const chunk of source.split('<Row').slice(1)) {
        const el = chunk.slice(0, chunk.indexOf('/>'));
        if (!/\bclosed=/.test(el)) continue;
        if (/onClick=\{[^}]*\?\s*undefined\s*:/.test(el)) {
          const title = /title=\{?["`']?([^"`'}\n]{0,40})/.exec(el)?.[1] ?? '?';
          guilty.push(`${path} → ${title.trim()}`);
        }
      }
    }
    expect(guilty).toEqual([]);
  });

  it('ne pose jamais l’attribut « disabled » du navigateur sur une ligne', () => {
    /*
     * **La porte par laquelle tout est revenu.**
     *
     * `disabled` retire l'élément de l'ordre de tabulation *et* de l'arbre
     * d'accessibilité : une voix de synthèse ne l'annonce plus du tout. Or
     * dans ce jeu « indisponible » veut presque toujours dire « pas encore,
     * et voilà pourquoi » — l'explication est le contenu. `closed` refuse
     * l'appui sans faire disparaître, et `because` porte la raison.
     *
     * La règle n'était pas tenable tant que deux `Row` coexistaient :
     * l'ancienne n'avait que `disabled`, et vingt-et-un écrans s'en
     * servaient encore. Elle l'est depuis que l'ancienne a été supprimée.
     *
     * Elle ne vise que les lignes. Un bouton de formulaire désactivé tant
     * que la saisie est invalide — « Emprunter 0 kr » — est l'usage normal
     * de l'attribut, et son libellé dit déjà l'état.
     */
    const guilty: string[] = [];
    for (const { path, source } of uiFiles()) {
      for (const chunk of source.split('<Row').slice(1)) {
        const el = chunk.slice(0, chunk.indexOf('/>'));
        if (!/\bdisabled=/.test(el)) continue;
        const title = /title=\{?["`']?([^"`'}\n]{0,40})/.exec(el)?.[1] ?? '?';
        guilty.push(`${path} → ${title.trim()}`);
      }
    }
    expect(guilty).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* §153 — les périodes vides                                           */
/* ------------------------------------------------------------------ */

/** Le nombre d'événements que le moteur peut tirer à un âge donné. */
function eventsAt(age: number): number {
  return ALL_EVENTS.filter((event) => {
    const cond = event.cond ?? {};
    if (cond.minAge !== undefined && age < cond.minAge) return false;
    if (cond.maxAge !== undefined && age > cond.maxAge) return false;
    return true;
  }).length;
}

describe('détection des périodes vides', () => {
  it('mesure la densité d’événements âge par âge', () => {
    // Ce test ne juge pas : il enregistre. Sa valeur est de rendre la
    // pauvreté d'une tranche d'âge visible et chiffrée, au lieu de la
    // laisser se deviner en jouant.
    const density: Record<string, number> = {};
    for (let start = 0; start <= 85; start += 5) {
      let sum = 0;
      for (let age = start; age < start + 5; age++) sum += eventsAt(age);
      density[`${start}-${start + 4}`] = Math.round(sum / 5);
    }
    // L'enfance est la période la plus pauvre du jeu, et de loin.
    expect(density['0-4']).toBeLessThan(density['30-34']);
    // Aucune tranche ne doit être totalement vide : ce serait une année
    // pendant laquelle il ne peut littéralement rien arriver.
    for (const [range, count] of Object.entries(density)) {
      expect(count, `tranche ${range} sans aucun événement possible`).toBeGreaterThan(0);
    }
  });

  it('donne quelque chose à faire à chaque âge d’une vie jouée', () => {
    // On joue une vie et on compte, année après année, ce que le joueur
    // pourrait déclencher. Une année sans rien est une année où le bouton
    // « +1 an » est la seule option — c'est ce qu'on cherche à interdire.
    const state = createNewLife({ seed: 4242 });
    const thin: string[] = [];
    for (let year = 0; year < 70 && !state.gameOver; year++) {
      simulateYear(state);
      const ctx = createCtx(state);
      for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
      state.pending = [];
      if (!state.player.alive) break;
      const count = playableCount(state);
      if (count < 3) thin.push(`${state.player.age} ans : ${count} action(s)`);
    }
    expect(thin).toEqual([]);
  });
});

/**
 * Compte grossièrement ce qu'un joueur peut faire cette année.
 *
 * On ne cherche pas l'exactitude : on cherche à repérer les âges où la
 * réponse est « presque rien ».
 */
function playableCount(state: GameState): number {
  const p = state.player;
  let count = 0;
  // Toujours : avancer d'un an, consulter sa fiche, voir ses proches.
  count += 2;
  if (Object.values(state.npcs).some((n) => n.alive)) count += 1;
  if (p.age >= 6 && p.age <= 18) count += 3; // école : effort, camarades, personnel
  if (p.age >= 5 && p.age < 18) count += 1; // demander à ses parents
  if (p.job) count += 3;
  if (p.age >= 16) count += 2; // activités, santé
  if (p.age >= 18) count += 2; // finance, patrimoine
  if (p.prison) count += 3;
  return count;
}
