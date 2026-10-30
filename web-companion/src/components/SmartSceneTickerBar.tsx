import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Eye, Flame, ShieldAlert, ChevronRight, Activity } from 'lucide-react';
import { SmartSceneTicker } from '../types';

interface SmartSceneTickerBarProps {
  movieTitle: string;
  currentTime: number;
  genre: string;
  dialogues: any[];
  isVisible: boolean;
  onToggleVisible: () => void;
}

export const SmartSceneTickerBar: React.FC<SmartSceneTickerBarProps> = ({
  movieTitle,
  currentTime,
  genre,
  dialogues,
  isVisible,
  onToggleVisible,
}) => {
  const [tickerData, setTickerData] = useState<SmartSceneTicker>({
    tickerHeadline: "Tense standoff escalates: Secrets surface as both figures reach an irrevocable breaking point.",
    plotKeyPoints: [
      "Crucial confrontation revealing concealed allegiances",
      "Time-critical ultimatum forcing an irreversible choice",
      "Subtle micro-tells betraying underlying panic",
    ],
    characterEmotions: [
      { character: "Lead Speaker", state: "High Tension", emoji: "⚡", intensity: 86 },
      { character: "Opponent", state: "Defensive Vigilance", emoji: "🛡️", intensity: 78 },
    ],
    dramaticStakes: "Irrevocable loss of leverage and exposure to sirens",
    nextAnticipation: "An unexpected revelation about the initial agreement",
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchTicker = async () => {
    setInternalLoading(true);
    try {
      const response = await fetch('/api/ai/smart-scene-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle,
          timestamp: `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`,
          sceneGenre: genre,
          dialogues,
        }),
      });
      const res = await response.json();
      if (res.success && res.data) {
        setTickerData(res.data);
      }
    } catch (err) {
      console.warn('Smart ticker fetch failed:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  const lastFetchedTitleRef = React.useRef<string>('');

  useEffect(() => {
    // Fetch only once per movie to avoid exceeding Gemini Free Tier 5 RPM quota
    if (movieTitle && lastFetchedTitleRef.current !== movieTitle) {
      lastFetchedTitleRef.current = movieTitle;
      fetchTicker();
    }
  }, [movieTitle]);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-slate-950/95 border-t border-b border-amber-500/30 px-3 py-2 text-xs flex flex-col gap-1.5 backdrop-blur-md shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {/* Ticker Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider font-mono-num flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-amber-400" />
            AI Scene Ticker
          </span>
        </div>

        {/* Scrolling / Animated Headline */}
        <div className="flex-1 min-w-[200px] overflow-hidden whitespace-nowrap">
          <p className="text-slate-200 font-medium truncate inline-block animate-pulse">
            {tickerData.tickerHeadline}
          </p>
        </div>

        {/* Character Emotional State Badges */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {tickerData.characterEmotions.map((char, idx) => (
            <div
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-[11px]"
            >
              <span>{char.emoji}</span>
              <span className="text-slate-300 font-semibold">{char.character}:</span>
              <span className="text-amber-300 font-mono-num">{char.state} ({char.intensity}%)</span>
            </div>
          ))}
        </div>

        {/* Refresh & Toggle Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchTicker}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh Smart Ticker"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Sub-details Row (Plot points & stakes) */}
      <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900 font-mono-num">
        <div className="flex items-center gap-2 truncate">
          <span className="text-rose-400 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Stakes:
          </span>
          <span className="text-slate-300 truncate">{tickerData.dramaticStakes}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-3">
          <span className="text-indigo-400 font-bold flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Anticipate:
          </span>
          <span className="text-slate-300 truncate">{tickerData.nextAnticipation}</span>
        </div>
      </div>
    </div>
  );
};
