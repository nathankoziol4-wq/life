/**
 * Le milieu : la chaleur, le carnet, la maison.
 *
 * Le jeu avait un catalogue de délits et un booléen `syndicate`. Entrer dans
 * une organisation cochait une case et débloquait deux lignes de menu — il
 * n'existait ni hiérarchie, ni obligations, ni personne à qui parler, ni
 * moyen d'en sortir.
 *
 * Quatre idées structurent ce fichier.
 *
 * **La chaleur n'est pas la notoriété.** Le jeu confondait les deux dans un
 * seul nombre, si bien que se faire un nom rendait mécaniquement plus riche
 * *et* plus arrêtable. Ce sont deux choses opposées : la notoriété ouvre les
 * portes du milieu, la chaleur ferme celles de la rue. On peut être respecté
 * et tranquille, ou inconnu et traqué.
 *
 * **On appartient à quelqu'un.** L'organisation demande, et refuser coûte.
 * Un rang n'est pas un titre : il décide de ce qu'on nous propose, de ce
 * qu'on garde, et de ce qu'on risque. Monter prend des années.
 *
 * **Le carnet est une ressource.** Un receleur, un indicateur, un chauffeur,
 * un logeur, un avocat : cinq personnes qui rendent cinq services précis, qui
 * coûtent, qui s'usent, et qui peuvent parler.
 *
 * **Rien n'est une recette.** Une mission est une décision et un risque
 * chiffré. Le jeu ne décrit aucun procédé, ne nomme aucune méthode, et ne dit
 * jamais comment on ferait quoi que ce soit dans le monde réel.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import { peopleByRelation } from '../engine/context.ts';
import type {
  ActionResult, Contact, GameState, Investigation, Organization,
} from '../engine/types.ts';
import {
  CONTACT_ROLES, CONTACT_ROLE_MAP, MISSIONS, ORG_FIRST, ORG_SECOND, ORG_STYLES,
  RANKS, rankAt, type ContactRole, type MissionDef, type OrgStyle,
} from '../data/underworld.ts';
import { getCountry } from '../data/countries.ts';
import { CRIMES } from '../data/crimes.ts';
import { createPerson } from './npc.ts';
import { arrest } from './justice.ts';

/* ------------------------------------------------------------------ */
/* La chaleur                                                          */
/* ------------------------------------------------------------------ */

export function heatOf(state: GameState): number {
  return clampStat(state.player.criminalRecord.heat ?? 0);
}

/** Ce que la chaleur veut dire, en mots. */
export function heatLabel(heat: number): string {
  if (heat < 12) return 'Personne ne pense à toi';
  if (heat < 30) return 'Un nom dans un dossier';
  if (heat < 50) return 'On te connaît au commissariat';
  if (heat < 72) return 'On te surveille';
  return 'On n’attend qu’un prétexte';
}

/**
 * Ajoute de la chaleur.
 *
 * Elle monte d'autant plus vite qu'on est déjà surveillé : le premier délit
 * passe inaperçu, le dixième arrive sur un bureau où le dossier est déjà
 * ouvert.
 */
export function addHeat(ctx: Ctx, amount: number): void {
  const p = ctx.state.player;
  const current = heatOf(ctx.state);
  p.criminalRecord.heat = clampStat(current + amount * (1 + current / 160));
}

/** Retire de la chaleur. On se fait oublier, ça prend du temps. */
export function coolHeat(ctx: Ctx, amount: number): void {
  const p = ctx.state.player;
  p.criminalRecord.heat = clampStat(heatOf(ctx.state) - amount);
}

/* ------------------------------------------------------------------ */
/* Le carnet                                                           */
/* ------------------------------------------------------------------ */

export function contactsOf(state: GameState): Contact[] {
  return (state.player.contacts ??= []);
}

export function contactByRole(state: GameState, role: ContactRole): Contact | undefined {
  return contactsOf(state).find((c) => c.role === role && !c.burned);
}

export function rankOf(state: GameState): number {
  return state.player.organization?.rank ?? 0;
}

