# SCALABILITY — Bottlenecks & Capacity Planning

## Users $\rightarrow$ Bottleneck $\rightarrow$ Architectural Change

| Active Users | Primary Bottleneck | Solution / Architecture Adjustment |
| :--- | :--- | :--- |
| **100** | None | Standard Vercel Serverless + Client-side `pdf-lib`. |
| **1,000** | MongoDB Atlas connections | Cached in-memory state fallback + Mongoose connection pooling. |
| **10,000** | Vercel Function Bandwidth | Maximize Client-Side (In-Browser) execution for single-file tools; CDN caching for static assets. |
| **100,000** | Serverless `/tmp` concurrent storage | Offload heavy background batch queues to dedicated Docker microservice / Redis BullMQ. |
| **1,000,000** | Multi-region latency | Edge routing + Cloudflare R2 direct pre-signed URL uploads. |
