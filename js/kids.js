// Kids page: pick a planet and find out how big, how heavy, how old, how hot and how far,
// plus "Spot the planet" (find the star whose light dips) and a short quiz. Nothing is stored or sent.
import { hydrate } from './model.js';
import { Sky } from './sky.js';

const $ = (s, r = document) => r.querySelector(s);
const fmt = (x, d = 0) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d });
window.addEventListener('scroll', () => $('#bar').classList.toggle('scrolled', window.scrollY > 8), { passive: true });

const FAVES = ['Proxima Cen b', 'TRAPPIST-1 e', 'Kepler-22 b', '51 Peg b', 'WASP-12 b', 'HD 189733 b', 'Kepler-16 b', 'K2-18 b', '55 Cnc e', 'TOI-700 d', 'Kepler-452 b', 'HD 209458 b'];

// Things a child knows, for "if Earth were a marble…"
const BALLS = [[0.5, 'a grain of rice', '🍚'], [0.8, 'a pea', '🫛'], [1.3, 'a marble, just like Earth', '🔵'], [2.2, 'a grape', '🍇'], [3.5, 'a ping-pong ball', '🏓'], [6, 'a tennis ball', '🎾'], [9, 'an orange', '🍊'], [14, 'a football', '⚽'], [22, 'a basketball', '🏀'], [Infinity, 'a giant beach ball', '🏖️']];
const ball = (r) => BALLS.find(([max]) => r <= max);

function tempStory(c) {
  if (c < -150) return ['🥶', 'Colder than anywhere on Earth. Even the air would freeze into ice!'];
  if (c < -60) return ['❄️', 'Colder than the coldest night in Antarctica.'];
  if (c < 0) return ['🧊', 'Freezing! Water would turn to ice.'];
  if (c < 40) return ['🌤️', 'Not too hot, not too cold. Close to Earth’s temperatures!'];
  if (c < 100) return ['🥵', 'Hotter than the hottest desert on Earth.'];
  if (c < 330) return ['🔥', 'Hotter than boiling water. Hot enough to bake a cake!'];
  if (c < 1000) return ['🌋', 'Hot enough to melt lead.'];
  return ['☄️', 'So hot that rock would glow and melt, like lava.'];
}


// ---- Cartoon friends (original drawings, inline SVG: nothing to download)
const PIP = `<svg class="pip" viewBox="0 0 160 160" aria-hidden="true">
  <ellipse class="pip-ring-back" cx="80" cy="86" rx="74" ry="18" fill="none" stroke="#c4b5fd" stroke-width="7" transform="rotate(-14 80 86)"/>
  <circle cx="80" cy="80" r="50" fill="url(#pipG)"/>
  <defs><radialGradient id="pipG" cx="38%" cy="32%"><stop offset="0" stop-color="#ffe6b8"/><stop offset=".55" stop-color="#FFB454"/><stop offset="1" stop-color="#e2793a"/></radialGradient></defs>
  <circle cx="58" cy="62" r="6" fill="#e2793a" opacity=".35"/><circle cx="104" cy="104" r="8" fill="#e2793a" opacity=".3"/>
  <g class="pip-eyes"><ellipse cx="64" cy="76" rx="7" ry="9" fill="#1f2340"/><ellipse cx="96" cy="76" rx="7" ry="9" fill="#1f2340"/><circle cx="66.5" cy="72.5" r="2.6" fill="#fff"/><circle cx="98.5" cy="72.5" r="2.6" fill="#fff"/></g>
  <ellipse cx="52" cy="92" rx="8" ry="5" fill="#ff7a8a" opacity=".55"/><ellipse cx="108" cy="92" rx="8" ry="5" fill="#ff7a8a" opacity=".55"/>
  <path d="M68 96 Q80 108 92 96" fill="none" stroke="#1f2340" stroke-width="4" stroke-linecap="round"/>
  <path d="M8 114 Q80 140 152 78" fill="none" stroke="#c4b5fd" stroke-width="7" stroke-linecap="round" transform="rotate(-6 80 86)"/>
</svg>`;
const ASTRO = `<svg class="k-buddy astro" viewBox="0 0 100 120" aria-hidden="true">
  <rect x="30" y="58" width="40" height="40" rx="14" fill="#eef2ff"/><rect x="40" y="70" width="20" height="12" rx="3" fill="#93c5fd"/>
  <rect x="18" y="62" width="14" height="28" rx="7" fill="#e0e7ff" transform="rotate(20 25 76)"/><rect x="68" y="62" width="14" height="28" rx="7" fill="#e0e7ff" transform="rotate(-30 75 76)"/>
  <rect x="34" y="94" width="13" height="18" rx="6" fill="#e0e7ff"/><rect x="53" y="94" width="13" height="18" rx="6" fill="#e0e7ff"/>
  <circle cx="50" cy="38" r="26" fill="#eef2ff"/><rect x="31" y="27" width="38" height="24" rx="12" fill="#1e293b"/>
  <circle cx="42" cy="38" r="3" fill="#fff"/><circle cx="58" cy="38" r="3" fill="#fff"/><path d="M44 45 Q50 49 56 45" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="62" cy="31" r="3" fill="#fff" opacity=".6"/></svg>`;
