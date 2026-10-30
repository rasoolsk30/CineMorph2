/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Download, Search, Play, Volume2, Sparkles, X, ChevronRight, FileText } from 'lucide-react';
import { DialogueLine, SupportedLanguage } from '../types';
import { downloadSrtFile } from '../utils/srtExporter';

interface TranscriptPanelProps {
  dialogues: DialogueLine[];
  activeDialogue: DialogueLine | null;
  currentTime: number;
  onSeekToLine: (dialogue: DialogueLine) => void;
  onWordTap: (word: string, dialogue: DialogueLine) => void;
  targetLang: SupportedLanguage;
  movieTitle: string;
  driftOffsetMs: number;
  isOpen: boolean;
  onClose: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  dialogues,
  activeDialogue,
  currentTime,
  onSeekToLine,
  onWordTap,
  targetLang,
  movieTitle,
  driftOffsetMs,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active line into view smoothly
  useEffect(() => {
    if (activeLineRef.current && isOpen) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeDialogue?.id, isOpen]);

  if (!isOpen) return null;

  const filteredDialogues = dialogues.filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      d.speaker.toLowerCase().includes(q) ||
      d.teluguColloquial.toLowerCase().includes(q) ||
      d.englishLiteral.toLowerCase().includes(q) ||
      d.originalText.toLowerCase().includes(q)
    );
  });

  const handleDownloadSrt = () => {
    downloadSrtFile(dialogues, movieTitle, targetLang, driftOffsetMs);
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 animate-fade-in">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <span>Interactive Dialogue Transcript</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono-num font-semibold">
                {dialogues.length} Lines
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Tap any line to jump scene timestamp · Tap words to define
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save SRT Button */}
          <button
            onClick={handleDownloadSrt}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5 shadow-sm"
            title="Download translated subtitles as .srt file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save .SRT</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Language View Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lines or characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shrink-0 ${
            showOriginal 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          {showOriginal ? 'Showing: Original' : 'Showing: Translated'}
        </button>
      </div>

      {/* Dialogue Lines Scroll List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 pt-1">
        {filteredDialogues.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No dialogue lines match your search query.
          </div>
        ) : (
          filteredDialogues.map((dialogue) => {
            const isActive = activeDialogue?.id === dialogue.id;
            const primaryText = showOriginal 
              ? dialogue.originalText 
              : (targetLang === 'en' ? dialogue.englishLiteral : dialogue.teluguColloquial);
            
            // Clean words for interactive word tap
            const words = primaryText.split(/\s+/);

            return (
              <div
                key={dialogue.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeekToLine(dialogue)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40 scale-[1.01]'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Line Meta Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isActive ? 'text-amber-300' : 'text-white'}`}>
                      {dialogue.speaker}
                    </span>
                    <span className="text-[10px] font-mono-num text-slate-400">
                      {Math.floor(dialogue.startTime / 60)}:{(Math.floor(dialogue.startTime % 60)).toString().padStart(2, '0')} → {Math.floor(dialogue.endTime / 60)}:{(Math.floor(dialogue.endTime % 60)).toString().padStart(2, '0')}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider animate-pulse">
                        PLAYING
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-num">
                    <span className="capitalize">{dialogue.emotion}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Primary Dialogue Words (Clickable for Word Tap) */}
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-100">
                  {words.map((word, wIdx) => {
                    const clean = word.replace(/[.,!?;:"'()]/g, '');
                    return (
                      <span
                        key={wIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (clean) onWordTap(clean, dialogue);
                        }}
                        className="hover:text-amber-300 hover:underline px-0.5 rounded hover:bg-amber-400/10 transition-colors inline-block"
                        title="Tap word for meaning & pronunciation"
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </p>

                {/* Transliteration / Subtitle translation preview */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 italic pt-0.5">
                  <span>&ldquo;{dialogue.teluguTransliteration}&rdquo;</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {dialogue.originalLang} → {targetLang.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
