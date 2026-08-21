/**
 * Travailler pour soi.
 *
 * Deux écrans en un, parce que ce sont deux métiers différents.
 *
 * **À son compte** : l'écran est construit autour du tarif, parce que c'est
 * la seule décision qui compte. Il montre côte à côte ce que le tarif promet
 * et ce qu'on sait faire, et laisse le joueur en tirer les conclusions —
 * jamais un conseil, jamais un chiffre de réussite.
 *
 * **L'entreprise** : l'écran est construit autour de l'écart entre ce que la
 * maison peut produire et ce que le marché veut. Les deux barres sont
 * affichées ensemble parce que c'est leur différence, et elle seule, qui dit
 * s'il faut embaucher, baisser les prix ou fermer.
 */

import { useState } from 'react';
import {
  AmountPicker, Button, Empty, Field, Gauge, Meter, Pill,
  Segmented, Sheet, meterColor,
} from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import {
  BUSINESS_KINDS, INVOLVEMENT, PRICING, TRADES,
  getBusinessKind, getTrade, type Involvement, type Pricing,
} from '../data/ventures.ts';
import {
  GIG_LIMIT, borrowable, businessValue, closeBusiness, craftDelivered, dismissManager,
  drawFromBusiness, expectedMissions, expectedRevenue, feePromise, forecast, foundBlocker,
  foundBusiness, gigBlocker, hireManager, hireStaff, injectIntoBusiness, investInBusiness,
  layOffStaff, listBusiness, managerOf, managerWage, marketFee, sellBusiness, setFee,
  setInvolvement, setPricing, startFreelance, startupCost, stopFreelance, takeGig,
  timeBudget, tradeBlocker, wageOf,
} from '../systems/venture.ts';

type Tab = 'compte' | 'entreprise';

export function VentureScreen({ onBack, start = 'compte' }: {
  onBack: () => void;
  /** L'onglet d'arrivée : c'est la ligne cliquée qui le décide. */
  start?: Tab;
}) {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>(start);
  if (!state) return null;

  return (
    <Sheet title="À ton compte" onBack={onBack}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'compte', label: 'Ton métier' },
          { value: 'entreprise', label: 'Ton entreprise' },
        ]}
      />
      {tab === 'compte' ? <FreelancePane /> : <BusinessPane />}
    </Sheet>
  );
}

/* ================================================================== */
/* À SON COMPTE                                                        */
/* ================================================================== */

