/**
 * Contextes de départ préréglés.
 *
 * Un préréglage n'est pas un raccourci cosmétique : il fixe la classe
 * sociale, la structure familiale, le type de quartier, le logement et
 * l'orientation des valeurs parentales. Deux préréglages différents mènent à
 * deux vies statistiquement très différentes.
 *
 * Aucun n'est « meilleur » : chacun ouvre des portes et en ferme d'autres.
 */

import type {
  CitySize,
  FamilyStructure,
  FamilyValues,
  HousingType,
  ParentingStyle,
  ResidentialZone,
  Tenure,
} from '../engine/origin.ts';
import type { WealthTierId } from '../engine/newLife.ts';

export interface OriginPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Ce que ce départ facilite. */
  strengths: string[];
  /** Ce qu'il complique. */
  hurdles: string[];
  /** Poids dans un tirage complètement aléatoire. */
  weight: number;
  tier: WealthTierId;
  structure: FamilyStructure;
  /** Archétypes de région plausibles. */
  regions: string[];
  citySizes: CitySize[];
  /** Archétypes de quartier plausibles. */
  neighborhoods: string[];
  zones: ResidentialZone[];
  housing: HousingType[];
  tenures: Tenure[];
  /** Fratrie : bornes du nombre de frères et sœurs. */
  siblings: [number, number];
  /** Écarts appliqués aux valeurs familiales (base 50). */
  values: Partial<FamilyValues>;
  /** Écarts appliqués au style parental moyen (base 50). */
  parenting: Partial<ParentingStyle>;
}

