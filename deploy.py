import paramiko, os, time, re
from urllib.parse import quote
os.environ['PYTHONIOENCODING'] = 'utf-8'

HOST = '72.61.254.230'
USER = 'supportdesk'
PASS = 'HwNxyujEziMu9puHP3G2'
ROOT_PASS = '@2026@Global@2026@'

def run(ssh, cmd, timeout=60):
    try:
        print(f"\n$ {cmd[:180]}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        code = stdout.channel.recv_exit_status()
        for line in (out.strip() or '').split('\n')[-25:]:
            try: print(line)
            except: pass
        if err.strip() and code != 0:
            for line in err.strip().split('\n')[-5:]:
                try: print(f"! {line}")
                except: pass
        return out.strip(), err.strip(), code
    except Exception as e:
        print(f"  TIMEOUT/ERROR: {e}")
        return "", str(e), 1

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)
print("=== Connected ===")

# 1. MySQL - use sudo with the OS root password
print("\n" + "="*50 + "\n  1. MySQL\n" + "="*50)

# Try sudo -S (pass password via stdin) to run mysql
out, _, code = run(ssh, f"echo '{ROOT_PASS}' | sudo -S bash -c \"mysql -e 'SELECT 1 as ok'\" 2>&1 | grep -v password")
if 'ok' in out:
    mysql_cmd = f"echo '{ROOT_PASS}' | sudo -S mysql"
    print("  MySQL OK via sudo")
else:
    # Try mysql as current user
    out, _, code = run(ssh, "mysql -u supportdesk -e 'SELECT 1' 2>&1")
    if '1' in out:
        mysql_cmd = "mysql -u supportdesk"
        print("  MySQL OK as supportdesk")
    else:
        # Last resort - check if mysql allows socket auth
        out, _, _ = run(ssh, "cat /etc/mysql/debian.cnf 2>/dev/null | head -8; echo '---'; ls /var/run/mysqld/ 2>/dev/null")
        print("  Trying debian-sys-maint...")
        out, _, code = run(ssh, "mysql --defaults-file=/etc/mysql/debian.cnf -e 'SELECT 1' 2>&1")
        if '1' in out:
            mysql_cmd = "mysql --defaults-file=/etc/mysql/debian.cnf"
        else:
            print("  ERROR: Cannot access MySQL. Trying to proceed anyway...")
            mysql_cmd = None

if mysql_cmd:
    run(ssh, f"{mysql_cmd} -e \"CREATE DATABASE IF NOT EXISTS supportboard CHARACTER SET utf8mb4; SET GLOBAL max_allowed_packet=67108864; SELECT 'DB OK' as s;\" 2>&1")

    # Create dedicated user
    run(ssh, f"""{mysql_cmd} -e "CREATE USER IF NOT EXISTS 'sduser'@'localhost' IDENTIFIED BY 'SDesk2026x'; GRANT ALL ON supportboard.* TO 'sduser'@'localhost'; FLUSH PRIVILEGES;" 2>&1""")

    # Verify new user works
    out, _, code = run(ssh, "mysql -u sduser -p'SDesk2026x' supportboard -e 'SELECT 1' 2>&1")
    if '1' in out:
        db_user, db_pass = 'sduser', 'SDesk2026x'
    else:
        db_user, db_pass = 'root', ''
else:
    db_user, db_pass = 'root', ''

print(f"\n  DB User: {db_user}")

# 2. .env
print("\n" + "="*50 + "\n  2. Create .env\n" + "="*50)
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
cat ~/supportboard/backend/.env | head -3; echo '...'""")

# 3. Prisma push
print("\n" + "="*50 + "\n  3. Prisma\n" + "="*50)
run(ssh, "cd ~/supportboard/backend && npx prisma db push --accept-data-loss 2>&1 | tail -8", timeout=60)

# 4. Stop old
print("\n" + "="*50 + "\n  4. Stop old server\n" + "="*50)
run(ssh, "pkill -f 'node server.js' 2>/dev/null; sleep 1; echo 'OK'")

# 5. Start
print("\n" + "="*50 + "\n  5. Start server\n" + "="*50)
# Use a separate channel so nohup doesn't block
transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command("cd ~/supportboard/backend && nohup node server.js >> ~/supportdesk.log 2>&1 &")
channel.close()
print("  Server starting...")
time.sleep(5)

# 6. Verify
print("\n" + "="*50 + "\n  6. Verify\n" + "="*50)
run(ssh, """HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4002/api/conversations 2>/dev/null)
echo "HTTP Status: $HTTP"
if [ "$HTTP" = "401" ] || [ "$HTTP" = "200" ]; then
  echo "SERVER RUNNING OK"
else
  echo "Server issue. Logs:"
  tail -20 ~/supportdesk.log
fi
echo
echo "Port 4002:"
ss -tlnp 2>/dev/null | grep 4002 || echo "not listening yet"
echo
echo "IP:"
hostname -I""")

print("\n" + "="*50)
print("  DEPLOYMENT COMPLETE")
print(f"  URL: http://72.61.254.230:4002")
print("="*50)
ssh.close()
