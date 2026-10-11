// Learning sections: how planets are found, a timeline, telescopes, planet kinds, Q&A.
// Everything numeric is computed from the catalogue data, so it stays true when the data refreshes.
import { TYPES, fmt } from './model.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => n.toLocaleString('en-US');

// ---------------------------------------------------------------- methods
const SVG = {
  transit: `<svg viewBox="0 0 220 110" aria-hidden="true"><circle cx="110" cy="42" r="26" fill="#FFB454"/><circle class="a-transit" cx="52" cy="42" r="7" fill="#0A1024"/><path d="M14 98h38l8 -8h100l8 8h38" fill="none" stroke="#7ED6FF" stroke-width="2" stroke-linejoin="round"/></svg>`,
  rv: `<svg viewBox="0 0 220 110" aria-hidden="true"><g class="a-wobble"><circle cx="110" cy="46" r="24" fill="#FFB454"/></g><circle cx="168" cy="46" r="6" fill="#7ED6FF"/><rect x="30" y="92" width="160" height="8" rx="4" fill="url(#rvg)"/><defs><linearGradient id="rvg"><stop offset="0" stop-color="#4F7BFF"/><stop offset=".5" stop-color="#EAF0FF"/><stop offset="1" stop-color="#FF4D6A"/></linearGradient></defs></svg>`,
  micro: `<svg viewBox="0 0 220 110" aria-hidden="true"><circle cx="110" cy="40" r="10" fill="#EAF0FF" opacity=".55"/><circle class="a-lens" cx="110" cy="40" r="16" fill="none" stroke="#7ED6FF" stroke-width="1.5" stroke-dasharray="3 4"/><circle cx="110" cy="40" r="6" fill="#FFB454"/><circle cx="134" cy="48" r="2.6" fill="#7ED6FF"/><path d="M14 98h70q10 -2 14 -22q4 22 12 22q4 0 8 -10q4 10 8 10h90" fill="none" stroke="#7ED6FF" stroke-width="2" stroke-linejoin="round" transform="translate(0 0)"/></svg>`,
  imaging: `<svg viewBox="0 0 220 110" aria-hidden="true"><circle cx="76" cy="55" r="34" fill="#FFB454" opacity=".16"/><circle cx="76" cy="55" r="22" fill="#FFB454" opacity=".28"/><circle cx="76" cy="55" r="11" fill="#0A1024" stroke="#FFB454" stroke-width="2"/><circle class="a-glint" cx="160" cy="36" r="4.5" fill="#7ED6FF"/><path d="M160 36 l0 0" /></svg>`,
  timing: `<svg viewBox="0 0 220 110" aria-hidden="true"><g stroke="#FFB454" stroke-width="3" stroke-linecap="round"><path d="M24 70v-24M56 70v-24M88 70v-24M120 70v-24"/></g><g stroke="#7ED6FF" stroke-width="3" stroke-linecap="round" class="a-late"><path d="M156 70v-24M190 70v-24"/></g><path d="M20 84h188" stroke="#6B7699" stroke-width="1.5"/></svg>`,
  astro: `<svg viewBox="0 0 220 110" aria-hidden="true"><ellipse cx="110" cy="55" rx="40" ry="18" fill="none" stroke="#6B7699" stroke-dasharray="3 5"/><circle class="a-orbit" cx="110" cy="55" r="9" fill="#FFB454"/><circle cx="110" cy="55" r="1.8" fill="#EAF0FF"/></svg>`,
};

