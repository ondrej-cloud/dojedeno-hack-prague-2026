#!/usr/bin/env python3
"""Open the private presenter link without printing its access token."""
import argparse
import subprocess
from pathlib import Path
from urllib.parse import quote

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--demo', action='store_true', help='Open the demo alone instead of the deck')
args = parser.parse_args()
token_path = root / 'demo/.local/live-desktop-token'
if not token_path.exists():
    raise SystemExit('Nejdřív spusťte demo/tools/live_gateway.py.')
token = token_path.read_text().strip()
url = 'https://dojezeno.netlify.app/' + ('demo/' if args.demo else '') + '#live=' + quote(token, safe='')
subprocess.run(['open', '-a', 'Google Chrome', url], check=True)
print('Otevřeno v Chromu. Přístupový kód zůstává pouze v tomto Macu a relaci prohlížeče.')
