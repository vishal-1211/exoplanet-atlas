// Downloads the confirmed-planet table from the NASA Exoplanet Archive into data/raw/planets.csv.
// If NASA is down or returns anything unexpected, this script exits with an error and leaves
// the existing data untouched, so the website keeps working with the last good copy.
// Usage: node scripts/fetch-nasa.mjs
import { writeFileSync } from 'node:fs';

const BASE = 'pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,disc_facility,disc_locale,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,pl_insol,pl_eqt,st_spectype,st_teff,st_rad,st_mass,sy_dist,ra,dec,pl_controv_flag';
// Optional column groups. If NASA rejects a group (for example a renamed column), we drop to the next tier,
// so the refresh always works and we keep as much as NASA will give us.
const UNC = 'pl_radeerr1,pl_radeerr2,pl_bmasseerr1,pl_bmasseerr2,pl_orbpererr1,pl_orbpererr2,pl_eqterr1,pl_eqterr2,sy_vmag,pl_refname';
const ALIAS = 'hd_name,hip_name,tic_id,gaia_dr3_id';
const PROV = 'pl_bmassprov';
const TIERS = [
  ['everything (uncertainties, sources, alternative names, mass provenance)', [UNC, ALIAS, PROV]],
  ['uncertainties, sources and alternative names', [UNC, ALIAS]],
  ['uncertainties, sources and mass provenance', [UNC, PROV]],
  ['uncertainties and sources', [UNC]],
  ['basic columns only', []],
];
const urlFor = (cols) => 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?' + new URLSearchParams({ query: `select ${cols} from pscomppars`, format: 'csv' });
const out = new URL('../data/raw/planets.csv', import.meta.url).pathname;

async function attempt(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'exoplanet-atlas-refresh (github actions)' } });
  if (!res.ok) throw new Error(`NASA answered HTTP ${res.status}`);
  const text = await res.text();
  if (!text.startsWith('pl_name,')) throw new Error('NASA did not return a CSV: ' + text.slice(0, 200).replace(/\s+/g, ' '));
  const lines = text.trim().split('\n').length - 1;
  if (lines < 5000) throw new Error(`Only ${lines} rows came back, expected 5,000+`);
  return { text, lines };
}

let lastErr;
for (const [label, groups] of TIERS) {
  const cols = [BASE, ...groups].join(',');
  for (let i = 1; i <= (groups.length ? 2 : 4); i++) {
    try {
      const { text, lines } = await attempt(urlFor(cols));
      writeFileSync(out, text);
      console.log(`Saved ${lines} planets to data/raw/planets.csv (${label})`);
      process.exit(0);
    } catch (err) {
      lastErr = err;
      console.error(`Attempt ${i} (${label}) failed: ${err.message}`);
      // a 4xx/5xx with a column complaint will not fix itself: move to the next tier quickly
      await new Promise((r) => setTimeout(r, /HTTP 4|HTTP 5|did not return/.test(err.message) && groups.length ? 1500 : 8000 * i));
    }
  }
}
console.error('Giving up. The existing data was not changed.');
console.error(lastErr?.message);
process.exit(1);
