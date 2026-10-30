/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, BookOpen, Sparkles, X, Copy, Check, ExternalLink } from 'lucide-react';
import { WordDefinition } from '../types';

interface WordDefinitionModalProps {
  word: string;
  definition: WordDefinition | null;
  isLoading: boolean;
  onClose: () => void;
  targetLangName: string;
}

export const WordDefinitionModal: React.FC<WordDefinitionModalProps> = ({
  word,
  definition,
  isLoading,
  onClose,
  targetLangName,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  const speakWord = () => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const copyToClipboard = () => {
    if (!definition) return;
    const text = `${definition.word} (${definition.phoneticSpelling || ''}) - ${definition.meaningInEnglish}\nExample: ${definition.cinematicExample}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <span>Cinema Vocabulary & Language Tap</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono-num font-semibold">
                  AI Lexicon
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Contextual meaning, cultural tone & pronunciation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Consulting Gemini Film Lexicon for &ldquo;{word}&rdquo;...</span>
          </div>
        ) : definition ? (
          <div className="flex flex-col gap-4">
            {/* Word Main Card */}
            <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-black text-amber-300 tracking-wide">
                    {definition.word}
                  </span>
                  {definition.phoneticSpelling && (
                    <span className="text-sm text-slate-400 font-mono-num italic">
                      /{definition.phoneticSpelling}/
                    </span>
                  )}
                  {definition.grammarTag && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono-num">
                      {definition.grammarTag}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm font-semibold text-white">
                  {definition.meaningInEnglish}
                </div>

                {definition.meaningInTargetLang && definition.meaningInTargetLang !== definition.meaningInEnglish && (
                  <div className="text-xs text-amber-200/80 mt-0.5">
                    {targetLangName}: {definition.meaningInTargetLang}
                  </div>
                )}
              </div>

              {/* Pronounce & Copy Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={speakWord}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                    isSpeaking
                      ? 'bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Pronounce word with natural cadence"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
                  title="Copy definition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Contextual Usage in Cinema */}
            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex flex-col gap-1 text-xs">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono-num flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Cinematic Dramatic Intent</span>
              </span>
              <p className="text-slate-300 leading-relaxed">
                {definition.contextualUsage}
              </p>
            </div>

            {/* Authentic Dialogue Example */}
            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex flex-col gap-1 text-xs">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider font-mono-num">
                Authentic Dialogue Example
              </span>
              <p className="text-white font-semibold italic text-xs leading-relaxed">
                &ldquo;{definition.cinematicExample}&rdquo;
              </p>
            </div>

            {/* Synonyms / Related Keywords */}
            {definition.synonyms && definition.synonyms.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-mono-num text-[11px]">Synonyms:</span>
                {definition.synonyms.map((syn, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                    {syn}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No definition found for &ldquo;{word}&rdquo;.
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-300 transition-colors"
          >
            Resume Watching
          </button>
        </div>
      </div>
    </div>
  );
};
