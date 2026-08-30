/**
 * Les bêtes : ce qu'elles demandent, ce qu'on leur donne, ce qu'on en fait.
 *
 * L'écran d'avant tenait en une ligne par animal — nom, espèce, âge, santé —
 * et deux boutons. Le contentement existait dans la sauvegarde et n'était
 * affiché nulle part, ce qui revenait au même que de ne pas exister.
 *
 * Trois choses sont montrées ici, et elles ne sont pas décoratives : ce que la
 * bête réclame aujourd'hui, ce qu'il reste de moments dans l'année, et ce que
 * l'attention a construit. Les trois décident de ce qu'on peut faire.
 *
 * Une précaution de forme : un `Row` fermé affiche `because` **à la place** de
 * `sub`. Les lectures qui comptent ne sont donc jamais dans un `sub` — elles
 * ont leur propre carte, et ne disparaissent pas au moment où l'action devient
 * impossible.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { PET_SPECIES } from '../data/activities.ts';
import { BEAST_SOURCES, CARES, MISERY } from '../data/beast.ts';
import { adoptPetSpecies, playWithPet, vetVisit } from '../systems/activities.ts';
import {
  bondLabel, bondOf, careBlocker, contentLabel, easeLabel, easeOf, entrust,
  momentsLeft, momentsPerYear, partBlocker, partingCost, priceFrom, sourceOf,
  spendMoment, speciesIdOf, surrender, trainingLabel, trainingOf, wantLine,
  wants,
} from '../systems/beast.ts';
import { peopleByRelation } from '../engine/context.ts';
import type { Pet } from '../engine/types.ts';

export function BeastScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const [adopting, setAdopting] = useState<string | null>(null);
  const [parting, setParting] = useState<'entrust' | 'surrender' | null>(null);
  if (!state) return null;
  const p = state.player;
  const left = momentsLeft(state);

  /* --- Une bête en particulier --- */
  const shown = open ? p.pets.find((x) => x.id === open) : null;
  if (shown) {
    const species = PET_SPECIES.find((s) => s.id === speciesIdOf(shown));
    const source = sourceOf(shown);
    const content = Math.round(shown.happiness);
    const asked = wants(shown);
    const family = peopleByRelation(state, [
      'son', 'daughter', 'brother', 'sister', 'spouse', 'partner', 'friend',
      'bestFriend', 'father', 'mother',
    ]).filter((x) => x.alive);

    return (
      <Sheet title={shown.name} onBack={() => { setOpen(null); setParting(null); }}>
        <Card pad>
          <div style={{ fontSize: 44, textAlign: 'center' }}>{species?.emoji ?? '🐾'}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {wantLine(shown)}
          </p>
          <div className="chips" style={{ marginTop: 14, justifyContent: 'center' }}>
            <Pill>{shown.species}</Pill>
            <Pill>{shown.age} an(s)</Pill>
            {source && <Pill>{source.label.toLowerCase()}</Pill>}
            <Pill tone={content < MISERY ? 'bad' : content < 55 ? 'warn' : 'good'}>
              {contentLabel(content)}
            </Pill>
          </div>
        </Card>

        {/* La lecture, hors des lignes d'action : elle doit rester visible
            même quand plus rien n'est possible cette année. */}
        <Section title="Où vous en êtes">
          <Card pad>
            <Reading label="Ce que vous avez" says={bondLabel(bondOf(shown))} value={bondOf(shown)} />
            <Reading label="Ce qu’elle a appris" says={trainingLabel(trainingOf(shown))} value={trainingOf(shown)} />
            <Reading label="Ce qu’elle laisse voir" says={easeLabel(easeOf(shown))} value={easeOf(shown)} />
            <Reading label="Sa santé" says={`${Math.round(shown.health)} %`} value={shown.health} />
          </Card>
        </Section>

        <Section title="Lui donner un moment">
          <Card>
            {CARES.map((care) => {
              const why = careBlocker(state, shown, care.id);
              return (
                <Row
                  key={care.id}
                  emoji={care.emoji}
                  title={care.id === asked ? `${care.label} — c’est ce qu’elle demande` : care.label}
                  sub={care.line}
                  right={<Pill tone={care.id === asked ? 'good' : undefined}>
                    {care.moments} moment{care.moments > 1 ? 's' : ''}
                  </Pill>}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => spendMoment(ctx, shown.id, care.id), care.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Il te reste {left} moment{left > 1 ? 's' : ''} cette année, pour toutes
            tes bêtes. Un moment donné là où elle n’a besoin de rien compte
            quand même, mais beaucoup moins.
          </p>
        </Section>

        <Section title="Sans y passer l’année">
          <Card>
            <Row
              emoji="🐾"
              title="Jouer cinq minutes"
              sub="Ça lui fait sa journée. Ça ne construit rien."
              onClick={() => run((ctx) => playWithPet(ctx, shown.id), '🐾')}
              chevron
            />
            <Row
              emoji="🩺"
              title="Chez le vétérinaire"
              sub="Ce que l’argent peut faire à la place du temps"
              right={<Pill tone="warn">{money(state, 240)}</Pill>}
              onClick={() => run((ctx) => vetVisit(ctx, shown.id), '🩺')}
              chevron
            />
          </Card>
        </Section>

        <Section title="T’en séparer">
          <Card>
            <Row
              emoji="🤝"
              title="La confier à quelqu’un"
              sub="Elle sort de chez toi, et tu sauras où elle est"
              closed={Boolean(partBlocker(state))}
              because={partBlocker(state)}
              onClick={() => setParting(parting === 'entrust' ? null : 'entrust')}
              chevron={!partBlocker(state)}
            />
            <Row
              emoji="🚪"
              title="La ramener"
              sub="Elle ne comprendra pas. C’est parfois la bonne décision quand même."
              closed={Boolean(partBlocker(state))}
              because={partBlocker(state)}
              onClick={() => setParting(parting === 'surrender' ? null : 'surrender')}
              chevron={!partBlocker(state)}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Ce que ça coûte suit ce que vous aviez : {partingCost(shown)} points
            de bonheur aujourd’hui.
          </p>
        </Section>

        {parting === 'entrust' && (
          <Section title="À qui ?">
            <Card>
              {family.length === 0 ? (
                <Empty>Il n’y a personne à qui la confier.</Empty>
              ) : family.map((who) => (
                <Row
                  key={who.id}
                  emoji="🧑"
                  title={`${who.firstName} ${who.lastName}`}
                  sub={`${who.relation} · relation ${Math.round(who.relationship)}`}
                  onClick={() => {
                    run((ctx) => entrust(ctx, shown.id, who.id), '🤝');
                    setParting(null);
                    setOpen(null);
                  }}
                  chevron
                />
              ))}
            </Card>
          </Section>
        )}

        {parting === 'surrender' && (
          <Section title="En es-tu sûr ?">
            <Card>
              <Row
                emoji="🚪"
                title={`Ramener ${shown.name}`}
                sub="Tu ne la reverras pas."
                onClick={() => {
                  run((ctx) => surrender(ctx, shown.id), '🚪');
                  setParting(null);
                  setOpen(null);
                }}
                chevron
              />
            </Card>
          </Section>
        )}
      </Sheet>
    );
  }

  /* --- Choisir d'où elle vient --- */
  const wanted = adopting ? PET_SPECIES.find((s) => s.id === adopting) : null;
  if (wanted) {
    return (
      <Sheet title={wanted.name} onBack={() => setAdopting(null)}>
        <Card pad>
          <div style={{ fontSize: 40, textAlign: 'center' }}>{wanted.emoji}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {wanted.description}
          </p>
          <div className="chips" style={{ marginTop: 12, justifyContent: 'center' }}>
            <Pill>{money(state, wanted.annualCost)}/an</Pill>
            <Pill>espérance {wanted.lifespan} ans</Pill>
          </div>
        </Card>
        <Section title="D’où elle vient">
          <Card>
            {BEAST_SOURCES.map((source) => (
              <Row
                key={source.id}
                emoji={source.emoji}
                title={source.label}
                sub={`${source.line} ${source.note}`}
                right={<Pill tone={source.id === 'refuge' ? 'good' : 'warn'}>
                  {money(state, priceFrom(wanted.price, source.id))}
                </Pill>}
                onClick={() => {
                  run((ctx) => adoptPetSpecies(ctx, wanted.id, false, source.id), source.emoji);
                  setAdopting(null);
                }}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Ce ne sont pas trois prix pour la même bête. L’âge, la santé et ce
            qu’elle laisse voir de elle changent avec la porte par laquelle tu
            passes.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* --- Le sommaire --- */
  return (
    <Sheet title="Animaux" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {left} moment{left > 1 ? 's' : ''} cette année
            </strong>
            <div className="small muted">
              sur {momentsPerYear(state)}, pour {p.pets.length || 'aucune'} bête
              {p.pets.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Meter value={(left / Math.max(1, momentsPerYear(state))) * 100} />
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Les moments se partagent entre toutes tes bêtes. Un métier qui prend
          tout en laisse moins ; ne pas travailler en rend un.
        </p>
      </Card>

      {p.pets.length > 0 && (
        <Section title="Chez toi">
          <Card>
            {p.pets.map((pet) => (
              <BeastRow key={pet.id} pet={pet} onOpen={() => setOpen(pet.id)} />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Adopter">
        <Card>
          {PET_SPECIES.map((s) => (
            <Row
              key={s.id}
              emoji={s.emoji}
              title={s.name}
              sub={`${s.description} · ${money(state, s.annualCost)}/an`}
              right={<Pill>à partir de {money(state, priceFrom(s.price, 'refuge'))}</Pill>}
              onClick={() => setAdopting(s.id)}
              chevron
            />
          ))}
        </Card>
      </Section>
    </Sheet>
  );
}

/** Une lecture : ce qu'on en dit, et où ça en est. */
function Reading({ label, says, value }: { label: string; says: string; value: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="spread">
        <span className="small muted">{label}</span>
        <strong className="small">{says}</strong>
      </div>
      <div style={{ marginTop: 6 }}><Meter value={Math.max(0, Math.min(100, value))} /></div>
    </div>
  );
}

/** Une bête au sommaire : ce qu'elle est, et ce qu'elle réclame. */
function BeastRow({ pet, onOpen }: { pet: Pet; onOpen: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const species = PET_SPECIES.find((s) => s.id === speciesIdOf(pet));
  const content = Math.round(pet.happiness);
  return (
    <Row
      emoji={species?.emoji ?? '🐾'}
      title={pet.name}
      sub={`${pet.species} · ${pet.age} an(s) · ${bondLabel(bondOf(pet)).toLowerCase()}`}
      right={<Pill tone={content < MISERY ? 'bad' : content < 55 ? 'warn' : 'good'}>
        {contentLabel(content)}
      </Pill>}
      onClick={onOpen}
      chevron
    />
  );
}
