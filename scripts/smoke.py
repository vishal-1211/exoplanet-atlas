"""Opens the key pages in a real browser and fails on console errors, empty lists or sideways scrolling.
Run: python3 scripts/smoke.py   (needs playwright + chromium)"""
import http.server, os, pathlib, socketserver, sys, threading
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(root), **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{port}/'

# (path, selector that must match at least N elements)
CHECKS = [
    ('index.html', '.card, .shelf .pc, .shelf a, #grid > *', 5),
    ('planets.html', '.az-list a', 100),
    ('planet/51-peg-b.html', 'h1', 1),
    ('charts.html', 'canvas, svg', 1),
    ('systems.html', 'svg', 1),
    ('compare.html', 'select, input', 1),
    ('tonight.html', 'main', 1),
    ('new.html', 'main li, main .pl-links a, main a', 3),
    ('data.html', 'main a', 3),
    ('candidates.html', 'main', 1),
    ('next.html', 'main h2', 1),
    ('hi/how.html', 'h1', 1),
    ('how.html', 'h1', 1),
]
fail = 0
with sync_playwright() as pw:
    exe = os.environ.get('CHROMIUM_PATH')
    b = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()
    for w, h in ((1280, 800), (390, 800)):
        ctx = b.new_context(viewport={'width': w, 'height': h}, service_workers='block')
        for path, sel, n in CHECKS:
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
            pg.goto(B + path); pg.wait_for_timeout(1200)
            cnt = pg.locator(sel).count()
            over = pg.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')
            if path == 'candidates.html' and not (root / 'data' / 'candidates.json').exists():
                errs = [e for e in errs if '404' not in e]   # optional file not downloaded yet; the page explains this
            if errs or cnt < n or over:
                fail += 1; print(f'FAIL {w}px {path}: errors={errs[:2]} matches={cnt}/{n} sideways={over}')
            pg.close()
        ctx.close()
    b.close()
print('smoke test:', 'FAILED' if fail else 'all good')
sys.exit(1 if fail else 0)
