// Writes the shared header into every page and generates the "learn" pages.
// Run:  node scripts/build-pages.mjs     (the generated files are committed, so hosting needs no build step)
import fs from 'fs';

const NAV = [
  ['index.html', 'Catalogue', 'The full list of planets, with search and filters.'],
  ['how.html', 'How planets are found', 'The six methods astronomers use, with a diagram of each.'],
  ['telescopes.html', 'Telescopes', 'The space telescopes and observatories behind the discoveries.'],
  ['timeline.html', 'Timeline', 'How many planets were found each year, and by which method.'],
  ['types.html', 'Planet types', 'From sub-Earths to super-Jupiters, and how many of each exist.'],
  ['faq.html', 'Q&A', 'Short answers to common questions.'],
  ['kids.html', 'Kids', 'How big, how hot, how heavy would you be? Planets for young explorers.'],
  ['help.html', 'Help find planets', 'Real projects where anyone can help discover and track exoplanets.'],
];
const SITE = 'https://exoplanet-atlas.macrocosm.workers.dev/';
const esc = (s) => s.replace(/&/g, '&amp;');
const HELP_BODY = `<p class="sec-lede">You don’t need a degree or a telescope to help find planets. Professional astronomers have more data than they can look through, and volunteers have already discovered real worlds. Here are two projects that are all about exoplanets.</p>
      <div class="help-grid">
        <article class="help-card">
          <div class="help-tag">No equipment · in your browser</div>
          <h2 class="h2">Planet Hunters TESS</h2>
          <p>NASA’s TESS telescope watches hundreds of thousands of stars, measuring their brightness every few minutes. When a planet passes in front of its star, the star dims for a few hours. Computers miss some of those dips, especially single or shallow ones. On Planet Hunters TESS you look at these brightness graphs and mark the dips you see. Volunteers have found planets this way that the automated searches missed.</p>
          <ol class="help-steps"><li>Create a free Zooniverse account (optional, but it credits your finds).</li><li>Do the short tutorial: it shows what a planet dip looks like.</li><li>Classify light curves: mark any dips. A few minutes at a time is fine.</li></ol>
          <p><a class="btn primary" href="https://www.zooniverse.org/projects/nora-dot-eisner/planet-hunters-tess" rel="noopener">Join Planet Hunters TESS ↗</a> <a class="link" href="https://www.zooniverse.org/projects/nora-dot-eisner/planet-hunters-tess/about/results" rel="noopener">See what volunteers found ↗</a></p>
        </article>
        <article class="help-card">
          <div class="help-tag">Small telescope, or none</div>
          <h2 class="h2">NASA Exoplanet Watch</h2>
          <p>Once a planet is known, its next crossing in front of its star has to be predicted precisely, so big telescopes like JWST don’t waste time waiting. Those predictions drift as years pass. Exoplanet Watch volunteers observe transits with small telescopes, or analyse observations others have already made, to keep the timings accurate.</p>
          <ol class="help-steps"><li>Read the project’s guide to choose: observe with your own telescope, or analyse existing data on your computer.</li><li>Pick a target from its list of planets to observe.</li><li>Upload your result; it is combined with everyone else’s.</li></ol>
          <p><a class="btn primary" href="https://science.nasa.gov/citizen-science/exoplanet-watch/" rel="noopener">Join Exoplanet Watch ↗</a> <a class="link" href="https://science.nasa.gov/citizen-science/exoplanet-watch/what-to-observe/" rel="noopener">What to observe ↗</a></p>
        </article>
      </div>
      <h2 class="h2">Warm up first</h2>
      <p class="sec-lede">Try the “Spot the planet” game on the <a href="kids.html#spot">Kids page</a>: it shows you exactly the kind of dip these projects look for.</p>
      <p class="small muted">Both projects are run by their own teams; check each project page for how it is running today. This site is not affiliated with them.</p>`;


const header = (file) => {
  const links = NAV.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const search = file === 'index.html'
    ? '<button type="button" class="searchbtn" id="goSearch" aria-label="Search planets">'
    : '<a class="searchbtn" href="index.html#search" aria-label="Search planets">';
  const end = file === 'index.html' ? '</button>' : '</a>';
  return `<!--HEADER-->
<header class="bar" id="bar">
  <a class="brand" href="index.html" aria-label="Exoplanet Atlas home">
    <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="13" fill="#FFB454"/><ellipse cx="32" cy="32" rx="28" ry="8" fill="none" stroke="#EAF0FF" stroke-width="3" transform="rotate(-22 32 32)"/></svg>
    <span>Exoplanet Atlas</span>
  </a>
  <nav class="nav" aria-label="Sections">${links}</nav>
  ${search}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <span>Search</span><kbd aria-hidden="true">/</kbd>
  ${end}
</header>
<!--/HEADER-->`;
};

