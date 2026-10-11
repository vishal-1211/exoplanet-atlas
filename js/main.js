import { hydrate, TYPES, TEMPS, typeLabel, tempLabel, look, lookReason, fmt, tempColor, transitDepth } from './model.js';
import { topFacts, details, HOW_FOUND, editorNote, fmtDuration, CURATED } from './facts.js';
import { comparisonHTML } from './compare.js';
import { Sky, prepare, drawMiniSky } from './sky.js';
import { heroCurve, transitCurve } from './charts.js';
import { buildLearn } from './learn.js';
import { enhanceSelect, refreshSelects } from './dropdown.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NI = 'Not identified';
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ALL = [], VIEW = [], META = {}, sky = null, skyData = null;
const state = { q: '', types: new Set(), temp: '', method: '', decade: '', hz: false, sort: 'interesting' };

const TYPE_COLOR = { subearth: '#A8A59E', earth: '#5AA0E0', superearth: '#6CC08B', mininep: '#8FB8E8', neptune: '#4F7BFF', giant: '#E0B070', superjup: '#D0805A', unknown: '#6B7699' };

// ---------------------------------------------------------------- start up
async function load() {
  try {
    const res = await fetch('data/planets.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    META = await res.json();
    ALL = hydrate(META);
  } catch (err) {
    $('#loading').innerHTML = `Could not load the planet data (${esc(err.message)}). <button type="button" class="link" id="retry">Try again</button>`;
    $('#retry').addEventListener('click', () => { $('#loading').textContent = 'Loading the catalogue…'; load(); });
    return;
  }
  prepareData();
  startSky();
  buildHero();
  buildShelves();
  buildLearn(ALL, { openPlanet, browseType });
  buildControls();
  applyFilters();
  window.addEventListener('popstate', routeFromHash);
  routeFromHash();
}

function prepareData() {
  for (const p of ALL) {
    p.skey = p.search.replace(/[^a-z0-9]/g, '');
    p.esi = (p.r != null && p.teq != null)
      ? (1 - Math.abs(p.r - 1) / (p.r + 1)) * (1 - Math.abs(p.teq - 270) / (p.teq + 270)) : null;
    const known = [p.r, p.m, p.per, p.teq, p.dist_ly].filter((v) => v != null).length;
    p.score = (CURATED[p.name] || p.host === 'TRAPPIST-1' ? 100 : 0) + (p.hz ? 40 : 0)
      + (p.dist_ly != null && p.dist_ly < 50 ? 30 : 0) + known * 4 + (p.year >= 2024 ? 4 : 0)
      + (p.esi != null ? p.esi * 20 : 0) - (p.controv ? 30 : 0);
  }
}

function startSky() {
  const seen = new Map();
  for (const p of ALL) if (!seen.has(p.host) && p.ra != null && p.dec != null) seen.set(p.host, { ra: p.ra, dec: p.dec, teff: p.teff, dist: p.dist });
  const hosts = [...seen.values()];
  skyData = prepare(hosts);
  sky = new Sky($('#sky'), hosts);
  sky.start();
}

// ---------------------------------------------------------------- hero
function buildHero() {
  const n = ALL.length;
  const hosts = new Set(ALL.map((p) => p.host)).size;
  const years = ALL.map((p) => p.year).filter((y) => y != null);
  $('#lede').textContent = `Astronomers have confirmed planets around ${hosts.toLocaleString('en-US')} stars since ${Math.min(...years)}. Pick any one to watch it turn. Every picture is an artist's impression built from what has been measured.`;
  const transit = ALL.filter((p) => p.method === 'Transit').length;
  $('#curveCap').textContent = `A star's brightness over time. It dips when a planet crosses in front of it. ${Math.round((100 * transit) / n)}% of these planets were found this way.`;
  $('#heroCurve').innerHTML = heroCurve();
  $('#updated').textContent = META.generated || 'recently';
  const el = $('#heroCount');
  if (reduceMotion) { el.textContent = n.toLocaleString('en-US'); return; }
  const t0 = performance.now(), dur = 1300;
  const step = (now) => {
    const f = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - f, 3);
    el.textContent = Math.round(n * e).toLocaleString('en-US');
    if (f < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

$('#explore').addEventListener('click', () => $('#shelves').scrollIntoView({ behavior: 'smooth', block: 'start' }));
$('#surprise').addEventListener('click', () => {
  const pool = ALL.filter((p) => p.score >= 60);
  openPlanet(pool[Math.floor(Math.random() * pool.length)]);
});
window.addEventListener('scroll', () => $('#bar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });
function focusSearch() {
  const box = $('.search.big');
  const near = box.getBoundingClientRect().top > 0 && box.getBoundingClientRect().top < window.innerHeight - 120;
  if (!near) $('#explorer').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  $('#q').focus({ preventScroll: true });
}
$('#goSearch').addEventListener('click', focusSearch);
function browseType(id) {
  Object.assign(state, { q: '', types: new Set([id]), temp: '', method: '', decade: '', hz: false, sort: 'interesting' });
  syncControls(); applyFilters();
  $('#explorer').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) && $('#detail').hidden) {
    e.preventDefault(); focusSearch();
  }
});

// ---------------------------------------------------------------- shelves
const orbBg = (p) => { const c = look(p).colors; return `radial-gradient(circle at 32% 30%, ${c[2]}, ${c[0]} 55%, ${c[1]})`; };
const glow = (p) => look(p).colors[0];
const top = (list, key, asc, n = 14, filter = () => true) =>
  list.filter((p) => p[key] != null && filter(p)).sort((a, b) => (asc ? a[key] - b[key] : b[key] - a[key])).slice(0, n);

const FAMOUS = ['51 Peg b', 'Proxima Cen b', 'TRAPPIST-1 e', 'Kepler-452 b', 'Kepler-16 b', 'HD 189733 b', '55 Cnc e', 'WASP-12 b',
  'KELT-9 b', 'HR 8799 e', 'Kepler-186 f', 'K2-18 b', 'WASP-76 b', 'GJ 1214 b', 'HD 209458 b', 'bet Pic b', 'PSR B1257+12 c',
  'LHS 1140 b', "Teegarden's Star b", 'PSR B1620-26 b'];

const SHELVES = [
  { id: 'famous', title: 'Famous worlds', blurb: 'Planets with a story: firsts, records and oddities.',
    pick: (A) => FAMOUS.map((n) => A.find((p) => p.name === n)).filter(Boolean), stat: (p) => `${typeLabel(p.type)}, ${p.year}`, browse: { sort: 'interesting' } },
  { id: 'closest', title: 'Our nearest neighbours', blurb: 'The planets closest to the Sun.',
    pick: (A) => top(A, 'dist_ly', true), stat: (p) => `${fmt(p.dist_ly, 1)} light-years`, browse: { sort: 'close' } },
  { id: 'hz', title: 'Habitable-zone starlight', blurb: 'Rocky-sized planets that get starlight in a range that could allow liquid water. Nobody knows yet whether any do.',
    pick: (A) => top(A, 'dist_ly', true, 14, (p) => p.hz), stat: (p) => `${fmt(p.dist_ly, 1)} light-years`, browse: { hz: true, sort: 'close' } },
  { id: 'new', title: 'Fresh discoveries', blurb: 'The newest additions to the catalogue.',
    pick: (A) => top(A, 'year', false, 14), stat: (p) => `Found in ${p.year}`, browse: { sort: 'new' } },
  { id: 'hot', title: 'Hottest worlds', blurb: 'Measured temperatures that would melt metal.',
    pick: (A) => top(A, 'teq', false, 14, (p) => !p.teq_est && !p.controv && p.teq < 4500), stat: (p) => `${fmt(p.teq, 0)} K`, browse: { sort: 'hot' } },
  { id: 'short', title: 'Shortest years', blurb: 'Planets that race around their star in hours.',
    pick: (A) => top(A, 'per', true, 14, (p) => !p.per_est && !p.controv), stat: (p) => fmtDuration(p.per), browse: { sort: 'short' } },
  { id: 'long', title: 'Longest years', blurb: 'Far-out worlds whose single orbit takes centuries or more.',
    pick: (A) => top(A, 'per', false, 14, (p) => !p.per_est && !p.controv), stat: (p) => fmtDuration(p.per), browse: { sort: 'long' } },
  { id: 'tiny', title: 'Smallest planets', blurb: 'Some are smaller than Mercury.',
    pick: (A) => top(A, 'rade', true, 14, (p) => !p.controv), stat: (p) => `${fmt(p.r, 2)}× Earth`, browse: { sort: 'small' } },
  { id: 'puffy', title: 'Puffiest planets', blurb: 'Very low density: lighter than cork, in some cases.',
    pick: (A) => top(A, 'density', true, 14, (p) => !p.controv), stat: (p) => `${fmt(p.density, 2)} g/cm³`, browse: { sort: 'puffy' } },
];

const CHEVRON = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

function buildShelves() {
  const host = $('#shelves');
  host.innerHTML = '';
  for (const s of SHELVES) {
    const items = s.pick(ALL);
    if (!items.length) continue;
    const sec = document.createElement('section');
    sec.className = 'shelf';
    sec.innerHTML = `
      <div class="shelf-head">
        <div><h2 class="h2">${esc(s.title)}</h2><p>${esc(s.blurb)}</p></div>
        <div class="shelf-tools">
          <button type="button" class="link" data-browse="${s.id}">See all</button>
          <button type="button" class="arrow" data-dir="-1" aria-label="Scroll ${esc(s.title)} left">${CHEVRON('m15 18-6-6 6-6')}</button>
          <button type="button" class="arrow" data-dir="1" aria-label="Scroll ${esc(s.title)} right">${CHEVRON('m9 18 6-6-6-6')}</button>
        </div>
      </div>
      <div class="rail" tabindex="0" aria-label="${esc(s.title)}">
        ${items.map((p) => `<button type="button" class="item" data-id="${p.id}"><i class="orb" style="background:${orbBg(p)};--g:${glow(p)}"></i><b>${esc(p.name)}</b><small>${esc(s.stat(p))}</small></button>`).join('')}
      </div>`;
    host.appendChild(sec);
  }
  host.addEventListener('click', (e) => {
    const card = e.target.closest('.item');
    if (card) return openPlanet(ALL[+card.dataset.id]);
    const arrow = e.target.closest('.arrow');
    if (arrow) {
      const rail = arrow.closest('.shelf').querySelector('.rail');
      rail.scrollBy({ left: +arrow.dataset.dir * rail.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    const b = e.target.closest('[data-browse]');
    if (b) {
      const s = SHELVES.find((x) => x.id === b.dataset.browse);
      Object.assign(state, { q: '', types: new Set(), temp: '', method: '', decade: '', hz: false, sort: 'interesting' }, s.browse);
      syncControls(); applyFilters();
      $('#explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// ---------------------------------------------------------------- controls
const SORTS = [
  { id: 'interesting', label: 'Most interesting first' },
  { id: 'name', label: 'Name (A to Z)', cmp: (a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }) },
  { id: 'new', label: 'Newest discovery', key: 'year', dir: -1 },
  { id: 'old', label: 'Oldest discovery', key: 'year', dir: 1 },
  { id: 'close', label: 'Closest to Earth', key: 'dist_ly', dir: 1 },
  { id: 'far', label: 'Farthest from Earth', key: 'dist_ly', dir: -1 },
  { id: 'big', label: 'Largest radius', key: 'r', dir: -1 },
  { id: 'small', label: 'Smallest radius', key: 'r', dir: 1 },
  { id: 'heavy', label: 'Heaviest', key: 'm', dir: -1 },
  { id: 'light', label: 'Lightest', key: 'm', dir: 1 },
  { id: 'hot', label: 'Hottest', key: 'teq', dir: -1 },
  { id: 'cold', label: 'Coldest', key: 'teq', dir: 1 },
  { id: 'short', label: 'Shortest year', key: 'per', dir: 1 },
  { id: 'long', label: 'Longest year', key: 'per', dir: -1 },
  { id: 'puffy', label: 'Lowest density', key: 'density', dir: 1 },
  { id: 'earthlike', label: 'Most Earth-like (size and temperature)', key: 'esi', dir: -1 },
];

function buildControls() {
  $('#sort').innerHTML = SORTS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  $('#temp').innerHTML = '<option value="">Any temperature</option>' + TEMPS.map((t) => `<option value="${t.id}">${t.label}${t.hint ? ' (' + t.hint + ')' : ''}</option>`).join('');
  const mc = {};
  ALL.forEach((p) => { mc[p.method] = (mc[p.method] || 0) + 1; });
  $('#method').innerHTML = '<option value="">Any method</option>' + Object.entries(mc).sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `<option value="${esc(m)}">${esc(m)} (${n.toLocaleString('en-US')})</option>`).join('');
  const decades = [...new Set(ALL.map((p) => p.year).filter((y) => y != null).map((y) => Math.floor(y / 10) * 10))].sort();
  $('#decade').innerHTML = '<option value="">Any year</option>' + decades.map((d) => `<option value="${d}">${d}s</option>`).join('');

  const counts = {};
  ALL.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
  $('#typeChips').innerHTML = TYPES.filter((t) => counts[t.id]).map((t) =>
    `<button type="button" class="chip" data-type="${t.id}" aria-pressed="false" title="${esc(t.blurb)}"><i class="dot" style="--c:${TYPE_COLOR[t.id]}"></i>${t.label} <small>${counts[t.id].toLocaleString('en-US')}</small></button>`).join('');

  ['#sort', '#temp', '#method', '#decade'].forEach((id) => enhanceSelect($(id)));

  let timer;
  $('#q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value; applyFilters(); }, 120); });
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') e.target.blur(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; applyFilters(); });
  $('#temp').addEventListener('change', (e) => { state.temp = e.target.value; applyFilters(); });
  $('#method').addEventListener('change', (e) => { state.method = e.target.value; applyFilters(); });
  $('#decade').addEventListener('change', (e) => { state.decade = e.target.value; applyFilters(); });
  $('#hz').addEventListener('click', () => { state.hz = !state.hz; syncControls(); applyFilters(); });
  $('#typeChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const t = b.dataset.type;
    state.types.has(t) ? state.types.delete(t) : state.types.add(t);
    syncControls(); applyFilters();
  });
  $('#reset').addEventListener('click', () => {
    Object.assign(state, { q: '', types: new Set(), temp: '', method: '', decade: '', hz: false, sort: 'interesting' });
    syncControls(); applyFilters();
  });
}

function syncControls() {
  $('#q').value = state.q;
  $('#sort').value = state.sort; $('#temp').value = state.temp; $('#method').value = state.method; $('#decade').value = state.decade;
  refreshSelects();
  $('#hz').setAttribute('aria-pressed', String(state.hz));
  document.querySelectorAll('#typeChips .chip').forEach((c) => {
    const on = state.types.has(c.dataset.type);
    c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on));
  });
}

function applyFilters() {
  const q = state.q.toLowerCase().replace(/[^a-z0-9]/g, '');
  VIEW = ALL.filter((p) =>
    (!q || p.skey.includes(q)) &&
    (!state.types.size || state.types.has(p.type)) &&
    (!state.temp || p.tempClass === state.temp) &&
    (!state.method || p.method === state.method) &&
    (!state.decade || (p.year != null && Math.floor(p.year / 10) * 10 === +state.decade)) &&
    (!state.hz || p.hz));
  const s = SORTS.find((x) => x.id === state.sort);
  if (s.id === 'interesting') VIEW.sort((a, b) => b.score - a.score || (a.dist_ly ?? 1e9) - (b.dist_ly ?? 1e9));
  else if (s.cmp) VIEW.sort(s.cmp);
  else VIEW.sort((a, b) => {
    const x = a[s.key], y = b[s.key];
    if (x == null && y == null) return 0;
    if (x == null) return 1; if (y == null) return -1;   // unknown values always last
    return (x - y) * s.dir;
  });
  const filtered = state.q || state.types.size || state.temp || state.method || state.decade || state.hz;
  $('#reset').hidden = !(filtered || state.sort !== 'interesting');
  $('#matchCount').textContent = `${VIEW.length.toLocaleString('en-US')} of ${ALL.length.toLocaleString('en-US')}`;
  $('#empty').hidden = VIEW.length > 0;
  $('#thead').hidden = VIEW.length === 0;
  layoutList();
}

// ---------------------------------------------------------------- virtual list
const listEl = $('#list');
const viewport = $('#viewport');
let rowH = 60, curStart = -1, curEnd = -1, ticking = false;

function layoutList(reset = true) {
  rowH = window.matchMedia('(max-width: 760px)').matches ? 72 : 60;
  listEl.style.height = VIEW.length * rowH + 'px';
  curStart = curEnd = -1;
  if (reset) viewport.scrollTop = 0;
  renderRows();
}

function rowHTML(p, i) {
  const dist = p.dist_ly != null ? fmt(p.dist_ly, 1) + ' ly' : NI;
  const size = p.r != null ? fmt(p.r, 2) + (p.r_est ? '*' : '') : NI;
  const temp = p.teq != null ? `<i class="heat" style="background:${tempColor(p.teq)}"></i>${fmt(p.teq, 0)} K${p.teq_est ? '*' : ''}` : NI;
  const sub2 = [typeLabel(p.type), p.year, p.dist_ly != null ? fmt(p.dist_ly, 1) + ' ly' : null, p.teq != null ? fmt(p.teq, 0) + ' K' : null].filter((v) => v != null).join(', ');
  return `<button type="button" class="row" data-id="${p.id}" style="top:${i * rowH}px;height:${rowH - 4}px">
    <i class="orb" style="background:${orbBg(p)};--g:${glow(p)}"></i>
    <span class="c-name"><b>${esc(p.name)}</b><small class="d-only">${esc(p.host)}</small><small class="m-only">${esc(sub2)}</small></span>
    <span class="c-type">${typeLabel(p.type)}</span>
    <span class="num">${p.year ?? NI}</span>
    <span class="num${p.dist_ly == null ? ' ni' : ''}">${dist}</span>
    <span class="num${p.r == null ? ' ni' : ''}">${size}</span>
    <span class="num${p.teq == null ? ' ni' : ''}">${temp}</span>
  </button>`;
}

function renderRows() {
  ticking = false;
  if (!VIEW.length) { listEl.innerHTML = ''; return; }
  const pad = 6;
  const start = Math.max(0, Math.floor(viewport.scrollTop / rowH) - pad);
  const end = Math.min(VIEW.length, Math.ceil((viewport.scrollTop + viewport.clientHeight) / rowH) + pad);
  if (start === curStart && end === curEnd) return;
  curStart = start; curEnd = end;
  let html = '';
  for (let i = start; i < end; i++) html += rowHTML(VIEW[i], i);
  listEl.innerHTML = html;
}
const requestRender = () => { if (!ticking) { ticking = true; requestAnimationFrame(renderRows); } };
viewport.addEventListener('scroll', requestRender, { passive: true });
window.addEventListener('resize', () => { layoutList(false); });
listEl.addEventListener('click', (e) => {
  const b = e.target.closest('.row');
  if (b) openPlanet(ALL[+b.dataset.id]);
});

// ---------------------------------------------------------------- planet view
const detail = $('#detail');
// Freeze the 3D planet while the sheet scrolls, so scrolling gets the whole GPU.
['#sheet', '#detail'].forEach((id) => $(id).addEventListener('scroll', () => { if (view) view.hold(160); }, { passive: true }));
let view = null, viewMod = null, lastFocus = null;

async function ensureView() {
  if (view) return view;
  viewMod = viewMod || await import('./planet3d.js');
  view = new viewMod.PlanetView($('#gl'));
  return view;
}

// ---- fact cards: pick an icon, a short label and a big number out of each fact sentence
const ICON = {
  year: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  distance: '<path d="M4 12h13M13 7l5 5-5 5"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/>',
  size: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>',
  mass: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-2 6a3 3 0 0 0 4 0zM19 8l-2 6a3 3 0 0 0 4 0z"/>',
  temp: '<path d="M10 14V6a2 2 0 0 1 4 0v8a4 4 0 1 1-4 0z"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  transit: '<path d="M3 8h5l1.5 5h5L16 8h5"/><circle cx="12" cy="18" r="2"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  spark: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
};
const FACT_RULES = [
  [/\b(year here|one year|orbit takes|year lasts)\b/i, 'year', 'Year length', '#FFB454'],
  [/\b(light-years|closest|light we see)\b/i, 'distance', 'Distance', '#7ED6FF'],
  [/\b(block|passes in front|transit)\b/i, 'transit', 'Transit', '#7ED6FF'],
  [/\b(gravity|weigh)\b/i, 'mass', 'Surface gravity', '#B58CFF'],
  [/\b(density|float|metal core)\b/i, 'mass', 'Density', '#B58CFF'],
  [/\bmass\b/i, 'mass', 'Mass', '#B58CFF'],
  [/\b(radius|wider|width|larger|smaller|size)\b/i, 'size', 'Size', '#6CC08B'],
  [/\b(starlight|habitable|sunlight|as much light)\b/i, 'light', 'Starlight', '#FFD27A'],
  [/\b(\bK\b|hot|cold|freez|melt|lava|boil|temperature|warm)\b/i, 'temp', 'Temperature', '#FF7A45'],
  [/\b(star|dwarf|sun|spectral)\b/i, 'star', 'Its star', '#FFB454'],
];
const BIG = /(\d[\d,]*(?:\.\d+)?)\s?(×|%|light-years?|days?|hours?|minutes?|years?|K\b|g\/cm³|kg|AU|times)/;
function factCard(text) {
  const [, icon, label, color] = FACT_RULES.find(([re]) => re.test(text)) || [0, 'spark', 'Did you know', '#8F9BC4'];
  const m = text.match(BIG);
  const big = m ? `<span class="f-big">${esc(m[1])}<small>${esc(/^[×%]$/.test(m[2]) ? m[2] : ' ' + m[2])}</small></span>` : '';
  return `<li class="fact" style="--c:${color}"><span class="f-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[icon]}</svg></span><div class="f-body"><span class="f-label">${label}</span>${big}<p>${esc(text)}</p></div></li>`;
}

function splitDuration(p) {
  const s = fmtDuration(p.per);
  const i = s.indexOf(' ');
  return [s.slice(0, i), s.slice(i + 1)];
}

function fillDetail(p) {
  $('#dName').textContent = p.name;
  const how = p.method !== NI ? ` by the ${p.method.toLowerCase()} method` : '';
  $('#dSub').textContent = `${typeLabel(p.type)}${p.year != null ? `, found in ${p.year}` : ''}${how}.`;
  const tags = [];
  if (p.tempClass !== 'unknown') tags.push(`<span class="tag"><i style="--c:${tempColor(p.teq)}"></i>${tempLabel(p.tempClass)}</span>`);
  if (p.hotJupiter) tags.push('<span class="tag">Hot Jupiter</span>');
  if (p.hz) tags.push('<span class="tag">Habitable-zone starlight</span>');
  if (p.controv) tags.push('<span class="tag">Status debated</span>');
  $('#dBadges').innerHTML = tags.join('');

  const cell = (label, val, unit, color) => val == null
    ? `<div style="--c:${color || 'var(--line)'}"><dd class="ni">${NI}</dd><dt>${label}</dt></div>`
    : `<div style="--c:${color || 'var(--line)'}"><dd>${esc(val)}<small>${esc(unit)}</small></dd><dt>${label}</dt></div>`;
  const [yv, yu] = p.per != null ? splitDuration(p) : [null, ''];
  $('#dReadout').innerHTML =
    cell('Distance', p.dist_ly != null ? fmt(p.dist_ly, 1) : null, 'light-years') +
    cell('One year lasts', yv, yu) +
    cell('Radius', p.r != null ? fmt(p.r, 2) : null, p.r_est ? '× Earth, est.' : '× Earth') +
    cell('Temperature', p.teq != null ? fmt(p.teq, 0) : null, p.teq_est ? 'K, est.' : 'K', tempColor(p.teq));

  const note = editorNote(p);
  $('#dNote').hidden = !note; $('#dNote').textContent = note || '';
  $('#dFacts').innerHTML = topFacts(p, ALL, 8).filter((f) => f !== note).map(factCard).join('');
  $('#dHow').textContent = HOW_FOUND[p.method] || 'The discovery method is not identified.';
  const dep = transitDepth(p);
  const showCurve = p.method === 'Transit' && dep != null && dep > 1e-6 && dep < 0.5;
  $('#dCurveWrap').hidden = !showCurve;
  $('#dCurve').innerHTML = showCurve ? transitCurve(dep, p.name) : '';
  $('#dCmp').innerHTML = comparisonHTML(p);
  $('#dDetails').innerHTML = details(p).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="${v === NI ? 'ni' : ''}">${esc(v)}</dd></div>`).join('');
  $('#dArtist').textContent = lookReason(p);

  const raH = p.ra / 15, h = Math.floor(raH), m = Math.round((raH - h) * 60);
  const sign = p.dec < 0 ? '−' : '+';
  $('#dSkyCap').textContent = `Right ascension ${m === 60 ? h + 1 : h}h ${m === 60 ? 0 : m}m, declination ${sign}${Math.abs(p.dec).toFixed(1)}°. Each faint dot is another star with known planets.`;

  const sibs = ALL.filter((q) => q.host === p.host && q.id !== p.id).slice(0, 16);
  $('#dSiblingsWrap').hidden = !sibs.length;
  $('#dSiblingsTitle').textContent = `Other planets of ${p.host}`;
  $('#dSiblings').innerHTML = sibs.map((q) => `<button type="button" class="chip" data-id="${q.id}">${esc(q.name)}</button>`).join('');
  $('#shareMsg').textContent = '';
  $('#sheet').scrollTop = 0; detail.scrollTop = 0;
  const fb = $('#glFallback');
  fb.hidden = true; fb.style.background = orbBg(p);
}

async function openPlanet(p, push = true) {
  if (!p) return;
  const wasOpen = !detail.hidden;
  if (!wasOpen) lastFocus = document.activeElement;
  fillDetail(p);
  detail.hidden = false;
  document.body.classList.add('lock', 'has-detail');
  if (sky) sky.pause();
  if (push) {
    const url = '#planet=' + encodeURIComponent(p.name);
    if (wasOpen) history.replaceState({ open: 1 }, '', url); else history.pushState({ open: 1 }, '', url);
  }
  if (!wasOpen) { detail.tabIndex = -1; detail.focus({ preventScroll: true }); }
  document.title = `${p.name} · Exoplanet Atlas`;
  requestAnimationFrame(() => skyData && drawMiniSky($('#dSky'), skyData, { ra: p.ra, dec: p.dec }));
  try {
    const v = await ensureView();
    if (v.error) throw new Error(v.error);
    v.set(p); v.start();
    $('#glFallback').hidden = true;
  } catch (err) {
    console.error(err);
    $('#glFallback').hidden = false;
    $('#glFallback').textContent = '3D view is not available on this device, so a flat colour swatch is shown instead.';
  }
}

function hideDetail() {
  if (detail.hidden) return;
  detail.hidden = true;
  document.body.classList.remove('lock', 'has-detail');
  document.title = 'Exoplanet Atlas';
  if (view) view.stop();
  if (sky) sky.start();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

function closeDetail() {
  if (history.state && history.state.open) history.back(); else { hideDetail(); history.replaceState(null, '', location.pathname + location.search); }
}

function routeFromHash() {
  const m = location.hash.match(/^#planet=(.+)$/);
  if (m) {
    const name = decodeURIComponent(m[1]);
    const p = ALL.find((x) => x.name === name);
    if (p) { openPlanet(p, false); return; }
  }
  hideDetail();
}

$('#close').addEventListener('click', closeDetail);
$('#dSiblings').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openPlanet(ALL[+b.dataset.id]); });
window.addEventListener('resize', () => { if (!detail.hidden && skyData) { const p = ALL.find((x) => x.name === $('#dName').textContent); if (p) drawMiniSky($('#dSky'), skyData, { ra: p.ra, dec: p.dec }); } });
document.addEventListener('keydown', (e) => {
  if (detail.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeDetail(); }
  if (e.key === 'Tab') {   // keep focus inside the open planet view
    const f = [...detail.querySelectorAll('button, [href], select, input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('#share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('#shareMsg').textContent = 'Link copied.'; }
  catch { $('#shareMsg').textContent = 'Copy the address from your browser bar.'; }
});

load();
