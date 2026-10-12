// The columns offered for download and in the public data files (api/v1). Used by the data page and scripts/build-api.mjs.
import { typeLabel } from './model.js';

const BASE = [
  ['planet', 'Planet name, as NASA writes it', (p) => p.name], ['host_star', 'Name of the star it orbits', (p) => p.host],
  ['discovery_year', 'Year the discovery was announced', (p) => p.year], ['discovery_method', 'How it was found', (p) => p.method],
  ['discovery_facility', 'Telescope or survey that found it', (p) => p.facility], ['type_in_this_atlas', 'Size class used on this site', (p) => typeLabel(p.type)],
  ['distance_light_years', 'Distance from the Sun', (p) => p.dist_ly], ['radius_earth', 'Radius in Earth radii (NASA value, may be calculated from mass)', (p) => p.rade],
  ['radius_estimated_from_mass', 'yes if this site had to estimate the radius', (p) => (p.r_est ? 'yes' : '')], ['mass_earth', 'Mass (or minimum mass) in Earth masses', (p) => p.masse],
  ['mass_radius_one_calculated', 'yes if mass and radius fit a standard relation exactly, so one was probably calculated from the other', (p) => (p.mr_derived ? 'yes' : '')],
  ['orbital_period_days', 'Length of a year in days', (p) => p.per], ['semi_major_axis_au', 'Orbit size in AU', (p) => p.sma], ['eccentricity', 'Orbit shape, 0 is a circle', (p) => p.ecc],
  ['equilibrium_temperature_k', 'Temperature if it only absorbed and re-radiated starlight, in K', (p) => p.eqt], ['starlight_earth', 'Starlight received, Earth = 1', (p) => p.insol],
  ['star_temperature_k', 'Star surface temperature in K', (p) => p.teff], ['star_radius_sun', 'Star radius in Suns', (p) => p.srad], ['star_mass_sun', 'Star mass in Suns', (p) => p.smass],
  ['ra_deg', 'Right ascension in degrees', (p) => p.ra], ['dec_deg', 'Declination in degrees', (p) => p.dec], ['status_debated', 'yes if NASA flags the planet as controversial', (p) => (p.controv ? 'yes' : '')],
];
const EXTRA = [['radeu', 'radius_err_upper'], ['radel', 'radius_err_lower'], ['masseu', 'mass_err_upper'], ['massel', 'mass_err_lower'], ['peru', 'period_err_upper'], ['perl', 'period_err_lower'],
  ['eqtu', 'temperature_err_upper'], ['eqtl', 'temperature_err_lower'], ['vmag', 'star_v_magnitude'], ['reftxt', 'source_paper'], ['refurl', 'source_url'], ['hd', 'hd_name'], ['hip', 'hip_name'], ['tic', 'tic_id'], ['gaia', 'gaia_dr3_id']];

export function columns(all) {
  const extra = EXTRA.filter(([k]) => all.some((p) => p[k] != null)).map(([k, h]) => [h, h.replace(/_/g, ' '), (p) => p[k]]);
  return [...BASE, ...extra];
}
const q = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export const toCSV = (all, cols) => [cols.map((c) => c[0]).join(','), ...all.map((p) => cols.map((c) => q(c[2](p))).join(','))].join('\n') + '\n';
export const toObjects = (all, cols) => all.map((p) => Object.fromEntries(cols.map((c) => [c[0], c[2](p) ?? null])));
