// Generates the "details" table and the "interesting facts" for a planet purely from its data.
// A small set of hand-written editor's notes covers famous planets.
import { fmt, rankOf, ordinal, typeLabel, tempLabel, look, transitDepth, RE_PER_RJ, ME_PER_MJ } from './model.js';

const NI = 'Not identified';

export const HOW_FOUND = {
  'Transit': 'Astronomers watched the star and noticed its light dip slightly each time the planet passed in front of it.',
  'Radial Velocity': "The planet's gravity makes its star wobble. Astronomers measured that tiny back-and-forth motion in the star's light.",
  'Microlensing': "The planet's gravity briefly bent and brightened the light of a more distant star lined up behind it. This kind of alignment never repeats, so the planet cannot be re-observed this way.",
  'Imaging': "The planet was photographed directly, by blocking out the glare of its star.",
  'Transit Timing Variations': 'Gravity from other planets nudged the timing of a known planet crossing its star. Those timing shifts revealed this one.',
  'Eclipse Timing Variations': 'Tiny changes in the timing of eclipses in a double star revealed an extra, unseen object tugging on it.',
  'Orbital Brightness Modulation': "Subtle brightness changes of the star over the planet's orbit revealed it.",
  'Pulsar Timing': 'Slight irregularities in the clock-like radio pulses of a pulsar (the dense remnant of a dead star) revealed planets orbiting it.',
  'Astrometry': "Astronomers measured the tiny shifts in the star's position on the sky as the planet tugged on it.",
  'Pulsation Timing Variations': 'Changes in the regular pulsing of a star revealed the pull of an orbiting planet.',
  'Disk Kinematics': "The motion of gas in a young star's disk revealed a planet carving its way through it.",
};

// Hand-written notes for well-known planets (keyed by NASA's planet name).
export const CURATED = {
  '51 Peg b': "The first planet found around a Sun-like star (1995). The discovery earned Michel Mayor and Didier Queloz the 2019 Nobel Prize in Physics and opened the era of 'hot Jupiters'.",
  'PSR B1257+12 c': 'Among the very first confirmed planets outside our Solar System (1992), found around a pulsar, the leftover core of an exploded star.',
  'PSR B1257+12 d': 'Among the very first confirmed planets outside our Solar System (1992), found around a pulsar, the leftover core of an exploded star.',
  'PSR B1257+12 b': 'A tiny planet, only about as massive as our Moon, orbiting a pulsar. One of the lightest planets known.',
  'PSR B1620-26 b': "Nicknamed 'Methuselah': one of the oldest known planets, roughly 12 billion years old, living in a dense cluster of ancient stars.",
  'Proxima Cen b': 'The closest known planet to our Sun, orbiting in the habitable zone of the red dwarf Proxima Centauri. That star sends out powerful flares, which may strip a planet of its air.',
  "Teegarden's Star b": 'A nearby, Earth-sized world around a small red dwarf, rated among the most Earth-like planets by size and temperature estimates.',
  'Kepler-452 b': "Nicknamed 'Earth's cousin' when announced in 2015: a year of about 385 days around a Sun-like star. Whether it is rocky is unknown.",
  '55 Cnc e': "A 'lava world': so close to its star that its day-side is thought to be molten rock.",
  'HD 189733 b': 'In 2013 its colour was measured: a deep cobalt blue. The blue is thought to come from glassy silicate particles in the atmosphere, not from oceans.',
  'WASP-12 b': "Stretched into an egg shape by its star's gravity and slowly spiralling inward. It is expected to be torn apart in a few million years.",
  'Kepler-16 b': "Nicknamed 'Tatooine': it circles two stars at once. Found in 2011, it was the first confirmed planet orbiting a pair of stars.",
  'KELT-9 b': "One of the hottest giant planets known, hotter than the surface of many stars. Its star is much hotter than the Sun.",
  'HD 209458 b': "The first planet seen crossing in front of its star (1999) and the first with an atmosphere detected. Nicknamed 'Osiris'.",
  'GJ 1214 b': 'A candidate water-rich world: its low density suggests a thick envelope of water or steam over a rocky core. This is not confirmed.',
  'HR 8799 b': 'One of four giant planets photographed directly around the young star HR 8799, among the first multi-planet systems ever seen in pictures.',
  'HR 8799 c': 'One of four giant planets photographed directly around the young star HR 8799, among the first multi-planet systems ever seen in pictures.',
  'HR 8799 d': 'One of four giant planets photographed directly around the young star HR 8799, among the first multi-planet systems ever seen in pictures.',
  'HR 8799 e': 'One of four giant planets photographed directly around the young star HR 8799, among the first multi-planet systems ever seen in pictures.',
  'bet Pic b': 'Photographed directly around the young star Beta Pictoris, which is wrapped in a huge disc of dust and debris.',
  '2MASS J12073346-3932539 b': 'Widely regarded as the first planet-mass object to be directly photographed (2004). It orbits a brown dwarf, a failed star.',
  'Kepler-186 f': 'The first Earth-sized planet found in the habitable zone of another star (2014).',
  'Kepler-22 b': 'The first planet confirmed by Kepler inside the habitable zone of a Sun-like star (2011).',
  'Kepler-10 b': "The first confirmed rocky planet found by NASA's Kepler telescope (2011).",
  'CoRoT-7 b': 'Among the first confirmed rocky planets (2009), a scorched world with a year of about 20 hours.',
  'HD 80606 b': 'Its orbit is stretched into a long oval, and astronomers have watched it heat up sharply as it swings close to its star.',
  'K2-18 b': 'Water vapour was reported in its atmosphere in 2019. Later claims about other molecules are still being debated.',
  'LHS 1140 b': 'A rocky super-Earth in the habitable zone of a red dwarf, and a leading target for studies of its atmosphere.',
  'TOI-700 d': 'One of the first Earth-sized planets in a habitable zone found by NASA\'s TESS telescope (2020).',
  'Kepler-1649 c': "An Earth-sized planet in its star's habitable zone, found in 2020 in archived Kepler data that had been overlooked.",
  'WASP-76 b': 'Its night side may have iron rain: iron vaporised on the scorching day side is carried by winds to the cooler night side and condenses.',
};
const TRAPPIST = 'One of seven roughly Earth-sized planets orbiting the tiny, cool star TRAPPIST-1, about 40 light-years away. At least three of them orbit in or near its habitable zone.';

