# Vercel Deployment Guide

## PDF Tools - Step-by-Step Deployment

---

## Prerequisites

Before deploying, ensure:
- [x] Code is pushed to GitHub
- [x] `npm run build` passes locally
- [x] `vercel.json` exists in project root
- [x] No hardcoded secrets in code

---

## Step 1: Push to GitHub

```bash
# In your project directory
git init  # if not already a git repo
git add .
git commit -m "Ready for production deployment"
git remote add origin https://github.com/YOUR_USERNAME/pdf-tools.git
git push -u origin main
``` 

---

## Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub

---

## Step 3: Import Project

1. From Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Find your `pdf-tools` repo in the list
3. Click **"Import"**

### Configure Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `./` (default) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (default) |

### Environment Variables (Optional)

The app works with defaults. Only add these if you want to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Auto-set by Vercel |
| `DAILY_LIMIT_ANONYMOUS` | `3` | Daily ops for anonymous users |
| `RATE_LIMIT_RPM` | `60` | Requests per minute |

> **Leave environment variables empty to use defaults. This is fine for MVP.**

4. Click **"Deploy"**

---

## Step 4: Wait for Build

Vercel will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build`
4. Deploy to edge network

**Expected time**: 1-3 minutes

If build fails, check the build logs for errors.

---

## Step 5: Verify Deployment

Once deployed, you'll get a URL like:
```
https://pdf-tools-abc123.vercel.app
```

---

## Post-Deployment Smoke Tests

### ✅ Test 1: Homepage Loads
- Visit `https://YOUR_APP.vercel.app`
- Should see the PDF Tools homepage with tool categories

### ✅ Test 2: Health Check
- Visit `https://YOUR_APP.vercel.app/api/health`
- Should return JSON with `status: "healthy"`

### ✅ Test 3: Merge Tool Works
1. Click "Merge PDF"
2. Upload 2 small PDF files
3. Click process
4. Download the merged result
5. Verify the output PDF contains both files

### ✅ Test 4: Rate Limiting Works
1. Complete 3 merge operations
2. On the 4th attempt, should see "Daily limit reached"
3. Response should include `retryAfter` seconds

### ✅ Test 5: Job Expiry
1. After a job completes, note the job ID
2. Wait 5 minutes
3. Try to access the download URL
4. Should see "Job not found" or "Job expired"

---

## Common Pitfalls & Fixes

### ❌ Build Fails: "Cannot find module"
**Fix**: Run `npm install` locally and commit `package-lock.json`

### ❌ API Returns 500 Error
**Fix**: Check Vercel function logs in Dashboard → Deployments → Functions

### ❌ Files Disappear After Processing
**Expected**: On serverless, `/tmp` is ephemeral. This is normal.

### ❌ Job Not Found After Few Minutes  
**Expected**: In-memory state resets on cold starts. Jobs may "disappear" but files in `/tmp` persist within a single instance.

### ❌ Function Timeout (10s on hobby)
**Fix**: For large files, upgrade to Vercel Pro ($20/month) for 60s timeout

---

## Rollback Strategy

If deployment breaks the app:

### Option 1: Instant Rollback
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click the **"..."** menu → **"Promote to Production"**

### Option 2: Git Revert
```bash
git revert HEAD
git push origin main
# Vercel auto-deploys the reverted code
```

---

## Success Criteria

Your deployment is successful when:

| Check | Status |
|-------|--------|
| Homepage loads | ☐ |
| `/api/health` returns healthy | ☐ |
| At least one tool works end-to-end | ☐ |
| Rate limiting works | ☐ |
| No console errors in browser | ☐ |

---

## Next Steps After Successful Deploy

1. **Share URL** with beta testers
2. **Monitor** Vercel Analytics (free)
3. **Watch** for errors in Vercel function logs
4. **Set up** custom domain (optional)

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Function Logs | Dashboard → Project → Deployments → Functions |
| Analytics | Dashboard → Project → Analytics |
| Environment Variables | Dashboard → Project → Settings → Environment Variables |