function FreelancePane() {
  const { state, run } = useGame();
  const [picking, setPicking] = useState(false);
  if (!state) return null;
  const p = state.player;
  const f = p.freelance;
  const trade = f ? getTrade(f.tradeId) : undefined;

  if (!f || !trade || picking) {
    return <TradePicker onDone={() => setPicking(false)} switching={Boolean(f)} />;
  }

  const market = marketFee(state, trade);
  const promise = feePromise(state, f);
  const delivered = craftDelivered(state, f);
  const missions = Math.round(expectedMissions(state, f));
  const revenue = expectedRevenue(state, f);
  const gigsLeft = GIG_LIMIT - Number(p.yearActions.gig ?? 0);
  const blocker = gigBlocker(state);
  const free = Math.round(timeBudget(state) * 100);

  return (
    <>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{trade.emoji} {trade.label}</div>
            <div className="row-sub">À ton compte depuis {state.year - f.since} an(s)</div>
          </div>
          <strong>{money(state, f.lastRevenue)}</strong>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
          {f.lastRevenue > 0
            ? `L’an dernier : ${f.lastMissions} prestation(s) pour ${money(state, f.lastRevenue)}.`
            : 'Aucun exercice complet pour l’instant.'}
        </p>
      </Card>

      {/* ---- Le tarif, qui est tout le jeu ---- */}
      <Section title="Ton tarif">
        <Card>
          <div className="card-pad">
            <Field label={`${money(state, f.fee)} la prestation · le marché est à ${money(state, market)}`}>
              <AmountPicker
                value={f.fee}
                max={Math.round(market * 3.2)}
                step={Math.max(1, Math.round(market / 40))}
                onChange={(v) => run((ctx) => setFee(ctx, v))}
              />
            </Field>
            <div className="spread small muted" style={{ marginTop: 14 }}>
              <span>Ce que ton prix promet</span>
              <span>{Math.round(promise)}</span>
            </div>
            <Meter value={promise} tone={promise > delivered + 12 ? 'var(--bad)' : undefined} />
            <div className="spread small muted" style={{ marginTop: 10 }}>
              <span>Ce que tu livres</span>
              <span>{Math.round(delivered)}</span>
            </div>
            <Meter value={delivered} />
            <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              {promise > delivered + 14
                ? 'Tu demandes plus que ce que tu sais faire. Les clients le voient à la livraison, pas avant : ils ne reviennent pas.'
                : delivered > promise + 18
                  ? 'Tu vaux nettement plus que ce que tu factures. Le bouche-à-oreille marche fort, et tes journées sont longues.'
                  : 'Ton prix et ton travail sont à peu près au même niveau.'}
            </p>
          </div>
        </Card>
      </Section>

      <Section title="L’année qui vient">
        <Card>
          <Row emoji="📅" title="Prestations attendues" sub={`Au tarif actuel, dans ce quartier`} right={<strong>{missions}</strong>} />
          <Row emoji="💰" title="Chiffre attendu" sub="Hors commandes prises à la main" right={<strong>{money(state, revenue)}</strong>} />
          <Row
            emoji="⏳"
            title="Temps disponible"
            sub={free < 12 ? 'Il ne reste que quelques soirs : ton emploi et tes études prennent tout'
              : free < 30 ? 'Le reste de ta vie prend la plus grande part'
                : free < 60 ? 'Il te reste des soirs et des week-ends' : 'Tes journées sont à toi'}
            right={<Gauge value={free} />}
          />
          <Row
            emoji="🤝"
            title="Clientèle"
            sub={f.disputes > 0 ? `${f.disputes} litige(s) qui circulent encore` : 'Ceux qui reviennent et qui en parlent'}
            right={<Gauge value={f.clientele} />}
          />
          <Row emoji="🎯" title="Savoir-faire" sub="Il ne vient qu’en travaillant" right={<Gauge value={f.craft} />} />
        </Card>
      </Section>

      {/* ---- Les commandes ---- */}
      <Section title={`Commandes (${gigsLeft} possible(s) cette année)`}>
        {f.offers.length === 0 ? (
          <Empty>Personne ne t’a contacté cette année.</Empty>
        ) : (
          <Card>
            {f.offers.map((gig) => {
              const margin = delivered - gig.demand;
              return (
                <Row
                  key={gig.id}
                  emoji={margin > 14 ? '🟢' : margin > -14 ? '🟡' : '🔴'}
                  title={gig.label}
                  sub={`${gig.client} · ${gig.hint}`}
                  right={<Pill tone={gig.fee > market * 2 ? 'good' : undefined}>{money(state, gig.fee)}</Pill>}
                  onClick={() => run((ctx) => takeGig(ctx, gig.id), trade.emoji)}
                  closed={Boolean(blocker)}
                  because={blocker}
                  chevron
                />
              );
            })}
          </Card>
        )}
        {/* La raison portait ici, sous la carte, pendant que chaque ligne
            refusée se taisait. Elle est maintenant sur les lignes ; ce
            paragraphe ne sert plus que quand il n'y en a aucune, pour que
            l'explication atteigne le joueur exactement une fois. */}
        {blocker && f.offers.length === 0 && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>{blocker}</p>
        )}
        <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
          La pastille compare ce que le client attend à ce que tu sais faire. Elle
          ne dit pas si l’affaire est bonne : c’est souvent le client le plus
          exigeant qui paie le mieux.
        </p>
      </Section>

      <Section title="Changer">
        <Card>
          <Row emoji="🔁" title="Changer de métier" sub="Tu repars presque de zéro" onClick={() => setPicking(true)} chevron />
          <Row emoji="🚪" title="Arrêter" sub="Plus de clients, plus de revenus" onClick={() => run((ctx) => stopFreelance(ctx), '🚪')} chevron />
        </Card>
      </Section>
    </>
  );
}

