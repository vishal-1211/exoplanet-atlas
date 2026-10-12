// Printable classroom kit. Every number is computed from the catalogue, so the worksheet and the answer key always agree.
import { boot, $, esc } from './boot.js';
import { fmt, transitDepth, tempLabel } from './model.js';
import { fmtDuration } from './facts.js';
import { transitCurve } from './charts.js';

const { all } = await boot();
const get = (n) => all.find((p) => p.name === n);
const pick = (names, ok = () => true) => names.map(get).filter((p) => p && ok(p));

const SCALE = pick(['TRAPPIST-1 e', 'Kepler-22 b', 'K2-18 b', 'HD 189733 b', 'WASP-12 b'], (p) => p.rade != null);
const YEARS = pick(['55 Cnc e', '51 Peg b', 'TRAPPIST-1 e', 'Proxima Cen b', 'Kepler-452 b', 'HR 8799 e'], (p) => p.per != null);
const GRAV = pick(['TRAPPIST-1 e', 'LHS 1140 b', 'K2-18 b', 'Kepler-10 b', 'HD 189733 b', 'GJ 1214 b', 'CoRoT-7 b', '55 Cnc e'], (p) => p.gravity != null).slice(0, 5);
const TEMP = pick(['Kepler-16 b', 'Proxima Cen b', 'TRAPPIST-1 e', 'WASP-12 b', 'HD 189733 b', 'TOI-700 d'], (p) => p.teq != null);
const TRANSIT = get('HD 209458 b');

const blank = '<span class="blank"></span>';
const answers = [];
let html = '';

// 1 scale
html += `<section class="act"><h2 class="h2">1. Build a scale model</h2>
  <p>Pretend Earth is a bead 1 cm wide. How wide would each of these planets be on the same scale? Cut a circle of that width from paper.</p>
  <table class="pl-table"><thead><tr><th>Planet</th><th>Width compared with Earth</th><th>Width on our scale</th></tr></thead><tbody>
  ${SCALE.map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${fmt(p.rade, 2)}× Earth</td><td>${blank} cm</td></tr>`).join('')}</tbody></table>
  <p class="small">Which one is too big for a sheet of A4 paper (21 cm wide)? ${blank}</p></section>`;
answers.push(['1', SCALE.map((p) => `${p.name}: ${fmt(p.rade, 1)} cm`).join('; ') + `. ${SCALE.filter((p) => p.rade > 21).map((p) => p.name).join(', ') || 'None of these is wider than A4'}.`]);

// 2 years
html += `<section class="act"><h2 class="h2">2. How long is a year?</h2>
  <p>A year is how long a planet takes to go once around its star. Earth’s year is 365 days. Fill in how many of each planet’s years would fit into one Earth year (divide 365 by the planet’s year in days).</p>
  <table class="pl-table"><thead><tr><th>Planet</th><th>One year lasts</th><th>Years per Earth year</th></tr></thead><tbody>
  ${YEARS.map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${esc(fmtDuration(p.per))} (${fmt(p.per, 2)} days)</td><td>${blank}</td></tr>`).join('')}</tbody></table>
  <p class="small">Which planet would give you the most birthdays? ${blank}</p></section>`;
const yp = YEARS.map((p) => [p, 365.25 / p.per]).sort((a, b) => b[1] - a[1]);
answers.push(['2', yp.map(([p, n]) => `${p.name}: ${n >= 10 ? fmt(n, 0) : n >= 1 ? fmt(n, 1) : fmt(n, 3)}`).join('; ') + `. Most birthdays: ${yp[0][0].name}.`]);

// 3 weight
html += `<section class="act"><h2 class="h2">3. Your weight on other worlds</h2>
  <p>Gravity changes your weight. Write your weight on Earth, then multiply by the gravity number for each planet. (Only planets whose size and mass are both measured are listed. For gas giants this is the pull at the cloud tops.)</p>
  <p>My weight on Earth: ${blank} kg</p>
  <table class="pl-table"><thead><tr><th>Planet</th><th>Gravity (Earth = 1)</th><th>My weight there</th></tr></thead><tbody>
  ${GRAV.map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${fmt(p.gravity, 2)}</td><td>${blank} kg</td></tr>`).join('')}</tbody></table></section>`;
answers.push(['3', 'Weight = Earth weight × gravity. For a 40 kg child: ' + GRAV.map((p) => `${p.name} ${fmt(40 * p.gravity, 0)} kg`).join('; ') + '.']);

// 4 transit
if (TRANSIT) {
  const dep = transitDepth(TRANSIT);
  html += `<section class="act"><h2 class="h2">4. Read a transit graph</h2>
    <p>This graph shows the brightness of the star ${esc(TRANSIT.host)} over a few hours. The dip happens when the planet ${esc(TRANSIT.name)} passes in front of it.</p>
    <div class="chartbox">${transitCurve(dep, TRANSIT.name)}</div>
    <ol><li>Circle the part of the graph where the planet is in front of the star.</li>
    <li>The star dims by about ${fmt(dep * 100, 1)}%. If the star gave out 1,000 units of light, how many would reach us during the dip? ${blank}</li>
    <li>A bigger planet would make the dip ${blank} (deeper / shallower).</li></ol></section>`;
  answers.push(['4', `The dip itself. About ${fmt(1000 * (1 - dep), 0)} units (1,000 − ${fmt(1000 * dep, 0)}). Deeper. (The graph’s vertical scale is zoomed so the dip is visible.)`]);
}

// 5 temperatures
const order = ['cold', 'temperate', 'warm', 'hot', 'ultrahot'];
html += `<section class="act"><h2 class="h2">5. Hot or cold?</h2>
  <p>Planets are sorted by their equilibrium temperature (what they would be if they only absorbed and gave back starlight). Cold is below 230 K, temperate 230 to 330 K, warm 330 to 700 K, hot 700 to 1,500 K and ultra-hot above that. Write each planet’s group.</p>
  <table class="pl-table"><thead><tr><th>Planet</th><th>Temperature</th><th>Group</th></tr></thead><tbody>
  ${TEMP.map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${fmt(p.teq, 0)} K (${fmt(p.teq - 273.15, 0)} °C)</td><td>${blank}</td></tr>`).join('')}</tbody></table>
  <p class="small">Water freezes at 273 K and boils at 373 K (at Earth’s air pressure). Which planets here are in that range? ${blank}</p></section>`;
const inRange = TEMP.filter((p) => p.teq >= 273 && p.teq <= 373).map((p) => p.name);
answers.push(['5', TEMP.map((p) => `${p.name}: ${tempLabel(p.tempClass)}`).join('; ') + `. In the water range: ${inRange.join(', ') || 'none'}. (A planet in this range could still have no water or no air.)`]);

html += `<section class="act key"><h2 class="h2">Answer key</h2><ol class="key-list">${answers.map(([n, a]) => `<li value="${n}">${esc(a)}</li>`).join('')}</ol>
  <p class="small muted">Teacher notes: the pictures on the main site are artist’s impressions, not photographs. Numbers come from the NASA Exoplanet Archive (refreshed weekly) and may be updated. Printed from Exoplanet Atlas.</p></section>`;
$('#clsOut').innerHTML = html;
$('#printBtn').addEventListener('click', () => print());
