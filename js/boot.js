// Shared start-up for the extra pages: menu, planet data, and the sky background.
import './nav.js';
import { hydrate } from './model.js';
import { Sky } from './sky.js';

export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const planetHref = (p) => 'index.html#planet=' + encodeURIComponent(p.name);
export const nf = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); location.href = 'index.html#search'; }
});

export async function boot({ sky = true } = {}) {
  let meta, all;
  try {
    const res = await fetch('data/planets.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    meta = await res.json();
    all = hydrate(meta);
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'wrap sec-lede';
    p.textContent = `Could not load the planet data (${err.message}). Please refresh the page.`;
    $('#main').prepend(p);
    throw err;
  }
  if (sky && $('#sky')) {
    const seen = new Map();
    for (const p of all) if (!seen.has(p.host) && p.ra != null && p.dec != null) seen.set(p.host, { ra: p.ra, dec: p.dec, teff: p.teff, dist: p.dist });
    new Sky($('#sky'), [...seen.values()]).start();
  }
  return { all, meta };
}
