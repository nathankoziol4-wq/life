/**
 * Le portefeuille, et le marché.
 *
 * Le jeu savait déjà acheter une maison et une voiture ; il ne savait pas
 * placer un euro. « Investir » se résumait à un intérêt de 1,2 % appliqué en
 * silence à l'argent qui dormait sur le compte, que le joueur ne voyait ni ne
 * choisissait.
 *
 * L'écran répond à trois questions : **où en suis-je**, **qu'est-ce que je
 * détiens**, et **qu'est-ce que je peux acheter**. La troisième dépend de la
 * deuxième plus qu'on ne croit — ce qu'on comprend aux placements vient des
 * placements qu'on a déjà faits, et surtout de ceux qu'on a ratés.
 */

import { useState } from 'react';
import {
  AmountPicker, Button, Empty, Gauge, Meter, Modal, Pill, Sheet,
} from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money, moneyClass, signedMoney } from '../ui/format.ts';
import { ASSETS, CLASS_LABELS, getAsset, type AssetDef } from '../data/assets.ts';
import {
  adviceBlocker, adviceCost, adviceReady, advice, assetBlocker, assetInsight,
  concentration, consult, divest, holdingCost, holdingsOf, holdingValue, invest,
  isLocked, literacy, marketOf, minimumTicket, newsFor, portfolioValue,
  readNews, unlockYear, unrealizedGain,
} from '../systems/investing.ts';
import { economyLabel } from '../systems/markets.ts';

/**
 * Vingt ans de cours, en une ligne.
 *
 * Le moteur gardait déjà cet historique — vingt valeurs, du plus ancien au
 * plus récent — et personne ne l'avait jamais montré. Le joueur voyait la
 * variation de l'année et rien d'autre : impossible de distinguer un support
 * qui monte lentement d'un support qui vient de rebondir après une chute.
 *
 * Pas d'axes, pas de chiffres sur la courbe : ce qui se lit ici est une
 * forme, et les chiffres exacts sont déjà écrits à côté.
 */
function Sparkline({ history }: { history: number[] }) {
  const pts = history.slice(-20);
  if (pts.length < 2) return null;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const W = 100;
  const H = 28;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((v - lo) / span) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = pts.at(-1)! >= pts[0]!;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} fill="none" stroke={up ? 'var(--good)' : 'var(--bad)'} strokeWidth="2" />
    </svg>
  );
}

