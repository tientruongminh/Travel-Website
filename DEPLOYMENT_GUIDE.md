# Production Deployment Setup Guide

## 🚀 Quick Setup (Step by Step)

### Prerequisites
- [ ] Cloudflare account (free tier)
- [ ] Google Cloud account (free tier)
- [ ] Domain name (optional, can use Cloudflare subdomain)

---

## Step 1: Cloudflare Login & Setup

### 1.1 Login to Cloudflare
```bash
cd workers/api
npx wrangler login
```
**Action**: Browser will open → Login → Authorize Wrangler

### 1.2 Create D1 Database (Đã xong)
```bash
npx wrangler d1 create travel-db
```
**Database ID:** `3e15373c-a998-4851-bb88-292a33b12d9a`

### 1.3 Run Database Migrations (Đã xong)
```bash
npx wrangler d1 execute travel-db --file=schema.sql --remote
```

### 1.4 Seed Data (Đã xong)
```bash
npx wrangler d1 execute travel-db --file=seed.sql --remote
```

### 1.5 Create R2 Bucket (Tạm bỏ qua)
Chúng ta đã tạm bỏ qua bước này để deploy nhanh. Khi nào cần upload ảnh, hãy enable R2 và uncomment trong `wrangler.toml`.

### 1.6 Create KV Namespace (Đã xong)
```bash
npx wrangler kv:namespace create "KV"
```
**KV ID:** `e3af7dc06bf14c7fb1468f19f176f623`

---

## Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Travel Website"
3. Enable **Google+ API**

### 2.2 Configure OAuth Consent Screen
1. APIs & Services → OAuth consent screen
2. User Type: **External**
3. Fill in:
   - App name: "Travel Website Demo"
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Scopes: `email`, `profile`, `openid`
5. Save

### 2.3 Create OAuth Credentials
1. Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Name: "Travel Website"
4. Authorized JavaScript origins:
   ```
   http://localhost:8787
   https://your-workers-url.workers.dev
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:8787/api/auth/callback
   https://your-workers-url.workers.dev/api/auth/callback
   ```
6. **Save Client ID and Client Secret**

### 2.4 Set Cloudflare Secrets
```bash
# JWT Secret (generate random string)
npx wrangler secret put JWT_SECRET
# Enter: (paste output from: openssl rand -base64 32)

# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
# Enter: (paste your Google Client ID)

npx wrangler secret put GOOGLE_CLIENT_SECRET
# Enter: (paste your Google Client Secret)
```

---

## Step 3: Cloudflare Stream (Optional - for video upload)

### 3.1 Enable Stream
1. Cloudflare Dashboard → Stream
2. Enable Stream
3. Get Account ID and create API Token

### 3.2 Set Stream Secrets
```bash
npx wrangler secret put STREAM_ACCOUNT_ID
# Enter: (your Cloudflare account ID)

npx wrangler secret put STREAM_API_KEY
# Enter: (your Stream API token)
```

---

## Step 4: Deploy Workers API

```bash
cd workers/api
npm run deploy
```

**Note the deployed URL**, example: `https://travel-api.your-username.workers.dev`

---

## Step 5: Deploy Frontend (Cloudflare Pages)

### Option A: Git Integration (Recommended)
1. Push code to GitHub
2. Cloudflare Dashboard → Pages → Create project
3. Connect GitHub repo
4. Build settings:
   - Framework: None
   - Build command: (leave empty)
   - Output directory: `/`
5. Deploy

### Option B: Direct Upload
```bash
cd ../..
npx wrangler pages deploy . --project-name=travel-website
```

---

## Step 6: Configure Frontend

### 6.1 Update API URL
Edit `js/config.js`:
```javascript
const CONFIG = {
  USE_API: true,  // Enable API
  API_URL: 'https://travel-api.your-username.workers.dev',  // Your Workers URL
};
```

### 6.2 Update Google OAuth Redirect
Go back to Google Cloud Console → Credentials → Edit OAuth Client
Add production URLs:
```
https://travel-website.pages.dev
https://travel-website.pages.dev/api/auth/callback
```

---

## Step 7: Custom Domain (Optional)

### 7.1 Add Domain to Pages
1. Cloudflare Pages → travel-website → Custom domains
2. Add: `travel.yourdomain.com`
3. DNS records auto-configured

### 7.2 Add Domain to Workers
1. Workers → travel-api → Settings → Triggers
2. Add custom domain: `api.yourdomain.com`

### 7.3 Update Config
```javascript
// js/config.js
API_URL: 'https://api.yourdomain.com',
```

---

## Step 8: Configure R2 Public Access

### 8.1 Enable Public Access
1. R2 → travel-images → Settings
2. Public Access → Allow
3. Custom Domain → Add `images.yourdomain.com`

### 8.2 Update Upload Route
Edit `workers/api/src/routes/upload.ts`:
```typescript
const publicUrl = `https://images.yourdomain.com/${key}`;
```

---

## ✅ Verification Checklist

- [ ] Workers API deployed and accessible
- [ ] D1 database has data
- [ ] Frontend deployed on Pages
- [ ] Google login works
- [ ] Upload image to R2 works
- [ ] Map displays spots
- [ ] All features functional

---

## 🎉 Done!

Your production demo is live at:
- **Frontend**: `https://travel-website.pages.dev`
- **API**: `https://travel-api.your-username.workers.dev`

## 📊 Monitoring

### Cloudflare Analytics
- Dashboard → Analytics → Workers/Pages
- View requests, errors, bandwidth

### Add Sentry (Optional)
```bash
npm install @sentry/browser
```

---

## 🆘 Troubleshooting

### Workers not deploying
```bash
npx wrangler whoami  # Check login
npx wrangler deploy --dry-run  # Test deploy
```

### D1 errors
```bash
npx wrangler d1 execute travel-db --command="SELECT COUNT(*) FROM spots"
```

### OAuth not working
- Check redirect URIs match exactly
- Check secrets are set: `npx wrangler secret list`

---

## 💰 Cost Estimate

Based on your usage plan:
- Workers: 125k đ/month
- D1: Free
- R2: 13k đ/month
- Stream: 950k đ/month
- Pages: Free
- **Total**: ~1.26M đ/month
