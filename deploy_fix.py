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

# Step 1: Move root-owned assets dir out of the way, create fresh one
print("--- Fixing assets directory ---")
cmd = (
    "mv /home/supportdesk/supportboard/frontend/dist_build/assets "
    "/home/supportdesk/supportboard/frontend/dist_build/assets_old_root 2>&1; "
    "mkdir -p /home/supportdesk/supportboard/frontend/dist_build/assets 2>&1; "
    "echo done"
)
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

# Step 2: Upload files via SFTP
sftp = ssh.open_sftp()

files = [
    'frontend/src/App.tsx',
    'backend/routes/conversations.js',
    'frontend/dist_build/index.html',
    'frontend/dist_build/assets/index-BDe1JC9s.js',
]

for rel in files:
    local_path = os.path.join(base_local, rel).replace(chr(92), '/')
    remote_path = base_remote + '/' + rel
    try:
        sftp.put(local_path, remote_path)
        print(f'Uploaded {rel}')
    except Exception as e:
        print(f'Failed {rel}: {e} - trying rm workaround')
        try:
            ssh.exec_command(f'rm -f {remote_path}')
            time.sleep(0.5)
            sftp.put(local_path, remote_path)
            print(f'Re-uploaded {rel} after rm')
        except Exception as e2:
            print(f'Still failed {rel}: {e2}')

# Also upload other HTML files
for html in ['landing.html', 'about.html', 'privacy.html', 'terms.html', 'data-deletion.html']:
    local_path = os.path.join(base_local, 'frontend/dist_build', html).replace(chr(92), '/')
    remote_path = f'{base_remote}/frontend/dist_build/{html}'
    try:
        sftp.put(local_path, remote_path)
        print(f'Uploaded dist_build/{html}')
    except Exception as e:
        print(f'Failed {html}: {e}')

sftp.close()

# Step 3: Restart PM2
print("\n--- Restarting PM2 ---")
stdin, stdout, stderr = ssh.exec_command("pm2 restart onlypoa-live 2>&1 | cat", timeout=15)
print(stdout.read().decode('utf-8', errors='replace'))

# Verify
print("--- Verifying ---")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/supportdesk/supportboard/frontend/dist_build/assets/ 2>&1", timeout=10)
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print("Deploy complete!")
