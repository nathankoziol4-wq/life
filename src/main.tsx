import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { GameProvider } from './ui/GameContext.tsx';
import { ThemeProvider } from './ui/theme/ThemeProvider.tsx';
// Les jetons d'abord : tout le reste s'y réfère, y compris l'ancienne
// feuille, qui est migrée écran par écran.
import './ui/theme/tokens.css';
import './styles.css';
import './ui/theme/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </ThemeProvider>
  </StrictMode>,
);

// La coquille d'amorçage a fait son travail : elle occupait l'écran pendant
// que ce paquet se chargeait. On la retire à la première image peinte après
// le rendu, pas avant — sinon on rend le blanc qu'elle servait à éviter.
requestAnimationFrame(() => {
  requestAnimationFrame(() => document.getElementById('boot')?.remove());
});
