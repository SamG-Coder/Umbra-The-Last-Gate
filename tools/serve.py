"""Python 3.8+ alternative. All saves stay in the browser; no account is required."""
import argparse
import functools
import http.server
import pathlib
import sys
import urllib.request
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent.parent

def install_vendor():
    target = ROOT / 'vendor'
    target.mkdir(exist_ok=True)
    for name in ('three.module.js', 'three.core.js'):
        dest = target / name
        if dest.is_file() and dest.stat().st_size > 10000:
            continue
        print('Fetching Three.js 0.180.0:', name, flush=True)
        for base in ('https://cdn.jsdelivr.net/npm/three@0.180.0/build/',
                     'https://unpkg.com/three@0.180.0/build/',
                     'https://raw.githubusercontent.com/mrdoob/three.js/r180/build/'):
            try:
                req = urllib.request.Request(base + name, headers={'User-Agent': 'Umbra-Local-Launcher/1.0'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = response.read()
                if len(data) < 10000 or data.lstrip().startswith(b'<'):
                    raise ValueError('Unexpected download content')
                temp = dest.with_suffix('.tmp')
                temp.write_bytes(data)
                temp.replace(dest)
                break
            except Exception as exc:
                print('Download attempt failed:', exc, flush=True)
        else:
            print('Engine not available locally. The browser will try its CDN fallback.\n'
                  'Internet access is required for the first setup.', flush=True)
            return

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run UMBRA locally')
    parser.add_argument('--open', action='store_true')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--no-vendor', action='store_true')
    args = parser.parse_args()
    if not args.no_vendor:
        install_vendor()
    try:
        server = http.server.ThreadingHTTPServer((args.host, args.port), functools.partial(Handler, directory=str(ROOT)))
    except OSError as exc:
        print('Could not start the server:', exc, '\nClose the previous launcher or choose --port 8001.')
        sys.exit(1)
    url = 'http://{}:{}'.format('localhost' if args.host == '0.0.0.0' else args.host, args.port)
    print('\nUMBRA — THE LAST GATE\n' + url + '\nKeep this terminal open while playing. Ctrl+C stops the server.\n', flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
