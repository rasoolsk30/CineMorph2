import React, { useState, useEffect } from 'react';
import {
  Volume2, Clock, Film, Sparkles, RefreshCw, Check, Play, MessageSquare, Trash2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { getDubbingHistoryItems, DubbingHistoryItem, auth, ensureAuthenticatedUser } from '../lib/firebase';

interface DubbingHistoryProps {
  currentUser?: User | null;
}

export const DubbingHistory: React.FC<DubbingHistoryProps> = ({ currentUser: propUser }) => {
  const [user, setUser] = useState<User | null>(propUser || null);
  const [historyItems, setHistoryItems] = useState<DubbingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      fetchHistory(propUser.uid);
    } else {
      void (async () => {
        const u = await ensureAuthenticatedUser();
        if (u) {
          setUser(u);
          fetchHistory(u.uid);
        }
      })();
    }
  }, [propUser]);

  const fetchHistory = async (uid: string) => {
    setIsLoading(true);
    try {
      const items = await getDubbingHistoryItems(uid);
      if (items && items.length > 0) {
        setHistoryItems(items);
      } else {
        // Fallback sample items for demonstration
        setHistoryItems([
          {
            id: 'sample-1',
            userId: uid,
            movieId: 'movie-1',
            movieTitle: 'Rain Alley Standoff',
            language: 'Telugu',
            dialogueText: 'You think you can walk away from this?',
            teluguTranscreation: 'ఇక్కడి నుంచి ప్రాణాలతో బయటపడతా అనుకోకు! నీ పని అయిపోయిందిరా!',
            personaName: 'The Thunder Baritone',
            pitch: 0.70,
            createdAt: new Date().toISOString()
          },
          {
            id: 'sample-2',
            userId: uid,
            movieId: 'movie-2',
            movieTitle: 'Harbor Perimeter Breach',
            language: 'Telugu',
            dialogueText: 'We have thirty seconds before surveillance sweeps.',
            teluguTranscreation: 'ఒరేయ్ విను! పోలీసులు దూసుకురావడానికి ముప్పై సెకన్లు మాత్రమే ఉంది... త్వరగా!',
            personaName: 'The Charming Rogue',
            pitch: 1.15,
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      }
    } catch (e) {
      console.warn('Failed to load dubbing history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const playSynthesizedTrack = (item: DubbingHistoryItem) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(item.teluguTranscreation);
    utterance.pitch = item.pitch || 0.88;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes('te') || v.lang.includes('hi') || v.lang.includes('IN') || v.lang.includes('en'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setPlayingId(item.id || item.movieTitle);
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Telugu AI Dubbing History</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider font-mono-num">
                Firestore Persisted
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              List of generated Telugu dubbing audio tracks with voice timbre settings
            </p>
          </div>
        </div>

        <button
          onClick={() => user && fetchHistory(user.uid)}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* History Items List */}
      {historyItems.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
          <MessageSquare className="w-8 h-8 text-slate-600" />
          <span>No dubbing history recorded yet. Transcreate dialogues in AI Studio to populate!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {historyItems.map((item, idx) => {
            const isPlaying = playingId === (item.id || item.movieTitle);
            return (
              <div
                key={item.id || idx}
                className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex flex-col justify-between gap-3 shadow-md hover:border-amber-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.movieTitle}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono-num">
                      {item.language} · {item.personaName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 italic mb-1.5">&ldquo;{item.dialogueText}&rdquo;</p>
                  <p className="text-sm font-bold text-amber-300 leading-relaxed">&ldquo;{item.teluguTranscreation}&rdquo;</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono-num flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => playSynthesizedTrack(item)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isPlaying
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                  >
                    {isPlaying ? <Volume2 className="w-3.5 h-3.5 animate-bounce" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Playing Dub...' : 'Play Synthesis'}</span>
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
