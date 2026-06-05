import { ArrowRightIcon, GitMergeIcon, XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '@/components/ui/IconButton';
import Tooltip from '@/components/ui/Tooltip';
import type { ComboItem, MergeDraftValidation } from '@/types';

// Manual merge workbench (DESIGN.md §1.3, T24): >= 2 source columns showing
// each SKILL.md in full, a draft editor on the right (plain textarea — the
// CodeMirror editor and Markdown preview are v0.2), live validation via the
// Rust command, and the single-choice kept-scripts selector. Confirm is gated
// by `validation.canConfirm` (error / collision / unsafe name block it).

// Debounce for the live draft validation round-trip.
const MERGE_VALIDATE_DEBOUNCE_MS = 300;

// Source texts are spliced paragraph-wise via the "→" buttons.
function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

interface MergeWorkbenchProps {
  open: boolean;
  /** The combo items being merged (>= 2). */
  sources: ComboItem[];
  draft: string;
  scriptsFromItemId: string | null;
  validation: MergeDraftValidation | null;
  validating: boolean;
  onDraftChange: (draft: string) => void;
  onAppend: (text: string) => void;
  onScriptsFrom: (itemId: string | null) => void;
  /** Re-run validation (debounced by this component on draft changes). */
  onValidate: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function MergeWorkbench({
  open,
  sources,
  draft,
  scriptsFromItemId,
  validation,
  validating,
  onDraftChange,
  onAppend,
  onScriptsFrom,
  onValidate,
  onConfirm,
  onClose,
}: MergeWorkbenchProps) {
  const { t } = useTranslation();

  // Live validation: debounce while the user types or flips the scripts choice.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onValidate, MERGE_VALIDATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, draft, scriptsFromItemId, onValidate]);

  if (!open) return null;

  const scriptsSources = sources.filter((s) => s.skill.hasScripts);
  const canConfirm = validation?.canConfirm === true;

  return (
    <div
      data-cmp="MergeWorkbench"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-custom flex flex-col overflow-hidden"
        style={{ width: '92vw', height: '88vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 border-b border-border flex-shrink-0"
          style={{ height: 'var(--am-toolbar-h)' }}
        >
          <GitMergeIcon size={14} className="text-primary" />
          <span className="font-semibold text-foreground" style={{ fontSize: '13px' }}>
            {t('merge.title')}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: '11px' }}>
            {sources.map((s) => s.exportedName).join(' + ')}
          </span>
          <div className="flex-1" />
          <IconButton onClick={onClose} className="h-[26px] w-[26px]" data-testid="merge-close">
            <XIcon size={14} />
          </IconButton>
        </div>

        {/* Body: source columns + draft */}
        <div className="flex flex-1 overflow-hidden">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex flex-col border-r border-border overflow-hidden"
              style={{ width: 300, minWidth: 240 }}
            >
              <div
                className="px-3 py-2 border-b border-border flex-shrink-0"
                style={{ background: 'var(--am-panel-bg)' }}
                title={source.skill.skillDirPath}
              >
                {/* Lead with the project — colliding sources share a name. */}
                <p className="font-semibold text-foreground truncate" style={{ fontSize: '12px' }}>
                  {source.project.name}
                </p>
                <p className="text-muted-foreground truncate" style={{ fontSize: '10.5px' }}>
                  {source.exportedName}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 flex flex-col gap-1.5">
                {splitParagraphs(source.skill.skillMdContent).map((paragraph, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1 rounded border border-border p-2 group"
                  >
                    <pre
                      className="flex-1 whitespace-pre-wrap break-words m-0"
                      style={{ fontSize: '11px', lineHeight: 1.45, fontFamily: 'inherit' }}
                    >
                      {paragraph}
                    </pre>
                    <Tooltip title={t('merge.append')}>
                      <IconButton
                        onClick={() => onAppend(paragraph)}
                        className="h-[22px] w-[22px] flex-shrink-0 opacity-40 group-hover:opacity-100"
                        data-testid="merge-append"
                      >
                        <ArrowRightIcon size={12} />
                      </IconButton>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Draft editor */}
          <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 320 }}>
            <div
              className="px-3 py-2 border-b border-border flex-shrink-0"
              style={{ background: 'var(--am-panel-bg)' }}
            >
              <p className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
                {t('merge.draftTitle')}
              </p>
            </div>
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={t('merge.draftPlaceholder')}
              spellCheck={false}
              className="flex-1 w-full resize-none p-3 bg-card text-foreground focus:outline-none scrollbar-thin"
              style={{ fontSize: '12px', lineHeight: 1.5, fontFamily: 'ui-monospace, monospace' }}
              data-testid="merge-draft"
            />

            {/* Validation status */}
            <div
              className="border-t border-border px-3 py-2 flex-shrink-0 overflow-y-auto scrollbar-thin"
              style={{ maxHeight: 110 }}
            >
              {validating ? (
                <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                  {t('merge.validating')}
                </p>
              ) : validation ? (
                <div className="flex flex-col gap-1" style={{ fontSize: '11px' }}>
                  {validation.nameCollision && (
                    <p style={{ color: '#DC2626' }} data-testid="merge-name-collision">
                      {t('merge.nameCollision')}
                    </p>
                  )}
                  {validation.nameUnsafe && !validation.nameCollision && (
                    <p style={{ color: '#DC2626' }}>{t('merge.nameUnsafe')}</p>
                  )}
                  {validation.issues.map((issue, i) => (
                    <p
                      key={i}
                      style={{ color: issue.level === 'error' ? '#DC2626' : '#B45309' }}
                    >
                      {issue.field}: {t(issue.message)}
                    </p>
                  ))}
                  {canConfirm && validation.issues.length === 0 && (
                    <p style={{ color: '#15803D' }}>{t('merge.validationOk')}</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer: scripts choice + actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border flex-shrink-0">
          {scriptsSources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: '11.5px' }}>
              <span className="text-muted-foreground">{t('merge.scriptsTitle')}</span>
              <button
                onClick={() => onScriptsFrom(null)}
                className="px-2 py-0.5 rounded-md border transition-colors"
                style={{
                  borderColor: scriptsFromItemId === null ? 'var(--am-blue)' : 'var(--am-border, #E2E8F0)',
                  color: scriptsFromItemId === null ? 'var(--am-blue)' : 'inherit',
                }}
              >
                {t('merge.scriptsNone')}
              </button>
              {scriptsSources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onScriptsFrom(s.id)}
                  // Merge sources often share a name (a cross-project name
                  // collision), so identify the scripts owner by its source
                  // project, not the (identical) skill name; the full path is
                  // on hover as the unambiguous tiebreaker.
                  title={s.skill.skillDirPath}
                  className="px-2 py-0.5 rounded-md border transition-colors"
                  style={{
                    borderColor: scriptsFromItemId === s.id ? 'var(--am-blue)' : 'var(--am-border, #E2E8F0)',
                    color: scriptsFromItemId === s.id ? 'var(--am-blue)' : 'inherit',
                  }}
                  data-testid="merge-scripts-choice"
                >
                  {t('merge.scriptsFrom', { project: s.project.name })}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors"
            style={{ fontSize: '12px' }}
          >
            {t('merge.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: '12px', background: 'var(--am-blue)' }}
            data-testid="merge-confirm"
          >
            {t('merge.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
