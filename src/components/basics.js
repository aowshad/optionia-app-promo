// Small DOM factories shared across scenes.

export function h(tag, cls = "", html = "", style = {}) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  Object.assign(el.style, style);
  return el;
}

/** Absolutely place an element in world coordinates. */
export function place(el, x, y, w, hgt) {
  Object.assign(el.style, { position: "absolute", left: `${x}px`, top: `${y}px` });
  if (w !== undefined) el.style.width = `${w}px`;
  if (hgt !== undefined) el.style.height = `${hgt}px`;
  return el;
}

/** Glass card: white, 24px radius, 70% white border, lavender shadow, light blur. */
export function glassCard({ w, h: hgt, radius = 24, blur = true, html = "" } = {}) {
  const bobWrap = h("div", "bob");
  const card = h("div", `glass${blur ? " glass--blur" : ""}`, html, {
    width: `${w}px`, height: hgt ? `${hgt}px` : "auto", borderRadius: `${radius}px`,
  });
  bobWrap.append(card);
  return { wrap: bobWrap, card };
}

/** Faded rounded-square tile grid (the banners' bottom-right texture). */
export function pixelTiles({ cols = 8, rows = 5, size = 44, gap = 10, corner = "br" } = {}) {
  const el = h("div", "tiles", "", {
    gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: `${gap}px`,
  });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Stronger toward the chosen corner, fading out diagonally.
      const cx = corner.includes("r") ? c / (cols - 1) : 1 - c / (cols - 1);
      const cy = corner.includes("b") ? r / (rows - 1) : 1 - r / (rows - 1);
      const k = Math.max(0, (cx + cy) / 2);
      const o = Math.pow(k, 2.2) * 0.9;
      el.append(h("i", "", "", { width: `${size}px`, height: `${size}px`, opacity: o.toFixed(3) }));
    }
  }
  return el;
}

/**
 * A scene layer drawn at local scale k with its origin at world point P (S4–S6 share one).
 * L(x, y) maps local → world; R(el) gives an element's world rect.
 */
export function makeLayer(world, P, k, cls = "s4") {
  const root = place(h("div", cls), P.x, P.y);
  root.style.transform = `scale(${k})`;
  world.append(root);
  const L = (x, y) => ({ x: P.x + k * x, y: P.y + k * y });
  const local = (el) => worldRect(el, root);
  const R = (el) => {
    const r = local(el);
    return { x: P.x + k * r.x, y: P.y + k * r.y, w: k * r.w, h: k * r.h, cx: P.x + k * r.cx, cy: P.y + k * r.cy };
  };
  return { root, L, R, local, P, k };
}

/** Offset of `el` relative to the world origin (ignores transforms — final layout). */
export function worldRect(el, world) {
  let x = 0, y = 0, n = el;
  while (n && n !== world) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}
