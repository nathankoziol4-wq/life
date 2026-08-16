/**
 * Écran « Ce que tu sais faire ».
 *
 * Trois choses doivent se lire d'un coup d'œil, et l'ordre compte :
 *
 * 1. **Où l'on en est**, en mots plutôt qu'en pourcentage — « correct »
 *    se lit, « 47 » ne se lit pas.
 * 2. **Si l'on est doué**, ou qu'on ne le sait pas encore. C'est la seule
 *    information du jeu qu'on obtient en la cherchant, et elle doit se voir
 *    comme telle : tant qu'on n'a pas essayé trois fois, l'écran dit
 *    franchement qu'il n'en sait rien.
 * 3. **Ce que ça ouvre** : les familles de métiers qui s'appuient dessus.
 *    Sans cette ligne, une compétence ressemblerait à une jauge de plus.
 */

import { Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { PER_YEAR, SKILLS, rankOf } from '../data/skills.ts';
import {
  availableSkills, giftKnown, giftLine, practice, practiceBlocker, priceOf,
  skillOfJob, stateOf, workedThisYear,
} from '../systems/skills.ts';

export function SkillScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const open = availableSkills(state);
  const trade = skillOfJob(state);
  const left = Math.max(0, PER_YEAR - workedThisYear(state));

  return (
    <Sheet title="Ce que tu sais faire" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          On devient correct en vivant : le métier qu’on exerce, les matières
          où l’on tient la route et ce qu’on aime déteignent tout seuls. Au
          delà, il faut le vouloir.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={left > 0 ? 'primary' : 'warn'}>
            {left > 0 ? `${left} séance(s) cette année` : 'Plus de temps cette année'}
          </Pill>
          {trade && <Pill>Ton métier : {trade.label.toLowerCase()}</Pill>}
        </div>
      </Card>

      {open.length === 0 ? (
        <Section title="Trop tôt">
          <Empty>Tu es encore trop jeune pour t’y mettre.</Empty>
        </Section>
      ) : (
        <Section title="Dix choses">
          <Card>
            {open.map((skill) => {
              const held = stateOf(state, skill.id);
              const why = practiceBlocker(state, skill.id);
              const known = giftKnown(state, skill.id);
              return (
                <Row
                  key={skill.id}
                  emoji={skill.emoji}
                  title={skill.label}
                  sub={`${rankOf(held.level)} · ${giftLine(state, skill.id)}`}
                  // Le chiffre, toujours — jamais le palier. Le palier est
                  // déjà dans la ligne du dessous, et il ne bouge pas d'une
                  // séance à l'autre : au navigateur, payer une séance
                  // laissait la ligne rigoureusement identique, et le joueur
                  // n'avait aucun moyen de voir qu'il avait progressé.
                  right={
                    <Pill tone={known ? 'good' : undefined}>{Math.round(held.level)}</Pill>
                  }
                  disabled={Boolean(why)}
                  onClick={why ? undefined : () => run((ctx) => practice(ctx, skill.id), skill.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Une séance coûte du temps et de l’argent. Deux par an, pas plus —
            sinon tout monterait, et le don ne voudrait plus rien dire.
          </p>
        </Section>
      )}

      {/* Le détail, pour celles qu'on a entamées : ce que ça ouvre, et à quel
          prix. Une compétence dont on ne saurait pas à quoi elle sert serait
          exactement le défaut qu'on répare. */}
      {open.some((s) => stateOf(state, s.id).level > 0) && (
        <Section title="Ce que ça ouvre">
          <Card>
            {open
              .filter((s) => stateOf(state, s.id).level > 0)
              .sort((a, b) => stateOf(state, b.id).level - stateOf(state, a.id).level)
              .map((skill) => {
                const held = stateOf(state, skill.id);
                return (
                  <div key={skill.id} style={{ padding: '12px 14px' }}>
                    <div className="spread">
                      <div className="row-title">{skill.emoji} {skill.label}</div>
                      <span className="small muted">{money(state, priceOf(state, skill))}/séance</span>
                    </div>
                    <div style={{ margin: '8px 0' }}>
                      <Meter value={held.level} />
                    </div>
                    <div className="row-sub">{skill.fields.join(' · ')}</div>
                    <div className="small muted" style={{ marginTop: 4 }}>{skill.note}</div>
                  </div>
                );
              })}
          </Card>
        </Section>
      )}

      <Section title="Pas encore">
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
            {SKILLS.length - open.length === 0
              ? 'Tu as l’âge pour tout essayer.'
              : `${SKILLS.length - open.length} viendront avec l’âge.`}
          </p>
        </Card>
      </Section>
    </Sheet>
  );
}
