import { useCallback, useEffect, useState } from 'react';
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
import HealthCheckPanel from '../components/HealthCheckPanel';
import WelcomeScreen from '../components/WelcomeScreen';
import UpdateModal from '../components/UpdateModal';
import MergeWorkbench from '../components/MergeWorkbench';
import { displayLabel, categoryLabelKey } from '@/lib/skillView';
import { resolveView } from '@/lib/viewRouting';
import { pickDirectory } from '@/lib/scan';
import { openPath } from '@/lib/exporter';
import { changeLanguage } from '@/i18n';
import type { SourceProject, Skill } from '../types';
import { useProjectStore } from '@/stores/projectStore';
import { useCompositionStore } from '@/stores/compositionStore';
import { useExportStore } from '@/stores/exportStore';
import { useUiStore } from '@/stores/uiStore';
import { isBadgeVisible, useUpdateStore } from '@/stores/updateStore';
import { useMergeStore } from '@/stores/mergeStore';
import { onUpdateDownloadProgress } from '@/lib/updater';

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
  showInvalid,
  onShowInvalidToggle,
  autoCheckUpdates,
  onAutoCheckUpdatesToggle,
  updateChecking,
  updateUpToDate,
  updateVersion,
  onCheckUpdates,
  onViewUpdate,
}: {
  open: boolean;
  onClose: () => void;
  simpleMode: boolean;
  onSimpleModeToggle: () => void;
  showInvalid: boolean;
  onShowInvalidToggle: () => void;
  autoCheckUpdates: boolean;
  onAutoCheckUpdatesToggle: () => void;
  updateChecking: boolean;
  updateUpToDate: boolean;
  // Badge-visible newer version, or null (none / skipped).
  updateVersion: string | null;
  onCheckUpdates: () => void;
  onViewUpdate: () => void;
}) {
  const { t, i18n } = useTranslation();
  const activeLang: 'en' | 'zh' = i18n.language.startsWith('zh') ? 'zh' : 'en';
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
          {/* Language — switches immediately and is persisted (DESIGN.md §7). */}
          <div className="flex items-center justify-between">
            <p className="text-foreground font-medium" style={{ fontSize: '12.5px' }}>
              {t('settings.language')}
            </p>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['zh', 'en'] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => changeLanguage(lng)}
                  className="px-2.5 py-1 transition-colors"
                  style={{
                    fontSize: '11.5px',
                    background: activeLang === lng ? 'var(--am-blue)' : 'transparent',
                    color: activeLang === lng ? '#fff' : 'var(--am-text-muted, #64748B)',
                  }}
                >
                  {t(lng === 'zh' ? 'settings.langZh' : 'settings.langEn')}
                </button>
              ))}
            </div>
          </div>

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

          {/* Show invalid candidates — bound to the same flag the source panel uses. */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium" style={{ fontSize: '12.5px' }}>
                {t('settings.showInvalid')}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                {t('settings.showInvalidDesc')}
              </p>
            </div>
            <button
              onClick={onShowInvalidToggle}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative`}
              style={{ background: showInvalid ? 'var(--am-blue)' : '#CBD5E1' }}
            >
              <span
                className="absolute top-0.5 transition-all rounded-full bg-white"
                style={{
                  width: 16,
                  height: 16,
                  left: showInvalid ? '18px' : '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          <hr className="border-border" />

          {/* Software update (T21): the auto-check switch plus a manual check.
              With a pending update the action becomes "view update". */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium" style={{ fontSize: '12.5px' }}>
                {t('settings.autoCheckUpdates')}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
                {t('settings.autoCheckUpdatesDesc')}
              </p>
            </div>
            <button
              onClick={onAutoCheckUpdatesToggle}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative`}
              style={{ background: autoCheckUpdates ? 'var(--am-blue)' : '#CBD5E1' }}
            >
              <span
                className="absolute top-0.5 transition-all rounded-full bg-white"
                style={{
                  width: 16,
                  height: 16,
                  left: autoCheckUpdates ? '18px' : '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
              {updateChecking
                ? t('settings.checkingUpdates')
                : updateVersion
                  ? t('settings.updateFound', { version: updateVersion })
                  : updateUpToDate
                    ? t('settings.upToDate')
                    : ''}
            </p>
            <button
              onClick={updateVersion ? onViewUpdate : onCheckUpdates}
              disabled={updateChecking}
              className="px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              style={{ fontSize: '11.5px' }}
            >
              {updateVersion ? t('settings.viewUpdate') : t('settings.checkUpdates')}
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

  const { projects, scanning, scanAndAdd, removeProject } = useProjectStore();
  const {
    comboItems,
    mergedItems,
    conflicts,
    addToCombo,
    addMergedItem,
    removeItem,
    removeMergedItem,
    moveItem,
    removeItemsByProject,
    renameItem,
    keepOne,
    refreshConflicts,
  } = useCompositionStore();
  const {
    targetPath,
    recentTargetPaths,
    plan,
    building,
    buildError,
    overwriteConfirmed,
    acknowledgedRiskIds,
    executing,
    executeError,
    report,
    setTargetPath,
    buildPlan,
    setOverwriteConfirmed,
    acknowledgeRisk,
    execute,
    resetPlan,
  } = useExportStore();
  const {
    view,
    selectedSkill,
    selectedProject,
    simpleMode,
    showInvalid,
    settingsOpen,
    leftCollapsed,
    setView,
    selectSkill,
    toggleSimpleMode,
    toggleShowInvalid,
    setSettingsOpen,
    toggleLeftCollapsed,
  } = useUiStore();
  const {
    availableVersion,
    notes: updateNotes,
    checking: updateChecking,
    upToDate: updateUpToDate,
    modalOpen: updateModalOpen,
    skippedVersion,
    autoCheckEnabled,
    installing: updateInstalling,
    progress: updateProgress,
    installError: updateInstallError,
    check: checkUpdate,
    startupCheck,
    openModal: openUpdateModal,
    deferUpdate,
    skipThisVersion,
    setAutoCheck,
    install: installUpdateNow,
    setProgress: setUpdateProgress,
  } = useUpdateStore();

  // The red badge shows for a non-skipped newer release (T21).
  const updateBadge = isBadgeVisible(availableVersion, skippedVersion);

  const {
    open: mergeOpen,
    sourceItemIds: mergeSourceIds,
    draft: mergeDraft,
    scriptsFromItemId,
    validation: mergeValidation,
    validating: mergeValidating,
    openWorkbench,
    closeWorkbench,
    setDraft: setMergeDraft,
    appendToDraft,
    setScriptsFrom,
    validate: validateMerge,
  } = useMergeStore();

  // True while a folder is dragged over the window (T26b drop-target highlight).
  const [dragging, setDragging] = useState(false);

  // Source columns for the workbench, resolved from the live combo items.
  const mergeSources = comboItems.filter((c) => mergeSourceIds.includes(c.id));

  // Names the draft must not collide with: everything in the composition
  // except the items being merged (they are replaced on confirm). Stable
  // identity (useCallback) so the workbench's debounced-validate effect does
  // not re-arm on validation state changes.
  const handleValidateMerge = useCallback(
    () =>
      void validateMerge([
        ...comboItems
          .filter((c) => !mergeSourceIds.includes(c.id))
          .map((c) => c.exportedName),
        ...mergedItems.map((m) => m.name),
      ]),
    [comboItems, mergedItems, mergeSourceIds, validateMerge],
  );

  // Confirm: the validated draft becomes a merged entry; its sources leave the
  // combo (restorable, T25) and the workbench closes.
  const handleConfirmMerge = () => {
    if (!mergeValidation?.canConfirm || !mergeValidation.parsedName) return;
    const scriptsItem = mergeSources.find((c) => c.id === scriptsFromItemId);
    addMergedItem(
      {
        name: mergeValidation.parsedName,
        draft: mergeDraft,
        scriptsFromDir: scriptsItem ? scriptsItem.skill.skillDirPath : null,
        sourceSkillNames: mergeSources.map((s) => s.exportedName),
      },
      mergeSourceIds,
    );
    closeWorkbench();
  };

  // Handler aliases so the JSX below reads naturally; store actions do the work.
  const handleNavigate = setView;
  const handleSelectSkill = selectSkill;
  const handleAddToCombo = addToCombo;
  const handleRemoveComboItem = removeItem;
  const handleMoveComboItem = moveItem;

  // Export target selection, Dry-run preview, and execution.
  const handlePickTarget = async () => {
    const dir = await pickDirectory();
    if (dir) setTargetPath(dir);
  };

  const exportItems = () => [
    ...comboItems.map((c) => ({
      assetId: c.skill.id,
      source: { type: 'directory' as const, dir: c.skill.skillDirPath },
      exportedName: c.exportedName,
      sourceRef: `${c.skill.sourceProjectId}:${c.skill.relativePathInProject}`,
    })),
    // Merged entries are content-backed: SKILL.md from the draft, scripts
    // optionally from the chosen source directory (T23/T24).
    ...mergedItems.map((m) => ({
      assetId: m.id,
      source: {
        type: 'content' as const,
        content: m.draft,
        scriptsFromDir: m.scriptsFromDir,
      },
      exportedName: m.name,
      sourceRef: `merged:${m.sourceSkillNames.join('+')}`,
    })),
  ];

  const handleBuildPlan = () => void buildPlan(exportItems());
  const handleExport = () => void execute(exportItems());

  const handleOpenBackup = () => {
    const archive = report?.backupArchive;
    if (!archive) return;
    void openPath(archive.slice(0, archive.lastIndexOf('/')));
  };

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

  // Health-report "re-run" re-scans every loaded project; health is recomputed
  // as part of each scan.
  const handleRescanAll = () => {
    for (const project of projects) void scanAndAdd(project.rootPath);
  };

  // Drag-drop entry, equivalent to the folder button. The webview API is only
  // available in the desktop runtime, so it is imported lazily and guarded.
  // enter/over highlight the source panel as a drop target; drop imports and
  // clears the highlight; leave clears it (T26b).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const un = await getCurrentWebview().onDragDropEvent((event) => {
          const kind = event.payload.type;
          if (kind === 'enter' || kind === 'over') {
            setDragging(true);
          } else if (kind === 'leave') {
            setDragging(false);
          } else if (kind === 'drop') {
            setDragging(false);
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

  // Launch-time update check (no-op while the auto-check switch is off) plus
  // the download-progress subscription for the modal's progress bar (T21).
  useEffect(() => {
    void startupCheck();
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void onUpdateDownloadProgress(setUpdateProgress).then((un) => {
      if (cancelled) un();
      else unlisten = un;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [startupCheck, setUpdateProgress]);

  // Whenever the selection changes, re-detect conflicts via the Rust composer
  // (the authoritative single source) and drop any now-stale Dry-run preview.
  useEffect(() => {
    void refreshConflicts();
    resetPlan();
  }, [comboItems, mergedItems, refreshConflicts, resetPlan]);

  const effectiveView = resolveView(projects.length, view);

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
        updateAvailable={updateBadge}
        onUpdateClick={openUpdateModal}
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
                dragging={dragging}
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
                  mergedItems={mergedItems}
                  conflicts={conflicts}
                  onRemoveItem={handleRemoveComboItem}
                  onMoveItem={handleMoveComboItem}
                  onRenameItem={renameItem}
                  onKeepOne={keepOne}
                  onOpenMerge={openWorkbench}
                  onRemoveMergedItem={removeMergedItem}
                  simpleMode={simpleMode}
                />
                <div className="flex-1" style={{ minHeight: 0 }}>
                  <ExportPanel
                    comboItems={comboItems}
                    mergedItems={mergedItems}
                    plan={plan}
                    targetPath={targetPath}
                    recentTargetPaths={recentTargetPaths}
                    sourceProjects={projects}
                    onSelectTarget={setTargetPath}
                    building={building}
                    buildError={buildError}
                    overwriteConfirmed={overwriteConfirmed}
                    acknowledgedRiskIds={acknowledgedRiskIds}
                    executing={executing}
                    executeError={executeError}
                    report={report}
                    onPickTarget={handlePickTarget}
                    onBuildPlan={handleBuildPlan}
                    onToggleOverwrite={setOverwriteConfirmed}
                    onAcknowledgeRisk={acknowledgeRisk}
                    onExport={handleExport}
                    onOpenBackup={handleOpenBackup}
                    simpleMode={simpleMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Check */}
        <div className={effectiveView === 'health-check' ? 'flex-1 overflow-hidden' : 'hidden'}>
          <HealthCheckPanel
            projects={projects}
            onNavigate={handleNavigate}
            onRescan={handleRescanAll}
            scanning={scanning}
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
        showInvalid={showInvalid}
        onShowInvalidToggle={toggleShowInvalid}
        autoCheckUpdates={autoCheckEnabled}
        onAutoCheckUpdatesToggle={() => setAutoCheck(!autoCheckEnabled)}
        updateChecking={updateChecking}
        updateUpToDate={updateUpToDate}
        updateVersion={updateBadge ? availableVersion : null}
        onCheckUpdates={() => void checkUpdate(true)}
        onViewUpdate={() => {
          setSettingsOpen(false);
          openUpdateModal();
        }}
      />

      {/* Merge workbench overlay (T24) */}
      <MergeWorkbench
        open={mergeOpen}
        sources={mergeSources}
        draft={mergeDraft}
        scriptsFromItemId={scriptsFromItemId}
        validation={mergeValidation}
        validating={mergeValidating}
        onDraftChange={setMergeDraft}
        onAppend={appendToDraft}
        onScriptsFrom={setScriptsFrom}
        onValidate={handleValidateMerge}
        onConfirm={handleConfirmMerge}
        onClose={closeWorkbench}
      />

      {/* Update prompt overlay (T21) */}
      <UpdateModal
        open={updateModalOpen}
        version={availableVersion}
        notes={updateNotes}
        installing={updateInstalling}
        progress={updateProgress}
        installError={updateInstallError}
        onInstall={() => void installUpdateNow()}
        onDefer={deferUpdate}
        onSkip={skipThisVersion}
      />
    </div>
  );
}