const ROCKET = `<svg class="k-buddy rocket" viewBox="0 0 80 120" aria-hidden="true">
  <path class="flame" d="M30 92 Q40 122 50 92 Z" fill="#fbbf24"/><path class="flame" d="M34 92 Q40 110 46 92 Z" fill="#f97316"/>
  <path d="M40 6 C58 22 60 60 54 92 H26 C20 60 22 22 40 6 Z" fill="#f1f5f9"/><path d="M26 74 L12 96 H28 Z M54 74 L68 96 H52 Z" fill="#ef4444"/>
  <circle cx="40" cy="44" r="10" fill="#60a5fa" stroke="#334155" stroke-width="3"/><circle cx="37" cy="41" r="3" fill="#fff" opacity=".8"/>
  <path d="M30 20 Q40 4 50 20" fill="#ef4444"/></svg>`;
const ALIEN = `<svg class="k-buddy alien" viewBox="0 0 100 110" aria-hidden="true">
  <path d="M38 18 L32 4" stroke="#86efac" stroke-width="4" stroke-linecap="round"/><circle cx="31" cy="4" r="4" fill="#fde047"/>
  <path d="M62 18 L68 4" stroke="#86efac" stroke-width="4" stroke-linecap="round"/><circle cx="69" cy="4" r="4" fill="#fde047"/>
  <ellipse cx="50" cy="46" rx="34" ry="30" fill="#4ade80"/><ellipse cx="50" cy="92" rx="22" ry="16" fill="#4ade80"/>
  <ellipse cx="38" cy="44" rx="9" ry="11" fill="#fff"/><ellipse cx="62" cy="44" rx="9" ry="11" fill="#fff"/>
  <circle class="alien-eye" cx="40" cy="46" r="5" fill="#14213d"/><circle class="alien-eye" cx="64" cy="46" r="5" fill="#14213d"/>
  <path d="M40 60 Q50 70 60 60" stroke="#14532d" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="28" cy="58" rx="5" ry="3" fill="#f472b6" opacity=".6"/><ellipse cx="72" cy="58" rx="5" ry="3" fill="#f472b6" opacity=".6"/></svg>`;
