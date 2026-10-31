#!/usr/bin/env python3
"""Bearer-authenticated loopback gateway for the live HTTPS tunnel.

Run alongside serve.py: python3 tools/live_gateway.py
Point an HTTPS tunnel at http://127.0.0.1:8081. This serves no static files.
Two role tokens live in .local/live-desktop-token and .local/live-phone-token.
Never publish these files or log request headers/URLs. No paid API retries.
"""
import argparse
from dataclasses import dataclass
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import ssl
import threading
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://dojezeno.netlify.app'
MAX_FRAME = 1024 * 1024
MAX_ANALYSIS = 3 * 1024 * 1024
ROUTES = {('GET', '/api/status'): 'desktop', ('GET', '/api/frame'): 'desktop',
          ('POST', '/api/analyze'): 'desktop', ('POST', '/api/frame'): 'phone'}


def token_file(path):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    if path.is_symlink():
        raise ValueError('Token file must not be a symlink')
    if path.exists():
        token = path.read_text().strip()
        if len(token) < 32 or not all(c.isalnum() or c in '-_' for c in token):
            raise ValueError('Invalid stored gateway token')
        path.chmod(0o600)
        return token
    token = secrets.token_urlsafe(32)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(token)
    return token


@dataclass
class Config:
    private: Path
    desktop_token: str
    phone_token: str
    http_port: int = 8080
    https_port: int = 8443
    timeout: int = 80

    @property
    def origins(self):
        return {SITE, 'http://localhost:8080'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def make_handler(config):
    # Reuse the verified SSL context across frames, but reload it after a local
    # certificate rotation (for example when the Mac changes Wi-Fi).
    tls_lock = threading.Lock()
    tls_cache = {'stamp': None, 'context': None}

    def phone_context():
        cert = config.private / 'cert.pem'
        stat = cert.stat()
        stamp = (stat.st_mtime_ns, stat.st_size, stat.st_ino)
        with tls_lock:
            if tls_cache['stamp'] != stamp:
                tls_cache['context'] = ssl.create_default_context(cafile=str(cert))
                tls_cache['stamp'] = stamp
            return tls_cache['context']

    class Handler(BaseHTTPRequestHandler):
        # The tunnel can reuse its connection for successive frames.
        protocol_version = 'HTTP/1.1'
        server_version = 'DojedenoGateway'

        def log_message(self, *args):
            pass

        def send(self, status, body=b'', content_type='application/json', frame_id=None):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            if self.close_connection:
                self.send_header('Connection', 'close')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Vary', 'Origin')
            origin = self.headers.get('Origin', '')
            if origin in config.origins:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
                self.send_header('Access-Control-Expose-Headers', 'X-Frame-Id')
                self.send_header('Access-Control-Max-Age', '600')
            if frame_id is not None:
                self.send_header('X-Frame-Id', str(frame_id))
            self.end_headers()
            try:
                if self.command != 'HEAD':
                    self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def error(self, code, message):
            # A rejected POST may leave unread bytes. Close rather than treating
            # those bytes as the next request on this persistent connection.
            self.close_connection = True
            self.send(code, json.dumps({'error': message}, ensure_ascii=False).encode())

        def check_origin(self):
            if self.headers.get('Origin', '') not in config.origins | {''}:
                self.error(403, 'Tento web nemá přístup k živému demu.')
                return False
            return True

        def do_OPTIONS(self):
            if not self.check_origin():
                return
            method = self.headers.get('Access-Control-Request-Method', '')
            headers = {h.strip().lower() for h in self.headers.get('Access-Control-Request-Headers', '').split(',') if h.strip()}
            if (method, self.path) not in ROUTES or not headers <= {'authorization', 'content-type'}:
                return self.error(403, 'Nepovolený požadavek.')
            self.send(204)

        def authorize(self):
            if not self.check_origin():
                return None
            role = ROUTES.get((self.command, self.path))
            # Check authentication even for unknown paths; no public status endpoint.
            auth = self.headers.get('Authorization', '')
            if len(self.headers.get_all('Authorization', [])) != 1 or not auth.startswith('Bearer '):
                self.error(401, 'Chybí platný přístupový token.')
                return None
            offered = auth[7:].encode()
            desktop = hmac.compare_digest(offered, config.desktop_token.encode())
            phone = hmac.compare_digest(offered, config.phone_token.encode())
            if not (desktop or phone):
                self.error(401, 'Chybí platný přístupový token.')
                return None
            if role is None:
                self.error(404, 'Nepovolená cesta.')
                return None
            if (role == 'desktop' and not desktop) or (role == 'phone' and not phone):
                self.error(403, 'Token nemá oprávnění pro tuto operaci.')
                return None
            return role

        def read_body(self, limit, expected_type):
            if self.headers.get('Transfer-Encoding'):
                self.error(400, 'Přenos po částech není podporován.')
                return None
            lengths = self.headers.get_all('Content-Length', [])
            if len(lengths) != 1 or not lengths[0].isdigit():
                self.error(400, 'Neplatná délka požadavku.')
                return None
            length = int(lengths[0])
            if not 0 < length <= limit:
                self.error(413, 'Snímek je příliš velký nebo prázdný.')
                return None
            if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != expected_type:
                self.error(415, 'Neplatný typ obsahu.')
                return None
            self.connection.settimeout(15)
            try:
                body = self.rfile.read(length)
            except (OSError, TimeoutError):
                self.error(408, 'Snímek se nepodařilo přijmout včas.')
                return None
            if len(body) != length:
                self.error(400, 'Neúplný požadavek.')
                return None
            return body

        def proxy(self, phone=False, body=None):
            try:
                if phone:
                    local_token = (config.private / 'phone-token').read_text().strip()
                    if len(local_token) < 32:
                        raise ValueError('Local receiver is not initialized')
                    url = f'https://localhost:{config.https_port}/api/frame?' + urllib.parse.urlencode({'token': local_token})
                    context = phone_context()
                    opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context), urllib.request.ProxyHandler({}))
                    headers = {'Content-Type': 'image/jpeg'}
                else:
                    url = f'http://127.0.0.1:{config.http_port}' + self.path
                    opener = urllib.request.build_opener(NoRedirect(), urllib.request.ProxyHandler({}))
                    # Deliberately do not forward Origin, auth or browser fetch metadata.
                    headers = {'Host': f'localhost:{config.http_port}'}
                    if body is not None:
                        headers['Content-Type'] = 'application/json'
                req = urllib.request.Request(url, data=body, headers=headers, method=self.command)
                try:
                    response = opener.open(req, timeout=config.timeout)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    limit = MAX_FRAME if self.path == '/api/frame' else MAX_ANALYSIS
                    content = response.read(limit + 1)
                    if len(content) > limit:
                        raise ValueError('Oversized upstream reply')
                    code = response.code
                    content_type = response.headers.get('Content-Type', 'application/json')
                    frame_id = response.headers.get('X-Frame-Id')
                if self.path == '/api/status' and code == 200:
                    upstream = json.loads(content)
                    analysis = upstream.get('analysis', {})
                    safe_analysis = {key: analysis[key] for key in ['configured', 'model', 'effort', 'quantityMode'] if key in analysis}
                    safe = {'phoneUrl': SITE + '/demo/phone.html#token=' + config.phone_token,
                            'connected': bool(upstream.get('connected')),
                            'lastFrameAgeMs': upstream.get('lastFrameAgeMs'), 'analysis': safe_analysis}
                    content = json.dumps(safe, ensure_ascii=False).encode()
                    content_type = 'application/json'
                self.send(code, content, content_type, frame_id)
            except (OSError, ValueError, TypeError, AttributeError, urllib.error.URLError):
                self.error(502, 'Lokální server není dostupný. Zkontrolujte spuštěné demo na Macu.')

        def do_GET(self):
            if self.authorize():
                self.proxy()

        def do_POST(self):
            role = self.authorize()
            if not role:
                return
            phone = role == 'phone'
            body = self.read_body(MAX_FRAME if phone else MAX_ANALYSIS, 'image/jpeg' if phone else 'application/json')
            if body is None:
                return
            if phone and (not body.startswith(b'\xff\xd8') or not body.endswith(b'\xff\xd9')):
                return self.error(400, 'Očekávám JPEG snímek.')
            self.proxy(phone=phone, body=body)

        def do_HEAD(self):
            self.error(405, 'Metoda není podporována.')

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8081)
    args = parser.parse_args()
    private = ROOT / '.local'
    config = Config(private, token_file(private / 'live-desktop-token'), token_file(private / 'live-phone-token'))
    if hmac.compare_digest(config.desktop_token, config.phone_token):
        raise ValueError('Gateway role tokens must differ')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(config))
    server.daemon_threads = True
    print(f'Live gateway: http://127.0.0.1:{args.port} (bearer authentication required)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
