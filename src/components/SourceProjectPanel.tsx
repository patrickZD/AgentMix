import { useState } from 'react';
import {
  FolderOpenIcon,
  FolderDownIcon,
  PlusIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Trash2Icon,
  SearchIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import { filterSkills, groupByCategory, EMPTY_FILTER, type SkillFilter } from '@/lib/skillFilter';
import type { AssetCategory, HealthStatus, SourceProject, Skill, ComboItem } from '../types';
import SkillItem from './SkillItem';

interface SourceProjectPanelProps {
  projects?: SourceProject[];
  comboItems?: ComboItem[];
  selectedSkill?: Skill | null;
  showInvalid?: boolean;
  onSelectSkill?: (skill: Skill, project: SourceProject) => void;
  onAddProject?: () => void;
  onRemoveProject?: (projectId: string) => void;
  onScanProject?: (projectId: string) => void;
  onAddToCombo?: (skill: Skill, project: SourceProject) => void;
  onToggleShowInvalid?: () => void;
  // True while a folder is dragged over the window — highlights the panel as a
  // drop target (the drop itself is handled at the window level in MainLayout).
  dragging?: boolean;
}

const CATEGORY_CHIPS: ReadonlyArray<{ value: SkillFilter['category']; labelKey: string }> = [
  { value: 'all', labelKey: 'sourcePanel.filterAll' },
  { value: 'portable', labelKey: 'category.portable' },
  { value: 'tool-specific', labelKey: 'category.toolSpecific' },
];

const HEALTH_CHIPS: ReadonlyArray<{ value: SkillFilter['health']; labelKey: string }> = [
  { value: 'all', labelKey: 'sourcePanel.filterAll' },
  { value: 'ok', labelKey: 'health.ok' },
  { value: 'warning', labelKey: 'health.warning' },
  { value: 'error', labelKey: 'health.error' },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  fontSize: '10px',
  fontWeight: 600,
  background: active ? 'var(--am-blue-bg)' : 'transparent',
  color: active ? 'var(--am-blue)' : 'var(--am-text-muted, #94A3B8)',
});

