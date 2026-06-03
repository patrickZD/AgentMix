// UI-only presentation helpers for domain assets. These do not encode business
// rules; they only translate domain fields into display strings/labels.

import type { AssetCategory } from '@/types';

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
