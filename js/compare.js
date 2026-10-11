// Size comparison: draws the planet next to Earth and next to Jupiter, to scale.
import { look, RE_PER_RJ, fmt } from './model.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pair(p, other, id) {
  // radii in Earth radii; both circles share one scale so they are truly to scale
  const rp = p.r, ro = other.r;
  const scale = 54 / Math.max(rp, ro);
  const a = Math.max(1.6, rp * scale), b = Math.max(1.6, ro * scale);
  const tiny = (rp * scale < 1.6) || (ro * scale < 1.6);
  const l = look(p).colors;
  const cy = 64, ax = 80, bx = 220;
  const ratio = rp / ro;
  const caption = `${fmt(ratio, ratio < 0.1 ? 3 : 2)}× as wide as ${other.name}`;
  const label = p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name;
  return `
  <figure class="cmp">
    <svg viewBox="0 0 300 140" role="img" aria-label="${esc(p.name)} compared with ${other.name}, to scale">
      <defs>
        <radialGradient id="g-p-${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${l[2]}"/><stop offset=".55" stop-color="${l[0]}"/><stop offset="1" stop-color="${l[1]}"/></radialGradient>
        <radialGradient id="g-o-${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${other.c[0]}"/><stop offset=".6" stop-color="${other.c[1]}"/><stop offset="1" stop-color="${other.c[2]}"/></radialGradient>
      </defs>
      <circle cx="${ax}" cy="${cy}" r="${a.toFixed(2)}" fill="url(#g-p-${id})"/>
      <circle cx="${bx}" cy="${cy}" r="${b.toFixed(2)}" fill="url(#g-o-${id})"/>
      <text x="${ax}" y="134" text-anchor="middle" class="cmp-l">${esc(label)}</text>
      <text x="${bx}" y="134" text-anchor="middle" class="cmp-l">${other.name}</text>
    </svg>
    <figcaption>${esc(caption)}${tiny ? ' (too small to see well at this scale)' : ''}</figcaption>
  </figure>`;
}

export function comparisonHTML(p) {
  if (p.r == null) return '<p class="muted">Size not identified, so it cannot be compared.</p>';
  const earth = { name: 'Earth', r: 1, c: ['#5aa0e0', '#2b6cb0', '#1c4a80'] };
  const jup = { name: 'Jupiter', r: RE_PER_RJ, c: ['#e6cfa6', '#c19a6b', '#8c6a43'] };
  const note = p.r_est ? '<p class="muted small">Radius estimated from mass.</p>' : '';
  return pair(p, earth, 'e') + pair(p, jup, 'j') + note;
}
