import { describe, it, expect } from 'vitest';
import {
  normalizeFarsi,
  parseNamesToArray,
  joinNamesFromArray,
  sanitizeUrl
} from './textUtils';

describe('parseNamesToArray', () => {
  it('handles null or empty input', () => {
    expect(parseNamesToArray(null)).toEqual([]);
    expect(parseNamesToArray(undefined)).toEqual([]);
    expect(parseNamesToArray('')).toEqual([]);
  });

  it('splits by English comma', () => {
    expect(parseNamesToArray('John Doe, Jane Doe')).toEqual(['John Doe', 'Jane Doe']);
  });

  it('splits by Persian comma', () => {
    expect(parseNamesToArray('بهرام بیضایی، اکبر رادی')).toEqual(['بهرام بیضایی', 'اکبر رادی']);
  });

  it('splits by hyphen', () => {
    expect(parseNamesToArray('Name One - Name Two')).toEqual(['Name One', 'Name Two']);
  });

  it('splits by mixed separators', () => {
    expect(parseNamesToArray('Name One, Name Two، Name Three - Name Four')).toEqual(['Name One', 'Name Two', 'Name Three', 'Name Four']);
  });

  it('normalizes Arabic characters to Persian', () => {
    expect(parseNamesToArray('علي نصيريان، بهرام بيضايي')).toEqual(['علی نصیریان', 'بهرام بیضایی']);
    expect(parseNamesToArray('اکبر رادي')).toEqual(['اکبر رادی']);
  });

  it('trims whitespace and ignores empty parts', () => {
    expect(parseNamesToArray('  Name One  , , Name Two ، - ')).toEqual(['Name One', 'Name Two']);
  });

  it('handles single name', () => {
    expect(parseNamesToArray('بهرام بیضایی')).toEqual(['بهرام بیضایی']);
  });
});

describe('normalizeFarsi', () => {
  it('converts Arabic ye and kaf to Persian equivalents', () => {
    expect(normalizeFarsi('علي نصيريان')).toBe('علی نصیریان');
    expect(normalizeFarsi('اكبر رادي')).toBe('اکبر رادی');
  });

  it('trims whitespace from both ends', () => {
    expect(normalizeFarsi('  متن تست  ')).toBe('متن تست');
  });

  it('returns empty string for falsy input', () => {
    expect(normalizeFarsi(null)).toBe('');
    expect(normalizeFarsi(undefined)).toBe('');
    expect(normalizeFarsi('')).toBe('');
  });
});

describe('joinNamesFromArray', () => {
  it('joins array with Persian comma and space', () => {
    expect(joinNamesFromArray(['بهرام بیضایی', 'اکبر رادی'])).toBe('بهرام بیضایی، اکبر رادی');
  });

  it('filters out falsy values (null, undefined, empty strings)', () => {
    expect(joinNamesFromArray(['بهرام بیضایی', null, '', 'اکبر رادی'])).toBe('بهرام بیضایی، اکبر رادی');
  });

  it('returns original value if input is not an array', () => {
    expect(joinNamesFromArray('just a string')).toBe('just a string');
  });

  it('returns empty string for null or undefined', () => {
    expect(joinNamesFromArray(null)).toBe('');
    expect(joinNamesFromArray(undefined)).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('allows safe protocols (http, https, mailto)', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('blocks dangerous protocols (javascript, data)', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
  });

  it('returns about:blank for invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('about:blank');
  });

  it('returns about:blank for empty or null input', () => {
    expect(sanitizeUrl('')).toBe('about:blank');
    expect(sanitizeUrl(null)).toBe('about:blank');
  });
});