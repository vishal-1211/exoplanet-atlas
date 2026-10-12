// Shared data model: turns the compact planets.json into rich planet objects.
// Used by the website AND by scripts/test.mjs, so there is one source of truth.

export const COLS = ['name', 'host', 'snum', 'pnum', 'method', 'year', 'facility', 'locale',
  'per', 'sma', 'ecc', 'rade', 'masse', 'insol', 'eqt', 'spec', 'teff', 'srad', 'smass',
  'dist', 'ra', 'dec', 'controv'];

// Optional columns. They are present only when the data file was built from a NASA download that included them.
export const EXTRA_COLS = ['radeu', 'radel', 'masseu', 'massel', 'peru', 'perl', 'eqtu', 'eqtl', 'vmag', 'refurl', 'reftxt'];

export const RE_PER_RJ = 11.209;      // Jupiter radius in Earth radii
export const ME_PER_MJ = 317.83;      // Jupiter mass in Earth masses
export const LY_PER_PC = 3.26156;
const AU_PER_RSUN = 0.00465047;
const EARTH_DENSITY = 5.51;           // g/cm3

export const TYPES = [
  { id: 'subearth', label: 'Sub-Earth', blurb: 'Smaller than Earth' },
  { id: 'earth', label: 'Earth-sized', blurb: 'About the size of Earth' },
  { id: 'superearth', label: 'Super-Earth', blurb: 'Bigger than Earth, smaller than Neptune' },
  { id: 'mininep', label: 'Mini-Neptune', blurb: 'Small planets with thick gas layers' },
  { id: 'neptune', label: 'Neptune-like', blurb: 'Ice-giant sized worlds' },
  { id: 'giant', label: 'Gas giant', blurb: 'Saturn and Jupiter-like worlds' },
  { id: 'superjup', label: 'Super-Jupiter', blurb: 'Over 13 Jupiter masses; may be brown dwarfs' },
  { id: 'unknown', label: 'Not identified', blurb: 'Size and mass not measured' },
];

export const TEMPS = [
  { id: 'cold', label: 'Cold', hint: 'below 230 K (-43 °C)' },
  { id: 'temperate', label: 'Temperate', hint: '230 to 330 K' },
  { id: 'warm', label: 'Warm', hint: '330 to 700 K' },
  { id: 'hot', label: 'Hot', hint: '700 to 1,500 K' },
  { id: 'ultrahot', label: 'Ultra-hot', hint: 'above 1,500 K' },
  { id: 'unknown', label: 'Not identified', hint: '' },
];

export const typeLabel = (id) => (TYPES.find((t) => t.id === id) || TYPES[7]).label;
export const tempLabel = (id) => (TEMPS.find((t) => t.id === id) || TEMPS[5]).label;

// Chen & Kipping (2017) mass-radius relation, used only when a planet has a
// mass but no measured radius (about 50 planets).
export function radiusFromMass(m) {
  if (m < 2.04) return 1.008 * Math.pow(m, 0.279);
  if (m < 131.6) return 0.808 * Math.pow(m, 0.589);
  return 17.74 * Math.pow(m, -0.044);
}

export function classifyRadius(r) {
  if (r < 0.8) return 'subearth';
  if (r < 1.25) return 'earth';
  if (r < 2.0) return 'superearth';
  if (r < 3.5) return 'mininep';
  if (r < 6.0) return 'neptune';
  return 'giant';
}

export function classifyTemp(t) {
  if (t == null) return 'unknown';
  if (t < 230) return 'cold';
  if (t < 330) return 'temperate';
  if (t < 700) return 'warm';
  if (t < 1500) return 'hot';
  return 'ultrahot';
}

