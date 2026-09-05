// ===== UTILITY FUNCTIONS =====

/**
 * Normalizes standard Farsi text by converting Arabic characters to Persian equivalents
 * @param str - The input string to normalize
 * @returns The normalized string
 */
export const normalizeFarsi = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
};

/**
 * Splits a string of names by common separators (، , -) and returns a normalized array
 * Example: "بهرام بیضایی، اکبر رادی" -> ["بهرام بیضایی", "اکبر رادی"]
 * @param str - The raw input string
 * @returns Array of normalized names
 */
export const parseNamesToArray = (str: string | null | undefined): string[] => {
  if (!str) return [];
  // Split by Persian comma (،), English comma (,), or hyphen (-)
  return str
    .split(/[،,-]/)
    .map((name) => normalizeFarsi(name))
    .filter((name) => name.length > 0);
};

/**
 * Helper to display arrays nicely in the UI
 * @param arr - The array of names
 * @returns Comma-separated string for display
 */
export const joinNamesFromArray = (arr: string[] | string | null | undefined): string => {
  // ✅ FIX: If it's not an array (like the test passing 'just a string'), return it as-is!
  if (!Array.isArray(arr)) return arr ?? '';

  // If it IS an array, filter out empty strings and join with Persian comma
  return arr.filter(Boolean).join('، ');
};

/**
 * Sanitizes a URL to ensure it uses a safe protocol (http, https, or mailto).
 * Prevents XSS attacks via javascript:, data:, or vbscript: URLs.
 * @param urlString - The URL to sanitize
 * @returns The sanitized URL or 'about:blank' if unsafe/invalid
 */
export const sanitizeUrl = (urlString: string | null | undefined): string => {
  if (!urlString) return 'about:blank';
  try {
    const url = new URL(urlString);
    const safeProtocols = ['http:', 'https:', 'mailto:'];
    if (safeProtocols.includes(url.protocol.toLowerCase())) {
      return url.href;
    }
    return 'about:blank';
  } catch (err) {
    // If URL parsing fails, we treat it as an unsafe/invalid URL
    return 'about:blank';
  }
};