# AWS Amplify Migration Guide - IECentral

## Pre-Migration Checklist (DONE)
- [x] No Vercel-specific packages (Analytics, Speed Insights)
- [x] No Vercel Edge functions in use
- [x] Created `amplify.yml` build configuration
- [x] PWA config is compatible with Amplify

## Environment Variables Required

Copy these to AWS Amplify Console > Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://outstanding-dalmatian-787.convex.cloud` | Required - Convex backend |
| `GITHUB_ACCESS_TOKEN` | (from Vercel settings) | If using GitHub API features |

## Migration Steps

### Step 1: Create Amplify App (5 min)
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" > "Host web app"
3. Select "GitHub" as source
4. Authorize AWS to access your GitHub account
5. Select repository: `aBarrows89/DevBase64.com`
6. Select branch: `main`

### Step 2: Configure Build Settings (2 min)
1. Amplify should auto-detect Next.js
2. Verify it's using the `amplify.yml` in the repo
3. If not, the build settings should be:
   - Build command: `npm run build`
   - Output directory: `.next`

### Step 3: Add Environment Variables (2 min)
1. In Amplify Console, go to "Environment variables"
2. Add:
   - `NEXT_PUBLIC_CONVEX_URL` = `https://outstanding-dalmatian-787.convex.cloud`
   - Any other env vars from Vercel

### Step 4: Deploy (5-10 min)
1. Click "Save and deploy"
2. Wait for build to complete
3. Test the Amplify URL (something like `main.d1234567890.amplifyapp.com`)

### Step 5: Custom Domain Setup (10 min)
1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter your domain (e.g., `iecentral.com` or `app.iecentral.com`)
4. Follow DNS configuration instructions:
   - Add CNAME record pointing to Amplify
   - Or transfer nameservers to Route 53

### Step 6: Verify & Cleanup
1. Test all functionality on new domain
2. Once confirmed working:
   - Update any hardcoded URLs in code
   - Remove Vercel deployment (optional)
   - Delete `.vercel` folder from repo

## Post-Migration Tasks
- [ ] Update any webhooks pointing to old Vercel URL
- [ ] Update OAuth redirect URLs if using external auth
- [ ] Update any documentation with new URL
- [x] Rebrand references from DevBase64 to IECentral

## Rollback Plan
If issues occur, Vercel deployment remains active until explicitly removed.
Simply point DNS back to Vercel if needed.

## Files Changed for Migration
- `amplify.yml` - Build configuration (created)
- No changes needed to `next.config.ts`

## Notes
- Convex backend stays the same - no changes needed
- PWA should work the same on Amplify
- Build times may vary slightly from Vercel
