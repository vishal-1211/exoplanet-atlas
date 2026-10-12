// Downloads the optional NASA tables: TESS and Kepler candidates, every published value per planet, and the
// list of spectra. Every one of these is optional: if a download fails, that file is skipped and the site keeps
// the copy it already has. Run after fetch-nasa.mjs.  Usage: node scripts/fetch-extra.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const T = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?';
const get = async (query, min, first) => {
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(T + new URLSearchParams({ query, format: 'csv' }), { headers: { 'User-Agent': 'exoplanet-atlas-refresh (github actions)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const rows = text.trim().split('\n').length - 1;
      if (!text.startsWith(first) || rows < min) throw new Error(`unexpected answer (${rows} rows): ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
      return { text, rows };
    } catch (e) { console.error(`  attempt ${i}: ${e.message}`); await new Promise((r) => setTimeout(r, 4000 * i)); }
  }
  return null;
};
mkdirSync(new URL('../data/raw/', import.meta.url).pathname, { recursive: true });
const jobs = [
  ['toi.csv', 'TESS Objects of Interest', 'select * from toi', 1000, 'toi'],
  ['koi.csv', 'Kepler candidates', 'select * from cumulative', 1000, 'kepid'],
  ['ps.csv', 'every published parameter set', 'select pl_name,pl_rade,pl_bmasse,pl_orbper,pl_refname,pl_pubdate,default_flag from ps', 5000, 'pl_name'],
  ['spectra.csv', 'spectra list', 'select * from spectra', 20, ''],
];
let ok = 0;
for (const [file, label, q, min, first] of jobs) {
  console.log(`Fetching ${label}…`);
  const r = await get(q, min, first);
  if (r) { writeFileSync(new URL('../data/raw/' + file, import.meta.url).pathname, r.text); console.log(`  saved ${r.rows} rows to data/raw/${file}`); ok++; }
  else console.error(`  skipped ${label}: keeping the previous copy`);
}
console.log(`${ok} of ${jobs.length} optional tables updated`);
