// Downloads the confirmed-planet table from the NASA Exoplanet Archive into data/raw/planets.csv.
// If NASA is down or returns anything unexpected, this script exits with an error and leaves
// the existing data untouched, so the website keeps working with the last good copy.
// Usage: node scripts/fetch-nasa.mjs
import { writeFileSync } from 'node:fs';

const COLUMNS = 'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,disc_facility,disc_locale,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,pl_insol,pl_eqt,st_spectype,st_teff,st_rad,st_mass,sy_dist,ra,dec,pl_controv_flag';
const url = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?' + new URLSearchParams({
  query: `select ${COLUMNS} from pscomppars`,
  format: 'csv',
});
const out = new URL('../data/raw/planets.csv', import.meta.url).pathname;

async function attempt(n) {
  const res = await fetch(url, { headers: { 'User-Agent': 'exoplanet-atlas-refresh (github actions)' } });
  if (!res.ok) throw new Error(`NASA answered HTTP ${res.status}`);
  const text = await res.text();
  if (!text.startsWith('pl_name,')) throw new Error('NASA did not return a CSV: ' + text.slice(0, 200).replace(/\s+/g, ' '));
  const lines = text.trim().split('\n').length - 1;
  if (lines < 5000) throw new Error(`Only ${lines} rows came back, expected 5,000+`);
  return { text, lines };
}

let lastErr;
for (let i = 1; i <= 4; i++) {
  try {
    const { text, lines } = await attempt(i);
    writeFileSync(out, text);
    console.log(`Saved ${lines} planets to data/raw/planets.csv`);
    process.exit(0);
  } catch (err) {
    lastErr = err;
    console.error(`Attempt ${i} failed: ${err.message}`);
    await new Promise((r) => setTimeout(r, 15000 * i));
  }
}
console.error('Giving up. The existing data was not changed.');
console.error(lastErr?.message);
process.exit(1);
