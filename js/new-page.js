// What's new: the weekly change log written by scripts/build-data.mjs, plus the newest discoveries by year.
import { boot, $, esc, planetHref, nf } from './boot.js';
import { typeLabel } from './model.js';

const { all, meta } = await boot();
const byName = new Map(all.map((p) => [p.name, p]));
let log = [];
try { const r = await fetch('data/changes.json'); if (r.ok) log = (await r.json()).log || []; } catch { /* page still works without it */ }

const years = all.map((p) => p.year).filter((y) => y != null);
const latest = Math.max(...years);
$('#nwLede').textContent = `The catalogue holds ${nf(all.length)} confirmed planets and was last refreshed on ${meta.generated}. Below: what changed in each weekly refresh, and the newest discoveries by year.`;

const link = (n) => (byName.has(n) ? `<a href="${planetHref(byName.get(n))}">${esc(n)}</a>` : esc(n));
const entries = log.filter((e) => (e.added && e.added.length) || (e.removed && e.removed.length) || (e.changed && e.changed.length));
let html = '<h2 class="h2">Changes by refresh</h2>';
html += entries.length ? entries.map((e) => `<section class="nw-entry"><h3>${esc(e.date)} <span class="muted small">catalogue size ${nf(e.count)}</span></h3>
  ${e.added?.length ? `<p><b>${e.added.length} added:</b> ${e.added.slice(0, 40).map(link).join(', ')}${e.added.length > 40 ? ` and ${e.added.length - 40} more` : ''}</p>` : ''}
  ${e.removed?.length ? `<p><b>${e.removed.length} removed or renamed:</b> ${e.removed.slice(0, 40).map(esc).join(', ')}${e.removed.length > 40 ? ` and ${e.removed.length - 40} more` : ''}</p>` : ''}
  ${e.changed?.length ? `<p><b>${e.changed.length} with updated numbers:</b> ${e.changed.slice(0, 25).map(link).join(', ')}${e.changed.length > 25 ? ` and ${e.changed.length - 25} more` : ''}</p>` : ''}</section>`).join('')
  : '<p class="muted">No refresh with changes has been recorded yet. This list fills in as the weekly refresh finds new planets.</p>';

const recent = [latest, latest - 1].map((y) => [y, all.filter((p) => p.year === y).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))]);
for (const [y, list] of recent) {
  html += `<h2 class="h2">Announced in ${y} <span class="count">${nf(list.length)} planets</span></h2><p class="az-list">${list.slice(0, 120).map((p) => `<a href="${planetHref(p)}" title="${esc(typeLabel(p.type))}">${esc(p.name)}</a>`).join(' ')}${list.length > 120 ? `<span class="muted"> and ${list.length - 120} more. Choose “Newest discovery” in the catalogue to see them all.</span>` : ''}</p>`;
}
$('#nwOut').innerHTML = html;
