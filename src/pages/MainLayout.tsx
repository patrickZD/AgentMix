import { useState } from 'react';
import {
  HeartPulseIcon,
  BookOpenIcon,
  PanelLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import TitleBar from '../components/TitleBar';
import SourceProjectPanel from '../components/SourceProjectPanel';
import ComboListPanel from '../components/ComboListPanel';
import ExportPanel from '../components/ExportPanel';
import MergeWorkbench from '../components/MergeWorkbench';
import HealthCheckPanel from '../components/HealthCheckPanel';
import WelcomeScreen from '../components/WelcomeScreen';
import type {
  SourceProject,
  Skill,
  ComboItem,
  ExportTarget,
  AppView,
  HealthCheckResult,
} from '../types';
import {
  MOCK_PROJECTS,
  MOCK_EXPORT_TARGETS,
  MOCK_HEALTH_RESULTS,
} from '../data/mockData';

let comboIdCounter = 0;

// Skill detail / preview panel
function SkillPreviewPanel({
  skill,
  project,
  simpleMode,
}: {
  skill: Skill | null;
  project: SourceProject | null;
  simpleMode: boolean;
}) {
  if (!skill || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <BookOpenIcon size={28} className="opacity-30" />
        <p style={{ fontSize: '12px' }}>
          {simpleMode ? `Select a skill to preview` : `Select a skill to preview its content`}
        </p>
      </div>
    );
  }

  const nameLabel = simpleMode ? skill.displayName : skill.name;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Skill header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold text-foreground"
              style={{ fontSize: '14px', letterSpacing: '-0.01em' }}
            >
              {nameLabel}
            </h2>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: '11px' }}>
              {project.name}
              {!simpleMode && skill.filePath && (
                <span className="ml-1 opacity-60">· {skill.filePath}</span>
              )}
            </p>
          </div>
        </div>
        {skill.description && (
          <p className="text-foreground mt-2" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {skill.description}
          </p>
        )}

        {/* Frontmatter tags */}
        {!simpleMode && skill.frontmatter.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="rounded px-1.5 py-0.5 bg-secondary text-secondary-foreground"
                style={{ fontSize: '10px', fontWeight: 500 }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {!simpleMode && (
          <div className="flex items-center gap-3 mt-2" style={{ fontSize: '10.5px', color: '#94A3B8' }}>
            {skill.frontmatter.version && (
              <span>v{String(skill.frontmatter.version)}</span>
            )}
            {skill.frontmatter.author && (
              <span>{String(skill.frontmatter.author)}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="am-code-block">{skill.content}</div>
      </div>
    </div>
  );
}

// Settings dialog (inline, simple)
function SettingsDialog({
  open,
  onClose,
  simpleMode,
  onSimpleModeToggle,
}: {
  open: boolean;
  onClose: () => void;
  simpleMode: boolean;
  onSimpleModeToggle: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? '' : 'hidden'}`}
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-custom p-5 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="font-bold text-foreground mb-4"
          style={{ fontSize: '14px' }}
        >
          Settings
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium" style={{ fontSize: '12.5px' }}>
                Simple Mode
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                Hides technical field names
              </p>
            </div>
            <button
              onClick={onSimpleModeToggle}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative`}
              style={{ background: simpleMode ? 'var(--am-blue)' : '#CBD5E1' }}
            >
              <span
                className="absolute top-0.5 transition-all rounded-full bg-white"
                style={{
                  width: 16,
                  height: 16,
                  left: simpleMode ? '18px' : '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          <hr className="border-border" />

          <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
            AgentMix v0.1.0 — Local open-source tool.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors"
          style={{ fontSize: '12px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const [view, setView] = useState<AppView>('main');
  const [projects, setProjects] = useState<SourceProject[]>(MOCK_PROJECTS);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [exportTargets, setExportTargets] = useState<ExportTarget[]>(MOCK_EXPORT_TARGETS);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedProject, setSelectedProject] = useState<SourceProject | null>(null);
  const [healthResults] = useState<HealthCheckResult[]>(MOCK_HEALTH_RESULTS);
  const [simpleMode, setSimpleMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [mergeSkillA, setMergeSkillA] = useState<Skill | null>(null);
  const [mergeSkillB, setMergeSkillB] = useState<Skill | null>(null);

  // Add fake project on "Add"
  const handleAddProject = () => {
    const newProj: SourceProject = {
      id: `proj-${Date.now()}`,
      name: `new-project-${projects.length + 1}`,
      path: `/home/user/projects/new-project-${projects.length + 1}`,
      skills: [],
      lastScanned: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProj]);
    if (view === 'welcome') setView('main');
  };

  const handleRemoveProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setComboItems((prev) => prev.filter((c) => c.project.id !== projectId));
  };

  const handleSelectSkill = (skill: Skill, project: SourceProject) => {
    setSelectedSkill(skill);
    setSelectedProject(project);
  };

  const handleAddToCombo = (skill: Skill, project: SourceProject) => {
    const alreadyIn = comboItems.some(
      (c) => c.skill.id === skill.id && c.project.id === project.id
    );
    if (alreadyIn) return;

    // Check for conflict — same skill name but different project
    const existingWithSameName = comboItems.find(
      (c) => c.skill.name === skill.name && c.project.id !== project.id
    );

    const newItem: ComboItem = {
      id: `combo-${++comboIdCounter}`,
      skill,
      project,
      hasConflict: !!existingWithSameName,
      conflictWith: existingWithSameName?.id,
      includeInExport: true,
    };

    // Also flag the existing item as conflicted
    if (existingWithSameName) {
      setComboItems((prev) =>
        prev.map((c) =>
          c.id === existingWithSameName.id
            ? { ...c, hasConflict: true, conflictWith: newItem.id }
            : c
        )
      );
    }

    setComboItems((prev) => [...prev, newItem]);
  };

  const handleRemoveComboItem = (itemId: string) => {
    setComboItems((prev) => {
      const removing = prev.find((c) => c.id === itemId);
      return prev
        .filter((c) => c.id !== itemId)
        .map((c) =>
          c.conflictWith === itemId
            ? { ...c, hasConflict: false, conflictWith: undefined }
            : c
        );
    });
  };

  const handleMoveComboItem = (itemId: string, direction: 'up' | 'down') => {
    setComboItems((prev) => {
      const idx = prev.findIndex((c) => c.id === itemId);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const handleOpenMerge = (itemId: string) => {
    const item = comboItems.find((c) => c.id === itemId);
    const conflict = comboItems.find((c) => c.id === item?.conflictWith);
    if (item) setMergeSkillA(item.skill);
    if (conflict) setMergeSkillB(conflict.skill);
    setView('merge-workbench');
  };

  const handleToggleExportTarget = (id: string, enabled: boolean) => {
    setExportTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled } : t))
    );
  };

  const handleNavigate = (v: AppView) => {
    setView(v);
  };

  const isWelcome = projects.length === 0;

  // Decide actual view
  const effectiveView = isWelcome ? 'welcome' : view;

  return (
    <div
      data-cmp="MainLayout"
      className="flex flex-col h-screen w-screen overflow-hidden bg-background"
    >
      {/* Title bar — always visible */}
      <TitleBar
        currentView={effectiveView}
        onSettingsClick={() => setSettingsOpen(true)}
        onAboutClick={() => {}}
        onNavigate={handleNavigate}
        projectCount={projects.length}
        simpleMode={simpleMode}
        onSimpleModeToggle={() => setSimpleMode((s) => !s)}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Welcome screen */}
        <div className={effectiveView === 'welcome' ? 'flex-1 overflow-hidden' : 'hidden'}>
          <WelcomeScreen
            onAddProject={handleAddProject}
            onNavigate={handleNavigate}
            simpleMode={simpleMode}
          />
        </div>

        {/* Main 2-panel workspace */}
        <div className={effectiveView === 'main' ? 'flex flex-1 overflow-hidden' : 'hidden'}>
          {/* Left panel - source projects (collapsible) */}
          <div
            className="flex-shrink-0 transition-all duration-200 overflow-hidden"
            style={{ width: leftCollapsed ? 32 : 260, minWidth: leftCollapsed ? 32 : 260 }}
          >
            <div className={leftCollapsed ? 'hidden' : 'flex flex-col h-full'}>
              <SourceProjectPanel
                projects={projects}
                comboItems={comboItems}
                selectedSkill={selectedSkill}
                onSelectSkill={handleSelectSkill}
                onAddProject={handleAddProject}
                onRemoveProject={handleRemoveProject}
                onScanProject={() => {}}
                onAddToCombo={handleAddToCombo}
                simpleMode={simpleMode}
              />
            </div>

            {leftCollapsed && (
              <div className="flex justify-center pt-2">
                <Tooltip title="Expand Projects Panel" placement="right">
                  <IconButton
                    onClick={() => setLeftCollapsed(false)}
                    className="h-[24px] w-[24px]"
                  >
                    <ChevronRightIcon size={13} />
                  </IconButton>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Collapse toggle strip */}
          <div
            className="flex flex-col items-center justify-center border-r border-border bg-card cursor-pointer hover:bg-secondary transition-colors flex-shrink-0"
            style={{ width: 12 }}
            onClick={() => setLeftCollapsed((s) => !s)}
            title={leftCollapsed ? `Expand` : `Collapse`}
          >
            <PanelLeftIcon size={10} className="text-muted-foreground opacity-40" />
          </div>

          {/* Right side: preview + combo + export */}
          <div className="flex flex-1 overflow-hidden" style={{ minWidth: 0 }}>
            {/* Skill preview (center, main content) */}
            <div className="flex-1 overflow-hidden border-r border-border bg-card" style={{ minWidth: 0 }}>
              {/* Toolbar strip */}
              <div
                className="flex items-center gap-2 px-3 border-b border-border flex-shrink-0"
                style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
              >
                <BookOpenIcon size={13} className="text-muted-foreground" />
                <span className="text-foreground font-semibold" style={{ fontSize: '12px' }}>
                  {simpleMode ? `Skill Preview` : `Skill Preview`}
                </span>
                {selectedSkill && (
                  <>
                    <ChevronRightIcon size={11} className="text-muted-foreground" />
                    <span className="text-muted-foreground truncate" style={{ fontSize: '11px' }}>
                      {simpleMode ? selectedSkill.displayName : selectedSkill.name}
                    </span>
                  </>
                )}
                <div className="flex-1" />
                <Tooltip title="Health Check">
                  <IconButton
                    onClick={() => handleNavigate('health-check')}
                    className="h-[26px] w-[26px]"
                  >
                    <HeartPulseIcon size={13} />
                  </IconButton>
                </Tooltip>
              </div>

              <div className="flex-1 h-full overflow-hidden" style={{ height: 'calc(100% - var(--am-toolbar-h))' }}>
                <SkillPreviewPanel
                  skill={selectedSkill}
                  project={selectedProject}
                  simpleMode={simpleMode}
                />
              </div>
            </div>

            {/* Right sidebar: Combo + Export */}
            <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 280, minWidth: 260 }}>
              <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col" style={{ minHeight: 0 }}>
                <ComboListPanel
                  comboItems={comboItems}
                  onRemoveItem={handleRemoveComboItem}
                  onMoveItem={handleMoveComboItem}
                  onOpenMerge={handleOpenMerge}
                  onNavigate={handleNavigate}
                  simpleMode={simpleMode}
                />
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <ExportPanel
                    exportTargets={exportTargets}
                    comboItems={comboItems}
                    onToggleTarget={handleToggleExportTarget}
                    onExport={() => {}}
                    onEditPath={() => {}}
                    simpleMode={simpleMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Merge Workbench */}
        <div className={effectiveView === 'merge-workbench' ? 'flex-1 overflow-hidden' : 'hidden'}>
          <MergeWorkbench
            skillA={mergeSkillA}
            skillB={mergeSkillB}
            onNavigate={handleNavigate}
            simpleMode={simpleMode}
          />
        </div>

        {/* Health Check */}
        <div className={effectiveView === 'health-check' ? 'flex-1 overflow-hidden' : 'hidden'}>
          <HealthCheckPanel
            results={healthResults}
            onNavigate={handleNavigate}
            onRescan={() => {}}
            simpleMode={simpleMode}
          />
        </div>
      </div>

      {/* Settings overlay */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        simpleMode={simpleMode}
        onSimpleModeToggle={() => setSimpleMode((s) => !s)}
      />
    </div>
  );
}
