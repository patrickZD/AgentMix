import {
  ListChecksIcon,
  Trash2Icon,
  MergeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import Badge from './Badge';
import type { ComboItem, AppView } from '../types';

interface ComboListPanelProps {
  comboItems?: ComboItem[];
  onRemoveItem?: (itemId: string) => void;
  onMoveItem?: (itemId: string, direction: 'up' | 'down') => void;
  onOpenMerge?: (itemId: string) => void;
  onNavigate?: (view: AppView) => void;
  simpleMode?: boolean;
}

export default function ComboListPanel({
  comboItems = [],
  onRemoveItem = () => {},
  onMoveItem = () => {},
  onOpenMerge = () => {},
  onNavigate = () => {},
  simpleMode = false,
}: ComboListPanelProps) {
  const conflictCount = comboItems.filter((c) => c.hasConflict).length;

  return (
    <div
      data-cmp="ComboListPanel"
      className="flex flex-col bg-card border-b border-border"
      style={{ minHeight: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 border-b border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <div className="flex items-center gap-1.5">
          <ListChecksIcon size={13} className="text-muted-foreground" />
          <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
            {simpleMode ? `My Combo` : `Combo List`}
          </span>
          {comboItems.length > 0 && (
            <span
              className="text-muted-foreground bg-secondary rounded-full px-1.5"
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {comboItems.length}
            </span>
          )}
          {conflictCount > 0 && (
            <span
              className="flex items-center gap-0.5 rounded px-1.5"
              style={{
                background: 'var(--am-orange-bg)',
                color: 'var(--am-orange)',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              <AlertTriangleIcon size={9} />
              {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center">
          <Tooltip title="Open Merge Workbench" placement="bottom">
            <span>
              <IconButton
                onClick={() => onNavigate('merge-workbench')}
                disabled={comboItems.length < 2}
                className="h-[26px] w-[26px]"
              >
                <MergeIcon size={13} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1" style={{ maxHeight: 260 }}>
        {comboItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-1.5">
            <ListChecksIcon size={24} className="text-muted-foreground opacity-30" />
            <p className="text-muted-foreground" style={{ fontSize: '11.5px' }}>
              {simpleMode
                ? `Add skills from the left panel`
                : `No skills in combo. Add from Source Projects.`}
            </p>
          </div>
        )}

        {comboItems.map((item, idx) => {
          const nameLabel = simpleMode ? item.skill.displayName : item.skill.name;
          const isFirst = idx === 0;
          const isLast = idx === comboItems.length - 1;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-1.5 px-2 py-1 group hover:bg-secondary rounded mx-1 ${
                item.hasConflict ? 'bg-orange-50' : ''
              }`}
            >
              {/* Conflict badge or status */}
              <span className="flex-shrink-0" style={{ width: 14 }}>
                {item.hasConflict ? (
                  <AlertTriangleIcon size={11} style={{ color: 'var(--am-orange)' }} />
                ) : (
                  <Badge variant={item.skill.status} />
                )}
              </span>

              {/* Skill name + project */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-foreground truncate"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    {nameLabel}
                  </span>
                  {item.skill.changeTag && (
                    <Badge variant={item.skill.changeTag} />
                  )}
                  {item.hasConflict && (
                    <Badge variant="conflict" />
                  )}
                </div>
                <div
                  className="text-muted-foreground truncate"
                  style={{ fontSize: '10.5px' }}
                >
                  {simpleMode ? item.project.name : `${item.project.name} · ${item.skill.name}`}
                </div>
              </div>

              {/* Actions - shown on hover */}
              <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {item.hasConflict && (
                  <Tooltip title="Open in Merge Workbench" placement="left">
                    <IconButton
                      onClick={() => onOpenMerge(item.id)}
                      className="h-[20px] w-[20px]"
                    >
                      <MergeIcon size={11} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Move Up" placement="left">
                  <span>
                    <IconButton
                      disabled={isFirst}
                      onClick={() => onMoveItem(item.id, 'up')}
                      className="h-[20px] w-[20px]"
                    >
                      <ArrowUpIcon size={11} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move Down" placement="left">
                  <span>
                    <IconButton
                      disabled={isLast}
                      onClick={() => onMoveItem(item.id, 'down')}
                      className="h-[20px] w-[20px]"
                    >
                      <ArrowDownIcon size={11} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove from Combo" placement="left">
                  <IconButton
                    onClick={() => onRemoveItem(item.id)}
                    className="h-[20px] w-[20px]"
                  >
                    <Trash2Icon size={11} />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
