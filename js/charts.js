// Two small light-curve drawings. A light curve is a star's brightness over time:
// when a planet crosses in front of the star, the line dips.
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Hero: three repeating dips, drawn to look like a real measurement (with a little noise).
export function heroCurve() {
  const W = 1200, H = 120, base = 38, depth = 50, centres = [210, 600, 990], half = 62, ingress = 16;
  const rnd = mulberry(7);
  let d = '';
  for (let x = 0; x <= W; x += 3) {
    let y = base + (rnd() - 0.5) * 3.2;
    for (const c of centres) {
      const dx = Math.abs(x - c);
      if (dx < half) y += depth * Math.min(1, (half - dx) / ingress);
    }
    d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
  }
  const stops = [];
  const pct = (x) => ((x / W) * 100).toFixed(2) + '%';
  let prev = 0;
  for (const c of centres) {
    stops.push(`<stop offset="${pct(prev)}" stop-color="#8F9BC4"/><stop offset="${pct(c - half)}" stop-color="#8F9BC4"/>`);
    stops.push(`<stop offset="${pct(c - half)}" stop-color="#FFB454"/><stop offset="${pct(c + half)}" stop-color="#FFB454"/>`);
    prev = c + half;
  }
  stops.push(`<stop offset="${pct(prev)}" stop-color="#8F9BC4"/><stop offset="100%" stop-color="#8F9BC4"/>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A star's brightness over time. It dips three times as a planet passes in front of it.">
    <defs><linearGradient id="lc" gradientUnits="userSpaceOnUse" x1="0" x2="${W}" y1="0" y2="0">${stops.join('')}</linearGradient></defs>
    <line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="rgba(160,180,255,.18)" stroke-dasharray="2 6"/>
    <path class="draw" pathLength="1" d="${d}" fill="none" stroke="url(#lc)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

// Planet panel: one dip whose depth is this planet's real depth. The vertical axis is zoomed so you can see it.
export function transitCurve(depth, name) {
  const W = 480, H = 128, top = 26, bottom = 100, cx = W / 2, half = 70, ingress = 18;
  const rnd = mulberry(Math.round(depth * 1e6) + 3);
  let d = '';
  for (let x = 54; x <= W - 8; x += 3) {
    const dx = Math.abs(x - cx);
    const dip = dx < half ? Math.min(1, (half - dx) / ingress) : 0;
    const y = top + (bottom - top) * dip + (rnd() - 0.5) * 1.6;
    d += (x === 54 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
  }
  const low = (100 - depth * 100);
  const lowText = depth * 100 < 0.01 ? '99.99%' : low.toFixed(depth * 100 < 0.1 ? 3 : 2) + '%';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Brightness of the star ${name} orbits, dipping by ${(depth * 100).toFixed(2)} percent as the planet crosses in front of it">
    <line x1="54" x2="${W - 8}" y1="${top}" y2="${top}" stroke="rgba(160,180,255,.2)" stroke-dasharray="2 5"/>
    <line x1="54" x2="${W - 8}" y1="${bottom}" y2="${bottom}" stroke="rgba(255,180,84,.28)" stroke-dasharray="2 5"/>
    <path d="${d}" fill="none" stroke="#FFB454" stroke-width="1.6" stroke-linejoin="round"/>
    <text x="48" y="${top + 4}" text-anchor="end" class="ax">100%</text>
    <text x="48" y="${bottom + 4}" text-anchor="end" class="ax">${lowText}</text>
    <text x="${W - 8}" y="${H - 4}" text-anchor="end" class="ax">Time, the planet crosses at the centre</text>
  </svg>`;
}
