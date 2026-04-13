import paramiko, sys, time

host = '72.61.254.230'
user = 'supportdesk'
password = 'HwNxyujEziMu9puHP3G2'

cmd = (
    "cd ~/supportboard && git pull origin main 2>&1 && "
    "pm2 restart onlypoa-live 2>&1 && sleep 5 && "
    "mysql -u sdapp -p'SupportDesk2026!' supportboard -e \""
    "UPDATE conversations c "
    "JOIN (SELECT conversation_id, MAX(created_at) as max_ts FROM messages GROUP BY conversation_id) m "
    "ON c.id=m.conversation_id "
    "SET c.updated_at=m.max_ts "
    "WHERE c.inbox_id='ib2' AND m.max_ts > c.updated_at; "
    "SELECT id, subject, updated_at FROM conversations WHERE inbox_id='ib2' ORDER BY updated_at DESC LIMIT 5;\""
)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=240)
for line in iter(stdout.readline, ''):
    print(line.encode('ascii', 'replace').decode('ascii'), end='', flush=True)

exit_code = stdout.channel.recv_exit_status()
client.close()
print(f'\n--- exit code: {exit_code} ---')
sys.exit(exit_code)
