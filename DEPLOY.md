# SupportDesk — Manual Deployment Guide

## Prerequisites

- SSH access to the server
- Git, Node.js (v22+), npm installed on the server

---

## 1. SSH into the Server

```bash
ssh supportdesk@72.61.254.230
# Password: HwNxyujEziMu9puHP3G2
```

---

## 2. Pull Latest Code

```bash
cd ~/supportboard
git pull origin main
```

---

## 3. Install / Update Dependencies

```bash
# Backend
cd ~/supportboard/backend
npm install

# Frontend
cd ~/supportboard/frontend
npm install
```

---

## 4. Environment File

Check the `.env` exists:

```bash
cat ~/supportboard/backend/.env
```

Expected contents:

```env
PORT=4002
DB_HOST=127.0.0.1
DB_USER=sdapp
DB_PASS=SupportDesk2026!
DB_NAME=supportboard
DATABASE_URL=mysql://sdapp:SupportDesk2026%21@127.0.0.1:3306/supportboard
JWT_SECRET=supportdesk_secret_2026
NODE_ENV=production
EMAIL_POLL_INTERVAL_MS=15000
```

If missing, recreate it:

```bash
cat > ~/supportboard/backend/.env << 'EOF'
PORT=4002
DB_HOST=127.0.0.1
DB_USER=sdapp
DB_PASS=SupportDesk2026!
DB_NAME=supportboard
DATABASE_URL=mysql://sdapp:SupportDesk2026%21@127.0.0.1:3306/supportboard
JWT_SECRET=supportdesk_secret_2026
NODE_ENV=production
EMAIL_POLL_INTERVAL_MS=15000
EOF
```

---

## 5. Database Migration

The app uses `db.js` which runs automatically on server start and handles:

- `CREATE TABLE IF NOT EXISTS` — creates any new tables
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — adds new columns
- Seeds initial data if needed

**No separate migration command is needed** — just restart the server (Step 7) and all migrations run automatically.

### Manual migration (if you added a new column and need it now without a restart)

```bash
mysql -u sdapp -p'SupportDesk2026!' supportboard -e "
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS html TEXT NULL;
"
```

Replace the SQL above with your actual column definitions.

### Prisma schema changes (if you edited `schema.prisma`)

```bash
cd ~/supportboard/backend
npx prisma generate
npx prisma db push --accept-data-loss
```

---

## 6. Build Frontend

```bash
cd ~/supportboard/frontend
npm run build
```

Output goes to `~/supportboard/frontend/dist/` — the backend serves this as static files.

---

## 7. Restart Server

```bash
# Restart existing PM2 process
pm2 restart onlypoa-live

# OR — start fresh if process doesn't exist
cd ~/supportboard/backend
pm2 start server.js --name onlypoa-live
pm2 save
```

---

## 8. Verify

```bash
# Check PM2 status
pm2 list

# Tail live logs
pm2 logs onlypoa-live --lines 30

# Test backend locally
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4002/

# Test live domain
curl -sk -o /dev/null -w '%{http_code}\n' https://www.onlypoa.com/
```

Expected: `200`

---

## Quick Deploy (all-in-one)

```bash
cd ~/supportboard && git pull origin main \
  && cd backend && npm install \
  && cd ../frontend && npm install && npm run build \
  && pm2 restart onlypoa-live \
  && pm2 logs onlypoa-live --lines 20 --nostream
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port already in use | `pkill -f 'node server.js'` then `pm2 restart onlypoa-live` |
| DB connection failed | Verify: `mysql -u sdapp -p'SupportDesk2026!' supportboard -e 'SELECT 1'` |
| Prisma error on startup | Run `npx prisma generate` in `backend/` folder |
| Frontend not updated | Run `npm run build` in `frontend/`, then restart PM2 |
| IMAP not polling | Check email credentials in Settings > Inboxes |
| Redis not connected | `redis-cli ping` — should return `PONG` |
| nginx returning 502 | CloudPanel Vhost must proxy to port `4002` not `4001` |
