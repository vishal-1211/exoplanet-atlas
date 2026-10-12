// Writes the parts of index.html that come from data (planet count, intro text, the shelves of planets, the
// refresh date) straight into the file, so the page has real content before any script runs and for search
// engines. Run after build-data:  node scripts/build-home.mjs
import fs from 'node:fs';
import { hydrate } from '../js/model.js';
import { shelvesHTML, heroTexts } from '../js/shelves.js';
import { heroCurve } from '../js/charts.js';
import { ALL_PAGES } from '../js/site.js';

const data = JSON.parse(fs.readFileSync('data/planets.json', 'utf8'));
const ALL = hydrate(data);
const { n, lede, cap } = heroTexts(ALL);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let html = fs.readFileSync('index.html', 'utf8');
const sub = (re, rep) => { if (!re.test(html)) throw new Error('marker not found: ' + re); html = html.replace(re, () => rep); };

sub(/<span id="heroCount">[^<]*<\/span>/, `<span id="heroCount">${n.toLocaleString('en-US')}</span>`);
sub(/<p class="lede" id="lede">[\s\S]*?<\/p>/, `<p class="lede" id="lede">${esc(lede)}</p>`);
sub(/<figcaption id="curveCap">[\s\S]*?<\/figcaption>/, `<figcaption id="curveCap">${esc(cap)}</figcaption>`);
sub(/<div id="heroCurve">[\s\S]*?<\/div>\n/, `<div id="heroCurve">${heroCurve()}</div>\n`);
sub(/<span id="updated">[^<]*<\/span>/, `<span id="updated">${data.generated}</span>`);
sub(/<!--SHELVES-->[\s\S]*?<!--\/SHELVES-->/, `<!--SHELVES-->${shelvesHTML(ALL)}<!--/SHELVES-->`);
sub(/<!--LEARN-->[\s\S]*?<!--\/LEARN-->/, `<!--LEARN-->
  <section class="wrap more" id="learnMore" aria-label="Keep exploring">
    <h2 class="h2" data-i>Keep exploring</h2>
    <div class="more-grid">${ALL_PAGES.filter(([f]) => f !== 'index.html').map(([href, label, blurb]) => `<a class="more-tile" href="${href}"><b data-i>${esc(label)}</b><span data-i>${esc(blurb)}</span></a>`).join('')}</div>
  </section>
  <!--/LEARN-->`);
html = html.replace(/"dateModified": "[^"]*"/, `"dateModified": "${data.generated}"`);
fs.writeFileSync('index.html', html);
console.log(`index.html: ${n} planets, shelves and links written (data from ${data.generated})`);