export function contactBlocker(state: GameState, role: ContactRole): string | null {
  const p = state.player;
  const def = CONTACT_ROLE_MAP.get(role);
  if (!def) return 'Inconnu.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < 16) return 'Trop jeune pour ce genre de fréquentation.';
  if (contactByRole(state, role)) return 'Tu connais déjà quelqu’un.';
  if (rankOf(state) < def.minRank) {
    return 'Personne ne te présenterait à quelqu’un comme ça.';
  }
  if (p.criminalRecord.notoriety < 8 && role !== 'receleur') {
    return 'On ne te connaît pas assez pour te rendre service.';
  }
  if (p.yearActions[`contact_${role}`]) return 'Tu as déjà cherché cette année.';
  return null;
}

/**
 * Cherche quelqu'un.
 *
 * On ne choisit pas la personne : on cherche, et on tombe sur qui on tombe.
 * Sa qualité décide de ce que le service vaudra, et elle n'est pas annoncée.
 */
export function findContact(ctx: Ctx, role: ContactRole): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const def = CONTACT_ROLE_MAP.get(role);
  if (!def) return { ok: false, message: 'Inconnu.' };
  const blocker = contactBlocker(state, role);
  if (blocker) return { ok: false, title: def.name, message: blocker };
  p.yearActions[`contact_${role}`] = 1;

  // On trouve d'autant plus facilement qu'on est connu du milieu.
  const odds = 0.28 + p.criminalRecord.notoriety / 180 + rankOf(state) * 0.06;
  if (!rng.chance(odds)) {
    p.stats.stress = clampStat(p.stats.stress + 4);
    return {
      ok: true, title: def.name, tone: 'neutral',
      message: 'Tu demandes autour de toi. On te regarde sans répondre.',
    };
  }

  const person = createPerson(ctx, {
    relation: 'acquaintance',
    age: rng.int(24, 58),
    relationship: rng.int(25, 45),
    opinion: rng.int(30, 55),
    withJob: false,
  });
  person.flags.underworld = true;

  const contact: Contact = {
    id: `contact_${role}_${state.year}`,
    personId: person.id,
    role,
    trust: rng.int(25, 45),
    // La qualité est tirée une fois pour toutes et jamais annoncée : c'est
    // en s'en servant qu'on découvre sur qui on est tombé.
    quality: rng.int(20, 90),
    used: 0,
    burned: false,
  };
  contactsOf(state).push(contact);
  ctx.log('crime', `Tu connais maintenant ${person.firstName}, ${def.name.toLowerCase()}.`, 'neutral');
  return {
    ok: true, title: def.name, tone: 'good',
    message: `${person.firstName} accepte de te connaître. ${def.service}.`,
  };
}

/** Prix d'un service, à l'échelle du pays et de l'époque. */
export function servicePrice(state: GameState, role: ContactRole): number {
  const def = CONTACT_ROLE_MAP.get(role);
  if (!def) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(def.price * country.salaryIndex * state.world.inflation);
}

export function serviceBlocker(state: GameState, role: ContactRole): string | null {
  const p = state.player;
  const contact = contactByRole(state, role);
  if (!contact) return 'Tu ne connais personne pour ça.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.money < servicePrice(state, role)) return 'Tu n’as pas de quoi payer.';
  if (p.yearActions[`service_${role}`]) return 'Une fois par an, pas plus.';
  if (role === 'indicateur' && !p.criminalRecord.investigation) {
    return 'Il n’y a rien à savoir pour le moment.';
  }
  if (role === 'logeur' && heatOf(state) < 20) return 'Tu n’as rien à fuir.';
  return null;
}

/**
 * Demande un service.
 *
 * Ce qu'on obtient dépend de la personne, et une personne médiocre rend un
 * service médiocre — c'est tout l'intérêt de ne pas choisir son carnet.
 */
