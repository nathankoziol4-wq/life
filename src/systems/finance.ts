/**
 * Système financier (§12) : calcul annuel des revenus, des impôts et des
 * dépenses, gestion des emprunts et du patrimoine.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import type { ActionResult, FinanceSnapshot, GameState, Loan } from '../engine/types.ts';
import { getCountry } from '../data/countries.ts';
import { annualTuition, isInSchool } from './education.ts';
import { peopleByRelation, person } from '../engine/context.ts';
import { getFinancialContext, getPsycheContext } from './contexts.ts';
import { habitCostRatio } from './psyche.ts';
import { portfolioIncome, portfolioValue } from './investing.ts';
import { businessValue, clearVentureYear, ventureEarnings } from './venture.ts';
import { clearFameYear, fameEarnings } from './fame.ts';
import { clearRentYear, rentCollected, rentRoll } from './tenancy.ts';
import { clearStageYear, stageEarnings } from './stage.ts';
import { clearServiceYear, serviceEarnings } from './service.ts';
import { clearPoliticalYear, politicalEarnings } from './politics.ts';
import { clearRoyalYear, royalEarnings } from './royalty.ts';
import { vowActive } from './vows.ts';

/** Coût de la vie de base annuel, avant multiplicateurs. */
const BASE_LIVING_COST = 11000;

/** Valeur totale du patrimoine (liquidités + biens - dettes). */
export function netWorth(state: GameState): number {
  const p = state.player;
  const properties = p.properties.reduce((s, x) => s + x.value - x.mortgageBalance, 0);
  const vehicles = p.vehicles.reduce((s, x) => s + x.value, 0);
  const valuables = p.valuables.reduce((s, x) => s + x.value, 0);
  const debts = p.loans.reduce((s, l) => s + l.balance, 0);
  // Le portefeuille en fait partie, y compris ce qui est bloqué : c'est du
  // patrimoine, même quand ce n'est pas de l'argent disponible. Une
  // entreprise aussi : c'est souvent le principal actif de celui qui en a
  // une, et l'ignorer ferait passer un patron pour un pauvre.
  return Math.round(p.money + properties + vehicles + valuables
    + portfolioValue(state) + businessValue(state) - debts);
}

export function totalDebt(state: GameState): number {
  const p = state.player;
  return Math.round(
    p.loans.reduce((s, l) => s + l.balance, 0) + p.properties.reduce((s, x) => s + x.mortgageBalance, 0),
  );
}

/**
 * Le joueur est-il encore logé par sa famille ?
 * Un jeune adulte sans emploi ni logement, dont un parent est vivant et qui
 * n'a pas fondé son propre foyer, ne paie pas de loyer.
 */
export function livesWithFamily(state: GameState): boolean {
  const p = state.player;
  if (p.age < 18) return true;
  if (p.age >= 27) return false;
  if (p.properties.some((x) => x.isResidence)) return false;
  const hasHome = Object.values(state.npcs).some(
    (x) => x.alive && !x.estranged && (x.relation === 'mother' || x.relation === 'father'),
  );
  if (!hasHome) return false;
  const ownFamily = Object.values(state.npcs).some(
    (x) => x.alive && (x.relation === 'spouse' || x.relation === 'son' || x.relation === 'daughter'),
  );
  if (ownFamily) return false;
  // Encore faut-il qu'il y ait de la place et que le foyer soit vivable :
  // un studio surpeuplé ou un climat conflictuel pousse dehors plus tôt.
  const room = getFinancialContext(state).canLiveAtHome;
  if (room < 0.35) return false;
  // On reste chez ses parents tant qu'on étudie ou qu'on ne gagne pas assez.
  const country = getCountry(p.countryId);
  const income = p.job?.salary ?? 0;
  return income < 20000 * country.salaryIndex * state.world.inflation * (0.6 + room * 0.8);
}

/**
 * Argent de poche versé par la famille à un enfant ou un adolescent.
 * C'est la première conséquence tangible du niveau de vie du foyer : deux
 * enfants de la même classe n'ont pas le même budget le samedi.
 */
