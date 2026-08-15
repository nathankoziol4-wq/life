/**
 * L'écran des langues.
 *
 * Deux blocs, et le premier n'est pas décoratif : **ce que ça te coûte ici**.
 * Tant qu'on ne parle pas la langue du pays, on n'obtient qu'une fraction de
 * ce qu'on vaut au travail, et les liens se nouent mal. Le dire en chiffres,
 * avec la phrase que le pays te renvoie, est la seule façon que le joueur ait
 * de comprendre pourquoi sa carrière s'est arrêtée.
 *
 * Le second bloc est la liste : ce qu'on parle, ce qu'on peut apprendre, et
 * combien un cours rapporte — beaucoup moins que d'y vivre, ce que l'écran
 * dit explicitement.
 */

import { Card, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import {
  LANGUAGES, SOCIAL_FLOOR, WORK_FLOOR, fluencyHere, fluencyLabel,
  immersionGain, lessonCost, levelOf, localLanguage, nativeLanguage,
  socialFactor, strandedLabel, study, studyBlocker, workFactor,
} from '../systems/languages.ts';
import { getCountry } from '../data/countries.ts';

export function LanguageScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const here = localLanguage(state);
  const native = nativeLanguage(state);
  const level = fluencyHere(state);
  const country = getCountry(state.player.countryId);
  const work = workFactor(state);
  const social = socialFactor(state);

  return (
    <Sheet title="Les langues" onBack={onBack}>
      {/* ---------------- Ce que ça coûte ici ---------------- */}
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>{country.flag} {country.name}</strong>
            <div className="small muted">
              On y travaille en {LANGUAGES.find((l) => l.id === here)?.label}
            </div>
          </div>
          <Pill tone={level >= WORK_FLOOR ? 'good' : level >= SOCIAL_FLOOR ? 'warn' : 'bad'}>
            {fluencyLabel(level)}
          </Pill>
        </div>
        <div style={{ marginTop: 10 }}><Meter value={level} /></div>
        {level < WORK_FLOOR && (
          <>
            <p className="small" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              {strandedLabel(level)}
            </p>
            <div className="spread" style={{ marginTop: 12 }}>
              <span className="small muted">Ce qu’on te propose au travail</span>
              <strong className="small">{Math.round(work * 100)} % de ta valeur</strong>
            </div>
            <div className="spread" style={{ marginTop: 6 }}>
              <span className="small muted">Ce que valent tes rencontres</span>
              <strong className="small">{Math.round(social * 100)} %</strong>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
              Sous {WORK_FLOOR}, le marché ne t’offre que des premiers échelons —
              ni ton diplôme ni ton expérience n’y changent quoi que ce soit.
            </p>
          </>
        )}
        {level >= WORK_FLOOR && (
          <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>
            Tu es d’ici, pour ce qui compte. Personne ne te propose moins que ce
            que tu vaux à cause de la langue.
          </p>
        )}
      </Card>

      {/* ---------------- Ce que tu parles ---------------- */}
      <Section title="Ce que tu parles">
        <Card>
          {/* Toutes : on peut apprendre n'importe laquelle, et les voir toutes
              est la seule façon de comparer ce qui s'apprendrait vite. */}
          {LANGUAGES
            .map((l) => ({ l, level: levelOf(state, l.id) }))
            .sort((a, b) => b.level - a.level || a.l.label.localeCompare(b.l.label))
            .map(({ l, level: lv }) => {
              const why = studyBlocker(state, l.id);
              const gain = l.id === here ? immersionGain(state, l.id) : 0;
              return (
                <Row
                  key={l.id}
                  // Un carré blanc pour « pas un mot » donnait quatorze lignes
                  // de pavés gris qui se lisent comme des images cassées. Un
                  // point neutre dit la même chose sans faire de bruit.
                  emoji={l.id === native ? '🏠' : l.id === here ? '📍' : lv >= 1 ? '🗣️' : '·'}
                  title={l.label.charAt(0).toUpperCase() + l.label.slice(1)}
                  sub={`${fluencyLabel(lv)}${
                    l.id === native ? ' · ta langue' : ''}${
                    gain >= 1 ? ` · +${Math.round(gain)} par an rien qu’en vivant ici` : ''}`}
                  right={why
                    ? <Pill>{lv >= 100 ? '100' : Math.round(lv)}</Pill>
                    : <Pill tone="primary">{money(state, lessonCost(state))}</Pill>}
                  disabled={Boolean(why)}
                  onClick={why ? undefined : () => run((ctx) => study(ctx, l.id), '🗣️')}
                  chevron={!why}
                />
              );
            })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Vivre quelque part enseigne bien plus vite que n’importe quel cours,
          et bien plus jeune que vieux. Une langue proche de celles que tu
          parles s’apprend vite ; une langue lointaine, non. Ce que tu n’emploies
          plus se perd, lentement.
        </p>
      </Section>
    </Sheet>
  );
}
