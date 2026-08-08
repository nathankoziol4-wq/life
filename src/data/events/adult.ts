/** Événements de la vie adulte (18-64 ans) : travail, argent, quotidien. */

import { ev, type GameEvent } from './types.ts';

export const ADULT_EVENTS: GameEvent[] = [
  ev({
    id: 'ad_toxic_boss', kind: 'work', icon: '😤', title: 'Un supérieur impossible', weight: 34,
    cond: { minAge: 18, hasJob: true },
    text: 'Ton responsable s’attribue publiquement un travail que tu as fait seul, pendant la réunion mensuelle.',
    choices: [
      { label: 'Le reprendre devant tout le monde', outcomes: [
        { weight: 2, text: 'Silence gêné, puis quelqu’un confirme ta version. Ton responsable ne te le pardonnera pas.', tone: 'neutral', effects: { stats: { reputation: 8, stress: 12, happiness: 3 } } },
        { weight: 3, text: 'Il retourne la situation contre toi. Tu passes pour le problème.', tone: 'bad', effects: { stats: { reputation: -10, stress: 16, happiness: -10 } } },
      ] },
      { label: 'En parler en privé', outcomes: [
        { weight: 3, text: 'Il s’excuse mollement mais rectifie dans un mail. C’est déjà ça.', tone: 'good', effects: { stats: { reputation: 4, discipline: 4, stress: -3 } } },
        { weight: 2, text: 'Il nie en bloc. Au moins tu sais à qui tu as affaire.', tone: 'neutral', effects: { stats: { stress: 8, happiness: -5 } } },
      ] },
      { label: 'Encaisser et documenter', outcomes: [{ text: 'Tu archives tout dans un dossier. Un jour, ça servira.', tone: 'neutral', effects: { stats: { discipline: 7, stress: 8, intelligence: 3 } } }] },
      { label: 'Démissionner sur-le-champ', outcomes: [{ text: 'Tu poses ton badge sur la table et tu sors. Grandiose, et financièrement discutable.', tone: 'bad', effects: { stats: { happiness: 6, stress: 14, reputation: -4 }, special: 'loseJob' } }] },
    ],
  }),
  ev({
    id: 'ad_headhunter', kind: 'work', icon: '📞', title: 'Un chasseur de têtes', weight: 26,
    cond: { minAge: 22, hasJob: true, minStat: { reputation: 45 } },
    text: 'Un recruteur t’appelle. Le poste est ailleurs, le salaire est meilleur, et il faut répondre vite.',
    choices: [
      { label: 'Écouter la proposition', outcomes: [
        { weight: 3, text: 'L’offre est sérieuse. Tu la gardes sous le coude — et tu l’utilises pour négocier chez toi.', tone: 'good', effects: { stats: { intelligence: 3, reputation: 3 }, special: 'jobOffer' } },
        { weight: 2, text: 'C’était creux. Tu as perdu une heure.', tone: 'neutral', effects: { stats: { stress: 3 } } },
      ] },
      { label: 'Raccrocher', outcomes: [{ text: 'Tu es bien là où tu es. Ou du moins tu le décides.', tone: 'neutral', effects: { stats: { discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'ad_burnout_warning', kind: 'health', icon: '🕯️', title: 'Le voyant rouge', weight: 30,
    cond: { minAge: 22, hasJob: true, minStat: { stress: 65 } },
    text: 'Tu t’endors dans les transports, tu oublies des rendez-vous, tu n’as plus envie de rien. Ton corps envoie des signaux clairs.',
    choices: [
      { label: 'Prendre un arrêt', outcomes: [{ text: 'Trois semaines de vide total. Tu ne savais plus ce que c’était.', tone: 'good', effects: { stats: { stress: -30, health: 8, happiness: 10 }, moneyPct: -0.03 } }] },
      { label: 'Réduire la voilure', outcomes: [{ text: 'Tu apprends à dire non. C’est une compétence, et elle s’acquiert tard.', tone: 'good', effects: { stats: { stress: -18, happiness: 6, discipline: 4 } } }] },
      { label: 'Tenir bon', outcomes: [
        { weight: 2, text: 'Tu serres les dents. Ça passe, provisoirement.', tone: 'neutral', effects: { stats: { stress: 8, health: -5, discipline: 4 } } },
        { weight: 3, text: 'Le mur arrive plus vite que prévu.', tone: 'bad', effects: { stats: { health: -12, happiness: -14 }, special: 'illness', specialArg: 'burnout' } },
      ] },
    ],
  }),
  ev({
    id: 'ad_investment_pitch', kind: 'money', icon: '📈', title: 'Une occasion en or', weight: 30,
    cond: { minAge: 20, minMoney: 5000 },
    text: 'Une connaissance te propose d’investir dans un projet « qui ne peut pas échouer ». Les chiffres sont beaux et flous.',
    choices: [
      { label: 'Investir gros', requiresMoney: 5000, outcomes: [
        { weight: 2, text: 'Le projet décolle. Ton investissement triple.', tone: 'good', effects: { moneyPct: 0.6, stats: { happiness: 14, reputation: 5 } } },
        { weight: 4, text: 'Le projet s’effondre en dix-huit mois. Il ne reste rien.', tone: 'bad', effects: { moneyPct: -0.35, stats: { happiness: -14, stress: 14 } } },
      ] },
      { label: 'Investir un petit montant', requiresMoney: 1000, outcomes: [
        { weight: 2, text: 'Bénéfice modeste, mais réel.', tone: 'good', effects: { moneyPct: 0.12, stats: { happiness: 6, intelligence: 2 } } },
        { weight: 3, text: 'Perdu, mais tu avais limité la casse.', tone: 'neutral', effects: { moneyPct: -0.08, stats: { intelligence: 4, happiness: -3 } } },
      ] },
      { label: 'Demander à voir les comptes', outcomes: [
        { weight: 3, text: 'Il n’y a pas de comptes. Tu comprends tout de suite et tu passes ton tour.', tone: 'good', effects: { stats: { intelligence: 6, discipline: 5 } } },
        { weight: 1, text: 'Les comptes sont solides. Tu investis en confiance et ça paie.', tone: 'good', effects: { moneyPct: 0.25, stats: { intelligence: 6, happiness: 8 } } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Merci, sans façon.', tone: 'neutral', effects: { stats: { discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'ad_tax_letter', kind: 'money', icon: '📩', title: 'Un courrier de l’administration', weight: 26,
    cond: { minAge: 20, minMoney: 2000 },
    text: 'Une lettre officielle t’annonce un contrôle sur tes deux dernières déclarations.',
    choices: [
      { label: 'Fournir tous les justificatifs', outcomes: [
        { weight: 4, text: 'Tout est en règle. Le dossier est clos en trois semaines.', tone: 'good', effects: { stats: { stress: 10, discipline: 5 } } },
        { weight: 2, text: 'Une erreur de bonne foi est relevée. Régularisation à payer.', tone: 'bad', effects: { moneyPct: -0.06, stats: { stress: 14 } } },
      ] },
      { label: 'Prendre un comptable', requiresMoney: 1500, outcomes: [{ text: 'Il démêle tout et trouve même un trop-perçu en ta faveur.', tone: 'good', effects: { money: -1500, moneyPct: 0.04, stats: { stress: 4, intelligence: 3 } } }] },
      { label: 'Ignorer le courrier', outcomes: [{ text: 'Le deuxième courrier est recommandé, et beaucoup moins aimable. Majorations.', tone: 'bad', effects: { moneyPct: -0.14, stats: { stress: 20, karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ad_neighbour', kind: 'random', icon: '🔊', title: 'Le voisin du dessus', weight: 28,
    cond: { minAge: 18 },
    text: 'Depuis un mois, le voisin du dessus déplace des meubles toutes les nuits. Du moins, ça y ressemble.',
    choices: [
      { label: 'Monter lui parler', outcomes: [
        { weight: 3, text: 'Il ne se rendait compte de rien. Le bruit cesse. Vous vous saluez désormais.', tone: 'good', effects: { stats: { happiness: 6, stress: -8, karma: 2 } } },
        { weight: 2, text: 'La conversation dégénère. L’ambiance de l’immeuble est durablement pourrie.', tone: 'bad', effects: { stats: { happiness: -8, stress: 12 } } },
      ] },
      { label: 'Déposer une plainte', outcomes: [{ text: 'La procédure est longue. Le bruit finit par cesser, la relation aussi.', tone: 'neutral', effects: { stats: { stress: 6, happiness: -2 } } }] },
      { label: 'Investir dans des bouchons d’oreille', outcomes: [{ text: 'Six euros et le problème est réglé. Enfin, contourné.', tone: 'neutral', effects: { money: -20, stats: { stress: -4 } } }] },
    ],
  }),
  ev({
    id: 'ad_car_accident', kind: 'health', icon: '💥', title: 'Accident de la route', weight: 20,
    cond: { minAge: 18, hasVehicle: true },
    text: 'Un carrefour, une voiture qui ne freine pas. Le choc est violent.',
    choices: [
      { label: 'Appeler les secours et rester', outcomes: [
        { weight: 3, text: 'Contusions et beaucoup de paperasse. Le constat joue en ta faveur.', tone: 'bad', effects: { stats: { health: -10, stress: 16, happiness: -8 }, special: 'vehicleDamage' } },
        { weight: 2, text: 'Blessure sérieuse. Plusieurs semaines d’immobilisation.', tone: 'bad', effects: { stats: { health: -20, fitness: -12 }, special: 'injury' } },
      ] },
      { label: 'Partir avant l’arrivée de la police', outcomes: [
        { weight: 2, text: 'Personne ne t’a vu. Tu répares en douce, mais tu y penses souvent.', tone: 'neutral', effects: { stats: { karma: -14, stress: 16, criminality: 8 }, special: 'vehicleDamage' } },
        { weight: 3, text: 'Une caméra a tout filmé. Délit de fuite.', tone: 'bad', effects: { stats: { karma: -16 }, special: 'arrest', specialArg: 'cartheft' } },
      ] },
    ],
  }),
  ev({
    id: 'ad_wallet', kind: 'random', icon: '👛', title: 'Un portefeuille par terre', weight: 30,
    cond: { minAge: 10 },
    text: 'Un portefeuille bien rempli traîne sur le trottoir. Aucun témoin.',
    choices: [
      { label: 'Le rapporter à son propriétaire', outcomes: [
        { weight: 3, text: 'Le propriétaire est immensément soulagé et t’offre une récompense.', tone: 'good', effects: { stats: { karma: 14, happiness: 8, reputation: 4 }, money: 120 } },
        { weight: 2, text: 'Tu le déposes au commissariat sans rien attendre. C’est déjà bien.', tone: 'good', effects: { stats: { karma: 12, happiness: 5 } } },
      ] },
      { label: 'Prendre l’argent et laisser le reste', outcomes: [{ text: 'Tu empoches les billets et abandonnes le portefeuille sur une boîte aux lettres.', tone: 'neutral', effects: { stats: { karma: -10, criminality: 6, happiness: 2 }, money: 260 } }] },
      { label: 'Passer son chemin', outcomes: [{ text: 'Ce n’est pas ton problème. Quelqu’un d’autre s’en occupera.', tone: 'neutral', effects: { stats: { karma: -2 } } }] },
    ],
  }),
  ev({
    id: 'ad_old_friend', kind: 'random', icon: '☕', title: 'Une vieille connaissance', weight: 28,
    cond: { minAge: 22 },
    text: 'Tu croises quelqu’un que tu n’as pas vu depuis dix ans, au milieu d’une rue passante.',
    choices: [
      { label: 'Aller boire un café', outcomes: [
        { weight: 3, text: 'Deux heures plus tard, vous êtes encore là. Vous vous promettez de vous revoir, et cette fois c’est vrai.', tone: 'good', effects: { stats: { happiness: 10, stress: -6 }, special: 'newFriend' } },
        { weight: 2, text: 'La conversation tourne à vide au bout de dix minutes. Les gens changent.', tone: 'neutral', effects: { stats: { happiness: -2 } } },
      ] },
      { label: 'Faire semblant de ne pas voir', outcomes: [{ text: 'Tu traverses la rue. Tu ne sauras jamais ce que cette conversation aurait donné.', tone: 'neutral', effects: { stats: { happiness: -3, karma: -2 } } }] },
    ],
  }),
  ev({
    id: 'ad_promotion_offer', kind: 'work', icon: '📈', title: 'Un poste se libère', weight: 26,
    cond: { minAge: 22, hasJob: true, minStat: { discipline: 40 } },
    text: 'Un poste au-dessus du tien se libère. Ta candidature serait crédible, et un collègue vise la même place.',
    choices: [
      { label: 'Postuler franchement', outcomes: [
        { weight: 3, text: 'Ton dossier est solide et ton entretien excellent. C’est pour toi.', tone: 'good', effects: { stats: { happiness: 14, reputation: 8, stress: 8 }, special: 'promotion' } },
        { weight: 3, text: 'Ton collègue est retenu. Tu encaisses.', tone: 'bad', effects: { stats: { happiness: -8, stress: 8 } } },
      ] },
      { label: 'Discréditer le collègue', outcomes: [
        { weight: 2, text: 'La rumeur fait son effet. Tu obtiens le poste, avec un goût amer.', tone: 'neutral', effects: { stats: { karma: -18, happiness: 6, reputation: 3 }, special: 'promotion' } },
        { weight: 3, text: 'On remonte jusqu’à toi. La direction n’aime pas ça du tout.', tone: 'bad', effects: { stats: { karma: -16, reputation: -18, happiness: -12 } } },
      ] },
      { label: 'Ne pas postuler', outcomes: [{ text: 'Tu laisses passer. Ce n’était peut-être pas le bon moment.', tone: 'neutral', effects: { stats: { stress: -5 } } }] },
    ],
  }),
  ev({
    id: 'ad_startup', kind: 'money', icon: '🚀', title: 'Se lancer à son compte', weight: 20,
    cond: { minAge: 22, maxAge: 60, minMoney: 8000 },
    text: 'Tu as une idée depuis des mois. Il faudrait quitter la sécurité du salaire et y mettre tes économies.',
    choices: [
      { label: 'Se lancer à plein temps', requiresMoney: 8000, outcomes: [
        { weight: 2, text: 'Après dix-huit mois difficiles, ça décolle vraiment.', tone: 'good', effects: { moneyPct: 1.2, stats: { happiness: 18, reputation: 12, stress: 14 } } },
        { weight: 4, text: 'Tu brûles tes économies en un an. Retour à la case départ, avec de l’expérience.', tone: 'bad', effects: { moneyPct: -0.7, stats: { happiness: -14, stress: 20, intelligence: 6 }, special: 'loseJob' } },
      ] },
      { label: 'Le faire le soir et le week-end', outcomes: [
        { weight: 3, text: 'Croissance lente mais réelle. Tu dors peu.', tone: 'good', effects: { money: 4200, stats: { stress: 14, health: -4, discipline: 8, happiness: 5 } } },
        { weight: 2, text: 'Le projet stagne, et ta fatigue s’accumule.', tone: 'neutral', effects: { money: -900, stats: { stress: 16, health: -6, happiness: -4 } } },
      ] },
      { label: 'Renoncer', outcomes: [{ text: 'Tu ranges le carnet dans un tiroir. Il y restera longtemps.', tone: 'neutral', effects: { stats: { happiness: -4, stress: -6 } } }] },
    ],
  }),
  ev({
    id: 'ad_charity', kind: 'money', icon: '🤲', title: 'Une collecte', weight: 24,
    cond: { minAge: 16, minMoney: 500 },
    text: 'Une association locale récolte des fonds pour une famille du quartier qui a tout perdu dans un incendie.',
    choices: [
      { label: 'Donner généreusement', requiresMoney: 500, outcomes: [{ text: 'Ton don change concrètement leur situation. On te remercie longuement.', tone: 'good', effects: { moneyPct: -0.05, stats: { karma: 18, happiness: 10, reputation: 6 } } }] },
      { label: 'Donner un peu', outcomes: [{ text: 'Chaque euro compte, et tu le sais.', tone: 'good', effects: { money: -60, stats: { karma: 7, happiness: 4 } } }] },
      { label: 'Donner de son temps', outcomes: [{ text: 'Tu passes trois week-ends à trier des dons. Plus fatigant et plus utile que de l’argent.', tone: 'good', effects: { stats: { karma: 14, happiness: 8, fitness: 2, reputation: 5 }, special: 'newFriend' } }] },
      { label: 'Passer', outcomes: [{ text: 'Tu détournes le regard devant le stand.', tone: 'neutral', effects: { stats: { karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ad_lawsuit', kind: 'justice', icon: '📜', title: 'Une mise en demeure', weight: 18,
    cond: { minAge: 22, minMoney: 3000 },
    text: 'Tu reçois une mise en demeure : quelqu’un te réclame une somme importante pour un litige que tu croyais réglé.',
    choices: [
      { label: 'Prendre un avocat', requiresMoney: 3000, outcomes: [
        { weight: 3, text: 'L’affaire est classée sans suite. Les honoraires piquent quand même.', tone: 'good', effects: { money: -3000, stats: { stress: 12, intelligence: 3 } } },
        { weight: 2, text: 'Tu perds, mais l’indemnité est fortement réduite.', tone: 'bad', effects: { money: -3000, moneyPct: -0.08, stats: { stress: 18, happiness: -8 } } },
      ] },
      { label: 'Négocier directement', outcomes: [
        { weight: 3, text: 'Vous trouvez un arrangement à l’amiable, pour bien moins cher.', tone: 'good', effects: { moneyPct: -0.04, stats: { intelligence: 5, stress: 6 } } },
        { weight: 2, text: 'La discussion échoue et le montant réclamé augmente.', tone: 'bad', effects: { moneyPct: -0.15, stats: { stress: 18, happiness: -10 } } },
      ] },
      { label: 'Ignorer', outcomes: [{ text: 'La procédure suit son cours sans toi. Le jugement est sans appel.', tone: 'bad', effects: { moneyPct: -0.22, stats: { stress: 22, happiness: -12, karma: -3 } } }] },
    ],
  }),
  ev({
    id: 'ad_gym_membership', kind: 'health', icon: '🏋️', title: 'Bonne résolution', weight: 26,
    cond: { minAge: 18, maxStat: { fitness: 60 } },
    text: 'Une salle de sport ouvre en bas de chez toi, avec une offre de lancement imbattable.',
    choices: [
      { label: 'S’abonner et y aller', outcomes: [
        { weight: 3, text: 'Tu tiens le rythme toute l’année. Ton corps te remercie.', tone: 'good', effects: { money: -420, stats: { fitness: 14, health: 8, looks: 4, discipline: 6, happiness: 5 } } },
        { weight: 3, text: 'Trois séances en janvier, plus rien ensuite. L’abonnement, lui, continue.', tone: 'bad', effects: { money: -420, stats: { fitness: 2, happiness: -4, discipline: -3 } } },
      ] },
      { label: 'Courir dehors gratuitement', outcomes: [
        { weight: 3, text: 'Pas d’abonnement, pas d’excuse. Tu cours trois fois par semaine.', tone: 'good', effects: { stats: { fitness: 10, health: 5, discipline: 5, happiness: 3 } } },
        { weight: 2, text: 'Il pleut. Puis il fait froid. Puis c’est l’été et il fait trop chaud.', tone: 'neutral', effects: { stats: { fitness: 2 } } },
      ] },
      { label: 'Rester sur le canapé', outcomes: [{ text: 'Le canapé ne juge pas.', tone: 'neutral', effects: { stats: { fitness: -3, happiness: 2 } } }] },
    ],
  }),
  ev({
    id: 'ad_inheritance_letter', kind: 'money', icon: '📜', title: 'Un notaire vous écrit', weight: 12,
    cond: { minAge: 22 }, once: true,
    text: 'Un notaire vous informe qu’un parent éloigné, dont vous n’aviez presque jamais entendu parler, vous a couché sur son testament.',
    choices: [
      { label: 'Accepter la succession', outcomes: [
        { weight: 3, text: 'La somme est modeste mais bienvenue.', tone: 'good', effects: { special: 'smallInheritance', stats: { happiness: 8 } } },
        { weight: 1, text: 'La succession comporte surtout des dettes. Heureusement, tu peux encore refuser.', tone: 'neutral', effects: { stats: { intelligence: 4, happiness: -3 } } },
      ] },
      { label: 'Refuser par principe', outcomes: [{ text: 'Tu ne veux rien devoir à cette branche de la famille. Le dossier se referme.', tone: 'neutral', effects: { stats: { karma: 4, discipline: 4 } } }] },
    ],
  }),
  ev({
    id: 'ad_burglary_victim', kind: 'crime', icon: '🚪', title: 'Cambriolage', weight: 18,
    cond: { minAge: 18, minMoney: 3000 },
    text: 'Tu rentres chez toi et la porte est entrouverte. À l’intérieur, tout a été retourné.',
    choices: [
      { label: 'Appeler la police', outcomes: [
        { weight: 3, text: 'Constat, assurance, remboursement partiel. Le sentiment d’intrusion, lui, reste.', tone: 'bad', effects: { moneyPct: -0.06, stats: { stress: 18, happiness: -12 } } },
        { weight: 1, text: 'Les voleurs sont identifiés grâce à une caméra. Tout est restitué.', tone: 'neutral', effects: { stats: { stress: 10, happiness: -4, karma: 2 } } },
      ] },
      { label: 'Faire l’inventaire d’abord', outcomes: [{ text: 'Tu constates l’étendue des dégâts avant d’appeler. L’assurance apprécie ta liste détaillée.', tone: 'neutral', effects: { moneyPct: -0.03, stats: { stress: 16, discipline: 4, happiness: -10 } } }] },
    ],
  }),
  ev({
    id: 'ad_lottery_ticket', kind: 'money', icon: '🎫', title: 'Le ticket oublié', weight: 16,
    cond: { minAge: 18 },
    text: 'Tu retrouves un ticket de loterie froissé dans la poche d’un vieux manteau. Le tirage date de trois semaines.',
    choices: [
      { label: 'Vérifier les numéros', outcomes: [
        { weight: 12, text: 'Rien. Évidemment.', tone: 'neutral', effects: { stats: { happiness: -2 } } },
        { weight: 4, text: 'Deux numéros. De quoi payer un bon repas.', tone: 'good', effects: { money: 90, stats: { happiness: 4 } } },
        { weight: 1, text: 'Quatre numéros ! Un gain sérieux et totalement inattendu.', tone: 'good', effects: { money: 24000, stats: { happiness: 22 } } },
      ] },
      { label: 'Le jeter', outcomes: [{ text: 'Tu le jettes sans regarder. Tu ne sauras jamais.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'ad_colleague_help', kind: 'work', icon: '🤝', title: 'Un collègue en difficulté', weight: 26,
    cond: { minAge: 20, hasJob: true },
    text: 'Un collègue s’effondre discrètement : sa charge de travail est ingérable et il n’ose rien dire.',
    choices: [
      { label: 'Reprendre une partie de son travail', outcomes: [{ text: 'Tu doubles ta charge pendant un mois. Il ne l’oubliera jamais.', tone: 'good', effects: { stats: { karma: 14, stress: 14, reputation: 6, happiness: 3 }, special: 'newFriend' } }] },
      { label: 'Alerter la hiérarchie', outcomes: [
        { weight: 3, text: 'Un renfort est recruté. Le collègue respire.', tone: 'good', effects: { stats: { karma: 10, reputation: 7 } } },
        { weight: 2, text: 'La hiérarchie s’en prend à lui. Tu as aggravé les choses sans le vouloir.', tone: 'bad', effects: { stats: { karma: -3, happiness: -8, stress: 8 } } },
      ] },
      { label: 'Ne pas s’en mêler', outcomes: [{ text: 'Chacun ses problèmes. Il craque trois semaines plus tard.', tone: 'neutral', effects: { stats: { karma: -6, happiness: -3 } } }] },
    ],
  }),
  ev({
    id: 'ad_house_leak', kind: 'asset', icon: '💧', title: 'Une fuite', weight: 24,
    cond: { minAge: 18, hasProperty: true },
    text: 'Une tache brune s’étale au plafond depuis trois jours et grandit à vue d’œil.',
    choices: [
      { label: 'Appeler un professionnel', outcomes: [{ text: 'La fuite est colmatée avant le pire. La facture est raisonnable.', tone: 'neutral', effects: { money: -1400, stats: { stress: 6 } } }] },
      { label: 'Réparer soi-même', outcomes: [
        { weight: 2, text: 'Trois tutoriels et un week-end plus tard : c’est réparé, et ça t’a coûté 40 €.', tone: 'good', effects: { money: -40, stats: { intelligence: 4, happiness: 6, discipline: 3 } } },
        { weight: 3, text: 'Tu aggraves la fuite. Le professionnel facture le double.', tone: 'bad', effects: { money: -3200, stats: { stress: 14, happiness: -8 }, special: 'propertyDamage' } },
      ] },
      { label: 'Attendre', outcomes: [{ text: 'Le plafond de la pièce du dessous finit par céder.', tone: 'bad', effects: { money: -6500, stats: { stress: 20, happiness: -12 }, special: 'propertyDamage' } }] },
    ],
  }),
  ev({
    id: 'ad_midlife', kind: 'life', icon: '🌀', title: 'Un doute', weight: 24,
    cond: { minAge: 38, maxAge: 55 }, once: true,
    text: 'Un matin, en te rasant ou en te maquillant, tu te demandes très sérieusement ce que tu fabriques de ta vie.',
    choices: [
      { label: 'Tout changer', outcomes: [
        { weight: 2, text: 'Nouveau métier, nouvelle ville, nouveau rythme. C’était le bon moment.', tone: 'good', effects: { stats: { happiness: 18, stress: 12, intelligence: 4 }, special: 'loseJob' } },
        { weight: 3, text: 'Tu casses tout et tu regrettes six mois plus tard.', tone: 'bad', effects: { stats: { happiness: -12, stress: 18 }, special: 'loseJob', moneyPct: -0.15 } },
      ] },
      { label: 'Acheter quelque chose d’extravagant', requiresMoney: 15000, outcomes: [{ text: 'Un objet cher et parfaitement inutile. Le plaisir dure trois semaines.', tone: 'neutral', effects: { money: -15000, stats: { happiness: 8, reputation: 3 } } }] },
      { label: 'En parler à un professionnel', outcomes: [{ text: 'Quelques séances suffisent à remettre les choses en perspective.', tone: 'good', effects: { money: -600, stats: { happiness: 12, stress: -14, intelligence: 3 } } }] },
      { label: 'Continuer comme avant', outcomes: [{ text: 'Tu ranges la question dans le même tiroir que les autres.', tone: 'neutral', effects: { stats: { happiness: -4, stress: 5 } } }] },
    ],
  }),
  ev({
    id: 'ad_reunion', kind: 'random', icon: '🥂', title: 'Retrouvailles de promotion', weight: 20,
    cond: { minAge: 30, maxAge: 60 },
    text: 'Vingt ans après, ta promotion organise des retrouvailles. Tout le monde veut savoir ce que sont devenus les autres.',
    choices: [
      { label: 'Y aller', outcomes: [
        { weight: 3, text: 'Soirée étonnamment agréable. Certains ont beaucoup changé, d’autres pas du tout.', tone: 'good', effects: { stats: { happiness: 9, reputation: 4 }, special: 'newFriend', money: -80 } },
        { weight: 2, text: 'Trois heures de comparaison sociale déguisée. Tu repars vidé.', tone: 'bad', effects: { stats: { happiness: -8, stress: 8 }, money: -80 } },
      ] },
      { label: 'Décliner', outcomes: [{ text: 'Tu ne réponds même pas à l’invitation.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'ad_pet_sick', kind: 'family', icon: '🐕', title: 'L’animal ne va pas bien', weight: 26,
    cond: { minAge: 8, hasPet: true },
    text: 'Ton animal ne mange plus depuis trois jours et reste couché dans un coin.',
    choices: [
      { label: 'Aller chez le vétérinaire', outcomes: [
        { weight: 4, text: 'Traitement, quelques centaines d’euros, et le voilà de nouveau sur pattes.', tone: 'good', effects: { money: -450, stats: { happiness: 6, karma: 5 } } },
        { weight: 2, text: 'Le diagnostic est mauvais. Il faut le laisser partir.', tone: 'bad', effects: { money: -300, stats: { happiness: -20, stress: 12 }, special: 'petDeath' } },
      ] },
      { label: 'Attendre de voir', outcomes: [
        { weight: 2, text: 'Il se remet tout seul au bout d’une semaine.', tone: 'neutral', effects: { stats: { happiness: 2, stress: 8 } } },
        { weight: 3, text: 'Ça empire, et il est trop tard quand tu te décides.', tone: 'bad', effects: { stats: { happiness: -25, karma: -8, stress: 16 }, special: 'petDeath' } },
      ] },
    ],
  }),
  ev({
    id: 'ad_promotion_relocate', kind: 'work', icon: '✈️', title: 'Mutation à l’étranger', weight: 16,
    cond: { minAge: 24, hasJob: true, minStat: { reputation: 50 } },
    text: 'Ton entreprise te propose un poste à l’étranger, avec une belle augmentation. Il faudrait tout laisser ici.',
    choices: [
      { label: 'Accepter', outcomes: [{ text: 'Nouvelle ville, nouvelle langue, nouveau salaire. L’adaptation est rude mais la trajectoire s’accélère.', tone: 'good', effects: { stats: { happiness: 6, stress: 16, intelligence: 6, reputation: 8 }, special: 'promotion' } }] },
      { label: 'Refuser', outcomes: [{ text: 'Tu restes. On te le rappellera à la prochaine évaluation.', tone: 'neutral', effects: { stats: { happiness: 3, reputation: -5 } } }] },
    ],
  }),
  ev({
    id: 'ad_gambling_temptation', kind: 'money', icon: '🎰', title: 'Une soirée au casino', weight: 22,
    cond: { minAge: 18, minMoney: 1000 },
    text: 'Des amis t’emmènent au casino. Tu as gagné trois fois de suite et la table te sourit.',
    choices: [
      { label: 'Partir maintenant', outcomes: [{ text: 'Tu ramasses tes jetons et tu sors. Rarissime et très intelligent.', tone: 'good', effects: { money: 900, stats: { discipline: 10, happiness: 8 } } }] },
      { label: 'Continuer', outcomes: [
        { weight: 2, text: 'La chance tient. Tu repars avec une jolie somme.', tone: 'good', effects: { money: 3400, stats: { happiness: 12, addiction: 12 } } },
        { weight: 4, text: 'Tu rends tout, puis un peu plus.', tone: 'bad', effects: { moneyPct: -0.25, stats: { happiness: -12, addiction: 16, stress: 12 } } },
      ] },
      { label: 'Tout miser sur un coup', outcomes: [
        { weight: 1, text: 'Le numéro sort. Tout le casino se retourne.', tone: 'good', effects: { moneyPct: 4, stats: { happiness: 25, addiction: 22, reputation: 6 } } },
        { weight: 8, text: 'Le numéro ne sort pas. Évidemment.', tone: 'bad', effects: { moneyPct: -0.5, stats: { happiness: -18, addiction: 18, stress: 18 } } },
      ] },
    ],
  }),
  ev({
    id: 'ad_scam_call', kind: 'money', icon: '☎️', title: 'Un appel suspect', weight: 26,
    cond: { minAge: 20 },
    text: 'Quelqu’un t’appelle en se présentant comme ta banque. Il connaît ton nom, ton adresse, et il est très pressé.',
    choices: [
      { label: 'Raccrocher et rappeler la banque', outcomes: [{ text: 'La banque confirme : c’était une tentative d’escroquerie. Bien joué.', tone: 'good', effects: { stats: { intelligence: 5, discipline: 4 } } }] },
      { label: 'Donner les informations demandées', outcomes: [
        { weight: 4, text: 'Ton compte est vidé dans l’heure. La banque n’en rembourse qu’une partie.', tone: 'bad', effects: { moneyPct: -0.3, stats: { happiness: -16, stress: 20, intelligence: -1 } } },
        { weight: 1, text: 'Ta banque bloque l’opération de justesse.', tone: 'neutral', effects: { stats: { stress: 16, intelligence: 3 } } },
      ] },
      { label: 'Faire perdre son temps à l’escroc', outcomes: [{ text: 'Vingt minutes de conversation absurde. Il finit par raccrocher, furieux.', tone: 'good', effects: { stats: { happiness: 7, intelligence: 3, karma: 3 } } }] },
    ],
  }),
  ev({
    id: 'ad_volunteer_abroad', kind: 'life', icon: '🌍', title: 'Mission humanitaire', weight: 14,
    cond: { minAge: 20, maxAge: 60, minMoney: 2000 },
    text: 'Une association cherche des volontaires pour six mois de mission à l’étranger. C’est mal payé et très exigeant.',
    choices: [
      { label: 'Partir', requiresMoney: 2000, outcomes: [{ text: 'Six mois qui recalibrent complètement ton échelle de valeurs.', tone: 'good', effects: { money: -2000, stats: { karma: 22, happiness: 14, intelligence: 6, health: -4, fitness: 4 } } }] },
      { label: 'Donner à la place', outcomes: [{ text: 'Un virement, et tu retournes à ta vie.', tone: 'neutral', effects: { money: -400, stats: { karma: 6 } } }] },
      { label: 'Ne rien faire', outcomes: [{ text: 'Tu fermes l’onglet.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'ad_stolen_idea', kind: 'work', icon: '💡', title: 'Une idée volée', weight: 20,
    cond: { minAge: 22, hasJob: true },
    text: 'Une entreprise concurrente lance exactement le produit que tu avais proposé en interne il y a deux ans.',
    choices: [
      { label: 'Le faire savoir en interne', outcomes: [
        { weight: 3, text: 'La direction réalise son erreur et te confie un projet à toi.', tone: 'good', effects: { stats: { reputation: 10, happiness: 8 }, special: 'promotion' } },
        { weight: 2, text: 'On te répond que « ce n’est pas le sujet ». Sujet clos.', tone: 'bad', effects: { stats: { happiness: -8, stress: 10 } } },
      ] },
      { label: 'Postuler chez le concurrent', outcomes: [
        { weight: 3, text: 'Ils comprennent immédiatement ta valeur. Nouveau poste, meilleur salaire.', tone: 'good', effects: { stats: { happiness: 12, reputation: 6 }, special: 'jobOffer' } },
        { weight: 2, text: 'Pas de réponse. Tu restes où tu es, un peu amer.', tone: 'neutral', effects: { stats: { happiness: -5 } } },
      ] },
      { label: 'Laisser tomber', outcomes: [{ text: 'Tu apprends que les idées sans exécution ne valent pas grand-chose.', tone: 'neutral', effects: { stats: { intelligence: 4, happiness: -3 } } }] },
    ],
  }),
  ev({
    id: 'ad_health_checkup', kind: 'health', icon: '🩺', title: 'Bilan de santé', weight: 26,
    cond: { minAge: 35 },
    text: 'Ton médecin insiste pour un bilan complet. Tu repousses depuis deux ans.',
    choices: [
      { label: 'Faire le bilan', outcomes: [
        { weight: 3, text: 'Tout est normal. Le soulagement vaut le prix de la prise de sang.', tone: 'good', effects: { money: -120, stats: { stress: -10, happiness: 6, health: 3 } } },
        { weight: 2, text: 'On détecte quelque chose tôt. Très tôt. C’est ce qui fait toute la différence.', tone: 'neutral', effects: { money: -120, stats: { health: 8, stress: 12 }, flag: 'earlyDetection' } },
      ] },
      { label: 'Repousser encore', outcomes: [{ text: 'L’année prochaine, promis.', tone: 'bad', effects: { stats: { health: -4, discipline: -4 } } }] },
    ],
  }),
  ev({
    id: 'ad_public_recognition', kind: 'work', icon: '🏅', title: 'Une distinction', weight: 14,
    cond: { minAge: 30, hasJob: true, minStat: { reputation: 65 } },
    text: 'Ton travail est distingué par une organisation professionnelle. Il y a une cérémonie et un discours à préparer.',
    choices: [
      { label: 'Faire un discours sincère', outcomes: [{ text: 'Tu remercies les bonnes personnes. La salle est touchée, et ta réputation grimpe encore.', tone: 'good', effects: { stats: { reputation: 15, happiness: 14, karma: 5 } } }] },
      { label: 'Faire court', outcomes: [{ text: 'Trente secondes, applaudissements polis, retour à table.', tone: 'neutral', effects: { stats: { reputation: 7, happiness: 8 } } }] },
      { label: 'Refuser la distinction', outcomes: [{ text: 'Tu déclines publiquement. Certains trouvent ça admirable, d’autres arrogant.', tone: 'neutral', effects: { stats: { reputation: 3, karma: 6, happiness: 4 } } }] },
    ],
  }),
];