export function PortfolioScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [buying, setBuying] = useState<AssetDef | null>(null);
  const [selling, setSelling] = useState<AssetDef | null>(null);
  const [amount, setAmount] = useState(0);
  if (!state) return null;

  const p = state.player;
  const holdings = holdingsOf(state);
  const value = portfolioValue(state);
  const gain = unrealizedGain(state);
  const known = literacy(state);
  const spread = holdings.length > 1 ? 1 - concentration(state) : 0;

  const openBuy = (asset: AssetDef) => {
    setAmount(Math.min(p.money, Math.max(minimumTicket(state, asset), Math.round(p.money * 0.25))));
    setBuying(asset);
  };

  return (
    <Sheet title="Placements" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="small muted">Portefeuille</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px' }}>
              {money(state, value)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small muted">Latent</div>
            <div className={moneyClass(gain)} style={{ fontWeight: 800 }}>
              {signedMoney(state, gain)}
            </div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill>{economyLabel(state.world.economy)}</Pill>
          <Pill tone={known >= 50 ? 'good' : known >= 25 ? 'warn' : 'bad'}>
            Tu comprends {Math.round(known)} %
          </Pill>
          {holdings.length > 1 && (
            <Pill tone={spread > 0.55 ? 'good' : spread > 0.3 ? 'warn' : 'bad'}>
              Réparti {Math.round(spread * 100)} %
            </Pill>
          )}
        </div>
      </Card>

      {holdings.length === 0 ? (
        <Empty>
          Tu ne détiens rien. L’argent qui dort sur le compte rapporte à peine
          plus que rien, et l’inflation le mange.
        </Empty>
      ) : (
        <Section title="Ce que tu détiens">
          <Card>
            {holdings.map((holding) => {
              const asset = getAsset(holding.assetId);
              if (!asset) return null;
              const now = holdingValue(state, holding);
              const cost = holdingCost(holding);
              const diff = now - cost;
              const locked = isLocked(state, holding);
              return (
                <Row
                  key={holding.assetId}
                  emoji={asset.emoji}
                  title={asset.name}
                  sub={`${money(state, cost)} placés · ${
                    holding.units < 10
                      ? holding.units.toFixed(2)
                      : Math.round(holding.units)} parts · ${CLASS_LABELS[asset.klass]}`}
                  because={`Bloqué jusqu’en ${unlockYear(holding)} · ${
                    money(state, cost)} placés`}
                  right={(
                    <span className={moneyClass(diff)} style={{ fontWeight: 700 }}>
                      {money(state, now)}
                      <span className="small" style={{ display: 'block', textAlign: 'right' }}>
                        {signedMoney(state, diff)}
                      </span>
                    </span>
                  )}
                  closed={locked}
                  onClick={() => setSelling(asset)}
                  // Le chevron promettait un appui même sur une ligne bloquée,
                  // qui ne s'ouvrait pas : la flèche disait le contraire du
                  // comportement.
                  chevron={!locked}
                />
              );
            })}
          </Card>
          {holdings.length > 1 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Meter value={spread * 100} />
              </div>
              <p className="small muted" style={{ margin: '8px 4px 0' }}>
                Tout au même endroit, une seule mauvaise année suffit. Réparti,
                ce qui tombe est en partie compensé par ce qui monte — c’est la
                seule chose que ce marché donne gratuitement.
              </p>
            </>
          )}
        </Section>
      )}

      {/* ---------------- Ce qui se dit ---------------- */}
      {/* Placer était un pari aveugle : on choisissait, les cours bougeaient,
          et rien ne permettait de se faire une idée. Ces nouvelles portent un
          vrai signal — mesuré, le sens annoncé et le sens obtenu s'accordent
          à 64,5 %. Ce qui reste incertain n'est pas le fait, c'est ce qu'on
          arrive à en lire. */}
      <Section
        title="Ce qui se dit"
        sub="Trois nouvelles par an, sur trois supports. Ce dont on ne parle pas compte aussi."
      >
        <Card>
          {newsFor(state).map((item) => {
            const asset = getAsset(item.assetId);
            return (
              <Row
                key={item.id}
                emoji={asset?.emoji ?? '📰'}
                title={asset?.name ?? '—'}
                sub={item.text}
                right={<Pill tone={adviceReady(state) ? 'primary' : undefined}>
                  {adviceReady(state) ? advice(item) : readNews(state, item)}
                </Pill>}
              />
            );
          })}
        </Card>
        <Card>
          <Row
            emoji="🧑‍💼"
            title="Prendre l’avis de quelqu’un"
            sub="Il ne se trompe pas sur le sens. Reste à savoir ce qu’il gagne à te pousser."
            because={adviceBlocker(state)}
            right={<Pill tone="warn">{money(state, adviceCost(state))}</Pill>}
            closed={Boolean(adviceBlocker(state))}
            onClick={() => run((ctx) => consult(ctx), '🧑‍💼')}
            chevron={!adviceBlocker(state)}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ce que tu comprends d’une nouvelle dépend de ce que tu sais : sous
          trente, tu n’en tires rien ; entre trente et soixante-dix, tu lis un
          sens et tu te trompes parfois.
        </p>
      </Section>

      <Section title="Le marché">
        <Card>
          {ASSETS.map((asset) => {
            const blocker = assetBlocker(state, asset);
            const market = marketOf(state, asset.id);
            const insight = assetInsight(state, asset);
            const move = market.lastChange;
            return (
              <Row
                key={asset.id}
                emoji={asset.emoji}
                title={asset.name}
                sub={`${insight.risk} · ${insight.horizon}`}
                because={blocker}
                right={(
                  <span style={{ textAlign: 'right' }}>
                    <Pill tone={move > 0.02 ? 'good' : move < -0.02 ? 'bad' : undefined}>
                      {move >= 0 ? '+' : ''}{Math.round(move * 100)} %
                    </Pill>
                  </span>
                )}
                closed={Boolean(blocker)}
                onClick={() => openBuy(asset)}
                chevron={!blocker}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Supports fictifs, cours fictifs. Rien ici ne décrit un marché réel et
          rien n’y constitue un conseil.
        </p>
      </Section>

      {known < 55 && (
        <Section title="Ce que tu ne comprends pas encore">
          <Card pad>
            <Gauge value={known} />
            <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
              Les supports compliqués sont précisément ceux où l’on perd de
              l’argent sans savoir pourquoi. Ça vient avec les études, avec
              l’âge, en plaçant — et d’un coup après une perte sèche.
            </p>
          </Card>
        </Section>
      )}

      <Modal
        open={Boolean(buying)}
        onClose={() => setBuying(null)}
        icon={buying?.emoji}
        title={buying?.name}
      >
        {buying && (
          <>
            <p style={{ margin: '0 0 10px', lineHeight: 1.55 }}>{buying.description}</p>
            <div className="chips" style={{ marginBottom: 12 }}>
              <Pill>{assetInsight(state, buying).risk}</Pill>
              <Pill>{assetInsight(state, buying).horizon}</Pill>
              <Pill>ticket {money(state, minimumTicket(state, buying))}</Pill>
            </div>
            <Sparkline history={marketOf(state, buying.id).history} />
            {assetInsight(state, buying).detail && (
              <p className="small muted" style={{ margin: '0 0 12px' }}>
                {assetInsight(state, buying).detail}
              </p>
            )}
            <AmountPicker
              value={amount}
              max={p.money}
              step={Math.max(1, Math.round(minimumTicket(state, buying) / 10))}
              onChange={setAmount}
            />
            <div style={{ marginTop: 14 }}>
              <Button
                onClick={() => {
                  const asset = buying;
                  setBuying(null);
                  run((ctx) => invest(ctx, asset.id, amount), asset.emoji);
                }}
                disabled={amount < minimumTicket(state, buying)}
              >
                Placer {money(state, amount)}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {selling && (
        <SellModal
          asset={selling}
          onClose={() => setSelling(null)}
          onSell={(share) => {
            const asset = selling;
            setSelling(null);
            run((ctx) => divest(ctx, asset.id, share), asset.emoji);
          }}
        />
      )}
    </Sheet>
  );
}

function SellModal({ asset, onClose, onSell }: {
  asset: AssetDef;
  onClose: () => void;
  onSell: (share: number) => void;
}) {
  const { state } = useGame();
  const [share, setShare] = useState(100);
  if (!state) return null;
  const holding = holdingsOf(state).find((h) => h.assetId === asset.id);
  if (!holding) return null;
  const now = holdingValue(state, holding);
  const cost = holdingCost(holding);

  return (
    <Modal open onClose={onClose} icon={asset.emoji} title={`Vendre — ${asset.name}`}>
      <div className="spread small" style={{ marginBottom: 10 }}>
        <span>Valeur actuelle</span>
        <strong>{money(state, now)}</strong>
      </div>
      <div className="spread small" style={{ marginBottom: 10 }}>
        <span>Prix de revient</span>
        <strong>{money(state, cost)}</strong>
      </div>
      <div className="spread small" style={{ marginBottom: 14 }}>
        <span>Résultat si tu vends tout</span>
        <strong className={moneyClass(now - cost)}>{signedMoney(state, now - cost)}</strong>
      </div>
      <AmountPicker value={share} max={100} step={5} onChange={setShare} />
      <div style={{ marginTop: 14 }}>
        <Button onClick={() => onSell(share / 100)}>Vendre {share} %</Button>
      </div>
      <p className="small muted" style={{ margin: '12px 0 0' }}>
        Les frais sont prélevés à la vente, et l’impôt ne porte que sur la
        plus-value. Vendre à perte ne coûte pas d’impôt — ça coûte autre chose.
      </p>
    </Modal>
  );
}