export function allowance(state: GameState): number {
  const p = state.player;
  if (p.age < 8 || p.age >= 18 || p.prison) return 0;
  if (!p.origin.parents.some((r) => r.inHousehold)) return 0;
  return Math.round(getFinancialContext(state).allowance * state.world.inflation);
}

/** Loyer annuel si le joueur n'est pas propriétaire de sa résidence. */
export function annualRent(state: GameState): number {
  const p = state.player;
  if (p.prison) return 0;
  if (p.properties.some((x) => x.isResidence)) return 0;
  if (livesWithFamily(state)) return 0;
  const country = getCountry(p.countryId);
  // Le loyer suit le marché local réel — ville *et* quartier — et non plus un
  // simple coefficient de ville : déménager change vraiment la facture.
  const local = getFinancialContext(state).costOfLiving;
  // Le seuil de « standing » est indexé pour rester comparable dans le temps.
  const reference = 42000 * country.salaryIndex * state.world.inflation;
  const standard = 0.55 + Math.min(1.6, ((p.job?.salary ?? 0) + p.pension) / reference);
  return Math.round(7200 * country.costIndex * local * standard * state.world.inflation);
}

/** Coût de la vie annuel (nourriture, transport, loisirs de base). */
export function livingCost(state: GameState): number {
  const p = state.player;
  const country = getCountry(p.countryId);
  const local = getFinancialContext(state).costOfLiving;
  if (p.prison) return 0;
  // Un mineur est à la charge de sa famille : il ne supporte aucune dépense.
  if (p.age < 18) return 0;
  // Vivre chez ses parents réduit fortement les dépenses courantes.
  const household = livesWithFamily(state) ? 0.3 : 1;
  // La part incompressible suit l'inflation.
  const subsistence = BASE_LIVING_COST * country.costIndex * local
    * household * state.world.inflation;
  // Au-delà du nécessaire, le train de vie suit les revenus : plus on gagne,
  // plus on dépense. C'est le principal frein à l'accumulation infinie (§28).
  // Les revenus étant déjà exprimés en monnaie courante, on n'y réapplique
  // pas l'inflation — seul le seuil de déclenchement est indexé.
  const income = (p.job?.salary ?? 0) + p.pension;
  const threshold = 15000 * country.salaryIndex * state.world.inflation;
  // Les habitudes se paient : abonnement de sport, sorties, tabac, achats
  // impulsifs. C'est ce qui empêche un mode de vie coûteux d'être gratuit.
  const habits = habitCostRatio(p.psyche) * 34000 * country.salaryIndex * state.world.inflation;
  // Le train de vie dépend du caractère : à revenu égal, un impulsif dépense
  // beaucoup plus qu'un prudent, et c'est le principal levier de patrimoine.
  const discretionary = Math.max(0, income - threshold) * 0.60 * household
    * getPsycheContext(state).spending;
  return Math.round(subsistence + discretionary + habits * household);
}

/** Charges familiales : enfants à charge, animaux, pension alimentaire. */
export function familyCost(state: GameState): number {
  const p = state.player;
  const country = getCountry(p.countryId);
  const children = peopleByRelation(state, ['son', 'daughter']).filter((c) => c.age < 18);
  const pets = p.pets.reduce((s, pet) => s + pet.annualCost, 0);
  const alimony = Number(p.flags.alimony ?? 0);
  return Math.round(children.length * 5200 * country.costIndex * state.world.inflation + pets + alimony);
}

/** Impôt sur le revenu, progressif et dépendant du pays. */
export function computeTax(state: GameState, grossIncome: number): number {
  const country = getCountry(state.player.countryId);
  if (grossIncome <= 0) return 0;
  // Les tranches sont indexées sur l'inflation : pas de dérive fiscale
  // artificielle au fil d'une vie de soixante ans.
  const index = country.salaryIndex * state.world.inflation;
  const threshold = 12000 * index;
  const taxable = Math.max(0, grossIncome - threshold);
  // Progressivité : le taux effectif monte avec le revenu.
  const progressive = Math.min(1.6, 0.55 + (taxable / (90000 * index)) * 0.9);
  return Math.round(taxable * country.taxRate * progressive);
}

/**
 * Aide sociale annuelle : filet de sécurité pour un adulte sans revenu.
 * Son montant dépend du niveau de redistribution du pays, ce qui rend la
 * précarité beaucoup plus dure dans certains pays que dans d'autres.
 */