const METHODS = [
  { key: 'Transit', svg: 'transit', title: 'Transit',
    how: 'Watch a star for tiny, regular dips in brightness. A planet that crosses in front of its star blocks a sliver of light, the way a moth crossing a lamp would.',
    gives: 'Size, orbit time, and (with other data) the makeup of the atmosphere.',
    limit: 'Only works when the orbit happens to line up edge-on from our point of view, so most planets are missed.' },
  { key: 'Radial Velocity', svg: 'rv', title: 'Radial velocity',
    how: 'A planet tugs on its star, so the star wobbles toward us and away from us. Its light shifts slightly bluer, then redder, and a spectrograph can measure that shift.',
    gives: 'A minimum mass and the orbit. Found the first planet around a Sun-like star in 1995.',
    limit: 'Easiest for heavy planets that orbit close in, and it needs a lot of time on large telescopes.' },
  { key: 'Microlensing', svg: 'micro', title: 'Microlensing',
    how: 'When one star drifts in front of a more distant one, its gravity bends and brightens the background light. A planet around the nearer star adds a brief extra blip.',
    gives: 'Planets very far away, including cold ones that other methods miss.',
    limit: 'The alignment happens once and never repeats, so the planet cannot be watched again.' },
  { key: 'Imaging', svg: 'imaging', title: 'Direct imaging',
    how: 'Block the star\'s glare with a mask, and the faint glow of a planet beside it can show up as a dot. Planets that are young, hot and far from their star are brightest.',
    gives: 'An actual picture, plus colours and light that can be studied.',
    limit: 'Only works for big, young planets on wide orbits, because anything closer is lost in the glare.' },
  { key: 'timing', group: ['Pulsar Timing', 'Transit Timing Variations', 'Eclipse Timing Variations', 'Pulsation Timing Variations'], svg: 'timing', title: 'Timing',
    how: 'Some stars keep very steady time: pulsars pulse, and eclipsing stars dim, on a precise beat. A planet pulling on them makes the beat arrive slightly early or late.',
    gives: 'The first planets ever found beyond the Sun, in 1992, around a pulsar.',
    limit: 'Needs an unusually regular clock to start with, so it applies to few stars.' },
  { key: 'Astrometry', svg: 'astro', title: 'Astrometry',
    how: 'Track a star\'s exact position on the sky. A planet makes it trace a tiny circle or wiggle as both orbit their shared centre of mass.',
    gives: 'The true mass, not just a minimum, and the full orbit.',
    limit: 'The motion is extremely small, so it needs very precise measurements. Space missions such as Gaia are changing that.' },
];

function methodCards(all, open) {
  const total = all.length;
  const by = {};
  for (const p of all) (by[p.method] ||= []).push(p);
  const cards = METHODS.map((m) => {
    const keys = m.group || [m.key];
    const list = keys.flatMap((k) => by[k] || []);
    const n = list.length;
    const share = (100 * n) / total;
    const ex = list.filter((p) => p.dist_ly != null).sort((a, b) => a.dist_ly - b.dist_ly)[0] || list[0];
    return `<article class="method">
      <div class="m-art">${SVG[m.svg]}</div>
      <h3>${esc(m.title)}</h3>
      <p class="m-count"><b>${nf(n)}</b> planets <span>${share < 1 ? '<1' : fmt(share, share < 10 ? 1 : 0)}%</span></p>
      <div class="m-bar" aria-hidden="true"><i style="width:${Math.max(1.5, share)}%"></i></div>
      <p>${esc(m.how)}</p>
      <p class="m-sub"><b>Tells us:</b> ${esc(m.gives)}</p>
      <p class="m-sub"><b>Catch:</b> ${esc(m.limit)}</p>
      ${ex ? `<button type="button" class="link m-ex" data-id="${ex.id}">Closest example: ${esc(ex.name)}</button>` : ''}
    </article>`;
  });
  return cards.join('');
}

// ---------------------------------------------------------------- timeline
const GROUPS = [
  { id: 'Transit', label: 'Transit', color: '#7ED6FF' },
  { id: 'Radial Velocity', label: 'Radial velocity', color: '#FFB454' },
  { id: 'Microlensing', label: 'Microlensing', color: '#B58CFF' },
  { id: 'Imaging', label: 'Direct imaging', color: '#6CC08B' },
  { id: 'other', label: 'Other methods', color: '#8F9BC4' },
];
const gid = (m) => (['Transit', 'Radial Velocity', 'Microlensing', 'Imaging'].includes(m) ? m : 'other');
const EVENTS = [
  [1992, 'First planets found, around a pulsar'],
  [1995, '51 Peg b: first around a Sun-like star'],
  [2009, 'Kepler launches'],
  [2018, 'TESS launches'],
];

