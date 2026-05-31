import type { SkillChangeTag } from '../types';

interface BadgeProps {
  variant?: SkillChangeTag | 'conflict' | 'healthy' | 'warning' | 'error';
  label?: string;
}

const variantConfig = {
  NEW: { cls: 'am-badge-new', text: 'NEW' },
  UPDATED: { cls: 'am-badge-updated', text: 'UPD' },
  REMOVED: { cls: 'am-badge-removed', text: 'DEL' },
  conflict: {
    cls: '',
    text: 'CONFLICT',
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
  healthy: {
    cls: '',
    text: '●',
    style: { color: 'var(--am-green)', fontSize: '11px' },
  },
  warning: {
    cls: '',
    text: '⚠',
    style: { color: 'var(--am-orange)', fontSize: '11px' },
  },
  error: {
    cls: '',
    text: '✕',
    style: { color: 'var(--am-red)', fontSize: '11px', fontWeight: 700 },
  },
};

export default function Badge({ variant = null, label }: BadgeProps) {
  if (!variant) return null;
  const cfg = variantConfig[variant as keyof typeof variantConfig];
  if (!cfg) return null;

  const text = label ?? cfg.text;

  if ('style' in cfg) {
    return (
      <span data-cmp="Badge" style={(cfg as { style: React.CSSProperties }).style}>
        {text}
      </span>
    );
  }

  return (
    <span data-cmp="Badge" className={cfg.cls}>
      {text}
    </span>
  );
}
