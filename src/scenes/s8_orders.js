// S8 · Custom orders — 2 bars from SCENE.s8.
// The Add to cart button flies down and morphs into the first row of a Polaris-style orders
// table. Rows stack in and each expands to show its submitted options (engraving, colour chip,
// artwork thumbnail, date). The cursor clicks Export; a CSV arcs into a downloads tray.
// Handoff: the camera pulls far back to reveal the board of every scene (S9 continues).
import { SCENE, sceneAt, BEAT, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place, worldRect } from "../components/basics.js";
import { ICONS } from "../components/chips.js";
import { splitWords, reveal, enter } from "../motion.js";
import { buildBoard } from "./board.js";
import { sfx } from "../clock.js";

const b = sceneAt(SCENE.s8);
const B = (n) => b(0) + n * BEAT;
const ART = "assets/art/artwork_160.png";

const ROWS = [
  { id: "#1043", date: "Oct 24", who: "Maya Rahman", img: "hoodie", prod: "Everyday Hoodie", total: "$66.50", status: ["Unfulfilled", "warn"],
    opts: [["Engraving", "“Custom engraving”"], ["Color", "", "#10B981", "Green"], ["Artwork", "", null, "artwork.png", ART], ["Delivery", "Oct 24, 2026"]] },
  { id: "#1042", date: "Oct 24", who: "Jordan Lee", img: "tshirt", prod: "Classic Tee", total: "$36.00", status: ["Paid", "ok"],
    opts: [["Name", "“Jordan”"], ["Color", "", "#F5F5F4", "White"], ["Print style", "Sunset"], ["Size", "L"]] },
  { id: "#1041", date: "Oct 23", who: "Priya Shah", img: "cap", prod: "Studio Cap", total: "$31.50", status: ["Unfulfilled", "warn"],
    opts: [["Embroidery", "“PS”"], ["Color", "", "#111827", "Black"], ["Artwork", "", null, "logo-final.png", ART], ["Gift wrap", "Yes"]] },
  { id: "#1040", date: "Oct 23", who: "Sam Carter", img: "mug", prod: "Morning Mug", total: "$24.00", status: ["Fulfilled", "done"],
    opts: [["Name", "“Sam”"], ["Handle", "", "#A78BFA", "Lavender"], ["Gift note", "“Stay curious”"], ["Delivery", "Oct 30, 2026"]] },
];

const DL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/></svg>`;
const CSV = `<svg width="46" height="56" viewBox="0 0 46 56"><path d="M4 2h26l14 14v36a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill="#fff" stroke="#C9CCD3" stroke-width="2"/><path d="M30 2v12a2 2 0 0 0 2 2h12" fill="#EEF0F4" stroke="#C9CCD3" stroke-width="2"/><rect x="6" y="32" width="28" height="14" rx="3" fill="#10B981"/><text x="20" y="42.5" text-anchor="middle" font-family="Inter" font-size="9" font-weight="700" fill="#fff">CSV</text></svg>`;

const chip = ([k, v, dot, label, img]) => `<span class="oc"><em>${k}</em>${dot ? `<i style="background:${dot}"></i>${label}` : img ? `<img src="${img}" alt="">${label}` : v}</span>`;

