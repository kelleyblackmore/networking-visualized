// kit.js — tiny DOM/SVG + animation toolkit shared by every visualization.
// No dependencies, no build step.

export const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ *
 * element builders
 * ------------------------------------------------------------------ */

function apply(node, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') node.setAttribute('class', v);
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  return node;
}

function append(node, kids) {
  for (const kid of [].concat(kids || [])) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return node;
}

/** Build an HTML element. */
export function el(tag, props, kids) {
  return append(apply(document.createElement(tag), props), kids);
}

/** Build an SVG element. */
export function s(tag, props, kids) {
  return append(apply(document.createElementNS(NS, tag), props), kids);
}

/* ------------------------------------------------------------------ *
 * ticker — one clock for the whole page
 *
 * Uses rAF when the tab is visible and falls back to timers when it is
 * not, so animations still advance in a background/hidden tab (and so
 * headless verification works).
 * ------------------------------------------------------------------ */

const subs = new Set();
let handle = null, timerHandle = null, last = null;

function schedule() {
  if (!subs.size) { handle = timerHandle = last = null; return; }
  if (document.visibilityState === 'visible') handle = requestAnimationFrame(tick);
  else timerHandle = setTimeout(tick, 16);
}

function tick() {
  handle = timerHandle = null;
  const now = performance.now();
  const dt = last == null ? 16 : Math.min(now - last, 64);
  last = now;
  for (const fn of [...subs]) { try { fn(dt, now); } catch (e) { console.error(e); } }
  schedule();
}

function subscribe(fn) {
  subs.add(fn);
  if (handle == null && timerHandle == null) { last = performance.now(); schedule(); }
  return () => subs.delete(fn);
}

document.addEventListener('visibilitychange', () => {
  // Re-arm on the other clock so a tab switch never strands the loop.
  if (handle != null) { cancelAnimationFrame(handle); handle = null; }
  if (timerHandle != null) { clearTimeout(timerHandle); timerHandle = null; }
  last = performance.now();
  schedule();
});

/* ------------------------------------------------------------------ *
 * animation primitives
 * ------------------------------------------------------------------ */

export const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
  linear: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};

/** Animate 0→1 over `dur` ms, calling onUpdate(t). Resolves when done. */
export function tween(dur, onUpdate, easing = ease.inOut) {
  if (reduceMotion()) { onUpdate(1); return Promise.resolve(); }
  return new Promise(resolve => {
    let elapsed = 0;
    const stop = subscribe(dt => {
      elapsed += dt;
      const p = Math.min(elapsed / dur, 1);
      onUpdate(easing(p), p);
      if (p >= 1) { stop(); resolve(); }
    });
  });
}

/** Pause. Honours reduced motion by collapsing to a short beat. */
export function wait(ms) {
  const d = reduceMotion() ? Math.min(ms, 60) : ms;
  return new Promise(r => setTimeout(r, d));
}

/**
 * Cancellable sequence guard. Each `begin()` invalidates the previous run;
 * `check()` throws a sentinel that `go()` swallows silently.
 */
export class Seq {
  constructor() { this.token = 0; }
  begin() { return ++this.token; }
  alive(t) { return t === this.token; }
  check(t) { if (t !== this.token) throw Seq.ABORT; }
  /** Run an async body that receives (t, check). Later calls cancel earlier ones. */
  go(body) {
    const t = this.begin();
    const check = () => this.check(t);
    return Promise.resolve()
      .then(() => body(t, check))
      .catch(e => { if (e !== Seq.ABORT) throw e; });
  }
}
Seq.ABORT = Symbol('abort');

/* ------------------------------------------------------------------ *
 * SVG shorthands
 * ------------------------------------------------------------------ */

export const line = (x1, y1, x2, y2, p) => s('line', { x1, y1, x2, y2, ...p });
export const rect = (x, y, w, h, p) => s('rect', { x, y, width: w, height: h, rx: 4, ...p });
export const circle = (cx, cy, r, p) => s('circle', { cx, cy, r, ...p });
export const path = (d, p) => s('path', { d, ...p });
export const g = (p, kids) => s('g', p, kids);

export const text = (x, y, str, p) =>
  s('text', { x, y, class: 'lbl', 'text-anchor': 'middle', 'dominant-baseline': 'middle', ...p }, [String(str)]);

// Width of one monospace char at font-size 11, with headroom so chips stay
// comfortable when the stylesheet scales SVG text up on small screens.
const CHAR_W = 6.9;

export function chipWidth(label, pad = 14) {
  return Math.max(28, String(label).length * CHAR_W + pad * 2);
}

/**
 * A rounded label chip centred on (cx, cy). Returns the <g>, augmented with
 * `.setText(str)`, `.box` and `.label`.
 */