export default function SourceProjectPanel({
  projects = [],
  comboItems = [],
  selectedSkill = null,
  showInvalid = false,
  onSelectSkill = () => {},
  onAddProject = () => {},
  onRemoveProject = () => {},
  onScanProject = () => {},
  onAddToCombo = () => {},
  onToggleShowInvalid = () => {},
  dragging = false,
}: SourceProjectPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<SkillFilter>(EMPTY_FILTER);

  // Persistent dashed affordance: doubles as the drag-drop hint and a click
  // entry equivalent to the "+" button (DESIGN.md §7: drag and button parity).
  const dropZone = (
    <button
      onClick={onAddProject}
      data-testid="drop-zone"
      className="flex flex-col items-center justify-center gap-1 w-full rounded-lg border border-dashed border-border text-muted-foreground hover:border-[var(--am-blue)] hover:text-[var(--am-blue)] transition-colors"
      style={{ padding: '14px 8px' }}
    >
      <FolderDownIcon size={18} className="opacity-70" />
      <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: 1.4 }}>
        {t('sourcePanel.dropHint')}
      </span>
    </button>
  );

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSkills = projects.reduce((s, p) => s + p.skills.length, 0);

  // One category subsection of a project's tree; hidden when it has no skills.
  const renderSection = (
    project: SourceProject,
    labelKey: string,
    skills: Skill[],
  ) => {
    if (skills.length === 0) return null;
    return (
      <div key={labelKey}>
        <div
          className="px-2 pt-1 text-muted-foreground uppercase"
          style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.04em' }}
        >
          {t(labelKey)} · {skills.length}
        </div>
        {skills.map((skill) => (
          <SkillItem
            key={skill.id}
            skill={skill}
            project={project}
            comboItems={comboItems}
            selected={selectedSkill?.id === skill.id}
            onClick={(s) => onSelectSkill(s, project)}
            onAddToCombo={onAddToCombo}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      data-cmp="SourceProjectPanel"
      className="relative flex flex-col h-full border-r border-border bg-card"
      style={{
        minWidth: 200,
        // Drag-over highlight: an inset ring in the brand blue, no layout shift.
        boxShadow: dragging ? 'inset 0 0 0 2px var(--am-blue)' : undefined,
      }}
    >
      {/* Drag-over overlay — visual only; the native drop is handled at the
          window level, so it stays click-through (pointer-events-none). */}
      {dragging && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
          style={{ background: 'var(--am-blue-bg)', opacity: 0.96 }}
          data-testid="drop-overlay"
        >
          <FolderDownIcon size={32} style={{ color: 'var(--am-blue)' }} />
          <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--am-blue)' }}>
            {t('sourcePanel.dropActive')}
          </span>
        </div>
      )}
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 border-b border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <div className="flex items-center gap-1.5">
          <FolderOpenIcon size={13} className="text-muted-foreground" />
          <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
            {t('sourcePanel.title')}
          </span>
          {projects.length > 0 && (
            <span
              className="text-muted-foreground bg-secondary rounded-full px-1.5"
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {t('sourcePanel.counts', { projects: projects.length, skills: totalSkills })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0">
          <Tooltip title={t('sourcePanel.addProject')} placement="bottom">
            <IconButton onClick={onAddProject} data-testid="add-project" className="h-[26px] w-[26px]">
              <PlusIcon size={13} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Filter bar */}
      {projects.length > 0 && (
        <div className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 flex-1 rounded bg-secondary px-1.5">
              <SearchIcon size={11} className="text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={filter.keyword}
                onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
                placeholder={t('sourcePanel.search')}
                className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground py-1"
                style={{ fontSize: '11.5px', minWidth: 0 }}
              />
            </div>
            <Tooltip
              title={t(showInvalid ? 'sourcePanel.hideInvalid' : 'sourcePanel.showInvalid')}
              placement="bottom"
            >
              <IconButton onClick={onToggleShowInvalid} className="h-[24px] w-[24px]">
                {showInvalid ? <EyeIcon size={12} /> : <EyeOffIcon size={12} />}
              </IconButton>
            </Tooltip>
          </div>
          <div className="flex items-center flex-wrap gap-1">
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() =>
                  setFilter((f) => ({ ...f, category: chip.value as AssetCategory | 'all' }))
                }
                className="rounded px-1.5 py-0.5 transition-colors"
                style={chipStyle(filter.category === chip.value)}
              >
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex items-center flex-wrap gap-1">
            {HEALTH_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() =>
                  setFilter((f) => ({ ...f, health: chip.value as HealthStatus | 'all' }))
                }
                className="rounded px-1.5 py-0.5 transition-colors"
                style={chipStyle(filter.health === chip.value)}
              >
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <p className="text-muted-foreground text-center" style={{ fontSize: '12px' }}>
              {t('sourcePanel.emptyFull')}
            </p>
            {dropZone}
          </div>
        )}

        {projects.map((project) => {
          const isCollapsed = collapsed[project.id];
          const visible = filterSkills(project.skills, filter, showInvalid);
          const groups = groupByCategory(visible);

          return (
            <div key={project.id} data-project={project.name} className="mb-1">
              {/* Project row */}
              <div
                className="flex items-center gap-1 px-2 py-1 group hover:bg-secondary cursor-pointer select-none"
                onClick={() => toggleCollapse(project.id)}
              >
                <span className="text-muted-foreground flex-shrink-0" style={{ width: 14 }}>
                  {isCollapsed ? (
                    <ChevronRightIcon size={12} />
                  ) : (
                    <ChevronDownIcon size={12} />
                  )}
                </span>
                <FolderOpenIcon size={12} className="text-muted-foreground flex-shrink-0" />
                <span
                  className="flex-1 font-medium text-foreground truncate"
                  style={{ fontSize: '12px' }}
                >
                  {project.name}
                </span>
                <span
                  className="text-muted-foreground flex-shrink-0"
                  style={{ fontSize: '10px' }}
                >
                  {visible.length}
                </span>

                {/* Hover actions */}
                <div
                  className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title={t('sourcePanel.rescan')} placement="bottom">
                    <IconButton
                      onClick={() => onScanProject(project.id)}
                      className="h-[20px] w-[20px]"
                    >
                      <RefreshCwIcon size={11} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sourcePanel.removeProject')} placement="bottom">
                    <IconButton
                      onClick={() => onRemoveProject(project.id)}
                      className="h-[20px] w-[20px]"
                    >
                      <Trash2Icon size={11} />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              {/* Categorized skill tree */}
              <div className={`pl-5 pr-1 ${isCollapsed ? 'hidden' : ''}`}>
                {visible.length === 0 && (
                  <p className="text-muted-foreground py-1 px-2" style={{ fontSize: '11.5px' }}>
                    {t(project.skills.length === 0 ? 'sourcePanel.noSkills' : 'sourcePanel.noMatch')}
                  </p>
                )}
                {renderSection(project, 'category.portable', groups.portable)}
                {renderSection(project, 'category.toolSpecific', groups.toolSpecific)}
                {renderSection(project, 'category.invalid', groups.invalid)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact drop affordance pinned to the panel's bottom when projects
          already exist, so it stays reachable without scrolling. */}
      {projects.length > 0 && (
        <div className="flex-shrink-0 border-t border-border px-2 py-2">{dropZone}</div>
      )}
    </div>
  );
}
