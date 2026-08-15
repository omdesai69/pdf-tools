# COST — Infrastructure & Service Cost Model

## Current Monthly Infrastructure Costs: $0.00 / month

| Service | Tier / Plan | Free Tier Limit | Cost Past Limit | Cheaper Alternative |
| :--- | :--- | :--- | :--- | :--- |
| **Vercel** | Hobby (Free) | 100 GB bandwidth, 100k edge requests / day | $20/mo (Pro) | Cloudflare Pages / Self-hosted Coolify |
| **MongoDB Atlas** | M0 Shared (Free) | 512 MB storage, shared CPU | $0.08 / hr | Local SQLite / Turso Free Tier |
| **PDF Processing** | Native In-Browser + Serverless `pdf-lib` | Unlimited (Local execution) | $0.00 | Pure client-side execution |

## Cost Scaling Curve
- **100 Users/day**: $0.00 / month (100% within free tiers).
- **1,000 Users/day**: $0.00 / month (client-side processing keeps Vercel function invocations minimal).
- **10,000 Users/day**: $0.00 – $20.00 / month (Vercel bandwidth if heavy multi-file server downloads).
- **100,000 Users/day**: ~$50 – $100 / month with Cloudflare CDN caching and direct client-side blob exports.
