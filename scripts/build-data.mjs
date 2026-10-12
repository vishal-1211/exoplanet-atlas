// Converts data/raw/planets.csv (downloaded from the NASA Exoplanet Archive)
// into the compact data/planets.json that the website reads.
// Usage: node scripts/build-data.mjs [path/to/planets.csv]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { COLS, EXTRA_COLS } from '../js/model.js';
import { SITE } from '../js/site.js';

const input = process.argv[2] || new URL('../data/raw/planets.csv', import.meta.url).pathname;
const output = new URL('../data/planets.json', import.meta.url).pathname;
const changesPath = new URL('../data/changes.json', import.meta.url).pathname;
const feedPath = new URL('../feed.xml', import.meta.url).pathname;

import { parseCSV } from './csv.mjs';

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
// Optional columns: used when the download has them and at least one value is filled in.
const wantExtra = { radeu: 'pl_radeerr1', radel: 'pl_radeerr2', masseu: 'pl_bmasseerr1', massel: 'pl_bmasseerr2', peru: 'pl_orbpererr1', perl: 'pl_orbpererr2',
  eqtu: 'pl_eqterr1', eqtl: 'pl_eqterr2', vmag: 'sy_vmag', refurl: 'pl_refname', reftxt: 'pl_refname',
  hd: 'hd_name', hip: 'hip_name', tic: 'tic_id', gaia: 'gaia_dr3_id', massprov: 'pl_bmassprov' };
const TEXT_EXTRA = new Set(['hd', 'hip', 'tic', 'gaia', 'massprov']);
const extraIdx = {};
for (const k of EXTRA_COLS) { const i = header.indexOf(wantExtra[k]); if (i >= 0) extraIdx[k] = i; }
// pl_refname looks like: <a refstr=... href=https://... target=ref>Author et al. 2020</a>
const parseRef = (raw) => {
  const href = (raw.match(/href=["']?([^\s"'>]+)/) || [])[1] || null;
  const txt = (raw.match(/>([^<]+)<\/a>/) || [])[1] || null;
  return { href, txt: txt ? txt.trim() : null };
};
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
  for (const k of Object.keys(extraIdx)) {
    const raw = (r[extraIdx[k]] ?? '').trim();
    if (k === 'refurl') out.push(raw ? parseRef(raw).href : null);
    else if (k === 'reftxt') out.push(raw ? parseRef(raw).txt : null);
    else if (TEXT_EXTRA.has(k)) out.push(raw || null);
    else { const n = raw === '' ? NaN : Number(raw); out.push(Number.isFinite(n) ? sig(n, 4) : null); }
  }
  rows.push(out);
}
// keep only the optional columns that actually carry data
const extraKeys = Object.keys(extraIdx);
const keep = extraKeys.filter((k, j) => rows.some((r) => r[COLS.length + j] != null));
if (keep.length !== extraKeys.length) {
  const drop = extraKeys.map((k, j) => (keep.includes(k) ? -1 : COLS.length + j)).filter((j) => j >= 0).sort((a, b) => b - a);
  for (const r of rows) for (const j of drop) r.splice(j, 1);
}
rows.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));

// Safety checks so a broken download never replaces good data.
if (rows.length < 5000) { console.error(`ERROR: only ${rows.length} planets found, expected 5,000+. Not writing.`); process.exit(1); }
const missingYear = rows.filter((r) => r[COLS.indexOf('year')] == null).length;
if (missingYear > rows.length * 0.01) { console.error('ERROR: too many planets without a discovery year. Not writing.'); process.exit(1); }

const data = {
  generated: process.env.DATA_DATE || new Date().toISOString().slice(0, 10),
  source: 'NASA Exoplanet Archive, Planetary Systems Composite Parameters table (pscomppars)',
  count: rows.length,
  cols: [...COLS, ...keep], methods, facilities, rows,
};
// ---- what changed since the last build (feeds the "What's new" page and feed.xml)
let prev = null;
if (existsSync(output)) { try { prev = JSON.parse(readFileSync(output, 'utf8')); } catch { prev = null; } }
let changes = { log: [] };
if (existsSync(changesPath)) { try { changes = JSON.parse(readFileSync(changesPath, 'utf8')); } catch { /* start fresh */ } }
if (prev && prev.generated !== data.generated || (prev && prev.count !== data.count)) {
  const before = new Map(prev.rows.map((r) => [r[0], r]));
  const after = new Map(rows.map((r) => [r[0], r]));
  const added = [...after.keys()].filter((n) => !before.has(n));
  const removed = [...before.keys()].filter((n) => !after.has(n));
  const pc = prev.cols || COLS, key = ['rade', 'masse', 'per', 'eqt'];
  const changed = [];
  for (const [n, r] of after) {
    const o = before.get(n); if (!o) continue;
    if (key.some((k) => { const a = o[pc.indexOf(k)], b = r[COLS.indexOf(k)]; return a != null && b != null && Math.abs(a - b) > 0.02 * Math.abs(a); })) changed.push(n);
  }
  if (added.length || removed.length || changed.length) {
    changes.log = changes.log.filter((e) => e.date !== data.generated);
    changes.log.unshift({ date: data.generated, count: rows.length, added, removed, changed: changed.slice(0, 200) });
    changes.log = changes.log.slice(0, 60);
  }
}
changes.updated = data.generated;
// Nothing changed since the last build? Then leave every file alone, so the date only moves when the data does.
if (prev && JSON.stringify(prev.rows) === JSON.stringify(rows) && JSON.stringify(prev.cols) === JSON.stringify(data.cols)) {
  console.log('No change in the planet data. Files left as they are.');
  process.exit(0);
}
writeFileSync(changesPath, JSON.stringify(changes));
const x = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entries = changes.log.slice(0, 20).map((e) => {
  const bits = [];
  if (e.added.length) bits.push(`${e.added.length} new: ${e.added.slice(0, 12).join(', ')}${e.added.length > 12 ? ' and more' : ''}`);
  if (e.removed.length) bits.push(`${e.removed.length} removed or renamed`);
  if (e.changed.length) bits.push(`${e.changed.length} with updated numbers`);
  return `<entry><title>${x(e.date)}: ${x(bits.join('; '))}</title><id>${SITE}new.html#${e.date}</id><link href="${SITE}new.html"/><updated>${e.date}T00:00:00Z</updated><summary>${x(bits.join('. '))}. The catalogue now holds ${e.count} planets.</summary></entry>`;
}).join('\n');
writeFileSync(feedPath, `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Exoplanet Atlas: new planets</title><id>${SITE}</id><link href="${SITE}feed.xml" rel="self"/><link href="${SITE}new.html"/><updated>${data.generated}T00:00:00Z</updated><author><name>Exoplanet Atlas</name></author>\n${entries || `<entry><title>Catalogue refreshed ${data.generated}: ${rows.length} planets</title><id>${SITE}new.html#${data.generated}</id><link href="${SITE}new.html"/><updated>${data.generated}T00:00:00Z</updated><summary>The catalogue holds ${rows.length} confirmed planets.</summary></entry>`}\n</feed>\n`);
writeFileSync(output, JSON.stringify(data));
console.log(`Wrote ${rows.length} planets to data/planets.json (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
