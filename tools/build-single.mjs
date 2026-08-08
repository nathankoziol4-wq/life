/**
 * Construit une version « fichier unique » d'Odyssia.
 *
 * Tout — code, styles, icônes — est intégré dans un seul .html qu'on peut
 * envoyer sur un téléphone et ouvrir directement, sans serveur, sans
 * hébergeur et sans connexion. C'est la solution de repli quand aucune mise
 * en ligne n'est possible.
 *
 *   npm run build:single   →  dist-single/odyssia.html
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const out = join(root, 'dist-single');

console.log('Compilation…');
execFileSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: './' },
});

const assets = readdirSync(join(dist, 'assets'));
const jsFile = assets.find((f) => f.endsWith('.js'));
const cssFile = assets.find((f) => f.endsWith('.css'));
if (!jsFile) throw new Error('Aucun bundle JavaScript trouvé dans dist/assets');

const js = readFileSync(join(dist, 'assets', jsFile), 'utf8');
const css = cssFile ? readFileSync(join(dist, 'assets', cssFile), 'utf8') : '';
const icon = readFileSync(join(root, 'public', 'icon-180.png')).toString('base64');
const logo = readFileSync(join(root, 'public', 'logo.svg'), 'utf8');

/** Empêche un `</script>` présent dans le code de refermer la balise. */
const safe = (code) => code.replace(/<\/script>/gi, '<\\/script>');

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#4c3fd6" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Odyssia" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}" />
    <link rel="apple-touch-icon" href="data:image/png;base64,${icon}" />
    <title>Odyssia — Simulateur de vie</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${safe(js)}</script>
  </body>
</html>
`;

mkdirSync(out, { recursive: true });
const target = join(out, 'odyssia.html');
writeFileSync(target, html);

const ko = (n) => `${Math.round(n / 1024)} ko`;
console.log(`\n✓ ${target}`);
console.log(`  fichier unique, ${ko(Buffer.byteLength(html))} — aucune dépendance externe`);
console.log('  À copier sur le téléphone et à ouvrir dans le navigateur.');
