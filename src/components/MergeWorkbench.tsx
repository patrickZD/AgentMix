import { useState } from 'react';
import {
  MergeIcon,
  PlusIcon,
  SparklesIcon,
  CopyIcon,
  Trash2Icon,
  ArrowLeftIcon,
  GripVerticalIcon,
} from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import IconButton from '@/components/ui/IconButton';
import { displayLabel } from '@/lib/skillView';
import type { Skill, MergeBlock, AppView } from '../types';

interface MergeWorkbenchProps {
  skillA?: Skill | null;
  skillB?: Skill | null;
  onNavigate?: (view: AppView) => void;
  simpleMode?: boolean;
}

let blockIdCounter = 0;
function mkId() {
  return `block-${++blockIdCounter}`;
}

function splitToParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function MergeWorkbench({
  skillA = null,
  skillB = null,
  onNavigate = () => {},
  simpleMode = false,
}: MergeWorkbenchProps) {
  const [draftBlocks, setDraftBlocks] = useState<MergeBlock[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const addBlockToDraft = (source: 'A' | 'B', text: string) => {
    const block: MergeBlock = { id: mkId(), source, text };
    setDraftBlocks((prev) => [...prev, block]);
  };

  const removeDraftBlock = (id: string) => {
    setDraftBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const copyDraft = () => {
    const text = draftBlocks.map((b) => b.text).join('\n\n');
    navigator.clipboard.writeText(text).catch(console.error);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    // Simulated AI draft
    await new Promise((r) => setTimeout(r, 1200));
    const aiBlock: MergeBlock = {
      id: mkId(),
      source: 'draft',
      text: `[AI Draft]\n${aiPrompt}\n\n(AI-generated content would appear here based on your prompt and the two skills above.)`,
    };
    setDraftBlocks((prev) => [...prev, aiBlock]);
    setAiPrompt('');
    setAiLoading(false);
  };

  const paragraphsA = skillA ? splitToParagraphs(skillA.skillMdContent) : [];
  const paragraphsB = skillB ? splitToParagraphs(skillB.skillMdContent) : [];

  const skillALabel = skillA ? (simpleMode ? displayLabel(skillA.name) : skillA.name) : undefined;
  const skillBLabel = skillB ? (simpleMode ? displayLabel(skillB.name) : skillB.name) : undefined;

  return (
    <div
      data-cmp="MergeWorkbench"
      className="flex flex-col h-full bg-card"
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 border-b border-border flex-shrink-0"
        style={{ height: 'var(--am-toolbar-h)', background: 'var(--am-panel-bg)' }}
      >
        <Tooltip title="Back to Workspace">
          <IconButton onClick={() => onNavigate('main')} className="h-[26px] w-[26px]">
            <ArrowLeftIcon size={13} />
          </IconButton>
        </Tooltip>
        <MergeIcon size={13} className="text-muted-foreground" />
        <span className="font-semibold text-foreground" style={{ fontSize: '12px' }}>
          Merge Workbench
        </span>
        <span className="text-muted-foreground" style={{ fontSize: '11px' }}>
          {skillA && skillB
            ? `${skillALabel} + ${skillBLabel}`
            : skillA
            ? skillALabel
            : `Select two skills to merge`}
        </span>

        <div className="flex-1" />

        <Tooltip title="Copy Draft">
          <span>
            <IconButton
              onClick={copyDraft}
              disabled={draftBlocks.length === 0}
              className="h-[26px] w-[26px]"
            >
              <CopyIcon size={12} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Clear Draft">
          <span>
            <IconButton
              onClick={() => setDraftBlocks([])}
              disabled={draftBlocks.length === 0}
              className="h-[26px] w-[26px]"
            >
              <Trash2Icon size={12} />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {/* 3-column area */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Skill A */}
        <div
          className="flex flex-col border-r border-border overflow-hidden"
          style={{ flex: 1, minWidth: 0 }}
        >
          <div
            className="flex items-center gap-1.5 px-3 border-b border-border flex-shrink-0"
            style={{ height: 34, background: 'var(--am-panel-bg)' }}
          >
            <span
              className="rounded px-1.5 font-bold text-white"
              style={{ background: 'var(--am-blue)', fontSize: '10px' }}
            >
              A
            </span>
            <span className="text-foreground font-medium truncate" style={{ fontSize: '11.5px' }}>
              {skillALabel || `Skill A`}
            </span>
            {skillA && (
              <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                · {paragraphsA.length}p
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
            {!skillA && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MergeIcon size={28} className="opacity-30" />
                <p style={{ fontSize: '12px' }}>No skill selected</p>
              </div>
            )}
            {paragraphsA.map((para, i) => (
              <div key={i} className="group relative">
                <div className="am-code-block" style={{ paddingRight: 30 }}>
                  {para}
                </div>
                <Tooltip title="Append to Draft" placement="right">
                  <button
                    onClick={() => addBlockToDraft('A', para)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                    style={{
                      width: 22,
                      height: 22,
                      background: 'var(--am-blue-bg)',
                      color: 'var(--am-blue)',
                    }}
                  >
                    <PlusIcon size={11} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* Skill B */}
        <div
          className="flex flex-col border-r border-border overflow-hidden"
          style={{ flex: 1, minWidth: 0 }}
        >
          <div
            className="flex items-center gap-1.5 px-3 border-b border-border flex-shrink-0"
            style={{ height: 34, background: 'var(--am-panel-bg)' }}
          >
            <span
              className="rounded px-1.5 font-bold text-white"
              style={{ background: 'var(--am-green)', fontSize: '10px' }}
            >
              B
            </span>
            <span className="text-foreground font-medium truncate" style={{ fontSize: '11.5px' }}>
              {skillBLabel || `Skill B`}
            </span>
            {skillB && (
              <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                · {paragraphsB.length}p
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
            {!skillB && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MergeIcon size={28} className="opacity-30" />
                <p style={{ fontSize: '12px' }}>No skill selected</p>
              </div>
            )}
            {paragraphsB.map((para, i) => (
              <div key={i} className="group relative">
                <div className="am-code-block" style={{ paddingRight: 30 }}>
                  {para}
                </div>
                <Tooltip title="Append to Draft" placement="right">
                  <button
                    onClick={() => addBlockToDraft('B', para)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                    style={{
                      width: 22,
                      height: 22,
                      background: 'var(--am-green-bg)',
                      color: 'var(--am-green)',
                    }}
                  >
                    <PlusIcon size={11} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* Draft column */}
        <div className="flex flex-col overflow-hidden" style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex items-center gap-1.5 px-3 border-b border-border flex-shrink-0"
            style={{ height: 34, background: 'var(--am-panel-bg)' }}
          >
            <span
              className="rounded px-1.5 font-bold"
              style={{ background: '#F1F5F9', color: '#64748B', fontSize: '10px' }}
            >
              DRAFT
            </span>
            <span className="text-foreground font-medium" style={{ fontSize: '11.5px' }}>
              Merged Output
            </span>
            {draftBlocks.length > 0 && (
              <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                · {draftBlocks.length} blocks
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
            {draftBlocks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <GripVerticalIcon size={28} className="opacity-30" />
                <p style={{ fontSize: '12px' }}>
                  {simpleMode
                    ? `Click + on any paragraph to add it here`
                    : `Append paragraphs from Skill A or B`}
                </p>
              </div>
            )}
            {draftBlocks.map((block, i) => (
              <div key={block.id} className="group relative">
                <div
                  className="am-code-block"
                  style={{
                    paddingRight: 30,
                    borderLeft: `3px solid ${
                      block.source === 'A'
                        ? 'var(--am-blue)'
                        : block.source === 'B'
                        ? 'var(--am-green)'
                        : '#94A3B8'
                    }`,
                  }}
                >
                  <span
                    className="inline-block rounded px-1 mr-1"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      background:
                        block.source === 'A'
                          ? 'var(--am-blue-bg)'
                          : block.source === 'B'
                          ? 'var(--am-green-bg)'
                          : '#F1F5F9',
                      color:
                        block.source === 'A'
                          ? 'var(--am-blue)'
                          : block.source === 'B'
                          ? 'var(--am-green)'
                          : '#64748B',
                    }}
                  >
                    {block.source === 'draft' ? 'AI' : block.source}
                  </span>
                  {block.text}
                </div>
                <button
                  onClick={() => removeDraftBlock(block.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded"
                  style={{
                    width: 22,
                    height: 22,
                    background: 'var(--am-red-bg)',
                    color: 'var(--am-red)',
                  }}
                >
                  <Trash2Icon size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* AI generation input */}
          <div className="border-t border-border p-2 flex-shrink-0">
            <div
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary overflow-hidden"
              style={{ padding: '4px 8px' }}
            >
              <SparklesIcon size={12} className="text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={simpleMode ? `Ask AI to help merge…` : `AI draft prompt (e.g. "Combine both skills, prefer A's structure")`}
                className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
                style={{ fontSize: '11.5px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              />
              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiLoading}
                className="flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors"
                style={{
                  fontSize: '11px',
                  background: 'var(--am-blue)',
                  color: '#fff',
                  opacity: !aiPrompt.trim() || aiLoading ? 0.5 : 1,
                }}
              >
                {aiLoading ? `...` : <><SparklesIcon size={10} /> Draft</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
