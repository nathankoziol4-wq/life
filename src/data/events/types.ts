/**
 * Format déclaratif des événements aléatoires.
 *
 * Un événement est de la donnée pure : ni logique, ni accès au moteur. Le
 * système `randomEvents` évalue les conditions, tire un événement, l'affiche,
 * puis applique les effets du choix retenu. Ajouter un fichier d'événements et
 * l'enregistrer dans `index.ts` suffit à enrichir le jeu (§29).
 */

import type { RelationKind, Sex, StatKey, TimelineKind } from '../../engine/types.ts';

/** Effets spéciaux traités par le moteur (au-delà des simples statistiques). */
export type SpecialEffect =
  | 'loseJob'
  | 'promotion'
  | 'demotion'
  | 'arrest'
  | 'injury'
  | 'illness'
  | 'newFriend'
  | 'loseFriend'
  | 'estrange'
  | 'breakup'
  | 'pregnancy'
  | 'expelled'
  | 'gainFollowers'
  | 'loseFollowers'
  | 'vehicleDamage'
  | 'propertyDamage'
  | 'newPet'
  | 'petDeath'
  | 'personDeath'
  | 'smallInheritance'
  | 'jobOffer'
  | 'scholarship'
  | 'addiction';

export interface EventEffects {
  /** Variations de statistiques (additives, bornées 0-100). */
  stats?: Partial<Record<StatKey, number>>;
  /** Variation d'argent absolue (ajustée par le coût de la vie du pays). */
  money?: number;
  /** Variation d'argent en fraction du patrimoine liquide (-0.1 = -10 %). */
  moneyPct?: number;
  /** Variation de la relation avec le PNJ concerné. */
  rel?: number;
  /** Variation de l'opinion du PNJ concerné. */
  opinion?: number;
  /** Marqueur posé sur le joueur (persistant). */
  flag?: string;
  /** Effet spécial délégué au moteur. */
  special?: SpecialEffect;
  /** Paramètre du effet spécial (id de maladie, montant…). */
  specialArg?: string | number;
}

export interface EventOutcome {
  /** Poids relatif si l'issue est tirée au sort. Défaut : 1. */
  weight?: number;
  /** Texte affiché après le choix. */
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  effects?: EventEffects;
}

export interface EventChoiceDef {
  label: string;
  /** Une issue = certaine ; plusieurs = tirage pondéré. */
  outcomes: EventOutcome[];
  /** Condition d'affichage du choix (ex : avoir l'argent). */
  requiresMoney?: number;
  /** Statistique minimale pour que le choix apparaisse. */
  requiresStat?: Partial<Record<StatKey, number>>;
}

export interface EventCondition {
  minAge?: number;
  maxAge?: number;
  /** Cycles scolaires autorisés. */
  schoolStage?: string[];
  hasJob?: boolean;
  /** Le joueur exerce-t-il un métier à son compte ? */
  hasFreelance?: boolean;
  /** Le joueur possède-t-il une entreprise ? */
  hasBusiness?: boolean;
  hasPartner?: boolean;
  isMarried?: boolean;
  hasChildren?: boolean;
  hasSiblings?: boolean;
  hasParents?: boolean;
  hasPet?: boolean;
  hasProperty?: boolean;
  hasVehicle?: boolean;
  inPrison?: boolean;
  retired?: boolean;
  sex?: Sex;
  minMoney?: number;
  maxMoney?: number;
  minStat?: Partial<Record<StatKey, number>>;
  maxStat?: Partial<Record<StatKey, number>>;
  /** Le joueur doit posséder ce marqueur. */
  hasFlag?: string;
  /** Le joueur ne doit pas posséder ce marqueur. */
  lacksFlag?: string;
  /** Pays autorisés. */
  countries?: string[];
}

export interface GameEvent {
  id: string;
  /** Catégorie de timeline utilisée pour la puce colorée. */
  kind: TimelineKind;
  icon: string;
  title: string;
  /**
   * Corps du texte. Balises disponibles :
   * `{name}` prénom de la cible, `{full}` nom complet, `{rel}` lien de parenté,
   * `{il}`/`{le}`/`{e}` accords selon le sexe de la cible,
   * `{player}` prénom du joueur, `{city}`, `{country}`, `{job}`, `{school}`,
   * `{moi_e}` accord selon le sexe du joueur.
   */
  text: string;
  /** Poids de tirage relatif. */
  weight: number;
  /** Conditions d'apparition. */
  cond?: EventCondition;
  /**
   * Type de PNJ nécessaire. L'événement est ignoré si aucun PNJ vivant ne
   * correspond. `undefined` = aucun PNJ requis.
   */
  target?: RelationKind[];
  /** L'événement ne peut se déclencher qu'une fois par vie. */
  once?: boolean;
  choices: EventChoiceDef[];
}

/** Raccourci de déclaration (aide au typage sans alourdir les fichiers). */
export const ev = (e: GameEvent): GameEvent => e;