export function socialSupport(state: GameState): number {
  const p = state.player;
  if (p.prison || p.age < 18 || p.retired) return 0;
  if (p.job) return 0;
  // Une activité à son compte qui nourrit son homme ferme le droit à l'aide,
  // comme un salaire. Une qui ne rapporte rien ne le ferme pas.
  const country0 = getCountry(p.countryId);
  const floor = 9000 * country0.costIndex * state.world.inflation;
  if ((p.freelance?.earnedThisYear ?? 0) + (p.business?.drawnThisYear ?? 0) > floor) return 0;
  if (livesWithFamily(state)) return 0; // la famille assure le quotidien
  const country = getCountry(p.countryId);
  const children = peopleByRelation(state, ['son', 'daughter']).filter((c) => c.age < 18).length;
  // La redistribution est corrélée au taux d'imposition et à la couverture santé.
  const generosity = country.taxRate * 1.2 + country.healthcare * 0.35;
  const base = 5200 * country.costIndex * state.world.inflation * generosity;
  return Math.round(base * (1 + children * 0.35));
}

/**
 * Soutien familial pendant les études supérieures.
 * Les parents financent à hauteur de leurs moyens : c'est le principal
 * avantage concret d'être né dans une famille aisée (§5).
 */
export function familySupport(state: GameState): number {
  const p = state.player;
  if (!isInSchool(state) || p.age < 16 || p.age > 30) return 0;
  const parents = Object.values(state.npcs).filter(
    (x) => x.alive && !x.estranged && (x.relation === 'mother' || x.relation === 'father'),
  );
  if (!parents.length) return 0;
  const generosity = parents.reduce((s, x) => s + x.personality.generosity, 0) / parents.length / 100;
  const means = parents.reduce((s, x) => s + x.salary * 0.12 + x.wealth * 0.02, 0);
  // Le style éducatif compte autant que les moyens : des parents aisés mais
  // convaincus qu'on doit se débrouiller seul ne financent pas grand-chose.
  const willingness = getFinancialContext(state).familySupport;
  return Math.round(means * (0.4 + generosity * 0.8) * willingness);
}

/** Le joueur poursuit-il des études supérieures financées par un prêt ? */
function isHigherEducation(state: GameState): boolean {
  return ['university', 'graduate', 'vocational'].includes(state.player.education.stage);
}

/**
 * Applique le bilan financier de l'année.
 *
 * L'ordre est important : on encaisse, on paie l'incompressible (biens,
 * dettes, famille), puis on ajuste le train de vie à ce qui reste. On ne
 * dépense pas ce qu'on n'a pas : le manque se traduit par de la précarité
 * (stress, santé) et, en dernier recours, par de la dette — plafonnée par le
 * dépôt de bilan.
 */
