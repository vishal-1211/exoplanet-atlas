// Generates one small static page per planet (planet/<slug>.html), an A–Z list of every planet
// (planets.html), sitemap.xml and robots.txt. Static pages mean search engines can read every
// planet, not just the app shell. Run after build-pages.mjs:  node scripts/build-planets.mjs
import fs from 'node:fs';
import { hydrate, typeLabel, RE_PER_RJ, slug as modelSlug, isKOI, KOI_NOTE, archiveUrl } from '../js/model.js';
import { systemSVG } from '../js/system.js';
import { ALL_PAGES, HI_FILES } from '../js/site.js';
import { details, topFacts, summaryLine, fmtDuration } from '../js/facts.js';

export const SITE = 'https://exoplanet-atlas.macrocosm.workers.dev/';
const data = JSON.parse(fs.readFileSync('data/planets.json', 'utf8'));
const P = hydrate(data);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = modelSlug;
const fmt = (x, d = 1) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d });

const idx = fs.readFileSync('index.html', 'utf8');
const header = idx.match(/<!--HEADER-->[\s\S]*?<!--\/HEADER-->/)[0].replace(/ aria-current="page"/g, '')
  .replace(/<button type="button" class="searchbtn" id="goSearch" aria-label="Search planets">([\s\S]*?)<\/button>/, '<a class="searchbtn" href="index.html#search" aria-label="Search planets">$1</a>');
const ICON = idx.match(/<link rel="icon"[^>]*>/)[0];
const CREDIT = 'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. This is an independent project and is not affiliated with NASA.';

const shell = ({ title, desc, path, body, jsonld = '' }) => { const m = path.match(/^planet\/(.+)\.html$/); const ogImage = SITE + (m && fs.existsSync(`img/og/${m[1]}.jpg`) ? `img/og/${m[1]}.jpg` : 'img/share.png'); return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="${path.includes('/') ? '../' : './'}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#070B1A">
<meta name="color-scheme" content="dark">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
${ICON}
<link rel="stylesheet" href="css/style.css">
${jsonld}
</head>
<body class="subpage static">
<a class="skip" href="#main">Skip to content</a>
<div class="veil" aria-hidden="true"></div>
${header}
<main id="main">
${body}
</main>
<footer class="foot wrap"><p class="credit">${CREDIT}</p></footer>
<script type="module" src="js/nav.js"></script>
</body>
</html>
`; };

// Short, specific descriptions make better search snippets than a generic line.
function describe(p) {
  const bits = [`${p.name} is ${/^[AEIOU]/i.test(typeLabel(p.type)) ? 'an' : 'a'} ${typeLabel(p.type).toLowerCase()} exoplanet`];
  if (p.dist_ly != null) bits.push(`${fmt(p.dist_ly, 0)} light-years away`);
  let s = bits.join(' ') + `, orbiting ${p.host}.`;
  if (p.year != null) s += ` Discovered in ${p.year} by ${p.method.toLowerCase()}.`;
  if (p.per != null) s += ` A year there lasts ${fmtDuration(p.per)}.`;
  if (p.r != null) s += ` It is ${fmt(p.r, 2)} times the size of Earth.`;
  return s.slice(0, 300);
}

const bySystem = new Map(); for (const p of P) { if (!bySystem.has(p.host)) bySystem.set(p.host, []); bySystem.get(p.host).push(p); }
const link = (p) => `<a href="planet/${slug(p.name)}.html">${esc(p.name)}</a>`;

fs.mkdirSync('planet', { recursive: true });
for (const f of fs.readdirSync('planet')) fs.unlinkSync('planet/' + f); // no stale pages
const seenSlugs = new Set();
for (const p of P) {
  const s = slug(p.name); if (seenSlugs.has(s)) throw new Error('duplicate slug ' + s); seenSlugs.add(s);
  const sib = bySystem.get(p.host).filter((x) => x !== p);
  const same = P.filter((x) => x.type === p.type && x !== p && x.dist_ly != null).sort((a, b) => Math.abs((a.dist_ly || 0) - (p.dist_ly || 0)) - Math.abs((b.dist_ly || 0) - (p.dist_ly || 0))).slice(0, 6);
  const desc = describe(p);
  const nums = [
    ['Size', p.r != null ? `${fmt(p.r, 2)}× Earth` : 'Not identified'],
    ['Year', p.per != null ? fmtDuration(p.per) : 'Not identified'],
    ['Distance', p.dist_ly != null ? `${fmt(p.dist_ly, 1)} ly` : 'Not identified'],
    ['Found', p.year != null ? String(p.year) : 'Not identified'],
  ];
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage', name: `${p.name}: exoplanet facts`, description: desc, url: `${SITE}planet/${s}.html`,
    about: { '@type': 'Thing', name: p.name, description: `${typeLabel(p.type)} orbiting the star ${p.host}` },
    isPartOf: { '@type': 'WebSite', name: 'Exoplanet Atlas', url: SITE },
    citation: 'NASA Exoplanet Archive'
  }).replace(/</g, '\\u003c')}</script>`;
  const body = `  <article class="wrap page-head pl">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Catalogue</a> › <a href="planets.html">All planets</a> › <span>${esc(p.name)}</span></nav>
    <h1 class="h2 big-h">${esc(p.name)}</h1>
    <p class="sec-lede">${esc(desc)}</p>
    <p><a class="btn primary" href="index.html#planet=${encodeURIComponent(p.name)}">See it turn in 3D →</a></p>
    <div class="pl-nums">${nums.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${isKOI(p) ? `<p class="small muted">${esc(KOI_NOTE)}</p>` : ''}
    ${(() => { const svg = systemSVG(bySystem.get(p.host), { link: (q) => `planet/${slug(q.name)}.html`, highlight: p.name, id: 's' }); return svg ? `<h2 class="h2">The planets of ${esc(p.host)}, to scale</h2><div class="chartbox">${svg}</div><p class="small muted">Distance from the star on a log scale (each step right is ten times farther). The green band is where starlight is in a range that could allow liquid water. Circle sizes are not on the same scale as the distances. <a href="systems.html#${encodeURIComponent(p.host)}">Interactive version</a></p>` : ''; })()}
    <h2 class="h2">Interesting facts</h2>
    <ul class="pl-facts">${topFacts(p, P, 8).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <h2 class="h2">The details</h2>
    <table class="pl-table">${details(p).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
    ${sib.length ? `<h2 class="h2">Other planets around ${esc(p.host)}</h2><p class="pl-links">${sib.map(link).join(' · ')}</p>` : ''}
    ${same.length ? `<h2 class="h2">Other ${esc(typeLabel(p.type).toLowerCase())} planets</h2><p class="pl-links">${same.map(link).join(' · ')}</p>` : ''}
    <p class="small">Source: <a href="${archiveUrl(p)}" rel="noopener">${esc(p.name)} on the NASA Exoplanet Archive</a>${p.reftxt ? ` (values from ${p.refurl ? `<a href="${esc(p.refurl)}" rel="noopener">${esc(p.reftxt)}</a>` : esc(p.reftxt)})` : ''}. <a href="compare.html#a=${encodeURIComponent(p.name)}">Compare with another planet</a></p>
    <p class="small muted">${esc(summaryLine(p))}. "Not identified" means astronomers have not measured that value yet.</p>
  </article>`;
  fs.writeFileSync(`planet/${s}.html`, shell({ title: `${p.name}: size, year, distance and facts · Exoplanet Atlas`, desc, path: `planet/${s}.html`, body, jsonld }));
}

