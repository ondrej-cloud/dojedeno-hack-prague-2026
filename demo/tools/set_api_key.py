#!/usr/bin/env python3
"""Save the Anthropic API key locally without echoing or logging it."""
import getpass
import os
from pathlib import Path


def main():
    value = getpass.getpass('Anthropic API klíč (skrytý vstup): ').strip()
    if not value or any(c.isspace() for c in value):
        raise SystemExit('Klíč nesmí být prázdný ani obsahovat mezery. Nic nebylo uloženo.')
    private = Path(__file__).resolve().parents[1] / '.local'
    private.mkdir(mode=0o700, exist_ok=True)
    private.chmod(0o700)
    destination = private / 'anthropic-api-key'
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(value)
    destination.chmod(0o600)
    print('Klíč uložen lokálně. Obnovte stav dema; server není nutné restartovat.')


if __name__ == '__main__':
    main()
