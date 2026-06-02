import { describe, expect, it } from 'vitest';
import type { SecurityRule } from '@/types';
import en from './en.json';

// Exhaustive over SecurityRule: a new variant added to the union forces a key
// here (compile error otherwise), and the test then requires a matching i18n
// entry — so the dynamic `t(security.rule.${rule})` lookup in ExportPanel can
// never render a raw key.
const RULES: Record<SecurityRule, true> = {
  'network-download-execute': true,
  'sensitive-path-access': true,
  'dynamic-eval': true,
  'reverse-shell-or-miner': true,
};

describe('security rule i18n keys', () => {
  it('every SecurityRule has a non-empty en.security.rule entry', () => {
    const rules = en.security.rule as Record<string, string>;
    for (const rule of Object.keys(RULES)) {
      expect(rules[rule], `missing security.rule.${rule}`).toBeTruthy();
    }
  });
});
