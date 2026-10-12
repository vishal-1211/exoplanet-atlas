// Interactive scatter charts of the whole catalogue (canvas, so 6,000 points stay smooth).
import { boot, $, esc, planetHref, nf } from './boot.js';
import { tempColor, typeLabel, TYPES, fmt } from './model.js';
import { enhanceSelect } from './dropdown.js';

const AX = {
  m: { label: 'Mass (Earth = 1)', get: (p) => p.masse, log: true, u: '× Earth' },
  r: { label: 'Radius (Earth = 1)', get: (p) => p.rade, log: true, u: '× Earth' },
  per: { label: 'Orbit time (days)', get: (p) => p.per, log: true, u: 'days' },
  sma: { label: 'Distance from star (AU)', get: (p) => p.sma, log: true, u: 'AU' },
  S: { label: 'Starlight received (Earth = 1)', get: (p) => p.S, log: true, u: '× Earth' },
  teq: { label: 'Temperature (K)', get: (p) => p.teq, log: true, u: 'K' },
  dist: { label: 'Distance from us (light-years)', get: (p) => p.dist_ly, log: true, u: 'ly' },
  year: { label: 'Year discovered', get: (p) => p.year, log: false, u: '' },
  dens: { label: 'Density (g/cm³)', get: (p) => p.density, log: true, u: 'g/cm³' },
};
const PRESETS = [
  { id: 'mr', label: 'Mass and radius', x: 'm', y: 'r', sol: true },
  { id: 'pr', label: 'Orbit time and radius', x: 'per', y: 'r', sol: true },
  { id: 'sr', label: 'Starlight and radius', x: 'S', y: 'r', sol: true },
  { id: 'dy', label: 'Distance and discovery year', x: 'year', y: 'dist', sol: false },
  { id: 'tm', label: 'Temperature and mass', x: 'teq', y: 'm', sol: false },
];
const SOLAR = [['Mercury', .055, .383, 88, .387, 6.67], ['Venus', .815, .949, 224.7, .723, 1.91], ['Earth', 1, 1, 365.25, 1, 1], ['Mars', .107, .532, 687, 1.524, .43],
  ['Jupiter', 317.8, 11.21, 4332.6, 5.203, .037], ['Saturn', 95.16, 9.45, 10759, 9.537, .011], ['Uranus', 14.54, 4.01, 30687, 19.19, .0027], ['Neptune', 17.15, 3.88, 60190, 30.07, .0011]]
  .map(([name, masse, rade, per, sma, S]) => ({ name, masse, rade, per, sma, S, solar: true }));
const TYPE_COLOR = { subearth: '#A8A59E', earth: '#5AA0E0', superearth: '#6CC08B', mininep: '#8FB8E8', neptune: '#4F7BFF', giant: '#E0B070', superjup: '#D0805A', unknown: '#6B7699' };
const METHOD_PAL = ['#FFB454', '#7ED6FF', '#B58CFF', '#6CC08B', '#FF7A45', '#FF4D6A', '#E8D77A', '#8FB8E8'];

