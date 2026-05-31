// Path normalization for comparison. Per the Windows path rule, compare paths
// case-insensitively and treat both separators as equivalent. This is for
// equality/dedupe checks only — never use the result as a real filesystem path.
export function normalizePath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}
