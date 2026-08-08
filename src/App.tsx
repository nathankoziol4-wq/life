/**
 * Coquille de l'application : assemble en-tête, contenu de l'onglet actif,
 * navigation basse et couches modales.
 *
 * Le journal de vie est l'écran d'accueil ; les quatre menus s'affichent
 * à sa place et se referment d'un second appui sur l'onglet.
 */

import { useCallback, useRef, useState } from 'react';
import { CharacterHeader } from './components/CharacterHeader.tsx';
import { LifeTimeline } from './components/LifeTimeline.tsx';
import { Navigation, type Tab } from './components/Navigation.tsx';
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
  const [tab, setTab] = useState<Tab | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Prendre une année ramène toujours au journal, où les nouveaux
  // événements viennent de s'inscrire.
  const handleAdvance = useCallback(() => {
    setTab(null);
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
        <CharacterHeader onOpenProfile={() => setProfileOpen(true)} />

        <div className="app-body" ref={bodyRef}>
          {tab === null && <LifeTimeline scrollRef={bodyRef} />}
          {tab === 'parcours' && <OccupationScreen />}
          {tab === 'patrimoine' && <AssetsScreen />}
          {tab === 'proches' && <RelationshipsScreen />}
          {tab === 'agenda' && <ActivityMenu />}
        </div>

        <Navigation
          active={tab}
          onSelect={setTab}
          onAdvance={handleAdvance}
          canAdvance={!currentEvent && !busy && !state.gameOver}
          hint={!currentEvent && !busy && tab === null}
        />

        {profileOpen && <ProfileScreen onBack={() => setProfileOpen(false)} />}
        <EventModal />
        <ResultModal />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </div>
    </div>
  );
}
