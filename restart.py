import paramiko, os, time
os.environ['PYTHONIOENCODING'] = 'utf-8'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.254.230', username='supportdesk', password='HwNxyujEziMu9puHP3G2', timeout=15)

def run(cmd, timeout=60):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        for line in (out or '').split('\n')[-20:]:
            try: print(line)
            except: pass
        return out
    except Exception as e:
        print(f"  TIMEOUT: {e}")
        return ""

# Check if localhost:4002 is hardcoded in the built JS
print("=== Check built JS for localhost ===")
run("grep -o 'localhost:4002' ~/supportboard/frontend/dist/assets/*.js | head -5")
run("grep -o 'VITE_BACKEND_URL' ~/supportboard/frontend/dist/assets/*.js | head -3")

# Check .env.production
print("\n=== .env files ===")
run("cat ~/supportboard/frontend/.env.production 2>/dev/null")
run("cat ~/supportboard/frontend/.env 2>/dev/null")

ssh.close()
