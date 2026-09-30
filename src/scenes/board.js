// The board: every scene as a frame on the canvas (Figma-style), laid out 3×3 around the end
// card. S8 is the real scene in the top-left slot; the rest are compositions rebuilt from the
// same components, so the pull-back reads as "the whole film was one canvas".
import { h, place } from "../components/basics.js";
import { ICONS, productTile } from "../components/chips.js";
import { createMark, createWordmark } from "../components/logo.js";
import { createOptionSet, THEMES } from "../components/optionset.js";
import { createStylePanel, setSlider } from "../components/stylepanel.js";

const STEP = { x: 2300, y: 1500 };

function frame(world, cx, cy, label) {
  const el = place(h("div", "bframe", `<div class="bf-bg"></div><div class="bf-lbl">${label}</div><div class="bf-c"></div>`), cx - 960, cy - 540);
  world.append(el);
  return { el, c: el.querySelector(".bf-c") };
}

const headline = (html, x, y, size, align = "left", w) => {
  const el = place(h("div", "headline", html), x, y, w);
  el.style.cssText += `font-size:${size}px;text-align:${align};`;
  return el;
};

const builders = {
  logo(c, { assets }) {
    const wrap = place(h("div"), 960 - 376, 540 - 85, 752, 170);
    wrap.style.transform = "scale(1.5)";
    const mark = createMark(assets.icon, "#8B5CF6");
    mark.veil.style.opacity = 0;
    mark.glyph.forEach((p) => { p.style.strokeDashoffset = "0"; p.style.fillOpacity = "1"; });
    const wm = createWordmark(assets.wordmark, "#07004F");
    wrap.append(place(mark.el, 0, 0), place(wm.el, 198, 21));
    c.append(wrap);
  },
  sentence(c) {
    const el = place(h("div", "kline", `<span class="kp kp1">Product options</span><span class="kp kp2">for every store.</span>`), 0, 0);
    el.style.transform = "scale(0.62)";
    el.style.transformOrigin = "0 0";
    c.append(el);
    el.style.left = `${960 - (el.offsetWidth * 0.62) / 2}px`;
    el.style.top = `${540 - (el.offsetHeight * 0.62) / 2}px`;
  },
  hook(c) {
    c.append(headline(`<div>Add More <span class="orb-static"><i></i><i></i></span> Options</div><div>Sell More Products</div>`, 0, 250, 112, "center", 1920));
    ["tshirt", "necklace", "hoodie", "mug", "tote", "cap"].forEach((p, i) => {
      const t = productTile(`assets/products/sm/${p}.png`, 236);   // right-sized: only ever seen small
      c.append(place(t.wrap, 312 + i * 212, 600));
      t.tile.style.transform = `rotate(${[-6, 4, -4, 5, -5, 4][i]}deg)`;
    });
  },
  grid(c) {
    c.append(headline(`16 <span style="font-size:.4em;font-weight:500;opacity:.75">option types</span>`, 150, 40, 110));
    const names = [["text", "Text"], ["textarea", "Text area"], ["number", "Number"], ["dropdown", "Dropdown"], ["radio", "Radio button"], ["checkbox", "Checkbox"],
      ["color", "Color swatch"], ["image", "Image swatch"], ["date", "Date picker"], ["upload", "File upload"], ["multicolor", "Multi-color"], ["multiimage", "Multi-image"],
      ["heading", "Heading"], ["paragraph", "Paragraph"], ["divider", "Divider"], ["html", "HTML"]];
    names.forEach(([ic, n], i) => {
      const cell = place(h("div", "s4-cell", `<div class="cbg glass"></div><div class="ct"><i>${ICONS[ic]}</i>${n}</div>
        <i class="bsk" style="top:110px;width:62%"></i><i class="bsk" style="top:150px;width:84%"></i><i class="bsk" style="top:190px;width:44%"></i>`),
        150 + (i % 4) * 412, 200 + Math.floor(i / 4) * 214, 380, 190);
      c.append(cell);
    });
  },
  style(c) {
    c.append(headline(`<div>Style every option</div><div>like your brand.</div>`, 120, 84, 92));
    const panel = createStylePanel();
    c.append(place(panel.el, 120, 320));
    const w = panel.radius.track.offsetWidth;
    setSlider(panel.radius, 24, 32, w);
    setSlider(panel.thick, 3, 5, w);
    const set = createOptionSet({ theme: { ...THEMES[0], swr: 999, bw: 3, title: "#14433D", css: 1 } });
    c.append(place(set.el, 1080, 90));
  },
  themes(c) {
    c.append(headline("Or pick a theme. One click.", 0, 64, 92, "center", 1920));
    [1, 2, 5, 7, 9].forEach((ti, i) => {
      const set = createOptionSet({ theme: THEMES[ti] });
      c.append(place(set.el, 150 + i * 330, 260));
      set.el.style.transform = "scale(0.44)";
      set.el.style.transformOrigin = "0 0";
    });
  },
  revenue(c) {
    c.append(headline(`<div>Turn every click</div><div>into extra revenue.</div>`, 130, 380, 104));
    const set = createOptionSet({ theme: THEMES[9] });
    c.append(place(set.el, 1100, 120));
    set.el.style.transform = "scale(0.92)";
    set.el.style.transformOrigin = "0 0";
    set.addons.forEach((a) => a.box.setAttribute("data-on", "1"));
    set.addons.forEach((a) => (a.tick.style.strokeDashoffset = "0"));
    set.total.textContent = "$66.50";
    set.note.style.opacity = 1;
  },
};

/**
 * Build the board around `origin` (the real S8 scene centre, which sits in the top-left slot).
 * Returns the frame elements (to fade in), every group to recede in S9, the board centre and fit scale.
 */
export function buildBoard({ world, assets, shared, origin, scene }) {
  const slot = (c, r) => ({ x: origin.x + c * STEP.x, y: origin.y + r * STEP.y });
  const LAYOUT = [
    [1, 0, "01  Cold open", "logo"], [2, 0, "02  Sentence", "sentence"], [0, 1, "03  Hook", "hook"],
    [2, 1, "04  Every option", "grid"], [0, 2, "05  Make it yours", "style"], [1, 2, "06  Themes", "themes"], [2, 2, "07  Revenue", "revenue"],
  ];
  const frames = LAYOUT.map(([c, r, label, kind]) => {
    const s = slot(c, r);
    const f = frame(world, s.x, s.y, label);
    builders[kind](f.c, { assets, shared });
    return f.el;
  });
  // S8's own frame chrome sits behind the live scene.
  const s8 = frame(world, origin.x, origin.y, "08  Orders");
  world.insertBefore(s8.el, scene);
  frames.push(s8.el);

  const centre = slot(1, 1);
  const w = 2 * STEP.x + 1920, hh = 2 * STEP.y + 1080 + 160;
  const fit = Math.min((1920 * 0.92) / w, (1080 * 0.9) / hh);
  return { frames, groups: [...frames, scene], centre: { x: centre.x, y: centre.y - 50 }, fit, slot };
}
