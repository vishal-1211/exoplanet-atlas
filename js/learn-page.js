// Shared script for the learn pages (how, telescopes, timeline, types, faq):
// loads the catalogue data, draws the sky background, and fills in the page.
import { hydrate } from './model.js';
import { Sky } from './sky.js';
import { buildLearn } from './learn.js';

const $ = (s) => document.querySelector(s);
const go = (hash) => { location.href = 'index.html' + hash; };

window.addEventListener('scroll', () => $('#bar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); go('#search'); }
});

// On phones the section links scroll sideways; bring the current page's link into view.
const cur = document.querySelector('.nav [aria-current]');
if (cur && cur.parentElement.scrollWidth > cur.parentElement.clientWidth) cur.parentElement.scrollLeft = cur.offsetLeft - 24;

(async () => {
  let all;
  try {
    const res = await fetch('data/planets.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    all = hydrate(await res.json());
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'wrap sec-lede';
    p.textContent = `Could not load the planet data (${err.message}). Please refresh the page.`;
    $('#main').prepend(p);
    return;
  }
  const seen = new Map();
  for (const p of all) if (!seen.has(p.host) && p.ra != null && p.dec != null) seen.set(p.host, { ra: p.ra, dec: p.dec, teff: p.teff, dist: p.dist });
  new Sky($('#sky'), [...seen.values()]).start();

  buildLearn(all, {
    openPlanet: (p) => go('#planet=' + encodeURIComponent(p.name)),
    browseType: (id) => go('#type=' + id),
  });
})();