const PAGES = [
  { file: 'how.html', title: 'How planets are found',
    desc: 'The six methods astronomers use to find planets around other stars: transit, radial velocity, microlensing, direct imaging, timing and astrometry.',
    body: `<p class="sec-lede">A planet around another star is almost always too faint to see directly. Astronomers look for what it does to its star instead. Six methods have found nearly every planet in this catalogue.</p>
      <div class="methods" id="methods"></div>` },
  { file: 'telescopes.html', title: 'The telescopes behind the discoveries',
    desc: 'Which space telescopes and observatories discovered the most exoplanets, with counts from the catalogue.',
    body: `<p class="sec-lede" id="scLede"></p>
      <div class="split" id="scSplit"></div>
      <ol class="scopes" id="scopes-list"></ol>
      <p class="small muted" id="scNote"></p>` },
  { file: 'timeline.html', title: 'Discoveries through time',
    desc: 'How many exoplanets were discovered each year since 1992, split by discovery method.',
    body: `<p class="sec-lede" id="tlLede"></p>
      <figure class="chartbox"><div id="tlChart"></div><div class="legend" id="tlLegend"></div></figure>` },
  { file: 'types.html', title: 'The kinds of planets out there',
    desc: 'Exoplanet types by size, from sub-Earths to super-Jupiters, with how many of each are known.',
    body: `<p class="sec-lede">Size is the first thing astronomers sort planets by. Pick a kind to browse it in the catalogue.</p>
      <div class="zoo" id="zoo"></div>` },
  { file: 'faq.html', title: 'Questions people ask',
    desc: 'Short answers about exoplanets: what they are, how we know their size and temperature, and whether life has been found.',
    body: `<p class="sec-lede">Short answers to the things people most often ask about planets around other stars.</p>
      <div class="faq" id="faqList"></div>` },
  { file: 'kids.html', title: 'Planet explorers: exoplanets for kids', script: 'js/kids.js', bodyClass: 'kids',
    desc: 'Exoplanets for kids: how big a planet is next to Earth, how much you would weigh there, how long a year lasts, and a game to spot a planet crossing its star.',
    body: `<p class="sec-lede">Thousands of planets circle other stars. Pick one and find out what it would be like to visit!</p>
      <div id="kids"></div>` },
  { file: 'help.html', title: 'Help find planets: citizen science', script: 'js/help.js',
    desc: 'Citizen science for exoplanets: help find new planets in NASA TESS data with Planet Hunters TESS, or time planets crossing their stars with NASA Exoplanet Watch.',
    body: HELP_BODY },
];

const more = (file) => `<section class="wrap more" aria-label="Keep exploring"><h2 class="h2">Keep exploring</h2><div class="more-grid">${
  NAV.filter(([f]) => f !== file).map(([href, label, blurb]) => `<a class="more-tile" href="${href}"><b>${esc(label)}</b><span>${esc(blurb)}</span></a>`).join('')}</div></section>`;

const page = (p) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)} · Exoplanet Atlas</title>
<meta name="description" content="${p.desc}">
<link rel="canonical" href="${SITE}${p.file}">
<meta property="og:url" content="${SITE}${p.file}">
<meta property="og:image" content="${SITE}img/share.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#070B1A">
<meta name="color-scheme" content="dark">
<meta property="og:title" content="${esc(p.title)} · Exoplanet Atlas">
<meta property="og:description" content="${p.desc}">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23070B1A'/%3E%3Ccircle cx='32' cy='32' r='14' fill='%23FFB454'/%3E%3Cellipse cx='32' cy='32' rx='26' ry='7' fill='none' stroke='%23EAF0FF' stroke-width='2.5' transform='rotate(-22 32 32)'/%3E%3C/svg%3E">
<link rel="stylesheet" href="css/style.css">
</head>
<body class="subpage ${p.bodyClass || ''}">
<a class="skip" href="#main">Skip to content</a>
<canvas id="sky" aria-hidden="true"></canvas>
<div class="veil" aria-hidden="true"></div>

${header(p.file)}

<main id="main">
  <section class="wrap page-head">
    <h1 class="h2 big-h">${esc(p.title)}</h1>
    ${p.body}
  </section>
  ${more(p.file)}
</main>

<footer class="foot wrap">
  <p class="credit">This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. This is an independent project and is not affiliated with NASA.</p>
</footer>

<script type="module" src="${p.script || 'js/learn-page.js'}"></script>
<noscript><p class="wrap">This page needs JavaScript to load the planet data.</p></noscript>
</body>
</html>
`;

for (const p of PAGES) fs.writeFileSync(p.file, page(p));

// keep the header in index.html in sync
let idx = fs.readFileSync('index.html', 'utf8');
idx = idx.replace(/<!--HEADER-->[\s\S]*?<!--\/HEADER-->/, header('index.html'));
fs.writeFileSync('index.html', idx);
console.log('wrote', PAGES.map((p) => p.file).join(', '), '+ index header');
