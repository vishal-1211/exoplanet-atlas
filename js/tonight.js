// "What can I see tonight?": which stars with known planets are above the horizon, and where to look.
import { boot, $, esc, nf } from './boot.js';
import { enhanceSelect, refreshSelects } from './dropdown.js';

const { all } = await boot();

// Approximate brightness (V magnitude) of well-known naked-eye stars that have planets. Used only when the
// data file does not carry magnitudes. Lower = brighter; about 6 is the limit of a dark sky.
const NAKED = { 'alf Tau': 0.85, 'alf Ari': 2.0, 'bet UMi': 2.1, 'gam Cep': 3.2, 'iot Dra': 3.3, 'omi UMa': 3.4, 'nu Oph': 3.3, 'tau Cet': 3.5, 'eps Tau': 3.5, 'bet Cnc': 3.5,
  'gam Psc': 3.7, 'eps Eri': 3.7, 'nu Oct A': 3.8, 'bet Pic': 3.9, 'mu Leo': 3.9, 'gam Lib': 3.9, 'ups And': 4.1, 'eps CrB': 4.1, 'kap And': 4.1, 'ups Leo': 4.3, 'tau Gem': 4.4,
  'tau Boo': 4.5, 'eps Ind A': 4.7, '61 Vir': 4.7, '11 Com': 4.7, 'xi Aql': 4.7, 'kap CrB': 4.8, '70 Vir': 5.0, '47 UMa': 5.0, '11 UMi': 5.0, 'ome Ser': 5.2, 'rho CrB': 5.4, '51 Peg': 5.5, '4 UMa': 5.4, 'HD 219134': 5.6, 'HD 142': 5.7, '55 Cnc': 5.95, 'HD 69830': 5.95 };
const CITIES = [['New Delhi', 28.61, 77.21], ['Mumbai', 19.08, 72.88], ['Bengaluru', 12.97, 77.59], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27], ['London', 51.51, -0.13],
  ['New York', 40.71, -74.01], ['Los Angeles', 34.05, -118.24], ['São Paulo', -23.55, -46.63], ['Cape Town', -33.92, 18.42], ['Sydney', -33.87, 151.21], ['Tokyo', 35.68, 139.69]];

// one entry per host star
const stars = new Map();
for (const p of all) {
  if (p.ra == null || p.dec == null) continue;
  const s = stars.get(p.host) || { host: p.host, ra: p.ra, dec: p.dec, n: 0, vmag: p.vmag, first: p };
  s.n++; if (s.vmag == null && p.vmag != null) s.vmag = p.vmag; stars.set(p.host, s);
}
const hasMag = [...stars.values()].some((s) => s.vmag != null);
for (const s of stars.values()) if (s.vmag == null && NAKED[s.host] != null) s.vmag = NAKED[s.host];
const visibleList = [...stars.values()].filter((s) => s.vmag != null && s.vmag <= (hasMag ? 6.2 : 6.0));

const GREEK = { alf: 'Alpha', bet: 'Beta', gam: 'Gamma', del: 'Delta', eps: 'Epsilon', zet: 'Zeta', eta: 'Eta', tet: 'Theta', iot: 'Iota', kap: 'Kappa', lam: 'Lambda', mu: 'Mu', nu: 'Nu', xi: 'Xi', omi: 'Omicron', pi: 'Pi', rho: 'Rho', sig: 'Sigma', tau: 'Tau', ups: 'Upsilon', phi: 'Phi', chi: 'Chi', psi: 'Psi', ome: 'Omega' };
const GEN = { And: 'Andromedae', Ari: 'Arietis', Boo: 'Boötis', Cep: 'Cephei', Cet: 'Ceti', Cnc: 'Cancri', CrB: 'Coronae Borealis', Dra: 'Draconis', Eri: 'Eridani', Gem: 'Geminorum', Ind: 'Indi', Leo: 'Leonis', Lib: 'Librae', Oct: 'Octantis', Oph: 'Ophiuchi', Pic: 'Pictoris', Psc: 'Piscium', Ser: 'Serpentis', Tau: 'Tauri', UMa: 'Ursae Majoris', UMi: 'Ursae Minoris', Vir: 'Virginis', Aql: 'Aquilae', Com: 'Comae Berenices', Peg: 'Pegasi', Her: 'Herculis', Cas: 'Cassiopeiae', Lyr: 'Lyrae', Cyg: 'Cygni', Per: 'Persei', Ori: 'Orionis' };
const PROPER = { 'alf Tau': 'Aldebaran', 'alf Ari': 'Hamal', 'bet UMi': 'Kochab', 'gam Cep': 'Errai', 'iot Dra': 'Edasich', 'bet Cnc': 'Tarf', 'eps Tau': 'Ain', 'bet Pic': 'Beta Pictoris', 'tau Cet': 'Tau Ceti', 'omi UMa': 'Muscida' };
// NASA writes star names in catalogue shorthand ("alf Tau"); show the usual name.
const pretty = (h) => {
  const m = h.match(/^([a-z]{2,3})(\d)? ([A-Za-z]+)( [A-Z])?$/);
  const full = m && GREEK[m[1]] && GEN[m[3]] ? `${GREEK[m[1]]}${m[2] ? '¹²³⁴'[m[2] - 1] || m[2] : ''} ${GEN[m[3]]}${m[4] || ''}` : h;
  return PROPER[h] && PROPER[h] !== full ? `${PROPER[h]} (${full})` : full;
};

