import paramiko, os, time
from urllib.parse import quote
os.environ['PYTHONIOENCODING'] = 'utf-8'

HOST = '72.61.254.230'
USER = 'supportdesk'
PASS = 'HwNxyujEziMu9puHP3G2'

def run(ssh, cmd, timeout=60):
    try:
        print(f"\n$ {cmd[:180]}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        code = stdout.channel.recv_exit_status()
        for line in (out + ("\n" + err if err else "")).split('\n')[-25:]:
            try: print(line)
            except: pass
        return out, code
    except Exception as e:
        print(f"  TIMEOUT: {e}")
        return "", 1

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)
print("=== Connected ===\n")

# 1. Test MySQL with sdapp user
print("="*50 + "\n  1. Test MySQL\n" + "="*50)
out, code = run(ssh, "mysql -u sdapp -p'SupportDesk2026!' supportboard -e 'SELECT 1 as ok' 2>&1")
if '1' not in out:
    print("\n  sdapp user not working. Please create it in CloudPanel first.")
    ssh.close()
    exit(1)

print("\n  MySQL OK!")
db_user = 'sdapp'
db_pass = 'SupportDesk2026!'

# 2. Update .env
print("\n" + "="*50 + "\n  2. Update .env\n" + "="*50)
encoded = quote(db_pass, safe='')
db_url = f"mysql://{db_user}:{encoded}@127.0.0.1:3306/supportboard"
run(ssh, f"""cat > ~/supportboard/backend/.env << 'ENVEOF'
PORT=4002
DB_HOST=127.0.0.1
DB_USER={db_user}
DB_PASS={db_pass}
DB_NAME=supportboard
DATABASE_URL={db_url}
JWT_SECRET=supportdesk_secret_2026
NODE_ENV=production
EMAIL_POLL_INTERVAL_MS=15000
ENVEOF
echo '.env updated'""")

# 3. Prisma push
print("\n" + "="*50 + "\n  3. Prisma DB Push\n" + "="*50)
run(ssh, "cd ~/supportboard/backend && npx prisma db push --accept-data-loss 2>&1 | tail -10", timeout=90)

# 4. Set max_allowed_packet
print("\n" + "="*50 + "\n  4. MySQL config\n" + "="*50)
run(ssh, f"mysql -u {db_user} -p'{db_pass}' -e 'SET GLOBAL max_allowed_packet=67108864' 2>&1 || echo 'skip - needs SUPER privilege'")

# 5. Stop old server
print("\n" + "="*50 + "\n  5. Stop old server\n" + "="*50)
run(ssh, "pkill -f 'node server.js' 2>/dev/null; sleep 1; echo 'Stopped'")

# 6. Start server
print("\n" + "="*50 + "\n  6. Start server\n" + "="*50)
transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command("cd ~/supportboard/backend && nohup node server.js >> ~/supportdesk.log 2>&1 &")
channel.close()
print("  Server starting...")
time.sleep(6)

# 7. Verify
print("\n" + "="*50 + "\n  7. Verify\n" + "="*50)
run(ssh, """tail -20 ~/supportdesk.log
echo
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4002/api/conversations 2>/dev/null)
echo "HTTP Status: $HTTP"
if [ "$HTTP" = "401" ] || [ "$HTTP" = "200" ]; then
  echo "SERVER RUNNING OK"
else
  echo "Server issue"
fi
echo
ss -tlnp | grep 4002
echo
hostname -I""")

print("\n" + "="*50)
print("  DEPLOYMENT COMPLETE")
print("  URL: http://72.61.254.230:4002")
print("="*50)
ssh.close()
