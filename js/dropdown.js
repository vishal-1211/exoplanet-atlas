// Modern dropdown: replaces a native <select> with a styled button and a floating list.
// The original <select> stays in the page (hidden) and remains the single source of truth.
const all = [];
let openOne = null;

// "Label (hint)": the hint may itself contain brackets, e.g. "Cold (below 230 K (-43 °C))".
const split = (t) => {
  if (!t.endsWith(')')) return [t, ''];
  let depth = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth++;
    else if (t[i] === '(' && --depth === 0) return i > 0 ? [t.slice(0, i).trim(), t.slice(i + 1, -1)] : [t, ''];
  }
  return [t, ''];
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function close(dd, focusBtn) {
  if (!dd.open) return;
  dd.open = false; dd.menu.hidden = true; dd.btn.setAttribute('aria-expanded', 'false');
  dd.root.classList.remove('open');
  if (openOne === dd) openOne = null;
  if (focusBtn) dd.btn.focus();
}

function render(dd) {
  const sel = dd.select;
  dd.items = [...sel.options].map((o, i) => ({ i, value: o.value, text: o.textContent }));
  dd.menu.innerHTML = dd.items.map(({ i, text }) => {
    const [label, hint] = split(text);
    return `<li role="option" id="${dd.id}-o${i}" data-i="${i}"><span class="dd-l">${esc(label)}</span>${hint ? `<span class="dd-h">${esc(hint)}</span>` : ''}<svg class="dd-ck" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></li>`;
  }).join('');
  sync(dd);
}

function sync(dd) {
  const sel = dd.select;
  const idx = Math.max(0, sel.selectedIndex);
  const cur = dd.items[idx];
  if (!cur) return;
  dd.val.textContent = split(cur.text)[0];
  dd.root.classList.toggle('set', idx > 0 && sel.options[0].value === '');
  dd.menu.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', String(i === idx)));
  dd.active = idx;
}

function setActive(dd, i) {
  dd.active = Math.max(0, Math.min(dd.items.length - 1, i));
  dd.menu.querySelectorAll('li').forEach((li, k) => li.classList.toggle('act', k === dd.active));
  const li = dd.menu.children[dd.active];
  if (li) { dd.btn.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
}

function choose(dd, i) {
  const v = dd.items[i].value;
  if (dd.select.value !== v) { dd.select.value = v; dd.select.dispatchEvent(new Event('change', { bubbles: true })); }
  sync(dd); close(dd, true);
}

function openMenu(dd) {
  if (openOne && openOne !== dd) close(openOne);
  dd.open = true; openOne = dd; dd.menu.hidden = false; dd.root.classList.add('open');
  dd.btn.setAttribute('aria-expanded', 'true');
  // flip upward when there is no room below
  const r = dd.btn.getBoundingClientRect();
  dd.root.classList.toggle('up', window.innerHeight - r.bottom < 300 && r.top > 300);
  setActive(dd, dd.select.selectedIndex);
}

export function enhanceSelect(select) {
  const id = 'dd' + all.length;
  const root = document.createElement('div');
  root.className = 'dd';
  root.innerHTML = `<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="dd-val"></span><svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m1 1.5 5 5 5-5"/></svg></button><ul class="dd-menu" role="listbox" tabindex="-1" hidden></ul>`;
  const label = select.closest('label');
  select.classList.add('dd-native');
  select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
  select.after(root);
  const dd = { id, select, root, btn: root.querySelector('.dd-btn'), menu: root.querySelector('.dd-menu'), val: root.querySelector('.dd-val'), open: false, items: [], active: 0, buf: '', bufT: 0 };
  dd.menu.id = id + '-m'; dd.btn.setAttribute('aria-controls', dd.menu.id); dd.menu.setAttribute('aria-label', (label && label.firstChild && label.firstChild.textContent.trim()) || 'Options');
  dd.btn.setAttribute('aria-labelledby', ''); dd.btn.removeAttribute('aria-labelledby');
  dd.btn.setAttribute('aria-label', `${dd.menu.getAttribute('aria-label')}: choose`);
  if (label) label.addEventListener('click', (e) => { e.preventDefault(); if (!dd.root.contains(e.target)) dd.btn.focus(); });
  dd.btn.addEventListener('click', () => (dd.open ? close(dd) : openMenu(dd)));
  dd.menu.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(dd, +li.dataset.i); });
  dd.menu.addEventListener('pointermove', (e) => { const li = e.target.closest('li'); if (li && +li.dataset.i !== dd.active) setActive(dd, +li.dataset.i); });
  dd.btn.addEventListener('keydown', (e) => {
    const k = e.key;
    if (!dd.open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openMenu(dd); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActive(dd, dd.active + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(dd, dd.active - 1); }
    else if (k === 'Home') { e.preventDefault(); setActive(dd, 0); }
    else if (k === 'End') { e.preventDefault(); setActive(dd, dd.items.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(dd, dd.active); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(dd, true); }
    else if (k === 'Tab') close(dd);
    else if (k.length === 1) {
      clearTimeout(dd.bufT); dd.buf += k.toLowerCase(); dd.bufT = setTimeout(() => { dd.buf = ''; }, 600);
      const hit = dd.items.findIndex((it) => it.text.toLowerCase().startsWith(dd.buf));
      if (hit >= 0) setActive(dd, hit);
    }
  });
  all.push(dd); render(dd);
  return dd;
}

export function refreshSelects() { all.forEach(render); }

document.addEventListener('pointerdown', (e) => { if (openOne && !openOne.root.contains(e.target)) close(openOne); });
window.addEventListener('blur', () => { if (openOne) close(openOne); });
