# THREAT MODEL — Security & Abuse Analysis

## Assets
1. User PDF Documents (confidential contracts, tax forms, IDs).
2. Server Storage & Compute Resources (/tmp directory, memory, CPU).
3. Database Connection Credentials (`MONGODB_URI`).

## Attackers & Adversaries
- Malicious users uploading poisoned PDFs with exploit payloads.
- Automated bots attempting denial-of-service (DoS) through infinite upload loops or memory exhaustion attacks.
- Malicious actors attempting directory traversal (`../../etc/passwd`).

## Trust Boundaries
- **Client (Untrusted)** $\rightarrow$ HTTP API Boundary $\rightarrow$ **Server Execution Sandbox (Trusted)**.

## STRIDE Analysis & Mitigations
| Threat Category | Attack Vector | Risk | Mitigation (maps to SECURITY.md) |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forging job IDs to access another user's processed PDF | High | 128-bit cryptographically random job IDs with alphanumeric regex validation. |
| **Tampering** | Directory traversal attacks via malicious filenames (e.g. `../../secret`) | High | Strict path sanitization (`path.basename()`, alphanumeric filter) and isolated sandbox folders. |
| **Repudiation** | Denial of unauthorized operations | Low | Anonymized audit logs with correlation timestamps. |
| **Info Disclosure** | Exposing user documents to other users or public internet | High | Files saved strictly in isolated private `/tmp` subdirectories; no public directory listing; automatic TTL deletion. |
| **Denial of Service** | Uploading 1GB zip bombs or spamming 1,000 requests/sec | High | Client & server-side file size caps (50MB), memory limits, and IP/fingerprint rate-limiting. |
| **Elevation of Priv** | Remote Code Execution via PDF parser exploits | High | Safe pure-JS `pdf-lib` parsing without executing embedded JavaScript streams. |
