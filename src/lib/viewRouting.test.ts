import { describe, expect, it } from 'vitest';
import { resolveView } from './viewRouting';

describe('resolveView', () => {
  it('forces the welcome screen when no projects are loaded', () => {
    expect(resolveView(0, 'main')).toBe('welcome');
    expect(resolveView(0, 'health-check')).toBe('welcome');
  });

  it('honors the chosen view once a project is loaded', () => {
    expect(resolveView(1, 'main')).toBe('main');
    expect(resolveView(2, 'health-check')).toBe('health-check');
  });
});
