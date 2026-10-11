// Sanity checks for the data model and fact generator. Run: node scripts/test.mjs
import { readFileSync } from 'node:fs';
import { hydrate, TYPES } from '../js/model.js';
import { facts, details, topFacts, CURATED } from '../js/facts.js';

const data = JSON.parse(readFileSync(new URL('../data/planets.json', import.meta.url)));
const P = hydrate(data);
let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.error('FAIL:', msg); } };

check(P.length === data.count && P.length > 5000, `planet count ${P.length}`);
const typeIds = new Set(TYPES.map((t) => t.id));
check(P.every((p) => typeIds.has(p.type)), 'every planet has a valid type');

// No fact or detail line may contain garbage text.
const bad = /NaN|undefined|null|Infinity|\[object/;
let nFacts = 0;
for (const p of P) {
  for (const f of facts(p, P)) { nFacts++; if (bad.test(f)) check(false, `${p.name}: bad fact "${f}"`); }
  for (const [k, v] of details(p)) if (bad.test(v)) check(false, `${p.name}: bad detail ${k} = ${v}`);
}
console.log(`Checked ${nFacts.toLocaleString()} generated facts across ${P.length} planets.`);

// Every hand-written note must point at a planet that exists in the data.
const names = new Set(P.map((p) => p.name));
for (const n of Object.keys(CURATED)) check(names.has(n), `curated note for missing planet "${n}"`);

// Spot checks against the raw values.
const by = (n) => P.find((p) => p.name === n);
const peg = by('51 Peg b');
check(peg && peg.year === 1995 && peg.method === 'Radial Velocity', '51 Peg b discovery');
check(peg.type === 'giant' && peg.hotJupiter, '51 Peg b is a hot Jupiter');
const prox = by('Proxima Cen b');
check(prox.dist_ly > 4.2 && prox.dist_ly < 4.3, `Proxima distance ${prox.dist_ly}`);
check(prox.hz, 'Proxima b in habitable zone');
const earthish = P.filter((p) => p.type === 'earth').length;
check(earthish > 100, 'Earth-sized planets exist');

for (const n of ['51 Peg b', 'Proxima Cen b', 'TRAPPIST-1 e', 'HD 80606 b', '55 Cnc e']) {
  const p = by(n); console.log('\n' + n); topFacts(p, P).forEach((f) => console.log('  -', f));
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
