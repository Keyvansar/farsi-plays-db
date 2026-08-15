// ===== UTILITY FUNCTIONS =====

/**
 * Normalizes standard Farsi text by converting Arabic characters to Persian equivalents
 * @param {string} str - The input string to normalize
 * @returns {string} - The normalized string
 */
export const normalizeFarsi = (str) => {
  if (!str) return '';
  return str.replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
};

/**
 * Splits a string of names by common separators (، , -) and returns a normalized array
 * Example: "بهرام بیضایی، اکبر رادی" -> ["بهرام بیضایی", "اکبر رادی"]
 * @param {string} str - The raw input string
 * @returns {string[]} - Array of normalized names
 */
export const parseNamesToArray = (str) => {
  if (!str) return [];
  // Split by Persian comma (،), English comma (,), or hyphen (-)
  return str
    .split(/[،,-]/)
    .map(name => normalizeFarsi(name))
    .filter(name => name.length > 0);
};

/**
 * Helper to display arrays nicely in the UI
 * @param {string[]} arr - The array of names
 * @returns {string} - Comma-separated string for display
 */
export const joinNamesFromArray = (arr) => {
  if (!Array.isArray(arr)) return arr || '';
  return arr.join('، ');
};