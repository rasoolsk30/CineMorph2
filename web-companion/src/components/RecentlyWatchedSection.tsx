import React, { useEffect, useState } from 'react';
import { Clock, Play, Film, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAllWatchProgress, MovieWatchProgressData } from '../lib/firebase';
import { MOVIE_SAMPLES } from '../data/cinemaSamples';
import { User } from 'firebase/auth';

interface RecentlyWatchedSectionProps {
  currentUser?: User | null;
  currentMovieId?: string;
  onResumeMovie: (movieId: string, progressSeconds: number) => void;
  onRestartMovie?: (movieId: string) => void;
  lastSyncedTimestamp?: string | null;
  history?: MovieWatchProgressData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const RecentlyWatchedSection: React.FC<RecentlyWatchedSectionProps> = ({
  currentUser = null,
  currentMovieId = '',
  onResumeMovie,
  onRestartMovie,
  lastSyncedTimestamp,
  history: propHistory,
  isLoading: propLoading,
  onRefresh,
}) => {
  const [history, setHistory] = useState<MovieWatchProgressData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const activeHistory = propHistory || history;
  const activeLoading = propLoading !== undefined ? propLoading : loading;

  const fetchHistory = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const records = await getAllWatchProgress(currentUser.uid);
      setHistory(records);
    } catch (err) {
      console.warn('Failed to load recently watched history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser?.uid, lastSyncedTimestamp]);

  if (!currentUser) return null;

  // Format relative time helper
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-8 bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-2xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span>Recently Watched & Cloud Progress</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono-num">
                Firestore Synced
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Pick up exactly where you left off across sessions with saved dubbing, mood & timing preferences.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh || fetchHistory}
          disabled={activeLoading}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Refresh recently watched list"
        >
          <RefreshCw className={`w-4 h-4 ${activeLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {activeLoading && activeHistory.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Syncing watch history from Firestore...</span>
        </div>
      ) : activeHistory.length === 0 ? (
        <div className="py-6 px-4 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-2">
          <Film className="w-8 h-8 text-slate-600" />
          <p className="text-xs text-slate-400 font-medium">No watch history saved yet.</p>
          <p className="text-[11px] text-slate-500">
            Start playing any scene above and your exact timestamp and dubbing mood will auto-sync to the cloud.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {activeHistory.map((item) => {
            const movie = MOVIE_SAMPLES.find((m) => m.id === item.movieId) || {
              id: item.movieId,
              title: item.movieId,
              titleEnglish: item.movieId,
              originalLanguage: 'Cinema',
              duration: 35,
              fallbackPosterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
              genre: 'Thriller',
            };

            const isCurrent = item.movieId === currentMovieId;
            const progressSec = item.progressSeconds || 0;
            const totalSec = movie.duration || 35;
            const percent = Math.min(100, Math.max(0, Math.round((progressSec / totalSec) * 100)));

            return (
              <div
                key={item.movieId}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-400/50 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Poster Thumbnail */}
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
                    <img
                      src={movie.fallbackPosterUrl}
                      alt={movie.titleEnglish}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono-num text-amber-300 font-bold">
                      {formatSeconds(progressSec)}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                          {movie.originalLanguage}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatTimeAgo(item.lastWatchedAt)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">
                        {movie.titleEnglish}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {movie.genre}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {item.dubbingMood && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-medium capitalize">
                          {item.dubbingMood} Mood
                        </span>
                      )}
                      {item.targetLang && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px] font-medium uppercase font-mono-num">
                          {item.targetLang}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Action */}
                <div className="space-y-2 pt-1 border-t border-slate-900">
                  <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                    <span>Progress: {percent}%</span>
                    <span>{formatSeconds(progressSec)} / {formatSeconds(totalSec)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <button
                    onClick={() => onResumeMovie(item.movieId, progressSec)}
                    className="w-full mt-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.01]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume from {formatSeconds(progressSec)}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
