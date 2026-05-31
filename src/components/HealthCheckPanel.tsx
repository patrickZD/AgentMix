import {
  HeartPulseIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useState } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import type { HealthCheckResult, AppView } from '../types';

interface HealthCheckPanelProps {
  results?: HealthCheckResult[];
  onNavigate?: (view: AppView) => void;
  onRescan?: () => void;
  simpleMode?: boolean;
  scanning?: boolean;
}

export default function HealthCheckPanel({
  results = [],
  onNavigate = () => {},
  onRescan = () => {},
  simpleMode = false,
  scanning = false,
}: HealthCheckPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalPassed = results.reduce(
    (s, r) => s + r.checks.filter((c) => c.passed).length,
    0
  );
  const totalChecks = results.reduce((s, r) => s + r.checks.length, 0);
  const healthySkills = results.filter((r) => r.checks.every((c) => c.passed)).length;
  const errorSkills = results.filter((r) => r.checks.some((c) => !c.passed && r.skill.status === 'error')).length;
  const warningSkills = results.filter((r) => r.checks.some((c) => !c.passed && r.skill.status === 'warning')).length;

  const toggle = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      data-cmp="HealthCheckPanel"
      className="flex flex-col h-full bg-card"
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 border-b border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <Tooltip title="Back to Workspace">
          <IconButton onClick={() => onNavigate('main')} className="h-[26px] w-[26px]">
            <ArrowLeftIcon size={13} />
          </IconButton>
        </Tooltip>
        <HeartPulseIcon size={13} className="text-muted-foreground" />
        <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
          {simpleMode ? `Skill Health` : `Health Check`}
        </span>

        <div className="flex-1" />

        {/* Summary counts */}
        {results.length > 0 && (
          <div className="flex items-center gap-2" style={{ fontSize: '11px' }}>
            <span className="flex items-center gap-0.5" style={{ color: 'var(--am-green)' }}>
              <CheckCircleIcon size={11} />
              {healthySkills} ok
            </span>
            {warningSkills > 0 && (
              <span className="flex items-center gap-0.5" style={{ color: 'var(--am-orange)' }}>
                <AlertTriangleIcon size={11} />
                {warningSkills} warn
              </span>
            )}
            {errorSkills > 0 && (
              <span className="flex items-center gap-0.5" style={{ color: 'var(--am-red)' }}>
                <XCircleIcon size={11} />
                {errorSkills} err
              </span>
            )}
            <span className="text-muted-foreground">
              {totalPassed}/{totalChecks} checks
            </span>
          </div>
        )}

        <Tooltip title="Re-run Health Check" placement="bottom">
          <IconButton
            onClick={onRescan}
            disabled={scanning}
            className="h-[26px] w-[26px]"
          >
            <RefreshCwIcon size={13} className={scanning ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <HeartPulseIcon size={36} className="opacity-30" />
            <p style={{ fontSize: '13px' }}>
              {scanning ? `Scanning skills…` : `No results yet. Click refresh to run.`}
            </p>
          </div>
        )}

        {results.map((result) => {
          const isCollapsed = collapsed[result.skill.id];
          const allPassed = result.checks.every((c) => c.passed);
          const hasError = result.checks.some((c) => !c.passed && result.skill.status === 'error');
          const hasWarning = !hasError && result.checks.some((c) => !c.passed);

          const statusColor = hasError
            ? 'var(--am-red)'
            : hasWarning
            ? 'var(--am-orange)'
            : 'var(--am-green)';

          const StatusIcon = hasError
            ? XCircleIcon
            : hasWarning
            ? AlertTriangleIcon
            : CheckCircleIcon;

          const skillLabel = simpleMode ? result.skill.displayName : result.skill.name;

          return (
            <div
              key={result.skill.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Skill header row */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                style={{ background: 'var(--am-panel-bg)' }}
                onClick={() => toggle(result.skill.id)}
              >
                <StatusIcon size={13} style={{ color: statusColor, flexShrink: 0 }} />
                <span className="flex-1 font-medium text-foreground" style={{ fontSize: '12px' }}>
                  {skillLabel}
                </span>
                <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '10.5px' }}>
                  {result.project.name}
                </span>
                <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '10.5px' }}>
                  {result.checks.filter((c) => c.passed).length}/{result.checks.length}
                </span>
                <span className="flex-shrink-0">
                  {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                </span>
              </div>

              {/* Checks list */}
              <div className={isCollapsed ? 'hidden' : ''}>
                <div className="px-3 py-2 flex flex-col gap-1.5 border-t border-border">
                  {result.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-0.5">
                        {check.passed ? (
                          <CheckCircleIcon size={11} style={{ color: 'var(--am-green)' }} />
                        ) : (
                          <XCircleIcon size={11} style={{ color: 'var(--am-red)' }} />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={check.passed ? 'text-foreground' : 'text-destructive'}
                          style={{ fontSize: '11.5px' }}
                        >
                          {check.label}
                        </span>
                        {check.message && (
                          <p className="text-muted-foreground" style={{ fontSize: '10.5px' }}>
                            {check.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
