// Friendly names for stars and planets, used by search and the "tonight" page.
// NASA writes star names in catalogue shorthand ("alf Tau"); people search for "Aldebaran" or "Gliese 876".
export const GREEK = { alf: 'Alpha', bet: 'Beta', gam: 'Gamma', del: 'Delta', eps: 'Epsilon', zet: 'Zeta', eta: 'Eta', tet: 'Theta', iot: 'Iota', kap: 'Kappa', lam: 'Lambda', mu: 'Mu', nu: 'Nu', xi: 'Xi', omi: 'Omicron', pi: 'Pi', rho: 'Rho', sig: 'Sigma', tau: 'Tau', ups: 'Upsilon', phi: 'Phi', chi: 'Chi', psi: 'Psi', ome: 'Omega' };
export const GEN = { And: 'Andromedae', Ari: 'Arietis', Boo: 'Boötis', Cep: 'Cephei', Cet: 'Ceti', Cnc: 'Cancri', CrB: 'Coronae Borealis', Dra: 'Draconis', Eri: 'Eridani', Gem: 'Geminorum', Ind: 'Indi', Leo: 'Leonis', Lib: 'Librae', Oct: 'Octantis', Oph: 'Ophiuchi', Pic: 'Pictoris', Psc: 'Piscium', Ser: 'Serpentis', Tau: 'Tauri', UMa: 'Ursae Majoris', UMi: 'Ursae Minoris', Vir: 'Virginis', Aql: 'Aquilae', Com: 'Comae Berenices', Peg: 'Pegasi', Her: 'Herculis', Cas: 'Cassiopeiae', Lyr: 'Lyrae', Cyg: 'Cygni', Per: 'Persei', Ori: 'Orionis' };
export const PROPER = { 'alf Tau': 'Aldebaran', 'alf Ari': 'Hamal', 'bet UMi': 'Kochab', 'gam Cep': 'Errai', 'iot Dra': 'Edasich', 'bet Cnc': 'Tarf', 'eps Tau': 'Ain', 'bet Pic': 'Beta Pictoris', 'tau Cet': 'Tau Ceti', 'omi UMa': 'Muscida' };
// NASA writes star names in catalogue shorthand ("alf Tau"); show the usual name.
export const pretty = (h) => {
  const m = h.match(/^([a-z]{2,3})(\d)? ([A-Za-z]+)( [A-Z])?$/);
  const full = m && GREEK[m[1]] && GEN[m[3]] ? `${GREEK[m[1]]}${m[2] ? '¹²³⁴'[m[2] - 1] || m[2] : ''} ${GEN[m[3]]}${m[4] || ''}` : h;
  return PROPER[h] && PROPER[h] !== full ? `${PROPER[h]} (${full})` : full;
};


// Everyday or official names, keyed by NASA's star (host) name or planet name.
const COMMON = {
  'Proxima Cen': 'Proxima Centauri', 'GJ 411': 'Lalande 21185', 'GJ 273': "Luyten's Star", 'GJ 887': 'Lacaille 9352', 'eps Eri': 'Epsilon Eridani Ran',
  '51 Peg': 'Helvetios', '55 Cnc': 'Copernicus Rho Cancri', 'tau Cet': 'Tau Ceti', 'bet Pic': 'Beta Pictoris', 'HR 8799': 'HR8799',
  '51 Peg b': 'Dimidium', '55 Cnc e': 'Janssen', '55 Cnc b': 'Galileo', '55 Cnc c': 'Brahe', '55 Cnc d': 'Lipperhey', '55 Cnc f': 'Harriot',
  'eps Eri b': 'AEgir', 'HD 209458 b': 'Osiris', 'Wolf 1061': 'GJ 628', 'TRAPPIST-1': 'TRAPPIST 1 Trappist', "Barnard's star": 'Barnard GJ 699',
};

// One lowercase string of every other name a planet is known by, so search finds it.
export function aliasText(p) {
  const bits = [pretty(p.host), COMMON[p.host], COMMON[p.name], p.hd, p.hip, p.tic && 'TIC ' + p.tic, p.gaia];
  const g = p.host.match(/^(?:GJ|Gl)\s?(\S+)/); if (g) bits.push('Gliese ' + g[1], 'GJ ' + g[1], 'Gl ' + g[1]);
  return bits.filter(Boolean).join(' ');
}
