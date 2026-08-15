import { describe, it, expect } from 'vitest';
import { joinNamesFromArray } from './textUtils';

describe('joinNamesFromArray', () => {
  it('should join an array of names with a Persian comma', () => {
    const arr = ['بهرام بیضایی', 'اکبر رادی'];
    const expected = 'بهرام بیضایی، اکبر رادی';
    expect(joinNamesFromArray(arr)).toBe(expected);
  });

  it('should return empty string for an empty array', () => {
    expect(joinNamesFromArray([])).toBe('');
  });

  it('should return the single name for a single item array', () => {
    expect(joinNamesFromArray(['علی نصیریان'])).toBe('علی نصیریان');
  });

  it('should handle non-array input (undefined) gracefully', () => {
    expect(joinNamesFromArray(undefined)).toBe('');
  });

  it('should handle non-array input (null) gracefully', () => {
    expect(joinNamesFromArray(null)).toBe('');
  });

  it('should return the input string if a string is provided instead of array', () => {
    // The implementation currently does `if (!Array.isArray(arr)) return arr || '';`
    // So passing a string returns the string.
    expect(joinNamesFromArray('not an array')).toBe('not an array');
  });
});
