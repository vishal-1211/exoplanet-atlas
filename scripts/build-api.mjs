// Writes the public data files: api/v1/planets.json and api/v1/planets.csv.  Run after build-data.
import fs from 'node:fs';
import { hydrate } from '../js/model.js';
import { columns, toCSV, toObjects } from '../js/export.js';
import { SITE } from '../js/site.js';

const data = JSON.parse(fs.readFileSync('data/planets.json', 'utf8'));
const all = hydrate(data);
const cols = columns(all);
fs.mkdirSync('api/v1', { recursive: true });
fs.writeFileSync('api/v1/planets.json', JSON.stringify({
  meta: {
    name: 'Exoplanet Atlas data', version: 1, generated: data.generated, count: all.length, source: data.source,
    acknowledgement: 'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.',
    documentation: SITE + 'data.html', columns: cols.map((c) => ({ name: c[0], description: c[1] })),
  },
  planets: toObjects(all, cols),
}));
fs.writeFileSync('api/v1/planets.csv', toCSV(all, cols));
console.log(`api/v1: ${all.length} planets, ${cols.length} columns`);
