import {
  LayersIcon,
  FolderPlusIcon,
  GlobeIcon,
  Wand2Icon,
  BookOpenIcon,
  GithubIcon,
  ZapIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppView } from '../types';

interface WelcomeScreenProps {
  onAddProject?: () => void;
  onNavigate?: (view: AppView) => void;
  simpleMode?: boolean;
}

const features = [
  { icon: `🧩`, titleKey: `welcome.featureMixTitle`, descKey: `welcome.featureMixDesc` },
  { icon: `⚡`, titleKey: `welcome.featureExportTitle`, descKey: `welcome.featureExportDesc` },
  { icon: `🔀`, titleKey: `welcome.featureMergeTitle`, descKey: `welcome.featureMergeDesc` },
  { icon: `❤️`, titleKey: `welcome.featureHealthTitle`, descKey: `welcome.featureHealthDesc` },
];

// The two non-folder entry points from the design (DESIGN.md §7): both are
// deferred to v0.2, shown disabled so the entry exists but cannot be used yet.
const deferredEntries = [
  { icon: GlobeIcon, labelKey: `welcome.importGitUrl` },
  { icon: Wand2Icon, labelKey: `welcome.newSkill` },
];

export default function WelcomeScreen({
  onAddProject = () => {},
  onNavigate = () => {},
  simpleMode = false,
}: WelcomeScreenProps) {
  const { t } = useTranslation();
  return (
    <div
      data-cmp="WelcomeScreen"
      className="flex flex-col items-center justify-center h-full w-full bg-background"
      style={{ minHeight: '100vh' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-lg w-full px-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 56,
              height: 56,
              background: 'var(--am-blue-bg)',
            }}
          >
            <LayersIcon size={28} style={{ color: 'var(--am-blue)' }} />
          </div>
          <div className="text-center">
            <h1
              className="font-bold text-foreground"
              style={{ fontSize: '24px', letterSpacing: '-0.025em' }}
            >
              {t('common.appName')}
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: '13px', marginTop: 4 }}>
              {t(simpleMode ? 'welcome.subtitleSimple' : 'welcome.subtitleFull')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={onAddProject}
            className="flex items-center justify-center gap-2 w-full rounded-lg font-semibold transition-all hover:opacity-90 active:scale-99"
            style={{
              background: 'var(--am-blue)',
              color: '#fff',
              padding: '10px 20px',
              fontSize: '13.5px',
            }}
          >
            <FolderPlusIcon size={16} />
            {t(simpleMode ? 'welcome.ctaSimple' : 'welcome.ctaFull')}
          </button>

          <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
            {t(simpleMode ? 'welcome.hintSimple' : 'welcome.hintFull')}
          </p>

          {/* Deferred entry points (v0.2) — disabled, present for discoverability. */}
          <div className="flex gap-2 w-full">
            {deferredEntries.map((e) => (
              <div
                key={e.labelKey}
                aria-disabled
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted opacity-60 cursor-not-allowed"
                style={{ padding: '8px 12px' }}
              >
                <e.icon size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground" style={{ fontSize: '12px' }}>
                  {t(e.labelKey)}
                </span>
                <span
                  className="rounded px-1 text-muted-foreground bg-secondary"
                  style={{ fontSize: '9px', fontWeight: 600 }}
                >
                  {t('welcome.deferred')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="w-full flex flex-wrap gap-2">
          {features.map((f) => (
            <div
              key={f.titleKey}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3"
              style={{ width: 'calc(50% - 4px)' }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{f.icon}</span>
              <div>
                <p className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
                  {t(f.titleKey)}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '11px', marginTop: 2 }}>
                  {t(f.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="flex items-center gap-4 text-muted-foreground" style={{ fontSize: '11px' }}>
          <a
            href="#"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <BookOpenIcon size={11} />
            {t('welcome.docs')}
          </a>
          <span>·</span>
          <a
            href="#"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <GithubIcon size={11} />
            {t('welcome.github')}
          </a>
          <span>·</span>
          <a
            href="#"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <ZapIcon size={11} />
            v0.1.0
          </a>
        </div>
      </div>
    </div>
  );
}
