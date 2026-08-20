/**
 * La sonde mobile : ce qui empêche de jouer, mesuré dans la page.
 *
 * Elle vivait dans `audit-mobile.mjs`, qui lance un serveur et fait tout son
 * parcours dès qu'on l'importe — donc impossible à réutiliser. L'audit du
 * paysage aurait dû la recopier, et deux copies d'une même mesure finissent
 * toujours par diverger : c'est la troisième fois dans ce projet qu'une
 * mesure dupliquée donne deux réponses.
 *
 * Elle est donc ici, seule, sans effet de bord. Les deux audits l'importent.
 *
 * Écrite d'un bloc et sans dépendance : elle est sérialisée puis évaluée dans
 * le navigateur, où rien de ce fichier n'existe.
 */

/** Ce qu'on considère comme touchable, et lisible. */
export const TAP_MIN = 44;
export const TEXT_MIN = 12;
/** Deux cibles graves plus proches que cela : on en touche une pour l'autre. */
export const GAP_MIN = 8;

export const PROBE = `(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = { overflow: [], small: [], crowded: [], clipped: [], tiny: [], hidden: [], scroll: null };

  const describe = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    const text = (el.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 34);
    return el.tagName.toLowerCase() + id + cls + (text ? ' « ' + text + ' »' : '');
  };

  // 1. Le débordement horizontal, et qui le cause.
  const doc = document.documentElement;
  out.scroll = { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.position === 'fixed') continue;
    // Ce qui dépasse à droite ou commence à gauche de l'écran.
    if (r.right > vw + 1 || r.left < -1) {
      out.overflow.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
  }

  // 2. Les cibles tactiles trop petites, et 3. celles trop serrées.
  //
  // On ne mesure pas la boîte de l'élément mais **ce que le doigt atteint** :
  // une icône de vingt points peut parfaitement avoir une zone de quarante,
  // par un remplissage ou un pseudo-élément étendu, et c'est ce que
  // recommande la règle. Inversement une grande boîte recouverte par autre
  // chose n'est pas touchable. elementFromPoint tranche les deux cas.
  const touchables = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [onclick]')];
  const boxes = [];
  /**
   * Ce qu'on voit vraiment d'un élément.
   *
   * L'intersection de **tous** les cadres qui le découpent, pas seulement du
   * plus proche : une ligne vit dans une carte qui coupe déjà, et cette carte
   * vit dans la zone défilante qui coupe encore. S'arrêter au premier donnait
   * une boîte qui débordait sur la barre du bas alors que rien ne dépasse.
   */
  const visibleBox = (el) => {
    const r = el.getBoundingClientRect();
    let box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (!/(auto|scroll|hidden)/.test(style.overflowY + style.overflowX)) continue;
      const c = node.getBoundingClientRect();
      box = {
        left: Math.max(box.left, c.left), right: Math.min(box.right, c.right),
        top: Math.max(box.top, c.top), bottom: Math.min(box.bottom, c.bottom),
      };
    }
    return {
      ...box,
      get width() { return this.right - this.left; },
      get height() { return this.bottom - this.top; },
    };
  };
  const reach = (el, cx, cy, dx, dy) => {
    const hit = document.elementFromPoint(cx + dx, cy + dy);
    return Boolean(hit) && (hit === el || el.contains(hit) || hit.contains(el));
  };
  const half = ${TAP_MIN} / 2 - 1;
  for (const el of touchables) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    boxes.push({ el, r });
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Hors de l'écran : ce n'est pas un défaut de taille.
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
    // Une boîte déjà au seuil n'a rien à prouver. La sonde ne sert qu'à
    // *rattraper* les petites cibles bien rembourrées — sans elle, un
    // voile ouvert par-dessus la page ferait échouer le test de portée de
    // tout l'écran, y compris d'un bouton qui occupe toute la largeur.
    const bigEnough = r.width >= ${TAP_MIN} - 0.5 && r.height >= ${TAP_MIN} - 0.5;
    if (bigEnough) continue;
    const wide = r.width >= ${TAP_MIN} - 0.5
      || (reach(el, cx, cy, -half, 0) && reach(el, cx, cy, half, 0));
    const tall = r.height >= ${TAP_MIN} - 0.5
      || (reach(el, cx, cy, 0, -half) && reach(el, cx, cy, 0, half));
    if (!wide || !tall) {
      out.small.push({
        el: describe(el),
        w: Math.round(r.width), h: Math.round(r.height),
        axis: !wide && !tall ? 'les deux' : wide ? 'hauteur' : 'largeur',
      });
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      // Deux surfaces différentes ne se disputent pas le doigt : une liste
      // qui court jusqu'à la barre du bas est la disposition normale, pas un
      // piège. La règle vise deux commandes voisines du même plan.
      // La barre de navigation est un contrôle, comme le segmenté : ses
      // onglets sont voisins par construction et aucun n'est destructeur.
      // Ce qu'on traque, ce sont deux commandes distinctes du même plan.
      const inNav = (el) => Boolean(el.closest('.nav, .tabbar'));
      if (inNav(boxes[i].el) || inNav(boxes[j].el)) continue;
      const a = visibleBox(boxes[i].el);
      const b = visibleBox(boxes[j].el);
      if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) continue;
      if (boxes[i].el.contains(boxes[j].el) || boxes[j].el.contains(boxes[i].el)) continue;
      // Un contrôle segmenté est **un** contrôle : ses parts sont voisines
      // par construction, et aucune n'est destructrice. La règle vise deux
      // boutons distincts dont l'un serait grave.
      const seg = boxes[i].el.closest('.segmented');
      if (seg && seg === boxes[j].el.closest('.segmented')) continue;
      // **Deux plans différents ne sont pas deux voisins.** Un bouton de
      // modale et une ligne restée derrière le voile se touchent à l'écran
      // et jamais sous le doigt : celle du dessous n'est pas cliquable. La
      // règle rapportait « Adopter un enfant » à trois points de
      // « Continuer », ce qui décrit une superposition, pas un voisinage.
      if (boxes[i].el.closest('.overlay') !== boxes[j].el.closest('.overlay')) continue;
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      const overlap = dx === 0 && dy === 0;
      const gap = Math.max(dx, dy);
      if (!overlap && gap < ${GAP_MIN}) {
        out.crowded.push({ a: describe(boxes[i].el), b: describe(boxes[j].el), gap: Math.round(gap) });
      }
    }
  }

  // 3 bis. Le texte coupé par une ellipse.
  //
  // Ajouté après coup : l'audit ne regardait que la taille de police et
  // rapportait zéro défaut pendant qu'une capture d'écran montrait
  // « Parco… » et « Proch… » dans la barre de navigation. Une mesure qui ne
  // voit pas ce qu'un coup d'œil voit ne mesure pas la bonne chose.
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const style = getComputedStyle(el);
    if (style.textOverflow !== 'ellipsis' && style.overflow !== 'hidden') continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      out.clipped.push({ el: describe(el), shown: el.clientWidth, needed: el.scrollWidth });
    }
  }

  // 4. Le texte trop petit pour être lu sans zoomer.
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const size = Number.parseFloat(getComputedStyle(el).fontSize);
    if (size && size < ${TEXT_MIN} - 0.01) {
      out.tiny.push({ el: describe(el), size: Math.round(size * 10) / 10 });
    }
  }

  // 5. Ce que la barre du bas recouvre.
  const nav = document.querySelector('.nav, .tabbar');
  const navBox = nav ? nav.getBoundingClientRect() : null;
  // Une feuille ou une modale recouvre la barre : elle ne masque alors rien,
  // et la compter donnerait des dizaines de faux positifs.
  const navOnTop = Boolean(navBox) && (() => {
    const hit = document.elementFromPoint(navBox.left + navBox.width / 2, navBox.top + 4);
    return Boolean(hit) && nav.contains(hit);
  })();
  if (nav && navOnTop) {
    const navTop = navBox.top;
    for (const el of touchables) {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || nav.contains(el)) continue;
      // Ce qui compte, c'est le **recouvrement** : la barre passe-t-elle
      // par-dessus ? Une ligne simplement coupée par le bas de sa propre
      // zone défilante n'est pas masquée, elle attend qu'on défile — et la
      // compter faisait remonter dix-sept faux positifs.
      // Ce qui est découpé par sa propre zone défilante n'est pas masqué :
      // il suffit de faire défiler. On ne regarde donc que ce qu'on voit.
      const v = visibleBox(el);
      const covered = v.height > 0 && v.bottom > navTop + 1 && v.top < navBox.bottom
        && v.right > navBox.left && v.left < navBox.right;
      if (covered) {
        out.hidden.push({ el: describe(el), top: Math.round(r.top), navTop: Math.round(navTop) });
      }
    }
  }

  const dedupe = (list, key) => {
    const seen = new Set();
    return list.filter((x) => {
      const k = key(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  out.overflow = dedupe(out.overflow, (x) => x.el);
  out.small = dedupe(out.small, (x) => x.el + x.axis);
  out.crowded = dedupe(out.crowded, (x) => x.a + x.b);
  out.clipped = dedupe(out.clipped, (x) => x.el);
  out.tiny = dedupe(out.tiny, (x) => x.el + x.size);
  out.hidden = dedupe(out.hidden, (x) => x.el);
  return out;
})()`;
