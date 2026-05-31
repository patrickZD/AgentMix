import { useState } from 'react';
import {
  FolderOpenIcon,
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
  simpleMode?: boolean;
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
  simpleMode = false,
}: SourceProjectPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<SkillFilter>(EMPTY_FILTER);

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
            simpleMode={simpleMode}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      data-cmp="SourceProjectPanel"
      className="flex flex-col h-full border-r border-border bg-card"
      style={{ minWidth: 200 }}
    >
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
            <IconButton onClick={onAddProject} className="h-[26px] w-[26px]">
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
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <FolderOpenIcon size={28} className="text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-center" style={{ fontSize: '12px' }}>
              {t(simpleMode ? 'sourcePanel.emptySimple' : 'sourcePanel.emptyFull')}
            </p>
          </div>
        )}

        {projects.map((project) => {
          const isCollapsed = collapsed[project.id];
          const visible = filterSkills(project.skills, filter, showInvalid);
          const groups = groupByCategory(visible);

          return (
            <div key={project.id} className="mb-1">
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
    </div>
  );
}
