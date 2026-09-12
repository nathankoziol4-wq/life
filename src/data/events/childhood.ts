/** Événements de la petite enfance et de l'enfance (0-12 ans). */

import { ev, type GameEvent } from './types.ts';

export const CHILDHOOD_EVENTS: GameEvent[] = [
  /* ---------------- Petite enfance : 0-5 ans ---------------- */
  /*
   * L'audit avait chiffré le trou une première fois — huit événements avant
   * cinq ans contre plus de quatre-vingts à l'âge adulte — et vingt avaient
   * été écrits pour le combler.
   *
   * **Il en restait un, et la moyenne par tranche le cachait.** L'audit
   * continu (`tools/audit-densite.mjs`) rend 13,3 événements tirables une
   * année donnée avant l'école, contre 24 à 36 partout ailleurs. Mais année
   * par année, ce n'est pas une pente, c'est une falaise :
   *
   *     1 an  :  1,4      4 ans : 21,7
   *     2 ans :  2,8      5 ans : 28,7
   *     3 ans : 12,2      6 ans : 32,0
   *
   * Les vingt d'avant commencent tous à trois, quatre ou cinq ans. À un an et
   * à deux ans, il ne se passait **rien du tout** : une ou deux choses
   * tirables, c'est-à-dire la même chaque fois.
   *
   * Les seize qui suivent tiennent les âges où l'on ne délibère pas encore. Le
   * choix qu'on y fait n'est donc pas une décision mais un mouvement — se
   * lâcher ou se tenir, crier ou attendre, aller voir ou rester — et ce qu'il
   * pose n'est pas un plan mais un tempérament. C'est la seule tranche du jeu
   * où le joueur choisit ce qu'il **est** avant de choisir ce qu'il fait.
   *
   * **Cela a demandé un canal qui n'existait pas.** Une issue ne pouvait
   * toucher que les statistiques, et « avoir donné plutôt que serré » n'est
   * pas une variation de bonheur. Le caractère du joueur vit dans
   * `psyche.axes`, que seul `psyche.ts#applyExperience` écrivait — réservé
   * aux grandes secousses de `data/experiences.ts`. `EventEffects.axes` est
   * le petit bout du même tuyau : un ou deux points, sans inventer une
   * expérience formatrice pour une cuillère renversée.
   */
  ev({
    id: 'ch_high_chair', kind: 'family', icon: '🥣', title: 'Ça tombe', weight: 34,
    cond: { minAge: 1, maxAge: 2 }, target: ['mother', 'father', 'guardian'],
    text: 'Tu as lâché la tasse par-dessus le bord. Elle est tombée. {name} l’a ramassée et te l’a rendue. Tu viens de comprendre qu’il y a une règle.',
    choices: [
      { label: 'Recommencer pour vérifier', outcomes: [
        { weight: 3, text: 'Onze fois. {name} tient jusqu’à la neuvième. Tu as vérifié, et la règle tient.', tone: 'good', effects: { stats: { intelligence: 5, happiness: 4 }, axes: { curiosity: 6 } } },
        { weight: 2, text: 'On enlève la tasse. L’expérience s’arrête là, sans conclusion.', tone: 'neutral', effects: { stats: { intelligence: 2 }, axes: { curiosity: 2, patience: -2 } } },
      ] },
      { label: 'Regarder la tasse par terre', outcomes: [
        { text: 'Tu la regardes longtemps sans rien faire. Quelqu’un finit par la ramasser, et tu n’as rien demandé.', tone: 'neutral', effects: { stats: { intelligence: 3 }, axes: { patience: 4, independence: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_in_the_mouth', kind: 'random', icon: '👅', title: 'Savoir ce que c’est', weight: 32,
    cond: { minAge: 1, maxAge: 2 },
    text: 'Il y a un objet neuf sur le tapis. Tu n’as qu’une méthode pour savoir ce que c’est, et elle est très fiable.',
    choices: [
      { label: 'Le mettre dans la bouche', outcomes: [
        { weight: 3, text: 'C’est dur, froid, et ça n’a aucun goût. Dossier classé, tu passes au suivant.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 3 }, axes: { curiosity: 5 } } },
        { weight: 2, text: 'On te le retire de la bouche avec un cri. Tout le monde est très inquiet pendant dix minutes.', tone: 'neutral', effects: { stats: { stress: 4, health: -1 }, axes: { curiosity: 3, caution: 2 } } },
      ] },
      { label: 'Le retourner dans tes mains', outcomes: [
        { text: 'Tu le tournes sous toutes les faces, longuement, avant de le reposer. On dit que tu es un enfant sérieux.', tone: 'good', effects: { stats: { intelligence: 5 }, axes: { caution: 5, perseverance: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_peekaboo', kind: 'family', icon: '🙈', title: 'Et le revoilà', weight: 36,
    cond: { minAge: 1, maxAge: 3 }, target: ['mother', 'father', 'guardian'],
    text: '{name} met ses mains devant son visage. Il n’y a plus personne. Puis les mains s’écartent et {il} est là. C’est la chose la plus drôle qui soit arrivée.',
    choices: [
      { label: 'Rire et redemander', outcomes: [
        { text: 'Vous y passez vingt minutes. À la fin, c’est toi qui mets tes mains devant ton visage, et {name} fait semblant de te chercher.', tone: 'good', effects: { stats: { happiness: 8, intelligence: 3 }, axes: { sociability: 5, optimism: 4 }, rel: 6 } },
      ] },
      { label: 'Écarter ses mains toi-même', outcomes: [
        { weight: 3, text: 'Tu tires sur ses doigts jusqu’à ce que le visage revienne. Tu n’attends plus qu’on te montre : tu vas chercher.', tone: 'good', effects: { stats: { happiness: 5, intelligence: 4 }, axes: { independence: 5, curiosity: 4 }, rel: 4 } },
        { weight: 1, text: '{il} résiste pour jouer. Tu n’aimes pas ça du tout, et le jeu se termine mal.', tone: 'bad', effects: { stats: { stress: 4, happiness: -3 }, axes: { impulsivity: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_carried_out', kind: 'family', icon: '🌳', title: 'Dehors', weight: 30,
    cond: { minAge: 1, maxAge: 3 }, target: ['mother', 'father', 'guardian'],
    text: 'On te sort de la poussette et on te pose dans l’herbe. Ça pique, ça bouge, ça n’a pas de bord, et ça continue jusqu’à très loin.',
    choices: [
      { label: 'Partir droit devant', outcomes: [
        { weight: 3, text: 'Tu vas jusqu’au bout de ce que tes jambes permettent, sans te retourner une seule fois. On te rattrape en riant.', tone: 'good', effects: { stats: { fitness: 4, happiness: 6 }, axes: { independence: 6, courage: 4 } } },
        { weight: 2, text: 'Tu tombes au troisième pas, dans quelque chose de mouillé. Le monde est décevant.', tone: 'neutral', effects: { stats: { happiness: -2, fitness: 2 }, axes: { caution: 3 } } },
      ] },
      { label: 'Rester assis et toucher l’herbe', outcomes: [
        { text: 'Tu passes une demi-heure sur un mètre carré. Tu en connais chaque brin, et {name} n’a pas eu à courir.', tone: 'good', effects: { stats: { happiness: 4, intelligence: 3 }, axes: { curiosity: 4, patience: 5 }, rel: 4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_let_go', kind: 'family', icon: '🚼', title: 'Se lâcher', weight: 40,
    cond: { minAge: 1, maxAge: 2 }, target: ['mother', 'father', 'guardian'],
    text: 'Tu tiens le bord du canapé. {name} est à trois pas, accroupi, les mains ouvertes. Il n’y a que trois pas.',
    choices: [
      { label: 'Lâcher le canapé', outcomes: [
        { weight: 3, text: 'Deux pas, et tu tombes dans ses mains. On applaudit comme si tu avais traversé un fleuve.', tone: 'good', effects: { stats: { happiness: 7, fitness: 3 }, axes: { courage: 5 }, rel: 6 } },
        { weight: 2, text: 'Tu tombes avant. Tu pleures plus de surprise que de mal, et tu recommences dix minutes après.', tone: 'neutral', effects: { stats: { happiness: 2, fitness: 2 }, axes: { courage: 3, perseverance: 3 } } },
      ] },
      { label: 'Attendre qu’on vienne te chercher', outcomes: [
        { text: '{name} finit par venir. Tu as gagné, et tu n’as pas marché.', tone: 'neutral', effects: { stats: { happiness: 3 }, axes: { caution: 4, independence: -3 }, rel: 3 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_spoon', kind: 'family', icon: '🥄', title: 'La cuillère', weight: 36,
    cond: { minAge: 1, maxAge: 3 }, target: ['mother', 'father', 'guardian'],
    text: 'On te tend la cuillère. Tu as compris que c’est toi qui devrais la tenir. Le résultat est incertain.',
    choices: [
      { label: 'La prendre', outcomes: [
        { weight: 3, text: 'Il y en a partout et un peu dans ta bouche. On te laisse faire, et tu recommences.', tone: 'good', effects: { stats: { discipline: 4, happiness: 4 } } },
        { weight: 2, text: 'Tu la lances. {name} soupire et ramasse. Tu trouves ça très drôle.', tone: 'neutral', effects: { stats: { happiness: 5, discipline: -3 }, rel: -2 } },
      ] },
      { label: 'Ouvrir la bouche et attendre', outcomes: [
        { text: 'C’est plus rapide, plus propre, et tu ne l’apprendras pas cette année.', tone: 'neutral', effects: { stats: { discipline: -2, happiness: 2 }, rel: 3 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_left_somewhere', kind: 'family', icon: '👋', title: 'La porte se referme', weight: 34,
    cond: { minAge: 1, maxAge: 3 }, target: ['mother', 'father', 'guardian'],
    text: '{name} te pose, dit qu’{il} revient, et va vers la porte. Tu n’as aucune raison de le croire.',
    choices: [
      { label: 'Hurler', outcomes: [
        { weight: 3, text: '{name} revient, te reprend, repart plus tard. Tu apprends que crier fait revenir les gens.', tone: 'neutral', effects: { stats: { happiness: 2, stress: 4 }, axes: { impulsivity: 4, patience: -3 }, rel: 3 } },
        { weight: 2, text: 'La porte se referme quand même. Le retour, deux heures plus tard, ne répare pas tout à fait.', tone: 'bad', effects: { stats: { stress: 9, happiness: -5 } } },
      ] },
      { label: 'Regarder la porte', outcomes: [
        { weight: 3, text: '{il} revient. Tu ne t’en souviendras pas, mais quelque chose en toi a noté que oui, on revient.', tone: 'good', effects: { stats: { stress: -5, happiness: 4 }, axes: { patience: 5, optimism: 4 } } },
        { weight: 1, text: 'Tu attends longtemps. Trop longtemps pour la mémoire, pas assez pour l’oublier.', tone: 'bad', effects: { stats: { stress: 7 }, axes: { optimism: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_mirror', kind: 'random', icon: '🪞', title: 'Celui d’en face', weight: 30,
    cond: { minAge: 1, maxAge: 3 },
    text: 'Il y a quelqu’un dans le miroir. Il fait exactement ce que tu fais, à l’instant où tu le fais.',
    choices: [
      { label: 'Le toucher', outcomes: [
        { weight: 3, text: 'Froid, plat, et il n’a pas de dos. Tu comprends quelque chose que tu ne sauras jamais dire.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 3 }, axes: { curiosity: 5 } } },
        { weight: 1, text: 'Tu te cognes le front. Le miroir gagne.', tone: 'neutral', effects: { stats: { happiness: -2, health: -1 } } },
      ] },
      { label: 'Lui faire des grimaces', outcomes: [
        { text: 'Il fait les mêmes. Vous passez un long moment ensemble, et personne ne vous dérange.', tone: 'good', effects: { stats: { happiness: 6 }, axes: { sociability: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_thunder', kind: 'random', icon: '⛈️', title: 'Le bruit d’un coup', weight: 32,
    cond: { minAge: 1, maxAge: 4 }, target: ['mother', 'father', 'guardian'],
    text: 'Quelque chose a claqué dehors, très fort. La maison a tremblé. Personne n’a l’air inquiet, sauf toi.',
    choices: [
      { label: 'Aller voir', outcomes: [
        { weight: 3, text: 'Tu colles ton front à la vitre. C’est immense, ça recommence, et c’est magnifique.', tone: 'good', effects: { stats: { happiness: 5, stress: -3 }, axes: { courage: 5, curiosity: 4 } } },
        { weight: 2, text: 'Le deuxième coup te fait reculer de trois pas. Tu retournes te mettre derrière {name}.', tone: 'neutral', effects: { stats: { stress: 4 }, rel: 3 } },
      ] },
      { label: 'Se mettre sous la table', outcomes: [
        { text: 'Tu y restes jusqu’à la fin. C’est un bon endroit, et tu t’en souviendras.', tone: 'neutral', effects: { stats: { stress: 5, happiness: -2 }, axes: { caution: 6 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_stranger_arms', kind: 'family', icon: '🤲', title: 'Les bras de quelqu’un d’autre', weight: 30,
    cond: { minAge: 1, maxAge: 3 },
    text: 'Une personne que tu ne connais pas te tend les bras en faisant une voix aiguë. Tout le monde autour a l’air de trouver ça normal.',
    choices: [
      { label: 'Y aller', outcomes: [
        { weight: 3, text: 'Tu te laisses prendre. On te trouve adorable, on te rend, et rien de grave n’est arrivé.', tone: 'good', effects: { stats: { happiness: 3 }, axes: { sociability: 5 } } },
        { weight: 1, text: 'Tu te rends compte à mi-chemin que tu ne veux pas. Trop tard, et cela dure très longtemps.', tone: 'bad', effects: { stats: { stress: 6 }, axes: { sociability: -2 } } },
      ] },
      { label: 'S’accrocher à la jambe la plus proche', outcomes: [
        { text: 'Tu ne lâches pas. On dit que tu es timide. C’est un mot qu’on répétera longtemps devant toi.', tone: 'neutral', effects: { stats: { stress: -2 }, axes: { sociability: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_teething_night', kind: 'family', icon: '🌗', title: 'La nuit entière', weight: 28,
    cond: { minAge: 1, maxAge: 2 }, target: ['mother', 'father', 'guardian'],
    text: 'Quelque chose pousse dans ta bouche et ça fait mal. Il est trois heures. {name} marche de long en large avec toi dans les bras.',
    choices: [
      { label: 'Ne pas lâcher', outcomes: [
        { weight: 3, text: 'Vous tenez jusqu’à cinq heures. {name} ne t’en voudra jamais, et s’en souviendra vingt ans.', tone: 'neutral', effects: { stats: { health: -2, stress: 3 }, rel: 8 } },
        { weight: 2, text: '{name} finit par te reposer et fermer la porte. Vous dormez tous les deux, chacun de son côté.', tone: 'bad', effects: { stats: { stress: 6 }, rel: -3 } },
      ] },
      { label: 'S’endormir d’un coup', outcomes: [
        { text: 'Tu t’écroules au milieu d’un cri. {name} n’ose plus bouger pendant vingt minutes.', tone: 'good', effects: { stats: { happiness: 3, health: 2 }, rel: 4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_first_no', kind: 'family', icon: '🙅', title: 'Non', weight: 38,
    cond: { minAge: 2, maxAge: 4 }, target: ['mother', 'father', 'guardian'],
    text: 'Tu viens de découvrir un mot qui arrête les gens. Tu le dis à tout, pour voir jusqu’où ça marche.',
    choices: [
      { label: 'Le dire à tout', outcomes: [
        { weight: 3, text: '{name} ne se fâche pas et attend que ça passe. Ça passe, et tu gardes le mot pour les vraies occasions.', tone: 'good', effects: { stats: { discipline: 3, intelligence: 3 }, axes: { patience: 4 }, rel: 3 } },
        { weight: 2, text: 'Ça se termine par des cris des deux côtés. Tu apprends que le mot a un prix.', tone: 'bad', effects: { stats: { stress: 4 }, axes: { aggression: 5 }, rel: -4 } },
      ] },
      { label: 'Le garder pour une seule chose', outcomes: [
        { text: 'Tu le sors une fois, au bon moment, et on t’écoute. Tu viens d’apprendre quelque chose d’énorme.', tone: 'good', effects: { stats: { discipline: 6, intelligence: 4 }, axes: { independence: 5, confidence: 4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_stairs', kind: 'random', icon: '🪜', title: 'Les marches', weight: 30,
    cond: { minAge: 1, maxAge: 3 },
    text: 'La barrière est ouverte. L’escalier est là. Il monte très haut et personne ne regarde.',
    choices: [
      { label: 'Monter', outcomes: [
        { weight: 3, text: 'Quatre marches à quatre pattes, et une main t’attrape par l’arrière. On referme la barrière.', tone: 'neutral', effects: { stats: { fitness: 3, happiness: 2 }, axes: { riskTolerance: 5 } } },
        { weight: 2, text: 'Tu redescends moins bien que tu n’es monté. Ça saigne un peu, et on en parle longtemps.', tone: 'bad', effects: { stats: { health: -6, stress: 5 }, axes: { riskTolerance: -3, caution: 4 } } },
      ] },
      { label: 'Rester en bas', outcomes: [
        { text: 'Tu regardes l’escalier un long moment. Il sera encore là demain.', tone: 'neutral', effects: { stats: { discipline: 3 }, axes: { caution: 5, patience: 4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_potty', kind: 'family', icon: '🚽', title: 'Le pot', weight: 34,
    cond: { minAge: 2, maxAge: 4 }, target: ['mother', 'father', 'guardian'],
    text: 'On t’explique, très sérieusement, qu’il va falloir prévenir avant. Toi, tu trouvais que le système actuel fonctionnait.',
    choices: [
      { label: 'Essayer', outcomes: [
        { weight: 3, text: 'Ça marche une fois sur trois, puis deux sur trois. {name} fête chaque réussite comme un examen.', tone: 'good', effects: { stats: { discipline: 6, happiness: 4 }, rel: 4 } },
        { weight: 2, text: 'Ça ne marche pas, et l’on s’énerve un peu. Tu retiens surtout qu’on s’est énervé.', tone: 'bad', effects: { stats: { stress: 6, discipline: 2 }, rel: -3 } },
      ] },
      { label: 'Refuser catégoriquement', outcomes: [
        { text: 'Tu tiens six mois de plus. Personne n’a gagné, et l’on n’en reparlera plus jamais.', tone: 'neutral', effects: { stats: { discipline: -3 }, axes: { aggression: 4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_shop_scene', kind: 'family', icon: '🛒', title: 'Au milieu du magasin', weight: 36,
    cond: { minAge: 2, maxAge: 5 }, target: ['mother', 'father', 'guardian'],
    text: 'Tu veux la chose. On a dit non. Il y a beaucoup de monde autour, et tu sens confusément que cela joue en ta faveur.',
    choices: [
      { label: 'Se laisser tomber par terre', outcomes: [
        { weight: 2, text: '{name} s’accroupit, attend sans rien dire, et ne cède pas. Les gens passent. Tu te relèves tout seul.', tone: 'good', effects: { stats: { discipline: 5 }, axes: { aggression: -3 }, rel: 2 } },
        { weight: 3, text: 'On cède pour que ça s’arrête. Tu viens d’apprendre exactement ce qu’il ne fallait pas.', tone: 'bad', effects: { stats: { discipline: -5 }, axes: { aggression: 6 }, rel: -2 } },
      ] },
      { label: 'Regarder la chose une dernière fois', outcomes: [
        { text: 'Tu ne dis rien. {name} le remarque, et t’en reparle le soir. Ce n’est pas rien d’être remarqué.', tone: 'good', effects: { stats: { discipline: 5, happiness: 3 }, rel: 5 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_forced_share', kind: 'family', icon: '🧩', title: 'On partage', weight: 30,
    cond: { minAge: 2, maxAge: 5, hasSiblings: true }, target: ['brother', 'sister'],
    text: 'C’est à toi. {name} le veut. Un adulte explique que ça s’appelle partager et que ça se fait.',
    choices: [
      { label: 'Donner', outcomes: [
        { weight: 3, text: 'Tu donnes. {name} joue avec dix minutes puis te le rend. On te dit que tu es formidable.', tone: 'good', effects: { stats: { happiness: 2 }, axes: { generosity: 6 }, rel: 6 } },
        { weight: 2, text: 'Tu donnes, on ne te le rend pas, et personne ne s’en aperçoit. Tu retiens la leçon.', tone: 'bad', effects: { stats: { happiness: -4 }, axes: { generosity: -4 }, rel: -4 } },
      ] },
      { label: 'Serrer très fort', outcomes: [
        { text: 'On te le retire des mains. C’est injuste, c’est efficace, et tu n’as rien appris sur le partage.', tone: 'bad', effects: { axes: { aggression: 5, generosity: -3 }, rel: -3 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_other_child', kind: 'random', icon: '🧒', title: 'L’autre', weight: 32,
    cond: { minAge: 2, maxAge: 4 },
    text: 'Il y a un autre enfant, de ta taille, au bout du tapis. Vous vous regardez depuis un moment sans rien faire.',
    choices: [
      { label: 'Aller lui donner quelque chose', outcomes: [
        { weight: 3, text: 'Tu lui tends un cube. Il le prend. Vous voilà occupés pour deux heures.', tone: 'good', effects: { stats: { happiness: 5 }, axes: { sociability: 6 } } },
        { weight: 1, text: 'Il le jette. Tu restes avec ta main tendue, et tu retournes de ton côté.', tone: 'bad', effects: { stats: { happiness: -4 }, axes: { sociability: -3 } } },
      ] },
      { label: 'Continuer chacun de son côté', outcomes: [
        { text: 'Vous jouez à un mètre l’un de l’autre sans jamais vous parler. C’est très bien comme ça.', tone: 'neutral', effects: { stats: { happiness: 2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_bedtime_book', kind: 'family', icon: '📖', title: 'Encore une fois', weight: 34,
    cond: { minAge: 2, maxAge: 5 }, target: ['mother', 'father', 'guardian'],
    text: '{name} vient de finir le livre. C’est le même que hier, et qu’avant-hier. Tu connais chaque page.',
    choices: [
      { label: 'Demander encore', outcomes: [
        { weight: 3, text: '{il} recommence. À la troisième fois, c’est toi qui dis les mots avant lui.', tone: 'good', effects: { stats: { intelligence: 5, happiness: 5 }, axes: { perseverance: 4 }, rel: 5 } },
        { weight: 2, text: '{il} dit qu’il est tard et éteint. Tu récites la fin tout seul dans le noir.', tone: 'neutral', effects: { stats: { intelligence: 3, happiness: -2 } } },
      ] },
      { label: 'Demander un autre livre', outcomes: [
        { text: 'On en cherche un nouveau. Il est moins bien, mais il y a un dragon.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 3 }, axes: { curiosity: 5 }, rel: 3 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_small_break', kind: 'family', icon: '🫙', title: 'Ce n’est pas moi', weight: 32,
    cond: { minAge: 3, maxAge: 5 }, target: ['mother', 'father', 'guardian'],
    text: 'La chose est par terre, en morceaux. Il n’y a personne d’autre dans la pièce. {name} arrive.',
    choices: [
      { label: 'Dire que c’est toi', outcomes: [
        { weight: 3, text: 'On ramasse ensemble. {name} dit que ce n’est pas grave, et que ce qui compte est que tu l’aies dit.', tone: 'good', effects: { stats: { karma: 6, happiness: 3 }, axes: { honesty: 6 }, rel: 6 } },
        { weight: 2, text: 'Tu te fais gronder quand même. Tu notes que dire la vérité n’a rien changé.', tone: 'bad', effects: { stats: { karma: -3, stress: 4 }, axes: { honesty: -4 }, rel: -2 } },
      ] },
      { label: 'Regarder ailleurs', outcomes: [
        { weight: 2, text: 'On ne demande rien. Tu passes la journée avec quelque chose de lourd dans le ventre.', tone: 'neutral', effects: { stats: { stress: 5, karma: -3 }, axes: { honesty: -3 } } },
        { weight: 1, text: 'On comprend tout de suite. Ce n’est pas la chose cassée qu’on te reproche.', tone: 'bad', effects: { stats: { karma: -5, stress: 5 }, rel: -5 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_new_baby', kind: 'family', icon: '👶', title: 'Il y en a un autre', weight: 26,
    cond: { minAge: 2, maxAge: 5, hasSiblings: true }, target: ['brother', 'sister'],
    text: 'Il y a quelqu’un de nouveau à la maison. Très petit, très bruyant, et tout le monde le regarde.',
    choices: [
      { label: 'Le regarder aussi', outcomes: [
        { weight: 3, text: 'Tu passes des heures à côté du berceau sans rien faire. On te dit que tu es le grand.', tone: 'good', effects: { stats: { happiness: 3 }, axes: { empathy: 5 }, rel: 8 } },
        { weight: 2, text: 'Tu le trouves décevant. Il ne fait rien. Tu retournes jouer.', tone: 'neutral', effects: { stats: { happiness: -2 } } },
      ] },
      { label: 'Faire beaucoup de bruit', outcomes: [
        { weight: 3, text: 'On s’occupe de toi aussi, un peu vite. Tu recommences le lendemain.', tone: 'bad', effects: { stats: { stress: 4 }, axes: { aggression: 5 }, rel: -3 } },
        { weight: 1, text: 'On te prend sur les genoux, avec l’autre dans les bras. Il y avait de la place pour deux.', tone: 'good', effects: { stats: { happiness: 6 }, axes: { empathy: 4 }, rel: 4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_night_fear', kind: 'family', icon: '🌙', title: 'Il y a quelque chose', weight: 34,
    cond: { minAge: 3, maxAge: 7 }, target: ['mother', 'father'],
    text: 'Tu es sûr qu’il y a quelque chose sous le lit. Absolument sûr. Tu appelles {name}.',
    choices: [
      { label: 'Attendre qu’on vienne', outcomes: [
        { weight: 3, text: '{name} regarde sous le lit, montre qu’il n’y a rien, et reste jusqu’à ce que tu dormes.', tone: 'good', effects: { stats: { happiness: 5, stress: -8 }, rel: 6 } },
        { weight: 2, text: '{name} crie « il n’y a rien ! » depuis le salon. Tu ne redemandes pas.', tone: 'bad', effects: { stats: { stress: 8, happiness: -4 }, rel: -3 } },
      ] },
      { label: 'Se cacher sous la couette', outcomes: [
        { text: 'Tu tiens jusqu’au matin sans bouger. Tu apprends à ne pas appeler.', tone: 'neutral', effects: { stats: { stress: 5, discipline: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_lost_toy', kind: 'random', icon: '🧸', title: 'Il a disparu', weight: 32,
    cond: { minAge: 2, maxAge: 7 },
    text: 'Le doudou n’est plus là. Nulle part. La maison entière se met à chercher.',
    choices: [
      { label: 'Ne pas dormir sans lui', outcomes: [
        { weight: 3, text: 'On le retrouve derrière le radiateur à minuit. Tu ne le lâches plus pendant une semaine.', tone: 'good', effects: { stats: { happiness: 6, stress: -4 } } },
        { weight: 2, text: 'On ne le retrouve jamais. Tu mets des mois à ne plus le chercher des yeux.', tone: 'bad', effects: { stats: { happiness: -8, stress: 6 } } },
      ] },
      { label: 'Faire comme si de rien n’était', outcomes: [
        { text: 'Tu dis que tu es grand. Tu y crois presque.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_puddle', kind: 'random', icon: '🌧️', title: 'La flaque', weight: 38,
    cond: { minAge: 2, maxAge: 8 },
    text: 'Il y a une flaque magnifique. Profonde, large, parfaite. On vient de te mettre des chaussures propres.',
    choices: [
      { label: 'Sauter dedans', outcomes: [
        { weight: 4, text: 'Tu sautes des deux pieds. C’est le meilleur moment de la semaine, et tu te fais gronder après.', tone: 'good', effects: { stats: { happiness: 7, discipline: -3, fitness: 2 } } },
        { weight: 1, text: 'Tu sautes, tu glisses, tu te retrouves assis dedans. Tout le monde rit, toi le premier.', tone: 'neutral', effects: { stats: { happiness: 4, health: -2 } } },
      ] },
      { label: 'Faire le tour', outcomes: [
        { text: 'Tu contournes proprement. On te félicite d’être raisonnable. Tu regardes la flaque encore un moment.', tone: 'neutral', effects: { stats: { discipline: 5, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_why', kind: 'family', icon: '❓', title: 'Pourquoi ?', weight: 36,
    cond: { minAge: 3, maxAge: 7 }, target: ['mother', 'father'],
    text: 'Tu as trouvé le mot le plus puissant de la langue et tu comptes bien t’en servir. « Pourquoi ? » — à chaque réponse.',
    choices: [
      { label: 'Continuer jusqu’au bout', outcomes: [
        { weight: 3, text: '{name} tient bon jusqu’à « parce que c’est comme ça ». Vous en riez tous les deux.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 4 }, rel: 4 } },
        { weight: 2, text: '{name} craque au bout de la quatrième. Tu comprends qu’il y a une limite aux questions.', tone: 'neutral', effects: { stats: { intelligence: 2 }, rel: -2 } },
      ] },
      { label: 'Se taire', outcomes: [
        { text: 'Tu gardes la question pour toi. Tu la reposeras plus tard, ou jamais.', tone: 'neutral', effects: { stats: { intelligence: 1, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_shared_snack', kind: 'family', icon: '🍪', title: 'Le dernier gâteau', weight: 30,
    cond: { minAge: 3, maxAge: 10 }, target: ['brother', 'sister'],
    text: 'Il reste un gâteau. Vous êtes deux. {name} le regarde aussi.',
    choices: [
      { label: 'Le partager', outcomes: [
        { text: 'Vous le cassez en deux, très mal. {name} prend le petit morceau sans rien dire.', tone: 'good', effects: { stats: { karma: 4, happiness: 3 }, rel: 7 } },
      ] },
      { label: 'Le prendre', outcomes: [
        { weight: 3, text: 'Tu le manges vite, debout. {name} ne dit rien, et s’en souvient.', tone: 'neutral', effects: { stats: { happiness: 3, karma: -3 }, rel: -6 } },
        { weight: 1, text: '{name} te le reprend des mains. Vous finissez par vous battre pour des miettes.', tone: 'bad', effects: { stats: { happiness: -4 }, rel: -8 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_drawing', kind: 'life', icon: '🖍️', title: 'Le chef-d’œuvre', weight: 34,
    cond: { minAge: 3, maxAge: 9 }, target: ['mother', 'father'],
    text: 'Tu as passé une heure sur ce dessin. Tu le tends à {name} en le regardant droit dans les yeux.',
    choices: [
      { label: 'Attendre le verdict', outcomes: [
        { weight: 3, text: '{name} le met sur le frigo. Il y restera trois ans.', tone: 'good', effects: { stats: { happiness: 8, intelligence: 2 }, rel: 6, flag: 'exposé:dessin' } },
        { weight: 2, text: '« C’est joli. » Sans lever les yeux. Le dessin finit dans un tiroir.', tone: 'bad', effects: { stats: { happiness: -5 }, rel: -3 } },
      ] },
      { label: 'Le garder pour soi', outcomes: [
        { text: 'Tu le ranges dans ta boîte. Il est très bien là.', tone: 'neutral', effects: { stats: { happiness: 2 }, flag: 'exposé:dessin' } },
      ] },
    ],
  }),
  ev({
    id: 'ch_first_lie', kind: 'life', icon: '🤥', title: 'Le premier mensonge', weight: 28,
    cond: { minAge: 4, maxAge: 9 }, once: true, target: ['mother', 'father'],
    text: 'Quelque chose est cassé. {name} demande qui l’a fait. Tu découvres à cet instant qu’on peut dire autre chose que la vérité.',
    choices: [
      { label: 'Dire que ce n’est pas toi', outcomes: [
        { weight: 2, text: 'Ça passe. Tu passes la soirée à te sentir bizarre.', tone: 'neutral', effects: { stats: { karma: -5, stress: 4 } } },
        { weight: 3, text: 'Ça ne passe pas du tout. La punition est pour le mensonge, pas pour l’objet.', tone: 'bad', effects: { stats: { karma: -3, happiness: -5 }, rel: -6 } },
      ] },
      { label: 'Avouer', outcomes: [
        { text: 'Tu avoues tout de suite. {name} te punit quand même, mais différemment.', tone: 'neutral', effects: { stats: { karma: 6, discipline: 4, happiness: -2 }, rel: 4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_animal_dead', kind: 'life', icon: '🐦', title: 'L’oiseau', weight: 24,
    cond: { minAge: 4, maxAge: 10 }, once: true,
    text: 'Tu trouves un oiseau au pied de la fenêtre. Il ne bouge pas. Tu comprends quelque chose que tu ne savais pas encore.',
    choices: [
      { label: 'L’enterrer dans le jardin', outcomes: [
        { text: 'Tu creuses un trou et tu mets une pierre dessus. Tu y penses encore des années après.', tone: 'neutral', effects: { stats: { happiness: -4, intelligence: 3 } } },
      ] },
      { label: 'Aller chercher un adulte', outcomes: [
        { weight: 3, text: 'On t’explique, doucement. Ce n’est pas facile, mais c’est expliqué.', tone: 'neutral', effects: { stats: { intelligence: 4, stress: 3 } } },
        { weight: 2, text: 'On te dit de ne pas y toucher et on s’en occupe sans toi. Tu restes avec la question.', tone: 'bad', effects: { stats: { stress: 6, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_birthday', kind: 'family', icon: '🎂', title: 'L’anniversaire', weight: 32,
    cond: { minAge: 4, maxAge: 11 },
    text: 'C’est ton anniversaire. Tu as passé la semaine à compter les jours.',
    choices: [
      { label: 'Inviter tout le monde', outcomes: [
        { weight: 3, text: 'La maison est pleine, ça crie partout, c’est parfait.', tone: 'good', effects: { stats: { happiness: 9 }, money: -60 } },
        { weight: 2, text: 'La moitié ne vient pas. Tu fais semblant que ce n’est pas grave.', tone: 'bad', effects: { stats: { happiness: -5, stress: 4 }, money: -60 } },
      ] },
      { label: 'Juste la famille', outcomes: [
        { text: 'Un gâteau, quelques bougies, personne d’autre. C’est bien comme ça.', tone: 'good', effects: { stats: { happiness: 5 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_hide', kind: 'random', icon: '🫥', title: 'La meilleure cachette', weight: 30,
    cond: { minAge: 4, maxAge: 10 },
    text: 'Tu as trouvé une cachette imbattable. Tu y es depuis vingt minutes. Personne ne t’a trouvé. Personne ne te cherche non plus.',
    choices: [
      { label: 'Tenir encore', outcomes: [
        { weight: 2, text: 'On finit par s’inquiéter pour de vrai. Tu sors, et on te serre fort.', tone: 'neutral', effects: { stats: { happiness: 3, stress: 3 } } },
        { weight: 3, text: 'Tu t’endors dedans. On te retrouve deux heures plus tard.', tone: 'good', effects: { stats: { happiness: 4 } } },
      ] },
      { label: 'Sortir en criant « je suis là »', outcomes: [
        { text: 'Personne n’avait remarqué que tu jouais. Tu vas jouer à autre chose.', tone: 'bad', effects: { stats: { happiness: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_stranger_kind', kind: 'random', icon: '🧓', title: 'La voisine', weight: 26,
    cond: { minAge: 4, maxAge: 12 },
    text: 'La vieille dame du dessous te donne un bonbon chaque fois qu’elle te croise dans l’escalier. Aujourd’hui, elle te demande de rester cinq minutes.',
    choices: [
      { label: 'Rester', outcomes: [
        { text: 'Elle te raconte l’immeuble d’il y a quarante ans. Tu ne comprends pas tout, mais tu écoutes.', tone: 'good', effects: { stats: { happiness: 4, intelligence: 3 }, flag: 'exposé:histoire' } },
      ] },
      { label: 'Filer', outcomes: [
        { text: 'Tu montes les escaliers quatre à quatre. Tu la recroiseras demain.', tone: 'neutral', effects: { stats: { happiness: 1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_scraped_knee', kind: 'health', icon: '🩹', title: 'Le genou', weight: 36,
    cond: { minAge: 3, maxAge: 11 },
    text: 'Tu tombes en courant. Le genou saigne, ça pique horriblement, et il y a du monde autour.',
    choices: [
      { label: 'Ne pas pleurer', outcomes: [
        { weight: 3, text: 'Tu te relèves et tu repars en boitant. Tu pleures plus tard, tout seul.', tone: 'neutral', effects: { stats: { discipline: 5, health: -2, stress: 3 } } },
        { weight: 2, text: 'Tu tiens dix secondes, puis tout sort d’un coup. C’était trop demander.', tone: 'neutral', effects: { stats: { happiness: -2, health: -2 } } },
      ] },
      { label: 'Pleurer très fort', outcomes: [
        { text: 'On accourt, on souffle dessus, on met un pansement trop grand. Ça va déjà mieux.', tone: 'good', effects: { stats: { happiness: 3, health: -1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_new_word', kind: 'life', icon: '🗯️', title: 'Le mot interdit', weight: 28,
    cond: { minAge: 4, maxAge: 10 },
    text: 'Tu as entendu un mot dans la cour. Un mot qui fait beaucoup d’effet. Tu le répètes à table.',
    choices: [
      { label: 'Le redire plus fort', outcomes: [
        { weight: 3, text: 'Le silence est total. Puis quelqu’un rit, et tout le monde s’y met.', tone: 'neutral', effects: { stats: { happiness: 4, discipline: -4 } } },
        { weight: 2, text: 'On t’envoie dans ta chambre sans explication. Tu ne sais toujours pas ce que ça veut dire.', tone: 'bad', effects: { stats: { happiness: -4, discipline: 2 } } },
      ] },
      { label: 'Demander ce que ça veut dire', outcomes: [
        { text: 'On t’explique à moitié, mal, et en changeant de sujet. Tu retiens surtout qu’il ne faut pas le dire.', tone: 'neutral', effects: { stats: { intelligence: 2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_want_help', kind: 'family', icon: '🧺', title: 'Vouloir aider', weight: 26,
    cond: { minAge: 3, maxAge: 8 }, target: ['mother', 'father'],
    text: 'Tu veux porter le panier de linge. Il est plus grand que toi. Tu insistes.',
    choices: [
      { label: 'Insister', outcomes: [
        { weight: 3, text: '{name} te laisse le traîner sur trois mètres et te remercie sérieusement.', tone: 'good', effects: { stats: { happiness: 6, discipline: 3 }, rel: 5 } },
        { weight: 2, text: 'Le panier se renverse. On ramasse en soupirant, sans toi.', tone: 'bad', effects: { stats: { happiness: -4 } } },
      ] },
      { label: 'Laisser faire', outcomes: [
        { text: 'Tu regardes depuis le couloir.', tone: 'neutral', effects: { stats: { happiness: -1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_night_noise', kind: 'family', icon: '🚪', title: 'La dispute', weight: 30,
    cond: { minAge: 4, maxAge: 12 },
    text: 'Ça crie en bas. Tu ne comprends pas les mots mais tu comprends le ton. Tu es assis en haut des escaliers.',
    choices: [
      { label: 'Descendre', outcomes: [
        { weight: 3, text: 'Le silence se fait d’un coup. On te ramène au lit en parlant doucement.', tone: 'neutral', effects: { stats: { stress: 6, happiness: -3 } } },
        { weight: 2, text: 'On ne t’entend même pas arriver. Tu remontes tout seul.', tone: 'bad', effects: { stats: { stress: 10, happiness: -6 } } },
      ] },
      { label: 'Remonter se coucher', outcomes: [
        { text: 'Tu mets l’oreiller sur ta tête. Tu apprends à faire ça.', tone: 'bad', effects: { stats: { stress: 8, discipline: 2, happiness: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_collect', kind: 'life', icon: '🐚', title: 'La collection', weight: 28,
    cond: { minAge: 5, maxAge: 12 },
    text: 'Tu as commencé à ramasser des choses. Des cailloux, des capsules, des coquillages — la boîte est déjà pleine.',
    choices: [
      { label: 'Tout garder', outcomes: [
        { text: 'La boîte devient deux boîtes. Tu connais chaque pièce par cœur.', tone: 'good', effects: { stats: { happiness: 4, intelligence: 2 } } },
      ] },
      { label: 'Échanger avec quelqu’un', outcomes: [
        { weight: 3, text: 'Tu troques ta plus belle pièce contre trois moyennes. Tu ne regrettes pas.', tone: 'good', effects: { stats: { happiness: 3, intelligence: 3 } } },
        { weight: 2, text: 'On t’a bien eu. Tu apprends quelque chose sur les échanges.', tone: 'neutral', effects: { stats: { intelligence: 4, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_bath_refuse', kind: 'family', icon: '🛁', title: 'Pas envie', weight: 30,
    cond: { minAge: 3, maxAge: 8 }, target: ['mother', 'father'],
    text: 'C’est l’heure du bain. Tu as décidé que non. Fermement.',
    choices: [
      { label: 'Tenir bon', outcomes: [
        { weight: 2, text: 'Tu gagnes. Tu sens le chien pendant deux jours et personne ne relève.', tone: 'neutral', effects: { stats: { discipline: -4, happiness: 3 } } },
        { weight: 3, text: '{name} te porte dedans en riant. Une fois dans l’eau, tu ne veux plus sortir.', tone: 'good', effects: { stats: { happiness: 4 }, rel: 3 } },
      ] },
      { label: 'Céder', outcomes: [
        { text: 'Tu y vas en traînant les pieds, pour la forme.', tone: 'neutral', effects: { stats: { discipline: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_big_kid', kind: 'random', icon: '🛴', title: 'Les grands', weight: 26,
    cond: { minAge: 5, maxAge: 11 },
    text: 'Les grands du quartier te laissent traîner avec eux cet après-midi. Ils te proposent de faire quelque chose que tu sais interdit.',
    choices: [
      { label: 'Les suivre', outcomes: [
        { weight: 3, text: 'Vous ne vous faites pas prendre. Tu as l’impression d’avoir dix ans de plus.', tone: 'neutral', effects: { stats: { happiness: 6, discipline: -5, criminality: 3 } } },
        { weight: 2, text: 'Vous vous faites prendre. Les grands courent plus vite que toi.', tone: 'bad', effects: { stats: { happiness: -6, discipline: -2, criminality: 2 } } },
      ] },
      { label: 'Rentrer', outcomes: [
        { text: 'Tu rentres. On te traite de bébé pendant une semaine, puis on oublie.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_teacher_note', kind: 'school', icon: '📩', title: 'Le mot dans le cahier', weight: 30,
    cond: { minAge: 6, maxAge: 12 }, target: ['mother', 'father'],
    text: 'Il y a un mot de l’école dans ton cahier, à faire signer. Tu sais ce qu’il y a dedans.',
    choices: [
      { label: 'Le donner tout de suite', outcomes: [
        { weight: 3, text: '{name} le lit, soupire, signe, et vous en parlez. C’est fini en cinq minutes.', tone: 'neutral', effects: { stats: { karma: 4, happiness: -2 }, rel: 3 } },
        { weight: 2, text: '{name} le prend très mal. La soirée est longue.', tone: 'bad', effects: { stats: { happiness: -6, stress: 6 }, rel: -5 } },
      ] },
      { label: 'Imiter la signature', outcomes: [
        { weight: 2, text: 'Ça passe. Tu recommenceras.', tone: 'neutral', effects: { stats: { karma: -5, discipline: -4, criminality: 3 } } },
        { weight: 3, text: 'Ça ne passe pas du tout. L’école appelle à la maison.', tone: 'bad', effects: { stats: { happiness: -8, karma: -4 }, rel: -8 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_grandparent_visit', kind: 'family', icon: '👴', title: 'Le dimanche', weight: 28,
    cond: { minAge: 3, maxAge: 12 }, target: ['grandmother', 'grandfather'],
    text: 'On va chez {name} dimanche. Il y aura à manger, des questions sur l’école, et beaucoup de temps.',
    choices: [
      { label: 'Y aller de bon cœur', outcomes: [
        { text: 'Tu passes l’après-midi à écouter des histoires que tu connais déjà. C’est bien.', tone: 'good', effects: { stats: { happiness: 5 }, rel: 7, flag: 'exposé:histoire' } },
      ] },
      { label: 'Traîner les pieds', outcomes: [
        { weight: 3, text: 'Tu t’ennuies une heure, puis tu finis par jouer aux cartes avec {name}.', tone: 'neutral', effects: { stats: { happiness: 2 }, rel: 3 } },
        { weight: 2, text: 'Tu passes l’après-midi dans un coin. {name} ne dit rien mais s’en aperçoit.', tone: 'bad', effects: { rel: -4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_first_steps', kind: 'life', icon: '👣', title: 'Premiers pas', weight: 30,
    cond: { minAge: 1, maxAge: 2 }, once: true,
    text: 'Tu lâches le bord de la table basse et tu traverses le salon sur tes deux jambes. Tout le monde applaudit comme si tu venais de gagner un marathon.',
    choices: [
      { label: 'Recommencer !', outcomes: [{ text: 'Tu recommences vingt fois. Tes parents filment tout.', tone: 'good', effects: { stats: { happiness: 6, fitness: 3 } } }] },
      { label: 'Se rasseoir', outcomes: [{ text: 'Tu retombes sur les fesses et tu ris. C’était bien assez pour aujourd’hui.', tone: 'neutral', effects: { stats: { happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_first_word', kind: 'life', icon: '🗣️', title: 'Premier mot', weight: 28,
    cond: { minAge: 1, maxAge: 3 }, once: true, target: ['mother', 'father'],
    text: 'Tu prononces ton tout premier mot devant {name}, qui te regarde comme si tu venais de réciter un poème entier.',
    choices: [
      { label: 'Dire son nom', outcomes: [{ text: '{name} en a les larmes aux yeux et raconte la scène à tout le monde pendant six mois.', tone: 'good', effects: { stats: { happiness: 5, intelligence: 2 }, rel: 8 } }] },
      { label: 'Dire « non »', outcomes: [{ text: 'Ton premier mot est « non ». C’est un programme.', tone: 'neutral', effects: { stats: { happiness: 3, discipline: -3 } } }] },
    ],
  }),
  ev({
    id: 'ch_sandbox', kind: 'random', icon: '🏖️', title: 'Le bac à sable', weight: 40,
    cond: { minAge: 3, maxAge: 6 },
    text: 'Un enfant du parc t’arrache la pelle des mains sans un mot.',
    choices: [
      { label: 'La reprendre', outcomes: [
        { weight: 3, text: 'Tu la récupères d’un geste sec. L’autre pleure, mais la pelle est à toi.', tone: 'neutral', effects: { stats: { happiness: 3, discipline: -2, karma: -2 } } },
        { weight: 2, text: 'Vous vous disputez et tu tombes en arrière. Bosse au front.', tone: 'bad', effects: { stats: { health: -3, happiness: -4 } } },
      ] },
      { label: 'Partager', outcomes: [{ text: 'Vous construisez un château à deux. Vous ne saurez jamais son prénom, mais c’était un bon après-midi.', tone: 'good', effects: { stats: { happiness: 6, karma: 4 } } }] },
      { label: 'Aller voir un adulte', outcomes: [{ text: 'Un parent intervient, la pelle revient. Tu apprends que se plaindre marche parfois.', tone: 'neutral', effects: { stats: { happiness: 1, karma: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_imaginary_friend', kind: 'random', icon: '👻', title: 'Ami imaginaire', weight: 22,
    cond: { minAge: 4, maxAge: 8 }, once: true,
    text: 'Tu as un nouvel ami. Il s’appelle Blaireau, il mesure trois mètres et personne d’autre ne le voit.',
    choices: [
      { label: 'Lui mettre une assiette à table', outcomes: [{ text: 'Tes parents jouent le jeu pendant des mois. Blaireau a même un anniversaire.', tone: 'good', effects: { stats: { happiness: 7, intelligence: 3 } } }] },
      { label: 'Le garder secret', outcomes: [{ text: 'Blaireau reste ton affaire. Vous avez de longues conversations sous le lit.', tone: 'neutral', effects: { stats: { happiness: 4, intelligence: 2 } } }] },
    ],
  }),
  ev({
    id: 'ch_pet_wish', kind: 'family', icon: '🐶', title: 'Un animal !', weight: 30,
    cond: { minAge: 5, maxAge: 11, hasPet: false }, target: ['mother', 'father'],
    text: 'Tu supplies {name} d’adopter un animal. Tu promets de t’en occuper tous les jours, ce qui est statistiquement improbable.',
    choices: [
      { label: 'Insister lourdement', outcomes: [
        { weight: 2, text: '{name} finit par craquer. Un compagnon entre dans ta vie.', tone: 'good', effects: { stats: { happiness: 10 }, special: 'newPet' } },
        { weight: 3, text: '{name} craque… de nerfs. Sujet clos pendant deux ans.', tone: 'bad', effects: { stats: { happiness: -5 }, rel: -6 } },
      ] },
      { label: 'Faire un dossier illustré', outcomes: [
        { weight: 3, text: 'Ton exposé de six pages sur les besoins d’un hamster emporte la décision.', tone: 'good', effects: { stats: { happiness: 9, intelligence: 4 }, rel: 5, special: 'newPet' } },
        { weight: 2, text: '{name} trouve ça adorable, mais la réponse reste non.', tone: 'neutral', effects: { stats: { intelligence: 3, happiness: -2 }, rel: 3 } },
      ] },
      { label: 'Laisser tomber', outcomes: [{ text: 'Tu comprends que ce n’est pas le moment. Tu dessines des chiens à la place.', tone: 'neutral', effects: { stats: { discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_bike', kind: 'life', icon: '🚲', title: 'Sans les petites roues', weight: 28,
    cond: { minAge: 5, maxAge: 9 }, once: true,
    text: 'On vient de retirer les stabilisateurs de ton vélo. La descente devant la maison paraît soudain immense.',
    choices: [
      { label: 'Foncer', outcomes: [
        { weight: 3, text: 'Vingt mètres, puis cinquante, puis toute la rue. Tu ne t’arrêtes plus.', tone: 'good', effects: { stats: { happiness: 8, fitness: 5, discipline: 2 } } },
        { weight: 2, text: 'Chute spectaculaire dans les buissons. Genou en sang, fierté intacte.', tone: 'bad', effects: { stats: { health: -4, happiness: -2, fitness: 2 } } },
      ] },
      { label: 'Demander qu’on te tienne', outcomes: [{ text: 'On te tient la selle jusqu’au bout de la rue. Tu ne sauras que plus tard qu’on avait lâché depuis longtemps.', tone: 'good', effects: { stats: { happiness: 6, fitness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_school_first', kind: 'school', icon: '🎒', title: 'Première rentrée', weight: 26,
    cond: { minAge: 5, maxAge: 7 }, once: true, target: ['mother', 'father'],
    text: 'Premier jour d’école. {name} te dépose devant la grille et te dit que tout va bien se passer.',
    choices: [
      { label: 'Entrer sans se retourner', outcomes: [{ text: 'Tu entres droit devant. {name} pleure discrètement dans la voiture.', tone: 'good', effects: { stats: { happiness: 4, discipline: 5, intelligence: 2 } } }] },
      { label: 'Pleurer et s’accrocher', outcomes: [{ text: 'Il faut trois adultes pour te décrocher de la jambe de {name}. À midi tu as déjà deux amis.', tone: 'neutral', effects: { stats: { happiness: -2, discipline: -2 }, rel: 3 } }] },
    ],
  }),
  ev({
    id: 'ch_bully', kind: 'random', icon: '😠', title: 'Moqueries', weight: 42,
    cond: { minAge: 6, maxAge: 15 },
    text: 'Un camarade se moque de toi devant toute la classe. Tout le monde rit, y compris ceux que tu croyais tes amis.',
    choices: [
      { label: 'L’ignorer', outcomes: [
        { weight: 3, text: 'Tu ne réagis pas. Il se lasse au bout de quelques semaines.', tone: 'neutral', effects: { stats: { happiness: -4, discipline: 4, stress: 5 } } },
        { weight: 2, text: 'Ton silence l’encourage. Ça dure toute l’année.', tone: 'bad', effects: { stats: { happiness: -10, stress: 12, reputation: -5 } } },
      ] },
      { label: 'Lui répondre', outcomes: [
        { weight: 3, text: 'Ta réplique fait mouche. Le rire change de camp.', tone: 'good', effects: { stats: { happiness: 6, reputation: 8, intelligence: 1 } } },
        { weight: 2, text: 'Tu bafouilles. C’est pire.', tone: 'bad', effects: { stats: { happiness: -7, reputation: -6, stress: 8 } } },
      ] },
      { label: 'Prévenir un professeur', outcomes: [
        { weight: 3, text: 'Le professeur intervient. Les moqueries cessent, mais on te colle une étiquette.', tone: 'neutral', effects: { stats: { happiness: 2, reputation: -4, karma: 2 } } },
        { weight: 2, text: 'Le professeur prend l’affaire au sérieux et l’élève est sanctionné. Tu respires.', tone: 'good', effects: { stats: { happiness: 5, stress: -6 } } },
      ] },
      { label: 'Se battre', outcomes: [
        { weight: 2, text: 'Tu gagnes l’échange. On ne t’embête plus, mais tu es convoqué.', tone: 'neutral', effects: { stats: { reputation: 10, discipline: -8, happiness: 3, criminality: 3 } } },
        { weight: 3, text: 'Tu perds, devant tout le monde, et tu es exclu trois jours.', tone: 'bad', effects: { stats: { happiness: -12, health: -5, reputation: -8, discipline: -10 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_reading', kind: 'school', icon: '📖', title: 'Le livre de trop', weight: 26,
    cond: { minAge: 7, maxAge: 13 },
    text: 'Tu tombes sur un roman beaucoup trop long pour ton âge dans la bibliothèque de la classe.',
    choices: [
      { label: 'Le lire en entier', outcomes: [
        { weight: 3, text: 'Trois semaines, la lampe de poche sous la couette. Tu n’as rien compris à la moitié, et c’était formidable.', tone: 'good', effects: { stats: { intelligence: 7, happiness: 4, health: -2 } } },
        { weight: 1, text: 'Tu abandonnes page 90, mais quelque chose reste.', tone: 'neutral', effects: { stats: { intelligence: 3 } } },
      ] },
      { label: 'Reprendre les bandes dessinées', outcomes: [{ text: 'Pas de honte à avoir. Tu dévores quatre albums dans la semaine.', tone: 'neutral', effects: { stats: { happiness: 4, intelligence: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_talent', kind: 'life', icon: '🎹', title: 'Un don caché', weight: 20,
    cond: { minAge: 6, maxAge: 12 }, once: true,
    text: 'Un professeur remarque que tu es particulièrement doué pour quelque chose. Il propose des cours en dehors de l’école.',
    choices: [
      { label: 'Accepter (musique)', outcomes: [{ text: 'Tu apprends le solfège. C’est laborieux, puis un jour ça devient beau.', tone: 'good', effects: { stats: { intelligence: 5, happiness: 5, discipline: 6 }, flag: 'talent_scène' } }] },
      { label: 'Accepter (sport)', outcomes: [{ text: 'Trois entraînements par semaine. Ton corps change.', tone: 'good', effects: { stats: { fitness: 10, discipline: 6, happiness: 3 }, flag: 'talent_corps' } }] },
      { label: 'Accepter (mathématiques)', outcomes: [{ text: 'Tu passes tes mercredis à résoudre des énigmes. C’est étrangement satisfaisant.', tone: 'good', effects: { stats: { intelligence: 9, discipline: 4, happiness: 1 }, flag: 'talent_chiffres' } }] },
      { label: 'Refuser', outcomes: [{ text: 'Tu préfères garder tes mercredis. On ne saura jamais.', tone: 'neutral', effects: { stats: { happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_parents_argue', kind: 'family', icon: '🌩️', title: 'Une dispute derrière la porte', weight: 32,
    cond: { minAge: 4, maxAge: 16, hasParents: true },
    text: 'Tu entends tes parents se disputer dans la cuisine. Ils baissent la voix dès que tu approches.',
    choices: [
      { label: 'Écouter à la porte', outcomes: [
        { weight: 3, text: 'C’est une histoire d’argent. Tu ne comprends pas tout, mais tu comprends l’essentiel.', tone: 'bad', effects: { stats: { happiness: -6, stress: 10, intelligence: 2 } } },
        { weight: 2, text: 'Ils te surprennent. La gêne est totale.', tone: 'bad', effects: { stats: { happiness: -8, stress: 8 } } },
      ] },
      { label: 'Monter le son de la télé', outcomes: [{ text: 'Tu montes le volume et tu fais comme si de rien n’était. Une compétence que tu garderas.', tone: 'neutral', effects: { stats: { happiness: -3, stress: 5, discipline: 2 } } }] },
      { label: 'Entrer dans la cuisine', outcomes: [{ text: 'Tu entres. Ils s’arrêtent net et te serrent dans leurs bras. La dispute reprendra plus tard.', tone: 'neutral', effects: { stats: { happiness: -1, stress: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_sibling_fight', kind: 'family', icon: '🥊', title: 'Guerre fraternelle', weight: 34,
    cond: { minAge: 4, maxAge: 18, hasSiblings: true }, target: ['brother', 'sister'],
    text: '{name} a cassé quelque chose qui t’appartenait, puis a juré que ce n’était pas {le}.',
    choices: [
      { label: 'Le dire aux parents', outcomes: [
        { weight: 3, text: '{name} est puni{e}. La vengeance viendra, tôt ou tard.', tone: 'neutral', effects: { stats: { happiness: 3 }, rel: -14, opinion: -12 } },
        { weight: 2, text: 'Personne ne te croit. Double injustice.', tone: 'bad', effects: { stats: { happiness: -8, stress: 6 }, rel: -6 } },
      ] },
      { label: 'Se venger discrètement', outcomes: [{ text: 'Tu échanges le sucre et le sel dans son bol. Justice est faite.', tone: 'neutral', effects: { stats: { happiness: 5, karma: -3 }, rel: -8 } }] },
      { label: 'Laisser couler', outcomes: [{ text: 'Tu ne dis rien. {name} le remarque et devient bizarrement gentil{e} pendant une semaine.', tone: 'good', effects: { stats: { karma: 5, discipline: 3 }, rel: 8, opinion: 10 } }] },
    ],
  }),
  ev({
    id: 'ch_lost', kind: 'random', icon: '🏬', title: 'Perdu dans le magasin', weight: 22,
    cond: { minAge: 3, maxAge: 8 },
    text: 'Tu lèves les yeux au rayon des céréales : plus personne. Le magasin est immense et tout à coup très silencieux.',
    choices: [
      { label: 'Aller à l’accueil', outcomes: [{ text: 'Tu expliques calmement la situation à une vendeuse. On t’annonce au micro. Tes parents arrivent en courant.', tone: 'good', effects: { stats: { intelligence: 5, discipline: 4, happiness: -2, stress: 6 } } }] },
      { label: 'Courir dans les allées', outcomes: [{ text: 'Vingt minutes de panique avant qu’on te retrouve en pleurs près des surgelés.', tone: 'bad', effects: { stats: { happiness: -8, stress: 14 } } }] },
      { label: 'Attendre sur place', outcomes: [{ text: 'Tu ne bouges pas d’un centimètre. On te retrouve exactement là. Bonne pioche.', tone: 'neutral', effects: { stats: { discipline: 5, stress: 5 } } }] },
    ],
  }),
  ev({
    id: 'ch_tooth', kind: 'life', icon: '🦷', title: 'La dent qui bouge', weight: 24,
    cond: { minAge: 5, maxAge: 9 },
    text: 'Ta dent de devant tient par un fil depuis trois jours. Tu ne penses plus qu’à ça.',
    choices: [
      { label: 'Tirer un grand coup', outcomes: [{ text: 'Un « clac » horrible, du sang, puis une pièce sous l’oreiller.', tone: 'good', effects: { stats: { happiness: 4, discipline: 3 }, money: 5 } }] },
      { label: 'Attendre qu’elle tombe seule', outcomes: [{ text: 'Elle tombe dans une pomme deux jours plus tard. Tu l’avales à moitié.', tone: 'neutral', effects: { stats: { happiness: 2 }, money: 5 } }] },
    ],
  }),
  ev({
    id: 'ch_birthday_flop', kind: 'family', icon: '🎂', title: 'Un anniversaire compliqué', weight: 20,
    cond: { minAge: 6, maxAge: 13 },
    text: 'Tu as invité toute la classe. Trois personnes sont venues.',
    choices: [
      { label: 'Faire la fête quand même', outcomes: [{ text: 'Vous êtes quatre et c’est bien mieux. Ces trois-là, tu t’en souviendras.', tone: 'good', effects: { stats: { happiness: 6, karma: 3 }, special: 'newFriend' } }] },
      { label: 'Bouder dans sa chambre', outcomes: [{ text: 'Tu passes l’après-midi enfermé. Le gâteau reste entier.', tone: 'bad', effects: { stats: { happiness: -10, reputation: -4, stress: 6 } } }] },
    ],
  }),
  ev({
    id: 'ch_grandparent', kind: 'family', icon: '🧓', title: 'Chez les grands-parents', weight: 26,
    cond: { minAge: 4, maxAge: 16 },
    text: 'Tu passes l’été chez tes grands-parents. Il n’y a rien à faire et tout le temps du monde.',
    choices: [
      { label: 'Écouter leurs histoires', outcomes: [{ text: 'Tu apprends des choses sur ta famille que personne d’autre ne t’aurait racontées.', tone: 'good', effects: { stats: { happiness: 8, intelligence: 5, karma: 4 } } }] },
      { label: 'Explorer le jardin', outcomes: [{ text: 'Cabanes, insectes, genoux écorchés. Un été parfait.', tone: 'good', effects: { stats: { happiness: 9, fitness: 6, health: 2 } } }] },
      { label: 'S’ennuyer ferme', outcomes: [{ text: 'Tu comptes les jours. Plus tard, tu regretteras de ne pas avoir posé plus de questions.', tone: 'neutral', effects: { stats: { happiness: -3, stress: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_allowance', kind: 'money', icon: '🪙', title: 'Argent de poche', weight: 28,
    cond: { minAge: 7, maxAge: 15 }, target: ['mother', 'father'],
    text: '{name} te propose de l’argent de poche en échange de quelques tâches à la maison.',
    choices: [
      { label: 'Accepter et bosser', outcomes: [{ text: 'Poubelles, vaisselle, courses. Tu commences à comprendre le rapport entre l’effort et la monnaie.', tone: 'good', effects: { stats: { discipline: 7, happiness: 2 }, money: 300, rel: 5 } }] },
      { label: 'Négocier un meilleur tarif', outcomes: [
        { weight: 3, text: '{name} rit, puis accepte. Première négociation réussie.', tone: 'good', effects: { stats: { intelligence: 4, discipline: 3 }, money: 480, rel: 3 } },
        { weight: 2, text: 'La négociation tourne court. C’est à prendre ou à laisser.', tone: 'neutral', effects: { stats: { discipline: 2 }, money: 200, rel: -2 } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tu préfères ta liberté. Elle ne rapporte rien.', tone: 'neutral', effects: { stats: { discipline: -3, happiness: 2 } } }] },
    ],
  }),
  ev({
    id: 'ch_nightmare', kind: 'random', icon: '🌙', title: 'Cauchemars', weight: 22,
    cond: { minAge: 3, maxAge: 11 },
    text: 'Depuis deux semaines, tu te réveilles en pleine nuit avec le même rêve.',
    choices: [
      { label: 'En parler', outcomes: [{ text: 'On t’écoute, on laisse une veilleuse allumée. Ça finit par passer.', tone: 'good', effects: { stats: { happiness: 4, stress: -8 } } }] },
      { label: 'Garder ça pour soi', outcomes: [{ text: 'Tu dors mal pendant des mois. Personne ne le remarque.', tone: 'bad', effects: { stats: { health: -4, happiness: -5, stress: 12, intelligence: -1 } } }] },
    ],
  }),
  ev({
    id: 'ch_class_pet', kind: 'school', icon: '🐹', title: 'La mascotte de la classe', weight: 18,
    cond: { minAge: 6, maxAge: 11 },
    text: 'C’est ton tour de ramener le hamster de la classe à la maison pour le week-end.',
    choices: [
      { label: 'Le surveiller comme un trésor', outcomes: [{ text: 'Rendu lundi en parfait état. La maîtresse te confie désormais tout.', tone: 'good', effects: { stats: { discipline: 6, reputation: 5, happiness: 4 } } }] },
      { label: 'Le laisser explorer le salon', outcomes: [
        { weight: 2, text: 'Deux heures pour le retrouver derrière le canapé. Il va bien. Toi non.', tone: 'neutral', effects: { stats: { stress: 10, happiness: -2 } } },
        { weight: 1, text: 'Il disparaît sous le parquet. Le lundi est très long.', tone: 'bad', effects: { stats: { happiness: -10, reputation: -8, stress: 14 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_moving', kind: 'family', icon: '📦', title: 'Déménagement', weight: 18,
    cond: { minAge: 5, maxAge: 17 },
    text: 'Tes parents annoncent que la famille déménage. Nouvelle ville, nouvelle école, nouveaux visages.',
    choices: [
      { label: 'Prendre ça comme une aventure', outcomes: [{ text: 'Tu décides que ce sera bien. C’est en grande partie ce qui fait que ça l’est.', tone: 'good', effects: { stats: { happiness: 3, discipline: 4, intelligence: 2 } } }] },
      { label: 'Protester', outcomes: [{ text: 'Ça ne change rien au calendrier des cartons. Tu perds tes amis d’avant.', tone: 'bad', effects: { stats: { happiness: -10, stress: 10 }, special: 'loseFriend' } }] },
    ],
  }),
  ev({
    id: 'ch_swim', kind: 'life', icon: '🏊', title: 'Apprendre à nager', weight: 22,
    cond: { minAge: 4, maxAge: 10 }, once: true,
    text: 'Au bord du grand bassin, le maître-nageur te tend la main.',
    choices: [
      { label: 'Sauter', outcomes: [
        { weight: 4, text: 'Tu bois la tasse, tu remontes, tu recommences. Trois semaines plus tard tu traverses le bassin.', tone: 'good', effects: { stats: { fitness: 8, happiness: 5, discipline: 4 } } },
        { weight: 1, text: 'Tu paniques sous l’eau. Il faudra des années pour revenir à la piscine.', tone: 'bad', effects: { stats: { happiness: -8, stress: 14, fitness: -2 }, flag: 'aquaphobia' } },
      ] },
      { label: 'Rester dans le petit bain', outcomes: [{ text: 'Tu ne quittes pas la zone où tu as pied. C’est prudent, et un peu triste.', tone: 'neutral', effects: { stats: { fitness: 2, happiness: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_broken_vase', kind: 'family', icon: '🏺', title: 'Le vase', weight: 24,
    cond: { minAge: 5, maxAge: 13 },
    text: 'Le vase préféré de la maison gît en morceaux sur le carrelage. Personne d’autre n’était dans la pièce.',
    choices: [
      { label: 'Avouer', outcomes: [{ text: 'Tu es puni, mais on te dit que tu as bien fait de le dire. Les deux sont vrais.', tone: 'neutral', effects: { stats: { karma: 8, discipline: 5, happiness: -4 } } }] },
      { label: 'Accuser le chat', outcomes: [
        { weight: 2, text: 'Ça passe. Le chat te regarde différemment depuis.', tone: 'neutral', effects: { stats: { karma: -6, happiness: 2, criminality: 3 } } },
        { weight: 3, text: 'Il n’y a pas de chat dans cette maison. Le mensonge coûte plus cher que le vase.', tone: 'bad', effects: { stats: { karma: -8, happiness: -8, discipline: -5 } } },
      ] },
      { label: 'Cacher les morceaux', outcomes: [{ text: 'On les retrouve trois jours plus tard dans la poubelle du garage.', tone: 'bad', effects: { stats: { karma: -5, happiness: -6, criminality: 4 } } }] },
    ],
  }),
  ev({
    id: 'ch_science_fair', kind: 'school', icon: '🔭', title: 'Exposé de sciences', weight: 22,
    cond: { minAge: 8, maxAge: 15 },
    text: 'La classe organise un concours de projets scientifiques.',
    choices: [
      { label: 'Se donner à fond', requiresStat: { intelligence: 45 }, outcomes: [
        { weight: 3, text: 'Ton volcan fonctionne trop bien. Tu gagnes, et la table du fond est fichue.', tone: 'good', effects: { stats: { intelligence: 8, reputation: 8, happiness: 7, discipline: 4 } } },
        { weight: 2, text: 'Ton projet ne marche pas le jour J. Tu as quand même appris énormément.', tone: 'neutral', effects: { stats: { intelligence: 5, happiness: -3 } } },
      ] },
      { label: 'Faire le minimum', outcomes: [{ text: 'Trois affiches recopiées la veille. Personne n’est dupe.', tone: 'neutral', effects: { stats: { intelligence: 1, discipline: -4, reputation: -3 } } }] },
      { label: 'Ne pas participer', outcomes: [{ text: 'Tu regardes les autres présenter. Certains sont vraiment bons.', tone: 'neutral', effects: { stats: { happiness: -2 } } }] },
    ],
  }),
];