export function editorNote(p) {
  if (CURATED[p.name]) return CURATED[p.name];
  if (p.host === 'TRAPPIST-1') return TRAPPIST;
  return null;
}

// ---------- formatting helpers ----------
export function fmtDuration(days) {
  if (days == null) return NI;
  if (days < 1) return `${fmt(days * 24, 1)} hours`;
  if (days < 400) return `${fmt(days, 1)} days`;
  const y = days / 365.25;
  if (y < 1000) return `${fmt(y, 1)} years`;
  return `${fmt(y, 0)} years`;
}
const kelvinC = (k) => `${fmt(k, 0)} K (${fmt(k - 273.15, 0)} °C)`;
const times = (x, unit) => `${fmt(x, 2)}× ${unit}`;

// ---------- the details table ----------
export function details(p) {
  const radiusNote = p.r_est ? ' (estimated from mass)' : '';
  const rows = [
    ['Type', typeLabel(p.type) + (p.hotJupiter ? ' (a "hot Jupiter")' : '')],
    ['Discovered', p.year != null ? String(p.year) : NI],
    ['Discovery method', p.method],
    ['Discovered with', p.facility ? p.facility + (p.locale === 'Space' ? ' (space-based)' : p.locale === 'Ground' ? ' (ground-based)' : '') : NI],
    ['Distance from Earth', p.dist_ly != null ? `${fmt(p.dist_ly, 1)} light-years` : NI],
    ['Radius', p.r != null ? `${times(p.r, "Earth")} · ${times(p.r / RE_PER_RJ, 'Jupiter')}${radiusNote}` : NI],
    ['Mass', p.m != null ? `${times(p.m, 'Earth')} · ${times(p.m / ME_PER_MJ, 'Jupiter')}` : NI],
    ['Density', p.density != null ? `${fmt(p.density, 2)} g/cm³ (Earth: 5.51)` : NI],
    ['Length of a year', p.per != null ? fmtDuration(p.per) + (p.per_est ? ' (estimated)' : '') : NI],
    ['Distance from its star', p.sma != null ? `${fmt(p.sma, 3)} AU (Earth: 1)${p.sma_est ? ' (estimated)' : ''}` : NI],
    ['Orbit shape (eccentricity)', p.ecc != null ? fmt(p.ecc, 2) + ' (0 = circle)' : NI],
    ['Temperature', p.teq != null ? kelvinC(p.teq) + (p.teq_est ? ', estimated' : ', equilibrium') : NI],
    ['Starlight received', p.S != null ? `${times(p.S, 'what Earth gets')}${p.S_est ? ' (estimated)' : ''}` : NI],
    ['Host star', p.host + (p.star ? `, ${p.star.name} star` : '')],
    ['Star temperature', p.teff != null ? `${fmt(p.teff, 0)} K` : NI],
    ['Planets known in this system', p.pnum != null ? String(p.pnum) : NI],
    ['Sky position (RA, Dec)', `${fmt(p.ra, 3)}°, ${fmt(p.dec, 3)}°`],
  ];
  return rows;
}

