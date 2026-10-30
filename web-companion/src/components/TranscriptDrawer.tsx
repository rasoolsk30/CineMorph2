import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Play, Download, Sparkles, Clock, 
  Layers, Volume2, CheckCircle2 
} from 'lucide-react';
import { DialogueLine } from '../types';

interface TranscriptDrawerProps {
  dialogues: DialogueLine[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
  isOpen: boolean;
  onClose: () => void;
  targetLangName: string;
  movieTitle: string;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  dialogues,
  currentTime,
  onSeek,
  isOpen,
  onClose,
  targetLangName,
  movieTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active dialogue line into view
  useEffect(() => {
    if (activeLineRef.current && isOpen) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime, isOpen]);

  if (!isOpen) return null;

  // Filter dialogues
  const filtered = dialogues.filter(
    (d) =>
      d.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.teluguColloquial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.teluguTransliteration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.englishLiteral.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format seconds to mm:ss
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Convert dialogue lines to standard SRT format and trigger download
  const handleExportSRT = () => {
    const formatSrtTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    let srtContent = '';
    dialogues.forEach((line, index) => {
      const start = formatSrtTime(line.startTime);
      const end = formatSrtTime(line.endTime);
      srtContent += `${index + 1}\n`;
      srtContent += `${start} --> ${end}\n`;
      srtContent += `[${line.speaker}] ${line.teluguColloquial}\n`;
      srtContent += `(${line.englishLiteral})\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${movieTitle.replace(/\s+/g, '_')}_${targetLangName.toLowerCase()}_subtitles.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">
              Interactive Scene Transcript
            </h3>
            <p className="text-[11px] text-slate-400">
              Tap any line to jump scene · Real-time sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save / Export SRT Button */}
          <button
            onClick={handleExportSRT}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download full subtitles as standard .SRT file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save SRT</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dialogue, speaker, or translation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Dialogue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No dialogue lines match your search.
          </div>
        ) : (
          filtered.map((line) => {
            const isActive = currentTime >= line.startTime && currentTime <= line.endTime;

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.startTime)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-400 shadow-md scale-[1.01]'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
                      {line.speaker}
                    </span>
                    <span className="text-slate-500 text-[10px]">({line.originalLang})</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono-num">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(line.startTime);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatSeconds(line.startTime)}</span>
                    </button>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Localized Dialogue */}
                <p className={`text-xs font-bold leading-relaxed ${isActive ? 'text-amber-200' : 'text-white'}`}>
                  {line.teluguColloquial}
                </p>

                {/* Tanglish Transliteration */}
                <p className="text-[11px] text-slate-400 italic">
                  "{line.teluguTransliteration}"
                </p>

                {/* Original & Literal Meaning */}
                <div className="mt-1 pt-1.5 border-t border-slate-900/80 flex flex-col gap-0.5 text-[10px] text-slate-500">
                  <div>
                    <span className="text-slate-400">Original: </span>
                    <span className="text-slate-300">{line.originalText}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Literal: </span>
                    <span className="text-slate-400">{line.englishLiteral}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
        <span>{dialogues.length} Total Dialogue Lines</span>
        <button
          onClick={handleExportSRT}
          className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Download className="w-3 h-3" />
          <span>Export Subtitles (.SRT)</span>
        </button>
      </div>
    </div>
  );
};
