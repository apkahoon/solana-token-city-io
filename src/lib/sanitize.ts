/**
 * Strip HTML tags and dangerous characters from user input
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>"'`]/g, '') // strip dangerous characters
    .trim();
}

/**
 * Sanitize a URL - only allow http/https protocols
 */
export function sanitizeUrl(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return '';
  try {
    const url = new URL(cleaned);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize social handle - alphanumeric and underscores only
 */
export function sanitizeHandle(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
}

/** Field limits */
export const FIELD_LIMITS = {
  name: 32,
  symbol: 10,
  description: 500,
  website: 200,
  twitter: 50,
  telegram: 50,
} as const;
