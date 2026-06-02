import { PlusCircleIcon, CheckCircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import { displayLabel } from '@/lib/skillView';
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
  const { t } = useTranslation();
  if (!skill || !project) return null;

  const isInCombo = comboItems.some(
    (c) => c.skill.id === skill.id && c.project.id === project.id
  );

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInCombo) onAddToCombo(skill, project);
  };

  const nameLabel = simpleMode ? displayLabel(skill.name) : skill.name;

  return (
    <div
      data-cmp="SkillItem"
      className={`am-skill-row group ${selected ? 'selected' : ''}`}
      onClick={() => onClick(skill)}
    >
      {/* Status dot */}
      <span className="flex-shrink-0" style={{ width: 8 }}>
        <Badge variant={skill.healthStatus} />
      </span>

      {/* Name */}
      <span className="flex-1 min-w-0 flex items-center gap-1.5">
        <span
          className="text-foreground truncate"
          style={{ fontSize: '12.5px', fontWeight: 500 }}
        >
          {nameLabel}
        </span>
      </span>

      {/* Add to combo button */}
      <Tooltip
        title={isInCombo ? t('skillItem.alreadyInCombo') : t('skillItem.addToCombo')}
        placement="left"
      >
        <span
          data-testid="skill-add"
          className={`flex-shrink-0 flex items-center cursor-pointer transition-opacity ${
            // Always visible (T26): hover-only discovery hid the main action
            // from alpha users.
            isInCombo ? 'opacity-40' : 'opacity-70 hover:!opacity-100'
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
