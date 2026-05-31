// UI-only presentation helpers for domain assets. These do not encode business
// rules; they only translate domain fields into display strings/labels.

import type { AssetCategory } from '@/types';

// Turn a kebab/snake/space-separated asset name into a Title Case label for
// Simple Mode, e.g. "code-review" -> "Code Review".
export function displayLabel(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// i18n key for an asset category's section heading / chip.
export function categoryLabelKey(category: AssetCategory): string {
  switch (category) {
    case 'portable':
      return 'category.portable';
    case 'tool-specific':
      return 'category.toolSpecific';
    case 'invalid':
      return 'category.invalid';
  }
}
