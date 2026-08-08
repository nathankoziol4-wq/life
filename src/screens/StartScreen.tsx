/** Écran d'accueil : création d'une vie, reprise de partie, cimetière. */

import { useState } from 'react';
import { Button, Card, Modal, Pill, Row } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { COUNTRIES } from '../data/countries.ts';
import { ALL_EVENTS } from '../data/events/index.ts';
import { JOBS, TOTAL_POSITIONS } from '../data/jobs.ts';
import { DISEASES } from '../data/diseases.ts';
import { VEHICLE_MODELS } from '../data/vehicles.ts';
import type { Sex } from '../engine/types.ts';

export function StartScreen() {
  const { startNewLife, history } = useGame();
  const [custom, setCustom] = useState(false);
  const [graveyard, setGraveyard] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Sex | 'random'>('random');
  const [countryId, setCountryId] = useState<string>('random');

  const best = history.length ? Math.max(...history.map((h) => h.score)) : 0;

  return (
    <div className="splash">
      <div className="splash-logo">Odyssia</div>
      <div className="splash-tag">Une vie entière, une décision à la fois.</div>

      <div className="splash-card">
        <div className="small" style={{ opacity: 0.86, marginBottom: 8 }}>
          Nais quelque part, grandis, étudie, travaille, aime, vieillis. Chaque année
          compte, chaque choix laisse une trace — et la fin arrive toujours.
        </div>
        <div className="chips">
          <span className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {COUNTRIES.length} pays
          </span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {JOBS.length} métiers · {TOTAL_POSITIONS} postes
          </span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {ALL_EVENTS.length} événements
          </span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {DISEASES.length} pathologies
          </span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {VEHICLE_MODELS.length} véhicules
          </span>
        </div>
      </div>

      {history.length > 0 && (
        <div className="splash-card">
          <div className="spread">
            <div>
              <div className="small" style={{ opacity: 0.78 }}>Meilleur score</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{best.toLocaleString('fr-FR')}</div>
            </div>
            <button
              className="pill"
              style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}
              onClick={() => setGraveyard(true)}
              type="button"
            >
              {history.length} vie{history.length > 1 ? 's' : ''} vécue{history.length > 1 ? 's' : ''} ›
            </button>
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 14 }}>
        <Button onClick={() => startNewLife()}>Commencer une nouvelle vie</Button>
        <Button variant="ghost" onClick={() => setCustom(true)}>
          Personnaliser la naissance
        </Button>
      </div>

      <p className="small" style={{ opacity: 0.6, marginTop: 22, textAlign: 'center' }}>
        Jeu de simulation. Les personnages, entreprises, marques et lieux sont fictifs.
      </p>

      <Modal
        open={custom}
        onClose={() => setCustom(false)}
        icon="🎲"
        title="Personnaliser la naissance"
        text="Laisse au hasard ce que tu veux découvrir."
      >
        <div className="field">
          <label className="field-label">Prénom (optionnel)</label>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={20} placeholder="Au hasard" />
        </div>
        <div className="field">
          <label className="field-label">Nom (optionnel)</label>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={24} placeholder="Au hasard" />
        </div>
        <div className="field">
          <label className="field-label">Sexe</label>
          <div className="segmented">
            {(['random', 'M', 'F'] as const).map((s) => (
              <button key={s} aria-pressed={sex === s} onClick={() => setSex(s)} type="button">
                {s === 'random' ? 'Hasard' : s === 'M' ? 'Garçon' : 'Fille'}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Pays de naissance</label>
          <select className="input" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
            <option value="random">Au hasard</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => {
            startNewLife({
              firstName: firstName.trim() || undefined,
              lastName: lastName.trim() || undefined,
              sex: sex === 'random' ? undefined : sex,
              countryId: countryId === 'random' ? undefined : countryId,
            });
            setCustom(false);
          }}
        >
          Naître
        </Button>
      </Modal>

      <Modal
        open={graveyard}
        onClose={() => setGraveyard(false)}
        icon="🕯️"
        title="Vies passées"
      >
        <Card>
          {history.map((h) => (
            <Row
              key={h.id}
              emoji="🕯️"
              title={h.name}
              sub={`${h.age} ans · ${h.job} · ${h.cause}`}
              right={<Pill tone="primary">{h.score.toLocaleString('fr-FR')}</Pill>}
            />
          ))}
        </Card>
      </Modal>
    </div>
  );
}
