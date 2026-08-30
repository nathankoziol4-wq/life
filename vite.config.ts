import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * En développement l'application est servie à la racine ; publiée sur GitHub
 * Pages, elle vit dans un sous-dossier au nom du dépôt. `BASE_PATH` est
 * renseigné par le workflow de déploiement.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    // Permet d'ouvrir le jeu depuis un téléphone sur le même réseau.
    host: true,
  },
});
