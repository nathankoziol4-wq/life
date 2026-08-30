/**
 * Écran « Fonder une famille ».
 *
 * Il remplace deux lignes qui mentaient : « Traitement de fertilité —
 * augmente fortement les chances de conception », qui les augmentait pour le
 * reste de la vie en un seul achat, et « Adopter un enfant — procédure longue
 * et sélective », qui se résolvait par un tirage dans la seconde.
 *
 * Ce que l'écran doit rendre visible n'est donc pas ce qu'on peut acheter,
 * c'est **ce que ça demande** :
 *
 * 1. **Le protocole**, avec ce qu'il rend *cette année-là* et ce qu'il a déjà
 *    coûté en tout. Un joueur qui ne verrait pas le total dépensé ne
 *    s'apercevrait jamais qu'il en est à son sixième.
 * 2. **Le dossier**, avec son étape, et — quand il est ouvert — ce que
 *    l'attente demande encore.
 * 3. **Ce qui pèse sur le dossier**, ligne par ligne et signé. C'est la
 *    différence entre un dossier et un tirage : on voit ce qui manque, donc on
 *    peut aller le chercher.
 * 4. **Ce qu'on accepte d'accueillir**, avec l'attente que chaque choix donne,
 *    calculée pour ce dossier-ci et non en général.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { OPENNESS, STAGE_YEARS } from '../data/parenthood.ts';
import {
  cycleBlocker, cycleBoost, cycleCost, expectedWait, fileFactors, fileFee,
  fileLine, fileOf, fileStrength, openBlocker, openFile, parenthoodOf, runCycle,
  setOpenness, withdrawFile,
} from '../systems/parenthood.ts';

export function ParenthoodScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const held = parenthoodOf(state);
  const file = fileOf(state);
  const why = cycleBlocker(state);
  const cost = cycleCost(state);
  const strength = fileStrength(state);
  const factors = fileFactors(state);
  const open = file && file.stage !== 'refusé' && file.stage !== 'arrivé';

  return (
    <Sheet title="Fonder une famille" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Deux chemins quand un enfant ne vient pas. Les deux sont longs et
          chers, et une vie n’a ni le temps ni l’argent de les prendre tous les
          deux à fond.
        </p>
        {(held.cycles > 0 || held.arrived > 0) && (
          <div className="chips" style={{ marginTop: 12 }}>
            {held.cycles > 0 && <Pill>{held.cycles} protocole(s)</Pill>}
            {held.spent > 0 && <Pill tone="warn">{money(state, held.spent)} dépensés</Pill>}
            {held.arrived > 0 && <Pill tone="good">{held.arrived} arrivé(s)</Pill>}
          </div>
        )}
      </Card>

      <Section title="Le protocole">
        <Card>
          <Row
            emoji="🌱"
            title="Engager un protocole pour l’année"
            // Ce qu'il rend **cette année-là** : c'était un achat unique dont
            // l'effet ne s'arrêtait jamais, et rien à l'écran ne le disait.
            sub={held.lastCycle === state.year
              ? `En cours : ${Math.round((cycleBoost(state) - 1) * 100)} % de chances en plus cette année`
              : held.cycles === 0
                ? 'Un an, et un seul. Il aide l’essai de l’année, il ne le remplace pas'
                : `Le ${held.cycles + 1}e rendra moins que le premier`}
            right={money(state, cost)}
            closed={Boolean(why)}
            because={why}
            onClick={() => run((ctx) => runCycle(ctx), '🌱')}
            chevron={!why}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Il faut encore essayer d’avoir un enfant dans l’année : le protocole
          améliore la tentative, il n’en tient pas lieu.
        </p>
      </Section>

      <Section title="Le dossier">
        <Card>
          <Row
            emoji="📁"
            title={open ? 'Où en est ton dossier' : 'Aucun dossier ouvert'}
            sub={fileLine(state)}
            right={open
              ? <Pill tone={file!.stage === 'attente' ? 'primary' : undefined}>
                {file!.stage}
              </Pill>
              : undefined}
          />
          {open && (
            <Row
              emoji="🚪"
              title="Retirer ton dossier"
              sub="Les frais sont perdus, et rouvrir repart du début"
              onClick={() => run((ctx) => withdrawFile(ctx), '🚪')}
              chevron
            />
          )}
        </Card>
      </Section>

      {/* Ce qui pèse, nommé et signé. Sans cette section, un refus ne serait
          qu'un tirage perdu ; avec elle, c'est quelque chose qu'on peut aller
          corriger — se marier, acheter, sortir d'une dépendance. */}
      <Section title="Ce que les services regardent">
        <Card pad>
          <div style={{ marginBottom: 10 }}>
            <Meter value={strength * 100} />
          </div>
          <div className="chips" style={{ marginBottom: 4 }}>
            <Pill tone={strength > 0.6 ? 'good' : strength > 0.4 ? 'warn' : 'bad'}>
              dossier {Math.round(strength * 100)} / 100
            </Pill>
          </div>
          {factors.map((f) => (
            <div key={f.label} className="spread" style={{ padding: '4px 0' }}>
              <span className="small">{f.label}</span>
              <span className="small" style={{ color: f.weight >= 0 ? 'var(--good, green)' : 'var(--bad, crimson)' }}>
                {f.weight >= 0 ? '+' : '−'}{Math.abs(Math.round(f.weight * 100))}
              </span>
            </div>
          ))}
        </Card>
      </Section>

      <Section title={open ? 'Ce que tu acceptes' : 'Ouvrir un dossier'}>
        {OPENNESS.length === 0 ? (
          <Empty>Rien à demander.</Empty>
        ) : (
          <Card>
            {OPENNESS.map((o) => {
              const blocked = open ? null : openBlocker(state, o.id);
              const wait = expectedWait(state, o.id);
              const current = file?.openTo === o.id && open;
              return (
                <Row
                  key={o.id}
                  emoji={o.emoji}
                  title={o.label}
                  // L'attente calculée pour **ce** dossier : c'est le nombre
                  // sur lequel se prend la décision, et il dépend autant de ce
                  // qu'on accepte que de ce que vaut le dossier.
                  sub={`${wait} an(s) d’attente · ${o.line}`}
                  right={current
                    ? <Pill tone="primary">demandé</Pill>
                    : open ? undefined : money(state, fileFee(state))}
                  closed={Boolean(blocked) || Boolean(current)}
                  because={current ? 'C’est déjà ce que tu demandes.' : blocked}
                  onClick={() => run(
                    (ctx) => (open ? setOpenness(ctx, o.id) : openFile(ctx, o.id)),
                    o.emoji,
                  )}
                  chevron={!blocked && !current}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          {open
            ? 'Changer ce que tu acceptes ne remet pas l’attente à zéro : les années déjà passées comptent.'
            : `Constitution puis enquête : ${STAGE_YEARS.dossier + STAGE_YEARS.enquête} ans avant même de commencer à attendre. L’enquête peut refuser, et elle dira pourquoi.`}
        </p>
      </Section>
    </Sheet>
  );
}
