#!/usr/bin/env python3
"""Build the presentation and demo frontend, without credentials.

Run after `python3 prezentace/build.py`:
    python3 tools/export_netlify.py
Upload the generated netlify-drop folder to Netlify Drop, or use netlify-drop.zip.
The ZIP has index.html at its root. This command never publishes anything.
Live mode connects directly to the public demo gateway.
"""
from pathlib import Path
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'netlify-drop'
ARCHIVE = ROOT / 'netlify-drop.zip'


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Source changed; review export replacement: ' + old[:90])
    return text.replace(old, new, 1)


def write(relative, text):
    out = DEST / relative
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8')


def copy(source, target):
    src = ROOT / source
    if src.is_symlink() or not src.is_file():
        raise RuntimeError('Expected a regular source file: ' + str(src))
    out = DEST / target
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, out)


def build():
    if DEST.exists():
        if DEST.is_symlink():
            raise RuntimeError('Refusing symlink output directory')
        shutil.rmtree(DEST)
    DEST.mkdir()
    # Allowlist browser files rather than copying the project or credential folders.
    for folder, extension in [('css', '*.css'), ('js', '*.js')]:
        for src in sorted((ROOT / 'prezentace' / folder).glob(extension)):
            copy(src.relative_to(ROOT), Path(folder) / src.name)
    for name in ['index.html', 'app.js', 'style.css', 'polish.css', 'deck-look.css', 'deck-views.js', 'deck-bridge.js', 'camera-embed.css', 'pair.html', 'pair.js', 'measurement.js', 'outline.js', 'presence.js', 'capture-settle.js', 'live-analysis.js', 'scale-detail.js', 'connection.js', 'connection.css', 'phone.html', 'phone.js', 'phone.css', 'vendor/qrcode.js', 'vendor/qrcode.LICENSE']:
        copy('demo/' + name, 'demo/' + name)
    for name in ['plate-full.jpg', 'plate-leftover.jpg']:
        copy('demo/assets/' + name, 'demo/assets/' + name)
    copy('demo/data/month.json', 'demo/data/month.json')
    copy('demo/screenshots/step-4.png', 'demo/screenshots/step-4.png')
    for name in ['index.html', 'dojedeno-onepager.pdf', 'nahled.png']:
        copy('materialy/onepager/' + name, 'onepager/' + name)

    html = (ROOT / 'prezentace/index.html').read_text()
    html = html.replace('../demo/screenshots/', 'demo/screenshots/').replace('../materialy/onepager/', 'onepager/')
    html = replace_once(html, '<script src="js/model3d.js">', '<script src="demo/connection.js"></script>\n<script src="js/model3d.js">')
    section_pattern = r'(<section[^>]+id="s-ukazka"[\s\S]*?)(</section>)'
    match = re.search(section_pattern, html)
    if not match:
        raise RuntimeError('Demo slide not found')
    section = match.group(1)
    section = re.sub(r'<div class="demo-chyba bez-vstupu" hidden>[\s\S]*?</div>',
        '<div class="demo-chyba bez-vstupu" hidden><p class="nadpis">Ukázku se nepodařilo načíst</p><p>Obnovte stránku. Šipkou doprava lze pokračovat dál.</p></div>', section, count=1)
    notes_match = re.search(r'<script type="application/json" class="poznamky-data">([\s\S]*?)</script>', section)
    if not notes_match:
        raise RuntimeError('Demo speaker notes not found')
    notes = json.loads(notes_match.group(1))
    notes += ['Webová verze · připojení',
             'Živé demo se připojí automaticky bez přístupového kódu. Na Macu musí běžet server a tunel.',
             'V živém režimu tlačítko Mobil zobrazí QR. Telefon otevře HTTPS stránku a povolí kameru. Mac se serverem a tunelem musí zůstat zapnutý a online.',
             'Claude čte displej váhy na snímku; denní a měsíční přehledy zůstávají ukázková data.']
    section = re.sub(r'(<script type="application/json" class="poznamky-data">)[\s\S]*?(</script>)',
        lambda m: m.group(1) + json.dumps(notes, ensure_ascii=False) + m.group(2), section, count=1)
    html = html[:match.start()] + section + match.group(2) + html[match.end():]
    write('index.html', html)

    bridge = (DEST / 'js/s06b.js').read_text()
    bridge = replace_once(bridge, "const DEMO = 'http://localhost:8080/';", "const DEMO = new URL('./demo/', document.baseURI).href;")
    write('js/s06b.js', bridge)

    config = json.loads((ROOT / 'demo/config.json').read_text())
    config['school'] = 'Ukázková škola'
    write('demo/config.json', json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    backend_path = ROOT / 'tools/live_backend.json'
    backend = json.loads(backend_path.read_text()) if backend_path.exists() else {'backendUrl': ''}
    url = backend.get('backendUrl', '')
    if url and not re.fullmatch(r'https://[a-z0-9-]+\.trycloudflare\.com', url):
        raise RuntimeError('Unexpected live backend URL')
    write('demo/live-server.json', json.dumps({'backendUrl': url}) + '\n')

    write('_headers', '''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(self), microphone=()
/
  Cache-Control: no-cache, no-store, must-revalidate
/*.html
  Cache-Control: no-cache, no-store, must-revalidate
/demo/
  Cache-Control: no-cache, no-store, must-revalidate
/demo/*.html
  Cache-Control: no-cache, no-store, must-revalidate
/demo/config.json
  Cache-Control: no-cache, no-store, must-revalidate
/demo/live-server.json
  Cache-Control: no-cache, no-store, must-revalidate
/demo/connection.js
  Cache-Control: no-cache, no-store, must-revalidate
''')
    files = sorted(p for p in DEST.rglob('*') if p.is_file())
    for p in files:
        if p.is_symlink() or any(part.startswith('.') for part in p.relative_to(DEST).parts):
            raise RuntimeError('Unexpected hidden or symlink export file')
        if re.search(rb'sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', p.read_bytes()):
            raise RuntimeError('Credential signature in export; refusing archive: ' + str(p.relative_to(DEST)))
    with zipfile.ZipFile(ARCHIVE, 'w', zipfile.ZIP_DEFLATED) as archive:
        for p in files:
            archive.write(p, p.relative_to(DEST))
    print(f'Export: {DEST} ({len(files)} files)')
    print(f'ZIP: {ARCHIVE} ({ARCHIVE.stat().st_size / 1024 / 1024:.2f} MiB; index.html at root)')


if __name__ == '__main__':
    build()
