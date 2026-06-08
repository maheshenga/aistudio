import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export function FullscreenViewer({ isOpen, onClose, mediaUrl, mediaType }: FullscreenViewerProps) {
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    if (!isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const zoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setScale(prev => Math.min(prev + 0.5, 5)); };
  const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setScale(prev => Math.max(prev - 0.5, 0.5)); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md selection:bg-transparent"
      >
        {/* Top Toolbar */}
        <div className="absolute top-[var(--spacing-lg)] right-6 flex items-center gap-3 z-50">
           <button onClick={zoomOut} className="p-2.5 bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 text-white rounded-[var(--radius-lg)] backdrop-blur-md transition-colors"><ZoomOut className="icon-md"/></button>
           <span className="text-white font-bold text-sm w-12 text-center select-none">{Math.round(scale * 100)}%</span>
           <button onClick={zoomIn} className="p-2.5 bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 text-white rounded-[var(--radius-lg)] backdrop-blur-md transition-colors"><ZoomIn className="icon-md"/></button>
           <div className="w-px h-6 bg-[var(--bg-panel)]/20 mx-3"></div>
           <button onClick={onClose} className="p-2.5 bg-rose-500/80 hover:bg-rose-500 text-white rounded-[var(--radius-lg)] backdrop-blur-md transition-colors"><X className="icon-md"/></button>
        </div>

        <div className="absolute top-[var(--spacing-lg)] left-6 z-50 flex items-center space-x-2 text-white/50 text-[12px] font-bold select-none cursor-default">
           <span>支持鼠标滚轮缩放与任意拖拽检查细节</span>
        </div>

        <div 
          className="w-full h-full overflow-hidden flex items-center justify-center"
          onWheel={(e) => {
            if (e.deltaY < 0) {
              setScale(prev => Math.min(prev + 0.1, 5));
            } else {
               setScale(prev => Math.max(prev - 0.1, 0.5));
            }
          }}
        >
          <motion.div
             drag
             dragMomentum={false}
             style={{ cursor: 'grab' }}
             whileDrag={{ cursor: 'grabbing' }}
             animate={{ scale }}
             transition={{ type: "spring", damping: 25, stiffness: 300 }}
             className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center touch-none"
             onClick={(e) => e.stopPropagation()}
          >
            {mediaType === 'image' ? (
               <img src={mediaUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain pointer-events-none rounded-[var(--radius-lg)] shadow-2xl" />
            ) : (
               <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-2xl bg-black">
                 <video src={mediaUrl} autoPlay loop controls className="w-full h-full object-contain max-h-[85vh] pointer-events-auto min-w-[600px]"></video>
               </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
