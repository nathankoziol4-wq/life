/**
 * Événements du travail à son compte et de l'entreprise.
 *
 * L'audit relevait huit événements de catégorie « travail » pour quarante ans
 * de carrière. Ceux-ci ne s'adressent qu'à ceux qui ont pris le risque de
 * travailler sans employeur : le client qui ne paie pas, le contrôle, le
 * salarié qui part avec le carnet d'adresses, le concurrent qui ouvre en face.
 *
 * Ce sont les ennuis du métier, jamais des procédures : on ne dit nulle part
 * comment on fraude, comment on contourne un contrôle ou comment on détourne
 * une clientèle. On dit seulement ce que ça coûte.
 */

import { ev, type GameEvent } from './types.ts';

export const VENTURE_EVENTS: GameEvent[] = [
  /* ---------------- À son compte ---------------- */
  ev({
    id: 'vt_unpaid', kind: 'money', icon: '🧾', title: 'La facture qui ne rentre pas', weight: 34,
    cond: { minAge: 16, hasFreelance: true },
    text: 'Le travail est livré depuis quatre mois. La facture, elle, n’est toujours pas payée, et le client ne répond plus.',
    choices: [
      { label: 'Relancer, encore', outcomes: [
        { weight: 3, text: 'Il finit par payer, avec un mot désagréable. L’argent est là.', tone: 'good', effects: { stats: { stress: 6, discipline: 4 } } },
        { weight: 2, text: 'Rien. Tu as passé six heures à écrire des mails pour rien.', tone: 'bad', effects: { stats: { stress: 12, happiness: -6 } } },
      ] },
      { label: 'Passer par la procédure', outcomes: [
        { weight: 3, text: 'La mise en demeure fait effet. Tu es payé, et tu ne le reverras jamais.', tone: 'good', effects: { stats: { discipline: 7, stress: 8, reputation: -2 } } },
        { weight: 2, text: 'Des mois de procédure pour une somme que les frais ont mangée.', tone: 'bad', effects: { stats: { stress: 16, happiness: -8 } } },
      ] },
      { label: 'Laisser tomber', outcomes: [{ text: 'Tu passes à autre chose. C’est le prix de ne pas y penser tous les matins.', tone: 'neutral', effects: { stats: { stress: -4, happiness: -5 }, moneyPct: -0.02 } }] },
    ],
  }),
  ev({
    id: 'vt_word_of_mouth', kind: 'work', icon: '🗣️', title: 'Quelqu’un a parlé de toi', weight: 30,
    cond: { minAge: 16, hasFreelance: true },
    text: 'Trois personnes t’appellent la même semaine. Toutes disent le même nom : un ancien client qui t’a recommandé.',
    choices: [
      { label: 'Tout prendre', outcomes: [
        { weight: 3, text: 'Deux mois sans dormir, et un carnet plein pour l’année.', tone: 'good', effects: { stats: { stress: 16, happiness: 8, reputation: 5 }, moneyPct: 0.06 } },
        { weight: 2, text: 'Tu t’es engagé sur plus que ce que tu peux tenir. Un des trois est déçu.', tone: 'bad', effects: { stats: { stress: 20, reputation: -4, health: -4 } } },
      ] },
      { label: 'Choisir le meilleur et refuser les autres', outcomes: [{ text: 'Tu fais un travail dont tu n’as pas honte, et tu recommandes un confrère pour le reste.', tone: 'good', effects: { stats: { reputation: 6, discipline: 5, happiness: 5 }, moneyPct: 0.02 } }] },
      { label: 'Augmenter tes prix', outcomes: [
        { weight: 3, text: 'Deux acceptent sans discuter. Tu réalises que tu étais trop bas depuis des années.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 7 }, moneyPct: 0.04 } },
        { weight: 2, text: 'Les trois raccrochent. Le bouche-à-oreille ne fait pas tout.', tone: 'bad', effects: { stats: { happiness: -6, reputation: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'vt_burnout_solo', kind: 'health', icon: '🕯️', title: 'Personne pour te remplacer', weight: 26,
    cond: { minAge: 18, hasFreelance: true, minStat: { stress: 62 } },
    text: 'Tu es malade depuis une semaine. À ton compte, une semaine sans travailler est une semaine sans rien.',
    choices: [
      { label: 'Travailler quand même', outcomes: [{ text: 'Tu livres, mal, et tu mets un mois à t’en remettre.', tone: 'bad', effects: { stats: { health: -12, stress: 12, reputation: -3 } } }] },
      { label: 'Tout décaler', outcomes: [
        { weight: 3, text: 'Les clients comprennent. Tu découvres qu’ils sont plus humains que tu ne le pensais.', tone: 'good', effects: { stats: { health: 8, stress: -14, happiness: 6 } } },
        { weight: 2, text: 'Deux annulent. Tu apprends que l’un d’eux avait déjà quelqu’un d’autre en tête.', tone: 'bad', effects: { stats: { health: 6, happiness: -8 }, moneyPct: -0.04 } },
      ] },
      { label: 'Sous-traiter à quelqu’un', outcomes: [
        { weight: 3, text: 'Le travail est fait, ta marge est mince, ton nom est sauf.', tone: 'neutral', effects: { stats: { stress: -8, health: 5 }, moneyPct: -0.03 } },
        { weight: 2, text: 'La personne à qui tu as confié le travail garde le client.', tone: 'bad', effects: { stats: { stress: 10, happiness: -10, reputation: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'vt_big_client_terms', kind: 'work', icon: '📋', title: 'Le gros client et ses conditions', weight: 24,
    cond: { minAge: 20, hasFreelance: true },
    text: 'Une grande maison veut travailler avec toi. Le volume représenterait la moitié de ton année. Les conditions de paiement sont détestables.',
    choices: [
      { label: 'Signer', outcomes: [
        { weight: 3, text: 'Une année confortable, et une dépendance dont tu ne mesures pas encore le prix.', tone: 'good', effects: { moneyPct: 0.1, stats: { stress: 8, happiness: 6 }, flag: 'clientUnique' } },
        { weight: 2, text: 'Ils changent d’avis au bout de six mois. Tu avais refusé tout le reste.', tone: 'bad', effects: { moneyPct: -0.05, stats: { stress: 18, happiness: -12 } } },
      ] },
      { label: 'Négocier les délais', outcomes: [
        { weight: 2, text: 'Ils cèdent sur un point. C’est rare, et ça se voit dans les comptes.', tone: 'good', effects: { moneyPct: 0.07, stats: { intelligence: 5, reputation: 3 } } },
        { weight: 3, text: 'Ils passent au suivant sur leur liste sans même répondre.', tone: 'neutral', effects: { stats: { happiness: -5, discipline: 3 } } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tu restes petit et libre. Les deux vont ensemble plus souvent qu’on ne le dit.', tone: 'neutral', effects: { stats: { happiness: 5, stress: -6 } } }] },
    ],
  }),
  ev({
    id: 'vt_copycat', kind: 'work', icon: '🪞', title: 'Quelqu’un fait la même chose que toi', weight: 22,
    cond: { minAge: 18, hasFreelance: true },
    text: 'Un nouveau venu propose exactement ton service, en moins cher, avec des images qui ressemblent beaucoup aux tiennes.',
    choices: [
      { label: 'Baisser tes prix pour tenir', outcomes: [
        { weight: 2, text: 'Tu gardes tes clients et tu gagnes moins. Il finit par abandonner avant toi.', tone: 'neutral', effects: { stats: { stress: 12, discipline: 5 }, moneyPct: -0.04 } },
        { weight: 3, text: 'Vous vous épuisez tous les deux, et le marché s’habitue à payer moins.', tone: 'bad', effects: { stats: { stress: 14, happiness: -8 }, moneyPct: -0.07 } },
      ] },
      { label: 'Miser sur ce que tu fais mieux', outcomes: [
        { weight: 3, text: 'Ceux qui partent au premier euro n’étaient pas tes clients. Les autres restent.', tone: 'good', effects: { stats: { reputation: 6, discipline: 5, happiness: 4 } } },
        { weight: 2, text: 'Il s’avère qu’il travaille bien, en plus. Tu perds une partie du carnet.', tone: 'bad', effects: { stats: { happiness: -9, stress: 10 }, moneyPct: -0.05 } },
      ] },
      { label: 'Aller le voir', outcomes: [
        { weight: 3, text: 'Vous vous partagez ce que vous ne pouvez pas absorber. C’est plus tenable pour tout le monde.', tone: 'good', effects: { stats: { reputation: 4, karma: 6, happiness: 7 } } },
        { weight: 2, text: 'Il prend ça pour de la faiblesse.', tone: 'bad', effects: { stats: { happiness: -6, stress: 8 } } },
      ] },
    ],
  }),

  /* ---------------- L'entreprise ---------------- */
  ev({
    id: 'vt_inspection', kind: 'work', icon: '📎', title: 'Un contrôle', weight: 30,
    cond: { minAge: 20, hasBusiness: true },
    text: 'Un contrôle administratif tombe sans prévenir. Il y a toujours quelque chose à trouver quand on cherche.',
    choices: [
      { label: 'Ouvrir tous les tiroirs', outcomes: [
        { weight: 3, text: 'Deux remarques mineures, une régularisation, et une matinée perdue.', tone: 'neutral', effects: { stats: { stress: 8 }, moneyPct: -0.01 } },
        { weight: 2, text: 'Tout est en ordre. On te le dit presque à regret.', tone: 'good', effects: { stats: { discipline: 6, stress: -3, reputation: 3 } } },
      ] },
      { label: 'Faire venir un conseil', requiresMoney: 2000, outcomes: [
        { weight: 4, text: 'Il gère la discussion. Ça coûte, et ça évite bien pire.', tone: 'good', effects: { money: -2500, stats: { stress: -4, intelligence: 3 } } },
        { weight: 1, text: 'Même avec un conseil, il y avait un vrai problème. L’amende tombe.', tone: 'bad', effects: { moneyPct: -0.06, stats: { stress: 14 } } },
      ] },
      { label: 'Traîner les pieds', outcomes: [
        { weight: 2, text: 'Ils reviennent, plus décidés. Cette fois, ils regardent tout.', tone: 'bad', effects: { moneyPct: -0.07, stats: { stress: 18, reputation: -5 } } },
        { weight: 2, text: 'Le dossier finit dans une pile. Tu as eu de la chance.', tone: 'neutral', effects: { stats: { stress: 6 } } },
      ] },
    ],
  }),
  ev({
    id: 'vt_key_employee', kind: 'work', icon: '🚪', title: 'Le salarié qui s’en va', weight: 28,
    cond: { minAge: 20, hasBusiness: true },
    text: 'Celui sur qui reposait la moitié de la maison t’annonce qu’il part. Il a déjà un projet, et il en parle avec des étoiles dans les yeux.',
    choices: [
      { label: 'Le retenir à tout prix', outcomes: [
        { weight: 3, text: 'Il reste, plus cher, et moins investi qu’avant. Ce n’était pas une question d’argent.', tone: 'neutral', effects: { stats: { stress: 10 }, moneyPct: -0.03 } },
        { weight: 2, text: 'Il reste, et retrouve l’envie. Tu avais juste oublié de lui demander ce qu’il voulait.', tone: 'good', effects: { stats: { happiness: 8, reputation: 4 }, moneyPct: -0.02 } },
      ] },
      { label: 'Le laisser partir proprement', outcomes: [
        { weight: 3, text: 'Il forme son remplaçant avant de fermer la porte. On se reverra.', tone: 'good', effects: { stats: { karma: 6, reputation: 5, stress: 5 } } },
        { weight: 2, text: 'Une partie des clients le suit. C’est la loi du métier.', tone: 'bad', effects: { stats: { stress: 14, happiness: -8 }, moneyPct: -0.05 } },
      ] },
      { label: 'Le prendre mal', outcomes: [{ text: 'Il part le jour même, et raconte partout comment ça s’est passé.', tone: 'bad', effects: { stats: { reputation: -8, karma: -5, stress: 12 } } }] },
    ],
  }),
  ev({
    id: 'vt_competitor_opens', kind: 'work', icon: '🏬', title: 'Une enseigne ouvre en face', weight: 26,
    cond: { minAge: 20, hasBusiness: true },
    text: 'Le local vide d’en face ne l’est plus. C’est le même métier que le tien, avec un logo neuf et un budget que tu n’as pas.',
    choices: [
      { label: 'Investir pour tenir le choc', requiresMoney: 8000, outcomes: [
        { weight: 3, text: 'Ta maison a l’air d’avoir dix ans de moins. Les habitués restent.', tone: 'good', effects: { money: -9000, stats: { happiness: 6, reputation: 5 } } },
        { weight: 2, text: 'Tu as vidé la caisse pour un décor. Le problème n’était pas là.', tone: 'bad', effects: { money: -9000, stats: { stress: 16, happiness: -8 } } },
      ] },
      { label: 'Jouer ce qu’ils ne peuvent pas faire', outcomes: [
        { weight: 3, text: 'Tu connais les gens par leur prénom, eux non. Ça vaut tous les budgets.', tone: 'good', effects: { stats: { reputation: 8, happiness: 7, discipline: 4 } } },
        { weight: 2, text: 'Le prix a gagné, comme souvent.', tone: 'bad', effects: { stats: { happiness: -10, stress: 14 }, moneyPct: -0.04 } },
      ] },
      { label: 'Attendre de voir', outcomes: [
        { weight: 2, text: 'Ils ferment au bout d’un an. Le quartier n’en voulait pas deux.', tone: 'good', effects: { stats: { happiness: 8, stress: -4 } } },
        { weight: 3, text: 'Tu regardes ton chiffre baisser mois après mois sans rien décider.', tone: 'bad', effects: { stats: { happiness: -12, stress: 12 }, moneyPct: -0.06 } },
      ] },
    ],
  }),
  ev({
    id: 'vt_supplier_fails', kind: 'money', icon: '📦', title: 'Le fournisseur lâche', weight: 24,
    cond: { minAge: 20, hasBusiness: true },
    text: 'Celui qui te livrait depuis le début dépose le bilan. Il te doit une commande déjà payée.',
    choices: [
      { label: 'Trouver quelqu’un d’autre, vite et cher', outcomes: [{ text: 'Tu tiens tes engagements. Ta marge du trimestre y passe.', tone: 'neutral', effects: { moneyPct: -0.05, stats: { discipline: 6, stress: 10 } } }] },
      { label: 'Prévenir les clients et décaler', outcomes: [
        { weight: 3, text: 'La franchise passe mieux que le silence. Presque tous attendent.', tone: 'good', effects: { stats: { reputation: 5, karma: 4, stress: 6 } } },
        { weight: 2, text: 'Deux gros comptes vont voir ailleurs et n’en reviennent pas.', tone: 'bad', effects: { moneyPct: -0.06, stats: { stress: 14, happiness: -8 } } },
      ] },
      { label: 'Livrer avec ce que tu as', outcomes: [
        { weight: 2, text: 'Personne ne voit la différence.', tone: 'neutral', effects: { stats: { stress: 6 } } },
        { weight: 3, text: 'Tout le monde voit la différence. Ça se dit vite.', tone: 'bad', effects: { stats: { reputation: -9, happiness: -8 } } },
      ] },
    ],
  }),
  ev({
    id: 'vt_expand_offer', kind: 'money', icon: '🗝️', title: 'Le local d’à côté se libère', weight: 22,
    cond: { minAge: 22, hasBusiness: true, minMoney: 15000 },
    text: 'Le propriétaire te propose le local mitoyen avant de le mettre sur le marché. Deux fois la surface, deux fois le loyer.',
    choices: [
      { label: 'Prendre', requiresMoney: 15000, outcomes: [
        { weight: 3, text: 'La maison change de dimension. Il faudra remplir tout cet espace.', tone: 'good', effects: { money: -18000, stats: { happiness: 12, stress: 12 } } },
        { weight: 2, text: 'Tu as doublé tes charges avant d’avoir doublé ta clientèle.', tone: 'bad', effects: { money: -18000, stats: { stress: 20, happiness: -6 } } },
      ] },
      { label: 'Refuser', outcomes: [
        { weight: 3, text: 'Tu restes à ta taille. Ce n’est pas un échec, c’est un choix.', tone: 'neutral', effects: { stats: { stress: -4, discipline: 4 } } },
        { weight: 2, text: 'Un concurrent le prend. Tu y penseras longtemps.', tone: 'bad', effects: { stats: { happiness: -7, stress: 8 } } },
      ] },
    ],
  }),
  ev({
    id: 'vt_first_profit', kind: 'money', icon: '🎉', title: 'Le premier exercice qui gagne', weight: 20, once: true,
    cond: { minAge: 20, hasBusiness: true },
    text: 'Pour la première fois, la maison a gagné de l’argent sur une année pleine. Ce n’est pas beaucoup. C’est la première fois.',
    choices: [
      { label: 'Le remettre dans la maison', outcomes: [{ text: 'Rien ne change dehors, tout change dedans.', tone: 'good', effects: { stats: { discipline: 8, happiness: 8 } } }] },
      { label: 'Partager avec l’équipe', outcomes: [{ text: 'Ils ne s’y attendaient pas. Certains ne l’oublieront pas.', tone: 'good', effects: { moneyPct: -0.03, stats: { karma: 9, reputation: 6, happiness: 10 } } }] },
      { label: 'S’offrir quelque chose', outcomes: [{ text: 'Tu l’as attendu longtemps. Personne n’a rien à en dire.', tone: 'good', effects: { moneyPct: -0.04, stats: { happiness: 14, stress: -8 } } }] },
    ],
  }),
];
