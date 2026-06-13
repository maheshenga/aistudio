import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowUp, X, Command } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

function buildQuickPromptReply(prompt: string): string {
  return `[Gemini 3.1 Flash]\nResponse for: "${prompt}"\nTask completed and context analyzed.`;
}

export function QuickPromptFAB() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const dispatchActivityLogged = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('activity_logged'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isSubmitting) return;

    setIsSubmitting(true);
    let jobId: string | null = null;
    try {
      const responseText = buildQuickPromptReply(prompt);
      const job = createGenerationJob({
        title: 'Quick Prompt - Gemini Flash',
        prompt,
        status: 'running',
        providerKind: 'mock',
        runtimeMode: 'web',
        moduleId: 'dashboard',
        agentId: 'quick-prompt-agent',
        progress: 30,
        metadata: {
          surface: 'quick_prompt_fab',
        },
      }, repositoryContext);
      jobId = job.id;
      logAuditEvent({
        action: 'ai_command',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          description: `Quick prompt: ${prompt}`,
          surface: 'quick_prompt_fab',
        },
      }, { session });
      logAuditEvent({
        action: 'generation_job_start',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          agentId: 'quick-prompt-agent',
          surface: 'quick_prompt_fab',
        },
      }, { session });
      updateGenerationJob(job.id, {
        status: 'succeeded',
        progress: 100,
        metadata: {
          ...job.metadata,
          result: 'quick_prompt_text_asset',
        },
      }, repositoryContext);
      const asset = createWorkspaceAsset({
        name: `quick-prompt-${Date.now()}.md`,
        type: 'text',
        size: `${responseText.length} chars`,
        source: 'generated',
        moduleId: 'dashboard',
        generationJobId: job.id,
        tags: ['quick-prompt', 'gemini-flash'],
        metadata: {
          prompt,
          responsePreview: responseText.slice(0, 160),
          surface: 'quick_prompt_fab',
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_complete',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          assetId: asset.id,
          assetType: 'text',
          surface: 'quick_prompt_fab',
        },
      }, { session });
      logAuditEvent({
        action: 'asset_create',
        moduleId: 'dashboard',
        targetType: 'asset',
        targetId: asset.id,
        metadata: {
          generationJobId: job.id,
          assetType: 'text',
          source: 'generated',
          surface: 'quick_prompt_fab',
        },
      }, { session });
      dispatchActivityLogged();
      toast(responseText);
      setInput('');
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Quick prompt failed';
      if (jobId) {
        updateGenerationJob(jobId, { status: 'failed', progress: 100, error: message }, repositoryContext);
        logAuditEvent({
          action: 'generation_job_failed',
          moduleId: 'dashboard',
          targetType: 'generation_job',
          targetId: jobId,
          metadata: {
            agentId: 'quick-prompt-agent',
            error: message,
          },
        }, { session });
        dispatchActivityLogged();
      }
      toast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.form 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onSubmit={handleSubmit}
            className="mb-4 bg-[var(--bg-panel)]/95 backdrop-blur-xl p-3 border border-[var(--border-color)]/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[24px] flex items-center gap-3 pointer-events-auto"
            
          >
            <div className="w-10 h-10 rounded-[16px] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center flex-shrink-0 border border-indigo-100">
               <Sparkles className="icon-md text-indigo-500 flex-shrink-0" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Gemini Flash..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-[var(--text-main)] placeholder:text-gray-400 min-w-0"
              disabled={isSubmitting}
            />
            {isSubmitting ? (
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <div className="icon-sm border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <button 
                type="submit" 
                className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                disabled={!input.trim()}
              >
                <ArrowUp className="icon-sm text-white" />
              </button>
            )}
            <button
               type="button"
               onClick={() => setIsOpen(false)}
               className="absolute -top-3 -right-3 icon-xl bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50"
            >
               <X className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-gray-900 border border-gray-700 shadow-2xl rounded-full flex items-center justify-center text-white pointer-events-auto group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isOpen ? <X className="icon-lg relative z-10" /> : <Command className="icon-lg relative z-10" />}
      </motion.button>
    </div>
  );
}
