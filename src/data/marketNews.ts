/**
 * Ce qui se dit sur le marché.
 *
 * **Le problème que ce fichier existe pour régler.** Jusqu'ici, placer était
 * un pari aveugle : on choisissait un support, les cours bougeaient, et le
 * joueur n'avait strictement rien pour se faire une idée. Aucune décision
 * n'était possible — seulement un choix, puis l'attente. Un pari sans
 * information n'est pas un jeu, c'est une pièce qu'on lance.
 *
 * Ces nouvelles portent donc **un vrai signal** : chacune tire réellement le
 * cours de son support l'année suivante, dans le sens qu'elle annonce. Ce qui
 * est incertain n'est pas le fait — c'est **ce que le joueur arrive à en
 * lire**. Une culture financière basse ne rend pas les nouvelles fausses :
 * elle les rend illisibles. C'est le même partage que l'expertise des objets
 * de valeur, où l'expert ne se trompe pas et où l'œil, lui, se trompe.
 *
 * **Tout est fictif, et doit le rester.** Aucun nom d'entreprise, de place ou
 * d'institution réelle ; aucune situation reconnaissable ; aucun chiffre qui
 * ressemblerait à une donnée de marché véritable. Ce sont des phrases de jeu
 * sur des supports de jeu, et rien ici ne décrit ni ne conseille quoi que ce
 * soit du monde réel.
 */

import type { AssetClass } from './assets.ts';

export interface NewsTemplate {
  /** Ce qui se lit. Une phrase, jamais un chiffre. */
  text: string;
  /**
   * Ce que ça fait vraiment au cours l'année suivante, **en écarts-types du
   * support concerné**. Positif tire vers le haut.
   *
   * L'unité n'est pas un détail. Écrites en valeur absolue, ces poussées
   * voulaient dire deux choses opposées selon l'endroit : sur un livret dont
   * le bruit propre vaut 0,004, une poussée de 0,05 décidait de tout ; sur un
   * jeton à 0,5, la même ne se voyait pas. Mesuré, le sens annoncé et le sens
   * obtenu s'accordaient à 39 % sur le premier — la nouvelle y était
   * *anti*-prédictive — et à 91 % sur le second.
   *
   * En écarts-types, une phrase pèse partout la même fraction du hasard, et
   * aucune ne va au-delà d'un **demi** écart-type. Ce plafond se calcule : à
   * 0,95 sigma le sens annoncé et le sens obtenu s'accordent 83 fois sur
   * cent, ce qui n'est plus un signal mais une recette ; à 0,5 il en reste
   * 69, et à 0,15 tout juste 56. Une nouvelle penche l'année, elle ne la
   * décide pas.
   */
  pull: number;
}

/**
 * Les nouvelles par nature de support.
 *
 * Chaque liste mêle du favorable, du défavorable et de l'ambigu — sans quoi
 * la seule lecture utile serait le nombre de nouvelles, et non ce qu'elles
 * disent.
 */
export const NEWS: Record<AssetClass, NewsTemplate[]> = {
  épargne: [
    { text: 'Les banques se disputent les dépôts et remontent leurs taux servis.', pull: 0.13 },
    { text: 'Le rendement servi passe sous la hausse des prix, sans que personne le dise trop fort.', pull: -0.1 },
    { text: 'Une réforme des livrets est annoncée, puis reportée.', pull: -0.03 },
  ],
  obligation: [
    { text: 'Le loyer de l’argent baisse : ce qui a été émis avant vaut soudain plus cher.', pull: 0.23 },
    { text: 'Le loyer de l’argent remonte, et les titres anciens se retrouvent mal payés.', pull: -0.25 },
    { text: 'Un grand émetteur repousse une échéance ; le marché n’aime pas beaucoup ça.', pull: -0.15 },
    { text: 'Les émissions se raréfient et les acheteurs se pressent sur ce qui existe.', pull: 0.15 },
  ],
  indice: [
    { text: 'Deux gestionnaires fusionnent et les frais des grands paniers baissent d’un coup.', pull: 0.18 },
    { text: 'L’épargne des ménages se déverse sur les paniers larges, mois après mois.', pull: 0.23 },
    { text: 'Une vague de retraits touche les paniers larges, sans motif clair.', pull: -0.2 },
    { text: 'On débat de la place prise par les paniers larges ; rien n’est tranché.', pull: -0.03 },
  ],
  action: [
    { text: 'Les carnets de commandes se remplissent dans l’industrie et les services.', pull: 0.25 },
    { text: 'Les marges se tassent : la main-d’œuvre coûte plus cher qu’on ne l’avait prévu.', pull: -0.23 },
    { text: 'Une saison de résultats meilleure qu’attendu remet tout le monde de bonne humeur.', pull: 0.3 },
    { text: 'Deux avertissements coup sur coup dans un même secteur inquiètent au-delà de lui.', pull: -0.3 },
    { text: 'Un rachat au comptant réveille tout un pan de la cote.', pull: 0.2 },
  ],
  pierre: [
    { text: 'Les bureaux se relouent plus vite qu’on ne le craignait.', pull: 0.2 },
    { text: 'Les livraisons de programmes neufs s’accumulent et pèsent sur les loyers.', pull: -0.23 },
    { text: 'Le crédit se resserre : les acheteurs se font rares et les prix hésitent.', pull: -0.18 },
    { text: 'Une réforme des baux rassure les gestionnaires.', pull: 0.13 },
  ],
  matière: [
    { text: 'Une mine importante s’arrête plusieurs mois ; l’offre se tend.', pull: 0.32 },
    { text: 'Les stocks entreposés atteignent un niveau qu’on n’avait pas vu depuis longtemps.', pull: -0.25 },
    { text: 'La demande industrielle faiblit et les acheteurs se retirent.', pull: -0.2 },
    { text: 'On se rue sur les valeurs refuges dès que quelque chose grince.', pull: 0.28 },
  ],
  jeton: [
    { text: 'Une plateforme majeure ferme du jour au lendemain, sans rendre grand-chose.', pull: -0.52 },
    { text: 'Un cadre réglementaire enfin clair rassure ceux qui hésitaient.', pull: 0.52 },
    { text: 'Un afflux d’acheteurs nouveaux fait tout monter, y compris ce qui ne vaut rien.', pull: 0.52 },
    { text: 'Une panne longue rappelle à tout le monde que ça repose sur des machines.', pull: -0.52 },
  ],
  projet: [
    { text: 'Les tours de table se font plus rares et plus durs.', pull: -0.45 },
    { text: 'Une sortie retentissante rouvre les portefeuilles de tout le secteur.', pull: 0.52 },
    { text: 'Un fonds se retire d’un coup et laisse ses participations sans relais.', pull: -0.52 },
    { text: 'Les valorisations se dégonflent lentement, sans casse spectaculaire.', pull: -0.3 },
  ],
};
