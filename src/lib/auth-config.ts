/**
 * Authentication configuration utilities
 * 
 * Centralized admin access code management with production safety checks.
 * Prevents insecure default fallbacks in production environments.
 */

/**
 * Get admin access code with production safety check
 * 
 * - In production: REQUIRES ADMIN_ACCESS_CODE env var, throws error if missing
 * - In development: Uses fallback "6969" with warning if not set
 * 
 * @returns Admin access code string
 * @throws Error if ADMIN_ACCESS_CODE not set in production
 */
export function getAdminAccessCode(): string {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  
  if (process.env.NODE_ENV === 'production') {
    if (!adminCode) {
      throw new Error('ADMIN_ACCESS_CODE must be set in production');
    }
    return adminCode;
  }
  
  // Development mode
  if (!adminCode) {
    console.warn('⚠️ Using default admin code "6969" in development. Set ADMIN_ACCESS_CODE in .env.local');
    return '6969';
  }
  
  return adminCode;
}

/**
 * Validate request has admin access
 * 
 * Compares provided code against configured admin code.
 * Returns false if code doesn't match or if production config is invalid.
 * 
 * @param providedCode - Code provided in request
 * @returns true if code matches admin code, false otherwise
 */
export function isAdminRequest(providedCode: string | undefined): boolean {
  if (!providedCode) return false;
  try {
    return providedCode === getAdminAccessCode();
  } catch {
    // If getAdminAccessCode throws (production without env var), reject request
    return false;
  }
}

/**
 * Check if current request has admin cookie
 * 
 * Helper for cookie-based admin checks in API routes.
 * 
 * @param accessMode - Value from access_mode cookie
 * @returns true if access_mode is 'admin'
 */
export function isAdminCookie(accessMode: string | undefined): boolean {
  return accessMode === 'admin';
}