export function runAnnualFinance(ctx: Ctx): FinanceSnapshot {
  const { state } = ctx;
  const p = state.player;

  // Une cure prend l'année : on est en congé, et le salaire ne tombe pas.
  // Sans cela, `flags.onLeave` aurait été un mot posé sur rien.
  const salary = p.job && !p.prison && p.flags.onLeave !== true ? p.job.salary : 0;
  const pension = p.retired ? p.pension : 0;
  // Les loyers sont encaissés par `advanceTenancy` au moment où ils sont
  // payés — ce qui n'est pas la même chose que ce qui est dû. Ils entrent
  // donc dans l'assiette imposable, pas dans l'encaissement, comme le reste
  // de ce qui a déjà été crédité.
  const rentIncome = 0;
  // L'argent qui dort rapporte à peine ; ce qui est placé rapporte selon ce
  // sur quoi il est placé, et seulement la part qui verse quelque chose.
  const investmentIncome = Math.round(
    (p.money > 0 ? p.money * 0.012 : 0) + portfolioIncome(state),
  );
  const welfare = socialSupport(state);
  const support = familySupport(state) + allowance(state);
  // Ce qu'on gagne à son compte est déjà sur le compte : il a été crédité au
  // moment où il a été gagné. Il entre dans l'assiette imposable, pas dans
  // l'encaissement — sinon il serait compté deux fois.
  const venture = ventureEarnings(state) + fameEarnings(state) + rentCollected(state)
    + stageEarnings(state) + serviceEarnings(state) + politicalEarnings(state)
    + royalEarnings(state);
  const gross = salary + pension + rentIncome + investmentIncome + welfare + support + venture;

  // Ce qui tombe sans qu'on travaille, et depuis combien de temps. Un titre
  // d'investisseur ou de propriétaire se lit là-dessus, pas sur le solde.
  const passive = rentIncome + investmentIncome + rentCollected(state);
  p.chronicle.passiveEarned += Math.max(0, passive);
  if (rentCollected(state) > 0 || rentIncome > 0) p.chronicle.rentYears += 1;
  if (portfolioValue(state) > 0) p.chronicle.investedYears += 1;

  // Ni l'aide sociale ni l'aide familiale ne sont imposables.
  const taxes = computeTax(state, gross - welfare - support);
  p.money += gross - venture - taxes;
  clearVentureYear(state);
  clearFameYear(state);
  clearRentYear(state);
  clearStageYear(state);
  clearServiceYear(state);
  clearPoliticalYear(state);
  clearRoyalYear(state);
  p.lifetimeEarnings += Math.max(0, gross);

  // Charges incompressibles liées au patrimoine et à la famille.
  const family = familyCost(state);
  const tuition = annualTuition(state);
  const propertyCosts = p.properties.reduce((s, x) => s + x.annualCost, 0);
  const vehicleCosts = p.vehicles.reduce((s, x) => s + x.annualCost, 0);
  p.money -= family + tuition + propertyCosts + vehicleCosts;

  // Remboursements.
  const debtPayments = payLoans(ctx);
  const mortgagePayments = payMortgages(ctx);

  // Logement et vie courante : compressibles jusqu'à un plancher de survie.
  const housingNominal = annualRent(state);
  const livingNominal = livingCost(state);
  let housing = housingNominal;
  let living = livingNominal;
  const desired = housing + living;

  if (desired > 0 && p.money < desired) {
    const ratio = Math.max(0, p.money) / desired;
    // On se serre la ceinture : logement plus modeste, dépenses réduites.
    housing = Math.round(housing * clamp(ratio, 0.45, 1));
    living = Math.round(living * clamp(ratio, 0.4, 1));
    const severity = 1 - clamp(ratio, 0, 1);
    p.stats.stress = clampStat(p.stats.stress + 14 * severity);
    p.stats.happiness = clampStat(p.stats.happiness - 10 * severity);
    p.stats.health = clampStat(p.stats.health - 4 * severity);
    if (severity > 0.35) {
      ctx.log('money', 'Tu vis à découvert : loyer réduit, privations quotidiennes.', 'bad');
    }
  }
  p.money -= housing + living;

  // Découvert résiduel.
  if (p.money < 0) {
    const shortfall = Math.round(-p.money);
    p.money = 0;
    const country = getCountry(p.countryId);

    if (vowActive(state, 'sansDette')) {
      // Qui a juré de ne jamais emprunter ne contracte aucun crédit — ni prêt
      // étudiant, ni découvert. Il s'en passe, et cela se paie autrement.
      // Sans cette sortie, le serment était rompu par le moteur lui-même dans
      // quarante vies sur quarante, sans que le joueur puisse rien y faire.
      shiftStat(state, 'stress', 9);
      shiftStat(state, 'happiness', -5);
      ctx.log(
        'money',
        'Il manque, et tu t’étais engagé à ne pas emprunter. Tu t’en passes.',
        'bad',
      );
      return finalize();
    }

    if (isHigherEducation(state)) {
      // Un étudiant se finance par un prêt à taux réduit, remboursable une
      // fois les études terminées.
      const existing = p.loans.find((l) => l.kind === 'student');
      if (existing) {
        existing.balance += shortfall;
        existing.annualPayment = Math.round(annuity(existing.balance, existing.rate, 15));
      } else {
        addLoan(ctx, { kind: 'student', label: 'Prêt étudiant', amount: shortfall, rate: 0.019, years: 15 });
      }
      p.education.studentLoan = p.loans.find((l) => l.kind === 'student')?.balance ?? 0;
      return finalize();
    }

    const unsecured = p.loans.reduce((s, l) => s + l.balance, 0);
    // Le seuil de dépôt de bilan tient compte des revenus ET du minimum vital :
    // on ne met pas la clé sous la porte pour quelques centaines d'euros.
    const capacity = Math.max(gross * 2.5, 30000 * country.costIndex * state.world.inflation);
    if (unsecured + shortfall > capacity) {
      declareBankruptcy(ctx);
    } else {
      addLoan(ctx, { kind: 'personal', label: 'Découvert bancaire', amount: shortfall, rate: 0.14, years: 5 });
      p.stats.stress = clampStat(p.stats.stress + 8);
    }
  }
  return finalize();

  function finalize(): FinanceSnapshot {

    const snapshot: FinanceSnapshot = {
      year: state.year,
      income: gross,
      taxes,
      livingCost: living + tuition,
      housing,
      debtPayments: debtPayments + mortgagePayments,
      propertyCosts,
      vehicleCosts,
      familyCosts: family,
      other: 0,
      net: gross - taxes - housing - living - family - tuition
        - propertyCosts - vehicleCosts - debtPayments - mortgagePayments,
    };
    p.financeHistory.unshift(snapshot);
    if (p.financeHistory.length > 8) p.financeHistory.pop();
    return snapshot;
  }
}

