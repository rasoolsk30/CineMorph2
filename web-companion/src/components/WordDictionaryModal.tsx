import React, { useState } from 'react';
import { 
  X, Volume2, Sparkles, BookOpen, Quote, 
  Tag, ArrowRight, CheckCircle2, Bookmark 
} from 'lucide-react';
import { WordDefinition } from '../types';

interface WordDictionaryModalProps {
  definition: WordDefinition | null;
  isLoading: boolean;
  onClose: () => void;
  targetLangName?: string;
}

export const WordDictionaryModal: React.FC<WordDictionaryModalProps> = ({
  definition,
  isLoading,
  onClose,
  targetLangName = 'Telugu',
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!definition && !isLoading) return null;

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.0;
      utterance.rate = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.includes('te') || v.lang.includes('IN') || v.lang.includes('en'));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full bg-slate-900 rounded-3xl border border-slate-700/80 p-6 shadow-2xl flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Cinema Lexicon & Word Tap
              </h3>
              <span className="text-[10px] text-slate-400 font-mono-num">
                Contextual Film Vocabulary Learning
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">
              Consulting Gemini Film Lexicon for cinema nuance...
            </p>
          </div>
        ) : definition ? (
          <div className="flex flex-col gap-3.5">
            {/* Word & Pronunciation Card */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-amber-300">
                    {definition.word}
                  </h2>
                  {definition.grammarTag && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      {definition.grammarTag}
                    </span>
                  )}
                </div>
                {definition.phoneticSpelling && (
                  <p className="text-xs text-slate-400 italic mt-0.5">
                    /{definition.phoneticSpelling}/
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSpeak(definition.word)}
                  disabled={isPlayingAudio}
                  className="p-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors flex items-center gap-1 font-bold shadow-md"
                  title="Listen to pronunciation"
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                  <span className="text-xs">Pronounce</span>
                </button>
              </div>
            </div>

            {/* Meanings */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  English Meaning:
                </span>
                <p className="text-slate-100 font-medium leading-relaxed">
                  {definition.meaningInEnglish}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  {targetLangName} Contextual Definition:
                </span>
                <p className="text-amber-200 font-semibold leading-relaxed">
                  {definition.meaningInTargetLang}
                </p>
              </div>
            </div>

            {/* Cinematic Nuance / Why this word */}
            <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cinematic Emotion & Subtext:</span>
              </span>
              <p className="text-slate-200 leading-relaxed">
                {definition.contextualUsage}
              </p>
            </div>

            {/* Movie Example */}
            {definition.cinematicExample && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Cinematic Usage Example:
                </span>
                <p className="text-slate-300 italic flex items-start gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>"{definition.cinematicExample}"</span>
                </p>
              </div>
            )}

            {/* Synonyms */}
            {definition.synonyms && definition.synonyms.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Synonyms:</span>
                {definition.synonyms.map((syn, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isSaved
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved to Vocabulary' : 'Save Word'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Resume Movie
          </button>
        </div>
      </div>
    </div>
  );
};
