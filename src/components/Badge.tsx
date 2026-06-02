import { useTranslation } from 'react-i18next';

// Status dots track the domain HealthStatus ('ok' | 'warning' | 'error'); the
// 'conflict' badge marks a same-name export conflict in the combo list. The
// v0.2 source-tracking tags (NEW/UPDATED/REMOVED) are intentionally not shown
// in v0.1.
type BadgeVariant = 'ok' | 'warning' | 'error' | 'conflict';

interface BadgeProps {
  variant?: BadgeVariant | null;
  label?: string;
}

const variantConfig: Record<
  BadgeVariant,
  { text: string; i18nKey?: string; style: React.CSSProperties }
> = {
  conflict: {
    text: 'CONFLICT',
    i18nKey: 'badge.conflict',
    style: {
      background: 'var(--am-orange-bg)',
      color: 'var(--am-orange)',
      fontSize: '10px',
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: '3px',
      letterSpacing: '0.03em',
    },
  },
  ok: {
    text: '●',
    style: { color: 'var(--am-green)', fontSize: '11px' },
  },
  warning: {
    text: '⚠',
    style: { color: 'var(--am-orange)', fontSize: '11px' },
  },
  error: {
    text: '✕',
    style: { color: 'var(--am-red)', fontSize: '11px', fontWeight: 700 },
  },
};

export default function Badge({ variant = null, label }: BadgeProps) {
  const { t } = useTranslation();
  if (!variant) return null;
  const cfg = variantConfig[variant];
  if (!cfg) return null;

  const text = label ?? (cfg.i18nKey ? t(cfg.i18nKey) : cfg.text);

  return (
    <span data-cmp="Badge" style={cfg.style}>
      {text}
    </span>
  );
}
