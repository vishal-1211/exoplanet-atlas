// Draws one star's planets as an SVG string: distance from the star on a log scale, the zone where starlight
// is in a range that could allow liquid water, and planet size shown as circle size (sizes are NOT to the
// same scale as the distances). Pure string output, so it runs in the browser and in Node (static pages).
import { look, starRGB } from './model.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PL = 40, PR = 24;

export function hzRange(p) {
  if (!p.srad || !p.teff) return null;
  const L = p.srad * p.srad * Math.pow(p.teff / 5772, 4);
  return { inner: Math.sqrt(L / 1.7), outer: Math.sqrt(L / 0.25), L };
}

const short = (p) => (p.name.startsWith(p.host + ' ') ? p.name.slice(p.host.length + 1) : p.name);
const radiusPx = (r) => (r == null ? 4 : 3.2 + 7 * Math.log10(1 + r));

// opts: { link(p) -> href, highlight: planet name, id: unique prefix for gradients, width: drawing width (default 760; 520 for narrow panels) }
export function systemSVG(planets, opts = {}) {
  const W = opts.width || 760;
  const list = planets.filter((p) => p.sma != null && p.sma > 0).sort((a, b) => a.sma - b.sma);
  if (!list.length) return '';
  const ref = list.find((p) => p.srad && p.teff) || list[0];
  const hz = hzRange(ref);
  let lo = list[0].sma, hi = list[list.length - 1].sma;
  lo = Math.max(lo * 0.55, 0.002); hi = hi * 1.8;
  if (hi / lo < 6) { const m = Math.sqrt(lo * hi); lo = m / 2.5; hi = m * 2.5; }
  const lL = Math.log10(lo), lH = Math.log10(hi);
  const x = (a) => PL + ((Math.log10(a) - lL) / (lH - lL)) * (W - PL - PR);
  const H = 250, cy = 112, axisY = H - 34;
  const id = opts.id || 's';
  const parts = [];
  const defs = [];

  // habitable-zone band
  if (hz) {
    const x0 = Math.max(PL, x(hz.inner)), x1 = Math.min(W - PR, x(hz.outer));
    if (x1 > x0 + 1) {
      parts.push(`<rect x="${x0.toFixed(1)}" y="30" width="${(x1 - x0).toFixed(1)}" height="${axisY - 30}" fill="rgba(108,192,139,.15)" stroke="rgba(108,192,139,.35)" stroke-dasharray="3 4"/>`);
      parts.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="24" text-anchor="middle" class="sy-hz">${x1 - x0 > 150 ? 'Habitable-zone starlight' : x1 - x0 > 40 ? 'Habitable zone' : 'HZ'}</text>`);
    }
  }

  // axis with ticks
  parts.push(`<line x1="${PL}" y1="${axisY}" x2="${W - PR}" y2="${axisY}" class="sy-axis"/>`);
  const ticks = [];
  for (let e = Math.floor(lL); e <= Math.ceil(lH); e++) for (const m of (lH - lL < 2.2 ? [1, 2, 5] : [1])) {
    const v = m * Math.pow(10, e);
    if (v >= lo && v <= hi) ticks.push(v);
  }
  for (const v of ticks) {
    const label = v >= 1 ? String(v) : v.toFixed(Math.min(4, Math.max(0, -Math.floor(Math.log10(v)))));
    parts.push(`<line x1="${x(v).toFixed(1)}" y1="${axisY}" x2="${x(v).toFixed(1)}" y2="${axisY + 5}" class="sy-axis"/><text x="${x(v).toFixed(1)}" y="${axisY + 18}" text-anchor="middle" class="sy-tick">${label}</text>`);
  }
  parts.push(`<text x="${W - PR}" y="${axisY + 32}" text-anchor="end" class="sy-tick">Distance from the star, in AU (Earth is at 1)</text>`);
  if (1 >= lo && 1 <= hi) parts.push(`<line x1="${x(1).toFixed(1)}" y1="36" x2="${x(1).toFixed(1)}" y2="${axisY}" class="sy-earth"/><text x="${(x(1) + 4).toFixed(1)}" y="${axisY - 6}" class="sy-tick">Earth’s distance from the Sun</text>`);

  // the star
  const [r, g, b] = starRGB(ref.teff);
  parts.push(`<circle cx="${PL - 18}" cy="${cy}" r="11" fill="rgb(${r},${g},${b})"/><circle cx="${PL - 18}" cy="${cy}" r="17" fill="rgb(${r},${g},${b})" opacity=".18"/>`);
  parts.push(`<line x1="${PL}" y1="${cy}" x2="${W - PR}" y2="${cy}" class="sy-track"/>`);

  // planets, labels staggered into four rows so close neighbours stay readable
  const slots = [-1, 1, -2, 2, -3, 3];
  let lastX = [-99, -99, -99, -99, -99, -99];
  list.forEach((p, i) => {
    const px = x(p.sma), rp = radiusPx(p.r), c = look(p).colors;
    const gid = `${id}g${i}`;
    defs.push(`<radialGradient id="${gid}" cx=".35" cy=".3"><stop offset="0" stop-color="${c[2]}"/><stop offset=".6" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>`);
    // choose the first slot whose previous label is far enough away
    let k = slots.findIndex((_, j) => px - lastX[j] > 34);
    if (k < 0) k = i % slots.length;
    lastX[k] = px;
    const sl = slots[k], ly = sl < 0 ? cy - rp - 12 + (sl + 1) * 15 : cy + rp + 16 + (sl - 1) * 15;
    const circle = p.r == null
      ? `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${rp}" fill="none" stroke="${c[2]}" stroke-dasharray="2 2"/>`
      : `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${rp.toFixed(1)}" fill="url(#${gid})"/>`;
    const ring = opts.highlight === p.name ? `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${(rp + 4).toFixed(1)}" fill="none" stroke="#FFB454" stroke-width="2"/>` : '';
    const lead = Math.abs(sl) > 1 ? `<line x1="${px.toFixed(1)}" y1="${sl < 0 ? cy - rp - 1 : cy + rp + 1}" x2="${px.toFixed(1)}" y2="${sl < 0 ? ly + 3 : ly - 11}" class="sy-lead"/>` : '';
    const inner = `${lead}${ring}${circle}<text x="${px.toFixed(1)}" y="${ly}" text-anchor="middle" class="sy-lab">${esc(short(p))}</text><title>${esc(p.name)}</title>`;
    parts.push(opts.link ? `<a href="${esc(opts.link(p))}" class="sy-p" data-name="${esc(p.name)}">${inner}</a>` : `<g class="sy-p">${inner}</g>`);
  });

  const skipped = planets.length - list.length;
  const label = `Planets of ${ref.host} by distance from the star: ${list.map((p) => `${p.name} at ${p.sma < 1 ? p.sma.toFixed(3) : p.sma.toFixed(1)} AU`).join(', ')}.`;
  return `<svg class="sys${W < 600 ? ' sys-c' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><defs>${defs.join('')}</defs>${parts.join('')}</svg>${skipped ? `<p class="small muted">${skipped} more planet${skipped > 1 ? 's' : ''} of this star ${skipped > 1 ? 'have' : 'has'} no measured orbit size and ${skipped > 1 ? 'are' : 'is'} not drawn.</p>` : ''}`;
}
