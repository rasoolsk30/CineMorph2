import React from 'react';
import { 
  X, Volume2, Sun, Compass, BookOpen, Layers, 
  RotateCcw, Sparkles, Check, MousePointerClick 
} from 'lucide-react';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-xl w-full bg-slate-900/95 rounded-3xl border border-slate-700/80 p-6 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Cinema Gesture & Interaction Guide
              </h3>
              <p className="text-xs text-slate-400">
                Touch swipe, double-tap seek, and interactive subtitle gestures.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gestures Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* 1. Left Vertical Swipe */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Left Edge Vertical Swipe</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Swipe up or down on the left half of the player to adjust screen luminance & night boost.
              </p>
            </div>
          </div>

          {/* 2. Right Vertical Swipe */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Right Edge Vertical Swipe</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Swipe up or down on the right half of the player to dynamically tune cinema master volume.
              </p>
            </div>
          </div>

          {/* 3. Horizontal Scrub */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-400/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Horizontal Center Scrub</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Swipe left or right across the screen to swiftly scrub and seek scene timestamps.
              </p>
            </div>
          </div>

          {/* 4. Double Tap ±10s Seek */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Double Tap (±10s Seek)</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Double tap left side to rewind 10s; double tap right side to fast-forward 10s with ripple ripple.
              </p>
            </div>
          </div>

          {/* 5. Subtitle Word Tap */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">📖 Subtitle Word Tap</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Tap ANY word in active subtitles to pause and inspect contextual meaning, slang notes, and audio pronunciation.
              </p>
            </div>
          </div>

          {/* 6. Transcript Jumping */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-400/10 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block">📜 Interactive Transcript</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Open the Transcript panel to jump directly to any dialogue line and follow highlighted real-time text.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
            <span>Works seamlessly on mobile touchscreens & desktop mouse drags.</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Got It</span>
          </button>
        </div>
      </div>
    </div>
  );
};
