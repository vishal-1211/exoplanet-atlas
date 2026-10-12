// Draws a shareable 1200x630 picture of a planet and offers it as a download or through the share sheet.
import { look, typeLabel, fmt } from './model.js';
import { fmtDuration } from './facts.js';

const SITE_NAME = 'exoplanet-atlas.macrocosm.workers.dev';
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function makeCard(p) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 1200, 630); bg.addColorStop(0, '#070B1A'); bg.addColorStop(1, '#101A3E');
  g.fillStyle = bg; g.fillRect(0, 0, 1200, 630);
  let seed = hash(p.name);
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(234,240,255,${0.15 + rnd() * 0.6})`; g.beginPath(); g.arc(rnd() * 1200, rnd() * 630, rnd() * 1.4 + 0.3, 0, 7); g.fill(); }
  // planet
  const l = look(p).colors, cx = 900, cy = 315, R = 190;
  const glow = g.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.5); glow.addColorStop(0, l[2] + '55'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R * 1.5, 0, 7); g.fill();
  // lift very dark palettes (ultra-hot giants) so the planet still reads against the night sky
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };
  const mix = (a, b, f) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const ch = (s) => Math.round(((x >> s) & 255) * (1 - f) + ((y >> s) & 255) * f); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
  const mid = lum(l[0]) < 0.25 ? mix(l[0], l[2], 0.45) : l[0];
  const body = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); body.addColorStop(0, l[2]); body.addColorStop(0.55, mid); body.addColorStop(1, l[1]);
  g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  const kind = look(p).kind;
  if (kind === 'gas') {   // soft cloud bands
    for (let i = 0; i < 9; i++) { const y = cy - R + (i + 0.5) * (R * 2 / 9) + Math.sin(i * 2.1 + seed % 7) * 8; g.fillStyle = `rgba(${i % 2 ? '255,255,255' : '0,0,0'},${0.10 + (i % 3) * 0.04})`; g.fillRect(cx - R, y - 9, R * 2, 18 + (i % 3) * 5); }
  }
  const shade = g.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.5, cx + R * 0.3, cy + R * 0.3, R * 1.3); shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(3,6,20,.62)');
  g.fillStyle = shade; g.fillRect(cx - R, cy - R, R * 2, R * 2); g.restore();
  g.strokeStyle = l[2] + '66'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  // text
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = '#FFB454'; g.beginPath(); g.arc(78, 78, 9, 0, 7); g.fill();
  g.fillStyle = '#EAF0FF'; g.font = '600 26px Inter, system-ui, sans-serif'; g.fillText('Exoplanet Atlas', 98, 87);
  let size = 84; g.font = `300 ${size}px Inter, system-ui, sans-serif`;
  while (g.measureText(p.name).width > 640 && size > 40) { size -= 4; g.font = `300 ${size}px Inter, system-ui, sans-serif`; }
  g.fillStyle = '#EAF0FF'; g.fillText(p.name, 72, 240);
  g.fillStyle = '#C9D2EE'; g.font = '400 30px Inter, system-ui, sans-serif';
  g.fillText(`${typeLabel(p.type)}${p.year ? ', found in ' + p.year : ''}`, 72, 290);
  const stats = [
    ['Distance', p.dist_ly != null ? `${fmt(p.dist_ly, 1)} light-years` : 'Not identified'],
    ['One year', p.per != null ? fmtDuration(p.per) : 'Not identified'],
    ['Size', p.r != null ? `${fmt(p.r, 2)}× Earth` : 'Not identified'],
    ['Temperature', p.teq != null ? `${fmt(p.teq, 0)} K` : 'Not identified'],
  ];
  stats.forEach(([k, v], i) => {
    const x = 72 + (i % 2) * 300, y = 370 + Math.floor(i / 2) * 100;
    g.fillStyle = '#8F9BC4'; g.font = '400 22px Inter, system-ui, sans-serif'; g.fillText(k, x, y);
    g.fillStyle = '#EAF0FF'; g.font = '600 32px Inter, system-ui, sans-serif'; g.fillText(v, x, y + 40);
  });
  g.fillStyle = '#6B7699'; g.font = '400 20px Inter, system-ui, sans-serif';
  g.fillText("Artist's impression. Data: NASA Exoplanet Archive.", 72, 590);
  g.textAlign = 'right'; g.fillStyle = '#C9D2EE'; g.fillText(SITE_NAME, 1128, 590);
  return c;
}

export async function shareOrSave(canvas, p) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('no image');
  const file = new File([blob], `${p.slug || 'planet'}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: p.name, text: `${p.name}, a planet around another star`, url: location.origin + '/planet/' + p.slug + '.html' }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'shared'; /* fall through to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
