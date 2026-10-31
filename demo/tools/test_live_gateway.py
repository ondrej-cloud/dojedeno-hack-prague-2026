#!/usr/bin/env python3
"""No-spend gateway smoke test: temporary credentials and mock HTTP/HTTPS upstreams."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import ssl
import subprocess
import tempfile
import threading
from urllib.parse import parse_qs, urlsplit
from live_gateway import Config, SITE, MAX_ANALYSIS, MAX_FRAME, make_handler, token_file

with tempfile.TemporaryDirectory(prefix='dojedeno-gateway-test-') as folder:
    private = Path(folder)
    desktop = token_file(private / 'live-desktop-token')
    phone = token_file(private / 'live-phone-token')
    assert desktop != phone and len(desktop) >= 32
    assert token_file(private / 'live-desktop-token') == desktop
    assert (private / 'live-desktop-token').stat().st_mode & 0o777 == 0o600
    assert (private / 'live-phone-token').stat().st_mode & 0o777 == 0o600
    local_token = 'local-receiver-token-for-test-00000000000'
    (private / 'phone-token').write_text(local_token)
    cert, key = private / 'cert.pem', private / 'key.pem'
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                    '-keyout', str(key), '-out', str(cert), '-subj', '/CN=localhost',
                    '-addext', 'subjectAltName=DNS:localhost', '-addext', 'basicConstraints=critical,CA:TRUE'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    received = []
    class Mock(BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def reply(self, code, body=b'', frame=None):
            self.send_response(code)
            self.send_header('Content-Type', 'image/jpeg' if frame else 'application/json')
            self.send_header('Content-Length', str(len(body)))
            if frame: self.send_header('X-Frame-Id', frame)
            self.end_headers(); self.wfile.write(body)
        def do_GET(self):
            received.append(('GET', self.path, dict(self.headers), b''))
            if self.path == '/api/status':
                self.reply(200, json.dumps({'phoneUrl': 'https://192.168.1.2:8443/phone.html#token=LOCAL-SECRET',
                    'connected': True, 'lastFrameAgeMs': 12, 'analysis': {'configured': True, 'model': 'fake',
                    'effort': 'medium', 'quantityMode': 'relative', 'secret': 'SECRET'}, 'extra': 'SECRET'}).encode())
            else: self.reply(200, b'\xff\xd8MOCK\xff\xd9', '42')
        def do_POST(self):
            data = self.rfile.read(int(self.headers['Content-Length']))
            received.append(('POST', self.path, dict(self.headers), data))
            if urlsplit(self.path).path == '/api/frame':
                assert parse_qs(urlsplit(self.path).query)['token'] == [local_token]
                self.reply(204)
            else: self.reply(200, b'{"result":{"fake":true},"usage":{}}')
    upstream = ThreadingHTTPServer(('127.0.0.1', 0), Mock)
    secure = ThreadingHTTPServer(('127.0.0.1', 0), Mock)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(cert, key)
    secure.socket = context.wrap_socket(secure.socket, server_side=True)
    config = Config(private, desktop, phone, upstream.server_port, secure.server_port, timeout=2)
    gateway = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(config))
    servers = [upstream, secure, gateway]
    for server in servers:
        server.daemon_threads = True
        threading.Thread(target=server.serve_forever, daemon=True).start()
    def request(method, url, token=None, body=None, headers=None):
        c = http.client.HTTPConnection('127.0.0.1', gateway.server_port, timeout=5)
        h = {'Origin': SITE, **(headers or {})}
        if token: h['Authorization'] = 'Bearer ' + token
        c.request(method, url, body=body, headers=h)
        r = c.getresponse(); result = r.status, dict(r.getheaders()), r.read();c.close();return result
    try:
        assert request('GET', '/api/status')[0] == 401
        assert request('GET', '/api/status', 'invalid')[0] == 401
        assert request('GET', '/api/status', phone)[0] == 403
        code, headers, raw = request('GET', '/api/status', desktop)
        assert code == 200 and headers['Access-Control-Allow-Origin'] == SITE
        status = json.loads(raw)
        assert status['phoneUrl'] == SITE + '/demo/phone.html#token=' + phone
        assert status['analysis']['model'] == 'fake' and b'SECRET' not in raw and b'192.168' not in raw
        assert received[-1][2]['Host'] == 'localhost:' + str(upstream.server_port)
        assert 'Origin' not in received[-1][2] and 'Authorization' not in received[-1][2]
        assert request('GET', '/api/status', desktop, headers={'Origin': 'https://evil.test'})[0] == 403
        assert request('GET', '/api/status', desktop, headers={'Origin': 'http://localhost:8080'})[0] == 200
        assert request('GET', '/api/status', desktop, headers={'Origin': 'null'})[0] == 403
        for url in ['/', '/.local/live-desktop-token', '/api/status?token=anything', '/api/unknown']:
            assert request('GET', url, desktop)[0] == 404
        code, headers, raw = request('GET', '/api/frame', desktop)
        assert code == 200 and raw == b'\xff\xd8MOCK\xff\xd9' and headers['X-Frame-Id'] == '42'
        assert headers['Access-Control-Expose-Headers'] == 'X-Frame-Id'
        # The tunnel's HTTP connection can serve successive preview polls.
        persistent = http.client.HTTPConnection('127.0.0.1', gateway.server_port, timeout=5)
        persistent.request('GET', '/api/frame', headers={'Authorization': 'Bearer ' + desktop})
        first = persistent.getresponse(); assert first.status == 200; first.read()
        socket = persistent.sock
        assert socket is not None
        persistent.request('GET', '/api/frame', headers={'Authorization': 'Bearer ' + desktop})
        second = persistent.getresponse(); assert second.status == 200; second.read()
        assert persistent.sock is socket
        persistent.close()
        frame = b'\xff\xd8PHONE\xff\xd9'
        assert request('POST', '/api/frame', desktop, frame, {'Content-Type': 'image/jpeg'})[0] == 403
        assert request('POST', '/api/frame', phone, frame, {'Content-Type': 'image/jpeg'})[0] == 204
        assert received[-1][3] == frame
        assert request('POST', '/api/frame', phone, b'notjpeg', {'Content-Type': 'image/jpeg'})[0] == 400
        assert request('POST', '/api/frame', phone, frame, {'Content-Type': 'text/plain'})[0] == 415
        payload = b'{"requestId":"smoke"}'
        count = len(received)
        assert request('POST', '/api/analyze', desktop, payload, {'Content-Type': 'application/json'})[0] == 200
        assert len(received) == count + 1 and received[-1][3] == payload
        assert request('POST', '/api/analyze', phone, payload, {'Content-Type': 'application/json'})[0] == 403
        assert request('POST', '/api/analyze', desktop, payload, {'Content-Type': 'text/plain'})[0] == 415
        for url, token, limit, content_type in [('/api/analyze', desktop, MAX_ANALYSIS, 'application/json'),('/api/frame', phone, MAX_FRAME, 'image/jpeg')]:
            c = http.client.HTTPConnection('127.0.0.1', gateway.server_port)
            c.putrequest('POST', url);c.putheader('Authorization', 'Bearer ' + token)
            c.putheader('Content-Length', str(limit + 1));c.putheader('Content-Type', content_type);c.endheaders()
            assert c.getresponse().status == 413;c.close()
        assert request('OPTIONS', '/api/analyze', headers={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'})[0] == 204
        assert request('OPTIONS', '/api/analyze', headers={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-evil'})[0] == 403
        assert request('OPTIONS', '/api/status', headers={'Access-Control-Request-Method':'GET','Origin':'https://evil.test'})[0] == 403
        # Missing local receiver/certificate must fail without leaking local paths or tokens.
        cert.unlink()
        code, _, raw = request('POST', '/api/frame', phone, frame, {'Content-Type': 'image/jpeg'})
        assert code == 502 and str(private).encode() not in raw and phone.encode() not in raw
        print('PASS: role auth, CORS/preflight, status sanitization, HTTP+verified HTTPS proxy, no auth/Origin forwarding, 1/3 MiB limits, token persistence600, no static files, safe failures; no paid API.')
    finally:
        for server in servers:
            server.shutdown();server.server_close()
