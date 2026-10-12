// Compare two planets side by side.
import { boot, $, esc, planetHref, nf } from './boot.js';
import { look, typeLabel, tempLabel, fmt, plusMinus } from './model.js';
import { fmtDuration } from './facts.js';
import { attachPicker } from './picker.js';

const { all } = await boot();
const byName = new Map(all.map((p) => [p.name, p]));
const orb = (p) => { const c = look(p).colors; return `radial-gradient(circle at 32% 30%, ${c[2]}, ${c[0]} 55%, ${c[1]})`; };
let A = null, B = null;

const hash = new URLSearchParams(location.hash.slice(1));
A = byName.get(hash.get('a')) || byName.get('TRAPPIST-1 e');
B = byName.get(hash.get('b')) || byName.get('WASP-12 b');
$('#cmpA').value = A ? A.name : ''; $('#cmpB').value = B ? B.name : '';
attachPicker($('#cmpA'), $('#pickA'), all, { label: (p) => p.name, onPick: (p) => { A = p; render(); } });
attachPicker($('#cmpB'), $('#pickB'), all, { label: (p) => p.name, onPick: (p) => { B = p; render(); } });

const NI = '<span class="ni">Not identified</span>';
const ROWS = [
  ['Type', (p) => esc(typeLabel(p.type)) + (p.hotJupiter ? ' (hot Jupiter)' : '')],
  ['Found', (p) => (p.year != null ? `${p.year}, by ${esc(p.method.toLowerCase())}` : NI)],
  ['Distance from us', (p) => (p.dist_ly != null ? fmt(p.dist_ly, 1) + ' light-years' : NI), 'dist_ly'],
  ['Radius', (p) => (p.r != null ? `${fmt(p.r, 2)}× Earth${p.r_est ? ' (estimated)' : ''}${!p.r_est && plusMinus(p.radeu, p.radel) ? ' ' + plusMinus(p.radeu, p.radel) : ''}` : NI), 'r'],
  ['Mass', (p) => (p.m != null ? `${fmt(p.m, 2)}× Earth${plusMinus(p.masseu, p.massel) ? ' ' + plusMinus(p.masseu, p.massel) : ''}` : NI), 'm'],
  ['Density', (p) => (p.density != null ? fmt(p.density, 2) + ' g/cm³' : NI), 'density'],
  ['Surface gravity', (p) => (p.gravity != null ? fmt(p.gravity, 2) + '× Earth' : NI), 'gravity'],
  ['Length of a year', (p) => (p.per != null ? fmtDuration(p.per) : NI), 'per'],
  ['Distance from its star', (p) => (p.sma != null ? fmt(p.sma, 3) + ' AU' : NI), 'sma'],
  ['Temperature', (p) => (p.teq != null ? `${fmt(p.teq, 0)} K (${fmt(p.teq - 273.15, 0)} °C)${p.teq_est ? ', estimated' : ''}` : NI), 'teq'],
  ['Starlight received', (p) => (p.S != null ? fmt(p.S, 2) + '× what Earth gets' : NI), 'S'],
  ['Earth-likeness score', (p) => (p.esi != null ? fmt(p.esi, 2) + ' out of 1' : NI), 'esi'],
];

function card(p) {
  return `<div class="cmp-card"><i class="orb big" style="background:${orb(p)}"></i><h2><a href="${planetHref(p)}">${esc(p.name)}</a></h2><p class="muted small">${esc(look(p).name)}. Orbits ${esc(p.host)}.</p></div>`;
}
function sizes() {
  const rs = [A, B].map((p) => p.r);
  const known = rs.filter((r) => r != null);
  if (!known.length) return '';
  const max = Math.max(...known, 1), scale = 90 / max;
  const items = [['Earth', 1, '#5AA0E0', true], ...[A, B].map((p) => [p.name, p.r, look(p).colors[0], false])];
  let x = 20; const out = [];
  for (const [n, r, c, ref] of items) {
    if (r == null) continue;
    const rp = Math.max(2, r * scale);
    out.push(`<g><circle cx="${x + rp}" cy="${110}" r="${rp.toFixed(1)}" fill="${ref ? 'none' : c}" ${ref ? 'stroke="#7ED6FF" stroke-dasharray="4 4"' : 'stroke="rgba(255,255,255,.35)"'}/><text x="${x + rp}" y="${222}" text-anchor="middle" class="sy-lab">${esc(n)}</text></g>`);
    x += rp * 2 + 34;
  }
  return `<div class="chartbox"><svg viewBox="0 0 ${Math.max(x, 300)} 236" class="sys" role="img" aria-label="Planet sizes side by side, with Earth for scale">${out.join('')}</svg></div><p class="small muted">Sizes are to the same scale. Earth is the dashed circle.</p>`;
}
function weight(p) {
  return p.gravity != null ? `${fmt(40 * p.gravity, 0)} kg` : null;
}

function render() {
  if (!A || !B) return;
  const rows = ROWS.map(([label, f, key]) => {
    const a = A[key], b = B[key];
    const ok = key && key !== 'esi' && a != null && b != null && a > 0 && b > 0 && Math.abs(Math.log(a / b)) > 0.02;
    return `<tr><th scope="row">${label}</th><td>${f(A)}${ok && a > b ? `<small>${fmt(a / b, 2)}× the other</small>` : ''}</td><td>${f(B)}${ok && b > a ? `<small>${fmt(b / a, 2)}× the other</small>` : ''}</td></tr>`;
  }).join('');
  const wa = weight(A), wb = weight(B);
  $('#cmpOut').innerHTML = `<div class="cmp-cards">${card(A)}${card(B)}</div>${sizes()}
    <div class="tablewrap"><table class="pl-table cmp-table"><thead><tr><th></th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${wa || wb ? `<p class="cmp-fun">If you weigh 40 kg on Earth, you would weigh <b>${wa || 'an unknown amount'}</b> on ${esc(A.name)} and <b>${wb || 'an unknown amount'}</b> on ${esc(B.name)}.<span class="muted small"> Gravity is only known when both mass and radius are measured, and for gas giants it is the pull at the cloud tops.</span></p>` : ''}
    <p class="small muted">The Earth-likeness score compares only size and temperature with Earth (1 is identical on both). It says nothing about atmosphere, water or life, and it uses equilibrium temperature, not real surface temperature.</p>`;
  const h = new URLSearchParams({ a: A.name, b: B.name });
  history.replaceState(null, '', '#' + h.toString());
  document.title = `${A.name} vs ${B.name} · Exoplanet Atlas`;
}
render();
