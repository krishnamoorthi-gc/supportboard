import paramiko, os, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

host = '72.61.254.230'
user = 'supportdesk'
password = 'HwNxyujEziMu9puHP3G2'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=30)

base_local = 'C:/Users/GC-IT/Documents/supportdesk/supportdesk'
base_remote = '/home/supportdesk/supportboard'

# Step 1: Fix assets directory
print("--- Fixing assets directory ---")
cmd = (
    "rm -rf /home/supportdesk/supportboard/frontend/dist_build/assets_old_root 2>&1; "
    "mv /home/supportdesk/supportboard/frontend/dist_build/assets "
    "/home/supportdesk/supportboard/frontend/dist_build/assets_old_root 2>&1; "
    "mkdir -p /home/supportdesk/supportboard/frontend/dist_build/assets 2>&1; "
    "echo done"
)
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

# Step 2: Ensure routes directory exists
print("--- Ensuring directories ---")
ssh.exec_command(f"mkdir -p {base_remote}/backend/routes {base_remote}/frontend/src/pages {base_remote}/frontend/dist_build/assets", timeout=10)
time.sleep(0.5)

# Step 3: Upload all changed files via SFTP
sftp = ssh.open_sftp()

files = [
    # Backend - database & server
    'backend/db.js',
    'backend/server.js',
    # Backend - routes (modified)
    'backend/routes/auth.js',
    'backend/routes/contacts.js',
    'backend/routes/settings.js',
    'backend/routes/ai.js',
    'backend/routes/sales-agent.js',
    'backend/routes/marketing.js',
    # Backend - new route
    'backend/routes/users.js',
    # Frontend - source
    'frontend/src/shared.tsx',
    'frontend/src/App.tsx',
    'frontend/src/pages/UserManagementScr.tsx',
    'frontend/src/pages/MarketingScr.tsx',
    # Frontend - production build
    'frontend/dist_build/index.html',
    'frontend/dist_build/assets/index-DviSrNrS.js',
]

for rel in files:
    local_path = os.path.join(base_local, rel).replace(chr(92), '/')
    remote_path = base_remote + '/' + rel
    if not os.path.exists(local_path):
        print(f'SKIP {rel} (not found locally)')
        continue
    try:
        sftp.put(local_path, remote_path)
        size = os.path.getsize(local_path)
        print(f'Uploaded {rel} ({size:,} bytes)')
    except Exception as e:
        print(f'Failed {rel}: {e} - trying rm workaround')
        try:
            ssh.exec_command(f'rm -f {remote_path}')
            time.sleep(0.5)
            sftp.put(local_path, remote_path)
            print(f'Re-uploaded {rel} after rm')
        except Exception as e2:
            print(f'Still failed {rel}: {e2}')

sftp.close()

# Step 4: Restart PM2
print("\n--- Restarting PM2 ---")
stdin, stdout, stderr = ssh.exec_command("pm2 restart onlypoa-live 2>&1 | cat", timeout=30)
print(stdout.read().decode('utf-8', errors='replace'))
time.sleep(3)

# Step 5: Check PM2 status
print("--- PM2 Status ---")
stdin, stdout, stderr = ssh.exec_command("pm2 list 2>&1 | cat", timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

# Step 6: Verify files
print("--- Verifying build assets ---")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/supportdesk/supportboard/frontend/dist_build/assets/ 2>&1", timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

print("--- Checking new users route ---")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/supportdesk/supportboard/backend/routes/users.js 2>&1", timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

# Step 7: Check logs for errors
print("--- Recent PM2 logs ---")
stdin, stdout, stderr = ssh.exec_command("pm2 logs onlypoa-live --lines 15 --nostream 2>&1 | cat", timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print("\nDeploy complete!")