export const ORIGIN_PRESETS: OriginPreset[] = [
  {
    id: 'ruralModest', label: 'Famille modeste à la campagne', emoji: '🌾',
    description: 'Peu d’argent, beaucoup d’espace, et la ville à une heure de route.',
    strengths: ['Air pur et vie saine', 'Communauté solidaire', 'Autonomie précoce'],
    hurdles: ['Écoles limitées', 'Peu d’emplois locaux', 'Isolement géographique'],
    weight: 12, tier: 'modest', structure: 'deux parents',
    regions: ['rural', 'mountain'], citySizes: ['village', 'petite ville'],
    neighborhoods: ['village', 'isolated'], zones: ['zone rurale'],
    housing: ['maison', 'ferme', 'maison mitoyenne'], tenures: ['propriétaire', 'accédant', 'locataire'],
    siblings: [1, 3],
    values: { work: 16, family: 14, autonomy: 10, school: -8, money: -6 },
    parenting: { authority: 10, discipline: 8, freedom: 12, academicExpectation: -10, communication: -4 },
  },
  {
    id: 'workingUrban', label: 'Famille ouvrière en ville', emoji: '🔧',
    description: 'Deux salaires serrés, un appartement, et des voisins qu’on connaît.',
    strengths: ['Transports et services proches', 'Réseau amical dense', 'Débrouillardise'],
    hurdles: ['Budget tendu', 'Logement à l’étroit', 'École moyenne'],
    weight: 14, tier: 'modest', structure: 'deux parents',
    regions: ['industrial', 'suburban', 'capital'], citySizes: ['ville moyenne', 'grande ville'],
    neighborhoods: ['working', 'deprived'], zones: ['périphérie', 'banlieue résidentielle'],
    housing: ['appartement', 'petit appartement', 'maison mitoyenne'], tenures: ['locataire', 'logement social', 'accédant'],
    siblings: [1, 3],
    values: { work: 14, family: 10, money: 8, school: 4, leisure: -6 },
    parenting: { discipline: 8, supervision: -6, financialSupport: -12, encouragement: 4 },
  },
  {
    id: 'projects', label: 'Grandir en logement social', emoji: '🧱',
    description: 'Un quartier qu’on défend, une réputation qu’on traîne, une entraide réelle.',
    strengths: ['Solidarité forte', 'Résilience', 'Vie sociale intense'],
    hurdles: ['Exposition à la délinquance', 'École en difficulté', 'Préjugés à l’embauche'],
    weight: 9, tier: 'poor', structure: 'parent seul',
    regions: ['capital', 'industrial', 'suburban'], citySizes: ['grande ville', 'métropole', 'capitale'],
    neighborhoods: ['deprived'], zones: ['logement social', 'périphérie'],
    housing: ['appartement', 'petit appartement'], tenures: ['logement social'],
    siblings: [1, 4],
    values: { family: 16, autonomy: 12, money: 10, school: -6, manners: -4 },
    parenting: { supervision: -14, authority: 8, financialSupport: -20, emotionalSupport: 6, patience: -6 },
  },
  {
    id: 'middleSuburb', label: 'Classe moyenne pavillonnaire', emoji: '🏘️',
    description: 'Un pavillon, deux voitures, un crédit, et des enfants qu’on pousse à réussir.',
    strengths: ['École correcte', 'Stabilité', 'Activités extrascolaires'],
    hurdles: ['Dépendance à la voiture', 'Peu d’imprévu', 'Pression de conformité'],
    weight: 18, tier: 'middle', structure: 'deux parents',
    regions: ['suburban', 'university', 'coastal'], citySizes: ['ville moyenne', 'grande ville'],
    neighborhoods: ['middle', 'suburbanCalm'], zones: ['quartier pavillonnaire', 'banlieue résidentielle'],
    housing: ['maison', 'maison mitoyenne', 'appartement'], tenures: ['accédant', 'propriétaire'],
    siblings: [1, 2],
    values: { school: 12, achievement: 10, manners: 8, sport: 6 },
    parenting: { academicExpectation: 10, encouragement: 8, supervision: 8, communication: 6 },
  },
  {
    id: 'cityCentre', label: 'Enfance en centre-ville', emoji: '🌆',
    description: 'Tout à pied, du bruit sous les fenêtres, des musées et des cafés.',
    strengths: ['Culture accessible', 'Transports partout', 'Rencontres variées'],
    hurdles: ['Logement exigu', 'Loyer élevé', 'Peu de nature'],
    weight: 11, tier: 'middle', structure: 'deux parents',
    regions: ['capital', 'university', 'tech'], citySizes: ['grande ville', 'métropole', 'capitale'],
    neighborhoods: ['historic', 'gentrifying', 'student'], zones: ['centre-ville'],
    housing: ['appartement', 'petit appartement', 'grande résidence'], tenures: ['locataire', 'propriétaire'],
    siblings: [0, 2],
    values: { creativity: 14, school: 8, leisure: 6, autonomy: 6, sport: -4 },
    parenting: { communication: 10, freedom: 8, control: -6, academicExpectation: 6 },
  },
  {
    id: 'affluent', label: 'Famille aisée', emoji: '🏡',
    description: 'Un quartier calme, une bonne école, et des attentes à la hauteur.',
    strengths: ['Écoles réputées', 'Réseau utile', 'Soutien financier durable'],
    hurdles: ['Pression de réussite', 'Peu de mixité', 'Autonomie tardive'],
    weight: 10, tier: 'upper', structure: 'deux parents',
    regions: ['capital', 'tech', 'coastal', 'suburban'], citySizes: ['grande ville', 'métropole', 'capitale'],
    neighborhoods: ['affluent', 'suburbanCalm', 'seaside'], zones: ['quartier huppé', 'quartier pavillonnaire'],
    housing: ['pavillon', 'maison', 'grande résidence'], tenures: ['propriétaire', 'accédant'],
    siblings: [1, 2],
    values: { achievement: 18, school: 16, manners: 12, money: 8, family: -4 },
    parenting: { academicExpectation: 20, financialSupport: 20, control: 10, patience: -4, emotionalSupport: -4 },
  },
  {
    id: 'wealthy', label: 'Grande fortune', emoji: '👑',
    description: 'Un monde à part, des portes qui s’ouvrent seules, et des parents rarement là.',
    strengths: ['Aucune contrainte financière', 'Écoles d’élite', 'Réseau international'],
    hurdles: ['Parents peu disponibles', 'Sens de l’effort à construire', 'Isolement social réel'],
    weight: 3, tier: 'rich', structure: 'deux parents',
    regions: ['capital', 'tech', 'coastal'], citySizes: ['métropole', 'capitale'],
    neighborhoods: ['affluent', 'business'], zones: ['quartier huppé'],
    housing: ['villa', 'propriété de luxe', 'grande résidence'], tenures: ['propriétaire'],
    siblings: [0, 2],
    values: { achievement: 20, money: 18, manners: 16, school: 10, family: -12 },
    parenting: { financialSupport: 30, academicExpectation: 16, affection: -8, communication: -10, supervision: -14 },
  },
  {
    id: 'singleParent', label: 'Élevé par un seul parent', emoji: '🧍',
    description: 'Un adulte qui tient tout à bout de bras, et un enfant qui grandit vite.',
    strengths: ['Lien très fort avec le parent', 'Maturité précoce', 'Sens des responsabilités'],
    hurdles: ['Revenu unique', 'Surveillance limitée', 'Charge mentale partagée'],
    weight: 12, tier: 'modest', structure: 'parent seul',
    regions: ['suburban', 'industrial', 'capital', 'coastal'], citySizes: ['ville moyenne', 'grande ville'],
    neighborhoods: ['working', 'middle', 'deprived'], zones: ['banlieue résidentielle', 'périphérie'],
    housing: ['appartement', 'petit appartement', 'maison mitoyenne'], tenures: ['locataire', 'logement social'],
    siblings: [0, 2],
    values: { family: 18, autonomy: 14, work: 8, leisure: -6 },
    parenting: { emotionalSupport: 10, supervision: -12, financialSupport: -14, patience: -6, communication: 8 },
  },
  {
    id: 'blended', label: 'Famille recomposée', emoji: '🔀',
    description: 'Deux histoires assemblées, des demi-frères, et une place à trouver.',
    strengths: ['Famille élargie', 'Adaptabilité', 'Deux foyers, deux ressources'],
    hurdles: ['Conflits de loyauté', 'Instabilité des premières années', 'Autorité contestée'],
    weight: 9, tier: 'middle', structure: 'famille recomposée',
    regions: ['suburban', 'coastal', 'industrial', 'university'], citySizes: ['ville moyenne', 'grande ville', 'petite ville'],
    neighborhoods: ['middle', 'working', 'suburbanCalm'], zones: ['banlieue résidentielle', 'quartier pavillonnaire'],
    housing: ['maison', 'appartement', 'maison mitoyenne'], tenures: ['accédant', 'locataire', 'propriétaire'],
    siblings: [1, 3],
    values: { family: 8, autonomy: 10, manners: 4 },
    parenting: { authority: -8, communication: 4, emotionalSupport: -4, control: -6 },
  },
  {
    id: 'largeFamily', label: 'Famille nombreuse', emoji: '👨‍👩‍👧‍👦',
    description: 'Beaucoup de monde, peu de calme, et jamais seul.',
    strengths: ['Sociabilité naturelle', 'Entraide fraternelle', 'Débrouillardise'],
    hurdles: ['Aucune intimité', 'Budget divisé', 'Attention parentale diluée'],
    weight: 8, tier: 'modest', structure: 'deux parents',
    regions: ['rural', 'suburban', 'industrial'], citySizes: ['petite ville', 'ville moyenne', 'village'],
    neighborhoods: ['working', 'village', 'middle'], zones: ['banlieue résidentielle', 'zone rurale', 'périphérie'],
    housing: ['maison', 'appartement', 'ferme'], tenures: ['propriétaire', 'locataire', 'accédant'],
    siblings: [3, 6],
    values: { family: 20, manners: 10, work: 8, money: -6, leisure: 4 },
    parenting: { supervision: -10, authority: 8, financialSupport: -12, patience: -8, affection: 6 },
  },
  {
    id: 'academic', label: 'Famille d’enseignants', emoji: '📚',
    description: 'Peu d’argent, beaucoup de livres, et la table du dîner comme salle de classe.',
    strengths: ['Culture générale précoce', 'Aide aux devoirs constante', 'Curiosité valorisée'],
    hurdles: ['Revenus moyens', 'Attente scolaire écrasante', 'Peu de goût du risque'],
    weight: 7, tier: 'middle', structure: 'deux parents',
    regions: ['university', 'capital', 'tech'], citySizes: ['ville moyenne', 'grande ville'],
    neighborhoods: ['student', 'historic', 'middle'], zones: ['centre-ville', 'banlieue résidentielle'],
    housing: ['appartement', 'maison mitoyenne', 'maison'], tenures: ['propriétaire', 'accédant', 'locataire'],
    siblings: [1, 2],
    values: { school: 24, creativity: 12, achievement: 8, money: -12, leisure: -4 },
    parenting: { academicExpectation: 18, communication: 14, encouragement: 12, control: 4 },
  },
  {
    id: 'immigrantStart', label: 'Famille arrivée récemment', emoji: '🧳',
    description: 'Tout à reconstruire, une langue à apprendre, et l’obsession de s’en sortir.',
    strengths: ['Ambition familiale intense', 'Réseau communautaire', 'Deux cultures'],
    hurdles: ['Diplômes non reconnus', 'Logement précaire', 'Départ social bas'],
    weight: 8, tier: 'poor', structure: 'deux parents',
    regions: ['capital', 'industrial', 'suburban'], citySizes: ['grande ville', 'métropole', 'capitale'],
    neighborhoods: ['deprived', 'working', 'gentrifying'], zones: ['logement social', 'périphérie', 'centre-ville'],
    housing: ['petit appartement', 'appartement', 'studio'], tenures: ['locataire', 'logement social'],
    siblings: [1, 4],
    values: { school: 20, work: 18, family: 16, money: 10, leisure: -10 },
    parenting: { academicExpectation: 18, authority: 10, discipline: 10, financialSupport: -18, freedom: -8 },
  },
  {
    id: 'seaside', label: 'Enfance au bord de mer', emoji: '🏖️',
    description: 'Six mois de foule, six mois de vide, et l’eau au bout de la rue.',
    strengths: ['Vie sportive', 'Petits boulots dès l’adolescence', 'Cadre agréable'],
    hurdles: ['Économie saisonnière', 'Logement cher', 'Départ obligé pour étudier'],
    weight: 7, tier: 'middle', structure: 'deux parents',
    regions: ['coastal'], citySizes: ['petite ville', 'ville moyenne', 'grande ville'],
    neighborhoods: ['seaside', 'middle', 'working'], zones: ['banlieue résidentielle', 'centre-ville'],
    housing: ['maison', 'appartement', 'maison mitoyenne'], tenures: ['propriétaire', 'locataire', 'accédant'],
    siblings: [0, 2],
    values: { sport: 16, leisure: 12, family: 6, school: -4 },
    parenting: { freedom: 12, supervision: -6, affection: 6 },
  },

  /*
   * Les quatre milieux qui n'arrivaient jamais.
   *
   * `FamilyStructure` compte sept valeurs. Quatre — adoption, famille
   * d'accueil, grands-parents, parents séparés — existaient dans le type, dans
   * `household.ts#rolesFor`, dans la table de pénalités d'ambiance et sur
   * l'écran de création… et **dans aucun préréglage**. Mesuré sur quatre cents
   * naissances aléatoires : deux parents 75 %, parent seul 19 %, famille
   * recomposée 6 %, et zéro pour les quatre autres. Une vie non composée à la
   * main ne pouvait donc jamais commencer là.
   *
   * Ce n'est pas un oubli anodin : la structure du foyer est ce qui décide de
   * qui vous élève, et trois enfances sur sept se ressemblaient toutes.
   */
  {
    id: 'adopted', label: 'Adopté tout petit', emoji: '💝',
    description: 'Un foyer qui t’a choisi, une histoire d’avant que personne ne raconte.',
    strengths: ['Parents très investis', 'Foyer stable', 'Moyens corrects'],
    hurdles: ['Une part de toi manque au tableau', 'Questions qui reviennent', 'Peur de décevoir'],
    weight: 5, tier: 'middle', structure: 'adoption',
    regions: ['suburban', 'university', 'capital', 'coastal'],
    citySizes: ['ville moyenne', 'grande ville', 'petite ville'],
    neighborhoods: ['middle', 'suburbanCalm', 'historic'],
    zones: ['quartier pavillonnaire', 'banlieue résidentielle', 'centre-ville'],
    housing: ['maison', 'appartement', 'maison mitoyenne'],
    tenures: ['propriétaire', 'accédant'],
    siblings: [0, 2],
    values: { family: 20, school: 8, manners: 6, money: -4 },
    parenting: { affection: 14, communication: 10, encouragement: 10, patience: 6, authority: -4 },
  },
  {
    id: 'fostered', label: 'Placé en famille d’accueil', emoji: '🏠',
    description: 'Une chambre qu’on te prête, des dossiers, et des adultes qui changent.',
    strengths: ['Débrouillardise précoce', 'Lecture rapide des gens', 'Rien ne t’étonne'],
    hurdles: ['Rien de durable', 'Dossier scolaire haché', 'Personne à qui demander'],
    weight: 4, tier: 'poor', structure: 'famille d’accueil',
    regions: ['industrial', 'suburban', 'rural', 'capital'],
    citySizes: ['ville moyenne', 'petite ville', 'grande ville'],
    neighborhoods: ['working', 'deprived', 'village'],
    zones: ['périphérie', 'logement social', 'zone rurale'],
    housing: ['maison mitoyenne', 'appartement', 'maison'],
    tenures: ['locataire', 'logement social'],
    siblings: [0, 3],
    values: { autonomy: 18, family: -8, school: -6, manners: 4 },
    parenting: { supervision: -8, affection: -6, emotionalSupport: -10, freedom: 14, financialSupport: -16 },
  },
  {
    id: 'grandparents', label: 'Élevé par tes grands-parents', emoji: '👵',
    description: 'Une génération sautée, des habitudes d’un autre temps, et beaucoup de patience.',
    strengths: ['Patience infinie', 'Transmission et mémoire', 'Foyer calme'],
    hurdles: ['Décalage avec ton âge', 'Santé fragile à la maison', 'Sujet qu’on n’aborde pas'],
    weight: 5, tier: 'modest', structure: 'grands-parents',
    regions: ['rural', 'industrial', 'mountain', 'coastal'],
    citySizes: ['village', 'petite ville', 'ville moyenne'],
    neighborhoods: ['village', 'working', 'historic'],
    zones: ['zone rurale', 'centre-ville', 'périphérie'],
    housing: ['maison', 'maison mitoyenne', 'appartement'],
    tenures: ['propriétaire', 'locataire'],
    siblings: [0, 1],
    values: { family: 18, manners: 14, work: 8, leisure: -8 },
    parenting: { patience: 16, affection: 10, supervision: -4, academicExpectation: -6, freedom: 8 },
  },
  {
    id: 'separated', label: 'Entre deux maisons', emoji: '↔️',
    description: 'Deux adresses, deux règlements, et un sac qu’on refait tous les quinze jours.',
    strengths: ['Adaptabilité', 'Deux réseaux', 'Négociation précoce'],
    hurdles: ['Rien n’est jamais au bon endroit', 'Messages à porter', 'Loyautés partagées'],
    weight: 8, tier: 'middle', structure: 'parents séparés',
    regions: ['suburban', 'capital', 'university', 'coastal'],
    citySizes: ['ville moyenne', 'grande ville', 'métropole'],
    neighborhoods: ['middle', 'gentrifying', 'suburbanCalm', 'working'],
    zones: ['banlieue résidentielle', 'centre-ville', 'quartier pavillonnaire'],
    housing: ['appartement', 'maison mitoyenne', 'maison'],
    tenures: ['locataire', 'accédant', 'propriétaire'],
    siblings: [0, 2],
    values: { autonomy: 12, family: -6, money: 4 },
    parenting: { communication: -8, supervision: -6, freedom: 10, patience: -4 },
  },
];

export const PRESET_MAP: Record<string, OriginPreset> = Object.fromEntries(
  ORIGIN_PRESETS.map((p) => [p.id, p]),
);

export function getPreset(id: string): OriginPreset {
  return PRESET_MAP[id] ?? PRESET_MAP.middleSuburb;
}
