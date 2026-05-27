<div align="center">
  <h1>📄 PDF Tools</h1>
  <p><strong>A Modern, High-Performance PDF Processing & Manipulation Platform</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18.0.0-blue.svg?style=flat&logo=react)](https://react.dev/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?style=flat&logo=mongodb)](https://www.mongodb.com/)
  [![Vercel](https://img.shields.io/badge/Deployed-Vercel-black.svg?style=flat&logo=vercel)](https://vercel.com/)
</div>

<br/>

PDF Tools is an end-to-end, high-performance web application designed to make PDF manipulation effortless. Whether you need to merge multiple documents into one or perform other PDF operations, this tool provides instantaneous, secure, and intuitive processing directly through your browser.

---

## 🚀 Live Demo

**Check out the live application on Vercel:**  
🔗 **[https://pdf-tools-main.vercel.app](https://pdf-tools-main.vercel.app)**

---

## ✨ Key Features

- **⚡ Blazing Fast Processing:** Instantly merge and manipulate PDF files using optimized serverless processing.
- **📊 Real-time Job Tracking:** Powered by a robust state machine stored in MongoDB to track your processing jobs from upload to completion.
- **📱 Premium Mobile-First UI:** A sleek, drag-and-drop interface inspired by modern web design standards, making file manipulation completely frictionless.
- **🔒 Secure & Ephemeral:** Documents are processed securely and predictably, ensuring your data is handled safely during operations.

---

## 🛠 Tech Stack

**Frontend**
- **Framework:** Next.js 14 (App Router) + React
- **Styling:** CSS Modules / Modern UI Patterns
- **Interactions:** Drag and Drop UI

**Backend & Database**
- **API Engine:** Next.js Route Handlers (Serverless APIs)
- **Database:** MongoDB (Atlas) for robust job state tracking
- **PDF Processing:** `pdf-lib` for raw document manipulation
- **Runtime:** Node.js

**Infrastructure**
- **Hosting:** Vercel (Edge Network for static files, Serverless Functions for API)
- **State Management:** MongoDB Document Storage

---

## 🏗 Architecture Overview

PDF Tools avoids complex long-polling architectures by utilizing a **Serverless-Optimized State Machine**. 

1. **The Request:** A user drops PDF files into the UI. The frontend uploads these files and initiates a processing job.
2. **State Tracking:** The API records the job in MongoDB (e.g., `uploading` -> `processing`).
3. **Synchronous Processing:** To comply with Vercel's serverless architecture, the PDF operation runs synchronously inside the API route, preventing dangling promises from being frozen by the platform.
4. **Completion:** The database state transitions to `completed` and the user instantly receives their manipulated document.
