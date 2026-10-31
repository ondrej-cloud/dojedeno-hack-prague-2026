"""Složí index.html z index.template.html a slajdů ve slajdy/NN-*.html (v pořadí čísel),
připojí css/sNN.css a js/sNN.js, pokud existují. Spuštění: python3 build.py"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
slajdy = sorted((ROOT / "slajdy").glob("[0-9][0-9]*-*.html"))
tpl = (ROOT / "index.template.html").read_text(encoding="utf-8")
html = "\n\n".join(p.read_text(encoding="utf-8").strip() for p in slajdy)
css = "\n".join(f'<link rel="stylesheet" href="css/{p.name}">' for p in sorted((ROOT / "css").glob("s[0-9][0-9]*.css")))
js = "\n".join(f'<script src="js/{p.name}"></script>' for p in sorted((ROOT / "js").glob("s[0-9][0-9]*.js")))
out = tpl.replace("<!--SLAJDY-->", html).replace("<!--CSS-->", css).replace("<!--JS-->", js)
(ROOT / "index.html").write_text(out, encoding="utf-8")
print(f"index.html: {len(slajdy)} slajdů, {css.count('<link')} css, {js.count('<script')} js")
