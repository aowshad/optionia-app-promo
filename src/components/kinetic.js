// Kinetic-type helpers.
// Splitting text into inline-block letters destroys kerning, so instead we lay the text
// out normally, measure every glyph with a Range, then pin each letter absolutely at its
// measured x. The split text is pixel-identical to the unsplit text.

/**
 * Freeze the current layout boxes of several siblings (so splitting can't reflow them).
 * All boxes are measured before any is pinned — pinning one would reflow the rest.
 */
export function freeze(...els) {
  const boxes = els.map((el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
  els.forEach((el, i) => {
    const b = boxes[i];
    Object.assign(el.style, { position: "absolute", left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, margin: 0 });
  });
  return boxes;
}

/** Baseline offset from the element's top edge (measured with a zero-size inline-block probe). */
export function baselineOf(el) {
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  el.append(probe);
  const y = probe.offsetTop;
  probe.remove();
  return y;
}

/**
 * Replace the element's text with absolutely positioned letter spans at their kerned x.
 * Returns [{ el, ch, x, w }] for every non-space character.
 */
export function splitKerned(el) {
  const text = el.textContent;
  el.textContent = text;
  const node = el.firstChild;
  const base = el.getBoundingClientRect();
  const k = el.offsetWidth / base.width;           // undo any ancestor scale (preview stage fit)
  const r = document.createRange();
  const glyphs = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") continue;
    r.setStart(node, i);
    r.setEnd(node, i + 1);
    const b = r.getBoundingClientRect();
    glyphs.push({ ch: text[i], x: (b.left - base.left) * k, w: b.width * k });
  }
  el.textContent = "";
  for (const g of glyphs) {
    const s = document.createElement("span");
    s.className = "kc";
    s.textContent = g.ch;
    s.style.left = `${g.x}px`;
    el.append(s);
    g.el = s;
  }
  return glyphs;
}