export function askService(ctx: Ctx, role: ContactRole): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const contact = contactByRole(state, role);
  const def = CONTACT_ROLE_MAP.get(role);
  if (!contact || !def) return { ok: false, message: 'Tu ne connais personne pour ça.' };
  const blocker = serviceBlocker(state, role);
  if (blocker) return { ok: false, title: def.name, message: blocker };

  p.yearActions[`service_${role}`] = 1;
  const price = servicePrice(state, role);
  p.money -= price;
  contact.used += 1;
  contact.trust = clampStat(contact.trust + 3);
  const person = state.npcs[contact.personId];
  const who = person?.firstName ?? 'Ton contact';

  switch (role) {
    case 'indicateur': {
      const investigation = p.criminalRecord.investigation;
      if (!investigation) {
        return { ok: true, title: def.name, tone: 'neutral', message: `${who} n’a rien entendu.` };
      }
      investigation.known = true;
      // Un bon indicateur fait perdre du temps au dossier ; un mauvais se
      // contente de confirmer ce qu'on redoutait.
      const slowed = Math.round(contact.quality / 4);
      investigation.progress = Math.max(0, investigation.progress - slowed);
      return {
        ok: true, title: def.name, tone: slowed > 12 ? 'good' : 'neutral',
        message: slowed > 12
          ? `${who} sait de quoi il parle. Le dossier prend du retard.`
          : `${who} confirme qu’on s’intéresse à toi, sans rien de plus.`,
      };
    }

    case 'logeur': {
      const drop = 12 + contact.quality / 3;
      coolHeat(ctx, drop);
      p.stats.stress = clampStat(p.stats.stress + 6);
      p.stats.happiness = clampStat(p.stats.happiness - 5);
      return {
        ok: true, title: def.name, tone: 'good',
        message: `Quelques semaines chez ${who}, sans sortir. On finit par regarder ailleurs.`,
      };
    }

    case 'avocat': {
      const investigation = p.criminalRecord.investigation;
      if (investigation && rng.percent(30 + contact.quality / 2)) {
        p.criminalRecord.investigation = null;
        coolHeat(ctx, 10);
        return {
          ok: true, title: def.name, tone: 'good',
          message: `${who} fait ce qu’il fait. Le dossier se referme sans que tu saches pourquoi.`,
        };
      }
      p.flags.mobLawyer = true;
      return {
        ok: true, title: def.name, tone: 'neutral',
        message: `${who} prend ton dossier. Il sera là si ça tourne mal.`,
      };
    }

    case 'chauffeur': {
      p.flags.driverOnCall = true;
      return {
        ok: true, title: def.name, tone: 'good',
        message: `${who} attendra au coin de la rue au prochain coup.`,
      };
    }

    case 'receleur':
    default: {
      // Le receleur ne se paie pas : il prend sa part sur ce qu'il rachète.
      p.money += price;
      return {
        ok: true, title: def.name, tone: 'neutral',
        message: `${who} est là quand tu as quelque chose à écouler.`,
      };
    }
  }
}

/**
 * Ce que le receleur ajoute à un butin.
 *
 * Sans lui, tout se revend au prix de la rue. Avec lui, la marge dépend de
 * qui on a trouvé — et c'est la seule façon de le découvrir.
 */
export function fenceBonus(state: GameState): number {
  const contact = contactByRole(state, 'receleur');
  if (!contact) return 1;
  return 1 + contact.quality / 250;
}

/** Le chauffeur réduit le nombre de poursuivants d'une fuite. */
export function driverHelp(state: GameState): boolean {
  return state.player.flags.driverOnCall === true;
}

export function useDriver(ctx: Ctx): void {
  ctx.state.player.flags.driverOnCall = false;
}

/* ------------------------------------------------------------------ */
/* La maison                                                           */
/* ------------------------------------------------------------------ */

export function orgOf(state: GameState): Organization | null {
  return state.player.organization ?? null;
}

export function joinBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.organization) return 'Tu appartiens déjà à une maison.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < 18) return 'Trop jeune.';
  if (p.stats.criminality < 35) return 'On ne recrute pas les amateurs.';
  if (p.criminalRecord.notoriety < 15) return 'Ton nom ne dit rien à personne.';
  if (p.yearActions.joinOrg) return 'Tu as déjà tenté cette année.';
  return null;
}

