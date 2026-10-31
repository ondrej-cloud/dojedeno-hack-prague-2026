#!/usr/bin/env python3
"""Local demo + authenticated, memory-only phone camera receiver (stdlib)."""
import argparse
import hashlib
import hmac
import ipaddress
import json
import os
import secrets
import socket
import ssl
import subprocess
import threading
import time
from collections import OrderedDict
import claude_client
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
MAX_FRAME = 1024 * 1024
MAX_ANALYSIS = 3 * 1024 * 1024


def local_ip():
    # UDP connect selects the LAN interface without sending a packet.
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            sock.connect(('192.0.2.1', 9))
            return sock.getsockname()[0]
        except OSError:
            return '127.0.0.1'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip', default=local_ip(), help='Mac LAN IPv4 address')
    parser.add_argument('--http-port', type=int, default=8080)
    parser.add_argument('--https-port', type=int, default=8443)
    args = parser.parse_args()
    ipaddress.ip_address(args.ip)
    state = {'frame': None, 'at': None, 'id': 0}
    lock = threading.Lock()
    private = ROOT / '.local'
    private.mkdir(mode=0o700, exist_ok=True)
    private.chmod(0o700)
    key, cert = private / 'key.pem', private / 'cert.pem'
    # Reuse a still-valid certificate for this LAN address so phone trust survives restarts.
    metadata = private / 'ip.txt'
    current_ip = metadata.read_text().strip() if metadata.exists() else None
    token_path = private / 'phone-token'
    token = token_path.read_text().strip() if current_ip == args.ip and token_path.exists() else secrets.token_urlsafe(32)
    if len(token) < 32:
        token = secrets.token_urlsafe(32)
    fd = os.open(token_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(token)
    token_path.chmod(0o600)
    phone_url = f'https://{args.ip}:{args.https_port}/phone.html#token={token}'
    valid = key.exists() and cert.exists() and current_ip == args.ip
    if valid:
        valid = subprocess.run(['openssl', 'x509', '-checkend', '86400', '-noout', '-in', str(cert)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not valid:
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                        '-keyout', str(key), '-out', str(cert), '-days', '30',
                        '-subj', '/CN=Dojedeno local camera',
                        '-addext', f'subjectAltName=IP:{args.ip},IP:127.0.0.1,DNS:localhost',
                        '-addext', 'basicConstraints=critical,CA:TRUE',
                        '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign',
                        '-addext', 'extendedKeyUsage=serverAuth'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        metadata.write_text(args.ip + '\n')
    key.chmod(0o600)
    # Public certificate only, ready to AirDrop to iOS for profile installation.
    (private / 'Dojedeno-camera.cer').write_bytes(cert.read_bytes())

    analysis_lock = threading.Lock()
    analysis_cache = OrderedDict()
    analysis_running = set()
    allowed_hosts = {f'localhost:{args.http_port}', f'127.0.0.1:{args.http_port}'}
    allowed_origins = {'http://' + host for host in allowed_hosts}

    def analysis_config():
        data = json.loads((ROOT / 'config.json').read_text())
        return data.get('menu', []), data.get('analysis', {}).get('quantityMode', 'estimate')

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(ROOT), **kw)

        def log_message(self, fmt, *values):
            # Never log frame token from request URLs.
            pass

        def reply(self, code, body=b'', content_type='application/json', frame_id=None):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            if frame_id is not None:
                self.send_header('X-Frame-Id', str(frame_id))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Referrer-Policy', 'no-referrer')
            super().end_headers()

        def list_directory(self, path):
            self.reply(403)
            return None

        def safe_path(self):
            path = unquote(urlsplit(self.path).path)
            parts = Path(path).parts
            if any(p.startswith('.') or p == 'tools' for p in parts):
                return None
            resolved = (ROOT / path.lstrip('/')).resolve()
            if not resolved.is_relative_to(ROOT) or any(p.startswith('.') for p in resolved.relative_to(ROOT).parts):
                return None
            return path

        def local_request(self):
            return (not self.server.is_phone
                    and self.headers.get('Host', '').lower() in allowed_hosts
                    and self.headers.get('Origin', '') in allowed_origins | {''}
                    and self.headers.get('Sec-Fetch-Site', '') not in {'cross-site'})

        def json_reply(self, code, value):
            return self.reply(code, json.dumps(value, ensure_ascii=False).encode())

        def analyze_request(self):
            if not self.local_request():
                return self.json_reply(403, {'error': 'Přístup je povolen pouze z lokálního dema.'})
            if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
                return self.json_reply(415, {'error': 'Očekávám JSON.'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.json_reply(400, {'error': 'Neplatná délka požadavku.'})
            if not 0 < length <= MAX_ANALYSIS:
                return self.json_reply(413, {'error': 'Snímek je příliš velký.'})
            self.connection.settimeout(15)
            try:
                raw = self.rfile.read(length)
                if len(raw) != length:
                    raise ValueError()
                payload = json.loads(raw)
                request_id = payload.get('requestId')
                if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
                    raise ValueError()
                digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            except (ValueError, AttributeError, UnicodeDecodeError, TimeoutError, OSError):
                return self.json_reply(400, {'error': 'Neplatný požadavek analýzy.'})
            with analysis_lock:
                previous = analysis_cache.get(request_id)
                if previous:
                    if previous['digest'] != digest:
                        return self.json_reply(409, {'error': 'Stejné ID už patří jinému snímku.'})
                    return self.json_reply(previous['code'], previous['body'])
                if request_id in analysis_running:
                    return self.json_reply(409, {'error': 'Tento snímek se právě zpracovává.'})
                if analysis_running:
                    return self.json_reply(429, {'error': 'Probíhá jiná analýza. Vyčkejte na dokončení.'})
                analysis_running.add(request_id)
            code, body = 502, {'error': 'Analýza se nepodařila. Zkuste po kontrole připojení nový snímek.'}
            try:
                menu, quantity_mode = analysis_config()
                body = claude_client.analyze(payload, menu, quantity_mode=quantity_mode)
                code = 200
            except Exception as error:
                # Only explicitly sanitized module errors may reach the browser.
                if isinstance(error, getattr(claude_client, 'AnalysisError', ())):
                    code = error.status_code
                    body = {'error': error.public_message}
            finally:
                with analysis_lock:
                    analysis_running.discard(request_id)
                    analysis_cache[request_id] = {'digest': digest, 'code': code, 'body': body}
                    while len(analysis_cache) > 128:
                        analysis_cache.popitem(last=False)
            return self.json_reply(code, body)

        def do_GET(self):
            path = self.safe_path()
            if path is None:
                return self.reply(403)
            if path.startswith('/api/'):
                if not self.local_request():
                    return self.reply(403)
                with lock:
                    age = None if state['at'] is None else max(0, int((time.monotonic()-state['at'])*1000))
                    frame = state['frame']
                    frame_id = state['id']
                if path == '/api/status':
                    try:
                        status = claude_client.get_status()
                        _, quantity_mode = analysis_config()
                        status['quantityMode'] = quantity_mode
                    except (ValueError, OSError, TypeError, AttributeError):
                        status = {'configured': False, 'error': 'Konfiguraci analýzy nelze načíst.'}
                    return self.json_reply(200, {'phoneUrl': phone_url, 'connected': age is not None and age < 3000, 'lastFrameAgeMs': age, 'analysis': status})
                if path == '/api/frame':
                    fresh = frame is not None and age is not None and age <= 1500
                    return self.reply(200 if fresh else 204, frame if fresh else b'', 'image/jpeg', frame_id)
                return self.reply(404)
            # HTTPS exposes phone frontend only, never project files or token API.
            if self.server.is_phone and path not in ['/phone.html', '/phone.js', '/phone.css', '/favicon.ico']:
                return self.reply(403)
            return super().do_GET()

        def do_HEAD(self):
            return self.do_GET()

        def do_POST(self):
            parsed = urlsplit(self.path)
            if parsed.path == '/api/analyze':
                return self.analyze_request()
            offered = parse_qs(parsed.query).get('token', [''])[0]
            if not self.server.is_phone or parsed.path != '/api/frame' or not hmac.compare_digest(offered.encode(), token.encode()):
                return self.reply(403)
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.reply(400)
            if not 0 < length <= MAX_FRAME:
                return self.reply(413)
            self.connection.settimeout(10)
            try:
                frame = self.rfile.read(length)
            except (TimeoutError, OSError):
                return self.reply(408)
            if len(frame) != length or not frame.startswith(b'\xff\xd8') or not frame.endswith(b'\xff\xd9'):
                return self.reply(400)
            with lock:
                state['frame'] = frame
                state['at'] = time.monotonic()
                state['id'] += 1
            return self.reply(204)

    desktop = ThreadingHTTPServer(('127.0.0.1', args.http_port), Handler)
    desktop.is_phone = False
    phone = ThreadingHTTPServer(('0.0.0.0', args.https_port), Handler)
    phone.is_phone = True
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(cert, key)
    phone.socket = context.wrap_socket(phone.socket, server_side=True)
    threads = [threading.Thread(target=s.serve_forever, daemon=True) for s in [desktop, phone]]
    for thread in threads:
        thread.start()
    print(f'Demo: http://127.0.0.1:{args.http_port}', flush=True)
    print(f'Telefon (stejna Wi-Fi): {phone_url}', flush=True)
    print('HTTPS pouziva vlastni certifikat. Navod: demo/PHONE.md. Ukonceni: Ctrl+C.', flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for server in [desktop, phone]:
            server.shutdown()
            server.server_close()
        with lock:
            state['frame'] = None


if __name__ == '__main__':
    main()