function TradePicker({ onDone, switching }: { onDone: () => void; switching: boolean }) {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          {switching
            ? 'Changer de métier, c’est laisser derrière soi les clients et une bonne partie du savoir-faire.'
            : 'Personne ne t’embauche, ou personne ne t’embauche à ce que tu veux faire. Tu peux vendre ton temps toi-même.'}
        </p>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
          Chaque métier a ses clients et sa façon de réagir au prix. Certains
          acceptent qu’on soit cher, d’autres partent au premier euro de trop.
          Ce n’est écrit nulle part.
        </p>
      </Card>
      <Section title={`Métiers (${TRADES.length})`}>
        <Card>
          {TRADES.map((trade) => {
            const blocker = tradeBlocker(state, trade);
            return (
              <Row
                key={trade.id}
                emoji={trade.emoji}
                title={trade.label}
                sub={trade.pitch}
                right={<Pill>{money(state, marketFee(state, trade))}</Pill>}
                closed={Boolean(blocker)}
                because={blocker}
                onClick={() => {
                  onDone();
                  run((ctx) => startFreelance(ctx, trade.id), trade.emoji);
                }}
                chevron
              />
            );
          })}
        </Card>
      </Section>
      {switching && (
        <Section title="">
          <Card>
            <Row emoji="↩️" title="Finalement, non" sub="Garder le métier actuel" onClick={onDone} chevron />
          </Card>
        </Section>
      )}
    </>
  );
}

/* ================================================================== */
/* L'ENTREPRISE                                                        */
/* ================================================================== */

