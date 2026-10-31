#!/usr/bin/env python3
"""Open the public live demo or presentation."""
import argparse
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--demo', action='store_true', help='Open the demo alone instead of the deck')
args = parser.parse_args()
url = 'https://dojezeno.netlify.app/' + ('demo/' if args.demo else '')
subprocess.run(['open', '-a', 'Google Chrome', url], check=True)
print('Otevřeno v Chromu. Přístupový kód není potřeba.')
