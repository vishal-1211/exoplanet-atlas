// Data page: CSV / JSON download, citation text, and the embed-code builder.
import { boot, $, esc, nf } from './boot.js';
import { attachPicker } from './picker.js';
import { columns, toCSV, toObjects } from './export.js';

const { all, meta } = await boot();
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const cols = columns(all);
function save(name, type, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = meta.generated;
$('#dlCsv').addEventListener('click', () => save(`exoplanet-atlas-${stamp}.csv`, 'text/csv', toCSV(all, cols)));
$('#dlJson').addEventListener('click', () => save(`exoplanet-atlas-${stamp}.json`, 'application/json', JSON.stringify(toObjects(all, cols), null, 1)));
$('#dlInfo').textContent = `${nf(all.length)} planets, ${cols.length} columns, data refreshed ${stamp}.${cols.some((c) => c[0] === 'radius_err_upper') ? '' : ' Uncertainties appear here once the automatic refresh has included them.'}`;

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
