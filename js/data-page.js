// Data page: CSV / JSON download, citation text, and the embed-code builder.
import { boot, $, esc, nf } from './boot.js';
import { attachPicker } from './picker.js';
import { typeLabel } from './model.js';

const { all, meta } = await boot();
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const COLS = [
  ['name', 'planet', (p) => p.name], ['host', 'host_star', (p) => p.host], ['year', 'discovery_year', (p) => p.year], ['method', 'discovery_method', (p) => p.method],
  ['facility', 'discovery_facility', (p) => p.facility], ['type', 'type_in_this_atlas', (p) => typeLabel(p.type)], ['dist_ly', 'distance_light_years', (p) => p.dist_ly],
  ['rade', 'radius_earth', (p) => p.rade], ['r_est', 'radius_estimated_from_mass', (p) => (p.r_est ? 'yes' : '')], ['masse', 'mass_earth', (p) => p.masse],
  ['per', 'orbital_period_days', (p) => p.per], ['sma', 'semi_major_axis_au', (p) => p.sma], ['ecc', 'eccentricity', (p) => p.ecc],
  ['eqt', 'equilibrium_temperature_k', (p) => p.eqt], ['insol', 'starlight_earth', (p) => p.insol], ['teff', 'star_temperature_k', (p) => p.teff],
  ['srad', 'star_radius_sun', (p) => p.srad], ['smass', 'star_mass_sun', (p) => p.smass], ['ra', 'ra_deg', (p) => p.ra], ['dec', 'dec_deg', (p) => p.dec],
  ['controv', 'status_debated', (p) => (p.controv ? 'yes' : '')],
];
const extra = [['radeu', 'radius_err_upper'], ['radel', 'radius_err_lower'], ['masseu', 'mass_err_upper'], ['massel', 'mass_err_lower'], ['peru', 'period_err_upper'], ['perl', 'period_err_lower'], ['eqtu', 'temperature_err_upper'], ['eqtl', 'temperature_err_lower'], ['vmag', 'star_v_magnitude']]
  .filter(([k]) => all.some((p) => p[k] != null)).map(([k, h]) => [k, h, (p) => p[k]]);
const cols = [...COLS, ...extra];
const q = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function save(name, type, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = meta.generated;
$('#dlCsv').addEventListener('click', () => save(`exoplanet-atlas-${stamp}.csv`, 'text/csv', [cols.map((c) => c[1]).join(','), ...all.map((p) => cols.map((c) => q(c[2](p))).join(','))].join('\n')));
$('#dlJson').addEventListener('click', () => save(`exoplanet-atlas-${stamp}.json`, 'application/json', JSON.stringify(all.map((p) => Object.fromEntries(cols.map((c) => [c[1], c[2](p) ?? null]))), null, 1)));
$('#dlInfo').textContent = `${nf(all.length)} planets, ${cols.length} columns, data refreshed ${stamp}.${extra.length ? '' : ' Uncertainties appear here once the weekly refresh has included them.'}`;

const cite = `NASA Exoplanet Archive, Planetary Systems Composite Parameters table, California Institute of Technology and NASA Exoplanet Science Institute. Data as shown on Exoplanet Atlas (${SITE}), refreshed ${stamp}. Accessed ${new Date().toISOString().slice(0, 10)}.\n\nAcknowledgement: This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.`;
const bib = `@misc{exoplanetatlas,\n  title        = {Exoplanet Atlas: confirmed planets from the NASA Exoplanet Archive, Planetary Systems Composite Parameters table},\n  howpublished = {\\url{${SITE}}},\n  note         = {Data refreshed ${stamp}. Accessed ${new Date().toISOString().slice(0, 10)}}\n}`;
$('#citeText').textContent = cite;
const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); $('#citeMsg').textContent = msg; } catch { $('#citeMsg').textContent = 'Select the text and copy it.'; } };
$('#citeCopy').addEventListener('click', () => copy(cite, 'Citation copied.'));
$('#bibCopy').addEventListener('click', () => copy(bib, 'BibTeX copied.'));

let sel = all.find((p) => p.name === 'Proxima Cen b') || all[0];
function embed() {
  const url = `${SITE}embed.html?planet=${encodeURIComponent(sel.name)}`;
  const code = `<iframe src="${url}" width="360" height="230" style="border:0;border-radius:16px" loading="lazy" title="${esc(sel.name)}, from Exoplanet Atlas"></iframe>`;
  $('#embCode').textContent = code;
  $('#embPreview').innerHTML = code.replace(SITE, '');
}
attachPicker($('#embQ'), $('#embPick'), all, { label: (p) => p.name, onPick: (p) => { sel = p; embed(); } });
$('#embCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#embCode').textContent); $('#embCopy').textContent = 'Copied'; setTimeout(() => ($('#embCopy').textContent = 'Copy embed code'), 1800); } catch { /* user can select the text */ } });
embed();
