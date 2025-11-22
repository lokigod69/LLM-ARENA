# Google OAuth Setup Instructions

## Step 1: Access Google Cloud Console

Navigate to: https://console.cloud.google.com/

## Step 2: Create or Select Project

- If you don't have a project, click "Create Project"
- Name it something like "Matrix Arena" or "LLM Arena"
- Click "Create"

## Step 3: Enable Google+ API (If Required)

- Navigate to "APIs & Services" > "Library"
- Search for "Google+ API" or "Google Identity"
- Click "Enable" (if not already enabled)

## Step 4: Create OAuth 2.0 Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen first:
   - User Type: External
   - App name: "Matrix Arena" (or your app name)
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Click "Save and Continue"
   - Scopes: Add `email`, `profile` (default is fine)
   - Test users: Add your email for testing
   - Click "Save and Continue"

4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Matrix Arena Web Client"

5. **Authorized JavaScript origins** (add both):
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```

6. **Authorized redirect URIs** (add both):
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-production-domain.com/api/auth/callback/google
   ```

7. Click "Create"

## Step 5: Save Credentials

You'll see a modal with:
- **Client ID**: `xxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`

Copy both values.

## Step 6: Add to .env.local

```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 7: Update for Production

When deploying to production:

1. Go back to Google Cloud Console > Credentials
2. Edit your OAuth 2.0 Client ID
3. Add production redirect URI:
   ```
   https://your-production-domain.com/api/auth/callback/google
   ```
4. Add production origin:
   ```
   https://your-production-domain.com
   ```
5. Update `.env` variables in Vercel/hosting platform

## Troubleshooting

### Error: redirect_uri_mismatch
- Check that redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- No trailing slashes
- Exact protocol (http vs https)

### Error: invalid_client
- Double-check Client ID and Secret in .env.local
- Restart dev server after adding env vars

### Error: access_denied
- Check OAuth consent screen is configured
- Add your email as test user
- App must be in "Testing" mode for external users

## Testing

Once configured, test the OAuth flow:
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000`
3. Click "Sign in with Google"
4. You should be redirected to Google's consent screen
5. After approving, you'll be redirected back to your app

## Production Checklist

- [ ] Add production domain to authorized origins
- [ ] Add production redirect URI
- [ ] Set environment variables in hosting platform
- [ ] Test OAuth flow in production
- [ ] Publish OAuth consent screen (if going public)
