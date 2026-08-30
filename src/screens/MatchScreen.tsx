/**
 * Écran « Application de rencontre ».
 *
 * Avant, c'était un bouton : on appuyait, on payait, un tirage décidait s'il
 * y avait quelqu'un au bout. Le catalogue le classait `BASIC` — « un bouton
 * qui produit un prétendant » — et c'était exact.
 *
 * Ici il y a six profils par an et deux messages à dépenser. Un profil
 * **montre** deux choses et en **dit** trois, et l'écran ne fait rien pour
 * dire lesquelles croire : il se contente de les ranger sous deux titres
 * honnêtes — « Ce que le profil montre », « Ce qu’il ou elle en dit ». Une
 * des trois phrases porte sur un trait que le profil montre aussi ; c'est là
 * qu'on apprend si la personne se décrit comme elle est.
 *
 * **L'écran ne calcule jamais la déduction à la place du joueur.** Ce serait
 * lui retirer la seule chose que ce système lui demande de faire.
 */

import { useState } from 'react';
import { Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { TRAIT_LABEL } from '../data/dates.ts';
import { WRITES_PER_YEAR } from '../data/profiles.ts';
import {
  appBlocker, odds, profilesFor, subscription, writeBlocker, writeTo, writesThisYear,
} from '../systems/matching.ts';

export function MatchScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [openId, setOpen] = useState<string | null>(null);
  if (!state) return null;

  const shut = appBlocker(state);
  const list = shut ? [] : profilesFor(state);
  const profile = list.find((p) => p.id === openId);

  /* -------------------------------------------------------------- */
  /* Un profil                                                       */
  /* -------------------------------------------------------------- */

  if (profile) {
    const why = writeBlocker(state, profile);
    const chance = Math.round(odds(state, profile) * 100);
    return (
      <Sheet title={profile.firstName} onBack={() => setOpen(null)}>
        <Card pad>
          <div className="spread">
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {profile.firstName} {profile.lastName}
              </div>
              <div className="small muted">{profile.age} ans · {profile.job}</div>
            </div>
            <Pill tone={profile.demand.factor >= 1 ? 'good' : 'warn'}>
              {profile.demand.label}
            </Pill>
          </div>
          <p style={{ margin: '12px 0 0', lineHeight: 1.55, fontStyle: 'italic' }}>
            « {profile.hook} »
          </p>
        </Card>

        {/* Les deux blocs ne portent pas le même poids, et l'écran le dit
            seulement par leurs titres : montrer n'est pas dire. Reste au
            joueur à s'en apercevoir. */}
        <Section title="Ce que le profil montre">
          <Card>
            {profile.tells.map((shown) => (
              <Row
                key={shown.trait}
                emoji="👁️"
                title={shown.line}
                sub={TRAIT_LABEL[shown.trait]}
              />
            ))}
          </Card>
        </Section>

        <Section title={`Ce qu’${profile.sex === 'F' ? 'elle' : 'il'} en dit`}>
          <Card>
            {profile.claims.map((said) => (
              <Row
                key={said.trait}
                emoji="💬"
                title={said.line}
                sub={TRAIT_LABEL[said.trait]}
              />
            ))}
          </Card>
        </Section>

        <Section
          title="Écrire"
          sub={`${WRITES_PER_YEAR - writesThisYear(state)} message(s) restant(s) cette année.`}
        >
          <Card>
            <Row
              emoji="✉️"
              title={`Écrire à ${profile.firstName}`}
              sub={`${chance} % de chances d’une réponse · ${money(state, subscription(state))}`}
              because={why}
              closed={Boolean(why)}
              onClick={() => {
                run((ctx) => writeTo(ctx, profile.id), '💘');
                setOpen(null);
              }}
              chevron={!why}
            />
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* -------------------------------------------------------------- */
  /* La liste de l'année                                             */
  /* -------------------------------------------------------------- */

  return (
    <Sheet title="Application de rencontre" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Six profils cette année, deux messages à dépenser. Ce qu’un profil
          montre et ce qu’il dit ne se valent pas — à toi de voir lesquels se
          contredisent.
        </p>
      </Card>
      <Section
        title="Cette année"
        sub={`${writesThisYear(state)} / ${WRITES_PER_YEAR} messages envoyés.`}
      >
        <Card>
          {shut ? (
            <Row emoji="🔒" title="Application fermée" sub={shut} because={shut} closed />
          ) : (
            /*
             * **On ouvre un profil même quand on ne peut plus écrire.** Le
             * lire reste utile — c'est même tout ce que l'écran demande — et
             * la raison de ne plus pouvoir écrire est portée par la ligne
             * « Écrire », là où le geste a lieu. Fermer la liste entière
             * parce que les deux messages sont partis cacherait six profils
             * pour un refus qui ne les concerne pas.
             */
            list.map((p) => (
              <Row
                key={p.id}
                emoji={p.sex === 'F' ? '👩' : '👨'}
                title={`${p.firstName}, ${p.age} ans`}
                sub={p.hook}
                right={<Pill tone={p.demand.factor >= 1 ? undefined : 'warn'}>
                  {p.demand.label}
                </Pill>}
                onClick={() => setOpen(p.id)}
                chevron
              />
            ))
          )}
        </Card>
      </Section>
    </Sheet>
  );
}
