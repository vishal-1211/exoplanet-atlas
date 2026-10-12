// Writes the shared header into every page and generates the "learn" pages.
// Run:  node scripts/build-pages.mjs     (the generated files are committed, so hosting needs no build step)
import fs from 'fs';

import { SITE, ALL_PAGES, HI_FILES } from '../js/site.js';
import { translate } from '../js/i18n.js';
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


// The header is only the brand and a search button. js/nav.js builds the menu from js/site.js,
// so changing the menu never means rewriting every page.
const header = (file) => {
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
  <nav class="nav" id="nav" aria-label="Sections"><a href="index.html">Catalogue</a><a href="planets.html">All planets</a><a href="how.html">How planets are found</a></nav>
  ${search}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <span>Search</span><kbd aria-hidden="true">/</kbd>
  ${end}
</header>
<!--/HEADER-->`;
};


const STUDIED = [
  ['HD 209458 b', 'Hubble, 2001–2003', 'The first planet seen crossing its star (1999) was also the first to have an atmosphere detected: sodium in 2001, and later a huge cloud of hydrogen streaming away from it.'],
  ['HD 189733 b', 'Hubble, 2013', 'Its colour was measured from reflected light: a deep blue. The blue is thought to come from glassy particles in its air, not oceans. Water vapour has also been detected.'],
  ['WASP-39 b', 'JWST, 2022–2023', 'Webb found carbon dioxide in its atmosphere, the first clear detection of that gas on a planet around another star, and later sulphur dioxide, made by sunlight acting on the air.'],
  ['WASP-96 b', 'JWST, 2022', 'Webb’s first full spectrum of an exoplanet showed the fingerprint of water vapour and signs of clouds.'],
  ['WASP-76 b', 'VLT (ESPRESSO), 2020', 'Iron vapour was detected on its hot day side and not on its cooler night side, which fits iron condensing out and falling as rain. This one was measured from the ground.'],
  ['KELT-9 b', 'Ground and Hubble', 'Hotter than most stars’ surfaces, its day side is so hot that molecules break apart. Atoms of iron and titanium have been detected in its air.'],
  ['K2-18 b', 'JWST, 2023', 'Webb found methane and carbon dioxide in the air of this planet in its star’s habitable zone. A claimed signal of a sulphur molecule is disputed. Nobody has found evidence of life.'],
  ['TRAPPIST-1 b', 'JWST, 2023', 'Webb measured its heat and found no sign of a thick atmosphere. It looks like bare, hot rock. The next planet out, TRAPPIST-1 c, also shows no thick carbon-dioxide air.'],
  ['55 Cnc e', 'JWST, 2024', 'A lava world. Webb saw changes in its heat that may mean a thick atmosphere of gases from the rocky interior, but this is still being worked out.'],
];
const SEEN_BODY = `<p class="sec-lede">Nearly all exoplanets are found indirectly, from what they do to their star. A few are bright enough and far enough from their star to photograph directly. Others have had their air analysed by starlight filtered through it. This page lists both.</p>
      <h2 class="h2">Planets that were photographed</h2>
      <p class="muted" id="imgLede">Loading the list…</p>
      <div class="more-grid" id="imgList"></div>
      <p class="small muted">These are real detections of light from the planet, but they show a faint dot, not a surface. Every 3D picture on this site is an artist’s impression. Taken from the catalogue data.</p>
      <h2 class="h2">Atmospheres astronomers have studied</h2>
      <p class="sec-lede">When a planet crosses its star, a little starlight passes through the planet’s air. Gases take out particular colours, so a spectrum reveals what is there. These are well-known examples. This list is written by hand, not taken from the catalogue data, so check the telescope teams’ own pages for the latest results.</p>
      <div class="more-grid" id="studied">${STUDIED.map(([n, who, what]) => `<a class="more-tile" href="index.html#planet=${encodeURIComponent(n)}"><b>${n}</b><small class="muted">${who}</small><span>${what}</span></a>`).join('')}</div>`;

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
  { file: 'charts.html', title: 'Charts of every planet', script: 'js/charts-page.js',
    desc: 'Interactive charts of every known exoplanet: mass against radius, orbit time against radius, and more. Hover a dot to see the planet, click to open it.',
    body: `<p class="sec-lede">Every planet with a measured value, plotted. Hover or tap a dot to see which planet it is, then open it. Both axes can be switched.</p>
      <div class="cx-controls" id="cxControls"></div>
      <div class="cx-wrap"><canvas id="cx" role="img" aria-label="Scatter chart of exoplanets"></canvas><div id="cxTip" class="cx-tip" hidden></div></div>
      <div class="legend" id="cxLegend"></div>
      <p class="small muted" id="cxNote"></p>` },
  { file: 'systems.html', title: 'Star systems, to scale', script: 'js/systems-page.js',
    desc: 'See all the planets of a star side by side, drawn to scale on a log axis, with the habitable zone marked. Search any star or pick a system.',
    body: `<p class="sec-lede">Pick a star to see its planets laid out by distance, with the zone where starlight is in a range that could allow liquid water.</p>
      <div class="picker"><label class="search big"><span class="sr">Search for a star</span><input id="sysQ" type="search" autocomplete="off" spellcheck="false" placeholder="Search a star, e.g. TRAPPIST-1" data-ip="Search a star, e.g. TRAPPIST-1"></label><ul class="pick-list" id="sysPick" hidden></ul></div>
      <div id="sysOut"></div>
      <h2 class="h2">Systems with the most planets</h2>
      <div class="more-grid" id="sysTop"></div>` },
  { file: 'compare.html', title: 'Compare two planets', script: 'js/compare-page.js',
    desc: 'Compare any two exoplanets side by side: size, mass, year length, temperature, distance and a simple Earth-likeness score.',
    body: `<p class="sec-lede">Choose any two planets. Try a hot Jupiter and a small rocky world, or two planets of the same star.</p>
      <div class="cmp-pick"><div class="picker"><label class="search big"><span class="sr">First planet</span><input id="cmpA" type="search" autocomplete="off" spellcheck="false" placeholder="First planet, e.g. TRAPPIST-1 e"></label><ul class="pick-list" id="pickA" hidden></ul></div>
      <div class="picker"><label class="search big"><span class="sr">Second planet</span><input id="cmpB" type="search" autocomplete="off" spellcheck="false" placeholder="Second planet, e.g. 51 Peg b"></label><ul class="pick-list" id="pickB" hidden></ul></div></div>
      <div id="cmpOut"></div>` },
  { file: 'tonight.html', title: 'What can I see tonight?', script: 'js/tonight.js',
    desc: 'Which stars that have known planets are above your horizon right now, and where to look. Uses your location or a city you choose.',
    body: `<p class="sec-lede">You cannot see the planets themselves, but some of their stars are bright enough to see without a telescope. Choose where you are and when.</p>
      <div class="tn-controls" id="tnControls"></div>
      <div class="tn-grid"><canvas id="tnSky" class="tn-sky" role="img" aria-label="Map of the sky above you"></canvas><div id="tnList"></div></div>
      <p class="small muted" id="tnNote"></p>` },
  { file: 'seen.html', title: 'Planets we have seen, and atmospheres we have studied', script: 'js/seen-page.js',
    desc: 'Exoplanets that have been photographed directly, and well-known planets whose atmospheres were studied with Hubble, Webb and ground telescopes.',
    body: SEEN_BODY },
  { file: 'new.html', title: "What's new in the catalogue", script: 'js/new-page.js',
    extraHead: '<link rel="alternate" type="application/atom+xml" title="Exoplanet Atlas: new planets" href="feed.xml">',
    desc: 'New planets added to the catalogue each week, the newest discoveries by year, and an Atom feed to follow them.',
    body: `<p class="sec-lede" id="nwLede"></p>
      <div id="nwOut"></div>
      <p class="small muted">Follow along with the <a href="feed.xml">Atom feed</a> in any feed reader. The catalogue refreshes from the NASA Exoplanet Archive every Monday.</p>` },
  { file: 'data.html', title: 'Data, citation and sharing', script: 'js/data-page.js',
    desc: 'Download the exoplanet catalogue as CSV or JSON, cite the data, share a planet as a picture, or embed a planet card on your own page.',
    body: `<p class="sec-lede">The numbers come from the NASA Exoplanet Archive. You are welcome to use this version of them, with credit.</p>
      <h2 class="h2">Download</h2>
      <p id="dlRow"><button type="button" class="btn primary" id="dlCsv">Download CSV</button> <button type="button" class="btn" id="dlJson">Download JSON</button> <span class="muted small" id="dlInfo"></span></p>
      <p class="small muted">Includes the values as shown on this site, with estimates marked in the "estimated" columns. For the original, go to the <a href="https://exoplanetarchive.ipac.caltech.edu/" rel="noopener">NASA Exoplanet Archive</a>.</p>
      <h2 class="h2">For developers</h2>
      <p class="sec-lede">The same data is available as plain files that update with every refresh. They can be read from any website (CORS is open). Please keep the acknowledgement below if you publish something with them.</p>
      <ul class="pl-links"><li><a href="api/v1/planets.json">api/v1/planets.json</a>: every planet, one object each, with a short description of each field in <code>meta.columns</code></li>
      <li><a href="api/v1/planets.csv">api/v1/planets.csv</a>: the same as a spreadsheet</li>
      <li><a href="data/changes.json">data/changes.json</a>: what changed in each refresh</li>
${fs.existsSync('data/candidates.json') ? `      <li><a href="data/candidates.json">data/candidates.json</a>: unconfirmed TESS and Kepler candidates (compact table: <code>cols</code> names the columns, <code>rows</code> holds the values)</li>` : ''}
      <li><a href="feed.xml">feed.xml</a>: Atom feed of new planets</li></ul>
      <h2 class="h2">Cite</h2>
      <pre class="cite" id="citeText"></pre>
      <p><button type="button" class="btn" id="citeCopy">Copy citation</button> <button type="button" class="btn" id="bibCopy">Copy BibTeX</button> <span class="muted small" id="citeMsg" role="status"></span></p>
      <h2 class="h2">Share a planet</h2>
      <p class="sec-lede">Open any planet in the catalogue and use “Save a picture card” to make an image to post, or “Copy link to this planet”.</p>
      <h2 class="h2">Embed a planet on your site</h2>
      <div class="picker"><label class="search big"><span class="sr">Planet to embed</span><input id="embQ" type="search" autocomplete="off" spellcheck="false" placeholder="Planet name, e.g. Proxima Cen b" value="Proxima Cen b"></label><ul class="pick-list" id="embPick" hidden></ul></div>
      <pre class="cite" id="embCode"></pre>
      <p><button type="button" class="btn" id="embCopy">Copy embed code</button></p>
      <div id="embPreview"></div>` },
  { file: 'classroom.html', title: 'Classroom kit: exoplanet activities', script: 'js/classroom.js', bodyClass: 'classroom',
    desc: 'Printable exoplanet activities for the classroom, built from real data: a scale model, year lengths, weight on other worlds and reading a transit graph.',
    body: `<p class="sec-lede">Five short activities that use real planets. Print this page (or save it as a PDF), hand it out, and use the answer key at the end. Numbers are computed from the catalogue.</p>
      <p class="noprint"><button type="button" class="btn primary" id="printBtn">Print this page</button></p>
      <div id="clsOut"></div>` },
  { file: 'candidates.html', title: 'Planet candidates: signals not yet confirmed', script: 'js/candidates-page.js',
    desc: 'Thousands of possible planets found by TESS and Kepler that astronomers have not yet confirmed. Search and sort the list.',
    body: `<p class="sec-lede" id="cdLede">Loading the candidate list…</p>
      <aside class="callout"><b>These are not confirmed planets.</b> A candidate is a dip in a star's light that looks like a planet crossing it. Many turn out to be something else, such as two stars orbiting each other. They are listed here because astronomers (and volunteers on the <a href="help.html">Help find planets</a> page) follow them up. Confirmed planets are in the <a href="index.html">catalogue</a>.</aside>
      <div id="cdControls"></div>
      <div id="cdOut"></div>
      <p class="small muted">From the NASA Exoplanet Archive's TESS Project Candidates and Kepler cumulative tables. Size and temperature are estimates from the transit and the star, not measurements of the planet itself.</p>` },
  { file: 'next.html', title: 'What is coming next in the search for planets', script: 'js/help.js',
    desc: 'The telescopes and missions that will change exoplanet science next: Roman, PLATO, Ariel, Gaia data releases and the Habitable Worlds Observatory.',
    body: `<p class="sec-lede">The catalogue grows every week, and the next few years bring instruments built for new kinds of discovery. Dates are from the agencies' own announcements as of October 2026 and can change.</p>
      <div class="help-grid">
        <article class="help-card"><div class="help-tag">Launched August 2026</div><h2 class="h2">Nancy Grace Roman Space Telescope</h2><p>NASA's wide-field telescope launched on 30 August 2026 on a Falcon Heavy. It is travelling to a point about 1.5 million km from Earth, a journey of around three months, followed by about three months of testing. First public images are targeted for early 2027. For planets it will watch millions of stars towards the centre of the Milky Way for the brief brightening caused by gravitational microlensing, which can find planets that other methods cannot, and it carries a coronagraph to test blocking starlight to photograph planets.</p><p><a class="link" href="https://science.nasa.gov/mission/roman-space-telescope/" rel="noopener">NASA's Roman page ↗</a></p></article>
        <article class="help-card"><div class="help-tag">Planned: March 2027</div><h2 class="h2">PLATO</h2><p>ESA's mission has 26 cameras and will stare at huge patches of sky for years. Its goal is to find Earth-sized planets in the habitable zone of Sun-like stars, measure their sizes, and use tiny changes in starlight to learn the stars' ages. It is planned to launch on an Ariane 6 rocket.</p><p><a class="link" href="https://www.esa.int/PLATO" rel="noopener">ESA's PLATO page ↗</a></p></article>
        <article class="help-card"><div class="help-tag">Planned: 2029</div><h2 class="h2">Ariel</h2><p>ESA's Ariel will not look for new planets. It will study the atmospheres of about 1,000 known ones, from rocky worlds to gas giants, to make a chemical census. It will sit at the same distant point as Webb and scan the whole sky roughly every three months.</p><p><a class="link" href="https://www.esa.int/Science_Exploration/Space_Science/Ariel_factsheet" rel="noopener">ESA's Ariel page ↗</a></p></article>
        <article class="help-card"><div class="help-tag">Operating now</div><h2 class="h2">Webb, TESS and CHEOPS</h2><p>The James Webb Space Telescope reads the air of planets as starlight passes through it. TESS keeps surveying nearly the whole sky for transits and feeds the candidate list. ESA's CHEOPS measures the exact sizes of planets already known. All three keep adding to the catalogue.</p><p><a class="link" href="seen.html">Atmospheres studied so far →</a> <a class="link" href="candidates.html">Candidates →</a></p></article>
        <article class="help-card"><div class="help-tag">Data from Gaia</div><h2 class="h2">Gaia's star wobbles</h2><p>ESA's Gaia finished observing and was retired in 2025, but its measurements of tiny star movements are still being turned into planet discoveries. Astronomers expect its later data releases to reveal many giant planets that tug their stars sideways. Check ESA for the release date.</p><p><a class="link" href="https://www.cosmos.esa.int/web/gaia/release" rel="noopener">Gaia data releases ↗</a></p></article>
        <article class="help-card"><div class="help-tag">Concept: no launch date</div><h2 class="h2">Habitable Worlds Observatory</h2><p>NASA's plan for a large space telescope built to photograph Earth-sized planets around Sun-like stars and search their air for gases that could signal life. It is still being designed, and no launch date is set. Very large ground telescopes in Chile are also due late this decade.</p><p><a class="link" href="https://science.nasa.gov/astrophysics/programs/habitable-worlds-observatory/" rel="noopener">NASA's HWO page ↗</a></p></article>
      </div>
      <p class="small muted">This page is written by hand. This site's catalogue updates itself every day; this list does not, so check the agency pages above for current schedules.</p>` },
  { file: 'help.html', title: 'Help find planets: citizen science', script: 'js/help.js',
    desc: 'Citizen science for exoplanets: help find new planets in NASA TESS data with Planet Hunters TESS, or time planets crossing their stars with NASA Exoplanet Watch.',
    body: HELP_BODY },
];

