// Help page: just the sky background and the header behaviour (the content is static).
import { hydrate } from './model.js';
import { Sky } from './sky.js';
const $ = (s) => document.querySelector(s);
window.addEventListener('scroll', () => $('#bar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });
(async () => {
  try {
    const all = hydrate(await (await fetch('data/planets.json')).json());
    const seen = new Map(); for (const p of all) if (!seen.has(p.host) && p.ra != null && p.dec != null) seen.set(p.host, { ra: p.ra, dec: p.dec, teff: p.teff, dist: p.dist });
    new Sky($('#sky'), [...seen.values()]).start();
  } catch { /* the page reads fine without the sky */ }
})();
