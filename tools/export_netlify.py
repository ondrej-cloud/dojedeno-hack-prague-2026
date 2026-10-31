#!/usr/bin/env python3
"""Build an upload-ready static presentation and sample demo, without credentials.

Run after `python3 prezentace/build.py`:
    python3 tools/export_netlify.py
Upload the generated netlify-drop folder to Netlify Drop, or use netlify-drop.zip.
The ZIP has index.html at its root. This command never publishes anything.
The live phone/Python/Claude workflow remains in the local project only.
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
    for name in ['index.html', 'app.js', 'style.css', 'outline.js', 'presence.js', 'live-analysis.js']:
        copy('demo/' + name, 'demo/' + name)
    for name in ['plate-full.jpg', 'plate-leftover.jpg']:
        copy('demo/assets/' + name, 'demo/assets/' + name)
    copy('demo/data/month.json', 'demo/data/month.json')
    copy('demo/screenshots/step-4.png', 'demo/screenshots/step-4.png')

    html = (ROOT / 'prezentace/index.html').read_text()
    html = html.replace('../demo/screenshots/', 'demo/screenshots/')
    html = replace_once(html, 'allow="camera; fullscreen; autoplay"', 'allow="fullscreen; autoplay"')
    section_pattern = r'(<section[^>]+id="s-ukazka"[\s\S]*?)(</section>)'
    match = re.search(section_pattern, html)
    if not match:
        raise RuntimeError('Demo slide not found')
    section = match.group(1)
    section = section.replace('data-nazev="Živá ukázka prototypu"', 'data-nazev="Ukázkové demo prototypu"')
    section = re.sub(r'<div class="demo-chyba bez-vstupu" hidden>[\s\S]*?</div>',
        '<div class="demo-chyba bez-vstupu" hidden><p class="nadpis">Ukázku se nepodařilo načíst</p><p>Obnovte stránku. Šipkou doprava lze pokračovat dál.</p></div>', section, count=1)
    notes = ['Ukázkové demo · webová verze', 'Všechna čísla a výsledky v této webové ukázce jsou připravená data, nikoli měření z pilotu.',
             'Šipky nebo mezerník procházejí 8 kroků. Krok 3 má dvě fáze. Po posledním kroku pokračuje prezentace.',
             'Živá kamera, skutečná váha a Claude API jsou dostupné v lokální verzi projektu se serverem na Macu.']
    section = re.sub(r'(<script type="application/json" class="poznamky-data">)[\s\S]*?(</script>)',
        lambda m: m.group(1) + json.dumps(notes, ensure_ascii=False) + m.group(2), section, count=1)
    html = html[:match.start()] + section + match.group(2) + html[match.end():]
    write('index.html', html)

    bridge = (DEST / 'js/s06b.js').read_text()
    bridge = replace_once(bridge, "const DEMO = 'http://localhost:8080/';", "const DEMO = new URL('./demo/', document.baseURI).href;")
    write('js/s06b.js', bridge)

    config = json.loads((ROOT / 'demo/config.json').read_text())
    config['analysis'] = {'mode': 'demo'}
    config['camera'] = {'source': 'none', 'labelContains': ''}
    config['detection']['enabled'] = False
    config['school'] = 'Ukázková škola'
    write('demo/config.json', json.dumps(config, ensure_ascii=False, indent=2) + '\n')

    app = (DEST / 'demo/app.js').read_text()
    app = replace_once(app, 'useCamera=true', 'useCamera=false')
    for old, new in [
        ('async function requestCamera(){', 'async function requestCamera(){return; // Static export: no camera access.\n'),
        ('function toggleCamera(){', 'function toggleCamera(){return; // Static export.\n'),
        ('function toggleAuto(){', 'function toggleAuto(){return; // Static export.\n'),
        ('function startRemote(){', 'function startRemote(){return; // Static export: no local receiver.\n'),
        ('async function refreshPhoneStatus(){', 'async function refreshPhoneStatus(){return; // Static export: no API.\n'),
        ("function isLiveAnalysis(){return config?.analysis?.mode==='claude';}", 'function isLiveAnalysis(){return false;}'),
        ('Statická fotografie · C zapne kameru', 'Ukázková fotografie · připravená data'),
        ("'01 / Živě z jídelny'", "'01 / Ukázkové demo'"),
        ('Čekám na talíř…', 'Ukázka měření talíře'),
        ('● měřím', '● ukázková data'),
        ('Vyměňte talíř pod kamerou.', 'Šipkou pokračujte k ukázce zbytků.'),
    ]:
        # Some status labels intentionally occur more than once in the original UI.
        if old == '● měřím':
            if old not in app: raise RuntimeError('Status label changed')
            app = app.replace(old, new)
        else:
            app = replace_once(app, old, new)
    app = replace_once(app,
        'Data se nepodařilo načíst. Spusťte demo přes <code>python3 -m http.server 8080</code> ve složce demo a otevřete localhost:8080.',
        'Ukázková data se nepodařilo načíst. Obnovte stránku.')
    write('demo/app.js', app)

    demo_html = (DEST / 'demo/index.html').read_text()
    demo_html = replace_once(demo_html, '<span class="badge">Prototyp</span>', '<span class="badge orange">Prototyp · ukázková data</span>')
    demo_html = replace_once(demo_html, 'R · začátek &nbsp; C · kamera / fotografie &nbsp; H · nápověda<br>A · automatika &nbsp; B · kalibrace prázdného místa', 'R · začátek &nbsp; H · nápověda')
    demo_html = replace_once(demo_html, 'Kamera detekuje přítomnost objektu. Claude rozpozná jídlo a přečte displej váhy. Denní a měsíční přehledy jsou ukázková data.', 'Tato webová ukázka používá připravené fotografie a výsledky. Kamera ani AI analýza zde neběží.')
    write('demo/index.html', demo_html)
    with (DEST / 'demo/style.css').open('a') as f:
        f.write('\n/* Static export controls: all results are sample data. */\n#phone-button,#auto-button,#camera-button,#phone-help{display:none!important}\n')

    write('_headers', '''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=()
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