const { all } = await boot();
const st = { x: 'm', y: 'r', color: 'type', sol: true, hide: new Set() };
const methods = Object.entries(all.reduce((a, p) => ((a[p.method] = (a[p.method] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([m]) => m);
const methodCol = (m) => { const i = methods.indexOf(m); return i < METHOD_PAL.length - 1 ? METHOD_PAL[i] : '#6B7699'; };

const ctl = $('#cxControls');
const opts = (cur) => Object.entries(AX).map(([k, a]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${a.label}</option>`).join('');
ctl.innerHTML = `<div class="cx-presets" role="group" aria-label="Chart presets">${PRESETS.map((p) => `<button type="button" class="chip" data-pre="${p.id}">${p.label}</button>`).join('')}</div>
  <div class="fields"><label class="field">Across<select id="cxX">${opts(st.x)}</select></label>
  <label class="field">Up<select id="cxY">${opts(st.y)}</select></label>
  <label class="field">Colour by<select id="cxC"><option value="type">Planet type</option><option value="method">How it was found</option><option value="temp">Temperature</option></select></label>
  <button type="button" class="chip" id="cxSol" aria-pressed="true">Show our Solar System</button></div>`;
['#cxX', '#cxY', '#cxC'].forEach((id) => enhanceSelect($(id)));
const syncSel = () => { $('#cxX').value = st.x; $('#cxY').value = st.y; $('#cxC').value = st.color; document.querySelectorAll('.cx-presets .chip').forEach((b) => { const p = PRESETS.find((q) => q.id === b.dataset.pre); b.classList.toggle('on', p.x === st.x && p.y === st.y); }); $('#cxSol').setAttribute('aria-pressed', String(st.sol)); import('./dropdown.js').then((m) => m.refreshSelects()); };

const cv = $('#cx'), g = cv.getContext('2d'), tip = $('#cxTip');
let pts = [], box = { l: 64, r: 14, t: 14, b: 48 }, W = 0, H = 0, hover = null, sticky = null, ext = null;

const colorOf = (p) => st.color === 'type' ? TYPE_COLOR[p.type] : st.color === 'method' ? methodCol(p.method) : tempColor(p.teq);
const catOf = (p) => st.color === 'type' ? p.type : st.color === 'method' ? p.method : null;

function compute() {
  const ax = AX[st.x], ay = AX[st.y];
  pts = [];
  for (const p of all) {
    if (p.controv) continue;
    const a = ax.get(p), b = ay.get(p);
    if (p.mr_derived && ((st.x === 'm' && st.y === 'r') || (st.x === 'r' && st.y === 'm') || st.x === 'dens' || st.y === 'dens')) continue;
    if (a == null || b == null || (ax.log && a <= 0) || (ay.log && b <= 0)) continue;
    const c = catOf(p); if (c && st.hide.has(c)) continue;
    pts.push({ p, a, b });
  }
  const range = (k, ac) => { let lo = Infinity, hi = -Infinity; for (const q of pts) { const v = q[k]; if (v < lo) lo = v; if (v > hi) hi = v; } if (ac.log) { lo = Math.pow(10, Math.floor(Math.log10(lo))); hi = Math.pow(10, Math.ceil(Math.log10(hi))); } else { lo = Math.floor(lo / 5) * 5; hi = Math.ceil(hi / 5) * 5 + 1; } return [lo, hi]; };
  ext = pts.length ? { x: range('a', ax), y: range('b', ay) } : null;
  $('#cxNote').textContent = `${nf(pts.length)} of ${nf(all.length)} planets are plotted: those with both values measured (planets whose status is debated are left out). ${(st.x === 'm' && st.y === 'r') || (st.x === 'r' && st.y === 'm') ? 'NASA fills a missing mass or radius from a standard relation, so planets where one value was calculated from the other are left out here. ' : ''}Each dot is one planet; ${st.x === 'm' || st.y === 'm' ? 'masses from radial-velocity are often minimum values. ' : ''}Click or tap a dot to open the planet.`;
  legend();
}
const sx = (v) => { const [lo, hi] = ext.x, a = AX[st.x]; const f = a.log ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (v - lo) / (hi - lo); return box.l + f * (W - box.l - box.r); };
const sy = (v) => { const [lo, hi] = ext.y, a = AX[st.y]; const f = a.log ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (v - lo) / (hi - lo); return H - box.b - f * (H - box.t - box.b); };

function legend() {
  const el = $('#cxLegend');
  if (st.color === 'temp') { el.innerHTML = '<span><i style="background:linear-gradient(90deg,#4F7BFF,#7ED6FF,#FFE59A,#FFB454,#FF7A45,#FF4D6A);width:90px"></i>Cold to ultra-hot</span>'; return; }
  const cats = st.color === 'type' ? TYPES.map((t) => [t.id, t.label, TYPE_COLOR[t.id]]) : methods.map((m) => [m, m, methodCol(m)]);
  el.innerHTML = cats.map(([id, label, c]) => `<button type="button" class="chip${st.hide.has(id) ? '' : ' on'}" data-cat="${esc(id)}" aria-pressed="${!st.hide.has(id)}"><i class="dot" style="--c:${c}"></i>${esc(label)}</button>`).join('');
}

function draw() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.parentElement.clientWidth; H = Math.round(Math.min(560, Math.max(340, W * (W < 600 ? 0.95 : 0.6))));
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  box.l = W < 600 ? 50 : 64;
  if (!ext) { g.fillStyle = '#8F9BC4'; g.fillText('Nothing to plot', 20, 30); return; }
  const ax = AX[st.x], ay = AX[st.y];
  g.font = '12px Inter, system-ui, sans-serif'; g.lineWidth = 1;
  const ticks = (k, ac, f) => { const [lo, hi] = ext[k]; const out = []; if (ac.log) { for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e++) out.push(Math.pow(10, Math.round(e))); } else { const step = (hi - lo) > 20 ? 5 : 2; for (let v = lo; v <= hi; v += step) out.push(v); } return out; };
  g.fillStyle = '#8F9BC4'; g.strokeStyle = 'rgba(160,180,255,.1)';
  g.textAlign = 'center';
  for (const v of ticks('x', ax)) { const X = sx(v); g.beginPath(); g.moveTo(X, box.t); g.lineTo(X, H - box.b); g.stroke(); g.fillText(fmt(v, 3), X, H - box.b + 16); }
  g.textAlign = 'right';
  for (const v of ticks('y', ay)) { const Y = sy(v); g.beginPath(); g.moveTo(box.l, Y); g.lineTo(W - box.r, Y); g.stroke(); g.fillText(fmt(v, 3), box.l - 8, Y + 4); }
  g.textAlign = 'center'; g.fillStyle = '#C9D2EE';
  g.fillText(ax.label, (box.l + W - box.r) / 2, H - 10);
  g.save(); g.translate(13, (box.t + H - box.b) / 2); g.rotate(-Math.PI / 2); g.fillText(ay.label, 0, 0); g.restore();
  // guide lines for Earth values (x or y == 1) are already gridlines; draw the points
  g.globalAlpha = 0.72;
  for (const q of pts) { g.fillStyle = colorOf(q.p); g.beginPath(); g.arc(sx(q.a), sy(q.b), q.p.hz ? 3.2 : 2.2, 0, 6.2832); g.fill(); }
  g.globalAlpha = 1;
  // habitable zone outline on the points
  if (st.sol && PRESETS.some((p) => p.x === st.x && p.y === st.y && p.sol)) {
    g.font = '11px Inter, system-ui, sans-serif'; g.textAlign = 'left';
    for (const s of SOLAR) {
      const a = ax.get(s), b = ay.get(s); if (a == null || b == null) continue;
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx(a), sy(b), 4.5, 0, 6.2832); g.stroke();
      g.fillStyle = '#EAF0FF'; g.fillText(s.name, sx(a) + 7, sy(b) + 4);
    }
    g.lineWidth = 1;
  }
  const hl = sticky || hover;
  if (hl) {
    const X = sx(hl.a), Y = sy(hl.b);
    g.strokeStyle = '#FFB454'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, 7, 0, 6.2832); g.stroke(); g.lineWidth = 1;
    // error bars, when the data has uncertainties
    const eb = (u, l, v, ac, axis) => {
      if (u == null || l == null || (!u && !l)) return;
      const lo = Math.max(v + l, ac.log ? v * 0.001 : -1e9), hi = v + u;
      g.strokeStyle = '#FFB454'; g.beginPath();
      if (axis === 'x') { g.moveTo(sx(lo), Y); g.lineTo(sx(hi), Y); } else { g.moveTo(X, sy(lo)); g.lineTo(X, sy(hi)); }
      g.stroke();
    };
    const E = { m: ['masseu', 'massel'], r: ['radeu', 'radel'], per: ['peru', 'perl'], teq: ['eqtu', 'eqtl'] };
    if (E[st.x]) eb(hl.p[E[st.x][0]], hl.p[E[st.x][1]], hl.a, ax, 'x');
    if (E[st.y]) eb(hl.p[E[st.y][0]], hl.p[E[st.y][1]], hl.b, ay, 'y');
  }
}

function showTip(q, x, y, touch) {
  const p = q.p, ax = AX[st.x], ay = AX[st.y];
  tip.innerHTML = `<b>${esc(p.name)}</b><span>${esc(typeLabel(p.type))}${p.year ? ', ' + p.year : ''}</span><span>${ax.label.split(' (')[0]}: ${fmt(q.a, 3)} ${ax.u}</span><span>${ay.label.split(' (')[0]}: ${fmt(q.b, 3)} ${ay.u}</span>${touch ? `<a href="${planetHref(p)}">Open ${esc(p.name)}</a>` : ''}`;
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.max(4, Math.min(W - tw - 4, x + 14)) + 'px';
  tip.style.top = Math.max(4, Math.min(H - th - 4, y - th - 10 < 0 ? y + 14 : y - th - 10)) + 'px';
}
function nearest(mx, my) {
  let best = null, bd = 12 * 12;
  for (const q of pts) { const dx = sx(q.a) - mx, dy = sy(q.b) - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = q; } }
  return best;
}
cv.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !ext) return;
  const r = cv.getBoundingClientRect(), q = nearest(e.clientX - r.left, e.clientY - r.top);
  if (q !== hover) { hover = q; sticky = null; draw(); }
  if (q) showTip(q, e.clientX - r.left, e.clientY - r.top, false); else tip.hidden = true;
  cv.style.cursor = q ? 'pointer' : 'default';
});
cv.addEventListener('pointerleave', () => { hover = null; if (!sticky) tip.hidden = true; draw(); });
cv.addEventListener('click', (e) => {
  if (!ext) return;
  const r = cv.getBoundingClientRect(), q = nearest(e.clientX - r.left, e.clientY - r.top);
  if (!q) { sticky = null; tip.hidden = true; draw(); return; }
  if (e.pointerType === 'touch' || e.detail === 0 || matchMedia('(pointer: coarse)').matches) { sticky = q; showTip(q, e.clientX - r.left, e.clientY - r.top, true); draw(); }
  else location.href = planetHref(q.p);
});

function refresh() { compute(); syncSel(); draw(); }
ctl.addEventListener('click', (e) => {
  const pre = e.target.closest('[data-pre]');
  if (pre) { const p = PRESETS.find((q) => q.id === pre.dataset.pre); Object.assign(st, { x: p.x, y: p.y, sol: p.sol }); st.hide.clear(); refresh(); }
  if (e.target.closest('#cxSol')) { st.sol = !st.sol; syncSel(); draw(); }
});
$('#cxX').addEventListener('change', (e) => { st.x = e.target.value; refresh(); });
$('#cxY').addEventListener('change', (e) => { st.y = e.target.value; refresh(); });
$('#cxC').addEventListener('change', (e) => { st.color = e.target.value; st.hide.clear(); refresh(); });
$('#cxLegend').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const c = b.dataset.cat; st.hide.has(c) ? st.hide.delete(c) : st.hide.add(c); compute(); draw(); });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 100); });
refresh();
