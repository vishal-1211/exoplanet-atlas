// Unconfirmed planet candidates from TESS and Kepler (data/candidates.json, written by the weekly refresh).
import { boot, $, esc, nf } from './boot.js';
import { classifyRadius, classifyTemp, typeLabel, tempLabel, fmt } from './model.js';
import { enhanceSelect, refreshSelects } from './dropdown.js';

const { all } = await boot();
let data = null;
try { const r = await fetch('data/candidates.json'); if (r.ok) data = await r.json(); } catch { /* handled below */ }
const out = $('#cdOut');
if (!data) {
  out.innerHTML = '<p class="muted">The candidate list has not been loaded yet. It is added by the automatic refresh and will appear here after the next update.</p>';
} else {
  const C = data.cols, rows = data.rows.map((r) => Object.fromEntries(C.map((c, i) => [c, r[i]])));
  rows.forEach((c) => { c.type = c.rade != null ? classifyRadius(c.rade) : 'unknown'; c.tc = c.eqt != null ? classifyTemp(c.eqt) : 'unknown'; c.k = c.name.toLowerCase().replace(/[^a-z0-9]/g, ''); });
  const known = new Set(all.map((p) => p.name));
  const st = { q: '', src: '', size: '', sort: 'name', dir: 1, page: 0 };
  const PER = 50;
  $('#cdLede').textContent = `${nf(rows.length)} candidate signals: ${nf(rows.filter((r) => r.source === 'TESS').length)} from TESS and ${nf(rows.filter((r) => r.source === 'Kepler').length)} from Kepler. Updated ${data.generated}. About ${nf(data.falsePositives)} signals already ruled out are not listed.`;
  $('#cdControls').innerHTML = `<label class="search big"><span class="sr">Search candidates</span><input id="cdQ" type="search" placeholder="Search, e.g. TOI-700 or KOI-5" autocomplete="off"></label>
    <div class="fields"><label class="field">Telescope<select id="cdSrc"><option value="">TESS and Kepler</option><option>TESS</option><option>Kepler</option></select></label>
    <label class="field">Size<select id="cdSize"><option value="">Any size</option>${['subearth', 'earth', 'superearth', 'mininep', 'neptune', 'giant'].map((t) => `<option value="${t}">${typeLabel(t)}</option>`).join('')}</select></label></div>`;
  enhanceSelect($('#cdSrc')); enhanceSelect($('#cdSize'));
  const COLS = [['name', 'Candidate'], ['source', 'Telescope'], ['rade', 'Size, × Earth'], ['per', 'Orbit, days'], ['eqt', 'Temperature, K'], ['teff', 'Star, K'], ['mag', 'Star brightness']];
  const view = () => {
    const q = st.q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const list = rows.filter((r) => (!q || r.k.includes(q)) && (!st.src || r.source === st.src) && (!st.size || r.type === st.size));
    list.sort((a, b) => { const x = a[st.sort], y = b[st.sort]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y, 'en', { numeric: true }) : x - y) * st.dir; });
    return list;
  };
  function render() {
    const list = view(), pages = Math.max(1, Math.ceil(list.length / PER));
    st.page = Math.min(st.page, pages - 1);
    const slice = list.slice(st.page * PER, st.page * PER + PER);
    out.innerHTML = `<p class="muted small" role="status">${nf(list.length)} shown</p><div class="tablewrap"><table class="pl-table cd-table"><thead><tr>${COLS.map(([k, l]) => `<th><button type="button" class="thbtn" data-sort="${k}" aria-sort="${st.sort === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${st.sort === k ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead><tbody>${slice.map((r) =>
      `<tr><th scope="row">${esc(r.name)}${known.has(r.name) ? ' <small>now confirmed</small>' : ''}</th><td>${r.source}</td><td>${r.rade != null ? fmt(r.rade, 2) : '<span class="ni">Not identified</span>'}</td><td>${r.per != null ? fmt(r.per, 2) : '<span class="ni">Not identified</span>'}</td><td>${r.eqt != null ? fmt(r.eqt, 0) : '<span class="ni">Not identified</span>'}</td><td>${r.teff != null ? fmt(r.teff, 0) : '<span class="ni">Not identified</span>'}</td><td>${r.mag != null ? fmt(r.mag, 1) : '<span class="ni">Not identified</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="pager"><button type="button" class="btn" id="cdPrev" ${st.page === 0 ? 'disabled' : ''}>Previous</button> <span class="muted small">Page ${st.page + 1} of ${pages}</span> <button type="button" class="btn" id="cdNext" ${st.page >= pages - 1 ? 'disabled' : ''}>Next</button></p>`;
  }
  let timer; $('#cdQ').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { st.q = e.target.value; st.page = 0; render(); }, 120); });
  $('#cdSrc').addEventListener('change', (e) => { st.src = e.target.value; st.page = 0; render(); });
  $('#cdSize').addEventListener('change', (e) => { st.size = e.target.value; st.page = 0; render(); });
  out.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sort]');
    if (s) { st.dir = st.sort === s.dataset.sort ? -st.dir : 1; st.sort = s.dataset.sort; render(); return; }
    if (e.target.id === 'cdPrev') { st.page--; render(); } if (e.target.id === 'cdNext') { st.page++; render(); }
  });
  render();
}