export function starClass(teff) {
  if (teff == null) return null;
  if (teff >= 30000) return { letter: 'O', name: 'blue giant-type (O)' };
  if (teff >= 10000) return { letter: 'B', name: 'blue-white (B)' };
  if (teff >= 7500) return { letter: 'A', name: 'white (A)' };
  if (teff >= 6000) return { letter: 'F', name: 'yellow-white (F)' };
  if (teff >= 5200) return { letter: 'G', name: 'Sun-like yellow (G)' };
  if (teff >= 3900) return { letter: 'K', name: 'orange (K)' };
  if (teff >= 2300) return { letter: 'M', name: 'red dwarf (M)' };
  return { letter: 'L', name: 'ultracool dwarf' };
}

// Approximate colour of a glowing body of a given temperature (Kelvin) as [r,g,b] 0..255
export function starRGB(teff) {
  const t = Math.max(1000, Math.min(40000, teff || 5772)) / 100;
  const clamp = (v) => Math.max(0, Math.min(255, v));
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)].map(Math.round);
}

export function hydrate(data) {
  const { methods, facilities, rows } = data;
  const cols = data.cols || COLS;
  return rows.map((r, i) => {
    const p = { id: i };
    for (const c of EXTRA_COLS) p[c] = null;
    cols.forEach((c, j) => { p[c] = r[j] === undefined ? null : r[j]; });
    p.method = methods[p.method] || 'Not identified';
    p.facility = facilities[p.facility] || null;
    derive(p);
    return p;
  });
}

function derive(p) {
  p.search = (p.name + ' ' + p.host).toLowerCase();
  p.dist_ly = p.dist != null ? p.dist * LY_PER_PC : null;

  // Orbit: fill gaps with Kepler's third law when the star's mass is known.
  p.sma_est = false; p.per_est = false;
  if (p.sma == null && p.per != null && p.smass != null) {
    const y = p.per / 365.25; p.sma = Math.cbrt(p.smass * y * y); p.sma_est = true;
  } else if (p.per == null && p.sma != null && p.smass != null) {
    p.per = 365.25 * Math.sqrt(Math.pow(p.sma, 3) / p.smass); p.per_est = true;
  }

  // Size
  p.r = p.rade; p.r_est = false;
  if (p.r == null && p.masse != null) { p.r = radiusFromMass(p.masse); p.r_est = true; }
  p.m = p.masse;

  // Temperature: NASA's equilibrium temperature, else estimate from the star and orbit.
  p.teq = p.eqt; p.teq_est = false;
  if (p.teq == null && p.teff && p.srad && p.sma) {
    p.teq = p.teff * Math.sqrt((p.srad * AU_PER_RSUN) / (2 * p.sma)); p.teq_est = true;
  }
  // Sunlight received, relative to Earth
  p.S = p.insol; p.S_est = false;
  if (p.S == null && p.teff && p.srad && p.sma) {
    const L = p.srad * p.srad * Math.pow(p.teff / 5772, 4);
    p.S = L / (p.sma * p.sma); p.S_est = true;
  }

  // Type
  const mj = p.masse != null ? p.masse / ME_PER_MJ : null;
  if (mj != null && mj > 13) p.type = 'superjup';
  else if (p.r == null) p.type = 'unknown';
  else p.type = classifyRadius(p.r);
  p.hotJupiter = (p.type === 'giant' || p.type === 'superjup') && p.per != null && p.per < 10;
  p.tempClass = classifyTemp(p.teq);

  // Bulk properties (only when both size and mass were measured)
  // NASA's composite table fills a missing mass or radius using a standard mass-radius relation. A planet whose
  // two values sit exactly on that curve (about 4 in 5 of those with both) has only ONE real measurement, so its
  // density and gravity would just be the relation talking back. We leave those out.
  p.mr_derived = p.rade != null && p.masse != null && Math.abs(p.rade / radiusFromMass(p.masse) - 1) < 0.006;
  p.density = null; p.gravity = null;
  if (p.rade != null && p.masse != null && !p.mr_derived) {
    p.density = EARTH_DENSITY * p.masse / Math.pow(p.rade, 3);
    p.gravity = p.masse / (p.rade * p.rade);
  }

  // Habitable zone: an optimistic range of starlight, for planets small enough to be rocky.
  const small = p.r != null ? p.r <= 2.0 : (p.masse != null && p.masse <= 10);
  p.hz = !!(p.S != null && p.S >= 0.25 && p.S <= 1.7 && small && p.type !== 'unknown');

  p.star = starClass(p.teff);
  p.esi = esi(p);
  p.slug = slug(p.name);
}