const STARFACE = (cls = '') => `<svg class="k-star ${cls}" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4 L37 22 L56 23 L41 35 L46 54 L30 43 L14 54 L19 35 L4 23 L23 22 Z" fill="#fde047" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="30" r="2.5" fill="#78350f"/><circle cx="36" cy="30" r="2.5" fill="#78350f"/><path d="M25 37 Q30 41 35 37" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const SAYINGS = [
  (p) => `Hi! I'm Pip, a little planet. Let's visit ${p.name}!`,
  (p) => `Ooh, ${p.name}! Pack your space snacks! 🍪`,
  (p) => `${p.name} is waiting for us. Ready for take-off? 🚀`,
  (p) => `Let's find out about ${p.name}! Tap the cards!`,
];
function confetti(x, y) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#FFB454', '#4ade80', '#60a5fa', '#f472b6', '#fde047', '#c4b5fd'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('i'); c.className = 'k-confetti';
    c.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${(Math.random() - 0.5) * 320}px;--dy:${-120 - Math.random() * 180}px;--r:${Math.random() * 720}deg`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 1300);
  }
}

(async () => {
  const all = hydrate(await (await fetch('data/planets.json')).json());
  const seen = new Map(); for (const p of all) if (!seen.has(p.host) && p.ra != null && p.dec != null) seen.set(p.host, { ra: p.ra, dec: p.dec, teff: p.teff, dist: p.dist });
  new Sky($('#sky'), [...seen.values()]).start();

  const by = new Map(all.map((p) => [p.name, p]));
  const faves = FAVES.map((n) => by.get(n)).filter(Boolean);
  const rich = all.filter((p) => p.r != null && p.m != null && !p.r_est && p.per != null && p.teq != null && p.dist_ly != null);
  let cur = faves.find((p) => p.m != null && p.r != null) || rich[0];

  const root = $('#kids');
  root.innerHTML = `
    <div class="k-hero">
      <div class="k-pip-wrap">${PIP}</div>
      <div class="k-bubble" id="kBubble">Hi! I'm Pip, a little planet. Let's go exploring!</div>
      ${STARFACE('s1')}${STARFACE('s2')}${STARFACE('s3')}
    </div>
    <section class="k-pick" aria-label="Choose a planet">
      <h2 class="h2">1. Choose a planet</h2>
      <div class="k-chips" id="kChips">${faves.map((p) => `<button type="button" class="k-chip" data-n="${p.name}">${p.name}</button>`).join('')}<button type="button" class="k-chip k-rand" id="kRand">🎲 Surprise me!</button></div>
    </section>
    <h2 class="h2 k-now" id="kName"></h2>
    <div class="k-grid">
      <article class="k-card k-size"><h3>📏 How big is it?</h3><div class="k-balls" id="kBalls"></div><p id="kSize"></p></article>
      <article class="k-card k-weight">${ASTRO}<h3>⚖️ How much would you weigh?</h3><label>Your weight: <input type="number" id="kKg" value="30" min="5" max="150" inputmode="numeric"> kg</label><p class="k-big" id="kWeight"></p><p id="kWeightNote"></p></article>
      <article class="k-card k-age"><h3>🎂 How old would you be?</h3><label>Your age: <input type="number" id="kAge" value="10" min="1" max="100" inputmode="numeric"> years</label><p class="k-big" id="kAgeOut"></p><p id="kBday"></p></article>
      <article class="k-card k-temp"><h3>🌡️ Hot or cold?</h3><div class="k-thermo"><span id="kMerc"></span></div><p class="k-big" id="kTemp"></p><p id="kTempNote"></p></article>
      <article class="k-card k-far">${ROCKET}<h3>🚀 How far away?</h3><p class="k-big" id="kFar"></p><p id="kFarNote"></p></article>
    </div>
    <section class="k-spot" id="spot" aria-label="Spot the planet game">
      <h2 class="h2">2. Spot the planet!</h2>
      <p class="sec-lede">Telescopes watch how bright stars are. When a planet passes in front of its star, the star gets a tiny bit dimmer, again and again. <b>Which star has a planet?</b> Tap it!</p>
      <div class="k-curves" id="kCurves"></div>
      <p class="k-big" id="kSpotMsg">Score: 0</p>
      <p class="small muted">Scientists do this for real with NASA’s TESS telescope, and you can help them: see <a href="help.html">Help find planets</a>.</p>
    </section>
    <section class="k-quiz" aria-label="Quiz">
      <h2 class="h2">3. Quick quiz ${ALIEN}</h2>
      <div id="kQuiz"></div>
    </section>`;

  let say = 0;
  const show = (p) => {
    cur = p;
    const bub = $('#kBubble'); if (bub) { bub.textContent = SAYINGS[say++ % SAYINGS.length](p); bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop'); }
    document.querySelectorAll('.k-chip').forEach((b) => b.classList.toggle('on', b.dataset.n === p.name));
    $('#kName').innerHTML = `${p.name} <a class="link" href="index.html#planet=${encodeURIComponent(p.name)}">see it spin in 3D →</a>`;
    // size
    if (p.r != null) {
      const [, what, emo] = ball(p.r), px = (r) => Math.max(6, Math.min(150, 26 * Math.sqrt(r) * (r > 4 ? 1.4 : 1)));
      $('#kBalls').innerHTML = `<figure><span class="k-dot earth" style="--d:26px"></span><figcaption>Earth</figcaption></figure><figure><span class="k-dot" style="--d:${px(p.r)}px"></span><figcaption>${p.name}</figcaption></figure>`;
      $('#kSize').innerHTML = `${p.r < 1 ? 'Smaller than' : 'About ' + fmt(p.r, 1) + ' times as wide as'} Earth. If Earth were a marble, ${p.name} would be ${what} ${emo}${p.r_est ? ' (a size worked out from its weight)' : ''}.`;
    } else { $('#kBalls').innerHTML = ''; $('#kSize').textContent = 'Astronomers haven’t measured its size yet. Maybe you will one day!'; }
    weight(); age();
    // temperature
    if (p.teq != null) {
      const c = p.teq - 273.15, [emo, s] = tempStory(c);
      $('#kMerc').style.height = `${Math.max(4, Math.min(100, (c + 250) / 22))}%`;
      $('#kTemp').textContent = `${emo} About ${fmt(c)} °C`; $('#kTempNote').textContent = s;
    } else { $('#kMerc').style.height = '0'; $('#kTemp').textContent = '❓'; $('#kTempNote').textContent = 'Nobody knows its temperature yet.'; }
    // distance
    if (p.dist_ly != null) {
      const carYears = p.dist_ly * 9.4607e12 / 100 / 24 / 365.25;
      $('#kFar').textContent = `${fmt(p.dist_ly, p.dist_ly < 10 ? 1 : 0)} light-years`;
      $('#kFarNote').textContent = `Light, the fastest thing there is, takes ${fmt(p.dist_ly, p.dist_ly < 10 ? 1 : 0)} years to get there. In a car at 100 km/h, the trip would take about ${carYears >= 1e9 ? fmt(carYears / 1e9, 1) + ' billion' : fmt(carYears / 1e6, 0) + ' million'} years!`;
    } else { $('#kFar').textContent = '❓'; $('#kFarNote').textContent = 'Its distance hasn’t been measured yet.'; }
  };
  function weight() {
    const p = cur, kg = Math.max(0, Number($('#kKg').value) || 0);
    if (p.m != null && p.r != null && !p.r_est) {
      const g = p.m / (p.r * p.r);
      $('#kWeight').textContent = `You would feel like ${fmt(kg * g)} kg`;
      $('#kWeightNote').textContent = g > 1.15 ? `Gravity there pulls ${fmt(g, 1)} times harder than on Earth. Jumping would be really hard!` : g < 0.85 ? `Gravity there is weaker: you could jump much higher!` : `Almost the same as on Earth.`;
    } else { $('#kWeight').textContent = '❓'; $('#kWeightNote').textContent = 'To work this out we need its weight AND its size, and astronomers have only measured one of them. Try another planet!'; }
  }
  function age() {
    const p = cur, yrs = Math.max(0, Number($('#kAge').value) || 0);
    if (p.per != null) {
      const a = (yrs * 365.25) / p.per;
      $('#kAgeOut').textContent = a >= 1 ? `You'd be ${fmt(a, a < 10 ? 1 : 0)} years old! 🎉` : `You wouldn't even be 1 yet!`;
      $('#kBday').textContent = p.per < 2 ? `A year there lasts ${fmt(p.per * 24, 0)} hours, so you'd have a birthday almost every day!` : p.per < 365 ? `A year there lasts ${fmt(p.per, 0)} days, so birthdays come ${fmt(365.25 / p.per, 0)} times as often.` : `A year there lasts ${fmt(p.per / 365.25, 1)} Earth years. That's a long wait for cake!`;
    } else { $('#kAgeOut').textContent = '❓'; $('#kBday').textContent = 'Its year hasn’t been measured.'; }
  }
  $('#kChips').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) show(by.get(b.dataset.n)); });
  $('#kRand').addEventListener('click', () => show(rich[Math.floor(Math.random() * rich.length)]));
  $('#kKg').addEventListener('input', weight); $('#kAge').addEventListener('input', age);
  show(cur);

  // ---- Spot the planet: three stars, one has a planet passing in front of it
  let score = 0, tries = 0, answer = 0;
  function curve(hasPlanet) {
    const n = 140, out = [], period = 30 + Math.random() * 25, start = Math.random() * period, depth = 0.11 + Math.random() * 0.05, width = 3 + Math.random() * 2;
    for (let i = 0; i < n; i++) { let v = 1 + (Math.random() - 0.5) * 0.04; if (hasPlanet && ((i - start) % period + period) % period < width) v -= depth; out.push(v); }
    return out;
  }
  function round() {
    answer = Math.floor(Math.random() * 3);
    $('#kCurves').innerHTML = [0, 1, 2].map((i) => `<button type="button" class="k-curve" data-i="${i}" aria-label="Star ${i + 1}"><span>⭐ Star ${i + 1}</span><canvas width="560" height="110"></canvas></button>`).join('');
    document.querySelectorAll('.k-curve canvas').forEach((cv, i) => {
      const d = curve(i === answer), x = cv.getContext('2d'); x.strokeStyle = '#FFB454'; x.lineWidth = 2.2; x.beginPath();
      d.forEach((v, k) => { const px = (k / (d.length - 1)) * cv.width, py = cv.height * (0.18 + (1.06 - v) * 3.6); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    });
  }
  $('#kCurves').addEventListener('click', (e) => {
    const b = e.target.closest('.k-curve'); if (!b) return; tries++;
    if (+b.dataset.i === answer) { score++; { const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 20); } $('#kSpotMsg').textContent = `🎉 Yes! Star ${answer + 1} keeps dipping: a planet is passing in front of it. Score: ${score} of ${tries}`; b.classList.add('right'); setTimeout(round, 1600); }
    else { b.classList.add('wrong'); $('#kSpotMsg').textContent = `Not that one: its light only wiggles a little. Look for the star that dips down again and again! Score: ${score} of ${tries}`; }
  });
  round();

  // ---- Quiz
  const Q = [
    ['What is an exoplanet?', ['A planet that goes around a star other than our Sun', 'A planet made of ice', 'A dwarf planet like Pluto'], 0, 'Exo means “outside”: outside our Solar System.'],
    ['How do most planets get found?', ['Their star gets a tiny bit dimmer when they pass in front', 'Astronauts fly there', 'They glow in the dark'], 0, 'That dimming is called a transit. It’s the game above!'],
    ['Which is the closest known exoplanet to us?', ['Proxima Centauri b', '51 Pegasi b', 'Kepler-22b'], 0, 'It is about 4.2 light-years away, around our nearest neighbour star.'],
    ['How many planets has the TRAPPIST-1 star got?', ['7', '2', '12'], 0, 'Seven Earth-sized planets, all closer to their star than Mercury is to the Sun!'],
    ['A “hot Jupiter” is…', ['A giant planet very close to its star', 'A planet made of lava', 'Jupiter in summer'], 0, 'The first exoplanet found around a Sun-like star, 51 Pegasi b, is one.'],
  ];
  let qs = 0;
  $('#kQuiz').innerHTML = Q.map(([q, opts, , note], i) => `<div class="k-q" data-q="${i}"><p><b>${i + 1}.</b> ${q}</p><div>${opts.map((o, j) => ({ o, j })).sort(() => Math.random() - 0.5).map(({ o, j }) => `<button type="button" data-j="${j}">${o}</button>`).join('')}</div><p class="k-note" hidden>${note}</p></div>`).join('') + '<p class="k-big" id="kQs"></p>';
  $('#kQuiz').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-j]'); if (!b) return; const box = b.closest('.k-q'); if (box.classList.contains('done')) return;
    box.classList.add('done'); const ok = +b.dataset.j === Q[+box.dataset.q][2]; b.classList.add(ok ? 'right' : 'wrong'); if (!ok) box.querySelector('[data-j="0"]').classList.add('right');
    if (ok) { qs++; const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top); } box.querySelector('.k-note').hidden = false;
    const done = document.querySelectorAll('.k-q.done').length; if (done === Q.length) $('#kQs').textContent = qs === Q.length ? `⭐ ${qs} out of ${Q.length}! You're a real planet hunter!` : `You got ${qs} out of ${Q.length}. Great exploring!`;
  });
})();