const st = { lat: 28.61, lon: 77.21, when: null };
$('#tnControls').innerHTML = `<div class="fields"><label class="field">Place<select id="tnCity">${CITIES.map(([n], i) => `<option value="${i}">${n}</option>`).join('')}<option value="x">My own latitude and longitude</option></select></label>
  <label class="field">Latitude<input id="tnLat" type="number" step="0.01" min="-90" max="90" value="${st.lat}"></label>
  <label class="field">Longitude<input id="tnLon" type="number" step="0.01" min="-180" max="180" value="${st.lon}"></label>
  <label class="field">Time<input id="tnTime" type="datetime-local"></label></div>
  <p><button type="button" class="btn" id="tnGeo">Use my location</button> <button type="button" class="btn" id="tnNow">Now</button> <span class="muted small" id="tnMsg" role="status"></span></p>`;
enhanceSelect($('#tnCity'));

const pad = (n) => String(n).padStart(2, '0');
const localStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const setNow = () => { st.when = null; $('#tnTime').value = localStr(new Date()); };

const rad = Math.PI / 180;
function altAz(s, date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360;
  const ha = (gmst + st.lon - s.ra) * rad, dec = s.dec * rad, lat = st.lat * rad;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.cos(dec) * Math.sin(ha), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha));
  return { alt: alt / rad, az: (az / rad + 360) % 360 };
}
const DIRS = ['north', 'north-north-east', 'north-east', 'east-north-east', 'east', 'east-south-east', 'south-east', 'south-south-east', 'south', 'south-south-west', 'south-west', 'west-south-west', 'west', 'west-north-west', 'north-west', 'north-north-west'];
const dirName = (az) => DIRS[Math.round(az / 22.5) % 16];

function render() {
  const date = st.when || new Date();
  const up = visibleList.map((s) => ({ s, ...altAz(s, date) })).filter((x) => x.alt > 8).sort((a, b) => a.s.vmag - b.s.vmag);
  $('#tnList').innerHTML = up.length
    ? `<h2 class="h2">${up.length} star${up.length > 1 ? 's' : ''} above the horizon</h2><ol class="tn-list">${up.map((x) => `<li><b>${esc(pretty(x.s.host))}</b> <span class="muted">${x.s.n} known planet${x.s.n > 1 ? 's' : ''}, brightness about ${x.s.vmag.toFixed(1)}</span><br>Look ${dirName(x.az)} (${Math.round(x.az)}°), ${Math.round(x.alt)}° above the horizon. <a href="systems.html#${encodeURIComponent(x.s.host)}">See its planets</a></li>`).join('')}</ol>`
    : '<h2 class="h2">No known naked-eye planet hosts are up</h2><p class="muted">Try another time of night, or another date.</p>';
  $('#tnNote').textContent = `You cannot see the planets themselves, only their stars, and a dark sky away from city lights helps. Brightness is "magnitude": lower is brighter, and about 6 is the faintest star most people can see. ${hasMag ? 'Magnitudes come from the NASA Exoplanet Archive.' : 'This data file has no brightness column, so the list is a hand-picked set of ' + Object.keys(NAKED).length + ' well-known naked-eye stars with planets, with approximate magnitudes. It will show every star once the data refresh includes magnitudes.'} Positions are computed in your browser from the star's coordinates; your location is not sent anywhere. The time shown is your device's clock.`;
  draw(up, date);
}