/** Se faire présenter. Le refus est fréquent et il coûte. */
export function joinOrganization(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const blocker = joinBlocker(state);
  if (blocker) return { ok: false, title: 'Le milieu', message: blocker };
  p.yearActions.joinOrg = 1;

  const odds = 0.3 + p.criminalRecord.notoriety / 200 + p.stats.criminality / 350;
  if (!rng.chance(odds)) {
    p.stats.stress = clampStat(p.stats.stress + 10);
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety - 4);
    return {
      ok: true, title: 'Refusé', tone: 'bad',
      message: 'On te renvoie sèchement. Le refus fait le tour du quartier avant toi.',
    };
  }

  const style = rng.pick(Object.keys(ORG_STYLES)) as OrgStyle;
  const org: Organization = {
    name: `${rng.pick(ORG_FIRST)} ${rng.pick(ORG_SECOND)}`,
    style,
    rank: 1,
    respect: rng.int(5, 15),
    territory: rng.int(25, 55),
    pressure: rng.int(10, 30),
    rival: `${rng.pick(ORG_FIRST)} ${rng.pick(ORG_SECOND)}`,
    done: 0,
    refused: 0,
    failed: 0,
    since: state.year,
  };
  p.organization = org;
  // L'ancien drapeau reste posé : d'autres systèmes s'en servent encore.
  p.flags.syndicate = true;
  p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 12);
  p.stats.criminality = clampStat(p.stats.criminality + 8);
  shiftStat(state, 'karma', -(10));
  ctx.log('crime', `Tu entres chez ${org.name}.`, 'neutral');
  return {
    ok: true, title: org.name, tone: 'neutral',
    message: `On te fait une place tout en bas. ${ORG_STYLES[style].note}`,
  };
}

/**
 * La mission que la maison réclame cette année, s'il y en a une.
 *
 * Une maison ne se contente pas d'ouvrir un catalogue : elle demande. Tant
 * que la demande est là, y répondre — dans un sens ou dans l'autre — est
 * la seule façon de la faire disparaître.
 */
export function demandedMission(state: GameState): MissionDef | null {
  const pending = state.player.pendingMission;
  if (!pending) return null;
  return MISSIONS.find((m) => m.kind === pending.kind) ?? null;
}

/** Les missions qu'on te proposerait aujourd'hui. */
export function availableMissions(state: GameState): MissionDef[] {
  const org = orgOf(state);
  if (!org) return [];
  return MISSIONS.filter((m) => m.minRank <= org.rank);
}

export function missionBlocker(state: GameState, mission: MissionDef): string | null {
  const p = state.player;
  const org = orgOf(state);
  if (!org) return 'Tu n’appartiens à aucune maison.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (org.rank < mission.minRank) return `Il faut être ${rankAt(mission.minRank).name.toLowerCase()}.`;
  if ((p.yearActions.missions ?? 0) >= 2) return 'Tu en as déjà assez fait cette année.';
  return null;
}

/** Ce que la mission rapporterait, part de rang et territoire compris. */
export function missionReward(state: GameState, mission: MissionDef): number {
  const org = orgOf(state);
  if (!org) return 0;
  const country = getCountry(state.player.countryId);
  const share = rankAt(org.rank).share;
  // Le territoire n'est pas un décor : il multiplie ce que la maison encaisse,
  // donc ce qu'elle redistribue.
  const grip = 0.6 + org.territory / 125;
  return Math.round(
    mission.reward * share * grip * country.salaryIndex * state.world.inflation,
  );
}

/**
 * Fait une mission.
 *
 * Les missions qui portent un mini-jeu ne se résolvent pas ici : l'écran les
 * joue et rappelle `settleMission` avec le résultat. Les autres se jouent sur
 * ce que vaut le personnage, comme un délit ordinaire.
 */
export function runMission(ctx: Ctx, mission: MissionDef): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const blocker = missionBlocker(state, mission);
  if (blocker) return { ok: false, title: mission.name, message: blocker };

  const skill = p.stats.criminality * 0.5 + p.stats.fitness * 0.2
    + p.stats.intelligence * 0.2 + p.psyche.emotion.stability * 0.1;
  const success = rng.chance(Math.max(0.08, Math.min(0.94,
    0.35 + (skill - mission.difficulty) / 110,
  )));
  return settleMission(ctx, mission, success);
}

