import React, { useState, useEffect } from 'react';
import { Ticket, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FloatingPassBadgeProps {
  onOpenTourModal: () => void;
}

export default function FloatingPassBadge({
  onOpenTourModal,
}: FloatingPassBadgeProps): React.JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past the hero (>= 320px)
      if (window.scrollY > 320 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-40 max-w-sm select-none"
        >
          <motion.div
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenTourModal}
            className="group relative flex items-center gap-3 bg-zinc-900/95 hover:bg-zinc-850 border border-amber-400/40 hover:border-amber-400 p-2.5 pr-4 pl-3 rounded-2xl shadow-2xl shadow-amber-400/15 backdrop-blur-xl cursor-pointer transition-all duration-200"
          >
            {/* Animated pulsing amber aura */}
            <div
              className="absolute -inset-0.5 rounded-2xl bg-amber-400/20 blur-md pointer-events-none group-hover:bg-amber-400/30 transition-colors"
              aria-hidden="true"
            />

            {/* Icon Box */}
            <div className="relative w-11 h-11 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30 group-hover:rotate-6 transition-transform">
              <Ticket className="w-5 h-5" />
            </div>

            {/* Copy */}
            <div className="relative flex flex-col min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  100% GRATIS
                </span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-white font-extrabold text-xs sm:text-sm tracking-tight leading-snug mt-0.5">
                Pase de Cortesía
              </span>
              <span className="text-[11px] text-zinc-400 font-sans leading-none mt-0.5">
                Entrena 1 día sin costo
              </span>
            </div>

            {/* Close / Dismiss button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Cerrar notificación de pase de cortesía"
              className="relative ml-1 p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
