// A tiny card for embedding one planet in another page: <iframe src=".../embed.html?planet=NAME">.
import { hydrate, look, typeLabel, fmt } from './model.js';
import { fmtDuration } from './facts.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const name = new URLSearchParams(location.search).get('planet') || 'Proxima Cen b';
const box = document.getElementById('card');
try {
  const all = hydrate(await (await fetch('data/planets.json')).json());
  const p = all.find((x) => x.name === name);
  if (!p) throw new Error('not found');
  const c = look(p).colors;
  const row = (k, v) => `<div><span>${k}</span><b>${esc(v)}</b></div>`;
  box.innerHTML = `<i class="orb" style="background:radial-gradient(circle at 32% 30%, ${c[2]}, ${c[0]} 55%, ${c[1]})"></i>
    <div class="e-main"><h1>${esc(p.name)}</h1><p>${esc(typeLabel(p.type))}${p.year ? ', found in ' + p.year : ''}</p>
    <div class="e-grid">${row('Distance', p.dist_ly != null ? fmt(p.dist_ly, 1) + ' light-years' : 'Not identified')}${row('One year', p.per != null ? fmtDuration(p.per) : 'Not identified')}${row('Size', p.r != null ? fmt(p.r, 2) + '× Earth' : 'Not identified')}${row('Temperature', p.teq != null ? fmt(p.teq, 0) + ' K' : 'Not identified')}</div>
    <a href="index.html#planet=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">See it turn in 3D on Exoplanet Atlas</a></div>`;
} catch {
  box.innerHTML = `<div class="e-main"><h1>${esc(name)}</h1><p>This planet could not be loaded.</p><a href="index.html" target="_blank" rel="noopener">Open Exoplanet Atlas</a></div>`;
}
