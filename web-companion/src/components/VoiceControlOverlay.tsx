import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check, AlertCircle, Play, Pause, RotateCcw, RotateCw, Globe, Radio } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface VoiceControlOverlayProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekDelta: (seconds: number) => void;
  onTranslate: (langCode: SupportedLanguage) => void;
  onToggleMute: () => void;
  onToggleCoWatch: () => void;
  onToggleInsight: () => void;
  onSemanticSearch: (query: string) => void;
}

export const VoiceControlOverlay: React.FC<VoiceControlOverlayProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onSeekDelta,
  onTranslate,
  onToggleMute,
  onToggleCoWatch,
  onToggleInsight,
  onSemanticSearch,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [actionTimestamp, setActionTimestamp] = useState<number>(0);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }

        const clean = currentTranscript.trim().toLowerCase();
        setTranscript(clean);

        // Process voice command
        processCommand(clean);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If still supposed to listen, auto-restart
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already active or error
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
      setHasSupport(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const triggerActionFeedback = (message: string) => {
    setLastAction(message);
    setActionTimestamp(Date.now());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLastAction(null);
    }, 3500);
  };

  const processCommand = (phrase: string) => {
    const text = phrase.toLowerCase();

    // 1. Playback controls
    if (text.includes('pause') || text.includes('stop') || text.includes('freeze') || text.includes('hold on')) {
      onPause();
      triggerActionFeedback('Paused movie');
      return;
    }
    if (text.includes('play') || text.includes('resume') || text.includes('continue') || text.includes('start movie')) {
      onPlay();
      triggerActionFeedback('Resumed playback');
      return;
    }

    // 2. Seeking & Rewinding
    if (text.includes('rewind 30') || text.includes('back 30') || text.includes('backward 30')) {
      onSeekDelta(-30);
      triggerActionFeedback('Rewound 30 seconds');
      return;
    }
    if (text.includes('rewind 10') || text.includes('back 10') || text.includes('rewind') || text.includes('go back')) {
      onSeekDelta(-10);
      triggerActionFeedback('Rewound 10 seconds');
      return;
    }
    if (text.includes('forward 30') || text.includes('skip 30') || text.includes('ahead 30')) {
      onSeekDelta(30);
      triggerActionFeedback('Skipped forward 30 seconds');
      return;
    }
    if (text.includes('forward 10') || text.includes('skip 10') || text.includes('forward') || text.includes('fast forward')) {
      onSeekDelta(10);
      triggerActionFeedback('Skipped forward 10 seconds');
      return;
    }

    // 3. Dubbing Language Switching
    if (text.includes('spanish') || text.includes('espanol')) {
      onTranslate('es');
      triggerActionFeedback('Switched dubbing to Spanish 🇪🇸');
      return;
    }
    if (text.includes('telugu')) {
      onTranslate('te');
      triggerActionFeedback('Switched dubbing to Telugu 🇮🇳');
      return;
    }
    if (text.includes('hindi')) {
      onTranslate('hi');
      triggerActionFeedback('Switched dubbing to Hindi 🇮🇳');
      return;
    }
    if (text.includes('japanese') || text.includes('japan')) {
      onTranslate('ja');
      triggerActionFeedback('Switched dubbing to Japanese 🇯🇵');
      return;
    }
    if (text.includes('korean') || text.includes('korea')) {
      onTranslate('ko');
      triggerActionFeedback('Switched dubbing to Korean 🇰🇷');
      return;
    }
    if (text.includes('tamil')) {
      onTranslate('ta');
      triggerActionFeedback('Switched dubbing to Tamil 🇮🇳');
      return;
    }
    if (text.includes('english')) {
      onTranslate('en');
      triggerActionFeedback('Switched dubbing to English 🇬🇧');
      return;
    }

    // 4. Audio Mute
    if (text.includes('mute') || text.includes('unmute') || text.includes('silence')) {
      onToggleMute();
      triggerActionFeedback('Toggled audio mute');
      return;
    }

    // 5. Watch Party / Co-Watch
    if (text.includes('co watch') || text.includes('cowatch') || text.includes('watch party') || text.includes('invite friend')) {
      onToggleCoWatch();
      triggerActionFeedback('Opened Co-Watch Watch Party');
      return;
    }

    // 6. Scene Insight
    if (text.includes('scene insight') || text.includes('insight') || text.includes('explain scene')) {
      onToggleInsight();
      triggerActionFeedback('Toggled AI Scene Insight Sidebar');
      return;
    }

    // 7. Semantic Search
    if (text.startsWith('search ') || text.startsWith('find scene ') || text.startsWith('jump to ')) {
      const q = text.replace('search', '').replace('find scene', '').replace('jump to', '').trim();
      if (q) {
        onSemanticSearch(q);
        triggerActionFeedback(`Searching scenes for: "${q}"`);
      }
    }
  };

  const toggleListening = () => {
    if (!hasSupport) {
      // Trigger simulation test
      processCommand('rewind 30 seconds');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      setTranscript('');
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        triggerActionFeedback('Voice control listening... say "pause" or "translate to Spanish"');
      } catch (e) {
        console.warn('Failed to start recognition:', e);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Voice Control Toggle Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleListening}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
            isListening
              ? 'bg-rose-500 text-white shadow-rose-500/30 shadow-lg ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-950 animate-pulse'
              : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/80 hover:border-amber-400/50'
          }`}
          title="Hands-free Web Speech Voice Control (e.g. 'pause', 'rewind 30s', 'translate to Spanish')"
        >
          {isListening ? (
            <>
              <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
              <span className="font-mono-num">Voice Active</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Voice Control</span>
            </>
          )}
        </button>

        {/* Quick Voice Cheat Sheet / Command Simulator Button */}
        <button
          onClick={() => setShowCheatSheet(!showCheatSheet)}
          className="p-1.5 text-slate-400 hover:text-amber-300 rounded-full hover:bg-slate-800 transition-colors"
          title="Voice command help & 1-click test simulation"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Action Feedback Pill on Video */}
      {lastAction && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 backdrop-blur-xl border border-amber-400/60 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-scale-in">
          <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono-num">
              Voice Command Executed
            </span>
            <span className="text-xs font-semibold text-white">{lastAction}</span>
          </div>
          {transcript && (
            <span className="text-[10px] text-slate-400 font-mono-num pl-2 border-l border-slate-800 italic">
              &ldquo;{transcript}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* Voice Commands Cheat Sheet & 1-Click Simulation Modal */}
      {showCheatSheet && (
        <div className="absolute top-10 right-0 w-80 z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-scale-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white font-mono-num uppercase">
                Hands-Free Voice Commands
              </span>
            </div>
            <button
              onClick={() => setShowCheatSheet(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Speak naturally into your microphone or tap any command below to execute instantly:
          </p>

          <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
            <button
              onClick={() => {
                processCommand(isPlaying ? 'pause' : 'play');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
                <span className="font-mono text-[11px]">&quot;{isPlaying ? 'pause' : 'play'}&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">Toggle playback</span>
            </button>

            <button
              onClick={() => {
                processCommand('rewind 30 seconds');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">&quot;rewind 30 seconds&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">-30s</span>
            </button>

            <button
              onClick={() => {
                processCommand('forward 30 seconds');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">&quot;forward 30 seconds&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">+30s</span>
            </button>

            <button
              onClick={() => {
                processCommand('translate to spanish');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">&quot;translate to Spanish&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">🇪🇸 Dub</span>
            </button>

            <button
              onClick={() => {
                processCommand('translate to telugu');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">&quot;translate to Telugu&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">🇮🇳 Dub</span>
            </button>

            <button
              onClick={() => {
                processCommand('co watch');
                setShowCheatSheet(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">&quot;co watch&quot;</span>
              </div>
              <span className="text-[10px] text-slate-500">Watch party</span>
            </button>
          </div>

          {!hasSupport && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Web Speech API is emulated in this sandbox. Tap any command above to trigger full hands-free execution.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
