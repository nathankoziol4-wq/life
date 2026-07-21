/**
 * App — machine à états du jeu : accueil → création → récap → vie → fin.
 * La sauvegarde est en mémoire (état React), pas de localStorage (par choix).
 */
import { useState } from "react";
import type { CharacterCreation, Character } from "./types";
import { createCharacter } from "./engine/character";
import { randomCreation } from "./engine/random";
import { HomeScreen } from "./components/HomeScreen";
import { CreationMenu } from "./components/CreationMenu";
import { RecapScreen } from "./components/RecapScreen";
import { GameScreen } from "./components/GameScreen";
import { EndScreen } from "./components/EndScreen";

type Phase = "home" | "creation" | "recap" | "game" | "end";

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [creation, setCreation] = useState<CharacterCreation | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [lives, setLives] = useState(0);

  const isHome = phase === "home";

  return (
    <>
      {/* Fond persistant subtil, cohérent sur tout le jeu */}
      <div className="app-bg" aria-hidden>
        <span className="app-orb app-orb-a" />
        <span className="app-orb app-orb-b" />
      </div>

      <div className={isHome ? "app app-home" : "app"}>
        {!isHome && (
          <div className="app-header screen-fade">
            <div className="brand" onClick={() => setPhase("home")} role="button" title="Menu principal">LifeSim X100</div>
            <div className="tag">Chaque choix façonne mécaniquement une vie entière.</div>
          </div>
        )}

        {phase === "home" && (
          <HomeScreen
            livesLived={lives}
            onNewLife={() => setPhase("creation")}
            onExpress={() => {
              const c = randomCreation();
              setCreation(c);
              setCharacter(createCharacter(c));
              setPhase("game");
            }}
          />
        )}

        {/* Chaque écran s'anime à l'entrée (clé = phase → remontage) */}
        {phase === "creation" && (
          <div className="screen" key="creation">
            <CreationMenu
              onComplete={(c) => {
                setCreation(c);
                setPhase("recap");
              }}
            />
          </div>
        )}

        {phase === "recap" && creation && (
          <div className="screen" key="recap">
            <RecapScreen
              creation={creation}
              onBack={() => setPhase("creation")}
              onStart={() => {
                setCharacter(createCharacter(creation));
                setPhase("game");
              }}
            />
          </div>
        )}

        {phase === "game" && character && (
          <div className="screen" key="game">
            <GameScreen
              initial={character}
              onDeath={(c) => {
                setCharacter(c);
                setLives((n) => n + 1);
                setPhase("end");
              }}
            />
          </div>
        )}

        {phase === "end" && character && (
          <div className="screen" key="end">
            <EndScreen
              char={character}
              onRestart={() => {
                setCreation(null);
                setCharacter(null);
                setPhase("home");
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
