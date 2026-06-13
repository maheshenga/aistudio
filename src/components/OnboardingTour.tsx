import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Map, SplitSquareHorizontal, Bot, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to AI Studio',
    desc: 'Your ultimate workspace for generative workflows, data analysis, and creative ideation. Let\'s get you up to speed.',
    icon: Sparkles
  },
  {
    id: 'split',
    title: 'Split Screen Layout',
    desc: 'You can open any module in a secondary pane. Focus on task details while keeping your main dashboard visible.',
    icon: SplitSquareHorizontal
  },
  {
    id: 'agent',
    title: 'Global Agent Dispatcher',
    desc: 'Press ⌘K at any time to assign sub-tasks, delegate coding, or fetch live data across all active modules.',
    icon: Bot
  },
  {
    id: 'finish',
    title: 'Ready to Create',
    desc: 'Pin your favorite modules, tweak the visual theme, and dive directly into your next breakthrough.',
    icon: Map
  }
];

export function OnboardingTour() {
  const session = useSaasSession();
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeen = getSetting<boolean>('has_seen_tour', false, settingsContext);
    if (!hasSeen) {
      setTimeout(() => setIsOpen(true), 1500); // Delayed start
    }
  }, [settingsContext]);

  const handleClose = () => {
    setIsOpen(false);
    saveSetting('has_seen_tour', true, settingsContext);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl border border-[var(--border-color)] w-full max-w-sm overflow-hidden"
      >
        <div className="p-[var(--spacing-xl)] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-inner relative">
             <StepIcon className="w-8 h-8" />
             {currentStep === 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] mb-3">{steps[currentStep].title}</h2>
          <p className="text-[14px] text-[var(--text-muted)] font-medium leading-relaxed min-h-[60px]">
            {steps[currentStep].desc}
          </p>
        </div>

        <div className="px-[var(--spacing-xl)] py-4 bg-[var(--bg-hover)] border-t border-[var(--border-color)] flex items-center justify-between">
           <div className="flex gap-1.5">
             {steps.map((_, i) => (
               <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-blue-500' : 'w-1.5 bg-gray-300'}`}></div>
             ))}
           </div>
           <div className="flex gap-2">
             {currentStep > 0 && (
                <button onClick={prevStep} className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors">
                   <ChevronLeft className="w-4 h-4" />
                </button>
             )}
             <button onClick={nextStep} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-[var(--radius-lg)] shadow-sm flex items-center transition-colors">
                {currentStep === steps.length - 1 ? (
                   <>Done <Check className="w-4 h-4 ml-1.5" /></>
                ) : (
                   <>Next <ChevronRight className="w-4 h-4 ml-1.5" /></>
                )}
             </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
