import paramiko, os
os.environ['PYTHONIOENCODING'] = 'utf-8'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.61.254.230', username='supportdesk', password='HwNxyujEziMu9puHP3G2', timeout=15)

def run(cmd, timeout=30):
    print(f"\n$ {cmd[:180]}")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        for line in (out or '(empty)').split('\n')[-30:]:
            try: print(line)
            except: pass
        if err and stdout.channel.recv_exit_status() != 0:
            for line in err.split('\n')[-5:]:
                try: print(f"! {line}")
                except: pass
        return out
    except Exception as e:
        print(f"  ERROR: {e}")
        return ""

# Check server logs
run("tail -30 ~/supportdesk.log")

# Check MySQL - try to find what credentials work
print("\n\n=== MYSQL AUTH TEST ===")
run("mysql -u root -e 'SELECT 1' 2>&1 || echo 'root no-pass: FAIL'")

# Check if there's a Docker MySQL or local MySQL
run("docker ps 2>/dev/null | grep -i mysql || echo 'No docker mysql'")
run("cat /etc/mysql/mysql.conf.d/mysqld.cnf 2>/dev/null | grep -E 'bind|port|socket' || echo 'no mysql conf'")

# Check if the server's DB actually connected
run("curl -s http://localhost:4002/api/conversations 2>/dev/null | head -c 200")

ssh.close()
