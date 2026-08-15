import { describe, it, expect } from 'vitest';
import { parseNamesToArray } from './textUtils';

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
    // "ي" is Arabic, "ی" is Persian
    // "ك" is Arabic, "ک" is Persian
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
