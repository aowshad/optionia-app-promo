// Optionia logo, rebuilt from the supplied SVGs so it can animate:
//  - mark: gradient tile + drawable glyph (ring/cross) + corner piece
//  - wordmark: 8 letter paths, each revealed through a shared clip (per-letter)
import { h } from "./basics.js";

const parse = (txt) => new DOMParser().parseFromString(txt, "image/svg+xml").documentElement;

export const MARK = { size: 170, radius: 40.3711 };
export const WORDMARK = { w: 554, h: 136, gap: 28, dy: 21 };   // lockup geometry from Figma "Logo"

/**
 * The app icon at native size (170). Starts life in S1 as a violet swatch:
 * `veil` is a flat swatch-colour layer over the gradient that fades during the morph.
 */
export function createMark(iconSvg, veilColor) {
  const svg = parse(iconSvg);
  svg.setAttribute("class", "mark-svg");
  const paths = [...svg.querySelectorAll("g > path")];
  // Icon.svg structure: [0..2] corner piece (fill, outline, outline stroke), [3] top bar, [4] ring + cross.
  const corner = paths.slice(0, 3);
  const glyph = paths.slice(3);

  const ns = "http://www.w3.org/2000/svg";
  const cornerG = document.createElementNS(ns, "g");
  cornerG.setAttribute("class", "mark-corner");
  corner[0].before(cornerG);
  corner.forEach((p) => cornerG.append(p));

  // Glyph draws on as a stroke, then fills.
  for (const p of glyph) {
    p.setAttribute("pathLength", "1");
    p.setAttribute("stroke", "#fff");
    p.setAttribute("stroke-width", "1.6");
    p.setAttribute("stroke-linejoin", "round");
    p.style.strokeDasharray = "1 1";
    p.style.strokeDashoffset = "1";
    p.style.fillOpacity = "0";
  }

  const el = h("div", "mark");
  const veil = h("div", "mark-veil", "", { background: veilColor });
  el.append(svg, veil);
  return { el, svg, glyph, corner: cornerG, veil };
}

/** Wordmark with every letter inside one clip so each can rise from below its baseline. */
export function createWordmark(wordmarkSvg, color) {
  const src = parse(wordmarkSvg);
  const letters = [...src.querySelectorAll(":scope > path[fill]")].map((p) => p.getAttribute("d"));
  const el = h("div", "wordmark");
  el.innerHTML = `
    <svg width="${WORDMARK.w}" height="${WORDMARK.h}" viewBox="0 0 ${WORDMARK.w} ${WORDMARK.h}" fill="none" overflow="visible">
      <defs><clipPath id="wm-clip"><rect x="-4" y="-6" width="${WORDMARK.w + 8}" height="${WORDMARK.h + 8}"/></clipPath></defs>
      <g clip-path="url(#wm-clip)">
        ${letters.map((d) => `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="1.67929"/>`).join("")}
      </g>
    </svg>`;
  return { el, letters: [...el.querySelectorAll("path")] };
}