function timeline(all) {
  const years = all.map((p) => p.year).filter((y) => y != null);
  const y0 = Math.min(...years), y1 = Math.max(...years);
  const rows = new Map();
  for (let y = y0; y <= y1; y++) rows.set(y, Object.fromEntries(GROUPS.map((g) => [g.id, 0])));
  for (const p of all) if (p.year != null) rows.get(p.year)[gid(p.method)]++;
  const totals = [...rows].map(([y, o]) => [y, Object.values(o).reduce((a, b) => a + b, 0)]);
  const maxT = Math.max(...totals.map((t) => t[1]));
  const peak = totals.reduce((a, b) => (b[1] > a[1] ? b : a));
  const niceMax = Math.ceil(maxT / 200) * 200;
  const W = 900, H = 340, L = 44, R = 10, T = 18, B = 34;
  const iw = W - L - R, ih = H - T - B, n = rows.size, bw = iw / n;
  const yPos = (v) => T + ih - (v / niceMax) * ih;
  let g = '';
  for (let v = 0; v <= niceMax; v += niceMax / 4) {
    g += `<line x1="${L}" x2="${W - R}" y1="${yPos(v)}" y2="${yPos(v)}" stroke="rgba(160,180,255,.10)"/><text x="${L - 8}" y="${yPos(v) + 4}" text-anchor="end" class="ax">${nf(Math.round(v))}</text>`;
  }
  let i = 0;
  for (const [y, o] of rows) {
    let acc = 0;
    const x = L + i * bw + bw * 0.14, w = bw * 0.72;
    const tot = totals[i][1];
    let seg = '';
    for (const gr of GROUPS) {
      const v = o[gr.id];
      if (!v) continue;
      const top = yPos(acc + v), h = yPos(acc) - top;
      seg += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, 0.6).toFixed(1)}" fill="${gr.color}"/>`;
      acc += v;
    }
    g += `<g class="bar-g" tabindex="-1"><title>${y}: ${nf(tot)} planets${Object.entries(o).filter(([, v]) => v).map(([k, v]) => `, ${GROUPS.find((x) => x.id === k).label} ${nf(v)}`).join('')}</title>${seg}<rect x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent"/></g>`;
    if ((y - y0) % 5 === 0 || y === y1) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="ax">${y}</text>`;
    i++;
  }
  for (const [y, label] of EVENTS) {
    if (y < y0 || y > y1) continue;
    const cx = L + (y - y0) * bw + bw / 2;
    g += `<line x1="${cx}" x2="${cx}" y1="${T + 6}" y2="${T + ih}" stroke="rgba(255,180,84,.5)" stroke-dasharray="2 4"/>`;
  }
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Stacked bar chart of planets discovered each year, ${y0} to ${y1}">${g}</svg>`;
  const marks = EVENTS.filter(([y]) => y >= y0 && y <= y1).map(([y, t]) => `<li><b>${y}</b> ${esc(t)}</li>`).join('');
  const legend = GROUPS.map((gr) => `<span><i style="background:${gr.color}"></i>${gr.label}</span>`).join('');
  const lede = `Fewer than 20 planets a year were found before 2001. Then space telescopes began watching thousands of stars at once, and whole batches of candidates were confirmed together. The busiest year so far is ${peak[0]}, with ${nf(peak[1])} planets. ${y1} is still in progress.`;
  return { svg, legend, lede, marks };
}

// ---------------------------------------------------------------- telescopes
const SCOPE_NOTES = {
  'Kepler': 'NASA space telescope that stared at one patch of sky from 2009 to 2018. It showed that planets are common.',
  'Transiting Exoplanet Survey Satellite (TESS)': 'NASA space telescope, launched in 2018, that scans nearly the whole sky for planets around bright, nearby stars.',
  'K2': 'Kepler\'s second life: after a mechanical failure it kept observing, in new patches of sky, from 2014 to 2018.',
  'La Silla Observatory': 'European Southern Observatory site in Chile. Its HARPS instrument is one of the most productive planet hunters.',
  'W. M. Keck Observatory': 'Twin 10 metre telescopes on Mauna Kea, Hawaii. Used for radial velocity work and for direct images.',
  'KMTNet': 'Three matched telescopes in Chile, South Africa and Australia that watch the crowded centre of the galaxy around the clock for microlensing.',
  'SuperWASP': 'Wide-angle camera arrays in the Canary Islands that find big, hot planets passing in front of bright stars.',
  'OGLE': 'A long-running survey run from Warsaw, using a telescope in Chile, that watches millions of stars for microlensing and transits.',
  'HATSouth': 'A network of small robotic telescopes in Chile, Namibia and Australia.',
  'HATNet': 'A network of small robotic telescopes in Arizona and Hawaii.',
  'Haute-Provence Observatory': 'In France. In 1995 it was the source of the first planet found around a Sun-like star, 51 Peg b.',
  'Paranal Observatory': 'Home of the European Southern Observatory\'s Very Large Telescope in Chile.',
  'Roque de los Muchachos Observatory': 'A mountaintop observatory on La Palma in the Canary Islands, with several large telescopes.',
  'Okayama Astrophysical Observatory': 'Japan\'s main national optical observatory, with a long record in radial velocity searches of giant stars.',
  'Lick Observatory': 'University of California observatory near San Jose, California, one of the early planet-hunting sites.',
  'CoRoT': 'French-led European space telescope that observed from 2006 to 2013 and found one of the first rocky planets.',
  'Anglo-Australian Telescope': 'A 3.9 metre telescope in New South Wales, Australia, with a long planet-search programme.',
  'Las Campanas Observatory': 'Carnegie Institution observatory high in the Chilean Andes.',
  'MOA': 'Microlensing Observations in Astrophysics: a Japan and New Zealand collaboration searching for microlensing planets.',
  'McDonald Observatory': 'University of Texas observatory in the Davis Mountains of west Texas.',
  'SuperWASP-South': 'The southern half of SuperWASP, in South Africa.',
  'Calar Alto Observatory': 'An observatory in southern Spain, home of the CARMENES planet-hunting instrument.',
  'Bohyunsan Optical Astronomical Observatory': 'South Korea\'s national optical observatory, with a radial velocity planet search.',
  'Next-Generation Transit Survey (NGTS)': 'An array of small robotic telescopes at Paranal, Chile, built to find planets passing in front of stars.',
  'European Space Agency (ESA) Gaia Satellite': 'European space telescope that maps the positions of over a billion stars with extreme precision.',
  'Gemini Observatory': 'Twin 8 metre telescopes, one in Hawaii and one in Chile, so both hemispheres of sky are covered.',
  'Subaru Telescope': 'Japan\'s 8.2 metre telescope on Mauna Kea, Hawaii.',
  'WASP-South': 'The southern branch of the WASP survey.',
};

