/** Événements de l'adolescence (12-19 ans). */

import { ev, type GameEvent } from './types.ts';

export const TEEN_EVENTS: GameEvent[] = [
  ev({
    id: 'tn_party', kind: 'random', icon: '🎉', title: 'Une fête sans les parents', weight: 40,
    cond: { minAge: 13, maxAge: 19 },
    text: 'Les parents d’un camarade sont partis pour le week-end. Toute la classe y va. Les tiens ne sont pas au courant.',
    choices: [
      { label: 'Y aller et rentrer à l’heure', outcomes: [{ text: 'Deux heures de fête, un retour discret par la fenêtre. Opération parfaite.', tone: 'good', effects: { stats: { happiness: 8, reputation: 6, discipline: -2 } } }] },
      { label: 'Y aller et rester jusqu’au bout', outcomes: [
        { weight: 3, text: 'Une nuit mémorable. Tu rentres à 5 h. Personne ne s’en aperçoit.', tone: 'good', effects: { stats: { happiness: 12, reputation: 10, health: -4, discipline: -6 } } },
        { weight: 3, text: 'Tes parents t’attendent dans le salon, lumière allumée. Consigné un mois.', tone: 'bad', effects: { stats: { happiness: -12, discipline: -8, stress: 12 } } },
        { weight: 1, text: 'La police arrive pour tapage. Ton nom est noté.', tone: 'bad', effects: { stats: { happiness: -14, reputation: -8, criminality: 5, stress: 18 } } },
      ] },
      { label: 'Rester à la maison', outcomes: [{ text: 'Tu regardes les stories des autres depuis ton lit. Ce n’est pas la meilleure soirée de ta vie.', tone: 'neutral', effects: { stats: { happiness: -4, discipline: 4, reputation: -3 } } }] },
    ],
  }),
  ev({
    id: 'tn_first_crush', kind: 'love', icon: '💘', title: 'Un premier béguin', weight: 44,
    cond: { minAge: 12, maxAge: 19 }, target: ['classmate', 'friend'],
    text: 'Tu ne regardes plus {name} comme avant. C’est agaçant, permanent et complètement irrationnel.',
    choices: [
      { label: 'Se déclarer', outcomes: [
        { weight: 2, text: '{name} sourit et dit oui. Tu ne touches plus terre pendant une semaine.', tone: 'good', effects: { stats: { happiness: 16, reputation: 5 }, rel: 22, opinion: 20 } },
        { weight: 3, text: '{name} est gêné{e} et répond que « ce serait bizarre ». Vous ne vous parlez plus pareil.', tone: 'bad', effects: { stats: { happiness: -12, stress: 8 }, rel: -8 } },
      ] },
      { label: 'Passer par un ami', outcomes: [
        { weight: 2, text: 'Le message est transmis. {name} vient te voir directement. Ça marche.', tone: 'good', effects: { stats: { happiness: 12 }, rel: 16, opinion: 12 } },
        { weight: 3, text: 'Toute l’école est au courant avant {name}. Humiliation totale.', tone: 'bad', effects: { stats: { happiness: -14, reputation: -10, stress: 12 } } },
      ] },
      { label: 'Ne rien dire', outcomes: [{ text: 'Tu gardes ça pour toi pendant deux ans. Tu y penseras encore à trente ans.', tone: 'neutral', effects: { stats: { happiness: -4, stress: 5, intelligence: 1 } } }] },
    ],
  }),
  ev({
    id: 'tn_cigarette', kind: 'health', icon: '🚬', title: 'Derrière le gymnase', weight: 32,
    cond: { minAge: 12, maxAge: 19 },
    text: 'On te tend une cigarette derrière le gymnase. Cinq paires d’yeux attendent ta réaction.',
    choices: [
      { label: 'Essayer', outcomes: [
        { weight: 3, text: 'Tu tousses comme un moteur froid. Tout le monde rit, mais tu es dans le groupe.', tone: 'neutral', effects: { stats: { health: -4, reputation: 5, addiction: 8, fitness: -3 } } },
        { weight: 2, text: 'Tu aimes ça. C’est le problème.', tone: 'bad', effects: { stats: { health: -6, addiction: 18, fitness: -5, reputation: 4 } } },
      ] },
      { label: 'Refuser', outcomes: [
        { weight: 3, text: 'Tu dis non sans en faire un discours. Personne n’insiste vraiment.', tone: 'good', effects: { stats: { discipline: 6, health: 2, reputation: -2 } } },
        { weight: 2, text: 'On te charrie pendant deux semaines. Tu tiens bon.', tone: 'neutral', effects: { stats: { discipline: 8, reputation: -6, happiness: -4 } } },
      ] },
      { label: 'Partir sans un mot', outcomes: [{ text: 'Tu tournes les talons. On te trouve bizarre, et ça t’est égal.', tone: 'neutral', effects: { stats: { discipline: 5, reputation: -4, happiness: 1 } } }] },
    ],
  }),
  ev({
    id: 'tn_cheat_exam', kind: 'school', icon: '📝', title: 'Antisèche', weight: 34,
    cond: { minAge: 12, maxAge: 22, schoolStage: ['middle', 'high', 'university'] },
    text: 'Le contrôle de demain compte double et tu n’as rien révisé. Quelqu’un fait circuler les réponses.',
    choices: [
      { label: 'Copier', outcomes: [
        { weight: 3, text: 'Tu as 17. Personne ne remarque rien, et tu n’as rien appris.', tone: 'neutral', effects: { stats: { karma: -6, happiness: 4, intelligence: -1, discipline: -4 } } },
        { weight: 2, text: 'Le professeur voit tout depuis le début. Zéro et convocation.', tone: 'bad', effects: { stats: { karma: -8, reputation: -12, happiness: -12, discipline: -8 } } },
      ] },
      { label: 'Réviser toute la nuit', outcomes: [
        { weight: 3, text: 'Six heures de sommeil en moins, mais un 14 honnête.', tone: 'good', effects: { stats: { intelligence: 5, discipline: 8, health: -3, stress: 8 } } },
        { weight: 2, text: 'Tu t’endors sur ta copie. Le résultat est médiocre malgré l’effort.', tone: 'neutral', effects: { stats: { discipline: 5, health: -4, happiness: -4 } } },
      ] },
      { label: 'Y aller au hasard', outcomes: [{ text: 'Tu coches un peu partout. 6/20. Au moins c’est honnête.', tone: 'bad', effects: { stats: { happiness: -5, intelligence: -1 } } }] },
    ],
  }),
  ev({
    id: 'tn_driving', kind: 'life', icon: '🚗', title: 'Le permis', weight: 34,
    cond: { minAge: 17, maxAge: 24, lacksFlag: 'license' },
    text: 'Tu passes l’examen du permis de conduire. L’inspecteur ne sourit pas une seule fois.',
    choices: [
      { label: 'Conduire prudemment', outcomes: [
        { weight: 4, text: 'Créneau parfait, priorités respectées. Permis obtenu.', tone: 'good', effects: { stats: { happiness: 12, discipline: 4 }, flag: 'license' } },
        { weight: 2, text: 'Un stop mal marqué. Échec. Il faudra repasser.', tone: 'bad', effects: { stats: { happiness: -8, stress: 8 }, money: -900 } },
      ] },
      { label: 'Rouler avec assurance', outcomes: [
        { weight: 2, text: 'L’inspecteur apprécie ton aisance. Permis obtenu du premier coup.', tone: 'good', effects: { stats: { happiness: 14, reputation: 3 }, flag: 'license' } },
        { weight: 3, text: 'Excès de confiance, excès de vitesse. Recalé.', tone: 'bad', effects: { stats: { happiness: -10, discipline: -3 }, money: -900 } },
      ] },
    ],
  }),
  ev({
    id: 'tn_firstjob', kind: 'work', icon: '🧽', title: 'Premier vrai boulot', weight: 26,
    cond: { minAge: 15, maxAge: 19, hasJob: false },
    text: 'Le restaurant du coin cherche quelqu’un pour la plonge le samedi. Le patron ne pose qu’une question : « tu es dispo ? »',
    choices: [
      { label: 'Accepter', outcomes: [{ text: 'Huit heures debout, les mains dans l’eau grasse. Tu comprends la valeur d’un billet.', tone: 'good', effects: { stats: { discipline: 8, fitness: 3, happiness: -2 }, money: 1600 } }] },
      { label: 'Négocier les horaires', outcomes: [
        { weight: 2, text: 'Le patron accepte le dimanche à la place. Il te trouve du cran.', tone: 'good', effects: { stats: { discipline: 6, intelligence: 3 }, money: 1600 } },
        { weight: 3, text: 'Il prend quelqu’un d’autre. Le marché ne t’attendait pas.', tone: 'bad', effects: { stats: { happiness: -4 } } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tes samedis restent libres. C’est aussi une richesse.', tone: 'neutral', effects: { stats: { happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'tn_social_media', kind: 'random', icon: '📱', title: 'Un post qui décolle', weight: 30,
    cond: { minAge: 12, maxAge: 30 },
    text: 'Une vidéo que tu as postée sans y penser tourne beaucoup plus que prévu.',
    choices: [
      { label: 'Surfer sur la vague', outcomes: [
        { weight: 3, text: 'Tu enchaînes trois autres vidéos. L’audience suit.', tone: 'good', effects: { stats: { happiness: 8, reputation: 8, stress: 5 }, special: 'gainFollowers', specialArg: 4000 } },
        { weight: 2, text: 'La suite tombe à plat. Tu apprends la brutalité des algorithmes.', tone: 'neutral', effects: { stats: { happiness: -4, stress: 8 }, special: 'gainFollowers', specialArg: 400 } },
      ] },
      { label: 'Supprimer le post', outcomes: [{ text: 'Trop d’attention d’un coup. Tu coupes tout et tu respires.', tone: 'neutral', effects: { stats: { stress: -5, happiness: 2 } } }] },
      { label: 'Ne rien changer', outcomes: [{ text: 'Tu regardes les chiffres monter puis redescendre. C’était juste un moment.', tone: 'neutral', effects: { stats: { happiness: 4 }, special: 'gainFollowers', specialArg: 900 } }] },
    ],
  }),
  ev({
    id: 'tn_bad_crowd', kind: 'crime', icon: '🌃', title: 'Mauvaise fréquentation', weight: 26,
    cond: { minAge: 13, maxAge: 20 },
    text: 'Un groupe du quartier te propose de « faire un truc marrant » ce soir. Personne ne précise quoi.',
    choices: [
      { label: 'Les suivre', outcomes: [
        { weight: 2, text: 'Ce n’était rien de grave. Vous avez juste beaucoup ri.', tone: 'neutral', effects: { stats: { happiness: 6, reputation: 5, criminality: 4 } } },
        { weight: 2, text: 'Vous dégradez une voiture. Personne ne vous voit, mais tu ne dors pas bien.', tone: 'bad', effects: { stats: { karma: -8, criminality: 12, stress: 10 } } },
        { weight: 1, text: 'La police vous attrape. Tu passes la nuit au poste.', tone: 'bad', effects: { stats: { happiness: -14, reputation: -10, criminality: 8 }, special: 'arrest', specialArg: 'graffiti' } },
      ] },
      { label: 'Décliner poliment', outcomes: [{ text: 'Tu inventes une excuse crédible. On ne te repropose plus, ce qui n’est pas une perte.', tone: 'good', effects: { stats: { discipline: 6, karma: 3, reputation: -2 } } }] },
    ],
  }),
  ev({
    id: 'tn_sports_team', kind: 'life', icon: '🏆', title: 'La sélection', weight: 26,
    cond: { minAge: 12, maxAge: 20, minStat: { fitness: 40 } },
    text: 'L’équipe du lycée organise des essais. Une trentaine de candidats pour douze places.',
    choices: [
      { label: 'Tout donner', outcomes: [
        { weight: 3, text: 'Tu es pris. Les entraînements sont durs, l’ambiance excellente.', tone: 'good', effects: { stats: { fitness: 10, happiness: 8, discipline: 6, reputation: 7 }, special: 'newFriend' } },
        { weight: 2, text: 'Tu te déchires un muscle au dernier exercice.', tone: 'bad', effects: { stats: { fitness: -8, health: -6, happiness: -8 }, special: 'injury' } },
      ] },
      { label: 'Y aller sans pression', outcomes: [
        { weight: 2, text: 'Ta décontraction plaît au coach. Tu es remplaçant, puis titulaire.', tone: 'good', effects: { stats: { fitness: 7, happiness: 6, reputation: 4 } } },
        { weight: 3, text: 'Tu n’es pas retenu. Il y avait vraiment du niveau.', tone: 'neutral', effects: { stats: { happiness: -5, fitness: 2 } } },
      ] },
      { label: 'Ne pas y aller', outcomes: [{ text: 'Le sport collectif, ce n’est pas ton truc. Tu assumes.', tone: 'neutral', effects: { stats: { happiness: 1 } } }] },
    ],
  }),
  ev({
    id: 'tn_orientation', kind: 'school', icon: '🧭', title: 'Conseil d’orientation', weight: 28,
    cond: { minAge: 14, maxAge: 18, schoolStage: ['middle', 'high'] },
    text: 'La conseillère d’orientation te reçoit vingt minutes pour décider du reste de ta vie.',
    choices: [
      { label: 'Suivre son conseil', outcomes: [{ text: 'Tu notes tout consciencieusement. Ce n’est pas passionnant, mais c’est un cap.', tone: 'neutral', effects: { stats: { discipline: 5, intelligence: 3, happiness: -1 } } }] },
      { label: 'Défendre ton propre projet', outcomes: [
        { weight: 3, text: 'Elle te trouve déterminé et t’ouvre des portes auxquelles tu n’avais pas pensé.', tone: 'good', effects: { stats: { intelligence: 5, discipline: 4, happiness: 6, reputation: 3 } } },
        { weight: 2, text: 'Elle te décourage franchement. Tu sors énervé, mais plus motivé.', tone: 'neutral', effects: { stats: { happiness: -5, discipline: 6 } } },
      ] },
      { label: 'Répondre « je ne sais pas »', outcomes: [{ text: 'Elle coche « indécis » et passe au suivant. Personne n’a le temps ici.', tone: 'neutral', effects: { stats: { happiness: -3, discipline: -3 } } }] },
    ],
  }),
  ev({
    id: 'tn_alcohol', kind: 'health', icon: '🍻', title: 'Premier verre', weight: 30,
    cond: { minAge: 14, maxAge: 21 },
    text: 'Il y a une bouteille dans le parc et personne pour compter les verres.',
    choices: [
      { label: 'Boire raisonnablement', outcomes: [{ text: 'Deux verres, des rires, un retour tranquille. Rien de dramatique.', tone: 'neutral', effects: { stats: { happiness: 5, addiction: 4, health: -1 } } }] },
      { label: 'Ne pas se retenir', outcomes: [
        { weight: 3, text: 'La soirée est floue et le lendemain atroce. Tu jures de ne jamais recommencer.', tone: 'bad', effects: { stats: { health: -7, happiness: -4, addiction: 12, discipline: -5 } } },
        { weight: 1, text: 'Tu finis aux urgences. Tes parents apprennent tout.', tone: 'bad', effects: { stats: { health: -14, happiness: -14, addiction: 15, reputation: -10 }, money: -400 } },
      ] },
      { label: 'S’en tenir au soda', outcomes: [{ text: 'Tu ramènes trois personnes chez elles. On te doit une fière chandelle.', tone: 'good', effects: { stats: { karma: 8, discipline: 6, health: 1 } } }] },
    ],
  }),
  ev({
    id: 'tn_bodyimage', kind: 'health', icon: '🪞', title: 'Le miroir', weight: 26,
    cond: { minAge: 12, maxAge: 22 },
    text: 'Tu passes de plus en plus de temps devant le miroir, et de moins en moins content de ce que tu y vois.',
    choices: [
      { label: 'Se mettre au sport', outcomes: [{ text: 'Course trois fois par semaine. Le corps change, la tête aussi.', tone: 'good', effects: { stats: { fitness: 12, health: 6, looks: 4, happiness: 5, discipline: 6 } } }] },
      { label: 'Sauter des repas', outcomes: [
        { weight: 3, text: 'Tu perds du poids et beaucoup d’énergie. Ce n’est pas la bonne méthode.', tone: 'bad', effects: { stats: { health: -8, fitness: -6, happiness: -6, looks: -2 } } },
        { weight: 2, text: 'La spirale s’installe et devient un vrai trouble.', tone: 'bad', effects: { stats: { health: -10, happiness: -12 }, special: 'illness', specialArg: 'eating' } },
      ] },
      { label: 'En parler à quelqu’un', outcomes: [{ text: 'Mettre des mots dessus enlève déjà la moitié du poids.', tone: 'good', effects: { stats: { happiness: 8, stress: -10, health: 2 } } }] },
    ],
  }),
  ev({
    id: 'tn_prom', kind: 'love', icon: '💃', title: 'Le bal de fin d’année', weight: 24,
    cond: { minAge: 16, maxAge: 19 },
    text: 'La soirée de fin d’année approche. Tout le monde cherche un cavalier.',
    choices: [
      { label: 'Inviter quelqu’un', outcomes: [
        { weight: 3, text: 'On te dit oui. La soirée est exactement ce que tu espérais.', tone: 'good', effects: { stats: { happiness: 14, reputation: 8, looks: 2 }, money: -250 } },
        { weight: 2, text: 'Refus poli devant témoins. Tu y vas quand même, seul.', tone: 'bad', effects: { stats: { happiness: -10, reputation: -5 }, money: -250 } },
      ] },
      { label: 'Y aller entre amis', outcomes: [{ text: 'Sans pression, sans cavalier, et finalement la meilleure table de la salle.', tone: 'good', effects: { stats: { happiness: 10, reputation: 4 }, money: -180 } }] },
      { label: 'Ne pas y aller', outcomes: [{ text: 'Tu restes chez toi. Les photos passeront quand même dans ton fil.', tone: 'neutral', effects: { stats: { happiness: -6 } } }] },
    ],
  }),
  ev({
    id: 'tn_parttime_theft', kind: 'crime', icon: '💵', title: 'La caisse ouverte', weight: 18,
    cond: { minAge: 15, maxAge: 25, hasJob: true },
    text: 'Ton responsable a laissé la caisse ouverte et il est parti fumer. Il y a beaucoup de billets.',
    choices: [
      { label: 'Se servir', outcomes: [
        { weight: 2, text: 'Tu prends quelques billets. Personne ne compte jamais.', tone: 'neutral', effects: { stats: { karma: -12, criminality: 12, stress: 10 }, money: 400 } },
        { weight: 3, text: 'La caisse est comptée le soir même. Licenciement immédiat et plainte.', tone: 'bad', effects: { stats: { reputation: -14, karma: -12, happiness: -14 }, special: 'loseJob' } },
      ] },
      { label: 'Fermer la caisse', outcomes: [{ text: 'Tu la refermes et tu ne dis rien. Ton responsable s’en souvient.', tone: 'good', effects: { stats: { karma: 8, reputation: 6, discipline: 4 } } }] },
    ],
  }),
  ev({
    id: 'tn_online_argument', kind: 'random', icon: '💬', title: 'Dérapage en ligne', weight: 24,
    cond: { minAge: 13, maxAge: 40 },
    text: 'Une discussion en ligne s’envenime. Tu as un message cinglant tout prêt dans les doigts.',
    choices: [
      { label: 'Envoyer', outcomes: [
        { weight: 2, text: 'Le message fait mouche et tu as le dernier mot. Sensation grisante et courte.', tone: 'neutral', effects: { stats: { happiness: 3, karma: -4, stress: 4 } } },
        { weight: 3, text: 'Capture d’écran, partage massif. Ton nom circule mal.', tone: 'bad', effects: { stats: { reputation: -14, happiness: -10, stress: 14 }, special: 'loseFollowers', specialArg: 500 } },
      ] },
      { label: 'Fermer l’application', outcomes: [{ text: 'Tu poses le téléphone. Deux heures plus tard, tu ne te souviens même plus du sujet.', tone: 'good', effects: { stats: { stress: -6, discipline: 5, happiness: 2 } } }] },
    ],
  }),
  ev({
    id: 'tn_summer_job_abroad', kind: 'life', icon: '🌍', title: 'Un été ailleurs', weight: 18,
    cond: { minAge: 16, maxAge: 24 },
    text: 'On te propose un job d’été à l’étranger. Logement fourni, salaire modeste, langue inconnue.',
    choices: [
      { label: 'Partir', outcomes: [{ text: 'Trois mois qui changent ta façon de voir les choses. Et un peu d’argent en prime.', tone: 'good', effects: { stats: { intelligence: 7, happiness: 12, discipline: 5, reputation: 3 }, money: 2200 } }] },
      { label: 'Rester', outcomes: [{ text: 'Tu passes l’été chez toi. Reposant, prévisible.', tone: 'neutral', effects: { stats: { happiness: 2, health: 3 } } }] },
    ],
  }),
  ev({
    id: 'tn_music_band', kind: 'life', icon: '🎸', title: 'Monter un groupe', weight: 20,
    cond: { minAge: 13, maxAge: 25 },
    text: 'Des camarades cherchent quelqu’un pour compléter leur groupe. Le niveau général est douteux.',
    choices: [
      { label: 'Rejoindre le groupe', outcomes: [
        { weight: 3, text: 'Trois répétitions par semaine dans un garage humide. Vous êtes mauvais et heureux.', tone: 'good', effects: { stats: { happiness: 10, discipline: 4, reputation: 4 }, special: 'newFriend' } },
        { weight: 1, text: 'Vous jouez à la fête du lycée. La salle chante avec vous.', tone: 'good', effects: { stats: { happiness: 16, reputation: 14 }, special: 'gainFollowers', specialArg: 1500 } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tu passes ton tour. Ils trouveront quelqu’un d’autre.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'tn_exam_results', kind: 'school', icon: '📊', title: 'Résultats affichés', weight: 22,
    cond: { minAge: 15, maxAge: 19, schoolStage: ['high'] },
    text: 'Les résultats de fin d’année sont affichés dans le hall. Une foule compacte se presse devant le panneau.',
    choices: [
      { label: 'Aller voir tout de suite', outcomes: [{ text: 'Tu joues des coudes et tu trouves ton nom. Le soulagement ou la douche froide, mais tout de suite.', tone: 'neutral', effects: { stats: { stress: -4, discipline: 2 } } }] },
      { label: 'Attendre que ça se vide', outcomes: [{ text: 'Tu attends une heure sur un banc. La liste est la même, mais tu es plus calme.', tone: 'neutral', effects: { stats: { stress: 3, discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'tn_teacher_conflict', kind: 'school', icon: '🧑‍🏫', title: 'Conflit avec un professeur', weight: 26,
    cond: { minAge: 12, maxAge: 20, schoolStage: ['middle', 'high', 'university'] },
    text: 'Un professeur t’a mis une note que tu juges profondément injuste, devant toute la classe.',
    choices: [
      { label: 'Contester calmement après le cours', outcomes: [
        { weight: 3, text: 'Il revoit sa copie et remonte ta note d’un point. Surtout, il te respecte davantage.', tone: 'good', effects: { stats: { intelligence: 3, reputation: 5, discipline: 4 } } },
        { weight: 2, text: 'Il campe sur ses positions, mais reconnaît que tu as été correct.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: -2 } } },
      ] },
      { label: 'Protester devant la classe', outcomes: [
        { weight: 2, text: 'La classe est avec toi. Le professeur, beaucoup moins.', tone: 'neutral', effects: { stats: { reputation: 8, discipline: -6, happiness: 2 } } },
        { weight: 3, text: 'Exclusion de cours et mot dans le carnet.', tone: 'bad', effects: { stats: { discipline: -10, happiness: -8, reputation: -3 } } },
      ] },
      { label: 'Encaisser', outcomes: [{ text: 'Tu ranges ta copie sans un mot. Tu y penseras encore le soir.', tone: 'neutral', effects: { stats: { stress: 6, discipline: 2, happiness: -4 } } }] },
    ],
  }),
  ev({
    id: 'tn_scooter', kind: 'life', icon: '🛵', title: 'Un deux-roues d’occasion', weight: 20,
    cond: { minAge: 15, maxAge: 22, minMoney: 900 },
    text: 'Un voisin vend son scooter pour presque rien. Il ne démarre qu’une fois sur deux.',
    choices: [
      { label: 'L’acheter', requiresMoney: 900, outcomes: [
        { weight: 3, text: 'Tu passes tes week-ends à le réparer, et tes semaines à en être fier.', tone: 'good', effects: { stats: { happiness: 9, intelligence: 3, discipline: 3 }, money: -900 } },
        { weight: 2, text: 'Il rend l’âme au bout de trois mois. Argent perdu.', tone: 'bad', effects: { stats: { happiness: -8 }, money: -900 } },
      ] },
      { label: 'Passer son chemin', outcomes: [{ text: 'Tu continues à prendre le bus. Moins romantique, plus fiable.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'tn_sibling_secret', kind: 'family', icon: '🤐', title: 'Le secret', weight: 22,
    cond: { minAge: 12, maxAge: 25, hasSiblings: true }, target: ['brother', 'sister'],
    text: '{name} te confie un secret que vos parents ne doivent absolument pas connaître.',
    choices: [
      { label: 'Garder le secret', outcomes: [{ text: 'Tu tiens ta langue. {name} sait désormais qu’{il} peut compter sur toi.', tone: 'good', effects: { stats: { karma: 6, stress: 5 }, rel: 18, opinion: 16 } }] },
      { label: 'En parler aux parents', outcomes: [
        { weight: 3, text: 'Tes parents règlent la situation, mais {name} ne te fait plus confiance.', tone: 'bad', effects: { stats: { karma: 2, stress: -3 }, rel: -25, opinion: -22 } },
        { weight: 2, text: 'C’était grave, et ton intervention évite le pire. {name} finit par comprendre.', tone: 'good', effects: { stats: { karma: 10 }, rel: -8, opinion: -4 } },
      ] },
      { label: 'Faire chanter {name}', outcomes: [{ text: 'Tu monnayes ton silence. Efficace à court terme, catastrophique à long terme.', tone: 'bad', effects: { stats: { karma: -14, criminality: 6 }, money: 150, rel: -30, opinion: -30 } }] },
    ],
  }),
  ev({
    id: 'tn_graduation', kind: 'school', icon: '🎓', title: 'Dernier jour de lycée', weight: 20,
    cond: { minAge: 17, maxAge: 20, schoolStage: ['high'] },
    text: 'Dernier jour. Les couloirs paraissent plus petits que le premier jour.',
    choices: [
      { label: 'Faire le tour et dire au revoir', outcomes: [{ text: 'Tu passes voir chaque professeur. Deux d’entre eux te disent quelque chose que tu n’oublieras pas.', tone: 'good', effects: { stats: { happiness: 10, karma: 4, intelligence: 2 } } }] },
      { label: 'Partir sans se retourner', outcomes: [{ text: 'Tu franchis la grille et tu ne regardes pas derrière. Nouvelle page.', tone: 'neutral', effects: { stats: { happiness: 5, discipline: 3 } } }] },
    ],
  }),
];
