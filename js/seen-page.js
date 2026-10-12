// "Seen and studied": directly imaged planets come from the catalogue; the studied-atmosphere list is written into the page.
import { boot, $, esc, planetHref } from './boot.js';
import { typeLabel, fmt } from './model.js';

const { all } = await boot();
const imaged = all.filter((p) => p.method === 'Imaging' && !p.controv).sort((a, b) => (a.dist_ly ?? 1e9) - (b.dist_ly ?? 1e9));
$('#imgLede').textContent = `${imaged.length} planets in the catalogue were found by direct imaging, listed from nearest to farthest.`;
$('#imgList').innerHTML = imaged.slice(0, 48).map((p) => `<a class="more-tile" href="${planetHref(p)}"><b>${esc(p.name)}</b><span>${esc(typeLabel(p.type))}${p.year ? ', found ' + p.year : ''}. ${p.dist_ly != null ? fmt(p.dist_ly, 0) + ' light-years away' : 'Distance not identified'}${p.m != null ? `, about ${fmt(p.m / 317.83, 1)} times Jupiter's mass` : ''}.</span></a>`).join('')
  + (imaged.length > 48 ? `<p class="small muted">Showing the nearest 48 of ${imaged.length}. Search the catalogue and choose “Found by: Imaging” for all of them.</p>` : '');
