import { useState } from 'react';
import {
  FolderOpenIcon,
  PlusIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Trash2Icon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import SkillItem from './SkillItem';
import type { SourceProject, Skill, ComboItem } from '../types';

interface SourceProjectPanelProps {
  projects?: SourceProject[];
  comboItems?: ComboItem[];
  selectedSkill?: Skill | null;
  onSelectSkill?: (skill: Skill, project: SourceProject) => void;
  onAddProject?: () => void;
  onRemoveProject?: (projectId: string) => void;
  onScanProject?: (projectId: string) => void;
  onAddToCombo?: (skill: Skill, project: SourceProject) => void;
  simpleMode?: boolean;
}

export default function SourceProjectPanel({
  projects = [],
  comboItems = [],
  selectedSkill = null,
  onSelectSkill = () => {},
  onAddProject = () => {},
  onRemoveProject = () => {},
  onScanProject = () => {},
  onAddToCombo = () => {},
  simpleMode = false,
}: SourceProjectPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSkills = projects.reduce((s, p) => s + p.skills.length, 0);

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
          const projectSkillCount = project.skills.length;

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
                  {projectSkillCount}
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

              {/* Skill list */}
              <div className={`pl-5 pr-1 ${isCollapsed ? 'hidden' : ''}`}>
                {project.skills.length === 0 && (
                  <p className="text-muted-foreground py-1 px-2" style={{ fontSize: '11.5px' }}>
                    {t('sourcePanel.noSkills')}
                  </p>
                )}
                {project.skills.map((skill) => (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