// ---------- the interesting facts ----------
export function facts(p, all) {
  const out = [];
  const N = all.length;

  // How long a year lasts
  if (p.per != null) {
    if (p.per < 1) out.push(`A year here is shorter than an Earth day. It lasts just ${fmtDuration(p.per)}.`);
    else if (p.per < 365) out.push(`One year here lasts ${fmtDuration(p.per)}, so about ${fmt(365.25 / p.per, 1)} of its years fit into a single Earth year.`);
    else if (p.per < 365 * 2) out.push(`One year here lasts ${fmtDuration(p.per)}, similar to an Earth year.`);
    else out.push(`One year here lasts ${fmtDuration(p.per)}, so a single orbit takes ${fmt(p.per / 365.25, 1)} times longer than Earth's.`);
  }

  // Distance and light travel time
  if (p.dist_ly != null) {
    const r = rankOf(all, p, 'dist_ly', true);
    const when = p.dist_ly < 10 ? fmt(p.dist_ly, 1) : fmt(p.dist_ly, 0);
    let s = `It is ${fmt(p.dist_ly, 1)} light-years away. The light we see from its star left ${when} years ago.`;
    if (r && r.rank === 1) s += ` It is the closest of all ${N.toLocaleString('en-US')} known planets.`;
    else if (r && r.rank <= 50) s += ` That makes it the ${ordinal(r.rank)} closest of the ${N.toLocaleString('en-US')} known planets.`;
    out.push(s);
  }

  // Size
  if (p.r != null && !p.r_est) {
    let c;
    if (p.r < 0.95) c = `smaller than Earth (${times(p.r, "Earth's radius")})`;
    else if (p.r < 1.1) c = "almost exactly Earth's size";
    else if (p.r < 6) c = `${times(p.r, "Earth's radius")}`;
    else c = `${times(p.r, "Earth's radius")}, or ${times(p.r / RE_PER_RJ, "Jupiter's")}`;
    out.push(`Its radius is ${c}.`);
    const rr = rankOf(all, p, 'rade', false);
    if (rr && rr.rank <= 20) out.push(`It is the ${ordinal(rr.rank)} largest planet in the catalogue by radius.`);
    const rs = rankOf(all, p, 'rade', true);
    if (rs && rs.rank <= 20) out.push(`It is the ${ordinal(rs.rank)} smallest planet in the catalogue by radius.`);
  }

  const dep = transitDepth(p);
  if (dep != null && dep > 1e-6 && dep < 0.5) out.push(`Seen edge-on, it would block about ${fmt(dep * 100, 2)}% of its star's light as it passes in front.`);

  // Mass and gravity
  if (p.m != null) {
    if (p.m < 0.1) out.push(`Its mass is only ${times(p.m, "Earth's")}, lighter than Mars.`);
    else if (p.m >= ME_PER_MJ * 13) out.push(`At ${times(p.m / ME_PER_MJ, "Jupiter's mass")}, it is heavy enough that it may really be a brown dwarf (a failed star).`);
    else if (p.m >= ME_PER_MJ * 0.5) out.push(`It weighs ${times(p.m / ME_PER_MJ, "Jupiter")} in mass (${times(p.m, 'Earth')}).`);
    else out.push(`It is ${times(p.m, "Earth's mass")}.`);
  }
  if (p.gravity != null && p.r < 2.5) {
    const g = p.gravity < 0.92 || p.gravity > 1.08 ? `about ${fmt(p.gravity, 1)}× Earth's` : "close to Earth's";
    out.push(`If it has a solid surface, gravity there would be ${g}, so a 70 kg person would feel like ${fmt(70 * p.gravity, 0)} kg.`);
  }
  if (p.density != null) {
    if (p.density < 1) out.push(`Its average density is ${fmt(p.density, 2)} g/cm³, lower than water. If there were an ocean big enough, it would float.`);
    else if (p.density > 8 && p.r < 3) out.push(`Its average density is ${fmt(p.density, 1)} g/cm³, denser than Earth. It may have an unusually large metal core.`);
  }

  // Temperature
  if (p.teq != null) {
    const T = p.teq, k = p.teq_est ? 'estimated' : 'equilibrium';
    let c;
    if (T > 1811) c = 'hot enough to melt iron (1,811 K)';
    else if (T > 1300) c = 'hotter than most lava on Earth';
    else if (T > 373) c = 'above the boiling point of water at sea level on Earth';
    else if (T >= 273) c = 'between the freezing and boiling points of water on Earth. Whether it actually has liquid water depends on an atmosphere we do not know about';
    else c = 'below the freezing point of water';
    out.push(`Its ${k} temperature is ${kelvinC(T)}, ${c}.`);
  }
  if (p.S != null) {
    if (p.S > 1000) out.push(`It receives about ${fmt(p.S, 0)} times as much starlight as Earth does.`);
    else if (p.S > 1.5) out.push(`It receives ${fmt(p.S, 1)} times as much starlight as Earth does.`);
    else if (p.S < 0.1) out.push(`It receives only ${fmt(p.S * 100, 1)}% of the starlight Earth gets.`);
  }

  // Orbit
  if (p.sma != null) {
    if (p.sma < 0.39) out.push(`It orbits at ${fmt(p.sma, 3)} AU, closer to its star than Mercury is to the Sun (0.39 AU).`);
    else if (p.sma > 30) out.push(`It orbits at ${fmt(p.sma, 0)} AU, farther from its star than Neptune is from the Sun (30 AU).`);
    if (p.sma < 0.1) out.push('A planet this close to its star is probably tidally locked, with one side always facing the star, like the Moon facing Earth.');
  }
  if (p.ecc != null && p.ecc >= 0.5) {
    out.push(`Its orbit is a stretched oval (eccentricity ${fmt(p.ecc, 2)}). It is ${fmt((1 + p.ecc) / (1 - p.ecc), 0)} times farther from its star at the farthest point than at the closest, so its seasons are extreme.`);
  }
  if (p.hz) out.push('It orbits where starlight is in a range that could allow liquid water on a rocky planet. That does not mean it is habitable: its atmosphere and surface are unknown.');

  // Star and system
  if (p.star) out.push(`It orbits ${p.host}, a ${p.star.name} star at ${fmt(p.teff, 0)} K.`);
  if (p.pnum > 1) out.push(`${p.host} has ${p.pnum} known planets.`);
  if (p.snum > 1) out.push(`${p.host} is part of a system with ${p.snum} stars.`);

  // Discovery
  if (p.year != null) {
    const same = all.filter((q) => q.year === p.year).length;
    if (p.year <= 1995) out.push(`It was discovered in ${p.year}, when only a handful of planets outside our Solar System were known.`);
    else out.push(`It was one of ${same.toLocaleString('en-US')} planets discovered in ${p.year}.`);
  }
  if (p.controv) out.push("NASA flags this planet's status as debated in the scientific literature, so its details may change.");
  return out;
}

// Order facts so the most striking ones come first, and cap the count.
export function topFacts(p, all, max = 8) {
  const list = facts(p, all);
  const note = editorNote(p);
  const arr = note ? [note, ...list] : list;
  return arr.slice(0, max + (note ? 1 : 0));
}

export function summaryLine(p) {
  const bits = [typeLabel(p.type)];
  if (p.tempClass !== 'unknown') bits.push(tempLabel(p.tempClass).toLowerCase());
  return bits.join(' · ');
}

export function lookFor(p) { return look(p); }