function scopes(all) {
  const m = new Map();
  for (const p of all) {
    if (!p.facility) continue;
    const o = m.get(p.facility) || { name: p.facility, n: 0, loc: p.locale, y0: 9999, y1: 0, meth: new Map() };
    o.n++;
    if (p.year != null) { o.y0 = Math.min(o.y0, p.year); o.y1 = Math.max(o.y1, p.year); }
    o.meth.set(p.method, (o.meth.get(p.method) || 0) + 1);
    m.set(p.facility, o);
  }
  const all2 = [...m.values()];
  const multi = all2.filter((o) => /^Multiple /.test(o.name));
  const single = all2.filter((o) => !/^Multiple /.test(o.name)).sort((a, b) => b.n - a.n);
  const space = single.filter((o) => o.loc === 'Space').reduce((a, o) => a + o.n, 0);
  const ground = single.filter((o) => o.loc === 'Ground').reduce((a, o) => a + o.n, 0);
  const sum = space + ground;
  return { top: single.slice(0, 14), space, ground, sum, multiN: multi.reduce((a, o) => a + o.n, 0), count: single.length };
}

// ---------------------------------------------------------------- Q&A
const FAQ = [
  ['What is an exoplanet?', 'A planet that orbits a star other than our Sun. The word is short for "extrasolar planet". The first confirmed ones were found in 1992, and thousands have been confirmed since.'],
  ['How do astronomers know a planet\'s size, mass or temperature?', 'A transit gives the size, because the dip in light depends on how big the planet is compared with its star. Radial velocity gives the mass. The temperature listed here is an "equilibrium" temperature, worked out from how much starlight the planet receives. Real surface temperatures also depend on the atmosphere.'],
  ['What is the habitable zone?', 'The range of distances from a star where a rocky planet could have liquid water on its surface. It depends on the star\'s brightness: close in for a dim red dwarf, much farther out for a Sun-like star. Being inside it does not mean a planet has water, an atmosphere, or life.'],
  ['Has life been found on any of them?', 'No. No planet outside our Solar System has shown confirmed signs of life. Telescopes such as the James Webb Space Telescope are beginning to study atmospheres of small planets, which is one way a future discovery could happen.'],
  ['Why are most planets found by the transit method?', 'Because a few space telescopes, mainly Kepler and TESS, watched huge numbers of stars at once, and transits can be spotted automatically in that data. That also means the catalogue is biased toward planets that orbit close to their stars and are large enough to notice.'],
  ['Can we see these planets with a telescope?', 'Almost never. Nearly all are detected indirectly. Only a small number, mostly young giant planets far from their stars, have been photographed directly, and they show up as tiny dots, not as discs.'],
  ['How many planets are there really?', 'Far more than this catalogue lists. Surveys suggest that most stars have at least one planet, and our galaxy has hundreds of billions of stars. The catalogue only holds the ones we have been able to confirm so far.'],
  ['Are the pictures real?', 'No. They are artist\'s impressions, generated from each planet\'s measured size, temperature and star. Real colours, clouds and surface features are unknown for almost every planet.'],
];

