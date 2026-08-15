# ARCHITECTURE — PDF Tools Platform

## High-Level Architecture Overview
```mermaid
flowchart TD
    User([User Browser]) -->|Loads Web UI| NextApp[Next.js 14 App Router]
    User -->|Client-Side Mode| LocalWorker[In-Browser PDF Engine (pdf-lib / Canvas)]
    User -->|Server Mode| ApiProxy[/api/jobs/*]
    
    subgraph Serverless Backend
        ApiProxy --> JobState[State Machine & In-Memory Registry]
        ApiProxy --> Processor[PDFProcessor (pdf-lib)]
        JobState --> Mongo[(MongoDB Atlas - Metadata Only)]
        Processor --> DiskStorage[/tmp/pdf-jobs Isolated Sandbox]
    end
    
    LocalWorker -->|Instant Download| User
    Processor -->|Download URL / Stream| User
```

## Stack Table
| Tech | Why Chosen | Alternatives | Trade-off | Maintenance |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js 14 (App Router)** | Modern React framework, fast SSR/SSG, zero-config serverless deployment on Vercel | Vite + Express, Remix | Node serverless runtime constraints (memory/timeout limits) | Low |
| **pdf-lib** | Pure JavaScript PDF parser/builder with zero native binary dependencies | PDFtk, MuPDF, pdfbox | No OCR built-in; fast for structural manipulations | Low |
| **PDF.js / HTML5 Canvas** | High-fidelity client-side PDF page thumbnail rendering | Server-side image rendering | Client-side memory usage on huge 500-page files | Medium |
| **MongoDB Atlas** | Scalable document storage for anonymous job metadata and rate-limiting | PostgreSQL, Redis | Requires network latency to DB if not cached | Low |
| **Vanilla CSS / Modules** | Zero runtime overhead, clean tokens, full styling control | Tailwind, Styled Components | Manual token consistency required | Low |

## Folder Tree
```
src/
├── app/
│   ├── (pages)/               # Marketing & legal pages (about, faq, terms, privacy)
│   ├── api/jobs/              # Job creation, upload, process, download endpoints
│   ├── tools/[toolId]/        # Unified tool execution page with interactive canvas
│   ├── layout.tsx             # Global layout with theme providers & navigation
│   └── page.tsx               # Homepage tool catalog & search
├── components/
│   ├── Canvas/                # Visual page grid, thumbnail renderer & drag-and-drop
│   ├── Signature/             # Smooth signature canvas & stamp placement
│   ├── FAQ.tsx                # Dynamic FAQ accordion
│   └── Navbar.tsx             # Top navigation & theme toggle
├── lib/
│   ├── clientStorage.ts       # Local history and browser storage
│   ├── processing/            # PDFProcessor engine & transform pipelines
│   ├── jobs/                  # State machine & background cleanup
│   ├── security/              # Rate-limiting, path sanitization, crypto IDs
│   └── tools.ts               # Clean tool registry and definitions
```

## Data Flow
1. **User selects/drops files** $\rightarrow$ browser reads file array via FileReader.
2. **Visual Preview (if enabled)** $\rightarrow$ PDF.js renders page canvas thumbnails for interactive reordering / rotation / deletion.
3. **Execution**:
   - **Fast Path (Client-Side)**: `pdf-lib` mutates document buffer directly in memory $\rightarrow$ triggers instant browser blob download.
   - **Server Path (Multi-file / Background)**: `POST /api/jobs` $\rightarrow$ `POST /api/jobs/[id]/upload` $\rightarrow$ `POST /api/jobs/[id]/process` $\rightarrow$ synchronous execution in `/tmp/pdf-jobs` $\rightarrow$ returns download URL.
4. **Cleanup**: Sandbox directories are pruned automatically on job completion or after TTL expiry.
