import { describe, it, expect } from 'vitest';
import { normalizeFarsi } from './textUtils';

describe('normalizeFarsi', () => {
  it('should return an empty string for falsy inputs', () => {
    expect(normalizeFarsi(undefined)).toBe('');
    expect(normalizeFarsi(null)).toBe('');
    expect(normalizeFarsi('')).toBe('');
  });

  it('should trim whitespace from the beginning and end of strings', () => {
    expect(normalizeFarsi('  سلام  ')).toBe('سلام');
    expect(normalizeFarsi('\tتست\n')).toBe('تست');
  });

  it('should replace Arabic ي with Persian ی', () => {
    expect(normalizeFarsi('يک يادداشت')).toBe('یک یادداشت');
    expect(normalizeFarsi('علي')).toBe('علی');
  });

  it('should replace Arabic ك with Persian ک', () => {
    expect(normalizeFarsi('كتاب')).toBe('کتاب');
    expect(normalizeFarsi('شابك')).toBe('شابک');
  });

  it('should replace both Arabic ي and ك with Persian equivalents', () => {
    expect(normalizeFarsi('يك كتاب')).toBe('یک کتاب');
    expect(normalizeFarsi('تاريك')).toBe('تاریک');
  });

  it('should handle strings with multiple occurrences of Arabic characters', () => {
    expect(normalizeFarsi('يکي بود يکي نبود')).toBe('یکی بود یکی نبود');
    expect(normalizeFarsi('كوك')).toBe('کوک');
  });

  it('should not modify standard Persian characters', () => {
    const persianText = 'یک کتاب معمولی';
    expect(normalizeFarsi(persianText)).toBe(persianText);
  });
});
