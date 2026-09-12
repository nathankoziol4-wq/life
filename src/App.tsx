/**
 * Coquille de l'application : assemble en-tête, contenu de l'onglet actif,
 * navigation basse et couches modales.
 *
 * Le journal de vie est l'écran d'accueil ; les quatre menus s'affichent
 * à sa place et se referment d'un second appui sur l'onglet.
 */

import { useCallback, useRef, useState } from 'react';
import { AppHeader } from './ui/components/AppHeader.tsx';
import { LifeFeed } from './ui/components/LifeFeed.tsx';
import { TabBar, type Tab } from './ui/components/TabBar.tsx';

/** L'ordre des destinations dans la barre, qui donne le sens de la navigation. */
const ORDER: Tab[] = ['journal', 'parcours', 'proches', 'patrimoine', 'agenda'];
import { EventModal, ResultModal } from './components/EventModal.tsx';
import { ActivityMenu } from './components/ActivityMenu.tsx';
import { OccupationScreen } from './screens/OccupationScreen.tsx';
import { AssetsScreen } from './screens/AssetsScreen.tsx';
import { RelationshipsScreen } from './screens/RelationshipsScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { StartScreen } from './screens/StartScreen.tsx';
import { SummaryScreen } from './screens/SummaryScreen.tsx';
import { useGame } from './ui/GameContext.tsx';

export function App() {
  const { state, summary, currentEvent, advanceYear, busy, toastMessage } = useGame();
  // Le journal est une destination comme les autres. L'ancienne barre le
  // gardait comme un état caché — l'onglet actif se changeait en « Journal »,
  // si bien que le repère se déplaçait sous le doigt et qu'on ne savait plus
  // où l'on était.
  const [tab, setTab] = useState<Tab>('journal');
  const [profileOpen, setProfileOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  /*
   * **De quel côté arrive le nouvel écran.**
   *
   * Une navigation qui fait toujours monter le contenu ne dit pas où l'on va.
   * En comparant le rang du nouvel onglet à celui de l'ancien, le contenu
   * entre par la droite quand on avance dans la barre et par la gauche quand
   * on recule — le geste et l'image vont dans le même sens.
   *
   * Le sens est posé en attribut sur le corps défilant, et le CSS s'en sert
   * pour orienter l'entrée des sections. **Il ne va pas sur une enveloppe.**
   * Une `transform` sur un ancêtre en fait le bloc conteneur des descendants
   * en `position: absolute` — et `.sheet` en est un, `inset: 0`, qui compte
   * remplir tout le cadre. Cela a déjà coûté deux régressions dans cette
   * branche : une feuille rétrécie de vingt-huit pixels, puis un mini-jeu
   * injouable. Les sections, elles, ne contiennent aucune feuille.
   */
  const [dir, setDir] = useState<'avant' | 'arriere'>('avant');
  const goTo = useCallback((next: Tab) => {
    setTab((prev) => {
      if (next !== prev) setDir(ORDER.indexOf(next) > ORDER.indexOf(prev) ? 'avant' : 'arriere');
      return next;
    });
  }, []);

  // Prendre une année ramène toujours au journal, où les nouveaux
  // événements viennent de s'inscrire.
  const handleAdvance = useCallback(() => {
    setTab('journal');
    advanceYear();
  }, [advanceYear]);

  if (summary) {
    return (
      <div className="app-frame">
        <div className="app">
          <SummaryScreen summary={summary} />
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-frame">
        <div className="app">
          <StartScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <div className="app">
        <AppHeader onOpenProfile={() => setProfileOpen(true)} />

        <div className="app-body" ref={bodyRef} data-dir={dir} data-tab={tab}>
          {tab === 'journal' && <LifeFeed scrollRef={bodyRef} />}
          {tab === 'parcours' && <OccupationScreen />}
          {tab === 'patrimoine' && <AssetsScreen />}
          {tab === 'proches' && <RelationshipsScreen />}
          {tab === 'agenda' && <ActivityMenu />}
        </div>

        <TabBar
          active={tab}
          onSelect={goTo}
          onAdvance={handleAdvance}
          canAdvance={!currentEvent && !busy && !state.gameOver}
          hint={!currentEvent && !busy && tab === 'journal'}
        />

        {profileOpen && <ProfileScreen onBack={() => setProfileOpen(false)} />}
        <EventModal />
        <ResultModal />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </div>
    </div>
  );
}
