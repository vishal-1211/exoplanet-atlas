"""Renders a 1200x630 preview picture for each notable planet into img/og/<slug>.jpg.
Only pictures that don't exist yet are drawn, so the daily job adds new ones without redoing old ones.
Set OG_FORCE=1 to redraw everything. Needs: pip install playwright && playwright install chromium"""
import base64, http.server, json, os, pathlib, socketserver, threading, sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'img' / 'og'; out.mkdir(parents=True, exist_ok=True)
have = [] if os.environ.get('OG_FORCE') else [f.stem for f in out.glob('*.jpg')]

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(root), **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

with sync_playwright() as pw:
    exe = os.environ.get('CHROMIUM_PATH')
    b = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('window.HAVE = %s' % json.dumps(have))
    pg.goto(f'http://127.0.0.1:{port}/scripts/og-render.html')
    try:
        pg.wait_for_function('window.RESULT', timeout=120000)
    except Exception:
        print('render failed', errs); sys.exit(1)
    res = pg.evaluate('window.RESULT')
    b.close()
for s, b64 in res['cards']:
    (out / f'{s}.jpg').write_bytes(base64.b64decode(b64))
print(f"preview images: {len(res['cards'])} new, {res['total']} notable planets, {len(list(out.glob('*.jpg')))} in total")