// URL-safe name, used for the static page of each planet.
export const slug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');

// A simple Earth-likeness score from size and temperature only (0 to 1). It says nothing about
// atmosphere, water or life, and uses the planet's equilibrium temperature, not its surface temperature.
export function esi(p) {
  if (p.r == null || p.teq == null) return null;
  return (1 - Math.abs(p.r - 1) / (p.r + 1)) * (1 - Math.abs(p.teq - 270) / (p.teq + 270));
}

// Kepler candidates are named by a Kepler Object of Interest number, e.g. KOI-1843.03.
export const isKOI = (p) => /^KOI-/.test(p.name);
export const KOI_NOTE = 'KOI stands for Kepler Object of Interest: a numbered signal found in data from the Kepler space telescope. The digits after the dot count the signals found around the same star.';

// Page on the NASA Exoplanet Archive for a planet.
export const archiveUrl = (p) => 'https://exoplanetarchive.ipac.caltech.edu/overview/' + encodeURIComponent(p.name);

// Format a value with its uncertainty, e.g. "1.27 (+0.05, -0.04)". Returns '' when no uncertainty is known.
export function plusMinus(upper, lower, digits = 2) {
  if (upper == null || lower == null) return '';
  const u = Math.abs(upper), l = Math.abs(lower);
  if (!u && !l) return '';
  if (Math.abs(u - l) <= 0.05 * Math.max(u, l)) return `± ${fmt(Math.max(u, l), digits)}`;
  return `+${fmt(u, digits)} / −${fmt(l, digits)}`;
}

// How a planet should look: a plain description that planet3d.js turns into a picture.
// Colours are chosen from the planet's size class and temperature. NOTHING here is a photograph.
export function look(p) {
  const T = p.teq;
  const hot = T != null && T >= 1500;
  if (p.type === 'giant' || p.type === 'superjup') {
    let c, name;
    if (T == null) { c = ['#c9a46b', '#8d6a3f', '#ecd9ac']; name = 'banded gas giant'; }
    else if (T < 150) { c = ['#6fb3c9', '#3b7a99', '#c8e6ef']; name = 'cold, blue-green gas giant'; }
    else if (T < 500) { c = ['#d9bf8f', '#a98055', '#f1e3c3']; name = 'pale, banded gas giant'; }
    else if (T < 1000) { c = ['#b8774a', '#7a4a30', '#e0b48a']; name = 'warm, rust-coloured gas giant'; }
    else if (T < 2000) { c = ['#4a3340', '#1d1520', '#9a5560']; name = 'dark, scorching gas giant'; }
    else { c = ['#2a1b2e', '#0d0810', '#ff8a50']; name = 'glowing, ultra-hot gas giant'; }
    return { kind: 'gas', colors: c, glow: hot ? Math.min(1, (T - 1500) / 1500 + 0.3) : (T != null && T >= 1000 ? 0.15 : 0), bands: 1, name };
  }
  if (p.type === 'neptune' || p.type === 'mininep') {
    let c, name;
    if (T == null) { c = ['#6fa0d6', '#3f6aa8', '#d6e8ff']; name = 'blue ice-giant-like world'; }
    else if (T < 300) { c = ['#4f8fd6', '#2c5aa0', '#cfe6ff']; name = 'cold blue Neptune-like world'; }
    else if (T < 800) { c = ['#a3b8a0', '#6f8a8c', '#e6dcb0']; name = 'hazy, warm Neptune-like world'; }
    else if (T < 1500) { c = ['#bdae95', '#80725f', '#e8d9bd']; name = 'hot, hazy Neptune-like world'; }
    else { c = ['#3a2c38', '#17101a', '#ff8a50']; name = 'glowing, ultra-hot Neptune-like world'; }
    return { kind: 'gas', colors: c, glow: hot ? 0.6 : 0, bands: 0.45, name };
  }
  // Rocky sizes
  if (hot) return { kind: 'lava', colors: ['#1a1210', '#3a2218', '#ff6a1f'], glow: 1, name: 'molten lava world' };
  if (p.type === 'subearth') return { kind: 'airless', colors: ['#8c8a86', '#5b5955', '#b6b3ad'], glow: 0, name: 'small, airless-looking rocky world' };
  if (T == null) return { kind: 'rock', colors: ['#8b7d6f', '#5e5249', '#b3a493'], glow: 0, name: 'rocky world (temperature not identified)' };
  if (T >= 700) return { kind: 'scorched', colors: ['#2b1d18', '#6b3a22', '#c8642b'], glow: 0.25, name: 'scorched rocky world' };
  if (T >= 330) return { kind: 'desert', colors: ['#c58a52', '#8f5a32', '#e8c690'], glow: 0, name: 'warm, dry-looking rocky world' };
  if (T >= 230) return { kind: 'ocean', colors: ['#1f5fa8', '#3f7d3a', '#f4f7fb'], glow: 0, name: 'temperate rocky world (shown with oceans and clouds as one possibility)' };
  return { kind: 'ice', colors: ['#cfe3f3', '#8fb2d0', '#f7fbff'], glow: 0, name: 'frozen rocky world' };
}

