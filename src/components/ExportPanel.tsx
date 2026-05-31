import { useState } from 'react';
import {
  UploadIcon,
  CheckIcon,
  XIcon,
  FolderIcon,
  ZapIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import Switch from '@/components/ui/Switch';
import type { ExportTarget, ComboItem } from '../types';

const TOOL_META: Record<string, { label: string; level: string; color: string }> = {
  'claude-code': { label: `Claude Code`, level: `project`, color: `#D97706` },
  cursor: { label: `Cursor`, level: `project`, color: `#2563EB` },
  'codex-cli': { label: `Codex CLI`, level: `global`, color: `#7C3AED` },
  opencode: { label: `OpenCode`, level: `project`, color: `#059669` },
};

interface ExportPanelProps {
  exportTargets?: ExportTarget[];
  comboItems?: ComboItem[];
  onToggleTarget?: (id: string, enabled: boolean) => void;
  onExport?: (targetIds: string[]) => void;
  onEditPath?: (id: string) => void;
  simpleMode?: boolean;
}

export default function ExportPanel({
  exportTargets = [],
  comboItems = [],
  onToggleTarget = () => {},
  onExport = () => {},
  onEditPath = () => {},
  simpleMode = false,
}: ExportPanelProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [lastExported, setLastExported] = useState<string | null>(null);

  const enabledTargets = exportTargets.filter((t) => t.enabled);
  const canExport = comboItems.length > 0 && enabledTargets.length > 0;

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    // simulate async
    await new Promise((r) => setTimeout(r, 900));
    onExport(enabledTargets.map((t) => t.id));
    setLastExported(new Date().toLocaleTimeString());
    setExporting(false);
  };

  return (
    <div
      data-cmp="ExportPanel"
      className="flex flex-col bg-card"
      style={{ minHeight: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 border-b border-t border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <div className="flex items-center gap-1.5">
          <UploadIcon size={13} className="text-muted-foreground" />
          <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
            {t(simpleMode ? 'exportPanel.titleSimple' : 'exportPanel.titleFull')}
          </span>
          {enabledTargets.length > 0 && (
            <span
              className="rounded-full px-1.5"
              style={{
                background: 'var(--am-green-bg)',
                color: 'var(--am-green)',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {t('exportPanel.activeCount', { count: enabledTargets.length })}
            </span>
          )}
        </div>

        {/* Auto-detect */}
        <Tooltip title={t('exportPanel.autoDetectTip')} placement="bottom">
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            style={{ fontSize: '11px' }}
          >
            <ZapIcon size={11} />
            {t('exportPanel.autoDetect')}
          </button>
        </Tooltip>
      </div>

      {/* Target list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-3 flex flex-col gap-2">
        {exportTargets.length === 0 && (
          <div className="py-4 text-center text-muted-foreground" style={{ fontSize: '11.5px' }}>
            {t('exportPanel.noTargets')}
          </div>
        )}

        {exportTargets.map((target) => {
          const meta = TOOL_META[target.tool] || { label: target.tool, level: target.level, color: '#6B7280' };

          return (
            <div
              key={target.id}
              className={`rounded-lg border p-2.5 transition-colors ${
                target.enabled
                  ? 'border-border bg-card'
                  : 'border-border bg-muted opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Toggle */}
                <Switch
                  checked={target.enabled}
                  onCheckedChange={(checked) => onToggleTarget(target.id, checked)}
                />

                {/* Tool label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-semibold"
                      style={{ fontSize: '12px', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span
                      className="rounded px-1 text-muted-foreground bg-secondary"
                      style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' }}
                    >
                      {meta.level}
                    </span>
                    {target.detected && (
                      <span
                        className="flex items-center gap-0.5"
                        style={{ fontSize: '10px', color: 'var(--am-green)' }}
                      >
                        <CheckIcon size={9} />
                        {t('exportPanel.detected')}
                      </span>
                    )}
                  </div>

                  {/* Path */}
                  {!simpleMode && (
                    <div
                      className="flex items-center gap-1 mt-0.5 cursor-pointer group/path"
                      onClick={() => onEditPath(target.id)}
                    >
                      <FolderIcon size={10} className="text-muted-foreground flex-shrink-0" />
                      <span
                        className="text-muted-foreground truncate group-hover/path:text-foreground transition-colors"
                        style={{ fontSize: '10.5px', fontFamily: 'monospace' }}
                      >
                        {target.path || t('exportPanel.setPath')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detected/Not found indicator */}
                <span className="flex-shrink-0" style={{ color: target.detected ? 'var(--am-green)' : '#94A3B8' }}>
                  {target.detected ? <CheckIcon size={12} /> : <XIcon size={12} />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export action footer */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex flex-col gap-2">
        <button
          onClick={handleExport}
          disabled={!canExport || exporting}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
            canExport && !exporting
              ? 'text-primary-foreground hover:opacity-90 active:scale-99'
              : 'opacity-40 cursor-not-allowed text-primary-foreground'
          }`}
          style={{
            background: canExport && !exporting ? 'var(--am-blue)' : 'var(--am-blue)',
            fontSize: '12.5px',
          }}
        >
          <UploadIcon size={13} />
          {exporting
            ? t('exportPanel.exporting')
            : comboItems.length > 0
            ? t('exportPanel.exportWithCount', { count: comboItems.length })
            : t('exportPanel.export')}
        </button>

        {lastExported && (
          <p
            className="text-center flex items-center justify-center gap-1"
            style={{ fontSize: '10.5px', color: 'var(--am-green)' }}
          >
            <CheckIcon size={10} />
            {t('exportPanel.exportedAt', { time: lastExported })}
          </p>
        )}

        {!canExport && comboItems.length === 0 && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10.5px' }}>
            {t(simpleMode ? 'exportPanel.emptyComboSimple' : 'exportPanel.emptyComboFull')}
          </p>
        )}
      </div>
    </div>
  );
}
