#!/usr/bin/env python3
"""Validate and install a private Learn bundle to a versioned persistent folder.

Does not change feature flags, replace prior releases, or open a user database.
Use the emitted problemsFile with import_private_practice.py after installation.
"""
import argparse
import json
import sys
from learning_release import install_release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', required=True)
    parser.add_argument('--root', required=True, help='Private persistent folder, never the web document root.')
    args = parser.parse_args()
    try:
        summary = install_release(args.file, args.root)
    except Exception:
        print('Private learning release installation failed; no existing release or database was replaced.', file=sys.stderr)
        return 1
    print(json.dumps(summary))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
