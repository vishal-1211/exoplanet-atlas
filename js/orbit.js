// A top-down, animated picture of a system's orbits, drawn from the real orbit size, shape (eccentricity) and
// year length of each planet. Not to scale in two ways, both said in the caption: distances use a square-root
// scale so close-in planets stay visible, and speeds are compressed so slow planets still move.
// The tilt and rotation of each orbit are not measured for most planets, so every ellipse points the same way.
import { look, starRGB } from './model.js';
import { hzRange } from './system.js';

const short = (p) => (p.name.startsWith(p.host + ' ') ? p.name.slice(p.host.length + 1) : p.name);

function kepler(M, e) {          // solve Kepler's equation for the eccentric anomaly
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

export class OrbitView {
  constructor(canvas, { reduceMotion = false } = {}) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.reduce = reduceMotion;
    this.items = []; this.raf = 0; this.t0 = 0; this.visible = true; this.hold = null;
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { this.visible = en[en.length - 1].isIntersecting; this.visible ? this.start() : this.stop(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }
  set(planets, highlight) {
    const list = planets.filter((p) => p.sma > 0 && p.per > 0).sort((a, b) => a.sma - b.sma);
    this.hl = highlight; this.star = list[0] || null;
    this.hz = list.length ? hzRange(list.find((p) => p.srad && p.teff) || list[0]) : null;
    const pmin = Math.min(...list.map((p) => p.per));
    this.amax = Math.max(...list.map((p) => p.sma * (1 + (p.ecc || 0))), this.hz && this.hz.outer < list[list.length - 1].sma * 3 ? this.hz.outer : 0);
    this.items = list.map((p, i) => ({ p, e: Math.min(0.95, p.ecc || 0), speed: (2 * Math.PI) / Math.min(40, 3 * Math.sqrt(p.per / pmin)), phase: (i * 2.399) % (2 * Math.PI), col: look(p).colors }));
    this.c.setAttribute('aria-label', list.length ? `Top-down view of the orbits of ${list.length} planet${list.length > 1 ? 's' : ''} of ${list[0].host}, animated.` : 'No orbit data');
    this.resize(); this.draw(0);
  }
  resize() {
    const w = this.c.clientWidth || 400, h = Math.round(Math.min(380, Math.max(260, w * 0.62))), d = Math.min(devicePixelRatio || 1, 2);
    this.W = w; this.H = h; this.c.width = w * d; this.c.height = h * d; this.c.style.height = h + 'px'; this.g.setTransform(d, 0, 0, d, 0, 0);
  }
  r(a) { return (Math.sqrt(a / this.amax) * Math.min(this.W / 2 - 34, this.H / 2 - 18)); }
  draw(t) {
    const g = this.g, W = this.W, H = this.H, cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    if (!this.items.length) return;
    if (this.hz) {   // habitable-zone ring
      const r0 = this.r(Math.min(this.hz.inner, this.amax)), r1 = this.r(Math.min(this.hz.outer, this.amax));
      if (r1 > r0 + 1) { g.beginPath(); g.arc(cx, cy, r1, 0, 7); g.arc(cx, cy, r0, 0, 7, true); g.fillStyle = 'rgba(108,192,139,.14)'; g.fill(); }
    }
    for (const it of this.items) {   // orbit paths
      const a = this.r(it.p.sma), b = a * Math.sqrt(1 - it.e * it.e);
      g.beginPath(); g.ellipse(cx - a * it.e, cy, a, b, 0, 0, 7);
      g.strokeStyle = it.p.name === this.hl ? 'rgba(255,180,84,.7)' : 'rgba(160,180,255,.28)'; g.lineWidth = 1; g.stroke();
    }
    const [sr, sg, sb] = starRGB(this.star.teff);
    g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fillStyle = `rgb(${sr},${sg},${sb})`; g.shadowColor = `rgb(${sr},${sg},${sb})`; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
    g.font = '600 11px Inter, system-ui, sans-serif'; g.textBaseline = 'middle';
    for (const it of this.items) {
      const a = this.r(it.p.sma), b = a * Math.sqrt(1 - it.e * it.e);
      const E = kepler(((t * it.speed + it.phase) % (2 * Math.PI)), it.e);
      const x = cx - a * it.e + a * Math.cos(E), y = cy + b * Math.sin(E);
      const sel = it.p.name === this.hl;
      g.beginPath(); g.arc(x, y, sel ? 6 : 4.5, 0, 7); g.fillStyle = it.col[2]; g.fill();
      g.lineWidth = sel ? 2 : 1; g.strokeStyle = sel ? '#FFB454' : 'rgba(255,255,255,.5)'; g.stroke();
      g.fillStyle = '#EAF0FF'; g.textAlign = 'left'; g.fillText(short(it.p), x + 8, y - 8);
    }
  }
  start() {
    if (this.raf || this.reduce || !this.items.length || !this.visible || document.hidden || !this.c.isConnected) return;
    const step = (now) => { this.t0 = this.t0 || now; this.draw((now - this.t0) / 1000); this.raf = requestAnimationFrame(step); };
    this.raf = requestAnimationFrame(step);
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}
