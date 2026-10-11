// The background: the real sky positions of every star that hosts a known planet,
// drawn in a Hammer projection (a whole-sky map). Costs no image download.
import { starRGB } from './model.js';

const D = Math.PI / 180;

// Hammer projection, normalised so x and y both span -1..1 (the map is a 2:1 ellipse).
export function hammer(ra, dec, shift = 0) {
  let lam = 180 - ra + shift;
  lam = ((lam + 180) % 360 + 360) % 360 - 180;
  const l = (lam * D) / 2, ph = dec * D, cp = Math.cos(ph);
  const k = Math.sqrt(1 + cp * Math.cos(l));
  return [(cp * Math.sin(l)) / k, Math.sin(ph) / k];
}

const PAL = [[255, 176, 138], [255, 210, 161], [255, 241, 214], [244, 244, 255], [207, 224, 255], [223, 230, 255]];
const SIZE = [1.0, 1.4, 2.0];          // CSS pixels, faint / medium / bright
const ALPHA = [0.34, 0.55, 0.85];
const colourBucket = (t) => (t == null ? 5 : t < 3900 ? 0 : t < 5200 ? 1 : t < 6000 ? 2 : t < 7500 ? 3 : 4);

export function prepare(hosts) {
  const n = hosts.length;
  const ra = new Float32Array(n), dec = new Float32Array(n), group = new Uint8Array(n);
  hosts.forEach((h, i) => {
    ra[i] = h.ra; dec[i] = h.dec;
    const tier = h.dist == null ? 0 : h.dist < 100 ? 2 : h.dist < 600 ? 1 : 0;   // nearer stars look brighter
    group[i] = colourBucket(h.teff) * 3 + tier;
  });
  const lists = Array.from({ length: 18 }, () => []);
  for (let i = 0; i < n; i++) lists[group[i]].push(i);
  return { ra, dec, lists, hosts };
}

function paint(ctx, w, h, data, o) {
  const { Wm, cx, cy, shift, dpr, grid } = o, Hm = Wm / 2;
  ctx.clearRect(0, 0, w, h);
  if (grid) {
    ctx.lineWidth = dpr; ctx.strokeStyle = o.gridColour || 'rgba(150,175,255,0.075)';
    ctx.beginPath(); ctx.ellipse(cx, cy, Wm / 2, Hm / 2, 0, 0, Math.PI * 2);
    const line = (pts) => {
      let prev = null;
      for (const [x, y] of pts) {
        const px = cx + x * Wm / 2, py = cy - y * Hm / 2;
        if (prev !== null && Math.abs(x - prev) < 0.5) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        prev = x;
      }
    };
    for (let ra = 0; ra < 360; ra += 30) { const pts = []; for (let d = -90; d <= 90; d += 6) pts.push(hammer(ra, d, shift)); line(pts); }
    for (let d = -60; d <= 60; d += 30) { const pts = []; for (let ra = 0; ra <= 360; ra += 6) pts.push(hammer(ra, d, shift)); line(pts); }
    ctx.stroke();
  }
  for (let g = 0; g < 18; g++) {
    const list = data.lists[g]; if (!list.length) continue;
    const c = PAL[(g / 3) | 0], tier = g % 3, s = SIZE[tier] * dpr * (o.starScale || 1);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, ALPHA[tier] * (o.alpha || 1))})`;
    ctx.beginPath();
    for (const i of list) {
      const [x, y] = hammer(data.ra[i], data.dec[i], shift);
      ctx.rect(cx + x * Wm / 2 - s / 2, cy - y * Hm / 2 - s / 2, s, s);
    }
    ctx.fill();
  }
  if (o.highlight) {
    const [x, y] = hammer(o.highlight.ra, o.highlight.dec, shift);
    const px = cx + x * Wm / 2, py = cy - y * Hm / 2;
    ctx.strokeStyle = '#FFB454'; ctx.fillStyle = '#FFB454'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.arc(px, py, 7 * dpr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 2.6 * dpr, 0, Math.PI * 2); ctx.fill();
  }
}

export class Sky {
  constructor(canvas, hosts) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.data = prepare(hosts);
    this.shift = 0; this.running = false; this.last = 0;
    this.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); else if (this.want) this.start(); });
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.dpr = dpr; this.w = this.c.width = Math.round(innerWidth * dpr); this.h = this.c.height = Math.round(innerHeight * dpr);
    this.draw();
  }
  draw() {
    const { w, h, dpr } = this;
    const Wm = Math.max(w * 1.35, h * 2.5);
    paint(this.ctx, w, h, this.data, { Wm, cx: w / 2, cy: h * 0.47, shift: this.shift, dpr, grid: true });
  }
  frame = (now) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    if (now - this.last >= 40) {          // about 25 frames a second is plenty for a slow drift
      this.shift = (this.shift + dt * 0.5) % 360; this.last = now; this.draw();
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  start() { this.want = true; if (this.reduce || this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  stop() { this.want = false; this.pause(); }
}

// A small, still whole-sky map with one star marked (used in the planet panel).
export function drawMiniSky(canvas, data, highlight) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr));
  const h = canvas.height = Math.round(w / 2);
  paint(canvas.getContext('2d'), w, h, data, { Wm: w * 0.985, cx: w / 2, cy: h / 2, shift: 0, dpr, grid: true, alpha: 1.5, starScale: 0.9, gridColour: 'rgba(150,175,255,0.16)', highlight });
}
