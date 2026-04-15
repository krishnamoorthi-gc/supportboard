import paramiko, sys, time

host = '72.61.254.230'
user = 'supportdesk'
password = 'HwNxyujEziMu9puHP3G2'

cmd = (
    "cd ~/supportboard && "
    "git fetch origin && git checkout main && git pull origin main 2>&1 && "
    "echo '--- backend npm install ---' && cd ~/supportboard/backend && npm install --production 2>&1 && "
    "echo '--- frontend npm install ---' && cd ~/supportboard/frontend && npm install 2>&1 && "
    "echo '--- frontend build ---' && npm run build 2>&1 && "
    "echo '--- pm2 restart ---' && pm2 restart supportdesk 2>&1 && "
    "echo '--- done ---'"
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