/** Applique les suites d'une mission, jouée ou non. */
export function settleMission(ctx: Ctx, mission: MissionDef, success: boolean): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const org = orgOf(state);
  if (!org) return { ok: false, message: 'Tu n’appartiens à aucune maison.' };

  p.yearActions.missions = (p.yearActions.missions ?? 0) + 1;
  if (p.pendingMission?.kind === mission.kind) p.pendingMission = null;
  shiftStat(state, 'karma', -(mission.karma));
  p.stats.stress = clampStat(p.stats.stress + 8);

  // Le style de la maison change ce qu'une mission attire et rapporte.
  const style = org.style as OrgStyle;
  const heatFactor = style === 'brutal' ? 1.35 : style === 'discret' ? 0.7 : 1;
  addHeat(ctx, mission.heat * 22 * heatFactor * rankAt(org.rank).exposure);
  org.pressure = clampStat(org.pressure + mission.heat * 9 * heatFactor);

  if (!success) {
    org.failed += 1;
    // Rater doit coûter plus cher que refuser, sinon accepter puis échouer
    // serait toujours préférable à dire non — et dire non n'aurait plus de
    // sens. On paie le respect *et* la mission qu'on a fait perdre.
    org.respect = clampStat(org.respect - mission.respect - mission.minRank * 5);
    p.stats.reputation = clampStat(p.stats.reputation - 3);
    // Rater se paie parfois au corps, et toujours au dossier.
    if (rng.chance(0.35 + mission.heat * 0.25)) {
      const crime = CRIMES.find((c) => c.id === 'racket') ?? CRIMES[0];
      return {
        ok: true, title: mission.name, tone: 'bad',
        message: `Ça tourne mal. ${arrest(ctx, crime, 0)}`,
      };
    }
    return {
      ok: true, title: mission.name, tone: 'bad',
      message: 'Tu reviens les mains vides. On ne te dit rien, et c’est pire.',
    };
  }

  const gain = missionReward(state, mission);
  p.money += gain;
  org.done += 1;
  org.respect = clampStat(org.respect + mission.respect * (style === 'discret' ? 0.75 : 1));
  p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + mission.respect / 2);
  p.stats.criminality = clampStat(p.stats.criminality + 2);
  if (mission.kind === 'territoire') {
    org.territory = clampStat(org.territory + rng.int(6, 14));
  }

  ctx.log('crime', `${mission.name} : ${gain} pour toi.`, 'neutral');
  return {
    ok: true, title: mission.name, tone: 'neutral',
    message: `C’est fait. ${gain} te reviennent, le reste remonte.`,
  };
}

/** Refuser ce qu'on te demande. Possible, jamais gratuit. */
export function refuseMission(ctx: Ctx, mission: MissionDef): ActionResult {
  const { state } = ctx;
  const org = orgOf(state);
  if (!org) return { ok: false, message: 'Tu n’appartiens à aucune maison.' };
  org.refused += 1;
  // Refuser ce qu'on t'a expressément demandé coûte plus cher que décliner
  // une ligne du catalogue : dans un cas on te propose, dans l'autre on te
  // demande. On lit la demande avant de l'effacer.
  const asked = state.player.pendingMission?.kind === mission.kind ? 1.6 : 1;
  if (asked > 1) state.player.pendingMission = null;
  org.respect = clampStat(org.respect - (8 + mission.minRank * 3) * asked);
  state.player.stats.stress = clampStat(state.player.stats.stress + 5);
  return {
    ok: true, title: 'Refusé', tone: 'neutral',
    message: org.refused > 2
      ? 'On note. On note tout, et on te le dira un jour.'
      : 'On hausse les épaules. Ce sera pour quelqu’un d’autre.',
  };
}

export function leaveBlocker(state: GameState): string | null {
  if (!state.player.organization) return 'Tu n’appartiens à aucune maison.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (state.player.yearActions.leaveOrg) return 'Tu as déjà essayé cette année.';
  return null;
}

/**
 * Partir.
 *
 * Plus on est monté, plus il faut payer pour redescendre — parce qu'on sait
 * des choses. C'est le seul endroit du système où le rang se retourne contre
 * celui qui l'a obtenu.
 */
