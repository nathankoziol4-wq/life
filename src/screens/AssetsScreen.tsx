/**
 * Écran « Avoirs » : banque, emprunts, immobilier, véhicules et objets de valeur.
 */

import { useState } from 'react';
import { CollectionScreen } from './CollectionScreen.tsx';
import {
  AmountPicker, Button, Card, Empty, Meter, Modal, Pill, Row, Section, Segmented, Sheet,
} from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money, moneyClass, signedMoney } from '../ui/format.ts';
import {
  borrowingCapacity, netWorth, repayLoan, takePersonalLoan, totalDebt,
} from '../systems/finance.ts';
import {
  buyProperty, minimumDeposit, mortgageRate, renovate, sellProperty, setResidence,
} from '../systems/properties.ts';
import { TenancyScreen, tenancyAlert, tenancyLine } from './TenancyScreen.tsx';
import { buyVehicle, sellVehicle, serviceVehicle } from '../systems/vehicles.ts';
import { buyItem } from '../systems/activities.ts';
import {
  appraisalCost, appraise, appraiseBlocker, askingPrice, auction, eyeAccuracy,
  hunt, huntBlocker, huntCost, originOf, reserveRange, saleOdds, setProgress,
  standingOf,
} from '../systems/objects.ts';
import { PROVENANCES, SETS, STANDING_LABEL } from '../data/objects.ts';
import { PROPERTY_MAP, RENOVATIONS } from '../data/properties.ts';
import { GARAGE_SERVICES, VEHICLE_CATEGORIES, VEHICLE_MAP } from '../data/vehicles.ts';
import { SHOP_ITEMS } from '../data/activities.ts';
import { economyLabel } from '../systems/markets.ts';
import { PortfolioScreen } from './PortfolioScreen.tsx';
import { holdingsOf, portfolioValue, unrealizedGain } from '../systems/investing.ts';
import type { OwnedProperty, OwnedVehicle } from '../engine/types.ts';

type Panel =
  | null | 'bank' | 'loans' | 'realestate' | 'myProperties' | 'cars' | 'myCars'
  | 'shop' | 'myItems' | 'budget' | 'portfolio' | 'collections';

