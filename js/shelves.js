// The home page's shelves of planets. Shared by js/main.js (in the browser) and scripts/build-home.mjs
// (which writes them into index.html, so the page has content before any script runs).
import { look, typeLabel, fmt } from './model.js';
import { fmtDuration } from './facts.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const orbBg = (p) => { const c = look(p).colors; return `radial-gradient(circle at 32% 30%, ${c[2]}, ${c[0]} 55%, ${c[1]})`; };
export const glow = (p) => look(p).colors[0];
const top = (list, key, asc, n = 14, filter = () => true) =>
  list.filter((p) => p[key] != null && filter(p)).sort((a, b) => (asc ? a[key] - b[key] : b[key] - a[key]) || a.name.localeCompare(b.name)).slice(0, n);

export const FAMOUS = ['51 Peg b', 'Proxima Cen b', 'TRAPPIST-1 e', 'Kepler-452 b', 'Kepler-16 b', 'HD 189733 b', '55 Cnc e', 'WASP-12 b',
  'KELT-9 b', 'HR 8799 e', 'Kepler-186 f', 'K2-18 b', 'WASP-76 b', 'GJ 1214 b', 'HD 209458 b', 'bet Pic b', 'PSR B1257+12 c',
  'LHS 1140 b', "Teegarden's Star b", 'PSR B1620-26 b'];

export const SHELVES = [
  { id: 'famous', title: 'Famous worlds', blurb: 'Planets with a story: firsts, records and oddities.',
    pick: (A) => FAMOUS.map((n) => A.find((p) => p.name === n)).filter(Boolean), stat: (p) => `${typeLabel(p.type)}, ${p.year}`, browse: { sort: 'interesting' } },
  { id: 'closest', title: 'Our nearest neighbours', blurb: 'The planets closest to the Sun.',
    pick: (A) => top(A, 'dist_ly', true), stat: (p) => `${fmt(p.dist_ly, 1)} light-years`, browse: { sort: 'close' } },
  { id: 'hz', title: 'Habitable-zone starlight', blurb: 'Rocky-sized planets that get starlight in a range that could allow liquid water. Nobody knows yet whether any do.',
    pick: (A) => top(A, 'dist_ly', true, 14, (p) => p.hz), stat: (p) => `${fmt(p.dist_ly, 1)} light-years`, browse: { hz: true, sort: 'close' } },
  { id: 'new', title: 'Fresh discoveries', blurb: 'The newest additions to the catalogue.',
    pick: (A) => top(A, 'year', false, 14), stat: (p) => `Found in ${p.year}`, browse: { sort: 'new' } },
  { id: 'hot', title: 'Hottest worlds', blurb: 'Measured temperatures that would melt metal.',
    pick: (A) => top(A, 'teq', false, 14, (p) => !p.teq_est && !p.controv && p.teq < 4500), stat: (p) => `${fmt(p.teq, 0)} K`, browse: { sort: 'hot' } },
  { id: 'short', title: 'Shortest years', blurb: 'Planets that race around their star in hours.',
    pick: (A) => top(A, 'per', true, 14, (p) => !p.per_est && !p.controv), stat: (p) => fmtDuration(p.per), browse: { sort: 'short' } },
  { id: 'long', title: 'Longest years', blurb: 'Far-out worlds whose single orbit takes centuries or more.',
    pick: (A) => top(A, 'per', false, 14, (p) => !p.per_est && !p.controv), stat: (p) => fmtDuration(p.per), browse: { sort: 'long' } },
  { id: 'tiny', title: 'Smallest planets', blurb: 'Some are smaller than Mercury.',
    pick: (A) => top(A, 'rade', true, 14, (p) => !p.controv), stat: (p) => `${fmt(p.r, 2)}× Earth`, browse: { sort: 'small' } },
  { id: 'puffy', title: 'Puffiest planets', blurb: 'Very low density: lighter than cork, in some cases.',
    pick: (A) => top(A, 'density', true, 14, (p) => !p.controv), stat: (p) => `${fmt(p.density, 2)} g/cm³`, browse: { sort: 'puffy' } },
];

const CHEVRON = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

// Each planet is a real link to its own page, so it works with scripts off; main.js opens the 3D view instead.
export function shelvesHTML(ALL, t = (s) => s) {
  let html = '';
  for (const s of SHELVES) {
    const items = s.pick(ALL);
    if (!items.length) continue;
    const title = t(s.title);
    html += `<section class="shelf">
      <div class="shelf-head">
        <div><h2 class="h2">${esc(title)}</h2><p>${esc(t(s.blurb))}</p></div>
        <div class="shelf-tools">
          <button type="button" class="link" data-browse="${s.id}">${esc(t('See all'))}</button>
          <button type="button" class="arrow" data-dir="-1" aria-label="Scroll ${esc(s.title)} left">${CHEVRON('m15 18-6-6 6-6')}</button>
          <button type="button" class="arrow" data-dir="1" aria-label="Scroll ${esc(s.title)} right">${CHEVRON('m9 18 6-6-6-6')}</button>
        </div>
      </div>
      <div class="rail" tabindex="0" aria-label="${esc(title)}">
        ${items.map((p) => `<a class="item" href="planet/${p.slug}.html" data-id="${p.id}"><i class="orb" style="background:${orbBg(p)};--g:${glow(p)}"></i><b>${esc(p.name)}</b><small>${esc(s.stat(p))}</small></a>`).join('')}
      </div>
    </section>`;
  }
  return html;
}

// Text for the top of the home page, computed from the data.
export function heroTexts(ALL, hi = false) {
  const n = ALL.length;
  const hosts = new Set(ALL.map((p) => p.host)).size;
  const years = ALL.map((p) => p.year).filter((y) => y != null);
  const transit = ALL.filter((p) => p.method === 'Transit').length;
  if (hi) {
    return { n,
      lede: `खगोलविदों ने ${Math.min(...years)} से अब तक ${hosts.toLocaleString('en-US')} तारों के चारों ओर ग्रहों की पुष्टि की है। कोई भी ग्रह चुनिए और उसे घूमते देखिए। हर तस्वीर एक कलाकार की कल्पना है, जो मापे गए आँकड़ों पर आधारित है।`,
      cap: `किसी तारे की चमक समय के साथ। जब कोई ग्रह उसके सामने से गुज़रता है तो चमक घट जाती है। इनमें से ${Math.round((100 * transit) / n)}% ग्रह इसी तरह खोजे गए।` };
  }
  return {
    n,
    lede: `Astronomers have confirmed planets around ${hosts.toLocaleString('en-US')} stars since ${Math.min(...years)}. Pick any one to watch it turn. Every picture is an artist's impression built from what has been measured.`,
    cap: `A star's brightness over time. It dips when a planet crosses in front of it. ${Math.round((100 * transit) / n)}% of these planets were found this way.`,
  };
}
