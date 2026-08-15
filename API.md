# API — REST Specification & Abuse Controls

## Endpoints

### 1. `POST /api/jobs`
Creates a new processing session.
- **Request Body**: `{ "operation": "merge", "options": { ... } }`
- **Response**: `{ "jobId": "abc123xyz...", "state": "pending" }`
- **Rate Limit**: 60 requests / minute per IP.

### 2. `POST /api/jobs/[jobId]/upload`
Uploads files into the isolated job sandbox.
- **Payload**: `multipart/form-data` with `files` field.
- **Cap**: 50 MB total payload.
- **Response**: `{ "uploadedFiles": ["doc1.pdf", "doc2.pdf"], "state": "uploading" }`

### 3. `POST /api/jobs/[jobId]/process`
Executes the PDF processing pipeline synchronously.
- **Response**: 
  ```json
  {
    "status": "COMPLETED",
    "downloadUrl": "/api/jobs/abc123xyz.../download",
    "outputFile": "merged.pdf",
    "pageCount": 12,
    "fileSize": 204850,
    "processingTime": 140
  }
  ```

### 4. `GET /api/jobs/[jobId]/download`
Streams the resulting PDF to the user with `Content-Disposition: attachment; filename="result.pdf"`.
