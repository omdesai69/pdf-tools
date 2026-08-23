<div align="center">
  <h1>PDF Tools</h1>
  <p><strong>A Modern, High-Performance PDF Processing & Manipulation Platform</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18.0.0-blue.svg?style=flat&logo=react)](https://react.dev/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?style=flat&logo=mongodb)](https://www.mongodb.com/)
  [![Vercel](https://img.shields.io/badge/Deployed-Vercel-black.svg?style=flat&logo=vercel)](https://vercel.com/)
</div>

<br/>

PDF Tools is an end-to-end, high-performance web application designed for seamless PDF manipulation. Merge multiple documents, reorder pages, and process files securely with fast, client-and-serverless operations directly in the browser.

---

## Live Demo

**Check out the live application on Vercel:**  
[https://pdf-tools-main.vercel.app](https://pdf-tools-main.vercel.app)

---

## Key Features

- **Fast Processing:** Instantly merge and manipulate PDF files using optimized serverless pipelines.
- **Real-Time Job Tracking:** Powered by a deterministic state machine in MongoDB to track processing jobs from upload to completion.
- **Drag-and-Drop Interface:** Streamlined file upload and reordering workflow.
- **Secure & Ephemeral:** Documents are processed ephemerally with strict cleanup cycles to protect user data.

---

## Tech Stack

**Frontend**
- **Framework:** Next.js 14 (App Router) + React
- **Styling:** CSS Modules / Clean Modern Design System
- **Interactions:** Native HTML5 Drag and Drop

**Backend & Database**
- **API Engine:** Next.js Route Handlers (Serverless Functions)
- **Database:** MongoDB Atlas for job state persistence
- **PDF Engine:** `pdf-lib` for document operations
- **Runtime:** Node.js

**Infrastructure**
- **Hosting:** Vercel Edge Network
- **State Management:** MongoDB Document Store

---

## Architecture Overview

PDF Tools utilizes a **Serverless-Optimized State Machine**:

1. **Upload:** Client uploads documents via secure multipart stream.
2. **State Transition:** API records job state in MongoDB (`queued` -> `processing`).
3. **Synchronous Execution:** Operations execute within serverless execution limits, avoiding dangling promises.
4. **Completion:** State transitions to `completed` and the sanitized file buffer is streamed directly to the client.
