// Star systems page: the planets of one star, side by side, on a log scale.
import { boot, $, esc, planetHref, nf } from './boot.js';
import { systemSVG, hzRange } from './system.js';
import { typeLabel, tempLabel, fmt } from './model.js';
import { fmtDuration } from './facts.js';
import { attachPicker } from './picker.js';
import { OrbitView } from './orbit.js';

const { all } = await boot();
const sys = new Map();
for (const p of all) { if (!sys.has(p.host)) sys.set(p.host, []); sys.get(p.host).push(p); }
const hosts = [...sys.entries()].map(([host, list]) => ({ host, n: list.length })).sort((a, b) => b.n - a.n || a.host.localeCompare(b.host, 'en', { numeric: true }));

let orbit = null;
function show(host, push = true) {
  const list = sys.get(host);
  if (!list) return;
  const ref = list.find((p) => p.srad && p.teff) || list[0];
  const hz = hzRange(ref);
  const star = [ref.star ? `${ref.star.name[0].toUpperCase() + ref.star.name.slice(1)} star` : null, ref.teff ? `${nf(ref.teff)} K` : null, ref.dist_ly ? `${fmt(ref.dist_ly, 1)} light-years away` : null].filter(Boolean).join(', ');
  const rows = [...list].sort((a, b) => (a.sma ?? 1e9) - (b.sma ?? 1e9)).map((p) =>
    `<tr><th scope="row"><a href="${planetHref(p)}">${esc(p.name)}</a></th><td>${esc(typeLabel(p.type))}</td><td>${p.sma != null ? fmt(p.sma, 3) + ' AU' : 'Not identified'}</td><td>${p.per != null ? fmtDuration(p.per) : 'Not identified'}</td><td>${p.r != null ? fmt(p.r, 2) + '× Earth' : 'Not identified'}</td><td>${p.teq != null ? fmt(p.teq, 0) + ' K' : 'Not identified'}</td></tr>`).join('');
  $('#sysOut').innerHTML = `<section class="sys-card"><h2 class="h2">${esc(host)}</h2>
    <p class="muted">${list.length} known planet${list.length > 1 ? 's' : ''}${star ? '. ' + esc(star) : ''}.${hz ? ` Habitable-zone starlight falls between ${fmt(hz.inner, 2)} and ${fmt(hz.outer, 2)} AU from this star (estimated from its size and temperature).` : ''}</p>
    <div class="chartbox">${systemSVG(list, { link: planetHref, id: 'sp' })}</div>
    <p class="small muted">Distances are on a log scale, so each step to the right is ten times farther. Circle sizes show how big each planet is next to the others, but are not on the same scale as the distances. Click a planet to open it.</p>
    <h3 class="h3">Orbits, seen from above</h3><canvas id="sysOrbit" class="orbitcv" role="img"></canvas>
    <p class="small muted">Drawn from each planet's real orbit size and shape. Distances use a square-root scale and speeds are compressed. The tilt of each orbit is not known, so all point the same way. Green is the habitable-zone band.</p>
    <div class="tablewrap"><table class="pl-table sys-table"><thead><tr><th>Planet</th><th>Type</th><th>Distance from star</th><th>Year</th><th>Size</th><th>Temperature</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  if (orbit) orbit.stop();
  orbit = new OrbitView($('#sysOrbit'), { reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
  orbit.set(list); orbit.start();
  if (push) history.replaceState(null, '', '#' + encodeURIComponent(host));
  document.title = `${host}: planets of the system · Exoplanet Atlas`;
}

attachPicker($('#sysQ'), $('#sysPick'), hosts, { label: (h) => `${h.host} (${h.n} planet${h.n > 1 ? 's' : ''})`, keyOf: (h) => h.host, onPick: (h) => show(h.host) });
$('#sysTop').innerHTML = hosts.filter((h) => h.n > 1).slice(0, 12).map((h) => `<a class="more-tile" href="systems.html#${encodeURIComponent(h.host)}"><b>${esc(h.host)}</b><span>${h.n} known planets</span></a>`).join('');
$('#sysTop').addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); show(decodeURIComponent(a.hash.slice(1))); scrollTo({ top: $('#sysOut').offsetTop - 90, behavior: 'smooth' }); });
const fromHash = () => decodeURIComponent(location.hash.slice(1));
addEventListener('hashchange', () => show(fromHash(), false));
show(sys.has(fromHash()) ? fromHash() : 'TRAPPIST-1', false);
