/**
 * Les types du pilote d'évasion.
 *
 * Le pilote lui-même est écrit en JavaScript sans le moindre `import` : c'est
 * la condition pour qu'il puisse être injecté tel quel dans la page du test
 * de fumée (`new Function('return (' + fn + ')')`). Un fichier de
 * déclarations lui rend un typage complet du côté TypeScript, sans lui
 * imposer une compilation qu'il ne peut pas subir.
 */

/** Ce que le pilote voit — et rien d'autre : tout est affiché à l'écran. */
export interface EscapeSight {
  player: { x: number; y: number };
  breach: { x: number; y: number };
  /** Les pions des gardiens. Leur regard, lui, n'est pas dessiné. */
  guards: { x: number; y: number }[];
  beams: { x: number; y: number; angle: number; half: number; range: number }[];
  /** La jauge de vigilance, 0-100. */
  alert: number;
  spotted: boolean;
  hidden: boolean;
  /** Millisecondes avant l'appel. */
  remaining: number;
}

/** Les quelques nombres qui décident du tempérament du pilote. */
export interface EscapePilotTuning {
  /** Combien pèse un gardien en vue directe, dont on ignore le regard. */
  guardRisk?: number;
  /** Le prix d'une case exposée, en pas. */
  penalty?: number;
  /** La vigilance à partir de laquelle on va souffler. */
  rest?: number;
  /** Celle en dessous de laquelle on repart. */
  calm?: number;
  /** La distance à un gardien en deçà de laquelle une case est interdite. */
  touching?: number;
}

/** Une cible visée, en cases, et l'appui long. */
export interface EscapeAim {
  x: number;
  y: number;
  hold: boolean;
}

export declare function makeEscapePilot(
  plan: { width: number; height: number; cells: string[] },
  tuning?: EscapePilotTuning,
): (view: EscapeSight, dt: number) => EscapeAim;

export declare function escapeView(state: unknown): EscapeSight;
