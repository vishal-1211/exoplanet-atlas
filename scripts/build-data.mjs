// Converts data/raw/planets.csv (downloaded from the NASA Exoplanet Archive)
// into the compact data/planets.json that the website reads.
// Usage: node scripts/build-data.mjs [path/to/planets.csv]
import { readFileSync, writeFileSync } from 'node:fs';
import { COLS } from '../js/model.js';

const input = process.argv[2] || new URL('../data/raw/planets.csv', import.meta.url).pathname;
const output = new URL('../data/planets.json', import.meta.url).pathname;

// Minimal CSV parser that understands quoted fields.
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const sig = (x, n = 5) => (x === 0 ? 0 : Number(x.toPrecision(n)));
const text = readFileSync(input, 'utf8').replace(/^﻿/, '');
const table = parseCSV(text);
const header = table.shift();

const want = {
  name: 'pl_name', host: 'hostname', snum: 'sy_snum', pnum: 'sy_pnum', method: 'discoverymethod',
  year: 'disc_year', facility: 'disc_facility', locale: 'disc_locale', per: 'pl_orbper', sma: 'pl_orbsmax',
  ecc: 'pl_orbeccen', rade: 'pl_rade', masse: 'pl_bmasse', insol: 'pl_insol', eqt: 'pl_eqt',
  spec: 'st_spectype', teff: 'st_teff', srad: 'st_rad', smass: 'st_mass', dist: 'sy_dist',
  ra: 'ra', dec: 'dec', controv: 'pl_controv_flag',
};
const idx = {};
for (const [k, col] of Object.entries(want)) {
  idx[k] = header.indexOf(col);
  if (idx[k] < 0) { console.error(`ERROR: column ${col} is missing from the CSV`); process.exit(1); }
}
const textCols = new Set(['name', 'host', 'method', 'facility', 'locale', 'spec']);
const intCols = new Set(['snum', 'pnum', 'year', 'controv']);
const methods = [], facilities = [];
const intern = (list, v) => { if (!v) return null; let i = list.indexOf(v); if (i < 0) { i = list.length; list.push(v); } return i; };

const rows = [];
for (const r of table) {
  if (r.length < header.length - 1) continue;
  const name = (r[idx.name] || '').trim();
  if (!name) continue;
  const out = COLS.map((c) => {
    const raw = (r[idx[c]] ?? '').trim();
    if (c === 'method') return intern(methods, raw);
    if (c === 'facility') return intern(facilities, raw);
    if (c === 'locale') return raw ? raw[0].toUpperCase() + raw.slice(1).toLowerCase() : null;
    if (textCols.has(c)) return raw || null;
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (intCols.has(c)) return Math.round(n);
    return sig(n, c === 'ra' || c === 'dec' ? 7 : 6);
  });
  rows.push(out);
}
rows.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));

// Safety checks so a broken download never replaces good data.
if (rows.length < 5000) { console.error(`ERROR: only ${rows.length} planets found, expected 5,000+. Not writing.`); process.exit(1); }
const missingYear = rows.filter((r) => r[COLS.indexOf('year')] == null).length;
if (missingYear > rows.length * 0.01) { console.error('ERROR: too many planets without a discovery year. Not writing.'); process.exit(1); }

const data = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'NASA Exoplanet Archive, Planetary Systems Composite Parameters table (pscomppars)',
  count: rows.length,
  cols: COLS, methods, facilities, rows,
};
writeFileSync(output, JSON.stringify(data));
console.log(`Wrote ${rows.length} planets to data/planets.json (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
