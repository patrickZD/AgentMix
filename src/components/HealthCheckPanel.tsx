import { useState } from 'react';
import {
  HeartPulseIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import { displayLabel } from '@/lib/skillView';
import type { AppView, HealthStatus, SourceProject } from '../types';

interface HealthCheckPanelProps {
  projects?: SourceProject[];
  onNavigate?: (view: AppView) => void;
  onRescan?: () => void;
  simpleMode?: boolean;
  scanning?: boolean;
}

const STATUS_ICON = {
  ok: CheckCircleIcon,
  warning: AlertTriangleIcon,
  error: XCircleIcon,
} as const;

const STATUS_COLOR: Record<HealthStatus, string> = {
  ok: 'var(--am-green)',
  warning: 'var(--am-orange)',
  error: 'var(--am-red)',
};

export default function HealthCheckPanel({
  projects = [],
  onNavigate = () => {},
  onRescan = () => {},
  simpleMode = false,
  scanning = false,
}: HealthCheckPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Health is computed during scan and carried on each Skill; the report reads
  // it straight off the scanned projects.
  const entries = projects.flatMap((project) =>
    project.skills.map((skill) => ({ skill, project })),
  );
  const countBy = (status: HealthStatus) =>
    entries.filter((e) => e.skill.healthStatus === status).length;
  const okCount = countBy('ok');
  const warningCount = countBy('warning');
  const errorCount = countBy('error');

  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div data-cmp="HealthCheckPanel" className="flex flex-col h-full bg-card">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 border-b border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <Tooltip title={t('healthPanel.backToWorkspace')}>
          <IconButton onClick={() => onNavigate('main')} className="h-[26px] w-[26px]">
            <ArrowLeftIcon size={13} />
          </IconButton>
        </Tooltip>
        <HeartPulseIcon size={13} className="text-muted-foreground" />
        <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
          {t(simpleMode ? 'healthPanel.titleSimple' : 'healthPanel.titleFull')}
        </span>

        <div className="flex-1" />

        {entries.length > 0 && (
          <div className="flex items-center gap-2" style={{ fontSize: '11px' }}>
            <span className="flex items-center gap-0.5" style={{ color: 'var(--am-green)' }}>
              <CheckCircleIcon size={11} />
              {t('healthPanel.okCount', { count: okCount })}
            </span>
            {warningCount > 0 && (
              <span className="flex items-center gap-0.5" style={{ color: 'var(--am-orange)' }}>
                <AlertTriangleIcon size={11} />
                {t('healthPanel.warnCount', { count: warningCount })}
              </span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-0.5" style={{ color: 'var(--am-red)' }}>
                <XCircleIcon size={11} />
                {t('healthPanel.errCount', { count: errorCount })}
              </span>
            )}
          </div>
        )}

        <Tooltip title={t('healthPanel.rerun')} placement="bottom">
          <IconButton onClick={onRescan} disabled={scanning} className="h-[26px] w-[26px]">
            <RefreshCwIcon size={13} className={scanning ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <HeartPulseIcon size={36} className="opacity-30" />
            <p style={{ fontSize: '13px' }}>
              {t(scanning ? 'healthPanel.scanning' : 'healthPanel.noResults')}
            </p>
          </div>
        )}

        {entries.map(({ skill, project }) => {
          const isCollapsed = collapsed[skill.id];
          const StatusIcon = STATUS_ICON[skill.healthStatus];
          const statusColor = STATUS_COLOR[skill.healthStatus];
          const skillLabel = simpleMode ? displayLabel(skill.name) : skill.name;

          return (
            <div
              key={skill.id}
              className="flex-shrink-0 border border-border rounded-lg overflow-hidden"
            >
              {/* Skill header row */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                style={{ background: 'var(--am-panel-bg)' }}
                onClick={() => toggle(skill.id)}
              >
                <StatusIcon size={13} style={{ color: statusColor, flexShrink: 0 }} />
                <span className="flex-1 font-medium text-foreground" style={{ fontSize: '12px' }}>
                  {skillLabel}
                </span>
                <span
                  className="text-muted-foreground flex-shrink-0"
                  style={{ fontSize: '10.5px' }}
                >
                  {project.name}
                </span>
                <span
                  className="text-muted-foreground flex-shrink-0"
                  style={{ fontSize: '10.5px' }}
                >
                  {skill.healthIssues.length}
                </span>
                <span className="flex-shrink-0">
                  {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                </span>
              </div>

              {/* Issue list */}
              <div className={isCollapsed ? 'hidden' : ''}>
                <div className="px-3 py-2 flex flex-col gap-1.5 border-t border-border">
                  {skill.healthIssues.length === 0 && (
                    <div className="flex items-center gap-2" style={{ fontSize: '11.5px' }}>
                      <CheckCircleIcon size={11} style={{ color: 'var(--am-green)' }} />
                      <span className="text-muted-foreground">{t('health.noIssues')}</span>
                    </div>
                  )}
                  {skill.healthIssues.map((issue, i) => (
                    <div key={`${skill.id}-${i}`} className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-0.5">
                        {issue.level === 'error' ? (
                          <XCircleIcon size={11} style={{ color: 'var(--am-red)' }} />
                        ) : (
                          <AlertTriangleIcon size={11} style={{ color: 'var(--am-orange)' }} />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="rounded px-1 bg-secondary text-muted-foreground"
                            style={{ fontSize: '9.5px', fontFamily: 'monospace' }}
                          >
                            {issue.field}
                          </span>
                          <span className="text-foreground" style={{ fontSize: '11.5px' }}>
                            {t(issue.message)}
                          </span>
                        </div>
                        {issue.suggestion && (
                          <p className="text-muted-foreground" style={{ fontSize: '10.5px' }}>
                            {t(issue.suggestion)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Fix entry — Skill editor is deferred to v0.2. */}
                  <div className="flex justify-end pt-1">
                    <Tooltip title={t('health.editDeferred')} placement="left">
                      <span>
                        <IconButton disabled className="h-[22px] w-[22px]">
                          <PencilIcon size={11} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
