import {
  UploadIcon,
  CheckIcon,
  XIcon,
  FolderIcon,
  FolderOpenIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  FileEditIcon,
  FilePlusIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import { exportGate } from '@/lib/exportGate';
import type {
  ComboItem,
  ExecutionReport,
  ExportPlan,
  ExportScope,
  ExportTarget,
  MergedComboItem,
  SourceProject,
  ToolAdapter,
  ToolId,
} from '../types';

interface ExportPanelProps {
  comboItems?: ComboItem[];
  mergedItems?: MergedComboItem[];
  plan?: ExportPlan | null;
  // The built-in tool adapters (data-driven selector) and the user's selection.
  adapters?: ToolAdapter[];
  selectedTargets?: ExportTarget[];
  onToggleTarget?: (tool: ToolId) => void;
  onSetTargetScope?: (tool: ToolId, scope: ExportScope) => void;
  targetPath?: string | null;
  // Quick-pick targets (T26): persisted recents + the loaded source projects.
  recentTargetPaths?: string[];
  sourceProjects?: SourceProject[];
  onSelectTarget?: (path: string) => void;
  building?: boolean;
  buildError?: string | null;
  overwriteConfirmed?: boolean;
  acknowledgedRiskIds?: string[];
  executing?: boolean;
  executeError?: string | null;
  report?: ExecutionReport | null;
  onPickTarget?: () => void;
  onBuildPlan?: () => void;
  onToggleOverwrite?: (confirmed: boolean) => void;
  onAcknowledgeRisk?: (assetId: string, accepted: boolean) => void;
  onExport?: () => void;
  onOpenBackup?: () => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExportPanel({
  comboItems = [],
  mergedItems = [],
  plan = null,
  adapters = [],
  selectedTargets = [],
  onToggleTarget = () => {},
  onSetTargetScope = () => {},
  targetPath = null,
  recentTargetPaths = [],
  sourceProjects = [],
  onSelectTarget = () => {},
  building = false,
  buildError = null,
  overwriteConfirmed = false,
  acknowledgedRiskIds = [],
  executing = false,
  executeError = null,
  report = null,
  onPickTarget = () => {},
  onBuildPlan = () => {},
  onToggleOverwrite = () => {},
  onAcknowledgeRisk = () => {},
  onExport = () => {},
  onOpenBackup = () => {},
}: ExportPanelProps) {
  const { t } = useTranslation();

  // Merged entries export alongside the regular items (T25).
  const itemCount = comboItems.length + mergedItems.length;
  // A project-scope target needs the project path; a global-only export does not.
  const hasProjectTarget = selectedTargets.some((tg) => tg.scope === 'project');
  const targetsReady = selectedTargets.length > 0 && (!hasProjectTarget || !!targetPath);
  const canPreview = targetsReady && itemCount > 0 && !building;
  const gate = exportGate(plan, overwriteConfirmed, acknowledgedRiskIds);
  // Resolve an asset id to the name it exports as, for risk-card headings.
  const skillName = (assetId: string) =>
    comboItems.find((c) => c.skill.id === assetId)?.exportedName ??
    mergedItems.find((m) => m.id === assetId)?.name ??
    assetId;
  const riskReports = plan?.securityReports.filter((r) => r.requiresConfirmation) ?? [];
  const createCount = plan?.operations.filter((o) => o.kind === 'create').length ?? 0;
  const overwriteCount = plan?.operations.filter((o) => o.kind === 'overwrite').length ?? 0;
  const affectedSkills = plan ? new Set(plan.operations.map((o) => o.sourceAsset)).size : 0;
  // Display an op path relative to its target's destination root.
  const relTo = (root: string, p: string) =>
    p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p;

  return (
    <div data-cmp="ExportPanel" className="flex flex-col bg-card" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="flex items-center px-3 border-b border-t border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <UploadIcon size={13} className="text-muted-foreground" />
        <span className="font-semibold text-foreground ml-1.5" style={{ fontSize: '12px' }}>
          {t('exportPanel.titleFull')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-3 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {/* Target tools — data-driven multi-select from the baseline adapters */}
        {adapters.map((adapter) => {
          const target = selectedTargets.find((tg) => tg.tool === adapter.id);
          const supportsProject = adapter.projectPaths.length > 0;
          const supportsGlobal = adapter.userPaths.length > 0;
          return (
            <div
              key={adapter.id}
              className={`rounded-lg border p-2.5 ${
                target ? 'border-border bg-card' : 'border-border bg-muted opacity-70'
              }`}
            >
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!target}
                  onChange={() => onToggleTarget(adapter.id)}
                  data-testid="export-target-tool"
                />
                <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
                  {adapter.displayName}
                </span>
              </label>

              {/* Per-target scope toggle — only the scopes the tool actually has */}
              {target && (supportsProject || supportsGlobal) && (
                <div className="flex items-center gap-1 mt-1.5">
                  {supportsProject && (
                    <button
                      onClick={() => onSetTargetScope(adapter.id, 'project')}
                      data-testid="export-scope-project"
                      className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                        target.scope === 'project'
                          ? 'text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                      style={{
                        fontSize: '10px',
                        background: target.scope === 'project' ? 'var(--am-blue)' : undefined,
                      }}
                    >
                      {t('exportPanel.scopeProject')}
                    </button>
                  )}
                  {supportsGlobal && (
                    <button
                      onClick={() => onSetTargetScope(adapter.id, 'global')}
                      data-testid="export-scope-global"
                      className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                        target.scope === 'global'
                          ? 'text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                      style={{
                        fontSize: '10px',
                        background: target.scope === 'global' ? 'var(--am-blue)' : undefined,
                      }}
                    >
                      {t('exportPanel.scopeGlobal')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {adapters.length > 0 && selectedTargets.length === 0 && (
          <p className="text-muted-foreground" style={{ fontSize: '10px' }}>
            {t('exportPanel.noTargetsSelected')}
          </p>
        )}

        {/* Project path picker — needed when any selected target is project-scope */}
        {hasProjectTarget && (
          <div className="rounded-lg border border-border bg-card p-2.5">
            <Tooltip title={targetPath ?? t('exportPanel.selectTarget')} placement="top">
              <button
                onClick={onPickTarget}
                data-testid="export-target"
                className="flex items-center gap-1 w-full text-left group/path"
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

            {/* Quick picks: recent targets, then loaded source projects. */}
            {(recentTargetPaths.length > 0 || sourceProjects.length > 0) && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {recentTargetPaths.length > 0 && (
                  <p
                    className="text-muted-foreground"
                    style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' }}
                  >
                    {t('exportPanel.recentTargets')}
                  </p>
                )}
                {recentTargetPaths.map((path) => (
                  <button
                    key={path}
                    onClick={() => onSelectTarget(path)}
                    data-testid="export-target-recent"
                    className="text-left truncate rounded px-1 py-0.5 hover:bg-secondary transition-colors"
                    style={{ fontSize: '10px', fontFamily: 'monospace' }}
                    title={path}
                  >
                    {path}
                  </button>
                ))}
                {sourceProjects.length > 0 && (
                  <p
                    className="text-muted-foreground mt-0.5"
                    style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase' }}
                  >
                    {t('exportPanel.fromSourceProjects')}
                  </p>
                )}
                {sourceProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectTarget(project.rootPath)}
                    data-testid="export-target-source"
                    className="text-left truncate rounded px-1 py-0.5 hover:bg-secondary transition-colors"
                    style={{ fontSize: '10px' }}
                    title={project.rootPath}
                  >
                    {project.name}
                    <span className="text-muted-foreground ml-1" style={{ fontFamily: 'monospace' }}>
                      {project.rootPath}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview (Dry-run) trigger */}
        <button
          onClick={onBuildPlan}
          disabled={!canPreview}
          data-testid="export-preview"
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border font-medium transition-colors ${
            canPreview ? 'border-border hover:bg-secondary text-foreground' : 'border-border opacity-40 cursor-not-allowed text-muted-foreground'
          }`}
          style={{ fontSize: '12px' }}
        >
          {building ? t('exportPanel.previewing') : t('exportPanel.preview')}
        </button>

        {!canPreview && !building && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10px' }}>
            {itemCount === 0
              ? t('exportPanel.previewNeedsCombo')
              : selectedTargets.length === 0
                ? t('exportPanel.noTargetsSelected')
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

            {/* Per-target groups: each tool / scope, its root, backup and ops */}
            {plan.targets.map((tg, ti) => {
              const root = tg.destinationRoots[0] ?? '';
              const ops = plan.operations.filter((op) => op.targetIndex === ti);
              const backup = plan.backups.find((b) => b.targetIndex === ti);
              return (
                <div
                  key={`${tg.adapter.id}:${tg.scope}:${ti}`}
                  className="flex flex-col gap-1 rounded-md border border-border p-2"
                >
                  <div className="flex items-center gap-1.5" style={{ fontSize: '10.5px' }}>
                    <span className="font-semibold text-foreground flex-shrink-0 whitespace-nowrap">
                      {tg.adapter.displayName}
                    </span>
                    <span
                      className="rounded px-1 bg-secondary text-muted-foreground flex-shrink-0 whitespace-nowrap"
                      style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase' }}
                    >
                      {tg.scope === 'project'
                        ? t('exportPanel.scopeProject')
                        : t('exportPanel.scopeGlobal')}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate text-right text-muted-foreground"
                      style={{ fontFamily: 'monospace', fontSize: '9.5px' }}
                      title={root}
                    >
                      {root}
                    </span>
                  </div>
                  {backup && (
                    <p
                      className="text-muted-foreground break-all"
                      style={{ fontSize: '10px', fontFamily: 'monospace' }}
                    >
                      {t('exportPanel.backupAt', {
                        path: backup.backupArchive,
                        size: formatBytes(backup.sizeBytes),
                      })}
                    </p>
                  )}
                  {/* Runtime resolution notes — warning-level, never block export
                      (DESIGN.md §1.2). Rendered under their tool's card so the
                      tool context is clear without repeating its name. */}
                  {plan.runtimeWarnings
                    .filter((w) => w.targetIndex === ti)
                    .map((w) => {
                      // The conflicting skill lives at the opposite scope from the
                      // one being exported (project export <-> global existing).
                      const otherScope =
                        tg.scope === 'project'
                          ? t('exportPanel.scopeGlobal')
                          : t('exportPanel.scopeProject');
                      return (
                        <p
                          key={`rt:${w.exportedName}`}
                          className="flex items-start gap-1"
                          style={{ fontSize: '10px', color: 'var(--am-orange)' }}
                        >
                          <AlertTriangleIcon size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                          {t(`exportPanel.runtimeConflict.${w.kind}`, {
                            name: w.exportedName,
                            scope: otherScope,
                          })}
                        </p>
                      );
                    })}
                  {/* Capability notes — warning-level field-compatibility hints
                      (DESIGN.md §1.10); shown under their tool's card, never block. */}
                  {plan.capabilityWarnings
                    .filter((w) => w.targetIndex === ti)
                    .map((w) => (
                      <p
                        key={`cap:${w.exportedName}:${w.field}`}
                        className="flex items-start gap-1"
                        style={{ fontSize: '10px', color: 'var(--am-orange)' }}
                      >
                        <AlertTriangleIcon size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                        {t(`exportPanel.capability.${w.status}`, {
                          name: w.exportedName,
                          field: w.field,
                        })}
                      </p>
                    ))}
                  <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 120 }}>
                    {ops.map((op) => (
                      <div
                        key={op.path}
                        className="flex items-center gap-1.5 py-0.5"
                        style={{ fontSize: '10.5px' }}
                      >
                        {op.kind === 'create' ? (
                          <FilePlusIcon size={10} style={{ color: 'var(--am-green)', flexShrink: 0 }} />
                        ) : (
                          <FileEditIcon size={10} style={{ color: 'var(--am-orange)', flexShrink: 0 }} />
                        )}
                        <span
                          className="flex-1 truncate text-foreground"
                          style={{ fontFamily: 'monospace' }}
                        >
                          {relTo(root, op.path)}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {formatBytes(op.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Conflict reports */}
            {gate.nameCollisions > 0 && (
              <p className="flex items-start gap-1" style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
                <AlertTriangleIcon size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('exportPanel.nameCollisionWarn', { count: gate.nameCollisions })}
              </p>
            )}
            {gate.invalidNames > 0 && (
              <p className="flex items-start gap-1" style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
                <AlertTriangleIcon size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('exportPanel.invalidNameWarn', { count: gate.invalidNames })}
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

            {/* Security pre-check — per-skill risk, acknowledged individually
                (DESIGN.md §1.11, no bulk bypass). */}
            {riskReports.map((r) => (
              <div
                key={r.assetId}
                className="flex flex-col gap-1.5 rounded-md border p-2"
                style={{ borderColor: 'var(--am-red)', background: 'rgba(220,38,38,0.05)' }}
              >
                <div
                  className="flex items-center gap-1"
                  style={{ fontSize: '10.5px', color: 'var(--am-red)', fontWeight: 600 }}
                >
                  <ShieldAlertIcon size={11} style={{ flexShrink: 0 }} />
                  {t('security.riskTitle', { name: skillName(r.assetId) })}
                </div>
                {r.oversize && (
                  <p style={{ fontSize: '10px', color: 'var(--am-red)' }}>
                    {t('security.oversize', { size: formatBytes(r.sizeBytes) })}
                  </p>
                )}
                {r.findings.map((f, i) => (
                  <div key={`${f.file}:${f.line}:${i}`} className="flex flex-col gap-0.5">
                    <span style={{ fontSize: '9.5px', color: 'var(--am-red)', fontWeight: 600 }}>
                      {t(`security.rule.${f.rule}`)} · {f.file}:{f.line}
                    </span>
                    <code
                      className="block rounded px-1 py-0.5 overflow-x-auto scrollbar-thin"
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre',
                        background: 'rgba(0,0,0,0.05)',
                        color: 'var(--am-text-muted, #475569)',
                      }}
                    >
                      {f.snippet}
                    </code>
                  </div>
                ))}
                <label className="flex items-start gap-1.5 cursor-pointer" style={{ fontSize: '10.5px' }}>
                  <input
                    type="checkbox"
                    checked={acknowledgedRiskIds.includes(r.assetId)}
                    onChange={(e) => onAcknowledgeRisk(r.assetId, e.target.checked)}
                    className="mt-0.5"
                  />
                  <span style={{ color: 'var(--am-red)' }}>{t('security.acknowledge')}</span>
                </label>
              </div>
            ))}
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
          data-testid="export-run"
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
            : itemCount > 0
              ? t('exportPanel.exportWithCount', { count: itemCount })
              : t('exportPanel.export')}
        </button>

        {itemCount === 0 && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10.5px' }}>
            {t('exportPanel.emptyComboFull')}
          </p>
        )}
        {itemCount > 0 && !targetsReady && (
          <p className="text-muted-foreground text-center" style={{ fontSize: '10.5px' }}>
            {selectedTargets.length === 0
              ? t('exportPanel.noTargetsSelected')
              : t('exportPanel.noTarget')}
          </p>
        )}
        {gate.unacknowledgedRisks > 0 && (
          <p className="text-center" style={{ fontSize: '10.5px', color: 'var(--am-red)' }}>
            {t('security.unresolvedRisks', { count: gate.unacknowledgedRisks })}
          </p>
        )}
      </div>
    </div>
  );
}