function draw(up) {
  const cv = $('#tnSky'), dpr = Math.min(devicePixelRatio || 1, 2), size = Math.min(520, cv.parentElement.clientWidth);
  cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
  const c = size / 2, R = c - 26;
  const grad = g.createRadialGradient(c, c, 0, c, c, R); grad.addColorStop(0, 'rgba(60,80,160,.30)'); grad.addColorStop(1, 'rgba(10,16,40,.7)');
  g.fillStyle = grad; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(160,180,255,.22)'; g.lineWidth = 1;
  for (const f of [1, .66, .33]) { g.beginPath(); g.arc(c, c, R * f, 0, 7); g.stroke(); }
  g.beginPath(); g.moveTo(c, c - R); g.lineTo(c, c + R); g.moveTo(c - R, c); g.lineTo(c + R, c); g.stroke();
  g.fillStyle = '#C9D2EE'; g.font = '600 13px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', c, c - R - 12); g.fillText('S', c, c + R + 12); g.fillText('E', c - R - 12, c); g.fillText('W', c + R + 12, c);
  g.font = '12px Inter, system-ui, sans-serif'; g.textAlign = 'left';
  const labelled = [];
  up.forEach((x, i) => {
    const r = ((90 - x.alt) / 90) * R, X = c - r * Math.sin(x.az * rad), Y = c - r * Math.cos(x.az * rad);
    const rr = Math.max(2.5, 6.5 - x.s.vmag * 0.9);
    g.fillStyle = '#FFE9B0'; g.beginPath(); g.arc(X, Y, rr, 0, 7); g.fill();
    const name = (PROPER[x.s.host] || pretty(x.s.host)).replace(/ \(.*/, '');
    if (!labelled.some(([lx, ly]) => Math.abs(lx - X) < 70 && Math.abs(ly - Y) < 14)) { labelled.push([X, Y]); g.fillStyle = '#EAF0FF'; g.fillText(name, X + rr + 4, Y); }
  });
  cv.setAttribute('aria-label', `Map of the sky overhead. ${up.length} stars with planets are above the horizon. The centre is straight up; the edge is the horizon.`);
}

function setPlace(i) {
  if (i === 'x') return;
  const [, lat, lon] = CITIES[+i]; st.lat = lat; st.lon = lon; $('#tnLat').value = lat; $('#tnLon').value = lon;
}
$('#tnCity').addEventListener('change', (e) => { setPlace(e.target.value); render(); });
const manual = () => { const la = parseFloat($('#tnLat').value), lo = parseFloat($('#tnLon').value); if (Number.isFinite(la) && Number.isFinite(lo)) { st.lat = Math.max(-90, Math.min(90, la)); st.lon = Math.max(-180, Math.min(180, lo)); $('#tnCity').value = 'x'; refreshSelects(); render(); } };
$('#tnLat').addEventListener('input', manual); $('#tnLon').addEventListener('input', manual);
$('#tnTime').addEventListener('input', (e) => { const d = new Date(e.target.value); if (!isNaN(d)) { st.when = d; render(); } });
$('#tnNow').addEventListener('click', () => { setNow(); render(); });
$('#tnGeo').addEventListener('click', () => {
  if (!navigator.geolocation) { $('#tnMsg').textContent = 'Your browser cannot share its location. Pick a city instead.'; return; }
  $('#tnMsg').textContent = 'Asking your browser…';
  navigator.geolocation.getCurrentPosition((pos) => {
    st.lat = pos.coords.latitude; st.lon = pos.coords.longitude;
    $('#tnLat').value = st.lat.toFixed(2); $('#tnLon').value = st.lon.toFixed(2); $('#tnCity').value = 'x'; refreshSelects();
    $('#tnMsg').textContent = 'Using your location. It stays in your browser.'; render();
  }, () => { $('#tnMsg').textContent = 'Location was not shared. Pick a city or type your latitude and longitude.'; }, { timeout: 10000 });
});
setNow(); render();
setInterval(() => { if (!st.when && !document.hidden) render(); }, 60000);
addEventListener('resize', () => render());