export function AssetsScreen() {
  const { state } = useGame();
  const [panel, setPanel] = useState<Panel>(null);
  if (!state) return null;
  const p = state.player;

  if (panel === 'bank') return <BankPanel onBack={() => setPanel(null)} />;
  if (panel === 'loans') return <LoansPanel onBack={() => setPanel(null)} />;
  if (panel === 'realestate') return <RealEstatePanel onBack={() => setPanel(null)} />;
  if (panel === 'myProperties') return <MyPropertiesPanel onBack={() => setPanel(null)} />;
  if (panel === 'cars') return <CarMarketPanel onBack={() => setPanel(null)} />;
  if (panel === 'myCars') return <MyCarsPanel onBack={() => setPanel(null)} />;
  if (panel === 'shop') return <ShopPanel onBack={() => setPanel(null)} />;
  if (panel === 'collections') return <CollectionScreen onBack={() => setPanel(null)} />;
  if (panel === 'myItems') return <MyItemsPanel onBack={() => setPanel(null)} />;
  if (panel === 'budget') return <BudgetPanel onBack={() => setPanel(null)} />;
  if (panel === 'portfolio') return <PortfolioScreen onBack={() => setPanel(null)} />;

  const worth = netWorth(state);
  const debt = totalDebt(state);

  return (
    <>
      <Section title="Patrimoine">
        <Card pad>
          <div className="spread">
            <div>
              <div className="small muted">Valeur nette</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px' }}>
                {money(state, worth)}
              </div>
            </div>
            <Pill tone={worth >= 0 ? 'good' : 'bad'}>
              {worth >= 0 ? 'Positif' : 'Négatif'}
            </Pill>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <MiniStat label="Liquidités" value={money(state, p.money)} />
            <MiniStat label="Dettes" value={money(state, debt)} />
            <MiniStat label="Immobilier" value={money(state, p.properties.reduce((s, x) => s + x.value, 0))} />
            <MiniStat label="Véhicules" value={money(state, p.vehicles.reduce((s, x) => s + x.value, 0))} />
            <MiniStat label="Placements" value={money(state, portfolioValue(state))} />
          </div>
        </Card>
      </Section>

      <Section title="Banque">
        <Card>
          <Row emoji="🏦" title="Compte et budget" sub={`Bilan des dernières années · ${economyLabel(state.world.economy)}`} onClick={() => setPanel('budget')} chevron />
          <Row emoji="🤝" title="Emprunter" sub={`Capacité : ${money(state, borrowingCapacity(state))}`} onClick={() => setPanel('bank')} chevron />
          <Row emoji="📉" title="Mes emprunts" sub={p.loans.length ? `${p.loans.length} en cours` : 'Aucun emprunt'} onClick={() => setPanel('loans')} disabled={!p.loans.length} chevron />
        </Card>
      </Section>

      <Section title="Placements">
        <Card>
          <Row
            emoji="📊"
            title="Portefeuille"
            sub={holdingsOf(state).length
              ? `${holdingsOf(state).length} ligne(s) · ${signedMoney(state, unrealizedGain(state))} latent`
              : 'Rien de placé — l’argent qui dort perd de la valeur'}
            right={<Pill tone={portfolioValue(state) > 0 ? 'primary' : undefined}>
              {money(state, portfolioValue(state))}
            </Pill>}
            onClick={() => setPanel('portfolio')}
            chevron
          />
        </Card>
      </Section>

      <Section title="Immobilier">
        <Card>
          <Row emoji="🏘️" title="Marché immobilier" sub={`${state.world.propertyListings.length} biens à vendre`} onClick={() => setPanel('realestate')} chevron />
          <Row
            emoji="🔑"
            title="Mes biens"
            sub={p.properties.length ? `${p.properties.length} bien(s)` : 'Aucun bien'}
            onClick={() => setPanel('myProperties')}
            disabled={!p.properties.length}
            chevron
          />
        </Card>
      </Section>

      <Section title="Véhicules">
        <Card>
          <Row emoji="🚗" title="Concession et occasions" sub={`${state.world.vehicleListings.length} véhicules disponibles`} onClick={() => setPanel('cars')} chevron />
          <Row
            emoji="🅿️"
            title="Mon garage"
            sub={p.vehicles.length ? `${p.vehicles.length} véhicule(s)` : 'Aucun véhicule'}
            onClick={() => setPanel('myCars')}
            disabled={!p.vehicles.length}
            chevron
          />
        </Card>
      </Section>

      {/* Ce qui traverse les générations n'est pas un avoir comme les autres :
          on ne le vend pas pour arrondir, et il vaut d'autant plus qu'on l'a
          gardé. D'où sa propre section, au-dessus des objets de valeur. */}
      <Section title="Collections">
        <Card>
          <Row
            emoji="🏺"
            title="Ce que la famille a gardé"
            sub={p.heirlooms.length > 0
              ? `${p.heirlooms.length} objet(s) de famille · le plus ancien a ${
                Math.max(...p.heirlooms.map((h) => state.year - h.since))} an(s)`
              : 'Objets de famille, métiers tenus, distinctions, titres — et un grenier à retourner'}
            right={p.heirlooms.length > 0
              ? <Pill tone="good">{p.heirlooms.length}</Pill>
              : undefined}
            onClick={() => setPanel('collections')}
            chevron
          />
        </Card>
      </Section>

      <Section title="Objets de valeur">
        <Card>
          <Row emoji="🛍️" title="Boutique" sub="Mode, technologie, art, collection" onClick={() => setPanel('shop')} chevron />
          <Row
            emoji="💎"
            title="Mes possessions"
            sub={p.valuables.length ? `${p.valuables.length} objet(s)` : 'Aucun objet'}
            onClick={() => setPanel('myItems')}
            disabled={!p.valuables.length}
            chevron
          />
        </Card>
      </Section>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="small muted">{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Banque                                                             */
/* ------------------------------------------------------------------ */

function BudgetPanel({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const history = state.player.financeHistory;

  return (
    <Sheet title="Compte et budget" onBack={onBack}>
      {history.length === 0 ? (
        <Empty>Le premier bilan financier arrivera à la fin de ta prochaine année.</Empty>
      ) : (
        history.map((f) => (
          <Section key={f.year} title={`Exercice ${f.year}`}>
            <Card>
              <Row emoji="💵" title="Revenus" right={<span className="money-pos">{money(state, f.income)}</span>} />
              <Row emoji="🧾" title="Impôts" right={<span className="money-neg">−{money(state, f.taxes)}</span>} />
              <Row emoji="🏠" title="Logement" right={<span className="money-neg">−{money(state, f.housing)}</span>} />
              <Row emoji="🛒" title="Vie courante et études" right={<span className="money-neg">−{money(state, f.livingCost)}</span>} />
              <Row emoji="👨‍👩‍👧" title="Charges familiales" right={<span className="money-neg">−{money(state, f.familyCosts)}</span>} />
              <Row emoji="🏡" title="Entretien des biens" right={<span className="money-neg">−{money(state, f.propertyCosts)}</span>} />
              <Row emoji="🚗" title="Véhicules" right={<span className="money-neg">−{money(state, f.vehicleCosts)}</span>} />
              <Row emoji="📉" title="Remboursements" right={<span className="money-neg">−{money(state, f.debtPayments)}</span>} />
              <Row
                emoji="📊"
                title="Solde de l’année"
                right={<span className={moneyClass(f.net)}>{signedMoney(state, f.net)}</span>}
              />
            </Card>
          </Section>
        ))
      )}
    </Sheet>
  );
}

function BankPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [amount, setAmount] = useState(0);
  if (!state) return null;
  const capacity = borrowingCapacity(state);

  return (
    <Sheet title="Emprunter" onBack={onBack}>
      <Card pad>
        <Row emoji="🏦" title="Capacité d’emprunt" right={money(state, capacity)} />
        <p className="small muted" style={{ marginTop: 4 }}>
          La banque prête environ quatre fois ton revenu annuel, dettes existantes déduites.
          Le taux dépend de ta réputation, de ton emploi et de ton casier judiciaire.
        </p>
      </Card>
      <Section title="Montant souhaité">
        <Card pad>
          <AmountPicker value={amount} max={capacity} onChange={setAmount} step={500} />
          <div style={{ marginTop: 12 }}>
            <Button
              onClick={() => {
                const outcome = run((ctx) => takePersonalLoan(ctx, amount), '🤝');
                if (outcome.ok) setAmount(0);
              }}
              disabled={amount <= 0 || amount > capacity}
            >
              Emprunter {money(state, amount)}
            </Button>
          </div>
        </Card>
      </Section>
    </Sheet>
  );
}

function LoansPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  if (!state) return null;
  const p = state.player;
  const loan = p.loans.find((l) => l.id === selected);

  return (
    <Sheet title="Mes emprunts" onBack={onBack}>
      {p.loans.length === 0 ? (
        <Empty>Tu n’as aucun emprunt en cours.</Empty>
      ) : (
        <Card>
          {p.loans.map((l) => (
            <Row
              key={l.id}
              emoji={l.kind === 'student' ? '🎓' : l.kind === 'mortgage' ? '🏠' : '💳'}
              title={l.label}
              sub={`${(l.rate * 100).toFixed(1)} % · ${l.yearsLeft} an(s) · ${money(state, l.annualPayment)}/an`}
              right={money(state, l.balance)}
              onClick={() => {
                setSelected(l.id);
                setAmount(Math.min(p.money, l.balance));
              }}
              chevron
            />
          ))}
        </Card>
      )}
      <Modal
        open={Boolean(loan)}
        onClose={() => setSelected(null)}
        title={loan?.label}
        text={loan ? `Solde restant : ${money(state, loan.balance)}` : ''}
        icon="💳"
      >
        {loan && (
          <>
            <AmountPicker
              value={amount}
              max={Math.min(p.money, loan.balance)}
              onChange={setAmount}
              step={100}
            />
            <div style={{ marginTop: 12 }}>
              <Button
                onClick={() => {
                  run((ctx) => repayLoan(ctx, loan.id, amount), '💳');
                  setSelected(null);
                }}
                disabled={amount <= 0}
              >
                Rembourser {money(state, amount)}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Immobilier                                                         */
/* ------------------------------------------------------------------ */

function RealEstatePanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;
  const listing = state.world.propertyListings.find((l) => l.id === selected);
  const rate = mortgageRate(state);

  return (
    <Sheet title="Marché immobilier" onBack={onBack}>
      <p className="small muted">
        Taux de crédit actuel : {(rate * 100).toFixed(2)} % sur 20 ans · apport minimum 20 %.
        Les prix évoluent chaque année avec la conjoncture.
      </p>
      <Card>
        {state.world.propertyListings.map((l) => {
          const arch = PROPERTY_MAP[l.archetypeId];
          return (
            <Row
              key={l.id}
              emoji={arch?.emoji ?? '🏠'}
              title={`${l.name} · ${l.areaM2} m²`}
              sub={`${l.cityName} · état ${Math.round(l.condition)} %`}
              right={<strong>{money(state, l.price)}</strong>}
              onClick={() => setSelected(l.id)}
              chevron
            />
          );
        })}
      </Card>

      <Modal
        open={Boolean(listing)}
        onClose={() => setSelected(null)}
        icon={listing ? PROPERTY_MAP[listing.archetypeId]?.emoji : '🏠'}
        title={listing ? `${listing.name} — ${listing.cityName}` : ''}
        text={listing ? PROPERTY_MAP[listing.archetypeId]?.description : ''}
      >
        {listing && (
          <>
            <Card>
              <Row emoji="📐" title="Surface" right={`${listing.areaM2} m²`} />
              <Row emoji="🔧" title="État" right={`${Math.round(listing.condition)} %`} />
              <Row emoji="💸" title="Charges annuelles" right={money(state, listing.annualCost)} />
              <Row emoji="🔑" title="Loyer potentiel" right={`${money(state, listing.annualRentIncome)}/an`} />
              <Row emoji="🏦" title="Apport minimum" right={money(state, minimumDeposit(listing.price))} />
            </Card>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const outcome = run((ctx) => buyProperty(ctx, listing.id, 'mortgage'), '🏠');
                  if (outcome.ok) setSelected(null);
                }}
              >
                À crédit
              </Button>
              <Button
                onClick={() => {
                  const outcome = run((ctx) => buyProperty(ctx, listing.id, 'cash'), '🏠');
                  if (outcome.ok) setSelected(null);
                }}
                disabled={state.player.money < listing.price}
              >
                Comptant
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Sheet>
  );
}

function MyPropertiesPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [renting, setRenting] = useState<string | null>(null);
  if (!state) return null;
  const p = state.player;
  const prop = p.properties.find((x) => x.id === selected);

  if (renting) {
    return <TenancyScreen propertyId={renting} onBack={() => setRenting(null)} />;
  }

  return (
    <Sheet title="Mes biens" onBack={onBack}>
      <Card>
        {p.properties.map((x) => (
          <Row
            key={x.id}
            emoji={PROPERTY_MAP[x.archetypeId]?.emoji ?? '🏠'}
            title={`${x.name} · ${x.cityName}`}
            sub={
              [
                x.isResidence ? 'Résidence principale' : tenancyLine(state, x),
                x.mortgageBalance > 0 ? `Crédit : ${money(state, x.mortgageBalance)}` : 'Sans crédit',
              ].filter(Boolean).join(' · ')
            }
            right={tenancyAlert(x)
              ? <Pill tone="warn">À décider</Pill>
              : money(state, x.value)}
            onClick={() => setSelected(x.id)}
            chevron
          />
        ))}
      </Card>

      <Modal
        open={Boolean(prop)}
        onClose={() => setSelected(null)}
        icon={prop ? PROPERTY_MAP[prop.archetypeId]?.emoji : '🏠'}
        title={prop ? `${prop.name} — ${prop.cityName}` : ''}
      >
        {prop && (
          <PropertyDetail
            prop={prop}
            onDone={() => setSelected(null)}
            onRent={(id) => { setSelected(null); setRenting(id); }}
            run={run}
          />
        )}
      </Modal>
    </Sheet>
  );
}

function PropertyDetail({
  prop, onDone, onRent, run,
}: {
  prop: OwnedProperty;
  onDone: () => void;
  onRent: (propertyId: string) => void;
  run: ReturnType<typeof useGame>['run'];
}) {
  const { state } = useGame();
  if (!state) return null;
  const gain = prop.value - prop.purchasePrice;

  return (
    <>
      <Card>
        <Row emoji="💶" title="Valeur actuelle" right={money(state, prop.value)} />
        <Row
          emoji="📈"
          title="Plus-value latente"
          right={<span className={moneyClass(gain)}>{signedMoney(state, gain)}</span>}
        />
        <Row emoji="🔧" title="État" right={`${Math.round(prop.condition)} %`} />
        <Row emoji="💸" title="Charges annuelles" right={money(state, prop.annualCost)} />
        {prop.mortgageBalance > 0 && (
          <Row
            emoji="🏦"
            title="Crédit restant"
            sub={`${money(state, prop.annualPayment)}/an · ${prop.mortgageYearsLeft} an(s)`}
            right={money(state, prop.mortgageBalance)}
          />
        )}
      </Card>
      <div style={{ margin: '10px 0 4px' }}>
        <Meter value={prop.condition} />
      </div>

      <Section title="Travaux">
        <Card>
          {RENOVATIONS.map((r) => (
            <Row
              key={r.id}
              emoji={r.emoji}
              title={r.name}
              sub={`État +${r.condition} · valeur +${Math.round(r.valueGain * 100)} %`}
              right={money(state, Math.round(prop.value * r.costRate))}
              onClick={() => {
                run((ctx) => renovate(ctx, prop.id, r.id), r.emoji);
                onDone();
              }}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section title="Gestion">
        <Card>
          {!prop.isResidence && (
            <Row
              emoji="🧳"
              title="En faire ma résidence"
              sub={`Emménager à ${prop.cityName}`}
              onClick={() => {
                run((ctx) => setResidence(ctx, prop.id), '🧳');
                onDone();
              }}
              chevron
            />
          )}
          {!prop.isResidence && (
            <Row
              emoji="🔑"
              title="Gérer la location"
              sub={tenancyLine(state, prop)}
              right={tenancyAlert(prop) ? <Pill tone="warn">À décider</Pill> : undefined}
              onClick={() => onRent(prop.id)}
              chevron
            />
          )}
          <Row
            emoji="🏷️"
            title="Vendre le bien"
            sub={prop.mortgageBalance > 0 ? 'Le crédit restant sera soldé' : 'Encaisser la valeur de marché'}
            onClick={() => {
              run((ctx) => sellProperty(ctx, prop.id), '🏷️');
              onDone();
            }}
            chevron
          />
        </Card>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Véhicules                                                          */
/* ------------------------------------------------------------------ */

function CarMarketPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [category, setCategory] = useState<string>('toutes');
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;

  const listings = state.world.vehicleListings.filter((l) => {
    if (category === 'toutes') return true;
    return VEHICLE_MAP[l.modelId]?.category === category;
  });
  const listing = state.world.vehicleListings.find((l) => l.id === selected);

  return (
    <Sheet title="Véhicules à vendre" onBack={onBack}>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div className="chips" style={{ flexWrap: 'nowrap' }}>
          {['toutes', ...VEHICLE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCategory(c)} type="button">
              <span className={`pill${c === category ? ' pill-primary' : ''}`}>{c}</span>
            </button>
          ))}
        </div>
      </div>
      {listings.length === 0 ? (
        <Empty>Aucun véhicule de cette catégorie cette année.</Empty>
      ) : (
        <Card>
          {listings.map((l) => (
            <Row
              key={l.id}
              emoji={VEHICLE_MAP[l.modelId]?.emoji ?? '🚗'}
              title={`${l.brand} ${l.model}`}
              sub={`${l.year} · ${l.used ? `${l.mileage.toLocaleString('fr-FR')} km` : 'neuf'} · état ${Math.round(l.condition)} %`}
              right={<strong>{money(state, l.price)}</strong>}
              onClick={() => setSelected(l.id)}
              chevron
            />
          ))}
        </Card>
      )}

      <Modal
        open={Boolean(listing)}
        onClose={() => setSelected(null)}
        icon={listing ? VEHICLE_MAP[listing.modelId]?.emoji : '🚗'}
        title={listing ? `${listing.brand} ${listing.model}` : ''}
      >
        {listing && (
          <>
            <Card>
              <Row emoji="📅" title="Année" right={String(listing.year)} />
              <Row emoji="🛣️" title="Kilométrage" right={`${listing.mileage.toLocaleString('fr-FR')} km`} />
              <Row emoji="🔧" title="État" right={`${Math.round(listing.condition)} %`} />
              <Row emoji="🛡️" title="Fiabilité" right={`${listing.reliability}/100`} />
              <Row emoji="💸" title="Entretien annuel" right={money(state, listing.annualCost)} />
            </Card>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const outcome = run((ctx) => buyVehicle(ctx, listing.id, 'credit'), '🚗');
                  if (outcome.ok) setSelected(null);
                }}
              >
                À crédit
              </Button>
              <Button
                onClick={() => {
                  const outcome = run((ctx) => buyVehicle(ctx, listing.id, 'cash'), '🚗');
                  if (outcome.ok) setSelected(null);
                }}
                disabled={state.player.money < listing.price}
              >
                Comptant
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Sheet>
  );
}

function MyCarsPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;
  const vehicle = state.player.vehicles.find((v) => v.id === selected);

  return (
    <Sheet title="Mon garage" onBack={onBack}>
      <Card>
        {state.player.vehicles.map((v) => (
          <Row
            key={v.id}
            emoji={VEHICLE_MAP[v.modelId]?.emoji ?? '🚗'}
            title={`${v.brand} ${v.model}`}
            sub={`${v.year} · ${v.mileage.toLocaleString('fr-FR')} km${v.broken ? ' · EN PANNE' : ''}`}
            right={money(state, v.value)}
            onClick={() => setSelected(v.id)}
            chevron
          />
        ))}
      </Card>

      <Modal
        open={Boolean(vehicle)}
        onClose={() => setSelected(null)}
        icon={vehicle ? VEHICLE_MAP[vehicle.modelId]?.emoji : '🚗'}
        title={vehicle ? `${vehicle.brand} ${vehicle.model}` : ''}
      >
        {vehicle && <VehicleDetail vehicle={vehicle} onDone={() => setSelected(null)} run={run} />}
      </Modal>
    </Sheet>
  );
}

function VehicleDetail({
  vehicle, onDone, run,
}: {
  vehicle: OwnedVehicle;
  onDone: () => void;
  run: ReturnType<typeof useGame>['run'];
}) {
  const { state } = useGame();
  if (!state) return null;

  return (
    <>
      {vehicle.broken && (
        <div style={{ marginBottom: 10 }}>
          <Pill tone="bad">Véhicule immobilisé — réparation nécessaire</Pill>
        </div>
      )}
      <Card>
        <Row emoji="💶" title="Valeur estimée" right={money(state, vehicle.value)} />
        <Row emoji="🛣️" title="Kilométrage" right={`${vehicle.mileage.toLocaleString('fr-FR')} km`} />
        <Row emoji="🔧" title="État" right={`${Math.round(vehicle.condition)} %`} />
        <Row emoji="💸" title="Entretien annuel" right={money(state, vehicle.annualCost)} />
      </Card>
      <div style={{ margin: '10px 0 4px' }}>
        <Meter value={vehicle.condition} />
      </div>
      <Section title="Garage">
        <Card>
          {GARAGE_SERVICES.map((s) => (
            <Row
              key={s.id}
              emoji={s.emoji}
              title={s.name}
              sub={`État +${s.condition}`}
              right={money(state, Math.max(s.minCost, Math.round(vehicle.purchasePrice * s.costRate)))}
              onClick={() => {
                run((ctx) => serviceVehicle(ctx, vehicle.id, s.id), s.emoji);
                onDone();
              }}
              chevron
            />
          ))}
          <Row
            emoji="🏷️"
            title="Vendre le véhicule"
            sub={vehicle.broken ? 'Forte décote en l’état' : 'Au prix du marché'}
            onClick={() => {
              run((ctx) => sellVehicle(ctx, vehicle.id), '🏷️');
              onDone();
            }}
            chevron
          />
        </Card>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Boutique                                                           */
/* ------------------------------------------------------------------ */

function ShopPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [category, setCategory] = useState<'mode' | 'technologie' | 'bijoux' | 'art' | 'collection'>('mode');
  if (!state) return null;

  return (
    <Sheet title="Boutique" onBack={onBack}>
      {/* Chiner, avant la boutique. Mesuré avant que cela existe : 0 % des
          vies possédaient le moindre objet — on achetait au prix affiché ce
          qu'on revendrait à 60 %, et il n'y avait rien à y gagner. Ce qui a
          de la valeur se déniche. */}
      <Section title="Aller voir ailleurs">
        <Card>
          {PROVENANCES.filter((from) => from.id !== 'boutique').map((from) => {
            const why = huntBlocker(state, from.id);
            return (
              <Row
                key={from.id}
                emoji={from.emoji}
                title={from.label}
                sub={why ?? from.note}
                right={<Pill>{from.cost === 0 ? 'gratuit' : money(state, huntCost(state, from))}</Pill>}
                disabled={Boolean(why)}
                onClick={why ? undefined : () => run((ctx) => hunt(ctx, from.id), from.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          On y paie une fraction du prix, et l’on ne sait pas ce qu’on
          rapporte. Deux sorties par an.
        </p>
      </Section>

      <Segmented
        value={category}
        onChange={setCategory}
        options={[
          { value: 'mode', label: 'Mode' },
          { value: 'technologie', label: 'Tech' },
          { value: 'bijoux', label: 'Bijoux' },
          { value: 'art', label: 'Art' },
          { value: 'collection', label: 'Collec.' },
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <Card>
          {SHOP_ITEMS.filter((i) => i.category === category).map((i) => (
            <Row
              key={i.id}
              emoji={i.emoji}
              title={i.name}
              sub={[
                i.looks ? `Allure +${i.looks}` : null,
                i.reputation ? `Réputation +${i.reputation}` : null,
                i.happiness ? `Bonheur +${i.happiness}` : null,
                i.appreciation > 0 ? 'Prend de la valeur' : 'Se déprécie',
              ].filter(Boolean).join(' · ')}
              right={<strong>{money(state, i.price)}</strong>}
              onClick={() => run((ctx) => buyItem(ctx, i.id), i.emoji)}
              chevron
            />
          ))}
        </Card>
      </div>
    </Sheet>
  );
}

function MyItemsPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [reserve, setReserve] = useState(0);
  if (!state) return null;
  const item = state.player.valuables.find((v) => v.id === selected);
  const range = item ? reserveRange(state, item) : { low: 0, high: 0 };
  const asked = item ? Math.min(Math.max(reserve || range.low, range.low), range.high) : 0;

  return (
    <Sheet title="Mes possessions" onBack={onBack}>
      {/* Les ensembles : la seule chose du jeu qui récompense de *ne pas*
          vendre. Sans eux, un objet qui monte se revend dès qu'il a monté et
          rien ne se constitue jamais. */}
      <Section title="Ce qui se complète">
        <Card>
          {SETS.map((set) => {
            const { have, needs } = setProgress(state, set);
            return (
              <Row
                key={set.id}
                emoji={set.emoji}
                title={set.label}
                sub={set.note}
                right={<Pill tone={have >= needs ? 'good' : undefined}>{have}/{needs}</Pill>}
              />
            );
          })}
        </Card>
      </Section>

      <Section title="Ce que tu possèdes">
        {state.player.valuables.length === 0 ? (
          <Empty>Rien pour l’instant. Ce qui a de la valeur ne s’achète pas au prix affiché.</Empty>
        ) : (
          <Card>
            {state.player.valuables.map((v) => {
              // Ce qu'on gagnerait *en le vendant maintenant*, décote du
              // doute comprise. Compté sur la valeur au catalogue, la ligne
              // annonçait un bénéfice plus gros que le prix affiché juste à
              // côté — c'est-à-dire exactement la décote que le système
              // cherche à rendre sensible.
              const known = standingOf(v);
              const gain = askingPrice(state, v) - v.purchasePrice;
              return (
                <Row
                  key={v.id}
                  emoji={SHOP_ITEMS.find((i) => i.name === v.name)?.emoji ?? '💎'}
                  title={v.name}
                  sub={`${originOf(v)?.label ?? 'Acheté'} en ${v.purchaseYear} · ${STANDING_LABEL[known]}`}
                  right={
                    <>
                      {money(state, askingPrice(state, v))}
                      <br />
                      <span className={`small ${moneyClass(gain)}`}>{signedMoney(state, gain)}</span>
                    </>
                  }
                  onClick={() => { setSelected(v.id); setReserve(0); }}
                  chevron
                />
              );
            })}
          </Card>
        )}
      </Section>

      <Modal
        open={Boolean(item)}
        onClose={() => setSelected(null)}
        icon="🔨"
        title={item?.name}
        text={item && standingOf(item) === 'douteux'
          ? 'Tu ne sais pas encore ce que c’est. Vendre dans le doute coûte cher — mais savoir peut faire mal.'
          : 'Pose ta réserve. Trop bas tu brades, trop haut personne ne suit.'}
      >
        {item && standingOf(item) === 'douteux' && (
          <Card>
            <Row
              emoji="🔍"
              title="Faire expertiser"
              sub={appraiseBlocker(state, item) ?? `Un expert ne se trompe pas. ${money(state, appraisalCost(state))}.`}
              disabled={Boolean(appraiseBlocker(state, item))}
              onClick={() => run((ctx) => appraise(ctx, item.id, false), '🔍')}
              chevron
            />
            <Row
              emoji="👁️"
              title="Juger toi-même"
              sub={appraiseBlocker(state, item, true)
                ?? `Gratuit, et tu te trompes ${Math.round((1 - eyeAccuracy(state)) * 100)} fois sur cent.`}
              disabled={Boolean(appraiseBlocker(state, item, true))}
              onClick={() => run((ctx) => appraise(ctx, item.id, true), '👁️')}
              chevron
            />
          </Card>
        )}

        {item && (
          <>
            <Card pad>
              <div className="spread">
                <span className="small muted">Réserve</span>
                <span className="row-title">{money(state, asked)}</span>
              </div>
              <AmountPicker
                value={asked}
                max={range.high}
                onChange={setReserve}
                step={Math.max(1, Math.round((range.high - range.low) / 20))}
              />
              <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                {Math.round(saleOdds(state, item, asked) * 100)} % de chances que le marteau
                tombe. La salle prend sa commission même si personne ne suit.
              </p>
            </Card>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Button
                onClick={() => {
                  run((ctx) => auction(ctx, item.id, asked), '🔨');
                  setSelected(null);
                }}
              >
                Mettre en vente
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Sheet>
  );
}