const more = (file) => `<section class="wrap more" aria-label="Keep exploring"><h2 class="h2" data-i>Keep exploring</h2><div class="more-grid">${
  ALL_PAGES.filter(([f]) => f !== file).map(([href, label, blurb]) => `<a class="more-tile" href="${href}"><b data-i>${esc(label)}</b><span data-i>${esc(blurb)}</span></a>`).join('')}</div></section>`;

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
${p.extraHead || ''}
</head>
<body class="subpage ${p.bodyClass || ''}">
<a class="skip" href="#main">Skip to content</a>
<canvas id="sky" aria-hidden="true"></canvas>
<div class="veil" aria-hidden="true"></div>

${header(p.file)}

<main id="main">
  <section class="wrap page-head">
    <h1 class="h2 big-h" data-i>${esc(p.title)}</h1>
    ${p.body.replace(/<p class="sec-lede">([^<&]+)<\/p>/, '<p class="sec-lede" data-i>$1</p>')}
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

// Hindi copies under /hi/, so search engines can index them. Text marked data-i is translated here;
// js/i18n.js (which reads <html lang="hi">) covers the parts the page script builds.
// The translations have not been checked by a native speaker.
const hiPage = (html, file) => {
  const url = SITE + file, hiUrl = SITE + 'hi/' + file;
  return html.replace('<html lang="en">', '<html lang="hi">')
    .replace('<head>\n<meta charset="utf-8">', '<head>\n<meta charset="utf-8">\n<base href="../">')
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${hiUrl}">\n<link rel="alternate" hreflang="en" href="${url}">\n<link rel="alternate" hreflang="hi" href="${hiUrl}">\n<link rel="alternate" hreflang="x-default" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${hiUrl}">`)
    .replace(/<(h1|h2|p|b|span|a|button|summary|label|li)([^>]*) data-i>([^<]*)</g, (m, tag, attrs, text) => {
      const hi = translate(text.replace(/&amp;/g, '&'));
      return `<${tag}${attrs} data-i="${text.replace(/"/g, '&quot;')}">${hi === text.replace(/&amp;/g, '&') ? text : esc(hi)}<`;
    });
};
const enAlt = (html, file) => html.replace(/<link rel="canonical" href="[^"]*">/, (m) => `${m}\n<link rel="alternate" hreflang="en" href="${SITE}${file}">\n<link rel="alternate" hreflang="hi" href="${SITE}hi/${file}">\n<link rel="alternate" hreflang="x-default" href="${SITE}${file}">`);
fs.mkdirSync('hi', { recursive: true });
for (const p of PAGES) {
  let html = page(p);
  if (HI_FILES.includes(p.file)) {
    fs.writeFileSync('hi/' + p.file, hiPage(html, p.file));
    html = enAlt(html, p.file);
  }
  fs.writeFileSync(p.file, html);
}

// Embeddable single-planet card (not listed in the sitemap, and not for search engines)
fs.writeFileSync('embed.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Planet card · Exoplanet Atlas</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body class="embed">
<div id="card" class="e-card">Loading…</div>
<script type="module" src="js/embed.js"></script>
</body>
</html>
`);

// keep the header in index.html in sync
let idx = fs.readFileSync('index.html', 'utf8');
idx = idx.replace(/<!--HEADER-->[\s\S]*?<!--\/HEADER-->/, header('index.html'));
fs.writeFileSync('index.html', idx);
console.log('wrote', PAGES.map((p) => p.file).join(', '), '+ index header');