/**
 * Dépôt de bilan : liquidation des biens non essentiels, effacement des
 * dettes non garanties, et une réputation durablement abîmée.
 */
export function declareBankruptcy(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const wiped = p.loans.reduce((s, l) => s + l.balance, 0);

  // Les biens sont liquidés en priorité pour désintéresser les créanciers.
  let liquidated = 0;
  for (const v of p.vehicles) liquidated += Math.round(v.value * 0.6);
  p.vehicles = [];
  for (const v of p.valuables) liquidated += Math.round(v.value * 0.5);
  p.valuables = [];
  // Les biens à crédit reviennent à la banque ; ceux payés restent.
  const kept = p.properties.filter((x) => x.mortgageBalance <= 0 && x.isResidence);
  for (const prop of p.properties) {
    if (!kept.includes(prop)) liquidated += Math.round(Math.max(0, prop.value - prop.mortgageBalance) * 0.55);
  }
  p.properties = kept;
  for (const key of Object.keys(p.flags)) {
    if (key.startsWith('missed_')) delete p.flags[key];
  }

  p.loans = [];
  p.money = Math.max(0, Math.round(liquidated * 0.25));
  p.stats.reputation = clampStat(p.stats.reputation - 22);
  p.stats.happiness = clampStat(p.stats.happiness - 18);
  p.stats.stress = clampStat(p.stats.stress + 25);
  p.flags.bankruptcies = Number(p.flags.bankruptcies ?? 0) + 1;
  ctx.log('money', `Tu as déposé le bilan. ${Math.round(wiped)} de dettes effacées, tes biens sont liquidés.`, 'bad');
}

/** Rembourse les emprunts personnels et étudiants. Renvoie le total versé. */
function payLoans(ctx: Ctx): number {
  const p = ctx.state.player;
  let paid = 0;
  const studying = isInSchool(ctx.state);
  // Copie volontaire : la liste est modifiée pendant le parcours.
  for (const loan of [...p.loans]) {
    if (loan.yearsLeft <= 0 || loan.balance <= 0) {
      p.loans = p.loans.filter((l) => l.id !== loan.id);
      continue;
    }
    // Le prêt étudiant est en différé tant que les études durent.
    if (loan.kind === 'student' && studying) continue;
    const interest = loan.balance * loan.rate;
    const payment = Math.min(loan.annualPayment, loan.balance + interest);
    if (p.money + (p.job?.salary ?? 0) < payment && p.money < payment) {
      // Incapacité de payer : la dette enfle.
      loan.balance = Math.round(loan.balance + interest * 1.2);
      loan.yearsLeft = Math.min(loan.yearsLeft + 1, 12);
      p.stats.stress = clampStat(p.stats.stress + 6);
      ctx.log('money', `Échéance impayée : « ${loan.label} ». La dette augmente.`, 'bad');
      continue;
    }
    p.money -= payment;
    paid += payment;
    loan.balance = Math.round(loan.balance + interest - payment);
    loan.yearsLeft -= 1;
    if (loan.balance <= 0) {
      p.loans = p.loans.filter((l) => l.id !== loan.id);
      ctx.log('money', `Emprunt soldé : « ${loan.label} ».`, 'good');
    }
  }
  return Math.round(paid);
}

