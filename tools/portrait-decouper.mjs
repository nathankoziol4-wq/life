/**
 * Découper une planche de têtes en portraits détourés.
 *
 * L'auteur du jeu a fourni une planche de trente-cinq têtes générées, en
 * disant : « je veux des personnages comme ça ». Elles sont sur fond blanc et
 * collées en grille ; ce fichier les sépare et rend le fond transparent, pour
 * qu'on puisse les poser dans le médaillon de l'en-tête, qui est un disque.
 *
 * **Le détourage ne peut pas être un simple seuil.** Un pixel clair au milieu
 * d'un visage — le blanc d'un œil, une dent, un reflet dans les cheveux — est
 * aussi blanc que le fond. On part donc des quatre coins et on ne retire que
 * ce qui *communique* avec eux : un remplissage par diffusion, qui s'arrête au
 * contour du personnage. Le blanc des yeux, entouré de peau, n'est jamais
 * atteint.
 *
 * **Et il faut refermer les entailles.** La diffusion seule taillait une raie
 * verticale dans la chevelure de huit tuiles sur trente-cinq. La cause,
 * mesurée plutôt que devinée : la planche contient des pixels quasi blancs
 * *à l'intérieur* des cheveux — (254, 252, 251) au milieu d'une mèche brune —
 * par lesquels la diffusion s'infiltre. Baisser le seuil ne règle rien : ces
 * pixels sont blancs. On referme donc après coup, par une passe morphologique
 * qui rend son opacité à tout pixel transparent entouré d'opaques. Une entaille
 * de trois points se referme ; le fond, lui, est trop large pour être touché.
 *
 *   node tools/portrait-decouper.mjs <planche.png> <dossier>
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { findChromium } from './chromium.mjs';

const [, , SOURCE, DOSSIER = '/home/user/life/captures/planche'] = process.argv;
if (!SOURCE) {
  console.error('usage : node tools/portrait-decouper.mjs <planche.png> [dossier]');
  process.exit(1);
}
mkdirSync(DOSSIER, { recursive: true });

const COLONNES = 7;
const LIGNES = 5;

const navigateur = await chromium.launch({ executablePath: findChromium() });
const page = await navigateur.newPage();
await page.goto(`file://${SOURCE}`);

const tuiles = await page.evaluate(async () => {
  const img = document.querySelector('img');

  /**
   * Retirer le fond par diffusion depuis les bords.
   *
   * `seuil` est une distance dans l'espace RVB, pas une luminosité : la
   * planche a un fond très légèrement crème, et un seuil sur la seule clarté
   * mangeait les dents et les reflets.
   */
  function detourer(ctx, w, h, seuil = 38) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const vu = new Uint8Array(w * h);
    const pile = [];
    const proche = (i) => {
      const dr = d[i] - 255; const dg = d[i + 1] - 255; const db = d[i + 2] - 252;
      return Math.sqrt(dr * dr + dg * dg + db * db) < seuil;
    };
    for (let x = 0; x < w; x += 1) { pile.push([x, 0], [x, h - 1]); }
    for (let y = 0; y < h; y += 1) { pile.push([0, y], [w - 1, y]); }
    while (pile.length) {
      const [x, y] = pile.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (vu[p]) continue;
      const i = p * 4;
      if (!proche(i)) continue;
      vu[p] = 1;
      d[i + 3] = 0;
      pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    /*
     * Refermer les entailles. Trois passes : un pixel transparent qui a six
     * voisins opaques sur huit redevient opaque. Sa couleur n'a jamais été
     * effacée — seule l'alpha l'a été — donc il suffit de la rallumer.
     */
    for (let passe = 0; passe < 3; passe += 1) {
      const aRendre = [];
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const p = y * w + x;
          if (!vu[p]) continue;
          let opaques = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              if (!vu[(y + dy) * w + (x + dx)]) opaques += 1;
            }
          }
          if (opaques >= 6) aRendre.push(p);
        }
      }
      if (!aRendre.length) break;
      for (const p of aRendre) { vu[p] = 0; d[p * 4 + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* La planche entière, détourée d'un seul tenant. */
  const grand = document.createElement('canvas');
  grand.width = img.naturalWidth; grand.height = img.naturalHeight;
  const gctx = grand.getContext('2d', { willReadFrequently: true });
  gctx.drawImage(img, 0, 0);
  detourer(gctx, grand.width, grand.height);

  /*
   * **Découper par îlots, pas par grille.** Une grille rigide suppose que
   * chaque tête tient dans sa case ; ici les chevelures débordent largement
   * sur la voisine, et trancher au milieu laissait une raie dans huit tuiles
   * sur trente-cinq. Après détourage, chaque personnage est un îlot opaque
   * entouré de transparent : on étiquette les îlots et on prend la boîte de
   * chacun. Le nombre trouvé sert de vérification — s'il ne fait pas le compte
   * attendu, la planche n'était pas ce qu'on croyait.
   */
  const W = grand.width; const H = grand.height;
  const px = gctx.getImageData(0, 0, W, H).data;
  const etiq = new Int32Array(W * H).fill(-1);
  const boites = [];
  for (let y0 = 0; y0 < H; y0 += 1) {
    for (let x0 = 0; x0 < W; x0 += 1) {
      const p0 = y0 * W + x0;
      if (etiq[p0] !== -1 || px[p0 * 4 + 3] < 16) continue;
      const n = boites.length;
      const boite = { x0, y0, x1: x0, y1: y0, n: 0 };
      const pile = [p0];
      etiq[p0] = n;
      while (pile.length) {
        const p = pile.pop();
        const x = p % W; const y = (p - x) / W;
        boite.n += 1;
        if (x < boite.x0) boite.x0 = x;
        if (x > boite.x1) boite.x1 = x;
        if (y < boite.y0) boite.y0 = y;
        if (y > boite.y1) boite.y1 = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (etiq[q] !== -1 || px[q * 4 + 3] < 16) continue;
          etiq[q] = n;
          pile.push(q);
        }
      }
      boites.push(boite);
    }
  }

  /* Les miettes — un éclat détaché, une boucle d'oreille isolée — ne sont pas
     des personnages. Le seuil est relatif à la plus grosse pièce trouvée. */
  const plusGrand = Math.max(...boites.map((b) => b.n));
  const têtes = boites.filter((b) => b.n > plusGrand * 0.12)
    .sort((a, b) => (Math.round(a.y0 / 120) - Math.round(b.y0 / 120)) || (a.x0 - b.x0));

  const out = [];
  for (const b of têtes) {
    const w = b.x1 - b.x0 + 1; const h = b.y1 - b.y0 + 1;
    const c = document.createElement('canvas');
    /* Un cadre carré, centré sur la tête : le médaillon de l'en-tête est un
       disque, et une image plus haute que large s'y pose de travers. */
    const cote = Math.max(w, h);
    c.width = cote; c.height = cote;
    const ctx = c.getContext('2d');
    ctx.drawImage(grand, b.x0, b.y0, w, h,
      Math.round((cote - w) / 2), Math.round((cote - h) / 2), w, h);
    out.push({ x: b.x0, y: b.y0, w, h, data: c.toDataURL('image/png') });
  }
  return out;
});

tuiles.forEach((t, i) => {
  writeFileSync(`${DOSSIER}/tete-${String(i + 1).padStart(2, '0')}.png`,
    Buffer.from(t.data.split(',')[1], 'base64'));
});
console.log(`${tuiles.length} têtes écrites dans ${DOSSIER}`);
console.log(tuiles.map((t, i) => `${i + 1}:${t.w}×${t.h}`).join(' '));
const attendu = COLONNES * LIGNES;
console.log(tuiles.length === attendu
  ? `✓ ${attendu} îlots trouvés, autant que de cases annoncées`
  : `⚠ ${tuiles.length} îlots pour ${attendu} cases annoncées : des têtes se touchent, ou se détachent en morceaux`);
await navigateur.close();
