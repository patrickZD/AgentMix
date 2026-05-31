import { PlusCircleIcon, CheckCircleIcon } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import Badge from './Badge';
import type { Skill, SourceProject, ComboItem } from '../types';

interface SkillItemProps {
  skill?: Skill;
  project?: SourceProject;
  comboItems?: ComboItem[];
  selected?: boolean;
  onClick?: (skill: Skill) => void;
  onAddToCombo?: (skill: Skill, project: SourceProject) => void;
  simpleMode?: boolean;
}

export default function SkillItem({
  skill,
  project,
  comboItems = [],
  selected = false,
  onClick = () => {},
  onAddToCombo = () => {},
  simpleMode = false,
}: SkillItemProps) {
  if (!skill || !project) return null;

  const isInCombo = comboItems.some(
    (c) => c.skill.id === skill.id && c.project.id === project.id
  );

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInCombo) onAddToCombo(skill, project);
  };

  const nameLabel = simpleMode ? skill.displayName : skill.name;
  const isRemoved = skill.changeTag === 'REMOVED';

  return (
    <div
      data-cmp="SkillItem"
      className={`am-skill-row ${selected ? 'selected' : ''}`}
      onClick={() => onClick(skill)}
    >
      {/* Status dot */}
      <span className="flex-shrink-0" style={{ width: 8 }}>
        <Badge variant={skill.status} />
      </span>

      {/* Name + change tag */}
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        <span
          className={`text-foreground truncate`}
          style={{
            fontSize: '12.5px',
            fontWeight: 500,
            textDecoration: isRemoved ? 'line-through' : 'none',
            opacity: isRemoved ? 0.55 : 1,
          }}
        >
          {nameLabel}
        </span>
        {skill.changeTag && <Badge variant={skill.changeTag} />}
      </span>

      {/* Add to combo button */}
      <Tooltip
        title={isInCombo ? `Already in Combo` : `Add to Combo`}
        placement="left"
      >
        <span
          className={`flex-shrink-0 flex items-center cursor-pointer transition-opacity ${
            isInCombo ? 'opacity-40' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
          }`}
          onClick={handleAdd}
          style={{ color: isInCombo ? 'var(--am-green)' : 'var(--am-blue)' }}
        >
          {isInCombo ? (
            <CheckCircleIcon size={14} />
          ) : (
            <PlusCircleIcon size={14} />
          )}
        </span>
      </Tooltip>
    </div>
  );
}