function BusinessPane() {
  const { state, run } = useGame();
  const [amount, setAmount] = useState(0);
  if (!state) return null;
  const p = state.player;
  const b = p.business;

  if (!b) return <BusinessPicker />;
  const kind = getBusinessKind(b.kindId);
  if (!kind) return <Empty>Entreprise introuvable.</Empty>;

  const view = forecast(state);
  const value = businessValue(state);
  const manager = managerOf(state);
  const wage = wageOf(state, kind);
  const tight = view.demand > view.capacity * 1.15;
  const idle = view.capacity > view.demand * 1.2;
  const scale = Math.max(view.capacity, view.demand, 1);

  return (
    <>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{kind.emoji} {b.name}</div>
            <div className="row-sub">{kind.label} · ouverte en {b.foundedYear}</div>
          </div>
          <strong style={{ color: view.profit >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {money(state, view.profit)}
          </strong>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">Caisse {money(state, b.cash)}</Pill>
          <Pill>{b.staff} salarié(s)</Pill>
          {b.debt > 0 && <Pill tone="bad">Dette {money(state, b.debt)}</Pill>}
          {b.distress > 0 && <Pill tone="warn">{b.distress} exercice(s) dans le rouge</Pill>}
        </div>
      </Card>

      {/* ---- L'écart capacité / demande : le cœur de la décision ---- */}
      <Section title="Ce que tu peux faire, ce qu’on te demande">
        <Card>
          <div className="card-pad">
            <div className="spread small muted">
              <span>Capacité</span>
              <span>{money(state, view.capacity)}</span>
            </div>
            <Meter value={(view.capacity / scale) * 100} tone={meterColor(idle ? 30 : 75)} />
            <div className="spread small muted" style={{ marginTop: 10 }}>
              <span>Demande</span>
              <span>{money(state, view.demand)}</span>
            </div>
            <Meter value={(view.demand / scale) * 100} tone={meterColor(tight ? 30 : 75)} />
            <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              {tight
                ? 'Il y a plus de monde que tu ne peux servir. Chaque client refusé est du chiffre qui va ailleurs — il faudrait des bras, ou des prix plus hauts.'
                : idle
                  ? 'Tu paies des salaires pour une capacité que personne ne demande. Il faudrait se faire connaître, baisser les prix, ou alléger l’équipe.'
                  : 'Ta capacité et ta demande se répondent. C’est là que la maison gagne le plus.'}
            </p>
          </div>
        </Card>
        <Card>
          <Row emoji="⭐" title="Notoriété" sub="Ce que les gens savent que tu existes" right={<Gauge value={b.renown} />} />
          <Row emoji="✨" title="Qualité" sub="Ce qui sort de la maison" right={<Gauge value={b.quality} />} />
          <Row emoji="🏷️" title="Valeur de reprise" sub="Ce qu’un repreneur paierait" right={<strong>{money(state, value)}</strong>} />
        </Card>
      </Section>

      {/* ---- Les leviers ---- */}
      <Section title="Tes prix">
        <Card>
          <div className="card-pad">
            <Segmented
              value={b.pricing}
              onChange={(v: Pricing) => run((ctx) => setPricing(ctx, v))}
              options={[
                { value: 'bas', label: 'Serrés' },
                { value: 'normal', label: 'Normaux' },
                { value: 'haut', label: 'Élevés' },
              ]}
            />
            <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
              {PRICING[b.pricing].note}
            </p>
          </div>
        </Card>
      </Section>

      <Section title="Ta place dedans">
        <Card>
          <div className="card-pad">
            <Segmented
              value={b.involvement}
              onChange={(v: Involvement) => run((ctx) => setInvolvement(ctx, v))}
              options={[
                { value: 'absent', label: 'De loin' },
                { value: 'présent', label: 'Tous les jours' },
                { value: 'total', label: 'Que ça' },
              ]}
            />
            <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
              {INVOLVEMENT[b.involvement].note}
            </p>
          </div>
        </Card>
      </Section>

      <Section title="L’équipe">
        <Card>
          <Row
            emoji="➕"
            title="Embaucher"
            sub={`${money(state, wage)} par an et par personne, quoi qu’il arrive`}
            right={<Pill>{b.staff}</Pill>}
            onClick={() => run((ctx) => hireStaff(ctx, 1), '➕')}
            chevron
          />
          <Row
            emoji="➖"
            title="Licencier"
            sub="Des indemnités, et une réputation qui en prend un coup"
            closed={b.staff === 0}
            because="Tu es seul dans la maison — il n’y a personne à licencier."
            onClick={() => run((ctx) => layOffStaff(ctx, 1), '➖')}
            chevron
          />
          {manager ? (
            <>
              <Row
                emoji={avatarFor(manager)}
                title={manager.firstName}
                sub={`Gérant · ${money(state, managerWage(state, kind))} par an`}
                right={<Gauge value={manager.opinion} />}
              />
              <Row emoji="🚪" title="Remercier le gérant" sub="Tu reprends la maison en main" onClick={() => run((ctx) => dismissManager(ctx), '🚪')} chevron />
            </>
          ) : (
            <Row
              emoji="🎩"
              title="Recruter un gérant"
              sub={`${money(state, managerWage(state, kind))} par an — le seul moyen de t’absenter sans que tout se délite`}
              onClick={() => run((ctx) => hireManager(ctx), '🎩')}
              chevron
            />
          )}
        </Card>
      </Section>

      <Section title="L’argent">
        <Card>
          <div className="card-pad">
            <Field label={`Somme · caisse ${money(state, b.cash)}, ton compte ${money(state, p.money)}`}>
              <AmountPicker
                value={amount}
                max={Math.max(1, Math.round(b.cash + p.money))}
                step={Math.max(1, Math.round((b.cash + p.money) / 100))}
                onChange={setAmount}
              />
            </Field>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <Button small variant="secondary" onClick={() => run((ctx) => investInBusiness(ctx, amount, 'qualité'), '🛠️')}>
                Investir
              </Button>
              <Button small variant="secondary" onClick={() => run((ctx) => investInBusiness(ctx, amount, 'notoriété'), '📣')}>
                Se faire connaître
              </Button>
            </div>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <Button small variant="ghost" onClick={() => run((ctx) => drawFromBusiness(ctx, amount), '💶')}>
                Se verser
              </Button>
              <Button small variant="ghost" onClick={() => run((ctx) => injectIntoBusiness(ctx, amount), '💼')}>
                Remettre au pot
              </Button>
            </div>
            <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              La caisse est ce qui absorbe la mauvaise année. Ce que tu te verses
              est à toi et sera imposé ; ce que tu laisses dedans ne l’est pas
              encore.
            </p>
          </div>
        </Card>
      </Section>

      {b.history.length > 0 && (
        <Section title="Les exercices">
          <Card>
            {b.history.slice(0, 6).map((h) => (
              <Row
                key={h.year}
                emoji={h.profit >= 0 ? '📈' : '📉'}
                title={String(h.year)}
                sub={`${money(state, h.revenue)} de chiffre`}
                right={<Pill tone={h.profit >= 0 ? 'good' : 'bad'}>{money(state, h.profit)}</Pill>}
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="En sortir">
        {b.offers.length > 0 ? (
          <Card>
            {b.offers.map((offer) => (
              <Row
                key={offer.id}
                emoji="🤝"
                title={offer.buyer}
                sub={offer.catch ?? 'Aucune condition : net et immédiat'}
                right={<strong>{money(state, offer.price)}</strong>}
                onClick={() => run((ctx) => sellBusiness(ctx, offer.id), '🤝')}
                chevron
              />
            ))}
          </Card>
        ) : (
          <Card>
            <Row
              emoji="🏷️"
              title="Chercher un repreneur"
              sub={`Autour de ${money(state, value)}, selon ce que tu acceptes de concéder`}
              onClick={() => run((ctx) => listBusiness(ctx), '🏷️')}
              chevron
            />
          </Card>
        )}
        <Card>
          <Row
            emoji="🔒"
            title="Fermer"
            sub={b.debt > 0 ? 'Une part des dettes te suivrait personnellement' : 'Liquider ce qui peut l’être'}
            onClick={() => run((ctx) => closeBusiness(ctx), '🔒')}
            chevron
          />
        </Card>
      </Section>
    </>
  );
}

function BusinessPicker() {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          Ouvrir, c’est mettre son argent et celui de la banque sur une idée,
          puis découvrir chaque année si le marché en veut.
        </p>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
          {state.player.money > 0
            ? `Ce que tu mets décide de ce qu’on te prête : avec ${money(state, state.player.money)} d’épargne, une banque suivra jusqu’à ${money(state, borrowable(state, BUSINESS_KINDS[0]))} de plus.`
            : 'Sans apport, personne ne prête. C’est la première marche, et c’est la plus haute.'}
        </p>
      </Card>
      <Section title={`Ce que tu peux ouvrir (${BUSINESS_KINDS.length})`}>
        <Card>
          {BUSINESS_KINDS.map((kind) => {
            const blocker = foundBlocker(state, kind);
            return (
              <Row
                key={kind.id}
                emoji={kind.emoji}
                title={kind.label}
                sub={kind.what}
                right={<Pill tone={blocker ? undefined : 'primary'}>{money(state, startupCost(state, kind))}</Pill>}
                closed={Boolean(blocker)}
                because={blocker}
                onClick={() => run((ctx) => foundBusiness(ctx, kind.id), kind.emoji)}
                chevron
              />
            );
          })}
        </Card>
      </Section>
    </>
  );
}
