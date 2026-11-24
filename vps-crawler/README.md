# Groupsor VPS Crawler Bot

Polls `https://groupsor.link` for the latest 10 WhatsApp groups and posts newly discovered groups to `https://groupsor.co.uk/api/ingest-group`, which automatically fetches live WhatsApp metadata/images and auto-creates any missing categories or countries in Firestore.

## Quick Setup on Ubuntu VPS (`pm2`)

1. Copy the `vps-crawler` folder to your VPS (e.g. `~/groupsor-crawler`).
2. Install packages and Playwright Chromium dependencies:
   ```bash
   cd ~/groupsor-crawler
   npm install
   npx playwright install chromium
   npx playwright install-deps chromium
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set `INGEST_API_SECRET` to the exact same secret you configured on your Groupsor website host (Vercel / `.env`).
4. Test a single run:
   ```bash
   npm run once
   ```
5. Start with PM2:
   ```bash
   pm2 start crawler.mjs --name groupsor-crawler
   pm2 save
   ```