export function build(ctx) {
  const { tl, world, camera, cursor, shared, assets } = ctx;
  const { s7 } = shared;
  // Directly below the S7 card: the camera pulls back and down as the button drops into the table.
  const C8 = { x: s7.camCentre.x, y: s7.camCentre.y + 1700 };
  const scene = place(h("div", "scene"), C8.x - 960, C8.y - 540);
  world.append(scene);

  const head = place(h("div", "headline", `<div>Every custom order,</div><div>in one place.</div>`), 120, 70);
  head.style.fontSize = "92px";
  scene.append(head);
  const words = [...head.children].map((l) => splitWords(l));

  const table = place(h("div", "ot", `
    <div class="ot-h"><div><b>Orders</b><span>4 custom orders today</span></div>
      <div class="ot-act"><div class="ot-btn exp">${DL}<span>Export</span></div><div class="ot-btn">More actions</div></div></div>
    <div class="ot-tabs"><span>All</span><span>Unfulfilled</span><span class="on">With options</span></div>
    <div class="ot-r ot-colh"><span>Order</span><span>Date</span><span>Customer</span><span>Product</span><span>Options</span><span>Total</span><span>Status</span></div>
    ${ROWS.map((r) => `
      <div class="ot-row"><div class="ot-r"><b>${r.id}</b><span>${r.date}</span><span>${r.who}</span>
        <span class="pr"><img src="assets/products/sm/${r.img}.png" alt="">${r.prod}</span><span class="oc-n">${r.opts.length} options ▾</span>
        <b>${r.total}</b><span><i class="bdg ${r.status[1]}">${r.status[0]}</i></span></div>
        <div class="ot-d"><div class="ot-di">${r.opts.map(chip).join("")}</div></div></div>`).join("")}`), 120, 318, 1680);
  scene.append(table);
  const rows = [...table.querySelectorAll(".ot-row")];
  const details = rows.map((r) => r.querySelector(".ot-d"));
  const exportBtn = table.querySelector(".exp");

  const tray = place(h("div", "tray", `<div class="tray-h">Downloads</div>
    <div class="tray-f"><span class="ph"></span><div><b>orders-with-options.csv</b><em>4 orders · 12 KB</em></div><i class="ok">✓</i></div>`), 1460, 890, 380);
  scene.append(tray);
  const trayIcon = tray.querySelector(".ph"), trayOk = tray.querySelector(".ok");
  const file = place(h("div", "csv", CSV), 0, 0);
  scene.append(file);

  window.gsap.set([table, tray, file, ...rows], { opacity: 0 });
  details.forEach((d) => (d.style.height = "0px"));

  /* ═══ Beat 0–2: the button drops and becomes order #1043 ═══ */
  camera.moveTo(B(0), { x: C8.x, y: C8.y, scale: 1 });
  const row0 = rows[0].querySelector(".ot-r");
  const r0 = worldRect(row0, world);
  const proxy = place(h("div", "btn-proxy", `<span>Added to cart ✓</span>`), s7.btn.x, s7.btn.y, s7.btn.w, s7.btn.h);
  world.append(proxy);
  proxy.style.opacity = 0;
  tl.set(proxy, { opacity: 1 }, B(0));
  tl.fromTo(proxy, { left: s7.btn.x, top: s7.btn.y, width: s7.btn.w, height: s7.btn.h, borderRadius: s7.btn.h / 2, backgroundColor: "#F5F5F7" },
    { left: r0.x, top: r0.y, width: r0.w, height: r0.h, borderRadius: 10, backgroundColor: "#F3EEFF", duration: DUR.move, ease: EASE.move, immediateRender: false }, B(0));
  tl.fromTo(proxy.firstChild, { opacity: 1 }, { opacity: 0, duration: DUR.out, ease: EASE.out, immediateRender: false }, B(0.5));
  sfx(B(0), "whoosh", { dur: DUR.move });
  enter(tl, table, B(1));
  tl.set(rows[0], { opacity: 1 }, B(2));
  tl.set(proxy, { opacity: 0 }, B(2));
  tl.fromTo(row0, { backgroundColor: "#F3EEFF" }, { backgroundColor: "#FFFFFF", duration: DUR.move, ease: EASE.move }, B(2));
  reveal(tl, words[0], B(1));
  reveal(tl, words[1], B(2));

  /* ═══ Rows stack in, each expanding to show its submitted options ═══ */
  rows.forEach((r, i) => {
    if (i > 0) enter(tl, r, B(2 + i / 2));
    tl.fromTo(details[i], { height: 0 }, { height: 64, duration: DUR.in, ease: EASE.move }, B(2.5 + i / 2));
    sfx(B(2.5 + i / 2), "expand", { i });
  });

  /* ═══ Export → the CSV arcs down into the downloads tray ═══ */
  cursor.show(B(2), { x: C8.x + 1100, y: C8.y + 700 });
  const eR = worldRect(exportBtn, world);
  const tExp = B(5);
  const arrive = cursor.clickAt(tExp, { x: eR.x + eR.w * 0.62, y: eR.y + eR.h * 0.6 }, { dur: DUR.move });
  tl.set(exportBtn, { attr: { "data-hover": 1 } }, arrive);
  tl.set(exportBtn, { attr: { "data-hover": 0 } }, tExp + BEAT / 4);
  tl.fromTo(exportBtn, { scale: 1 }, { scale: 0.95, duration: DUR.press, ease: EASE.out, immediateRender: false }, tExp - DUR.press);
  tl.fromTo(exportBtn, { scale: 0.95 }, { scale: 1, duration: DUR.release, ease: EASE.in, immediateRender: false }, tExp);
  enter(tl, tray, tExp);
  const fx = eR.x - (C8.x - 960) + eR.w / 2 - 23, fy = eR.y - (C8.y - 540) + eR.h / 2 - 28;
  const ti = worldRect(trayIcon, scene);
  const drop = { x: ti.x + ti.w / 2 - 23 - fx, y: ti.y + ti.h / 2 - 28 - fy };
  place(file, fx, fy);
  tl.fromTo(file, { opacity: 0, scale: 0.6, x: 0, y: 0 }, { opacity: 1, scale: 1, x: 0, y: -40, duration: DUR.out, ease: EASE.in }, tExp);
  // Small arc: horizontal and vertical on different eases makes the path curve.
  tl.fromTo(file, { x: 0 }, { x: drop.x, duration: DUR.in, ease: EASE.move, immediateRender: false }, tExp + DUR.out);
  tl.fromTo(file, { y: -40 }, { y: drop.y, duration: DUR.in, ease: EASE.out, immediateRender: false }, tExp + DUR.out);
  tl.fromTo(file, { scale: 1 }, { scale: 0.62, duration: DUR.in, ease: EASE.move, immediateRender: false }, tExp + DUR.out);
  tl.fromTo(trayOk, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: DUR.in, ease: EASE.in }, tExp + DUR.out + DUR.in);
  sfx(tExp + DUR.out + DUR.in, "drop");
  cursor.hide(B(6));

  /* ═══ Handoff: pull back to the board of every scene ═══ */
  const board = buildBoard({ world, assets, shared, origin: C8, scene });
  tl.fromTo(board.frames, { opacity: 0 }, { opacity: 1, duration: DUR.in, ease: EASE.in }, B(5));   // off-screen until the pull-back
  camera.moveTo(B(6), { x: board.centre.x, y: board.centre.y, scale: board.fit });

  Object.assign(shared, { s8: { scene, board } });
  return b(2);
}
