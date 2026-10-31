#!/bin/sh
# Screenshot slajdu: ./shot.sh 3 2  → /tmp/dojedeno/s3.2.png (slajd 3, krok 2, konečný stav). Bez kroku = krok 0. WebGL přes SwiftShader.
mkdir -p /tmp/dojedeno
H="$1"; [ -n "$2" ] && H="$1.$2"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1920,1080 --virtual-time-budget=6000 --screenshot="/tmp/dojedeno/s$H.png" \
  "file://$(cd "$(dirname "$0")" && pwd)/index.html#$H" >/dev/null 2>&1
echo "/tmp/dojedeno/s$H.png"
