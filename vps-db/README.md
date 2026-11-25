# Groupsor VPS SQLite Database API (`groups.db`)

Replaces Firebase Firestore for all **groups, channels, categories, countries, reports, and FCM push tokens**, while keeping **cached Firebase Settings** + **FCM Web Push**!

---

## 1. Install on your Ubuntu VPS

```bash
mkdir -p ~/groupsor-db
# Copy files from repo's /vps-db/ into ~/groupsor-db/
cd ~/groupsor-db
npm install
cp .env.example .env
```

Generate a strong secret for `VPS_DB_SECRET`:
```bash
openssl rand -hex 32
```
Edit `~/groupsor-db/.env` and paste that into `VPS_DB_SECRET=...`.

*(Recommended)* To migrate your existing Firestore groups even if free quota or client rules are strict, add your Firebase `service-account.json` to `~/groupsor-db/service-account.json` (or set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env`).

---

## 2. Migrate ALL Existing Groups from Firebase -> `groups.db`

Run the idempotent migration script:
```bash
cd ~/groupsor-db
npm run migrate
```
It preserves every existing group's **exact ID** (`/group/invite/<ID>` links remain 100% unchanged), creation timestamps, click counts, ratings, featured badges, categories, and countries.

---

## 3. Start with PM2 (24/7)

```bash
cd ~/groupsor-db
pm2 start server.mjs --name groupsor-db
pm2 save
```

Check health locally:
```bash
curl -s http://127.0.0.1:4000/health
```

---

## 4. Expose Over HTTPS (Nginx + Cloudflare)

Create `/etc/nginx/sites-available/db-groupsor`:
```nginx
server {
    listen 80;
    server_name db.groupsor.co.uk;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable Nginx + SSL (Certbot / Cloudflare Origin Cert), then add these two Environment Variables in **Vercel**:
- `VPS_DB_URL` = `https://db.groupsor.co.uk`
- `VPS_DB_SECRET` = *(exact same secret from `~/groupsor-db/.env`)*

---

## 5. Daily Automatic SQLite Backup (Recommended)

Add to `crontab -e`:
```cron
0 3 * * * mkdir -p ~/groupsor-db/backups && sqlite3 ~/groupsor-db/data/groups.db ".backup '~/groupsor-db/backups/groups-$(date +\%F).db'" && find ~/groupsor-db/backups -type f -mtime +14 -delete
```