// A–Z list: every planet one click from a crawlable page
const groups = new Map();
for (const p of [...P].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
  const k = /^[a-z]/i.test(p.name) ? p.name[0].toUpperCase() : '#';
  if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p);
}
const azBody = `  <section class="wrap page-head">
    <h1 class="h2 big-h">Every known exoplanet, A to Z</h1>
    <p class="sec-lede">All ${P.length.toLocaleString('en-US')} confirmed planets around other stars, each with its own page of facts. For search, filters and 3D views, use the <a href="index.html">catalogue</a>.</p>
    <p class="az-jump">${[...groups.keys()].map((k) => `<a href="planets.html#az-${k === '#' ? 'num' : k}">${k}</a>`).join(' ')}</p>
    ${[...groups].map(([k, list]) => `<h2 class="h2" id="az-${k === '#' ? 'num' : k}">${k}</h2><p class="az-list">${list.map(link).join(' ')}</p>`).join('\n')}
  </section>`;
fs.writeFileSync('planets.html', shell({ title: 'All exoplanets A to Z · Exoplanet Atlas', desc: `A list of all ${P.length.toLocaleString('en-US')} confirmed exoplanets, each with its own page of size, orbit, distance, discovery and facts.`, path: 'planets.html', body: azBody }));

// sitemap + robots
const today = data.generated || new Date().toISOString().slice(0, 10);
const top = ['', 'planets.html', ...ALL_PAGES.map(([f]) => f).filter((f) => f !== 'index.html')].filter((f) => f === '' || fs.existsSync(f));
const hiTop = HI_FILES.filter((f) => fs.existsSync('hi/' + f));
const urls = [...top.map((f) => SITE + f), ...hiTop.map((f) => SITE + 'hi/' + f), ...[...seenSlugs].map((s) => `${SITE}planet/${s}.html`)];
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`wrote ${seenSlugs.size} planet pages, planets.html, sitemap.xml (${urls.length} URLs), robots.txt`);
