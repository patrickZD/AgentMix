import {
  SettingsIcon,
  InfoIcon,
  LayersIcon,
  ChevronRightIcon,
} from 'lucide-react';
import IconButton from '@/components/ui/IconButton';
import Tooltip from '@/components/ui/Tooltip';
import type { AppView } from '../types';

interface TitleBarProps {
  currentView?: AppView;
  onSettingsClick?: () => void;
  onAboutClick?: () => void;
  onNavigate?: (view: AppView) => void;
  projectCount?: number;
  simpleMode?: boolean;
  onSimpleModeToggle?: () => void;
}

export default function TitleBar({
  currentView = 'welcome',
  onSettingsClick = () => {},
  onAboutClick = () => {},
  onNavigate = () => {},
  projectCount = 0,
  simpleMode = false,
  onSimpleModeToggle = () => {},
}: TitleBarProps) {
  const breadcrumbMap: Record<AppView, string> = {
    welcome: '',
    main: 'Workspace',
    'merge-workbench': 'Merge Workbench',
    'health-check': 'Health Check',
  };

  return (
    <div
      data-cmp="TitleBar"
      className="flex items-center justify-between px-3 border-b border-border bg-card"
      style={{ height: 'var(--am-titlebar-h)', minHeight: 'var(--am-titlebar-h)' }}
    >
      {/* Left: Logo + breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          onClick={() => onNavigate(projectCount > 0 ? 'main' : 'welcome')}
        >
          <LayersIcon size={15} className="text-primary" />
          <span className="font-semibold text-foreground" style={{ fontSize: '13px', letterSpacing: '-0.01em' }}>
            AgentMix
          </span>
        </button>

        {currentView !== 'welcome' && (
          <div className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: '12px' }}>
            <ChevronRightIcon size={12} />
            <span
              className={currentView === 'main' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'}
              onClick={() => currentView !== 'main' && onNavigate('main')}
            >
              Workspace
            </span>
            {(currentView === 'merge-workbench' || currentView === 'health-check') && (
              <>
                <ChevronRightIcon size={12} />
                <span className="text-foreground">{breadcrumbMap[currentView]}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        {/* Simple mode toggle */}
        <button
          onClick={onSimpleModeToggle}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            simpleMode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          style={{ fontSize: '11px' }}
        >
          {simpleMode ? `Simple` : `Simple`}
        </button>

        <Tooltip title="Settings" placement="bottom">
          <IconButton onClick={onSettingsClick} className="h-[28px] w-[28px]">
            <SettingsIcon size={14} />
          </IconButton>
        </Tooltip>

        <Tooltip title="About AgentMix" placement="bottom">
          <IconButton onClick={onAboutClick} className="h-[28px] w-[28px]">
            <InfoIcon size={14} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