export function chip(cx, cy, label, opts = {}) {
  const { h: height = 20, cls = '', pad = 12, fontSize = 11, anchor = 'middle' } = opts;
  const box = rect(0, cy - height / 2, 0, height, { rx: 5, class: `chip-box ${cls}` });
  const label_ = text(0, cy + 0.5, label, { class: `chip-text ${cls}`, 'font-size': fontSize });
  const node = g({ class: `chip ${cls}` }, [box, label_]);

  // The box tracks its label, so a chip built with a placeholder and filled in
  // later still ends up with text that fits inside it.
  function layout(str) {
    const w = opts.w || chipWidth(str, pad);
    const x = anchor === 'start' ? cx : anchor === 'end' ? cx - w : cx - w / 2;
    box.setAttribute('x', x);
    box.setAttribute('width', w);
    label_.setAttribute('x', x + w / 2);
    node.x = x; node.y = cy - height / 2; node.w = w; node.h = height;
    node.cx = x + w / 2; node.cy = cy;
  }
  layout(String(label));

  node.box = box; node.label = label_;
  node.setText = str => { label_.textContent = str; layout(String(str)); };
  return node;
}

/** Device glyph (monitor / phone / server / cloud). Returns a <g> at (x, y) top-left. */
export function device(kind, x, y, opts = {}) {
  const { w = 34, h = 26, cls = '' } = opts;
  const gg = g({ class: `dev dev-${kind} ${cls}`, transform: `translate(${x} ${y})` });
  if (kind === 'phone') {
    gg.append(rect(w / 2 - 8, 0, 16, h, { rx: 3, class: 'dev-body' }),
      line(w / 2 - 4, h - 4, w / 2 + 4, h - 4, { class: 'dev-line' }));
  } else if (kind === 'server') {
    for (let i = 0; i < 3; i++) {
      gg.append(rect(2, i * 9, w - 4, 7, { rx: 2, class: 'dev-body' }),
        circle(7, i * 9 + 3.5, 1.6, { class: 'dev-led' }));
    }
  } else if (kind === 'cloud') {
    gg.append(path(`M8 ${h - 6}h${w - 16}a7 7 0 0 0 1-13.8A10 10 0 0 0 ${w / 2 - 2} 2a9 9 0 0 0-8.6 6.4A7 7 0 0 0 8 ${h - 6}z`,
      { class: 'dev-body' }));
  } else if (kind === 'router') {
    gg.append(rect(0, h - 12, w, 12, { rx: 3, class: 'dev-body' }));
    for (let i = 0; i < 4; i++) gg.append(circle(6 + i * 7, h - 6, 1.6, { class: 'dev-led' }));
    gg.append(line(w / 2 - 6, h - 12, w / 2 - 10, 2, { class: 'dev-line' }),
      line(w / 2 + 6, h - 12, w / 2 + 10, 2, { class: 'dev-line' }));
  } else { // monitor
    gg.append(rect(0, 0, w, h - 7, { rx: 3, class: 'dev-body' }),
      line(w / 2, h - 7, w / 2, h - 3, { class: 'dev-line' }),
      line(w / 2 - 7, h - 2, w / 2 + 7, h - 2, { class: 'dev-line' }));
  }
  gg.w = w; gg.h = h; gg.cx = x + w / 2; gg.cy = y + h / 2;
  return gg;
}

/* ------------------------------------------------------------------ *
 * motion helpers
 * ------------------------------------------------------------------ */

/** Move a node from (x1,y1) to (x2,y2). */
export function moveTo(node, x1, y1, x2, y2, dur = 700, easing = ease.inOut) {
  node.setAttribute('transform', `translate(${x1} ${y1})`);
  return tween(dur, t => {
    node.setAttribute('transform', `translate(${x1 + (x2 - x1) * t} ${y1 + (y2 - y1) * t})`);
  }, easing);
}

/** Move a node along an SVG <path>, optionally over a sub-range of it. */
export function moveAlong(node, pathEl, { dur = 900, from = 0, to = 1, easing = ease.inOut, onTick } = {}) {
  const len = pathEl.getTotalLength();
  return tween(dur, t => {
    const p = pathEl.getPointAtLength(len * (from + (to - from) * t));
    node.setAttribute('transform', `translate(${p.x} ${p.y})`);
    onTick && onTick(t, p);
  }, easing);
}

/** Draw a stroked path on, like a pen. */
export function drawPath(pathEl, dur = 600) {
  const len = pathEl.getTotalLength();
  pathEl.style.strokeDasharray = len;
  pathEl.style.strokeDashoffset = len;
  return tween(dur, t => { pathEl.style.strokeDashoffset = len * (1 - t); }, ease.out)
    .then(() => { pathEl.style.strokeDasharray = ''; pathEl.style.strokeDashoffset = ''; });
}

/**
 * Make an SVG node behave like a button: clickable, focusable and activated by
 * Enter/Space. Every in-diagram affordance should go through this.
 */
export function tappable(node, onActivate, label) {
  node.classList.add('tappable');
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'button');
  if (label) node.setAttribute('aria-label', label);
  node.addEventListener('click', onActivate);
  node.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onActivate(e);
    }
  });
  return node;
}

/** Briefly add a class (for flashes/pulses). */
export async function flash(node, cls = 'is-hit', ms = 420) {
  node.classList.add(cls);
  await wait(ms);
  node.classList.remove(cls);
}

/* ------------------------------------------------------------------ *
 * misc
 * ------------------------------------------------------------------ */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/** Deterministic-ish hex byte pairs, e.g. for MAC addresses. */
export const hexByte = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
