import paramiko, os, time
os.environ['PYTHONIOENCODING'] = 'utf-8'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.254.230', username='supportdesk', password='HwNxyujEziMu9puHP3G2', timeout=15)

def run(cmd, timeout=120):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        for line in (out or '').split('\n')[-10:]:
            try: print(line)
            except: pass
        return out
    except Exception as e:
        print(f"  TIMEOUT: {e}")
        return ""

run("cd ~/supportboard && git pull origin main 2>&1")
run("cd ~/supportboard/frontend && npm run build 2>&1 | tail -3", timeout=120)
run("pm2 restart onlypoa-live 2>&1 | tail -5")
time.sleep(4)
run("curl -sk -o /dev/null -w 'data-deletion: %{http_code}' https://www.onlypoa.com/data-deletion.html 2>/dev/null; echo")
run("curl -sk https://www.onlypoa.com/data-deletion.html 2>/dev/null | head -5")
print("\nDone!")
ssh.close()
