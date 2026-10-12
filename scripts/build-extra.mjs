// Turns the optional NASA tables (see fetch-extra.mjs) into small JSON files for the website:
//   data/candidates.json   unconfirmed TESS and Kepler candidates
//   data/alt-values.json   every published value of radius, mass and period, per planet
//   data/spectra.json      which planets have spectra listed by NASA
// A missing or unreadable input is skipped, and the existing output file is kept.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseCSV } from './csv.mjs';

const raw = (f) => new URL('../data/raw/' + f, import.meta.url).pathname;
const out = (f) => new URL('../data/' + f, import.meta.url).pathname;
const today = process.env.DATA_DATE || new Date().toISOString().slice(0, 10);
const sig = (x, n = 4) => (x == null ? null : Number(Number(x).toPrecision(n)));
const num = (v) => { if (v == null || String(v).trim() === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function table(file) {
  if (!existsSync(raw(file))) return null;
  const t = parseCSV(readFileSync(raw(file), 'utf8').replace(/^﻿/, ''));
  const head = t.shift().map((h) => h.trim());
  const col = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
  return { head, rows: t.filter((r) => r.length > 2), col };
}
const write = (f, obj, what) => { writeFileSync(out(f), JSON.stringify(obj)); console.log(`${f}: ${what}`); };

// ---- candidates
(() => {
  const toi = table('toi.csv'), koi = table('koi.csv');
  if (!toi && !koi) { console.log('candidates: no input, keeping the existing file'); return; }
  const rows = []; let falsePositives = 0, confirmed = 0;
  if (toi) {
    const c = { id: toi.col('toi'), disp: toi.col('tfopwg_disp'), ra: toi.col('ra'), dec: toi.col('dec'), per: toi.col('pl_orbper'), rade: toi.col('pl_rade'), eqt: toi.col('pl_eqt'),
      insol: toi.col('pl_insol'), teff: toi.col('st_teff'), mag: toi.col('st_tmag'), dist: toi.col('st_dist'), depth: toi.col('pl_trandep') };
    if (c.id < 0 || c.disp < 0) console.error('candidates: TOI table has no toi/tfopwg_disp column, skipped');
    else for (const r of toi.rows) {
      const d = (r[c.disp] || '').trim().toUpperCase();
      if (d === 'FP' || d === 'FA') { falsePositives++; continue; }
      if (d === 'CP' || d === 'KP') { confirmed++; continue; }
      const id = (r[c.id] || '').trim(); if (!id) continue;
      rows.push([`TOI-${id}`, 'TESS', d || 'PC', sig(num(r[c.ra]), 7), sig(num(r[c.dec]), 7), sig(num(r[c.per]), 6), sig(num(r[c.rade])), sig(num(r[c.eqt])), sig(num(r[c.insol])),
        sig(num(r[c.teff])), sig(num(r[c.mag]), 3), sig(num(r[c.dist]), 4), sig(num(r[c.depth]), 4)]);
    }
  }
  if (koi) {
    const c = { id: koi.col('kepoi_name'), kname: koi.col('kepler_name'), disp: koi.col('koi_disposition'), ra: koi.col('ra'), dec: koi.col('dec'), per: koi.col('koi_period'),
      rade: koi.col('koi_prad'), eqt: koi.col('koi_teq'), insol: koi.col('koi_insol'), teff: koi.col('koi_steff'), mag: koi.col('koi_kepmag') };
    if (c.id < 0 || c.disp < 0) console.error('candidates: Kepler table has no kepoi_name/koi_disposition column, skipped');
    else for (const r of koi.rows) {
      const d = (r[c.disp] || '').trim().toUpperCase();
      if (d === 'FALSE POSITIVE') { falsePositives++; continue; }
      if (d !== 'CANDIDATE') { if (d === 'CONFIRMED') confirmed++; continue; }
      const m = (r[c.id] || '').trim().match(/^K0*(\d+)\.(\d+)$/); if (!m) continue;
      rows.push([`KOI-${m[1]}.${m[2]}`, 'Kepler', 'PC', sig(num(r[c.ra]), 7), sig(num(r[c.dec]), 7), sig(num(r[c.per]), 6), sig(num(r[c.prad ?? c.rade])), sig(num(r[c.eqt])), sig(num(r[c.insol])),
        sig(num(r[c.teff])), sig(num(r[c.mag]), 3), null, null]);
    }
  }
  if (rows.length < 100) { console.error(`candidates: only ${rows.length} rows, keeping the existing file`); return; }
  write('candidates.json', { generated: today, cols: ['name', 'source', 'disp', 'ra', 'dec', 'per', 'rade', 'eqt', 'insol', 'teff', 'mag', 'dist', 'depth'], rows, falsePositives, confirmed }, `${rows.length} candidates (${falsePositives} false positives and ${confirmed} already-confirmed left out)`);
})();

// ---- every published value
(() => {
  const ps = table('ps.csv');
  if (!ps) { console.log('alt-values: no input, keeping the existing file'); return; }
  const c = { n: ps.col('pl_name'), r: ps.col('pl_rade'), m: ps.col('pl_bmasse'), p: ps.col('pl_orbper'), ref: ps.col('pl_refname'), pub: ps.col('pl_pubdate'), d: ps.col('default_flag') };
  if (c.n < 0 || c.ref < 0) { console.error('alt-values: missing columns, skipped'); return; }
  const by = new Map();
  for (const r of ps.rows) {
    const name = (r[c.n] || '').trim(); if (!name) continue;
    const refRaw = r[c.ref] || '';
    const txt = ((refRaw.match(/>([^<]+)<\/a>/) || [])[1] || '').trim();
    const url = (refRaw.match(/href=["']?([^\s"'>]+)/) || [])[1] || null;
    const vals = [sig(num(r[c.r]), 4), sig(num(r[c.m]), 4), sig(num(r[c.p]), 6)];
    if (!txt || vals.every((v) => v == null)) continue;
    const row = [txt, url, ...vals, (r[c.d] || '').trim() === '1' ? 1 : 0, (r[c.pub] || '').slice(0, 7)];
    if (!by.has(name)) by.set(name, []);
    by.get(name).push(row);
  }
  const res = {};
  let n = 0;
  for (const [name, list] of by) {
    const seen = new Set(), keep = [];
    for (const row of list.sort((a, b) => b[6].localeCompare(a[6]))) { const k = row.slice(0, 1).concat(row.slice(2, 5)).join('|'); if (!seen.has(k)) { seen.add(k); keep.push(row); } }
    const differs = [2, 3, 4].some((i) => new Set(keep.map((x) => x[i]).filter((v) => v != null)).size > 1);
    if (keep.length > 1 && differs) { res[name] = keep.slice(0, 12); n++; }
  }
  if (n < 50) { console.error(`alt-values: only ${n} planets, keeping the existing file`); return; }
  write('alt-values.json', { generated: today, cols: ['ref', 'url', 'rade', 'masse', 'per', 'default', 'pub'], planets: res }, `${n} planets with differing published values`);
})();

// ---- spectra
(() => {
  const sp = table('spectra.csv');
  if (!sp) { console.log('spectra: no input, keeping the existing file'); return; }
  const n = sp.col('plntname', 'pl_name', 'planet_name', 'planet');
  if (n < 0) { console.error('spectra: no planet-name column in: ' + sp.head.join(','), '— skipped'); return; }
  const find = (re) => sp.head.findIndex((h) => re.test(h));
  const c = { type: find(/^(spec_?type|spectype|type)$/i), fac: find(/facility|telescope/i), ins: find(/instrument/i), ref: find(/^(reference|refname|bibcode|pl_refname)$/i) };
  const res = {};
  for (const r of sp.rows) {
    const name = (r[n] || '').trim(); if (!name) continue;
    const g = (i) => (i >= 0 ? ((r[i] || '').replace(/<[^>]+>/g, '').trim() || null) : null);
    (res[name] ||= []).push([g(c.type), g(c.fac), g(c.ins), g(c.ref)]);
  }
  const k = Object.keys(res).length;
  if (k < 5) { console.error('spectra: too few planets, keeping the existing file'); return; }
  write('spectra.json', { generated: today, cols: ['type', 'facility', 'instrument', 'reference'], planets: res }, `${k} planets with spectra`);
})();
