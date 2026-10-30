/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Volume2, RotateCcw, RotateCw, MoveHorizontal, Play, X, Check } from 'lucide-react';

interface GestureGuideOverlayProps {
  isOpen: boolean;
  onDismiss: () => void;
  onDisableAutoShow?: () => void;
}

export const GestureGuideOverlay: React.FC<GestureGuideOverlayProps> = ({
  isOpen,
  onDismiss,
  onDisableAutoShow,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-6 select-none animate-fade-in pointer-events-auto"
      onClick={onDismiss}
    >
      {/* Top Banner */}
      <div 
        className="w-full flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h4 className="text-sm font-bold text-white tracking-wide uppercase font-mono-num">
            Gesture & Swipe Controls Guide
          </h4>
        </div>
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Diagram Zone */}
      <div 
        className="w-full max-w-2xl grid grid-cols-2 gap-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Brightness & -10s Seek */}
        <div className="flex flex-col items-center text-center p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80 gap-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Left Side of Screen</div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              • <strong>Swipe Up/Down:</strong> Screen Brightness<br />
              • <strong>Double-Tap:</strong> Rewind -10s
            </p>
          </div>
          <div className="text-[10px] text-amber-400 font-mono-num px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
            ↕ 30% — 180% Brightness
          </div>
        </div>

        {/* Right Side: Volume & +10s Seek */}
        <div className="flex flex-col items-center text-center p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80 gap-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <RotateCw className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Right Side of Screen</div>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              • <strong>Swipe Up/Down:</strong> Audio Volume<br />
              • <strong>Double-Tap:</strong> Skip +10s
            </p>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono-num px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20">
            ↕ 0% — 100% Volume
          </div>
        </div>

        {/* Center / Horizontal Swipe: Timeline Scrub */}
        <div className="col-span-2 flex items-center justify-between p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-lg bg-indigo-400/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <MoveHorizontal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Horizontal Scrubbing: </span>
              <span className="text-slate-300 text-[11px]">Swipe left or right across center to seek timeline</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[11px] text-slate-300 font-medium">Single Tap: Play/Pause</span>
          </div>
        </div>
      </div>

      {/* Bottom Dismiss Bar */}
      <div 
        className="w-full flex items-center justify-between pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (onDisableAutoShow) onDisableAutoShow();
            onDismiss();
          }}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors underline"
        >
          Don&apos;t show automatically
        </button>

        <button
          onClick={onDismiss}
          className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-lg"
        >
          Got It! Start Watching
        </button>
      </div>
    </div>
  );
};
