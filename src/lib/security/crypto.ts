import crypto from 'crypto';

/**
 * Cryptographically secure job ID generator
 * Returns URL-safe, unguessable 128-bit identifiers
 */
export function generateJobId(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Generate a secure chunk checksum
 */
export async function generateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate job ID format to prevent injection attacks
 */
export function isValidJobId(jobId: string): boolean {
  // Base64url format: alphanumeric + hyphen + underscore, 22 chars for 16 bytes
  return /^[A-Za-z0-9_-]{22}$/.test(jobId);
}

/**
 * Generate a secure download token (one-time use)
 */
export function generateDownloadToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
