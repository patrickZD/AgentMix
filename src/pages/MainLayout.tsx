import { useEffect } from 'react';
import {
  HeartPulseIcon,
  BookOpenIcon,
  PanelLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import TitleBar from '../components/TitleBar';
import SourceProjectPanel from '../components/SourceProjectPanel';
import ComboListPanel from '../components/ComboListPanel';
import ExportPanel from '../components/ExportPanel';
import MergeWorkbench from '../components/MergeWorkbench';
import HealthCheckPanel from '../components/HealthCheckPanel';
import WelcomeScreen from '../components/WelcomeScreen';
import { displayLabel, categoryLabelKey } from '@/lib/skillView';
import { pickDirectory } from '@/lib/scan';
import type { SourceProject, Skill } from '../types';
import { useProjectStore } from '@/stores/projectStore';
import { useCompositionStore } from '@/stores/compositionStore';
import { useExportStore } from '@/stores/exportStore';
import { useUiStore } from '@/stores/uiStore';

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
  const { t } = useTranslation();
  if (!skill || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <BookOpenIcon size={28} className="opacity-30" />
        <p style={{ fontSize: '12px' }}>
          {t(simpleMode ? 'mainLayout.selectSkillSimple' : 'mainLayout.selectSkillFull')}
        </p>
      </div>
    );
  }

  const nameLabel = simpleMode ? displayLabel(skill.name) : skill.name;

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
              {!simpleMode && skill.relativePathInProject && (
                <span className="ml-1 opacity-60">· {skill.relativePathInProject}</span>
              )}
            </p>
          </div>
        </div>
        {skill.description && (
          <p className="text-foreground mt-2" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            {skill.description}
          </p>
        )}

        {/* Category + compatibility (real v0.1 domain fields) */}
        {!simpleMode && (
          <div className="flex flex-wrap items-center gap-2 mt-2" style={{ fontSize: '10.5px' }}>
            <span
              className="rounded px-1.5 py-0.5 bg-secondary text-secondary-foreground"
              style={{ fontWeight: 500 }}
            >
              {t(categoryLabelKey(skill.category))}
            </span>
            {skill.compatibility && (
              <span style={{ color: '#94A3B8' }}>{skill.compatibility}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="am-code-block">{skill.skillMdContent}</div>
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
  const { t } = useTranslation();
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
          {t('settings.title')}
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium" style={{ fontSize: '12.5px' }}>
                {t('settings.simpleMode')}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                {t('settings.simpleModeDesc')}
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
            {t('settings.footer')}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors"
          style={{ fontSize: '12px' }}
        >
          {t('settings.close')}
        </button>
      </div>
    </div>
  );
}

export default function MainLayout() {
  const { t } = useTranslation();

  const { projects, healthResults, scanAndAdd, removeProject } = useProjectStore();
  const { comboItems, addToCombo, removeItem, moveItem, removeItemsByProject } =
    useCompositionStore();
  const { exportTargets, toggleTarget } = useExportStore();
  const {
    view,
    selectedSkill,
    selectedProject,
    simpleMode,
    showInvalid,
    settingsOpen,
    leftCollapsed,
    mergeSkillA,
    mergeSkillB,
    setView,
    selectSkill,
    toggleSimpleMode,
    toggleShowInvalid,
    setSettingsOpen,
    toggleLeftCollapsed,
    setMergeSkills,
  } = useUiStore();

  // Handler aliases so the JSX below reads naturally; store actions do the work.
  const handleNavigate = setView;
  const handleSelectSkill = selectSkill;
  const handleAddToCombo = addToCombo;
  const handleRemoveComboItem = removeItem;
  const handleMoveComboItem = moveItem;
  const handleToggleExportTarget = toggleTarget;

  // Folder-selection entry: pick a directory, then scan it. The drag-drop entry
  // below is equivalent (both call scanAndAdd); adding the first project flips
  // the view off the welcome screen automatically (see effectiveView).
  const handleAddProject = async () => {
    const dir = await pickDirectory();
    if (dir) await scanAndAdd(dir);
  };

  const handleScanProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) void scanAndAdd(project.rootPath);
  };

  // Drag-drop entry, equivalent to the folder button. The webview API is only
  // available in the desktop runtime, so it is imported lazily and guarded.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const un = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === 'drop') {
            for (const path of event.payload.paths) void scanAndAdd(path);
          }
        });
        if (cancelled) un();
        else unlisten = un;
      } catch {
        // Not inside a Tauri webview (e.g. plain `vite dev`): drag-drop is a
        // desktop-only entry; the folder button still works.
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [scanAndAdd]);

  const handleRemoveProject = (projectId: string) => {
    removeProject(projectId);
    removeItemsByProject(projectId);
  };

  const handleOpenMerge = (itemId: string) => {
    const item = comboItems.find((c) => c.id === itemId);
    const conflict = comboItems.find((c) => c.id === item?.conflictWith);
    setMergeSkills(item?.skill ?? null, conflict?.skill ?? null);
    setView('merge-workbench');
  };

  const isWelcome = projects.length === 0;
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
        onSimpleModeToggle={toggleSimpleMode}
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
                showInvalid={showInvalid}
                onSelectSkill={handleSelectSkill}
                onAddProject={handleAddProject}
                onRemoveProject={handleRemoveProject}
                onScanProject={handleScanProject}
                onAddToCombo={handleAddToCombo}
                onToggleShowInvalid={toggleShowInvalid}
                simpleMode={simpleMode}
              />
            </div>

            {leftCollapsed && (
              <div className="flex justify-center pt-2">
                <Tooltip title={t('mainLayout.expandPanel')} placement="right">
                  <IconButton
                    onClick={() => toggleLeftCollapsed()}
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
            onClick={() => toggleLeftCollapsed()}
            title={leftCollapsed ? t('mainLayout.expand') : t('mainLayout.collapse')}
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
                  {t('mainLayout.skillPreview')}
                </span>
                {selectedSkill && (
                  <>
                    <ChevronRightIcon size={11} className="text-muted-foreground" />
                    <span className="text-muted-foreground truncate" style={{ fontSize: '11px' }}>
                      {simpleMode ? displayLabel(selectedSkill.name) : selectedSkill.name}
                    </span>
                  </>
                )}
                <div className="flex-1" />
                <Tooltip title={t('mainLayout.healthCheck')}>
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
        onSimpleModeToggle={toggleSimpleMode}
      />
    </div>
  );
}
