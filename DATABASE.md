# DATABASE — Schema & Metadata Store

## Storage Provider: MongoDB Atlas
Collection Name: `jobs`

### Schema Definition
```typescript
interface JobDocument {
    _id?: ObjectId;
    jobId: string;               // Unique 128-bit hex string (Indexed, Unique)
    state: JobState;             // 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'
    operation: PDFOperation;     // e.g., 'merge', 'split', 'rotate', 'sign'
    options: Record<string, any>;// Non-sensitive operation parameters
    inputFiles: string[];        // Sanitized filenames
    outputFile?: string;         // Result filename
    fileCount: number;           // Total files
    totalSize: number;           // Bytes
    createdAt: Date;             // TTL Indexed (Expires in 1 hour)
    updatedAt: Date;
    completedAt?: Date;
    processingTime?: number;     // Milliseconds
    error?: string;
}
```

### Database Indexes
| Index Key | Type | Purpose |
| :--- | :--- | :--- |
| `{ jobId: 1 }` | Unique | Instant $O(1)$ job lookup |
| `{ createdAt: 1 }` | TTL (expireAfterSeconds: 3600) | Automated database cleanup of stale jobs after 1 hour |
