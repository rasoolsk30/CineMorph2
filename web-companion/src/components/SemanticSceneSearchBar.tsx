import React, { useState } from 'react';
import { Search, Sparkles, Clock, User, X, ChevronRight, Zap } from 'lucide-react';
import { MovieScene } from '../types';

interface SemanticSceneSearchBarProps {
  currentMovie: MovieScene;
  currentTime: number;
  onJumpToTime: (seconds: number) => void;
  enabled?: boolean;
}

interface SearchMatchData {
  matchedSceneIndex: number;
  timestamp: number;
  formattedTimestamp: string;
  sceneTitle: string;
  matchType?: string;
  characterIntroductions?: string[];
  relevanceScore: number;
  matchExplanation: string;
  keyDialogue?: string;
}

export const SemanticSceneSearchBar: React.FC<SemanticSceneSearchBarProps> = ({
  currentMovie,
  currentTime,
  onJumpToTime,
  enabled = true,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchMatchData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search only the dialogue timeline actually supplied to this component.
  // Local files are disabled until their own subtitle track has been loaded.
  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q || !enabled) return;
    const cues = currentMovie.dialogues.map(line => ({
      startMs: Math.max(0, Math.round(line.startTime * 1000)),
      text: [line.speaker, line.originalText, line.englishLiteral, line.teluguColloquial].filter(Boolean).join(' — ').slice(0, 500),
    })).filter(cue => cue.text.trim());
    if (!cues.length) { setSearchResult(null); setErrorMessage('ఈ సినిమాకు ఉపయోగించగల subtitle/dialogue timeline లేదు.'); setIsOpen(true); return; }
    setIsSearching(true); setErrorMessage(null); setSearchResult(null); setIsOpen(true);
    try {
      const res = await fetch('/api/ai/search-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, movieTitle: currentMovie.titleEnglish, cues }) });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || 'No matching subtitle cue was found.');
      const match = json.data;
      const seconds = Number(match.startMs) / 1000;
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Backend returned an invalid timestamp.');
      const matchedLine = currentMovie.dialogues.find(line => Math.round(line.startTime * 1000) === Number(match.startMs));
      setSearchResult({ matchedSceneIndex: -1, timestamp: seconds, formattedTimestamp: new Date(seconds * 1000).toISOString().slice(14, 19), sceneTitle: matchedLine ? matchedLine.speaker : 'Subtitle match', matchType: match.method || 'subtitle-match', characterIntroductions: matchedLine?.speaker ? [matchedLine.speaker] : [], relevanceScore: Math.round(Math.max(0, Math.min(1, Number(match.confidence) || 0)) * 100), matchExplanation: match.reason || 'Matched against the supplied subtitle timeline.', keyDialogue: match.matchedText || '' });
    } catch (err: any) { setErrorMessage(err?.message || 'Scene search failed. No result was generated.'); }
    finally { setIsSearching(false); }
  };
  const handleJump = (seconds: number) => {
    onJumpToTime(seconds);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Search Input Bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="relative flex items-center w-full"
      >
        <div className="absolute left-3.5 flex items-center pointer-events-none text-amber-400">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={enabled ? 'Search within available movie subtitles...' : 'Load this local movie’s subtitle file to enable scene search'}
          className="w-full pl-10 pr-24 py-2 bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-950 border border-slate-700/80 focus:border-amber-400/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 shadow-inner focus:outline-none transition-all font-sans"
        />
        <div className="absolute right-2 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSearchResult(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={!enabled || isSearching || !query.trim()}
            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all"
          >
            {isSearching ? (
              <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {!enabled && (
        <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
          Local movie కోసం ముందుగా దాని స్వంత subtitle file load చేయాలి. Sample movie dialogue ను local movie analysis గా ఉపయోగించము.
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">{errorMessage}</p>
      )}
      {/* Search Result Card Dropdown */}
      {isOpen && (searchResult || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl shadow-2xl p-4 animate-scale-in">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold font-mono-num uppercase">
                Gemini Semantic Timeline Match
              </span>
              {searchResult && (
                <span className="text-[11px] font-bold text-emerald-400 font-mono-num">
                  {searchResult.relevanceScore}% Match
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSearching ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono-num animate-pulse">
                Analyzing scene semantics, character introductions & emotional beats...
              </p>
            </div>
          ) : searchResult ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{searchResult.sceneTitle}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono-num text-xs font-bold">
                      {searchResult.formattedTimestamp}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {searchResult.matchExplanation}
                  </p>
                </div>

                <button
                  onClick={() => handleJump(searchResult.timestamp)}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-lg flex items-center gap-1.5 shrink-0 transition-transform hover:scale-105"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Jump to {searchResult.formattedTimestamp}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Character Introductions */}
              {searchResult.characterIntroductions && searchResult.characterIntroductions.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-900 text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" />
                    Characters:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {searchResult.characterIntroductions.map((char, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Dialogue Snippet */}
              {searchResult.keyDialogue && (
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">
                    Scene Key Dialogue:
                  </span>
                  <p className="text-amber-200 italic">&ldquo;{searchResult.keyDialogue}&rdquo;</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