export function leaveOrganization(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const org = orgOf(state);
  const blocker = leaveBlocker(state);
  if (blocker || !org) return { ok: false, title: 'Partir', message: blocker ?? '' };
  p.yearActions.leaveOrg = 1;

  // Le prix du départ : ce qu'on sait, ce qu'on doit, ce qu'on a refusé.
  const price = 0.25 + org.rank * 0.12 - org.respect / 400 + org.refused * 0.05;
  if (rng.chance(Math.min(0.85, price))) {
    p.stats.health = clampStat(p.stats.health - rng.int(10, 28));
    p.stats.stress = clampStat(p.stats.stress + 25);
    org.respect = clampStat(org.respect - 25);
    return {
      ok: true, title: 'On n’a pas aimé', tone: 'bad',
      message: 'On te fait comprendre que la question ne se pose pas. Tu mettras des mois à t’en remettre.',
    };
  }

  p.organization = null;
  p.flags.syndicate = false;
  p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety - 15);
  p.stats.stress = clampStat(p.stats.stress - 10);
  ctx.log('crime', `Tu quittes ${org.name}.`, 'neutral');
  return {
    ok: true, title: 'Dehors', tone: 'good',
    message: `On te laisse partir. Ce n’est pas de l’amitié, c’est du calcul — tu ne vaux plus le dérangement.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année du milieu                                                   */
/* ------------------------------------------------------------------ */

/**
 * Une année dans le milieu.
 *
 * La chaleur retombe, les enquêtes avancent, la maison monte ou tombe, et le
 * rang suit le respect — dans les deux sens.
 */
export function advanceUnderworld(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  /* --- La chaleur retombe --- */
  // Se faire oublier prend du temps, et d'autant plus qu'on était voyant.
  const heat = heatOf(state);
  if (!p.prison) {
    coolHeat(ctx, 4 + (100 - heat) / 22);
  } else {
    // En détention, on ne fait plus parler de soi dehors.
    coolHeat(ctx, 12);
  }

  /* --- Les enquêtes --- */
  advanceInvestigation(ctx);

  /* --- Les contacts s'usent --- */
  for (const contact of contactsOf(state)) {
    if (contact.burned) continue;
    // Quelqu'un qu'on n'appelle jamais finit par ne plus répondre ; quelqu'un
    // qu'on appelle tout le temps finit par parler.
    const risk = 0.02 + contact.used * 0.03 - contact.trust / 900;
    if (rng.chance(Math.max(0, risk))) {
      contact.burned = true;
      const person = state.npcs[contact.personId];
      addHeat(ctx, 10);
      openInvestigation(ctx, 'racket', 25);
      ctx.log('crime', `${person?.firstName ?? 'Quelqu’un'} a parlé.`, 'bad');
    }
  }

  /* --- La maison --- */
  const org = orgOf(state);
  if (!org) return;

  // La pression retombe, sauf si le territoire est disputé.
  org.pressure = clampStat(org.pressure - 6);
  const style = org.style as OrgStyle;

  // La guerre de territoire : la maison d'en face avance ou recule, et le
  // joueur en paie une part proportionnelle à son rang.
  const push = rng.float(-9, 8) + (style === 'brutal' ? 2 : 0)
    + (org.respect - 50) / 40;
  org.territory = clampStat(org.territory + push);
  if (org.territory < 15 && rng.chance(0.4)) {
    p.stats.health = clampStat(p.stats.health - rng.int(3, 12) * rankAt(org.rank).exposure);
    ctx.log('crime', `${org.rival} avance sur le quartier. Ça se règle dans la rue.`, 'bad');
  }

  // La pression de la police remonte jusqu'au joueur selon ce qu'il est.
  if (org.pressure > 65 && rng.chance(0.3)) {
    addHeat(ctx, 8 * rankAt(org.rank).exposure);
  }

  /* --- Monter, ou descendre --- */
  const next = RANKS.find((r) => r.level === org.rank + 1);
  if (next && org.respect >= next.respect && rng.chance(0.45)) {
    org.rank = next.level;
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 8);
    ctx.log('crime', `Tu montes : ${next.name} chez ${org.name}.`, 'neutral');
  } else if (org.rank > 1 && org.respect < rankAt(org.rank).respect - 22) {
    org.rank -= 1;
    ctx.log('crime', `On te fait redescendre d’un cran chez ${org.name}.`, 'bad');
  }

  // Une demande laissée sans réponse est une réponse : au bout d'un an, la
  // maison en tire ses conclusions toute seule.
  if (p.pendingMission && p.pendingMission.year < state.year - 1) {
    org.respect = clampStat(org.respect - 10);
    org.refused += 1;
    p.pendingMission = null;
    ctx.log('crime', `Chez ${org.name}, on n’a pas aimé ton silence.`, 'bad');
  }

  // Une maison qui ne demande rien n'existe pas : elle propose.
  if (!p.pendingMission && rng.chance(0.45)) {
    const choices = availableMissions(state);
    if (choices.length > 0) {
      const mission = choices[Math.floor(rng.next() * choices.length)];
      p.pendingMission = { kind: mission.kind, year: state.year };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Les enquêtes                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ouvre un dossier.
 *
 * Une enquête n'est pas une arrestation différée : elle avance, on peut
 * l'apprendre, la ralentir, la faire fermer — ou la laisser aboutir.
 */
export function openInvestigation(ctx: Ctx, crimeId: string, progress = 10): void {
  const p = ctx.state.player;
  if (p.criminalRecord.investigation) {
    p.criminalRecord.investigation.progress = clampStat(
      p.criminalRecord.investigation.progress + progress,
    );
    return;
  }
  const investigation: Investigation = {
    since: ctx.state.year, progress, crimeId, known: false,
  };
  p.criminalRecord.investigation = investigation;
}

/** Fait avancer le dossier de l'année. */
function advanceInvestigation(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;

  // Une chaleur élevée finit par ouvrir un dossier toute seule.
  const heat = heatOf(state);
  if (!p.criminalRecord.investigation && !p.prison && rng.chance(Math.max(0, (heat - 45) / 320))) {
    const last = p.criminalRecord.convictions.at(-1)?.crimeId ?? 'racket';
    openInvestigation(ctx, last, rng.int(8, 20));
    return;
  }

  const investigation = p.criminalRecord.investigation;
  if (!investigation) return;

  if (p.prison) {
    // Un dossier ne court pas contre quelqu'un qu'on tient déjà.
    p.criminalRecord.investigation = null;
    return;
  }

  // Le dossier avance d'autant plus vite que la chaleur est haute, et
  // l'intelligence du personnage lui fait gagner du temps.
  investigation.progress = clampStat(
    investigation.progress + 6 + heat / 9 - p.stats.intelligence / 30,
  );

  // On finit par l'apprendre : quelqu'un vient poser des questions.
  if (!investigation.known && rng.chance(0.35 + investigation.progress / 200)) {
    investigation.known = true;
    p.stats.stress = clampStat(p.stats.stress + 12);
    ctx.log('justice', 'Des gens sont venus poser des questions sur toi.', 'bad');
  }

  if (investigation.progress >= 100) {
    const crime = CRIMES.find((c) => c.id === investigation.crimeId) ?? CRIMES[0];
    p.criminalRecord.investigation = null;
    coolHeat(ctx, 30);
    arrest(ctx, crime, 0);
  }
}

/** Ce que le joueur sait de l'enquête en cours. */
export function investigationLabel(state: GameState): string | null {
  const investigation = state.player.criminalRecord.investigation;
  if (!investigation?.known) return null;
  if (investigation.progress < 35) return 'On pose des questions autour de toi.';
  if (investigation.progress < 70) return 'Le dossier grossit. On a des noms.';
  return 'Ça va tomber. Ce n’est plus qu’une question de semaines.';
}

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

/** Les gens du milieu qu'on connaît, pour l'écran. */
export function underworldPeople(state: GameState) {
  return peopleByRelation(state, ['acquaintance', 'friend'])
    .filter((person) => person.flags.underworld === true && person.alive);
}

/** Les rôles encore libres. */
export function missingRoles(state: GameState): ContactRole[] {
  return CONTACT_ROLES
    .map((r) => r.id)
    .filter((role) => !contactByRole(state, role));
}