/** Rembourse les crédits immobiliers adossés aux biens. */
function payMortgages(ctx: Ctx): number {
  const p = ctx.state.player;
  let paid = 0;
  for (const prop of p.properties) {
    if (prop.mortgageBalance <= 0 || prop.mortgageYearsLeft <= 0) continue;
    const interest = prop.mortgageBalance * prop.interestRate;
    const payment = Math.min(prop.annualPayment, prop.mortgageBalance + interest);
    if (p.money < payment) {
      prop.mortgageBalance = Math.round(prop.mortgageBalance + interest);
      p.stats.stress = clampStat(p.stats.stress + 8);
      ctx.log('money', `Mensualités impayées sur ${prop.name} (${prop.cityName}).`, 'bad');
      // Après trois années d'impayés, saisie du bien.
      prop.mortgageYearsLeft += 1;
      const missed = Number(p.flags[`missed_${prop.id}`] ?? 0) + 1;
      p.flags[`missed_${prop.id}`] = missed;
      if (missed >= 3) {
        ctx.log('asset', `${prop.name} a été saisi par la banque.`, 'bad');
        p.properties = p.properties.filter((x) => x.id !== prop.id);
        p.stats.happiness = clampStat(p.stats.happiness - 18);
      }
      continue;
    }
    p.money -= payment;
    paid += payment;
    prop.mortgageBalance = Math.round(prop.mortgageBalance + interest - payment);
    prop.mortgageYearsLeft -= 1;
    if (prop.mortgageBalance <= 0) {
      prop.mortgageBalance = 0;
      ctx.log('money', `Crédit remboursé : ${prop.name} t’appartient entièrement.`, 'good');
    }
  }
  return Math.round(paid);
}

export interface LoanRequest {
  kind: Loan['kind'];
  label: string;
  amount: number;
  rate: number;
  years: number;
}

export function addLoan(ctx: Ctx, req: LoanRequest): Loan {
  const loan: Loan = {
    id: ctx.id('loan'),
    kind: req.kind,
    label: req.label,
    balance: Math.round(req.amount),
    rate: req.rate,
    annualPayment: Math.round(annuity(req.amount, req.rate, req.years)),
    yearsLeft: req.years,
  };
  ctx.state.player.loans.push(loan);
  return loan;
}

/** Mensualité constante (ici annuelle) d'un prêt amortissable. */
export function annuity(principal: number, rate: number, years: number): number {
  if (years <= 0) return principal;
  if (rate <= 0) return principal / years;
  return (principal * rate) / (1 - Math.pow(1 + rate, -years));
}

/** Capacité d'emprunt : environ 4 fois le revenu annuel, moins les dettes. */
export function borrowingCapacity(state: GameState): number {
  const p = state.player;
  // Un indépendant emprunte sur ses derniers bilans, pas sur un salaire —
  // et une banque décote ce qui n'est pas garanti par un contrat.
  const independent = (p.freelance?.lastRevenue ?? 0) * 0.7;
  const dividends = p.business?.history[0]?.profit ?? 0;
  const income = (p.job?.salary ?? 0) + p.pension + independent + Math.max(0, dividends) * 0.6
    + rentRoll(state);
  const existing = totalDebt(state);
  return Math.max(0, Math.round(income * 4.2 - existing));
}

