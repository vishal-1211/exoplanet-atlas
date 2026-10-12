// Fails if any page points at a file inside the site that does not exist. Run: node scripts/check-links.mjs
import fs from 'node:fs';
import path from 'node:path';

const dirs = ['.', 'hi', 'planet'];
let pages = 0, bad = 0;
const exists = (p) => fs.existsSync(p) && !(fs.statSync(p).isDirectory() && !fs.existsSync(path.join(p, 'index.html')));
for (const d of dirs) {
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(d, f), 'utf8');
    const base = (html.match(/<base href="([^"]*)"/) || [])[1] || '';
    const from = path.join(d, base);
    pages++;
    for (const m of html.replace(/<base [^>]*>/, "").matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      let u = m[1];
      if (/^(https?:|mailto:|data:|#|javascript:|\/\/)/.test(u)) continue;
      u = u.split('#')[0].split('?')[0]; if (!u) continue;
      const target = u.startsWith('/') ? u.slice(1) : path.join(from, u);
      if (!exists(target)) { bad++; if (bad <= 30) console.error(`FAIL: ${path.join(d, f)} links to missing ${u}`); }
    }
  }
}
for (const f of ['sitemap.xml']) {
  const urls = [...fs.readFileSync(f, 'utf8').matchAll(/<loc>[^<]*?exoplanet-atlas\.macrocosm\.workers\.dev\/([^<]*)<\/loc>/g)].map((m) => m[1] || 'index.html');
  for (const u of urls) if (!fs.existsSync(u)) { bad++; if (bad <= 30) console.error(`FAIL: sitemap lists missing ${u}`); }
}
console.log(`Checked links on ${pages} pages: ${bad ? bad + ' broken' : 'all good'}.`);
process.exit(bad ? 1 : 0);
