#!/usr/bin/env python3
"""Run the Weng Manual on loopback with disposable, isolated demo accounts.

Uses the real app, API and membership database. No production config or user
database is changed. The source question bodies never enter the static build.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--no-build', action='store_true')
parser.add_argument('--web-port', type=int, default=5188)
parser.add_argument('--api-port', type=int, default=8894)
args = parser.parse_args()
WORK = ROOT / 'artifacts' / 'weng-local-preview'
BUILD = WORK / 'web'
WORK.mkdir(parents=True, exist_ok=True)
for port in [args.web_port, args.api_port]:
    with socket.socket() as check:
        check.settimeout(0.2)
        if check.connect_ex(('127.0.0.1', port)) == 0:
            sys.exit(f'Port {port} is occupied. Reuse the running preview or choose another port.')

source = ROOT / 'data/question-banks/quantvault/problems.json'
if not source.exists():
    sys.exit('Run node scripts/import-quantvault.mjs to prepare the local question file first.')
extra = json.loads(source.read_text())['problems']
base = json.loads((ROOT / 'data/problem-catalog.json').read_text())['problems']
catalog = [item for item in base if item.get('source') != 'quantvault'] + extra
(WORK / 'catalog.json').write_text(json.dumps({'problems': catalog}, ensure_ascii=False))
(WORK / 'empty-jobs.json').write_text('{"jobs":[]}')
env = {key: value for key, value in os.environ.items()
       if not key.startswith('QUANTGYM_') and key not in {'DATABASE_URL', 'PORT', 'HOST'}}
env.update({
    'QUANTGYM_HOST': '127.0.0.1', 'PORT': str(args.api_port),
    'QUANTGYM_DB': str(WORK / 'demo.sqlite3'), 'QUANTGYM_DB_BACKEND': 'sqlite',
    'QUANTGYM_DATABASE_URL': '', 'QUANTGYM_POSTGRES_DATABASE_URL': '', 'DATABASE_URL': '',
    'QUANTGYM_ENABLE_LOCAL_QUANTVAULT': '1', 'QUANTGYM_PRIVATE_WORKSPACES': '0',
    'QUANTGYM_LOCAL_LEARN_ROOT': str(ROOT / 'QuantVault/learn-preview/public/private'),
    'QUANTGYM_PROBLEM_CATALOG': str(WORK / 'catalog.json'),
    'QUANTGYM_JOBS_CATALOG': str(WORK / 'empty-jobs.json'),
    'QUANTGYM_MEDIA_ROOT': str(WORK / 'media'),
    'QUANTGYM_REQUIRE_EMAIL_VERIFICATION': '0', 'QUANTGYM_REQUIRE_INVITE_CODE': '0',
    'QUANTGYM_BETA_EMAIL_ALLOWLIST': '', 'QUANTGYM_ADMIN_EMAILS': '',
    'QUANTGYM_SMTP_HOST': '', 'QUANTGYM_ALERT_WEBHOOK_URL': '', 'QUANTGYM_ALERT_WEBHOOK_TOKEN': '',
    'QUANTGYM_WEB_DIST': str(BUILD),
    'QUANTGYM_WEB_API_ENDPOINT': f'http://127.0.0.1:{args.api_port}/api',
    'QUANTGYM_WEB_LLM_ENDPOINT': 'http://127.0.0.1:8787/interview',
    'QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED': 'false', 'QUANTGYM_WEB_GOOGLE_CLIENT_ID': '',
    'QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT': '/data/problem-catalog.js',
    'QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE': '',
})
if not args.no_build:
    with (WORK / 'build.log').open('w') as log:
        build = subprocess.run(['npm', 'run', 'sync:content'], cwd=ROOT / 'QuantVault/learn-preview', env=env, stdout=log, stderr=log)
        if not build.returncode:
            build = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, env=env, stdout=log, stderr=log)
    if build.returncode:
        sys.exit(f'Build failed; inspect {WORK / "build.log"}.')
if not (BUILD / 'index.html').exists():
    sys.exit('The local build is missing. Run again without --no-build.')
static_catalog = (BUILD / 'data/problem-catalog.js').read_text()
if '"source": "quantvault"' in static_catalog or '"id": "quantvault-' in static_catalog:
    sys.exit('Refusing to serve a static build containing member-only question bodies.')

children = []
def cleanup(*_):
    for child in reversed(children):
        if child.poll() is None:
            child.terminate()
    for child in reversed(children):
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            child.kill()

def request(path, body=None):
    req = urllib.request.Request(f'http://127.0.0.1:{args.api_port}{path}',
        data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)

signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
try:
    api_log = (WORK / 'api.log').open('a')
    children.append(subprocess.Popen([sys.executable, str(ROOT / 'api-server/server.py')],
        cwd=ROOT, env=env, stdout=api_log, stderr=api_log))
    for _ in range(100):
        try:
            request('/health')
            break
        except (OSError, urllib.error.URLError):
            if children[0].poll() is not None:
                sys.exit(f'API failed; inspect {WORK / "api.log"}.')
            time.sleep(0.1)
    else:
        sys.exit('Local API did not become ready.')
    password = 'LocalPreview1234'
    for email, name in [('vip@preview.invalid', '本地 VIP'), ('reader@preview.invalid', '本地普通账号')]:
        try:
            request('/api/auth/register', {'password': password, 'account': {'email': email, 'name': name, 'provider': 'local'}})
        except urllib.error.HTTPError as error:
            if error.code != 409:
                raise
            request('/api/auth/login', {'email': email, 'password': password})
    with sqlite3.connect(WORK / 'demo.sqlite3') as conn:
        conn.execute("INSERT INTO memberships(email_norm,added_by,created_at,updated_at,revoked_at) VALUES(?,NULL,datetime('now'),datetime('now'),NULL) ON CONFLICT(email_norm) DO UPDATE SET revoked_at=NULL,updated_at=datetime('now')", ('vip@preview.invalid',))
    web_log = (WORK / 'web.log').open('a')
    children.append(subprocess.Popen([str(ROOT / 'node_modules/.bin/vite'), 'preview', '--outDir', str(BUILD),
        '--host', '127.0.0.1', '--port', str(args.web_port), '--strictPort'], cwd=ROOT, env=env, stdout=web_log, stderr=web_log))
    print(f'Local preview: http://127.0.0.1:{args.web_port}/problems?bank=quantvault', flush=True)
    print(f'Demo VIP: vip@preview.invalid | Ordinary account: reader@preview.invalid | Password: {password}', flush=True)
    while all(child.poll() is None for child in children):
        time.sleep(1)
finally:
    cleanup()
