import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UpdateDownloadProgress } from '@/types';

// Update prompt (DESIGN.md §6.16, T21): release notes plus the three choices —
// install now / later / skip this version. While installing it shows download
// progress and the restart hint; the backend restarts the app on success.
interface UpdateModalProps {
  open: boolean;
  version: string | null;
  notes: string | null;
  installing: boolean;
  progress: UpdateDownloadProgress | null;
  installError: string | null;
  onInstall: () => void;
  onDefer: () => void;
  onSkip: () => void;
}

export default function UpdateModal({
  open,
  version,
  notes,
  installing,
  progress,
  installError,
  onInstall,
  onDefer,
  onSkip,
}: UpdateModalProps) {
  const { t } = useTranslation();

  const percent =
    progress && progress.totalBytes
      ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100))
      : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? '' : 'hidden'}`}
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={installing ? undefined : onDefer}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-custom p-5 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <DownloadIcon size={15} className="text-primary" />
          <h3 className="font-bold text-foreground" style={{ fontSize: '14px' }}>
            {t('update.title', { version: version ?? '' })}
          </h3>
        </div>

        {/* Release notes (plain text; the Markdown preview is a v0.2 concern). */}
        <div
          className="rounded-lg border border-border bg-secondary p-3 overflow-y-auto scrollbar-thin whitespace-pre-wrap"
          style={{ fontSize: '11.5px', lineHeight: 1.5, maxHeight: 180 }}
        >
          {notes?.trim() ? notes : t('update.notesEmpty')}
        </div>

        {installing && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1" style={{ fontSize: '11px' }}>
              <span className="text-foreground">{t('update.downloading')}</span>
              {percent !== null && <span className="text-muted-foreground">{percent}%</span>}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: percent !== null ? `${percent}%` : '100%',
                  background: 'var(--am-blue)',
                  opacity: percent !== null ? 1 : 0.4,
                }}
              />
            </div>
            <p className="text-muted-foreground mt-2" style={{ fontSize: '11px' }}>
              {t('update.restartHint')}
            </p>
          </div>
        )}

        {installError && (
          <p className="mt-3" style={{ fontSize: '11px', color: '#DC2626' }}>
            {t('update.installFailed', { error: installError })}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onInstall}
            disabled={installing}
            className="flex-1 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: '12px', background: 'var(--am-blue)' }}
          >
            {t('update.installNow')}
          </button>
          <button
            onClick={onDefer}
            disabled={installing}
            className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
            style={{ fontSize: '12px' }}
          >
            {t('update.later')}
          </button>
          <button
            onClick={onSkip}
            disabled={installing}
            className="flex-shrink-0 px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            style={{ fontSize: '12px' }}
          >
            {t('update.skipVersion')}
          </button>
        </div>
      </div>
    </div>
  );
}
