#!/usr/bin/env python3
"""
Deploy to live server via SSH + git pull.
Usage: python deploy.py
"""
import paramiko, subprocess, sys, os

HOST     = os.getenv('DEPLOY_HOST', '72.61.254.230')
USER     = os.getenv('DEPLOY_USER', 'supportdesk')
PASS     = os.getenv('DEPLOY_PASS', 'HwNxyujEziMu9puHP3G2')
PM2_NAME = os.getenv('DEPLOY_PM2', 'onlypoa-live')

# ── Step 1: push local branch → main ──────────────────────────────────────
cur = subprocess.check_output('git branch --show-current', shell=True).decode().strip()
print(f'Current branch: {cur}')

def local(cmd):
    print(f'\n[local] {cmd}')
    rc = subprocess.call(cmd, shell=True)
    if rc != 0:
        print(f'FAILED (exit {rc})')
        sys.exit(rc)

if cur != 'main':
    local(f'git push origin {cur}')
    local('git checkout main')

local('git pull origin main --no-edit')

if cur != 'main':
    local(f'git merge {cur} --no-edit')

local('git push origin main')

# ── Step 2: SSH + run everything in one chained command ───────────────────
cmd = (
    'cd ~/supportboard && '
    'git checkout -- . 2>/dev/null; git fetch origin && git checkout main && git pull origin main 2>&1 && '
    'echo "--- backend npm install ---" && cd ~/supportboard/backend && npm install --production 2>&1 && '
    'echo "--- frontend npm install ---" && cd ~/supportboard/frontend && npm install 2>&1 && '
    'echo "--- frontend build ---" && npm run build 2>&1 && '
    f'echo "--- pm2 restart ---" && pm2 restart {PM2_NAME} 2>&1 && '
    'echo "--- done ---"'
)

print(f'\nConnecting to {HOST}...')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=60, banner_timeout=60, auth_timeout=60)
print('Connected.\n')

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=300)
for line in iter(stdout.readline, ''):
    print(line.encode('ascii', 'replace').decode('ascii'), end='', flush=True)

exit_code = stdout.channel.recv_exit_status()
client.close()

# ── Step 3: return to dev branch ──────────────────────────────────────────
if cur != 'main':
    subprocess.call(f'git checkout {cur}', shell=True)

print(f'\n--- exit code: {exit_code} ---')
if exit_code == 0:
    print(f'DEPLOYMENT SUCCESSFUL  >>  http://{HOST}')
sys.exit(exit_code)
