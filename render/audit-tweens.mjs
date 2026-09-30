// Lists tweens that animate the same property of the same element over overlapping time —
// they fight each other and the result depends on seek order.   node render/audit-tweens.mjs
import { openFilm } from "./browser.mjs";

const film = await openFilm({ width: 960, height: 540 });
const clashes = await film.page.evaluate(() => {
  const SKIP = new Set(["immediateRender", "duration", "ease", "stagger", "onUpdate", "overwrite", "transformOrigin", "transformPerspective",
    "lazy", "delay", "parent", "startAt", "runBackwards", "data", "id", "callbackScope", "onComplete", "onStart", "keyframes"]);
  const byTarget = new Map();
  const label = (el) => el && el.nodeType === 1 ? `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(" ")[0]}` : "proxy";
  for (const tw of window.__tl.getChildren(true, true, false)) {
    const start = tw.startTime() + (tw.parent !== window.__tl ? tw.parent.startTime() : 0), end = start + tw.duration();
    if (tw.duration() === 0) continue;
    const props = Object.keys(tw.vars).filter((k) => !SKIP.has(k));
    for (const t of tw.targets()) {
      if (!byTarget.has(t)) byTarget.set(t, []);
      byTarget.get(t).push({ start, end, props });
    }
  }
  const out = [];
  for (const [t, list] of byTarget) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (b.start >= a.end - 1e-6) continue;
      const same = a.props.filter((p) => b.props.includes(p));
      if (same.length) out.push(`${label(t)}  [${same.join(",")}]  ${a.start.toFixed(2)}–${a.end.toFixed(2)}s overlaps ${b.start.toFixed(2)}–${b.end.toFixed(2)}s`);
    }
  }
  return out;
});
await film.close();
console.log(clashes.length ? clashes.join("\n") : "No overlapping tweens on the same property.");
process.exit(clashes.length ? 1 : 0);
