/**
 * Les collections : ce qu'une vie a accumulé, et ce qu'une famille a gardé.
 *
 * Deux natures de choses, et l'écran ne les mélange pas.
 *
 * **Les objets de famille** sont le seul contenu propre à cet écran : on les
 * cherche, on les tient, on les vend, on les transmet. Ils traversent les
 * générations.
 *
 * **Le reste** existait déjà partout dans le jeu sans jamais être rassemblé :
 * les métiers tenus, les véhicules, les biens, les animaux, les distinctions,
 * les titres. Les montrer ici ne crée rien — cela rend visible ce que la
 * partie sait déjà, ce qui est exactement ce qui manquait.
 */

import { useState } from 'react';
import { Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { attic, type AtticState } from '../systems/minigames/attic.ts';
import {
  ageLabel, ageOf, autoSearch, conditionLabel, give, giveBlocker, heirloomWorth,
  heirloomsOf, restore, restoreBlocker, restoreCost, searchBlocker,
  searchContext, sell, settleSearch, valueOf,
} from '../systems/heirlooms.ts';
import { getHeirloomKind, HEIRLOOM_KINDS } from '../data/heirlooms.ts';
import { earnedRibbons } from '../systems/ribbons.ts';
import { getKeepsake, keepsakesOf } from '../systems/occasions.ts';
import { ribbonLabel } from '../data/ribbons.ts';
import { peopleByRelation } from '../engine/context.ts';
import type { Heirloom } from '../engine/types.ts';

export function CollectionScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [digging, setDigging] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [giving, setGiving] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const items = heirloomsOf(state);

  /* --- Le grenier --- */
  if (digging) {
    return (
      <Sheet title="Le grenier" onBack={() => setDigging(false)}>
        <MiniGameHost
          key={`attic-${seed}`}
          def={attic}
          context={searchContext(state)}
          seed={seed}
          render={(s: AtticState) => <DarkRoom state={s} />}
          onFinish={(_s, result) => {
            run((ctx) => settleSearch(ctx, result), '🔦');
            setDigging(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Déplace le doigt : la lampe suit. Maintiens pour élargir le halo —
          tu verras plus loin et la pile partira plus vite. Un appui bref
          fouille l’endroit éclairé, et tu n’as que trois fouilles. Ce n’est
          pas parce que la lampe s’avive qu’il y a ce que tu cherches.
        </p>
      </Sheet>
    );
  }

  /* --- Une pièce en particulier --- */
  const shown = open ? items.find((i) => i.id === open) : null;
  if (shown) {
    const kind = getHeirloomKind(shown.kindId);
    const years = ageOf(state, shown);
    const family = peopleByRelation(state, [
      'son', 'daughter', 'brother', 'sister', 'spouse', 'partner', 'friend',
      'bestFriend', 'father', 'mother',
    ]).filter((x) => x.alive);
    return (
      <Sheet title={kind?.label ?? 'Un objet'} onBack={() => { setOpen(null); setGiving(null); }}>
        <Card pad>
          <div style={{ fontSize: 44, textAlign: 'center' }}>{kind?.emoji}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {kind?.story}
          </p>
          <div className="chips" style={{ marginTop: 14, justifyContent: 'center' }}>
            <Pill tone={years >= 120 ? 'good' : 'primary'}>{ageLabel(years)}</Pill>
            <Pill>{years} an(s) dans la famille</Pill>
            <Pill tone={shown.condition < 40 ? 'bad' : shown.condition < 70 ? 'warn' : 'good'}>
              {conditionLabel(shown.condition)}
            </Pill>
            {shown.restorations > 0 && (
              <Pill tone={shown.restorations >= 3 ? 'warn' : undefined}>
                {shown.restorations} reprise(s)
              </Pill>
            )}
          </div>
          <div style={{ marginTop: 12 }}><Meter value={shown.condition} /></div>
          <div className="spread" style={{ marginTop: 12 }}>
            <span className="small muted">Ce qu’on t’en donnerait</span>
            <strong>{money(state, valueOf(state, shown))}</strong>
          </div>
        </Card>

        <Section title="Ce qu’il a traversé">
          <Card>
            {shown.history.map((line, i) => (
              <Row key={i} emoji="·" title={String(line.year)} sub={line.text} />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            {shown.generations} génération(s) l’ont tenu. Le premier était{' '}
            {shown.founder}.
          </p>
        </Section>

        <Section title="Ce que tu peux en faire">
          <Card>
            <Row
              emoji="🛠️"
              title="Le faire reprendre"
              sub={restoreBlocker(state, shown)
                ?? 'Ça le sauve, et il ne redevient jamais tout à fait l’original'}
              right={<Pill tone="warn">{money(state, restoreCost(state, shown))}</Pill>}
              disabled={Boolean(restoreBlocker(state, shown))}
              onClick={restoreBlocker(state, shown) ? undefined : () => run(
                (ctx) => restore(ctx, shown.id), '🛠️',
              )}
              chevron={!restoreBlocker(state, shown)}
            />
            <Row
              emoji="🎁"
              title="Le donner"
              sub={giveBlocker(state) ?? 'Il sort de la famille, et quelqu’un s’en souviendra'}
              disabled={Boolean(giveBlocker(state))}
              onClick={giveBlocker(state) ? undefined : () => setGiving(
                giving === shown.id ? null : shown.id,
              )}
              chevron={!giveBlocker(state)}
            />
            <Row
              emoji="💰"
              title="Le vendre"
              sub={years > 60
                ? `Il est là depuis ${years} ans. Tu le sais en le disant.`
                : 'Personne ne s’en apercevra'}
              right={<Pill tone="good">{money(state, valueOf(state, shown))}</Pill>}
              onClick={() => {
                run((ctx) => sell(ctx, shown.id), '💰');
                setOpen(null);
              }}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Tu n’as rien à faire pour le transmettre : ce que tu gardes passe à
            celui qui reprend la lignée.
          </p>
        </Section>

        {giving === shown.id && (
          <Section title="À qui ?">
            <Card>
              {family.length === 0 ? (
                <Empty>Il n’y a personne à qui le donner.</Empty>
              ) : family.map((who) => (
                <Row
                  key={who.id}
                  emoji="🧑"
                  title={`${who.firstName} ${who.lastName}`}
                  sub={`${who.relation} · relation ${Math.round(who.relationship)}`}
                  onClick={() => {
                    run((ctx) => give(ctx, shown.id, who.id), '🎁');
                    setGiving(null);
                    setOpen(null);
                  }}
                  chevron
                />
              ))}
            </Card>
          </Section>
        )}
      </Sheet>
    );
  }

  /* --- Le sommaire --- */
  const vehicles = p.vehicles.map((v) => `${v.brand} ${v.model}`);
  const ribbons = earnedRibbons(state).filter((r) => r.id !== 'ordinaire');
  const found = new Set(items.map((i) => i.kindId));

  return (
    <Sheet title="Collections" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {items.length} objet(s) de famille
            </strong>
            <div className="small muted">
              {found.size}/{HEIRLOOM_KINDS.length} sortes connues
            </div>
          </div>
          <strong style={{ fontSize: 17 }}>{money(state, heirloomWorth(state))}</strong>
        </div>
        <div style={{ marginTop: 10 }}>
          <Meter value={(found.size / HEIRLOOM_KINDS.length) * 100} />
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Un objet gardé longtemps vaut plus qu’un bel objet acheté hier. C’est
          le seul placement qui demande de la patience et non de l’argent.
        </p>
      </Card>

      {/* ---------------- Les objets ---------------- */}
      <Section title="Ce que la famille a gardé">
        {items.length === 0 ? (
          <Empty>Rien pour l’instant. Il faudrait monter voir là-haut.</Empty>
        ) : (
          <Card>
            {items.map((item) => (
              <HeirloomRow key={item.id} item={item} onOpen={() => setOpen(item.id)} />
            ))}
          </Card>
        )}
        <Card>
          <Row
            emoji="🔦"
            title="Monter au grenier"
            sub={searchBlocker(state) ?? 'Une pièce sans lumière, une lampe, et trois fouilles'}
            disabled={Boolean(searchBlocker(state))}
            onClick={searchBlocker(state) ? undefined : () => setDigging(true)}
            chevron={!searchBlocker(state)}
          />
          {!searchBlocker(state) && (
            <Row
              emoji="🎲"
              title="Envoyer quelqu’un chercher"
              sub="Le personnage s’en charge, avec ce qu’il sait — sans toi"
              onClick={() => run((ctx) => autoSearch(ctx), '🔦')}
              chevron
            />
          )}
        </Card>
      </Section>

      {/* ---------------- Ce que la partie sait déjà ---------------- */}
      {/* Les souvenirs d'occasion, à côté des objets de famille : ceux-ci ne
          valent rien, et c'est exactement ce qui les distingue. */}
      <Section title="Ce que tu as gardé d’une occasion">
        {keepsakesOf(state).length === 0 ? (
          <Empty>Rien. Il faut y avoir été.</Empty>
        ) : (
          <Card>
            {keepsakesOf(state).map((id) => {
              const piece = getKeepsake(id);
              return (
                <Row
                  key={id}
                  emoji={piece?.emoji ?? '·'}
                  title={piece?.label ?? id}
                  sub={piece?.note}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ils ne valent rien et ne se transmettent pas. Tu y étais, c’est tout.
        </p>
      </Section>

      <Section title="Ce que tu as été">
        <Card>
          <Line label="Métiers tenus" items={p.careerHistory.map((j) => j.title)} />
          <Line label="Diplômes" items={p.education.degrees.map((d) => d.name)} />
          <Line
            label="Distinctions"
            items={[
              ...(p.stage?.accolades ?? []),
              ...(p.veteran?.decorations ?? []),
              ...(p.service?.decorations ?? []),
            ]}
          />
          <Line
            label="Titres mérités"
            items={ribbons.map((r) => ribbonLabel(r.id, p.sex))}
          />
        </Card>
      </Section>

      <Section title="Ce que tu possèdes">
        <Card>
          <Line label="Biens" items={p.properties.map((x) => x.name)} />
          <Line label="Véhicules" items={vehicles} />
          <Line label="Animaux" items={p.pets.map((x) => `${x.name} (${x.species})`)} />
          <Line label="Objets de valeur" items={p.valuables.map((x) => x.name)} />
          <Line label="Lieux vus" items={p.seenPlaces} />
        </Card>
      </Section>
    </Sheet>
  );
}

/** Une ligne d'objet de famille, avec ce qu'il faut savoir d'un coup d'œil. */
function HeirloomRow({ item, onOpen }: { item: Heirloom; onOpen: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const kind = getHeirloomKind(item.kindId);
  const years = ageOf(state, item);
  return (
    <Row
      emoji={kind?.emoji ?? '📦'}
      title={kind?.label ?? 'Un objet'}
      sub={`${ageLabel(years)} · ${years} an(s) · ${conditionLabel(item.condition).toLowerCase()}`}
      right={<Pill tone={item.condition < 40 ? 'bad' : 'good'}>
        {money(state, valueOf(state, item))}
      </Pill>}
      onClick={onOpen}
      chevron
    />
  );
}

/** Une catégorie de collection : ce qu'on en a, ou le silence. */
function Line({ label, items }: { label: string; items: string[] }) {
  const unique = [...new Set(items)];
  return (
    <Row
      emoji={unique.length > 0 ? '✔️' : '·'}
      title={label}
      sub={unique.length > 0 ? unique.join(' · ') : 'Rien encore'}
      right={<Pill tone={unique.length > 0 ? 'good' : undefined}>{unique.length}</Pill>}
    />
  );
}

/* ------------------------------------------------------------------ */
/* La pièce noire                                                      */
/* ------------------------------------------------------------------ */

/** Le grenier : un rectangle noir, un halo, et ce qu'il éclaire. */
function DarkRoom({ state: s }: { state: AtticState }) {
  const timeLeft = Math.max(0, (s.limit - s.elapsed) / 1000);
  return (
    <>
      <div className="attic">
        {/* Ce qui est enfoui n'apparaît que dans le halo — et un leurre y
            ressemble exactement, ce qui est tout l'intérêt. */}
        {s.buried.map((b, i) => {
          const lit = Math.hypot(b.x - s.lampX, b.y - s.lampY) <= s.radius;
          if (!lit && !b.dug) return null;
          return (
            <div
              key={i}
              className={`attic-thing${b.dug ? ' attic-thing-dug' : ''}`}
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
            >
              {b.dug ? (b.real ? '✨' : '🕳️') : '▫️'}
            </div>
          );
        })}
        <div
          className="attic-lamp"
          style={{
            left: `${s.lampX * 100}%`,
            top: `${s.lampY * 100}%`,
            width: `${s.radius * 200}%`,
            paddingBottom: `${s.radius * 200}%`,
            opacity: 0.35 + (s.battery / 100) * 0.5,
          }}
        />
        <div
          className="attic-hand"
          style={{ left: `${s.lampX * 100}%`, top: `${s.lampY * 100}%` }}
        >
          🔦
        </div>
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{s.digs} fouille(s)</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Pile" value={s.battery} low danger={70} />
        <GameGauge label="La lampe s’avive" value={s.warmth * 100} danger={200} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={s.warmth > 0.75 ? 'good' : s.warmth > 0.4 ? 'warn' : undefined}>
            {s.warmth > 0.75 ? 'tout près' : s.warmth > 0.4 ? 'quelque chose' : 'rien par ici'}
          </Pill>
          {s.misses > 0 && <Pill tone="bad">{s.misses} pour rien</Pill>}
        </div>
      </div>
    </>
  );
}
