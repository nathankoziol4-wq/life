/**
 * Construit un fichier HTML autonome (tout inline) jouable d'un simple double-clic,
 * sans serveur ni installation. À lancer après `npm run build`.
 *
 * IMPORTANT : on inline le JS/CSS via split/join (remplacement LITTÉRAL). Ne PAS
 * utiliser String.replace(pattern, js) : le JS minifié contient des séquences `$`
 * (`$&`, `$\``…) que .replace() interpréterait, corrompant le bundle.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const assets = readdirSync("dist/assets");
const jsFile = assets.find((f) => f.endsWith(".js"));
const cssFile = assets.find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) {
  console.error("Assets introuvables. Lance d'abord `npm run build`.");
  process.exit(1);
}

const js = readFileSync("dist/assets/" + jsFile, "utf8");
const css = readFileSync("dist/assets/" + cssFile, "utf8");
let html = readFileSync("dist/index.html", "utf8");

// Retire les références externes (script/module + feuille de style).
html = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "")
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, "");

// Protège toute éventuelle séquence de fermeture de balise dans le JS.
const safeJs = js.split("</script").join("<\\/script");

// Inline via split/join (littéral).
html = html.split("</head>").join(`<style>\n${css}\n</style>\n</head>`);
html = html.split("</body>").join(`<script type="module">\n${safeJs}\n</script>\n</body>`);

writeFileSync("LifeSimX100.html", html);
console.log(`LifeSimX100.html généré : ${(html.length / 1024).toFixed(0)} ko`);
