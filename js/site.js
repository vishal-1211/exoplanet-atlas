// One list of every page on the site. The header menu, the "Keep exploring" tiles, the sitemap and the
// page generator all read this, so adding a page means editing only this file (and scripts/build-pages.mjs).
export const SITE = 'https://exoplanet-atlas.macrocosm.workers.dev/';

export const HOME = ['index.html', 'Catalogue', 'The full list of planets, with search and filters.'];

export const GROUPS = [
  { id: 'explore', label: 'Explore', items: [
    ['charts.html', 'Charts', 'Plot size, mass, orbit and more for every planet.'],
    ['systems.html', 'Star systems', 'See the planets of one star side by side, drawn to scale.'],
    ['compare.html', 'Compare', 'Put two planets next to each other.'],
    ['tonight.html', 'Tonight', 'Which stars with planets are above you right now.'],
    ['candidates.html', 'Candidates', 'Signals from TESS and Kepler that are not yet confirmed as planets.'],
    ['seen.html', 'Seen and studied', 'Planets that were photographed, and atmospheres that were measured.'],
    ['new.html', "What's new", 'Planets added to the catalogue recently.'],
  ] },
  { id: 'learn', label: 'Learn', items: [
    ['how.html', 'How planets are found', 'The six methods astronomers use, with a diagram of each.'],
    ['next.html', "What's next", 'The missions and telescopes about to change the search.'],
    ['telescopes.html', 'Telescopes', 'The space telescopes and observatories behind the discoveries.'],
    ['timeline.html', 'Timeline', 'How many planets were found each year, and by which method.'],
    ['types.html', 'Planet types', 'From sub-Earths to super-Jupiters, and how many of each exist.'],
    ['faq.html', 'Q&A', 'Short answers to common questions.'],
    ['kids.html', 'Kids', 'How big, how hot, how heavy would you be? Planets for young explorers.'],
    ['classroom.html', 'Classroom kit', 'Printable activities for teachers, built from real planet data.'],
  ] },
  { id: 'join', label: 'Take part', items: [
    ['help.html', 'Help find planets', 'Real projects where anyone can help discover and track exoplanets.'],
    ['data.html', 'Data and sharing', 'Download the data, cite it, share a planet or embed one on your site.'],
  ] },
];

export const ALL_PAGES = [HOME, ...GROUPS.flatMap((g) => g.items)];

// Pages that also exist in Hindi under /hi/ (everything except the catalogue itself)
export const HI_FILES = ALL_PAGES.map(([f]) => f).filter((f) => f !== 'index.html');
