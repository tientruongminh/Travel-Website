# Google OAuth Setup Guide

## Quick Setup Steps

### 1. Create Google Cloud Project (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: "Travel Website" → Create

### 2. Enable Google+ API (1 minute)

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 3. Configure OAuth Consent Screen (3 minutes)

1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: **External** → Create
3. Fill in:
   - App name: `Travel Website`
   - User support email: `your-email@gmail.com`
   - Developer contact: `your-email@gmail.com`
4. Click "Save and Continue"
5. Scopes: Skip (default scopes are fine)
6. Test users: Skip
7. Click "Back to Dashboard"

### 4. Create OAuth Credentials (2 minutes)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Web application**
4. Name: `Travel Website`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:8787
   https://travel-api.truongminhtien07122005.workers.dev
   https://travel-website-8xj.pages.dev
   ```

6. **Authorized redirect URIs:**
   ```
   http://localhost:8787/api/auth/callback
   https://travel-api.truongminhtien07122005.workers.dev/api/auth/callback
   https://travel-website-8xj.pages.dev/api/auth/callback
   ```

7. Click "Create"
8. **COPY** the Client ID and Client Secret (you'll need these next)

### 5. Set Cloudflare Secrets (3 minutes)

```bash
cd workers/api

# Generate JWT secret
openssl rand -base64 32
# Copy the output

# Set JWT secret
npx wrangler secret put JWT_SECRET
# Paste the generated secret when prompted

# Set Google Client ID
npx wrangler secret put GOOGLE_CLIENT_ID
# Paste your Google Client ID

# Set Google Client Secret
npx wrangler secret put GOOGLE_CLIENT_SECRET
# Paste your Google Client Secret
```

### 6. Deploy Backend (1 minute)

```bash
npm run deploy
```

### 7. Test OAuth Flow (1 minute)

Visit: `https://travel-api.truongminhtien07122005.workers.dev/api/auth/login`

You should be redirected to Google login, then back to your frontend with a token.

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that your redirect URIs in Google Console **exactly match** the URLs above
- Make sure there are no trailing slashes

### Error: "Google OAuth not configured"
- Verify secrets are set: `npx wrangler secret list`
- Re-run the secret commands if needed

### Error: "Invalid token"
- JWT_SECRET might not be set correctly
- Regenerate and set a new JWT_SECRET

---

## Testing Locally

For local development:

1. Run local dev server:
   ```bash
   cd workers/api
   npm run dev
   ```

2. Visit: `http://localhost:8787/api/auth/login`

3. After successful login, you'll be redirected to `http://localhost:8787/?token=...`

---

## Security Notes

- ✅ JWT tokens expire after 7 days
- ✅ Tokens are stored in KV with automatic expiration
- ✅ Google OAuth uses PKCE flow for security
- ✅ All protected endpoints require valid JWT

---

## Next Steps

After OAuth is working:
1. Implement frontend login UI
2. Add token storage in localStorage
3. Update API calls to include auth headers
4. Add user profile display
