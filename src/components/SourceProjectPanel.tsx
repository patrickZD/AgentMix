import { useState } from 'react';
import {
  FolderOpenIcon,
  PlusIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Trash2Icon,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
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
            {simpleMode ? `Source Projects` : `Source Projects`}
          </span>
          {projects.length > 0 && (
            <span
              className="text-muted-foreground bg-secondary rounded-full px-1.5"
              style={{ fontSize: '10px', fontWeight: 600 }}
            >
              {projects.length}p · {totalSkills}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-0">
          <Tooltip title="Add Source Project" placement="bottom">
            <IconButton size="small" onClick={onAddProject} sx={{ width: 26, height: 26, color: 'text.secondary' }}>
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
              {simpleMode
                ? `No projects yet.\nClick + to add a folder.`
                : `No source projects.\nClick + to open a directory.`}
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
                  <Tooltip title="Re-scan" placement="bottom">
                    <IconButton
                      size="small"
                      onClick={() => onScanProject(project.id)}
                      sx={{ width: 20, height: 20, color: 'text.secondary' }}
                    >
                      <RefreshCwIcon size={11} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove Project" placement="bottom">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveProject(project.id)}
                      sx={{ width: 20, height: 20, color: 'text.secondary' }}
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
                    No skills found
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