/** Souscrire un prêt personnel. */
export function takePersonalLoan(ctx: Ctx, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (p.age < 18) return { ok: false, message: 'Il faut être majeur pour emprunter.' };
  if (amount <= 0) return { ok: false, message: 'Montant invalide.' };
  const capacity = borrowingCapacity(state);
  if (amount > capacity) {
    return { ok: false, title: 'Prêt refusé', message: `Ta capacité d’emprunt est de ${Math.round(capacity)}.` };
  }
  const record = p.criminalRecord.convictions.length > 0;
  const rate = 0.055 + (record ? 0.03 : 0) + Math.max(0, (60 - p.stats.reputation) / 1000);
  addLoan(ctx, { kind: 'personal', label: 'Prêt personnel', amount, rate, years: 7 });
  p.money += amount;
  ctx.log('money', `Tu as souscrit un prêt personnel de ${Math.round(amount)}.`, 'neutral');
  return {
    ok: true,
    title: 'Prêt accordé',
    message: `${Math.round(amount)} versés. Taux : ${(rate * 100).toFixed(1)} % sur 7 ans.`,
    tone: 'neutral',
  };
}

/** Remboursement anticipé d'un emprunt. */
export function repayLoan(ctx: Ctx, loanId: string, amount: number): ActionResult {
  const p = ctx.state.player;
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: 'Emprunt introuvable.' };
  const pay = Math.min(amount, loan.balance, p.money);
  if (pay <= 0) return { ok: false, message: 'Fonds insuffisants.' };
  p.money -= pay;
  loan.balance -= pay;
  if (loan.balance <= 0) {
    p.loans = p.loans.filter((l) => l.id !== loanId);
    ctx.log('money', `Emprunt « ${loan.label} » soldé par anticipation.`, 'good');
    return { ok: true, title: 'Emprunt soldé', message: 'Tu n’as plus rien à rembourser sur ce prêt.', tone: 'good' };
  }
  loan.annualPayment = Math.round(annuity(loan.balance, loan.rate, Math.max(1, loan.yearsLeft)));
  return { ok: true, title: 'Remboursement', message: `Il reste ${Math.round(loan.balance)} à rembourser.`, tone: 'good' };
}

/** Verse de l'argent à un proche. */
export function giveMoney(ctx: Ctx, personId: string, amount: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target || !target.alive) return { ok: false, message: 'Cette personne n’est pas disponible.' };
  if (amount <= 0 || amount > p.money) return { ok: false, message: 'Montant invalide.' };
  p.money -= amount;
  p.chronicle.given += amount;
  target.wealth += amount;
  const country = getCountry(p.countryId);
  const impact = Math.min(30, (amount / (18000 * country.salaryIndex)) * 30);
  target.relationship = clampStat(target.relationship + impact);
  target.opinion = clampStat(target.opinion + impact * 1.2);
  shiftStat(state, 'karma', (Math.min(6, impact / 4)));
  ctx.log('money', `Tu as donné ${Math.round(amount)} à ${target.firstName}.`, 'neutral');
  return {
    ok: true,
    title: 'Don effectué',
    message: `${target.firstName} te remercie chaleureusement.`,
    tone: 'good',
  };
}

/** Demande d'argent à un proche : dépend de la générosité et de la relation. */
export function askForMoney(ctx: Ctx, personId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target || !target.alive) return { ok: false, message: 'Cette personne n’est pas disponible.' };
  const key = `ask_${personId}`;
  if (Number(p.yearActions[key] ?? 0) >= 1) {
    return { ok: false, message: `Tu as déjà demandé de l’argent à ${target.firstName} cette année.` };
  }
  p.yearActions[key] = 1;

  const chance = (target.relationship / 100) * 0.5 + (target.personality.generosity / 100) * 0.4
    + (target.opinion / 100) * 0.2 - (target.wealth < 3000 ? 0.35 : 0);
  target.relationship = clampStat(target.relationship - rng.int(2, 7));
  if (rng.chance(chance)) {
    const amount = Math.round(Math.min(target.wealth * 0.25, target.wealth * rng.float(0.05, 0.3)));
    if (amount <= 0) {
      return { ok: true, title: 'Sans succès', message: `${target.firstName} n’a rien à te donner.`, tone: 'bad' };
    }
    target.wealth -= amount;
    p.money += amount;
    ctx.log('money', `${target.firstName} t’a donné ${amount}.`, 'good');
    return { ok: true, title: 'Aide obtenue', message: `${target.firstName} te donne ${amount}.`, tone: 'good' };
  }
  target.opinion = clampStat(target.opinion - rng.int(3, 10));
  return { ok: true, title: 'Refus', message: `${target.firstName} refuse, et la demande a laissé un froid.`, tone: 'bad' };
}
