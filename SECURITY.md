# SECURITY — Controls & OWASP Top 10 Protections

## OWASP Top 10 Compliance
- **A01 Broken Access Control**: Job resources are strictly accessible only via cryptographically generated 128-bit Job IDs. No cross-job directory access.
- **A02 Security Misconfiguration**: No stack traces exposed in API responses. Custom security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- **A03 Vulnerable Components**: Zero native binary dependencies; pure `pdf-lib` parsing; automated `npm audit` gate.
- **A04 Cryptographic Failures**: TLS enforced; random IDs generated with Node.js `crypto.randomBytes()`.
- **A05 Injection**: Parameterized database queries; filenames strictly sanitized using regex `replace(/[^a-zA-Z0-9_\-\.]/g, '_')`.
- **A06 Insecure Design**: Ephemeral storage architecture with immediate TTL cleanup.
- **A07 Identification & Auth Failures**: Anonymous token-bucket rate limits; no sensitive credentials stored in localStorage.
- **A08 Software/Data Integrity**: Safe stream parsing; no blind deserialization.
- **A09 Security Logging & Monitoring**: Structured error logs without logging document contents or PII.
- **A10 Exceptional Conditions**: Fail-closed architecture; errors clean up temporary sandbox directories.

## File Handling & Storage Rules
- Maximum file upload limit: **50 MB** per file.
- Storage path: Strictly outside the web root (`/tmp/pdf-jobs/<prefix>/<jobId>/`).
- Sandbox isolation: Each job receives its own unique subfolder.