export function lookReason(p) {
  const l = look(p);
  const bits = [];
  if (p.r != null) bits.push(`${p.r_est ? 'an estimated' : 'a measured'} size of ${fmt(p.r, 2)}× Earth's radius`);
  if (p.teq != null) bits.push(`${p.teq_est ? 'an estimated' : 'a'} temperature of about ${fmt(p.teq, 0)} K`);
  const why = bits.length ? ' based on ' + bits.join(' and ') : ' because very little is known about it';
  return `Artist's impression: drawn as a ${l.name}${why}. Real surface details are not known.`;
}

// ---------- helpers ----------
export function fmt(x, digits = 1) {
  if (x == null || Number.isNaN(x)) return 'Not identified';
  const abs = Math.abs(x);
  if (abs >= 1000) return Math.round(x).toLocaleString('en-US');
  if (abs >= 100) return x.toFixed(Math.min(digits, 1)).replace(/\.0$/, '');
  if (abs >= 10) return x.toFixed(Math.min(digits, 1)).replace(/\.0$/, '');
  if (abs >= 1) return x.toFixed(digits).replace(/\.?0+$/, '');
  if (abs === 0) return '0';
  if (abs >= 0.01) return x.toFixed(Math.max(digits, 2)).replace(/\.?0+$/, '');
  return x.toPrecision(2);
}

export function rankOf(planets, p, key, ascending) {
  // position of p among planets that have a value for `key` (1 = first)
  const v = p[key];
  if (v == null) return null;
  let better = 0, total = 0;
  for (const q of planets) {
    const w = q[key];
    if (w == null) continue;
    total++;
    if (ascending ? w < v : w > v) better++;
  }
  return { rank: better + 1, total };
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Colour for a temperature in Kelvin: cold blue, through pale and amber, to hot red.
const RAMP = [[100, [79, 123, 255]], [250, [126, 214, 255]], [400, [255, 229, 154]], [800, [255, 180, 84]], [1500, [255, 122, 69]], [2500, [255, 77, 106]]];
export function tempColor(T) {
  if (T == null) return '#6b7595';
  const t = Math.max(RAMP[0][0], Math.min(RAMP[RAMP.length - 1][0], T));
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i], f = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(',')})`;
    }
  }
  return 'rgb(255,77,106)';
}

// Fraction of its star's light a planet blocks when it crosses in front (needs a measured radius and star radius).
export function transitDepth(p) {
  if (p.rade == null || !p.srad) return null;
  return Math.pow((p.rade * 0.0091577) / p.srad, 2);   // Earth radius / Sun radius
}
