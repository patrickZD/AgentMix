import {
  UploadIcon,
  CheckIcon,
  XIcon,
  FolderIcon,
  FolderOpenIcon,
  AlertTriangleIcon,
  FileEditIcon,
  FilePlusIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import { exportGate } from '@/lib/exportGate';
import type { ComboItem, ExecutionReport, ExportPlan } from '../types';

// v0.1 ships a single export target. The other tools are shown but deferred.
const TARGET_TOOLS: ReadonlyArray<{ label: string; level: string; color: string; active: boolean }> = [
  { label: 'Claude Code', level: 'project', color: '#D97706', active: true },
  { label: 'Cursor', level: 'project', color: '#2563EB', active: false },
  { label: 'Codex CLI', level: 'global', color: '#7C3AED', active: false },
  { label: 'OpenCode', level: 'project', color: '#059669', active: false },
];

interface ExportPanelProps {
  comboItems?: ComboItem[];
  plan?: ExportPlan | null;
  targetPath?: string | null;
  building?: boolean;
  buildError?: string | null;
  overwriteConfirmed?: boolean;
  executing?: boolean;
  executeError?: string | null;
  report?: ExecutionReport | null;
  onPickTarget?: () => void;
  onBuildPlan?: () => void;
  onToggleOverwrite?: (confirmed: boolean) => void;
  onExport?: () => void;
  onOpenBackup?: () => void;
  simpleMode?: boolean;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExportPanel({
  comboItems = [],
  plan = null,
  targetPath = null,
  building = false,
  buildError = null,
  overwriteConfirmed = false,
  executing = false,
  executeError = null,
  report = null,
  onPickTarget = () => {},
  onBuildPlan = () => {},
  onToggleOverwrite = () => {},
  onExport = () => {},
  onOpenBackup = () => {},
  simpleMode = false,
}: ExportPanelProps) {
  const { t } = useTranslation();

  const canPreview = !!targetPath && comboItems.length > 0 && !building;
  const gate = exportGate(plan, overwriteConfirmed);
  const createCount = plan?.operations.filter((o) => o.kind === 'create').length ?? 0;
  const overwriteCount = plan?.operations.filter((o) => o.kind === 'overwrite').length ?? 0;
  const affectedSkills = plan ? new Set(plan.operations.map((o) => o.sourceAsset)).size : 0;
  const relPath = (p: string) =>
    plan && p.startsWith(`${plan.targetDir}/`) ? p.slice(plan.targetDir.length + 1) : p;

  return (
    <div data-cmp="ExportPanel" className="flex flex-col bg-card" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="flex items-center px-3 border-b border-t border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <UploadIcon size={13} className="text-muted-foreground" />
        <span className="font-semibold text-foreground ml-1.5" style={{ fontSize: '12px' }}>
          {t(simpleMode ? 'exportPanel.titleSimple' : 'exportPanel.titleFull')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-3 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {/* Target tools — Claude Code active, others deferred */}
        {TARGET_TOOLS.map((tool) => (
          <div
            key={tool.label}
            className={`rounded-lg border p-2.5 ${
              tool.active ? 'border-border bg-card' : 'border-border bg-muted opacity-60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold" style={{ fontSize: '12px', color: tool.color }}>
                {tool.label}
              </span>
              <span
                className="rounded px-1 text-muted-foreground bg-secondary"
                style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' }}
              >
                {tool.level}
              </span>
              {!tool.active && (
                <span className="text-muted-foreground" style={{ fontSize: '9.5px', fontWeight: 600 }}>
                  {t('exportPanel.deferred')}
                </span>
              )}
            </div>

            {/* Target project path picker (active tool only) */}
            {tool.active && (
              <Tooltip title={targetPath ?? t('exportPanel.selectTarget')} placement="top">
                <button
                  onClick={onPickTarget}
                  className="flex items-center gap-1 mt-1.5 w-full text-left group/path"
                >
                  <FolderIcon size={11} className="text-muted-foreground flex-shrink-0" />
                  <span
                    className="truncate group-hover/path:text-foreground transition-colors"
                    style={{
                      minWidth: 0,
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      color: targetPath ? 'var(--am-blue)' : 'var(--am-text-muted, #94A3B8)',
                    }}
                  >
                    {targetPath ?? t('exportPanel.selectTarget')}
                  </span>
                </button>
              </Tooltip>
            )}
          </div>
        ))}

        {/* Preview (Dry-run) trigger */}
        <button
          onClick={onBuildPlan}
          disabled={!canPreview}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors ${
            canPreview ? 'border-border hover:bg-secondary text-foreground' : 'border-border opacity-40 cursor-not-allowed text-muted-foreground'
          }`}
          style={{ fontSize: '12px' }}
        >
          {building ? t('exportPanel.previewing') : t('exportPanel.preview')}
        </button>

        {!canPreview && !building && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10px' }}>
            {comboItems.length === 0
              ? t('exportPanel.previewNeedsCombo')
              : t('exportPanel.noTarget')}
          </p>
        )}

        {buildError && (
          <p style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
            {t('exportPanel.buildFailed', { error: buildError })}
          </p>
        )}

        {/* Dry-run plan preview */}
        {plan && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
            {/* Summary */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1" style={{ fontSize: '11px' }}>
              <span className="flex items-center gap-1" style={{ color: 'var(--am-green)' }}>
                <FilePlusIcon size={11} />
                {t('exportPanel.createCount', { count: createCount })}
              </span>
              {overwriteCount > 0 && (
                <span className="flex items-center gap-1" style={{ color: 'var(--am-orange)' }}>
                  <FileEditIcon size={11} />
                  {t('exportPanel.overwriteCount', { count: overwriteCount })}
                </span>
              )}
              <span className="text-muted-foreground">
                {t('exportPanel.affectedSkills', { count: affectedSkills })}
              </span>
              <span className="text-muted-foreground">{formatBytes(plan.totalBytes)}</span>
            </div>

            {/* Backup location */}
            {plan.backups.map((b) => (
              <p key={b.backupArchive} className="text-muted-foreground" style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                {t('exportPanel.backupAt', { path: b.backupArchive, size: formatBytes(b.sizeBytes) })}
              </p>
            ))}

            {/* Operations list */}
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 140 }}>
              {plan.operations.map((op) => (
                <div key={op.path} className="flex items-center gap-1.5 py-0.5" style={{ fontSize: '10.5px' }}>
                  {op.kind === 'create' ? (
                    <FilePlusIcon size={10} style={{ color: 'var(--am-green)', flexShrink: 0 }} />
                  ) : (
                    <FileEditIcon size={10} style={{ color: 'var(--am-orange)', flexShrink: 0 }} />
                  )}
                  <span className="flex-1 truncate text-foreground" style={{ fontFamily: 'monospace' }}>
                    {relPath(op.path)}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0">{formatBytes(op.size)}</span>
                </div>
              ))}
            </div>

            {/* Conflict reports */}
            {gate.nameCollisions > 0 && (
              <p className="flex items-start gap-1" style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
                <AlertTriangleIcon size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('exportPanel.nameCollisionWarn', { count: gate.nameCollisions })}
              </p>
            )}
            {gate.targetExists > 0 && (
              <label className="flex items-start gap-1.5 cursor-pointer" style={{ fontSize: '10.5px' }}>
                <input
                  type="checkbox"
                  checked={overwriteConfirmed}
                  onChange={(e) => onToggleOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span style={{ color: 'var(--am-orange)' }}>
                  {t('exportPanel.confirmOverwrite', { count: gate.targetExists })}
                </span>
              </label>
            )}
          </div>
        )}

        {/* Execution report (shown after a successful export) */}
        {report && (
          <div
            className="flex flex-col gap-1.5 rounded-lg border p-2.5"
            style={{ borderColor: 'var(--am-green)', background: 'var(--am-green-bg)' }}
          >
            <div
              className="flex items-center gap-1.5"
              style={{ fontSize: '11.5px', color: 'var(--am-green)', fontWeight: 600 }}
            >
              <CheckCircleIcon size={12} />
              {t('exportPanel.exportDone', {
                skills: report.skillsExported,
                created: report.filesCreated,
                overwritten: report.filesOverwritten,
              })}
            </div>
            {report.backupArchive && (
              <button
                onClick={onOpenBackup}
                className="flex items-center gap-1 self-start rounded px-1.5 py-0.5 hover:bg-card transition-colors"
                style={{ fontSize: '10.5px', color: 'var(--am-blue)' }}
              >
                <FolderOpenIcon size={11} />
                {t('exportPanel.openBackup')}
              </button>
            )}
          </div>
        )}

        {executeError && (
          <p style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
            {t('exportPanel.executeFailed', { error: executeError })}
          </p>
        )}
      </div>

      {/* Execute footer */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex flex-col gap-2">
        <button
          onClick={onExport}
          disabled={!gate.canExport || executing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all text-primary-foreground"
          style={{
            background: 'var(--am-blue)',
            fontSize: '12.5px',
            opacity: !gate.canExport || executing ? 0.4 : 1,
            cursor: !gate.canExport || executing ? 'not-allowed' : 'pointer',
          }}
        >
          {gate.canExport ? <CheckIcon size={13} /> : <XIcon size={13} />}
          {executing
            ? t('exportPanel.exporting')
            : comboItems.length > 0
              ? t('exportPanel.exportWithCount', { count: comboItems.length })
              : t('exportPanel.export')}
        </button>

        {comboItems.length === 0 && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10.5px' }}>
            {t(simpleMode ? 'exportPanel.emptyComboSimple' : 'exportPanel.emptyComboFull')}
          </p>
        )}
        {comboItems.length > 0 && !targetPath && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10.5px' }}>
            {t('exportPanel.noTarget')}
          </p>
        )}
      </div>
    </div>
  );
}
