import { describe, expect, it } from 'vitest';
import { normalizePath } from './path';

describe('normalizePath', () => {
  it('treats backslashes and forward slashes as equivalent', () => {
    expect(normalizePath('C:\\Users\\me\\proj')).toBe(normalizePath('C:/Users/me/proj'));
  });

  it('is case-insensitive (Windows path rule)', () => {
    expect(normalizePath('C:\\Users\\Me\\Proj')).toBe(normalizePath('c:/users/me/proj'));
  });

  it('ignores a trailing separator', () => {
    expect(normalizePath('C:/Users/me/proj/')).toBe(normalizePath('C:/Users/me/proj'));
  });
});
