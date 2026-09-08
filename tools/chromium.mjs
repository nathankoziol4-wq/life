import { existsSync, readdirSync } from 'node:fs';

/**
 * Trouver un navigateur, sans obliger l'appelant à s'en souvenir.
 *
 * Playwright cherche la version qu'attend *sa* version à lui, et cette
 * machine n'a pas forcément celle-là : `npm run smoke` échouait d'emblée
 * avec « Executable doesn't exist at …chromium_headless_shell-1234 » alors
 * qu'un chromium parfaitement utilisable était installé à côté. Les outils
 * du projet ne doivent pas dépendre d'une variable d'environnement qu'on
 * oublie de poser — ni chacun redécouvrir ce contournement de son côté.
 */
export function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const wanted = ['chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell'];
  for (const dir of readdirSync(root).sort().reverse()) {
    for (const tail of wanted) {
      const guess = `${root}/${dir}/${tail}`;
      if (existsSync(guess)) return guess;
    }
  }
  return undefined;
}
