// Builds the header menu from js/site.js. The header in each HTML file is only a brand and a search
// button, so changing the menu never means rewriting thousands of pages.
import { HOME, GROUPS } from './site.js';
import { t, lang, setLang, applyLang } from './i18n.js';

const here = (location.pathname.split('/').pop() || 'index.html');
const base = document.querySelector('base') ? '' : '';            // planet pages set <base href="../">
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cur = (f) => (f === here || (f === 'index.html' && here === '') ? ' aria-current="page"' : '');
const groupHere = (g) => g.items.some(([f]) => f === here);
const CARET = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

const nav = document.getElementById('nav');
const bar = document.getElementById('bar');
if (nav && bar) {
  nav.innerHTML = `<a href="${base}${HOME[0]}"${cur(HOME[0])}>${esc(t(HOME[1]))}</a>` + GROUPS.map((g) => `
    <div class="nav-g${groupHere(g) ? ' here' : ''}">
      <button type="button" class="nav-b" aria-expanded="false" aria-controls="menu-${g.id}">${esc(t(g.label))}${CARET}</button>
      <div class="nav-menu" id="menu-${g.id}" hidden>${g.items.map(([f, label, blurb]) =>
        `<a href="${f}"${cur(f)}><b>${esc(t(label))}</b><span>${esc(t(blurb))}</span></a>`).join('')}</div>
    </div>`).join('');

  // language button + phone menu button, placed just before the search button
  const tools = document.createElement('div');
  tools.className = 'bar-tools';
  tools.innerHTML = `<button type="button" class="langbtn" id="langBtn" aria-label="${lang() === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}">${lang() === 'hi' ? 'EN' : 'हिं'}</button>
    <button type="button" class="menubtn" id="menuBtn" aria-expanded="false" aria-controls="menuSheet"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>${esc(t('Menu'))}</span></button>`;
  bar.insertBefore(tools, bar.querySelector('.searchbtn'));

  const sheet = document.createElement('div');
  sheet.className = 'menusheet'; sheet.id = 'menuSheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Site menu');
  sheet.innerHTML = `<div class="ms-top"><b>Exoplanet Atlas</b><button type="button" class="ms-x" id="menuX">${esc(t('Close'))}</button></div>
    <a class="ms-home" href="${HOME[0]}"${cur(HOME[0])}>${esc(t(HOME[1]))}</a>` +
    GROUPS.map((g) => `<h2>${esc(t(g.label))}</h2>${g.items.map(([f, label]) => `<a href="${f}"${cur(f)}>${esc(t(label))}</a>`).join('')}`).join('');
  document.body.appendChild(sheet);

  const closeMenus = () => {
    nav.querySelectorAll('.nav-b[aria-expanded="true"]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.nextElementSibling.hidden = true; });
  };
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('.nav-b'); if (!b) return;
    const open = b.getAttribute('aria-expanded') === 'true';
    closeMenus();
    if (!open) { b.setAttribute('aria-expanded', 'true'); b.nextElementSibling.hidden = false; }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav-g')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenus(); setSheet(false); } });

  const mb = document.getElementById('menuBtn');
  function setSheet(on) {
    if (sheet.hidden === !on) return;
    sheet.hidden = !on; mb.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('menu-open', on);
    if (on) sheet.querySelector('.ms-x').focus(); else if (document.activeElement && sheet.contains(document.activeElement)) mb.focus();
  }
  mb.addEventListener('click', () => setSheet(sheet.hidden));
  document.getElementById('menuX').addEventListener('click', () => setSheet(false));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setSheet(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) setSheet(false); });
  document.getElementById('langBtn').addEventListener('click', () => setLang(lang() === 'hi' ? 'en' : 'hi'));
  window.addEventListener('scroll', () => bar.classList.toggle('scrolled', window.scrollY > 8), { passive: true });
}
applyLang();
const sb = document.querySelector('.searchbtn span'); if (sb) sb.textContent = t('Search');
