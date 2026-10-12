// A small search-as-you-type picker for planets or stars. Shows up to 8 matches under the input.
import { esc } from './boot.js';

export function attachPicker(input, listEl, items, { label, keyOf = label, onPick, max = 8 }) {
  const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const index = items.map((it) => ({ it, k: key(keyOf(it)), h: key(it.host || '') }));
  let shown = [], active = -1;
  const hide = () => { listEl.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); };
  const paint = () => listEl.querySelectorAll('li').forEach((li, i) => li.classList.toggle('act', i === active));
  const show = () => {
    const q = key(input.value);
    if (!q) return hide();
    const rank = (x) => (x.k === q ? 0 : x.k.startsWith(q) ? 1 : x.k.includes(q) ? 2 : 3);
    shown = index.filter((x) => x.k.includes(q) || x.h.includes(q)).sort((a, b) => rank(a) - rank(b) || a.k.length - b.k.length).slice(0, max).map((x) => x.it);
    listEl.innerHTML = shown.length ? shown.map((it, i) => `<li role="option" data-i="${i}">${esc(label(it))}</li>`).join('') : '<li class="none">No match</li>';
    listEl.hidden = false; active = -1; input.setAttribute('aria-expanded', 'true');
  };
  const pick = (i) => { const it = shown[i]; if (!it) return; input.value = label(it); hide(); onPick(it); };
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
  listEl.setAttribute('role', 'listbox');
  input.addEventListener('input', show);
  input.addEventListener('focus', () => { input.select(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (listEl.hidden) show(); active = Math.min(shown.length - 1, active + 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (active < 0 && shown.length) active = 0; if (!listEl.hidden || shown.length) { if (listEl.hidden) show(); pick(Math.max(0, active)); } }
    else if (e.key === 'Escape') hide();
  });
  listEl.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
  input.addEventListener('blur', () => setTimeout(hide, 120));
}
