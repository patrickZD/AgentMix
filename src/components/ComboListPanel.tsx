import { useState } from 'react';
import {
  ListChecksIcon,
  Trash2Icon,
  MergeIcon,
  GitMergeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertTriangleIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import { canMergeConflict, mergeSourceIdsForConflict, MERGE_MIN_SOURCES } from '@/lib/mergeSources';
import Badge from './Badge';
import type { ComboItem, ExportConflict, MergedComboItem } from '../types';

interface ComboListPanelProps {
  comboItems?: ComboItem[];
  mergedItems?: MergedComboItem[];
  conflicts?: ExportConflict[];
  onRemoveItem?: (itemId: string) => void;
  onMoveItem?: (itemId: string, direction: 'up' | 'down') => void;
  onRenameItem?: (itemId: string, exportedName: string) => void;
  onKeepOne?: (itemId: string) => void;
  // Open the merge workbench over these combo items (both entries: the
  // conflict row's third button and the generic select-mode header action).
  onOpenMerge?: (sourceItemIds: string[]) => void;
  onRemoveMergedItem?: (mergedId: string) => void;
}

export default function ComboListPanel({
  comboItems = [],
  mergedItems = [],
  conflicts = [],
  onRemoveItem = () => {},
  onMoveItem = () => {},
  onRenameItem = () => {},
  onKeepOne = () => {},
  onOpenMerge = () => {},
  onRemoveMergedItem = () => {},
}: ComboListPanelProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  // Generic merge entry (T25, decision 5): pick >= 2 items, any names.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Which items collide, per the authoritative composer result.
  const conflictingIds = new Set(conflicts.flatMap((c) => c.assetIds));
  const itemCount = comboItems.length + mergedItems.length;

  const startRename = (itemId: string, current: string) => {
    setEditingId(itemId);
    setDraftName(current);
  };

  const commitRename = () => {
    if (editingId && draftName.trim()) onRenameItem(editingId, draftName.trim());
    setEditingId(null);
  };

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const confirmSelect = () => {
    onOpenMerge([...selectedIds]);
    cancelSelect();
  };

  // The conflict row's merge button feeds the workbench that conflict's
  // combo-item participants.
  const conflictOf = (itemId: string) => conflicts.find((c) => c.assetIds.includes(itemId));

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
            {t('comboPanel.titleFull')}
          </span>
          {itemCount > 0 && (
            <span
              className="text-muted-foreground bg-secondary rounded-full px-1.5"
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {itemCount}
            </span>
          )}
          {conflicts.length > 0 && (
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
              {t('comboPanel.conflicts', { count: conflicts.length })}
            </span>
          )}
        </div>

        {/* Generic merge entry (T25): select >= 2 items, then merge them. */}
        {selectMode ? (
          <div className="flex items-center gap-1">
            <button
              onClick={confirmSelect}
              disabled={selectedIds.size < MERGE_MIN_SOURCES}
              data-testid="combo-merge-selected"
              className="px-2 py-0.5 rounded-md font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ fontSize: '11px', background: 'var(--am-blue)' }}
            >
              {t('comboPanel.mergeSelected', { count: selectedIds.size })}
            </button>
            <Tooltip title={t('comboPanel.mergeCancel')} placement="bottom">
              <IconButton onClick={cancelSelect} className="h-[26px] w-[26px]">
                <XIcon size={13} />
              </IconButton>
            </Tooltip>
          </div>
        ) : (
          <Tooltip title={t('comboPanel.mergeStart')} placement="bottom">
            <span>
              <IconButton
                disabled={comboItems.length < MERGE_MIN_SOURCES}
                onClick={() => setSelectMode(true)}
                data-testid="combo-merge-start"
                className="h-[26px] w-[26px]"
              >
                <MergeIcon size={13} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1" style={{ maxHeight: 260 }}>
        {itemCount === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-1.5">
            <ListChecksIcon size={24} className="text-muted-foreground opacity-30" />
            <p className="text-muted-foreground" style={{ fontSize: '11.5px' }}>
              {t('comboPanel.emptyFull')}
            </p>
          </div>
        )}

        {comboItems.map((item, idx) => {
          const isConflicting = conflictingIds.has(item.id);
          const isEditing = editingId === item.id;
          const nameLabel = item.exportedName;
          const isFirst = idx === 0;
          const isLast = idx === comboItems.length - 1;

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-1 px-2 py-1 group hover:bg-secondary rounded mx-1 ${
                isConflicting ? 'bg-orange-50' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Selection checkbox for the generic merge entry (T25) */}
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    data-testid="combo-merge-pick"
                    className="flex-shrink-0 accent-current"
                    style={{ width: 12, height: 12 }}
                  />
                )}
                {/* Conflict marker or health status */}
                <span className="flex-shrink-0" style={{ width: 14 }}>
                  {isConflicting ? (
                    <AlertTriangleIcon size={11} style={{ color: 'var(--am-orange)' }} />
                  ) : (
                    <Badge variant={item.skill.healthStatus} />
                  )}
                </span>

                {/* Name (or rename input) + project */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        data-testid="combo-rename-input"
                        className="flex-1 bg-card border border-border rounded px-1 outline-none text-foreground"
                        style={{ fontSize: '12px', minWidth: 0 }}
                      />
                      <IconButton onClick={commitRename} data-testid="combo-rename-confirm" className="h-[18px] w-[18px]">
                        <CheckIcon size={11} />
                      </IconButton>
                      <IconButton onClick={() => setEditingId(null)} className="h-[18px] w-[18px]">
                        <XIcon size={11} />
                      </IconButton>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <span
                          className="text-foreground truncate"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        >
                          {nameLabel}
                        </span>
                        {isConflicting && <Badge variant="conflict" />}
                      </div>
                      <div
                        className="text-muted-foreground truncate"
                        style={{ fontSize: '10.5px' }}
                      >
                        {`${item.project.name} · ${item.skill.name}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Reorder / remove — shown on hover */}
                {!isEditing && (
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Tooltip title={t('comboPanel.moveUp')} placement="left">
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
                    <Tooltip title={t('comboPanel.moveDown')} placement="left">
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
                    <Tooltip title={t('comboPanel.removeFromCombo')} placement="left">
                      <IconButton onClick={() => onRemoveItem(item.id)} className="h-[20px] w-[20px]">
                        <Trash2Icon size={11} />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Inline conflict resolution */}
              {isConflicting && !isEditing && (
                <div className="flex items-center gap-1.5 pl-5">
                  <button
                    onClick={() => startRename(item.id, item.exportedName)}
                    data-testid="combo-rename"
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-card transition-colors"
                    style={{ fontSize: '10px', fontWeight: 600, color: 'var(--am-blue)' }}
                  >
                    <PencilIcon size={9} />
                    {t('comboPanel.rename')}
                  </button>
                  <button
                    onClick={() => onKeepOne(item.id)}
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-card transition-colors"
                    style={{ fontSize: '10px', fontWeight: 600, color: 'var(--am-blue)' }}
                  >
                    <CheckIcon size={9} />
                    {t('comboPanel.keepOne')}
                  </button>
                  {(() => {
                    const conflict = conflictOf(item.id);
                    const mergeable = conflict !== undefined && canMergeConflict(conflict, comboItems);
                    return (
                      <button
                        disabled={!mergeable}
                        onClick={() =>
                          conflict && onOpenMerge(mergeSourceIdsForConflict(conflict, comboItems))
                        }
                        data-testid="combo-merge-conflict"
                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-card transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ fontSize: '10px', fontWeight: 600, color: 'var(--am-blue)' }}
                      >
                        <MergeIcon size={9} />
                        {t('comboPanel.merge')}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}

        {/* Merged entries (T25): content-backed, removable; removing one
            restores the items it replaced. */}
        {mergedItems.map((merged) => {
          const isConflicting = conflictingIds.has(merged.id);
          return (
            <div
              key={merged.id}
              data-testid="combo-merged-entry"
              className={`flex items-center gap-1.5 px-2 py-1 group hover:bg-secondary rounded mx-1 ${
                isConflicting ? 'bg-orange-50' : ''
              }`}
            >
              <span className="flex-shrink-0" style={{ width: 14 }}>
                {isConflicting ? (
                  <AlertTriangleIcon size={11} style={{ color: 'var(--am-orange)' }} />
                ) : (
                  <GitMergeIcon size={11} className="text-primary" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-foreground truncate" style={{ fontSize: '12px', fontWeight: 500 }}>
                    {merged.name}
                  </span>
                  <span
                    className="rounded px-1 flex-shrink-0"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      background: 'var(--am-blue)',
                      color: '#fff',
                    }}
                  >
                    {t('comboPanel.mergedBadge')}
                  </span>
                  {isConflicting && <Badge variant="conflict" />}
                </div>
                <div className="text-muted-foreground truncate" style={{ fontSize: '10.5px' }}>
                  {t('comboPanel.mergedFrom', { names: merged.sourceSkillNames.join(' + ') })}
                </div>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Tooltip title={t('comboPanel.removeFromCombo')} placement="left">
                  <IconButton
                    onClick={() => onRemoveMergedItem(merged.id)}
                    data-testid="combo-merged-remove"
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
