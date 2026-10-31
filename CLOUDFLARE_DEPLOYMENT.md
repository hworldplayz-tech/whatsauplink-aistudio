# ☁️ Cloudflare Deployment Guide for WhatsUpLink

This project is now 100% prepared for **1-click Git deployment to Cloudflare** using the official **OpenNext for Cloudflare** adapter (`@opennextjs/cloudflare` + `wrangler`).

---

## 🚀 How to Deploy to Cloudflare with One Click

### Step 1: Push Your Code to GitHub
Push this repository to your GitHub account:
```bash
git add .
git commit -m "Configure Cloudflare deployment with OpenNext and Firebase"
git push origin main
```

---

### Step 2: Connect to Cloudflare

#### Option A: Cloudflare Workers (Recommended - Native Git Integration)
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the sidebar, select **Workers & Pages** -> **Overview**.
3. Click **Create Application** -> Select **Workers** -> Click **Connect to Git** (or GitHub integration).
4. Choose your `whatsuplink` repository and branch (`main`).
5. Cloudflare will automatically detect the `wrangler.jsonc` file!
   - **Build command**: `npm run build:cloudflare` (or `npx @opennextjs/cloudflare build`)
   - **Deploy command**: `npx @opennextjs/cloudflare deploy`
6. Click **Save and Deploy**!

---

#### Option B: Cloudflare Pages (Classic)
1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Select your repository.
3. Configure your build settings:
   - **Framework preset**: `None` or `Next.js`
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.open-next/assets`
4. Under **Settings** -> **Functions** -> **Compatibility Flags**:
   - Add flag: `nodejs_compat`
   - Compatibility date: `2024-09-23` (or current)
5. Click **Save and Deploy**!

---

## 🔒 Firebase Configuration & Environment Variables

The project already has **automatic fallback credentials** built in, so even if you don't enter any environment variables in Cloudflare, **your app will start working immediately without any configuration errors!**

If you prefer to configure your own environment variables in the Cloudflare Dashboard under **Settings -> Variables and Secrets**, you can add:

| Key | Value / Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyAXA-mRInS2LqWzxU43eKNbVl_l-WQZang` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `moovie-35706.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `moovie-35706` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `moovie-35706.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `1046379679363` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:1046379679363:web:f37ebc4a08008f58d695b6` |
| `ADMIN_USERNAME` | `hworldplayz` (or your preferred admin username) |
| `ADMIN_PASSWORD` | `hworldplayz@512` (or your preferred admin password) |

---

## 🛠 Useful Local Commands

- `npm run dev`: Run local development server
- `npm run build:cloudflare`: Run OpenNext Cloudflare build
- `npm run preview:cloudflare`: Preview the Cloudflare worker locally using Wrangler
- `npm run deploy:cloudflare`: Direct CLI deployment to Cloudflare with Wrangler