// ---------------------------------------------------------------- entry
export function buildLearn(all, { openPlanet, browseType }) {
  const $ = (s) => document.querySelector(s);

  $('#methods').innerHTML = methodCards(all);
  $('#methods').addEventListener('click', (e) => {
    const b = e.target.closest('.m-ex');
    if (b) openPlanet(all[+b.dataset.id]);
  });

  const tl = timeline(all);
  $('#tlLede').textContent = tl.lede;
  $('#tlChart').innerHTML = tl.svg + `<ul class="marks">${tl.marks}</ul>`;
  $('#tlLegend').innerHTML = tl.legend;

  const sc = scopes(all);
  const sp = (100 * sc.space) / sc.sum, gp = 100 - sp;
  $('#scLede').textContent = `${nf(sc.count)} different telescopes, observatories and surveys are credited with at least one discovery. A handful of space telescopes account for most of the planets, while ground-based observatories lead on the nearby, well-studied ones.`;
  $('#scSplit').innerHTML = `<div class="split-bar" role="img" aria-label="${fmt(sp, 0)} percent found from space, ${fmt(gp, 0)} percent from the ground"><i class="sp" style="width:${sp}%"></i><i class="gr" style="width:${gp}%"></i></div>
    <div class="split-key"><span><i class="sp"></i><b>${nf(sc.space)}</b> found by space telescopes (${fmt(sp, 0)}%)</span><span><i class="gr"></i><b>${nf(sc.ground)}</b> found from the ground (${fmt(gp, 0)}%)</span></div>`;
  const maxN = sc.top[0].n;
  $('#scopes-list').innerHTML = sc.top.map((o) => {
    const ms = [...o.meth].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(', ');
    const note = SCOPE_NOTES[o.name];
    return `<li class="scope">
      <div class="s-head"><b>${esc(o.name)}</b><span class="tag ${o.loc === 'Space' ? 'tag-space' : 'tag-ground'}">${o.loc === 'Space' ? 'Space' : 'Ground'}</span></div>
      <div class="s-bar" aria-hidden="true"><i style="width:${Math.max(1.5, (100 * o.n) / maxN)}%"></i></div>
      <p class="s-num"><b>${nf(o.n)}</b> planets, ${o.y0}${o.y1 !== o.y0 ? ' to ' + o.y1 : ''}</p>
      ${note ? `<p class="s-note">${esc(note)}</p>` : ''}
      <p class="s-meth">${esc(ms)}</p>
    </li>`;
  }).join('');
  $('#scNote').textContent = `Another ${nf(sc.multiN)} planets are credited to several observatories working together, and are not listed above. Discovery credit goes to the facility named in NASA's records, not necessarily every telescope used to confirm the planet.`;

  const counts = {};
  for (const p of all) counts[p.type] = (counts[p.type] || 0) + 1;
  const SIZE = { subearth: 'Under 0.8× Earth\'s width', earth: '0.8 to 1.25×', superearth: '1.25 to 2×', mininep: '2 to 3.5×', neptune: '3.5 to 6×', giant: 'Over 6×', superjup: 'Over 13 Jupiter masses', unknown: 'Not measured' };
  const COL = { subearth: '#A8A59E', earth: '#5AA0E0', superearth: '#6CC08B', mininep: '#8FB8E8', neptune: '#4F7BFF', giant: '#E0B070', superjup: '#D0805A', unknown: '#6B7699' };
  const DIA = { subearth: 14, earth: 18, superearth: 26, mininep: 34, neptune: 44, giant: 62, superjup: 72, unknown: 20 };
  $('#zoo').innerHTML = TYPES.map((t) => `<button type="button" class="kind" data-type="${t.id}">
      <span class="k-orb" style="--d:${DIA[t.id]}px;--c:${COL[t.id]}"><i></i></span>
      <b>${esc(t.label)}</b>
      <small>${esc(t.blurb)}</small>
      <span class="k-size">${esc(SIZE[t.id])}</span>
      <span class="k-n">${nf(counts[t.id] || 0)} planets</span>
    </button>`).join('');
  $('#zoo').addEventListener('click', (e) => {
    const b = e.target.closest('.kind');
    if (b) browseType(b.dataset.type);
  });

  $('#faqList').innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
}
