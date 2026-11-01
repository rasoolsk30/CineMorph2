import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createCinemaSession, updateCinemaSession, formatSessionTime, CinemaSession } from '../lib/cinema-session';
import { createCinemaSession, updateCinemaSession, formatSessionTime, CinemaSession } from '../lib/cinema-session';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Sliders, Eye, 
  HelpCircle, Radio, Info, Sun, Check, ChevronRight, MessageSquare,
  Smile, Flame, BookOpen, Moon, Activity, Accessibility, Ear,
  Layers, RefreshCw, X, Volume1, Compass, Heart, Globe, ChevronDown,
  Wand2, Clock, CheckCircle2, AlertCircle, FastForward, Rewind,
  Download, Gauge, Zap, Film, Tag, Users, Mic, Search, BarChart3, Database, TrendingUp, Tv, Cpu, Type, Lock, Shield, Maximize2, Minimize2, Bookmark, Camera, Headphones, Repeat
} from 'lucide-react';
import { 
  MovieScene, RemasterSettings, DubbingSettings, DialogueLine, 
  SupportedLanguage, DubbingMood, GestureState, SceneInsight,
  PulseSyncState, PulseSyncMode, AccessibilitySettings,
  HighContrastSubtitleMode, SubtitleFontSize, SubtitleDriftState,
  VoicePersona, WordDefinition, PictureBoostPreset, SmartSceneTicker
} from '../types';
import { 
  MOVIE_SAMPLES, DUBBING_MOODS, SUPPORTED_LANGUAGES, VOICE_PERSONAS 
} from '../data/cinemaSamples';
import { 
  ensureAuthenticatedUser, saveWatchProgress, getWatchProgress, getAllWatchProgress,
  MovieWatchProgressData 
} from '../lib/firebase';
import { User } from 'firebase/auth';
import { HistoryView } from './HistoryView';
import { cacheLocalRecord, readLocalRecord } from '../lib/local-cache';
import { GestureGuideModal } from './GestureGuideModal';
import { WordDictionaryModal } from './WordDictionaryModal';
import { SmartSceneTickerBar } from './SmartSceneTickerBar';
import { TranscriptDrawer } from './TranscriptDrawer';
import { VoiceControlOverlay } from './VoiceControlOverlay';
import { SemanticSceneSearchBar } from './SemanticSceneSearchBar';
import { CoWatchPartyDrawer } from './CoWatchPartyDrawer';
import { SyncService } from './SyncService';

type CinemaPlayerProps = { initialLocalFile?: File | null };

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({ initialLocalFile = null }) => {
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(0);
  const [recentMovieIndices, setRecentMovieIndices] = useState<number[]>([]);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localVideoName, setLocalVideoName] = useState<string | null>(null);
  const currentMovie = MOVIE_SAMPLES[selectedMovieIndex];
  const activeVideoUrl = localVideoUrl || currentMovie.videoUrl;
  const [cinemaSession, setCinemaSession] = useState<CinemaSession>(() =>
    createCinemaSession(initialLocalFile?.name || currentMovie.titleEnglish, initialLocalFile ? 'local-file' : 'sample')
  );
  const [aiSetupStatus, setAiSetupStatus] = useState<'checking' | 'configured' | 'missing' | 'unreachable'>('checking');
  const [aiEndpointCount, setAiEndpointCount] = useState(0);

  // Each selected movie gets a fresh, identifiable Cinema Session.
  useEffect(() => {
    setCinemaSession(createCinemaSession(localVideoName || currentMovie.titleEnglish, localVideoName ? 'local-file' : 'sample'));
  }, [localVideoName, currentMovie.id]);

  // Check backend and Gemini configuration without exposing credentials.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/session/capabilities')
      .then(async response => {
        if (!response.ok) throw new Error('Capability check failed');
        return response.json();
      })
      .then(data => {
        if (cancelled) return;
        setAiSetupStatus(data?.gemini?.configured ? 'configured' : 'missing');
        setAiEndpointCount(data?.endpoints ? Object.values(data.endpoints).filter(Boolean).length : 0);
      })
      .catch(() => { if (!cancelled) setAiSetupStatus('unreachable'); });
    return () => { cancelled = true; };
  }, []);

  const updateSession = (patch: Partial<Pick<CinemaSession, 'status' | 'playbackSeconds' | 'durationSeconds'>>) => {
    setCinemaSession(previous => updateCinemaSession(previous, patch));
  };

  const handleLocalVideoSelect = (file: File) => {
    if (!file.type.startsWith('video/') && !/\.(mkv|avi|mov|webm|mp4|m4v)$/i.test(file.name)) {
      setSessionStatus('error');
      setSessionError('Please select a valid video file.');
      return;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSessionStatus('loading');
    setSessionError(null);
    setLocalVideoName(file.name);
    setLocalVideoUrl(URL.createObjectURL(file));
  };

  // The launch screen hands the chosen local file into this player session.
  useEffect(() => {
    if (initialLocalFile) handleLocalVideoSelect(initialLocalFile);
  }, [initialLocalFile]);

  useEffect(() => {
    if (!localVideoUrl) return;
    return () => URL.revokeObjectURL(localVideoUrl);
  }, [localVideoUrl]);

  // Keep the last three sample movies the user opened, locally in this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cinemorph_recent_movies') || '[]');
      if (Array.isArray(saved)) {
        setRecentMovieIndices(saved.filter((index): index is number =>
          Number.isInteger(index) && index >= 0 && index < MOVIE_SAMPLES.length
        ).slice(0, 3));
      }
    } catch (error) {
      console.warn('Recent movie history unavailable:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cinemorph_recent_movies', JSON.stringify(recentMovieIndices.slice(0, 3)));
    } catch (error) {
      console.warn('Recent movie history could not be saved:', error);
    }
  }, [recentMovieIndices]);

  const rememberRecentMovie = (index: number) => {
    setRecentMovieIndices(previous => [index, ...previous.filter(item => item !== index)].slice(0, 3));
  };

  const handleReprocessRecentMovie = (index: number) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSessionStatus('loading');
    setSessionError(null);
    setLocalVideoUrl(null);
    setLocalVideoName(null);
    setSelectedMovieIndex(index);
    rememberRecentMovie(index);
    setIsQuickSettingsOpen(false);
  };

  // Movie dialogues in local state so automated drift correction can recalibrate timestamps
  const [movieDialogues, setMovieDialogues] = useState<DialogueLine[]>(currentMovie.dialogues);
  const cacheLoadedForMovie = useRef<string | null>(null);

  // Restore the saved subtitle timeline from IndexedDB, then keep it cached for offline use.
  useEffect(() => {
    let cancelled = false;
    setSessionStatus('loading');
    setSessionError(null);
    cacheLoadedForMovie.current = null;
    void (async () => {
      try {
        const cached = await readLocalRecord<DialogueLine[]>('subtitles', currentMovie.id);
        const metadata = { id: currentMovie.id, title: currentMovie.titleEnglish, genre: currentMovie.genre, cachedAt: new Date().toISOString() };
        await cacheLocalRecord('movieMetadata', currentMovie.id, metadata);
        if (cancelled) return;
        if (cached && cached.length) setMovieDialogues(cached);
        else await cacheLocalRecord('subtitles', currentMovie.id, currentMovie.dialogues);
      } catch (error) {
        console.warn('IndexedDB cache unavailable; using in-memory movie data.', error);
      } finally { if (!cancelled) cacheLoadedForMovie.current = currentMovie.id; }
    })();
    return () => { cancelled = true; };
  }, [currentMovie.id]);

  useEffect(() => {
    if (cacheLoadedForMovie.current !== currentMovie.id) return;
    void cacheLocalRecord('subtitles', currentMovie.id, movieDialogues).catch(error => console.warn('Subtitle cache write skipped:', error));
  }, [currentMovie.id, movieDialogues]);

  // Video Player Ref & State
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(35);
  const [volume, setVolume] = useState(0.85);
  const [brightness, setBrightness] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Array<{ movieId: string; time: number; note: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('cinemorph_bookmarks') || '[]'); } catch { return []; }
  });
  const [studioMode, setStudioMode] = useState(false);
  const [studioStart, setStudioStart] = useState(0);
  const [studioEnd, setStudioEnd] = useState(10);
  const [studioExportStatus, setStudioExportStatus] = useState('');
  const studioRecorderRef = useRef<MediaRecorder | null>(null);
  const studioChunksRef = useRef<Blob[]>([]);

  // Quick-Access Language Menu Overlay state
  const [isQuickLangMenuOpen, setIsQuickLangMenuOpen] = useState(false);

  // Active dialogue tracker
  const [activeDialogue, setActiveDialogue] = useState<DialogueLine | null>(null);
  const [selectedSlangInfo, setSelectedSlangInfo] = useState<DialogueLine | null>(null);

  // Remaster Settings
  const [remaster, setRemaster] = useState<RemasterSettings>({
    enabled: true,
    sharpness: 80,
    hdrVibrancy: 65,
    nightBoost: 40,
    contrastBoost: 35,
    denoise: 50,
    splitPosition: 50,
    showSplitSlider: true,
    fpsBoost60: true,
  });

  // Dubbing Settings with Personality / Mood & Drift Offset
  const [dubbing, setDubbing] = useState<DubbingSettings>({
    enabled: true,
    targetLang: 'te',
    dubbingMood: 'dramatic',
    activePersonaId: 'thunder_baritone',
    voiceVolume: 90,
    bgmMixLevel: 45,
    emotionCloning: true,
    subtitleMode: 'smart-glance',
    lipSyncAssist: true,
    driftOffsetMs: 0,
  });

  // Automated Subtitle Drift Recalibration State
  const [driftState, setDriftState] = useState<SubtitleDriftState>({
    driftDetected: true,
    detectedDriftMs: 380, // initial simulated phase disparity
    calibratedOffsetMs: 0,
    isCalibrating: false,
    confidenceScore: undefined,
    driftCause: undefined,
  });

  // Pulse Sync State (Adaptive Focus & Pacing)
  const [pulseSync, setPulseSync] = useState<PulseSyncState>({
    enabled: true,
    mode: 'auto',
    inferredFocusLevel: 86,
    pacingSuggestion: 'High Focus: Ducking ambient BGM by 15% for surgical vocal clarity',
    bgmAdjustmentFactor: 0.85,
    sceneTransitionSpeed: 'cinematic',
    heartbeatBpm: 74,
  });

  // Accessibility Overlay State
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    enabled: false,
    audioDescriptionEnabled: false,
    highContrastMode: 'standard',
    fontSize: 'normal',
    soundCuesEnabled: true,
    reducedMotion: false,
  });
  const [isADSpeaking, setIsADSpeaking] = useState(false);

  // Scene Insight Sidebar State
  const [isInsightSidebarOpen, setIsInsightSidebarOpen] = useState(true);
  const [sceneInsight, setSceneInsight] = useState<SceneInsight>({
    sceneSummary: currentMovie.synopsisEnglish,
    sentiment: {
      primaryEmotion: 'Tense Confrontation & Betrayal',
      tensionLevel: 84,
      valence: 'negative',
      pacingRating: 'High-Stakes Moderation',
    },
    characterMotivations: [
      {
        character: currentMovie.dialogues[0]?.speaker || 'Protagonist',
        motivation: 'Seeking absolute retribution and forcing a confession.',
        hiddenAgenda: 'Gauging whether the adversary is armed or stalling.',
      },
      {
        character: currentMovie.dialogues[1]?.speaker || 'Antagonist',
        motivation: 'Desperate plea for family survival under gunpoint.',
        hiddenAgenda: 'Stalling for sirens to arrive before making a break.',
      },
    ],
    visualActionDescription: currentMovie.defaultActionDescription || 'Rain lashes against the rusted sea containers as cold tungsten neon illuminates the tense standoff.',
    thematicMetaphor: 'The relentless rain symbolizes moral corruption washing over the harbor.',
  });
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Gestures State & HUD
  const [gestureHUD, setGestureHUD] = useState<GestureState>({
    isActive: false,
    type: null,
    value: 0,
    label: '',
  });
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchStartValues = useRef<{ vol: number; bright: number; time: number }>({ vol: 0.85, bright: 100, time: 0 });

  // Control tabs in Right Panel
  const [activeControlTab, setActiveControlTab] = useState<'mood' | 'drift' | 'pulse' | 'access' | 'remaster'>('mood');
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  // Gesture Guide Modal State
  const [isGestureGuideOpen, setIsGestureGuideOpen] = useState(false);
  const hasShownGuideOnStart = useRef(false);

  // Smart Scene Summary Ticker Visibility
  const [isSmartTickerVisible, setIsSmartTickerVisible] = useState(true);

  // Interactive Scene Transcript Drawer
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Subtitle Word Tap Lexicon Modal State
  const [selectedWordDef, setSelectedWordDef] = useState<WordDefinition | null>(null);
  const [isLoadingWordDef, setIsLoadingWordDef] = useState(false);

  // Picture Boost Preset State ('none' | 'hdr_cinema' | 'oled_black' | 'vivid_pop' | 'crisp_sharp')
  const [pictureBoost, setPictureBoost] = useState<PictureBoostPreset>('hdr_cinema');

  // Double-tap ±10s Seek Ripple State
  const [doubleTapRipple, setDoubleTapRipple] = useState<{
    side: 'left' | 'right';
    timestamp: number;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Playback Speed
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Advanced Two-Step Screen Lock State Machine ('UNLOCKED' | 'LOCKED_HIDDEN' | 'LOCKED_SHOW_UNLOCK')
  type ScreenLockState = 'UNLOCKED' | 'LOCKED_HIDDEN' | 'LOCKED_SHOW_UNLOCK';
  const [screenLockState, setScreenLockState] = useState<ScreenLockState>('UNLOCKED');
  const lockAutoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleUnlockButtonAutoHide = () => {
    if (lockAutoHideTimeoutRef.current) clearTimeout(lockAutoHideTimeoutRef.current);
    lockAutoHideTimeoutRef.current = setTimeout(() => {
      setScreenLockState(prev => prev === 'LOCKED_SHOW_UNLOCK' ? 'LOCKED_HIDDEN' : prev);
    }, 3000);
  };

  // Co-Watch Party State & Synced Actions
  const [isCoWatchOpen, setIsCoWatchOpen] = useState(false);

  // Real-Time NPU Performance Telemetry & Floating Mini-Menu State
  const [isPerfOverlayOpen, setIsPerfOverlayOpen] = useState(true);
  const [audioLatencyMs, setAudioLatencyMs] = useState(12);
  const [fpsProcessing, setFpsProcessing] = useState(60.0);
  const [npuLoadPercent, setNpuLoadPercent] = useState(34);

  const [isMiniMenuOpen, setIsMiniMenuOpen] = useState(false);
  const [isDubbingMuted, setIsDubbingMuted] = useState(false);
  const [dialogueNormalizerEnabled, setDialogueNormalizerEnabled] = useState(true);
  const [isStealthVaultActive, setIsStealthVaultActive] = useState(false);

  // Simulated Real-Time NPU Telemetry Updates (Jitter simulation for latency, FPS, NPU load)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAudioLatencyMs(11 + Math.floor(Math.random() * 4));
      setFpsProcessing(59.4 + Math.random() * 0.8);
      setNpuLoadPercent(30 + Math.floor(Math.random() * 12));
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Firestore All Watch Progress Records for Viewing Metrics Dashboard.
  // These state values must be initialized before the weekly chart reads them.
  const [allWatchRecords, setAllWatchRecords] = useState<MovieWatchProgressData[]>([]);
  const [cumulativeWatchSeconds, setCumulativeWatchSeconds] = useState<number>(0);

  // Sample 7-Day Weekly Viewing Trend Data (for Recharts-style 'time spent watching' chart)
  const weeklyViewingData = [
    { day: 'Mon', minutes: 18, date: 'May 12' },
    { day: 'Tue', minutes: 24, date: 'May 13' },
    { day: 'Wed', minutes: 12, date: 'May 14' },
    { day: 'Thu', minutes: 35, date: 'May 15' },
    { day: 'Fri', minutes: 48, date: 'May 16' },
    { day: 'Sat', minutes: 62, date: 'May 17' },
    { day: 'Sun', minutes: Math.max(25, Math.round((cumulativeWatchSeconds + currentTime) / 60)), date: 'Today' },
  ];
  const maxWeeklyMinutes = Math.max(...weeklyViewingData.map(d => d.minutes), 60);

  const loadCumulativeMetrics = useCallback(async (uid: string) => {
    try {
      const records = await getAllWatchProgress(uid);
      setAllWatchRecords(records);
      const totalSecs = records.reduce((sum, r) => sum + (r.progressSeconds || 0), 0);
      setCumulativeWatchSeconds(totalSecs);
    } catch (err) {
      console.warn('Error loading cumulative watch metrics:', err);
    }
  }, []);

  const handleCoWatchSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const handleCoWatchPlay = () => {
    if (videoRef.current && !isPlaying) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleCoWatchPause = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Firebase Firestore User & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{ seconds: number; percent: number } | null>(null);

  // Audio Speech Synthesis
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const lastSpokenDialogueId = useRef<string | null>(null);
  const lastSpokenADTimestamp = useRef<number>(-1);

  // Listen to Character Persona Changes from AI Lab
  useEffect(() => {
    const savedPersona = localStorage.getItem('cinemorph_active_persona');
    if (savedPersona) {
      setDubbing(prev => ({ ...prev, activePersonaId: savedPersona }));
    }

    const handlePersonaChange = (e: any) => {
      const personaId = e.detail?.personaId;
      if (personaId) {
        setDubbing(prev => ({ ...prev, activePersonaId: personaId }));
        const pObj = VOICE_PERSONAS.find(p => p.id === personaId);
        showHUD('subtitles', 100, `Voice Persona: ${pObj?.name || personaId}`);
      }
    };

    window.addEventListener('cinemorph_persona_change', handlePersonaChange);
    return () => window.removeEventListener('cinemorph_persona_change', handlePersonaChange);
  }, []);

  // Local playback starts independently; browser speech synthesis is initialized locally.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  // When Movie Changes, Load Progress from Firestore
  useEffect(() => {
    setMovieDialogues(currentMovie.dialogues);
    if (currentUser) {
      loadUserProgress(currentUser.uid, currentMovie.id);
    }
    lastSpokenDialogueId.current = null;
    lastSpokenADTimestamp.current = -1;
    if (speechSynthRef.current) speechSynthRef.current.cancel();

  }, [currentMovie.id]);

  const loadUserProgress = async (uid: string, movieId: string) => {
    try {
      void loadCumulativeMetrics(uid);
      const saved = await getWatchProgress(uid, movieId);
      if (saved && saved.progressSeconds > 2) {
        setResumePrompt({
          seconds: saved.progressSeconds,
          percent: saved.progressPercent || Math.round((saved.progressSeconds / 35) * 100),
        });
        if (saved.dubbingMood) {
          setDubbing(prev => ({ ...prev, dubbingMood: saved.dubbingMood as DubbingMood }));
        }
        if (saved.targetLang) {
          setDubbing(prev => ({ ...prev, targetLang: saved.targetLang as SupportedLanguage }));
        }
        if (saved.brightness) setBrightness(saved.brightness);
        if (saved.volume !== undefined) setVolume(saved.volume);
        if (saved.subtitleMode) {
          setDubbing(prev => ({ ...prev, subtitleMode: saved.subtitleMode as any }));
        }
        if (saved.pulseSyncEnabled !== undefined) {
          setPulseSync(prev => ({ ...prev, enabled: saved.pulseSyncEnabled ?? true }));
        }
        if (saved.accessibilityOverlayEnabled !== undefined) {
          setAccessibility(prev => ({ 
            ...prev, 
            enabled: saved.accessibilityOverlayEnabled ?? false,
            highContrastMode: (saved.highContrastSubtitleMode as any) || 'standard',
            audioDescriptionEnabled: saved.audioDescriptionEnabled ?? false,
            fontSize: (saved.subtitleFontSize as any) || 'normal'
          }));
        }
        if (saved.subtitleDriftMs !== undefined && saved.subtitleDriftMs !== 0) {
          setDriftState(prev => ({
            ...prev,
            calibratedOffsetMs: saved.subtitleDriftMs || 0,
            driftDetected: false
          }));
        }
        setLastSyncedTime(new Date(saved.lastWatchedAt).toLocaleTimeString());
      } else {
        setResumePrompt(null);
      }
    } catch (err) {
      console.warn('Failed to load user progress:', err);
    }
  };

  const handleConnectCloud = async () => {
    if (currentUser || isConnectingCloud) return;
    setIsConnectingCloud(true);
    try {
      const user = await ensureAuthenticatedUser();
      if (user) {
        setCurrentUser(user);
        await loadUserProgress(user.uid, currentMovie.id);
      }
    } catch (error) {
      console.warn('Cloud connection unavailable; local playback remains active.', error);
    } finally {
      setIsConnectingCloud(false);
    }
  };

  // Sync Progress to Firestore (Debounced)
  const syncProgressToCloud = useCallback(async (customTime?: number) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const pos = customTime ?? (videoRef.current ? videoRef.current.currentTime : currentTime);
    const dur = duration || 35;
    const percent = Math.min(100, Math.round((pos / dur) * 100));

    try {
      await saveWatchProgress(currentUser.uid, currentMovie.id, {
        progressSeconds: pos,
        progressPercent: percent,
        dubbingMood: dubbing.dubbingMood,
        targetLang: dubbing.targetLang,
        volume: volume,
        brightness: brightness,
        subtitleMode: dubbing.subtitleMode,
        dubbingEnabled: dubbing.enabled,
        remasterEnabled: remaster.enabled,
        pulseSyncEnabled: pulseSync.enabled,
        pulseSyncMode: pulseSync.mode,
        accessibilityOverlayEnabled: accessibility.enabled,
        highContrastSubtitleMode: accessibility.highContrastMode,
        audioDescriptionEnabled: accessibility.audioDescriptionEnabled,
        subtitleFontSize: accessibility.fontSize,
        activeVoicePersona: dubbing.activePersonaId,
        subtitleDriftMs: driftState.calibratedOffsetMs,
      });
      setLastSyncedTime(new Date().toLocaleTimeString());
      void loadCumulativeMetrics(currentUser.uid);
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, currentMovie.id, currentTime, duration, dubbing, volume, brightness, remaster.enabled, pulseSync, accessibility, driftState.calibratedOffsetMs, loadCumulativeMetrics]);

  // Periodic Auto-Sync every 6 seconds while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      syncProgressToCloud();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, syncProgressToCloud]);

  // Apply Resume Position
  const handleApplyResume = () => {
    if (!resumePrompt || !videoRef.current) return;
    videoRef.current.currentTime = resumePrompt.seconds;
    setCurrentTime(resumePrompt.seconds);
    setResumePrompt(null);
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  // Automated Drift Recalibration with Gemini
  const handleAutoCalibrateDrift = async () => {
    setDriftState(prev => ({ ...prev, isCalibrating: true }));
    try {
      const response = await fetch('/api/ai/recalibrate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitles: movieDialogues,
          currentTimestamp: currentTime,
          detectedDriftMs: driftState.detectedDriftMs || 380,
          frameRate: remaster.fpsBoost60 ? 60 : 24,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        const offset = data.data.calibratedDriftOffsetMs || -350;
        setDriftState({
          driftDetected: false,
          detectedDriftMs: 0,
          calibratedOffsetMs: offset,
          isCalibrating: false,
          confidenceScore: data.data.confidenceScore || 96,
          driftCause: data.data.driftCause || 'Cadence timebase phase locked with Gemini phonetic sync.',
          lastCalibratedAt: new Date().toLocaleTimeString(),
        });

        if (Array.isArray(data.data.calibratedSubtitles) && data.data.calibratedSubtitles.length > 0) {
          setMovieDialogues(data.data.calibratedSubtitles);
        }

        setDubbing(prev => ({ ...prev, driftOffsetMs: offset }));
        showHUD('seek', Math.abs(offset), `Drift Locked: ${offset}ms (Gemini AI)`);
        setTimeout(() => syncProgressToCloud(), 300);
      }
    } catch (err) {
      console.error('Drift calibration failed:', err);
      setDriftState(prev => ({ ...prev, isCalibrating: false }));
    }
  };

  // Quick Language Selection
  const handleQuickLanguageSelect = (langCode: SupportedLanguage) => {
    setDubbing(prev => ({ ...prev, targetLang: langCode }));
    setIsQuickLangMenuOpen(false);
    
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    showHUD('subtitles', 100, `Dubbed Language: ${langObj?.name || langCode}`);

    // If currently speaking or active dialogue, re-trigger voice immediately
    if (activeDialogue) {
      speakDubbingVoice(activeDialogue);
    }
    setTimeout(() => syncProgressToCloud(), 300);
  };

  const cachedInsightMapRef = useRef<Record<string, SceneInsight>>({});

  // Fetch Scene Insight from Gemini API
  const fetchSceneInsight = async (customContext?: string, forceRefresh = false) => {
    if (!forceRefresh && cachedInsightMapRef.current[currentMovie.id]) {
      setSceneInsight(cachedInsightMapRef.current[currentMovie.id]);
      return;
    }

    setIsLoadingInsight(true);
    try {
      const response = await fetch('/api/ai/scene-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: currentMovie.titleEnglish,
          timestamp: `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`,
          sceneSynopsis: customContext || currentMovie.synopsisEnglish,
          currentDialogue: activeDialogue ? `${activeDialogue.speaker}: ${activeDialogue.englishLiteral}` : '',
          genre: currentMovie.genre,
          visualNotes: currentMovie.directorVisualNotes,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSceneInsight(data.data);
        cachedInsightMapRef.current[currentMovie.id] = data.data;
      }
    } catch (err) {
      console.warn('Scene insight fetch note:', err);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // Audio Description (AD) Speech Synthesis
  const speakAudioDescription = (textToDescribe: string) => {
    if (!speechSynthRef.current || !accessibility.audioDescriptionEnabled) return;
    try {
      speechSynthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(textToDescribe);
      
      const voices = speechSynthRef.current.getVoices();
      const englishVoice = voices.find(v => (v.lang.includes('en-GB') || v.lang.includes('en-US')) && v.name.toLowerCase().includes('natural')) || voices.find(v => v.lang.includes('en'));
      if (englishVoice) utterance.voice = englishVoice;

      utterance.pitch = 0.95;
      utterance.rate = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsADSpeaking(true);
        if (videoRef.current) {
          videoRef.current.volume = volume * 0.35;
        }
      };

      utterance.onend = () => {
        setIsADSpeaking(false);
        if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : volume * (pulseSync.enabled ? pulseSync.bgmAdjustmentFactor : 1);
        }
      };

      utterance.onerror = () => {
        setIsADSpeaking(false);
        if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : volume;
        }
      };

      speechSynthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Audio description synthesis error:', e);
    }
  };

  // Export selected clip or audio segment using the browser's MediaRecorder (WebM formats).
  const startStudioExport = (mode: 'clip' | 'audio') => {
    const video = videoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream }) | null;
    if (!video || !video.captureStream || typeof MediaRecorder === 'undefined') {
      setStudioExportStatus('ఈ browserలో MediaRecorder export support లేదు.');
      return;
    }
    if (studioEnd <= studioStart || studioEnd - studioStart > 60) {
      setStudioExportStatus('Start/End సమయం సరిచూడండి. ఒక్క export గరిష్ఠంగా 60 seconds.');
      return;
    }
    try {
      const sourceStream = video.captureStream();
      const stream = mode === 'audio' ? new MediaStream(sourceStream.getAudioTracks()) : sourceStream;
      if (!stream.getTracks().length) throw new Error('No capturable media tracks');
      const mimeType = mode === 'audio' ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp9';
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined);
      studioChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) studioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(studioChunksRef.current, { type: recorder.mimeType || (mode === 'audio' ? 'audio/webm' : 'video/webm') });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = mode === 'audio' ? 'cinemorph-audio.webm' : 'cinemorph-clip.webm';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setStudioExportStatus('Export పూర్తయింది. WebM ఫైల్ సేవ్ అయింది.');
        stream.getTracks().forEach(track => track.stop());
        setStudioMode(false);
      };
      studioRecorderRef.current = recorder;
      video.currentTime = studioStart;
      setStudioExportStatus(mode === 'audio' ? 'Audio extract అవుతోంది…' : 'Clip record అవుతోంది…');
      recorder.start(250);
      video.play().then(() => setIsPlaying(true)).catch(error => {
        recorder.stop(); setStudioExportStatus('Playback ప్రారంభం కాలేదు: ' + String(error));
      });
    } catch (error) {
      setStudioExportStatus('Export ప్రారంభం కాలేదు: ' + String(error));
    }
  };

  // Handle Video Time Updates & Audio Sync
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (loopStart !== null && loopEnd !== null && loopEnd > loopStart && time >= loopEnd) {
      videoRef.current.currentTime = loopStart;
      setCurrentTime(loopStart);
      return;
    }
    setCurrentTime(time);
    updateSession({ playbackSeconds: time, status: videoRef.current.paused ? 'paused' : 'playing' });
    if (studioRecorderRef.current?.state === 'recording' && time >= studioEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
      studioRecorderRef.current.stop();
      studioRecorderRef.current = null;
      return;
    }

    // Track active dialogue line from the calibrated dialogues list
    const matched = movieDialogues.find(
      (d) => time >= d.startTime && time <= d.endTime
    );
    setActiveDialogue(matched || null);

    // Pulse Sync Simulated Dynamic Focus Tracking
    if (pulseSync.enabled && pulseSync.mode === 'auto') {
      const targetFocus = matched ? 92 : 78;
      const bpm = matched ? 82 : 72;
      const bgmAdj = matched ? 0.85 : 1.12;
      setPulseSync(prev => ({
        ...prev,
        inferredFocusLevel: targetFocus,
        heartbeatBpm: bpm,
        bgmAdjustmentFactor: bgmAdj,
        pacingSuggestion: matched 
          ? 'Deep Immersion: Ducking BGM by 15% to prioritize dialogue vocal formant'
          : 'Ambient Resurgence: Elevating background score by 12% to sustain engagement',
      }));

      if (!isVoiceSpeaking && !isADSpeaking && videoRef.current) {
        videoRef.current.volume = Math.max(0, Math.min(1, volume * bgmAdj));
      }
    }

    // Voice Dubbing Trigger
    if (matched && matched.id !== lastSpokenDialogueId.current && dubbing.enabled) {
      lastSpokenDialogueId.current = matched.id;
      speakDubbingVoice(matched);
    }

    // Accessibility Visual Action Audio Description trigger during silent opening or dramatic pause
    if (
      accessibility.enabled && 
      accessibility.audioDescriptionEnabled && 
      !matched && 
      (time < 1.8 || (time > 13.2 && time < 14.8)) && 
      lastSpokenADTimestamp.current < Math.floor(time)
    ) {
      lastSpokenADTimestamp.current = Math.floor(time);
      const desc = sceneInsight.visualActionDescription || currentMovie.defaultActionDescription || '';
      if (desc) speakAudioDescription(desc);
    }
  };

  // Real-time Voice Dubbing with Selected Mood + Celebrity Persona Modulation
  const speakDubbingVoice = (dialogue: DialogueLine) => {
    if (!speechSynthRef.current || isDubbingMuted) return;
    try {
      speechSynthRef.current.cancel();

      // Pick localized line or original depending on targetLang
      let textToSpeak = dialogue.teluguColloquial;
      if (dubbing.targetLang === 'en') {
        textToSpeak = dialogue.englishLiteral;
      } else if (dubbing.targetLang === 'ko') {
        textToSpeak = dialogue.originalText;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      const voices = speechSynthRef.current.getVoices();
      const matchedVoice = voices.find(v => v.lang.includes(dubbing.targetLang) || v.lang.includes('IN') || v.lang.includes('en'));
      if (matchedVoice) utterance.voice = matchedVoice;

      const moodPreset = DUBBING_MOODS.find(m => m.id === dubbing.dubbingMood) || DUBBING_MOODS[0];
      const personaObj = VOICE_PERSONAS.find(p => p.id === dubbing.activePersonaId) || VOICE_PERSONAS[0];
      
      let basePitch = dialogue.vocalPitch;
      let baseRate = dialogue.vocalRate;

      if (!dubbing.emotionCloning) {
        basePitch = 1.0;
        baseRate = 1.0;
      }

      // Blend Persona pitch/rate with Mood preset
      const combinedPitch = basePitch * moodPreset.pitchMultiplier * (personaObj.pitch / 0.85);
      const combinedRate = baseRate * moodPreset.rateMultiplier * (personaObj.rate / 0.95);

      utterance.pitch = Math.max(0.5, Math.min(2.0, combinedPitch));
      utterance.rate = Math.max(0.6, Math.min(2.0, combinedRate));
      utterance.volume = dubbing.voiceVolume / 100;

      utterance.onstart = () => {
        setIsVoiceSpeaking(true);
        if (videoRef.current) {
          const bgmBase = volume * (dubbing.bgmMixLevel / 100);
          const pulseAdj = pulseSync.enabled ? pulseSync.bgmAdjustmentFactor : 1.0;
          videoRef.current.volume = Math.max(0, Math.min(1, bgmBase * pulseAdj));
        }
      };

      utterance.onend = () => {
        setIsVoiceSpeaking(false);
        if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : volume * (pulseSync.enabled ? pulseSync.bgmAdjustmentFactor : 1);
        }
      };

      utterance.onerror = () => {
        setIsVoiceSpeaking(false);
        if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : volume;
        }
      };

      speechSynthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (speechSynthRef.current) speechSynthRef.current.pause();
      setIsPlaying(false);
      syncProgressToCloud();
    } else {
      videoRef.current.play().catch(() => {});
      if (speechSynthRef.current) speechSynthRef.current.resume();
      setIsPlaying(true);
    }
  };

  // Professional-style keyboard controls. Left/right move one approximate 30fps frame.
  useEffect(() => {
    const handlePlayerKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        target?.isContentEditable ||
        ['input', 'textarea', 'select', 'button'].includes(tagName || '')
      ) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (!videoRef.current) return;
        event.preventDefault();
        const frameDuration = 1 / 30;
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextTime = Math.max(
          0,
          Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + direction * frameDuration)
        );
        videoRef.current.pause();
        videoRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        setIsPlaying(false);
      }
    };

    window.addEventListener('keydown', handlePlayerKeyDown);
    return () => window.removeEventListener('keydown', handlePlayerKeyDown);
  }, [isPlaying, duration, syncProgressToCloud]);

  // Seeker
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      lastSpokenDialogueId.current = null;
      if (speechSynthRef.current) speechSynthRef.current.cancel();
      syncProgressToCloud(target);
    }
  };

  // Trigger HUD popup
  const showHUD = (type: 'volume' | 'brightness' | 'subtitles' | 'seek', value: number, label: string) => {
    if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    setGestureHUD({ isActive: true, type, value, label });
    gestureTimeoutRef.current = setTimeout(() => {
      setGestureHUD(prev => ({ ...prev, isActive: false }));
    }, 1200);
  };

  // Gesture Controls (Touch & Mouse Swipes)
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (screenLockState !== 'UNLOCKED') return;
    touchStartPos.current = { x: clientX, y: clientY, time: Date.now() };
    touchStartValues.current = {
      vol: volume,
      bright: brightness,
      time: videoRef.current ? videoRef.current.currentTime : currentTime,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (screenLockState !== 'UNLOCKED') return;
    if (!touchStartPos.current || !videoContainerRef.current) return;
    const rect = videoContainerRef.current.getBoundingClientRect();
    const deltaX = clientX - touchStartPos.current.x;
    const deltaY = touchStartPos.current.y - clientY;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      // Vertical swipe -> adjust audio volume level
      const step = deltaY / 180;
      const newVol = Math.max(0, Math.min(1, touchStartValues.current.vol + step));
      setVolume(newVol);
      setIsMuted(newVol === 0);
      if (videoRef.current) videoRef.current.volume = newVol;
      showHUD('volume', Math.round(newVol * 100), `${Math.round(newVol * 100)}% Volume`);
    } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      // Horizontal touch swipe -> adjust brightness
      const step = (deltaX / 180) * 80;
      const newBright = Math.max(40, Math.min(180, Math.round(touchStartValues.current.bright + step)));
      setBrightness(newBright);
      showHUD('brightness', newBright, `${newBright}% Brightness`);
    }
  };

  // Seek Delta (e.g. for Double-Tap ±10s)
  const handleSeekDelta = (deltaSec: number) => {
    if (screenLockState !== 'UNLOCKED') return;
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration || 35, videoRef.current.currentTime + deltaSec));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    lastSpokenDialogueId.current = null;
    if (speechSynthRef.current) speechSynthRef.current.cancel();
    showHUD('seek', Math.round(newTime), `${deltaSec > 0 ? '+' : ''}${deltaSec}s Seek`);
    syncProgressToCloud(newTime);
  };

  // Double-tap vs Single-tap detection on pointer up
  const handlePointerUp = (clientX: number, clientY: number) => {
    if (screenLockState !== 'UNLOCKED') return;
    if (!touchStartPos.current) return;
    const elapsed = Date.now() - touchStartPos.current.time;
    const dist = Math.hypot(clientX - touchStartPos.current.x, clientY - touchStartPos.current.y);

    if (elapsed < 280 && dist < 15) {
      const now = Date.now();
      const containerRect = videoContainerRef.current?.getBoundingClientRect();
      const isDoubleTap =
        lastTapRef.current &&
        now - lastTapRef.current.time < 350 &&
        Math.hypot(clientX - lastTapRef.current.x, clientY - lastTapRef.current.y) < 60;

      if (isDoubleTap && containerRect) {
        // Double-Tap triggered!
        lastTapRef.current = null;
        const clickXInContainer = clientX - containerRect.left;
        const isLeftSide = clickXInContainer < containerRect.width / 2;

        if (isLeftSide) {
          handleSeekDelta(-10);
          setDoubleTapRipple({ side: 'left', timestamp: now });
        } else {
          handleSeekDelta(10);
          setDoubleTapRipple({ side: 'right', timestamp: now });
        }

        setTimeout(() => {
          setDoubleTapRipple(null);
        }, 800);
      } else {
        // Single-tap candidate: record and toggle play after slight delay if no 2nd tap
        lastTapRef.current = { time: now, x: clientX, y: clientY };
        setTimeout(() => {
          if (lastTapRef.current && lastTapRef.current.time === now) {
            togglePlay();
            lastTapRef.current = null;
          }
        }, 300);
      }
    } else {
      syncProgressToCloud();
    }
    touchStartPos.current = null;
  };

  // Word Tap Language Learning handler
  const handleWordTap = async (rawWord: string, line: DialogueLine) => {
    const cleanWord = rawWord.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'?!]/g, '').trim();
    if (!cleanWord) return;

    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    if (speechSynthRef.current) speechSynthRef.current.cancel();

    setIsLoadingWordDef(true);
    setSelectedWordDef({
      word: cleanWord,
      sourceSentence: line.teluguColloquial,
      meaningInEnglish: 'Analyzing cinematic lexicon...',
      meaningInTargetLang: 'సినిమాటిక్ విశ్లేషణ జరుగుతోంది...',
      contextualUsage: 'Consulting film dramaturg engine for emotional nuance...',
      cinematicExample: '',
    });

    try {
      const res = await fetch('/api/ai/word-definition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          sentence: line.teluguColloquial,
          sourceLang: currentLangObj.name,
          targetLang: 'English',
          movieGenre: currentMovie.genre,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedWordDef(data.data);
      }
    } catch (e) {
      console.warn('Word definition error:', e);
    } finally {
      setIsLoadingWordDef(false);
    }
  };

  // Resume Movie from Recently Watched Firestore list
  const handleResumeFromRecentlyWatched = (movieId: string, progressSeconds: number) => {
    const movieIdx = MOVIE_SAMPLES.findIndex(m => m.id === movieId);
    if (movieIdx >= 0) {
      setSelectedMovieIndex(movieIdx);
    }
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = progressSeconds;
        setCurrentTime(progressSeconds);
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 150);
  };

  // Playback Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    showHUD('subtitles', Math.round(speed * 100), `${speed}x Speed`);
  };

  // Manual Sync Offset Nudge
  const handleNudgeOffset = (deltaMs: number) => {
    const nextOffset = (dubbing.driftOffsetMs || 0) + deltaMs;
    setDubbing(prev => ({ ...prev, driftOffsetMs: nextOffset }));
    setDriftState(prev => ({ ...prev, calibratedOffsetMs: nextOffset }));
    showHUD('subtitles', Math.abs(nextOffset), `Offset: ${nextOffset > 0 ? '+' : ''}${nextOffset}ms`);
    setTimeout(() => syncProgressToCloud(), 300);
  };

  // Switch Dubbing Mood
  const handleMoodSelect = (mood: DubbingMood) => {
    setDubbing(prev => ({ ...prev, dubbingMood: mood }));
    const preset = DUBBING_MOODS.find(m => m.id === mood);
    showHUD('subtitles', 100, `Dubbing Mood: ${preset?.name}`);
    if (activeDialogue && isPlaying) {
      speakDubbingVoice(activeDialogue);
    }
    setTimeout(() => syncProgressToCloud(), 300);
  };

  // Switch Pulse Sync Mode
  const handlePulseSyncModeChange = (mode: PulseSyncMode) => {
    let focus = 85;
    let bpm = 75;
    let bgmAdj = 1.0;
    let suggestion = '';

    if (mode === 'deep_focus') {
      focus = 95;
      bpm = 68;
      bgmAdj = 0.80;
      suggestion = 'Deep Focus: Lowering background music by 20% to isolate speech frequencies';
    } else if (mode === 'ambient') {
      focus = 65;
      bpm = 78;
      bgmAdj = 1.20;
      suggestion = 'Ambient Immersion: Amplifying atmospheric score and foley by 20%';
    } else if (mode === 'late_night') {
      focus = 50;
      bpm = 62;
      bgmAdj = 0.85;
      suggestion = 'Late-Night Relaxation: Softening dialogue treble and warming screen luminance';
    } else {
      focus = 86;
      bpm = 74;
      bgmAdj = 0.88;
      suggestion = 'AI Adaptive: Dynamically modulating BGM ducking based on real-time tension';
    }

    setPulseSync(prev => ({
      ...prev,
      mode,
      inferredFocusLevel: focus,
      heartbeatBpm: bpm,
      bgmAdjustmentFactor: bgmAdj,
      pacingSuggestion: suggestion,
    }));

    if (videoRef.current && !isVoiceSpeaking && !isADSpeaking) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume * bgmAdj));
    }
    showHUD('subtitles', focus, `Pulse Sync: ${mode.toUpperCase().replace('_', ' ')}`);
    setTimeout(() => syncProgressToCloud(), 300);
  };

  // Compute CSS Filter for Remaster + Picture Boost + Gesture Brightness + Late Night Warmth
  const getVideoFilterStyle = () => {
    const brightFactor = brightness / 100;
    const isLateNight = pulseSync.enabled && pulseSync.mode === 'late_night';
    const sepiaWarmth = isLateNight ? 'sepia(18%)' : '';

    let boostContrast = 1.0;
    let boostSaturate = 1.0;
    let boostBrightness = 1.0;

    switch (pictureBoost) {
      case 'hdr_cinema':
        boostContrast = 1.25;
        boostSaturate = 1.30;
        boostBrightness = 1.05;
        break;
      case 'oled_black':
        boostContrast = 1.40;
        boostSaturate = 1.15;
        boostBrightness = 0.95;
        break;
      case 'vivid_pop':
        boostContrast = 1.15;
        boostSaturate = 1.45;
        boostBrightness = 1.08;
        break;
      case 'crisp_sharp':
        boostContrast = 1.35;
        boostSaturate = 1.10;
        boostBrightness = 1.02;
        break;
      case 'none':
      default:
        break;
    }

    if (!remaster.enabled) {
      return `brightness(${brightFactor * boostBrightness}) contrast(${boostContrast}) saturate(${boostSaturate}) ${sepiaWarmth}`.trim();
    }
    const nightBoostFactor = 1 + (remaster.nightBoost * 0.005);
    const contrastFactor = (1 + (remaster.contrastBoost * 0.008)) * boostContrast;
    const saturateFactor = (1 + (remaster.hdrVibrancy * 0.009)) * boostSaturate;
    const finalBrightness = brightFactor * nightBoostFactor * boostBrightness;
    return `brightness(${finalBrightness}) contrast(${contrastFactor}) saturate(${saturateFactor}) ${sepiaWarmth}`.trim();
  };

  // Subtitle Style Class resolver for Accessibility High-Contrast Modes
  const getSubtitleContainerClass = () => {
    if (!accessibility.enabled) {
      return 'bg-black/85 backdrop-blur-md text-white border border-slate-700/60 shadow-2xl';
    }
    switch (accessibility.highContrastMode) {
      case 'high_contrast_yellow':
        return 'bg-black text-yellow-300 font-extrabold border-2 border-yellow-400 shadow-[0_0_20px_rgba(0,0,0,1)]';
      case 'high_contrast_cyan':
        return 'bg-black text-cyan-300 font-extrabold border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,0,0,1)]';
      case 'large_dyslexic':
        return 'bg-black/95 text-white font-sans tracking-widest border-2 border-white shadow-2xl';
      default:
        return 'bg-black/90 backdrop-blur-md text-white border border-slate-600 shadow-2xl';
    }
  };

  const getSubtitleTextSizeClass = () => {
    switch (accessibility.fontSize) {
      case 'large':
        return 'text-lg sm:text-xl';
      case 'xlarge':
        return 'text-xl sm:text-2xl';
      default:
        return 'text-base sm:text-lg';
    }
  };

  // Current active language object
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === dubbing.targetLang) || SUPPORTED_LANGUAGES[0];

  // The current enhancement is the player's live CSS remaster/filter pipeline,
  // not a server-side AI model job. Pulse only while playback + enhancement are active.
  const isEnhancementActive = remaster.enabled && isPlaying;

  return (
    <div id="cinemorph-player" className="w-full scroll-mt-20">
      {/* Cinema Session Manager: live session identity and service configuration status */}
      <section className="mb-4 rounded-2xl border border-amber-500/20 bg-slate-950/90 p-4 shadow-lg" aria-label="Cinema Session Manager">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300"><Film className="h-4 w-4" /> Active Cinema Session</div>
            <h2 className="mt-1 truncate text-sm font-semibold text-white">{cinemaSession.movieName}</h2>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{cinemaSession.id}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Session state</p>
            <p className="text-xs font-bold text-slate-200">{cinemaSession.status.toUpperCase()}</p>
            <p className="font-mono text-[10px] text-slate-400">{formatSessionTime(cinemaSession.playbackSeconds)} / {formatSessionTime(cinemaSession.durationSeconds)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-900 px-3 py-2"><p className="text-[10px] text-slate-500">Playback</p><p className="mt-1 text-xs font-semibold text-emerald-300">{sessionStatus === 'ready' ? 'Video ready' : sessionStatus === 'error' ? 'Playback error' : 'Preparing'}</p></div>
          <div className="rounded-lg bg-slate-900 px-3 py-2"><p className="text-[10px] text-slate-500">Gemini setup</p><p className="mt-1 text-xs font-semibold text-slate-200">{aiSetupStatus === 'checking' ? 'Checking…' : aiSetupStatus === 'configured' ? 'API key configured' : aiSetupStatus === 'missing' ? 'API key missing' : 'Server unreachable'}</p></div>
          <div className="rounded-lg bg-slate-900 px-3 py-2"><p className="text-[10px] text-slate-500">AI endpoints</p><p className="mt-1 text-xs font-semibold text-slate-200">{aiSetupStatus === 'checking' || aiSetupStatus === 'unreachable' ? 'Not verified' : `${aiEndpointCount} registered`}</p></div>
          <div className="rounded-lg bg-slate-900 px-3 py-2"><p className="text-[10px] text-slate-500">Cloud sync</p><p className="mt-1 text-xs font-semibold text-slate-200">{currentUser ? 'Authenticated' : 'Not connected'}</p></div>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">AI endpoint registration is not proof of full movie analysis. Local playback remains independent of Gemini and cloud availability.</p>
      </section>
      {/* Top Status & Sync Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Featured Scene:
          </span>
          <span
            title={sessionError || (sessionStatus === 'ready' ? 'Video is ready to play' : 'Preparing selected video')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
              sessionStatus === 'ready'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : sessionStatus === 'error'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}
          >
            {sessionStatus === 'ready' ? 'Session Ready' : sessionStatus === 'error' ? 'Video Error' : 'Preparing Session'}
          </span>
          {MOVIE_SAMPLES.map((movie, idx) => (
            <button
              key={movie.id}
              onClick={() => {
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
                setCurrentTime(0);
                setSessionStatus('loading');
                setSessionError(null);
                setLocalVideoUrl(null);
                setLocalVideoName(null);
                setSelectedMovieIndex(idx);
                rememberRecentMovie(idx);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedMovieIndex === idx
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {movie.originalLanguage}: {movie.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Feature Switches & AI Overlays Strip in Header */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickSettingsOpen(open => !open)}
              aria-expanded={isQuickSettingsOpen}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${isQuickSettingsOpen ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-400'}`}
            >
              Quick Settings
            </button>
            {isQuickSettingsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Quick Settings</h3>
                  <button type="button" onClick={() => setIsQuickSettingsOpen(false)} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Close quick settings"><X className="h-4 w-4" /></button>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-800 py-3">
                  <span className="text-xs font-semibold text-slate-200">Dubbing Mode</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={dubbing.enabled}
                    onChange={event => setDubbing(previous => ({ ...previous, enabled: event.target.checked }))}
                    className="h-4 w-4 accent-amber-400"
                  />
                </label>
                <div className="pt-3">
                  <p className="mb-2 text-xs font-semibold text-slate-200">Subtitle Language</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ code: 'te', label: 'Telugu' }, { code: 'en', label: 'English' }] as const).map(language => (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => handleQuickLanguageSelect(language.code as SupportedLanguage)}
                        aria-pressed={dubbing.targetLang === language.code}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${dubbing.targetLang === language.code ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hands-Free Voice AI Control Overlay */}
          <VoiceControlOverlay
            isPlaying={isPlaying}
            onPlay={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }}
            onPause={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }}
            onSeekDelta={handleSeekDelta}
            onTranslate={handleQuickLanguageSelect}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleCoWatch={() => setIsCoWatchOpen(prev => !prev)}
            onToggleInsight={() => setIsInsightSidebarOpen(prev => !prev)}
            onSemanticSearch={(query) => {
              showHUD('subtitles', 100, `Searching: "${query}"`);
            }}
          />

          <button
            onClick={handleConnectCloud}
            disabled={!!currentUser || isConnectingCloud}
            className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-300 text-xs font-semibold disabled:opacity-60"
            title="Cloud sync is optional; local playback does not depend on it"
          >
            {currentUser ? 'Cloud Connected' : isConnectingCloud ? 'Connecting…' : 'Connect Cloud'}
          </button>

          {/* Real-Time Co-Watch Party Button */}
          <button
            onClick={() => setIsCoWatchOpen(true)}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all hover:scale-105"
            title="Open Co-Watch Party Drawer with Live Chat & Synced Playback"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Co-Watch Party</span>
          </button>

          {/* Subtitle Drift Recalibration Status Pill */}
          <button
            onClick={() => setActiveControlTab('drift')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              driftState.calibratedOffsetMs !== 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
            title="Drift Synchronization"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              Drift: {driftState.calibratedOffsetMs !== 0 ? `${driftState.calibratedOffsetMs}ms (Locked)` : '+380ms (Lead)'}
            </span>
          </button>

          {/* Pulse Sync Quick Pill */}
          <button
            onClick={() => {
              setPulseSync(prev => ({ ...prev, enabled: !prev.enabled }));
              showHUD('subtitles', pulseSync.inferredFocusLevel, `Pulse Sync: ${!pulseSync.enabled ? 'ON' : 'OFF'}`);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              pulseSync.enabled 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="AI Adaptive Pacing & Focus Sync"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Pulse Sync {pulseSync.enabled ? `${pulseSync.heartbeatBpm} BPM` : 'Off'}</span>
          </button>

          {/* Accessibility Quick Pill */}
          <button
            onClick={() => {
              setAccessibility(prev => ({ ...prev, enabled: !prev.enabled }));
              showHUD('subtitles', 100, `Accessibility Mode: ${!accessibility.enabled ? 'ON' : 'OFF'}`);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              accessibility.enabled 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="High-Contrast Subtitles & Audio Description"
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span>A11y {accessibility.enabled ? 'On' : 'Off'}</span>
          </button>

          {/* Cloud Sync Status */}
          <div className="flex items-center gap-1.5 font-mono-num text-[11px]">
            {isSyncing ? (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Cloud Synced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movies: one-click restart/re-processing of the last three sample titles */}
      {recentMovieIndices.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Recent Movies</h3>
            <span className="text-[10px] text-slate-500">Last 3 opened · stored on this device</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMovieIndices.map(index => {
              const movie = MOVIE_SAMPLES[index];
              if (!movie) return null;
              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => handleReprocessRecentMovie(index)}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left transition hover:border-amber-400 hover:bg-slate-800"
                  title={`Reopen and restart ${movie.title}`}
                >
                  <Film className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="max-w-[180px] truncate text-xs font-semibold text-white">{movie.title}</span>
                  <span className="shrink-0 text-[10px] font-bold text-amber-300">Reprocess ↻</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 📊 VIEWING METRICS DASHBOARD ('TIME SPENT WATCHING' & FIRESTORE CLOUD SYNC) */}
      <div className="mb-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Viewing Metrics Dashboard</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider font-mono-num">
                  Live Cloud Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated cumulative viewing time across all stored Firestore user records
              </p>
            </div>
          </div>

          {/* Formatted Total Viewing Time Counter Pill */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-num">
                Total Time Spent Watching
              </span>
              <span className="text-base font-extrabold text-amber-400 font-mono-num">
                {(() => {
                  const currentSessionWatchSec = currentTime || 0;
                  const isCurrentMovieInRecords = allWatchRecords.some(r => r.movieId === currentMovie.id);
                  const totalSec = Math.round(cumulativeWatchSeconds + (isCurrentMovieInRecords ? 0 : currentSessionWatchSec));
                  const hours = Math.floor(totalSec / 3600);
                  const mins = Math.floor((totalSec % 3600) / 60);
                  const secs = totalSec % 60;
                  if (hours > 0) {
                    return `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
                  }
                  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
                })()}
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" title="Live Firestore Connection" />
          </div>
        </div>

        {/* Completion Progress Meter & Live Firestore Sync Indicators */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              Current Scene Completion ({Math.min(100, Math.round((currentTime / (duration || 35)) * 100))}%)
            </span>
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{allWatchRecords.length || 1} Firestore Record{allWatchRecords.length === 1 ? '' : 's'} Stored</span>
              {lastSyncedTime && <span className="text-slate-500">• Synced {lastSyncedTime}</span>}
            </span>
          </div>

          {/* Gradient Completion Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${Math.max(2, Math.min(100, Math.round((currentTime / (duration || 35)) * 100)))}%` }}
            />
          </div>
        </div>

        {/* 📊 RECHARTS-STYLE 7-DAY WEEKLY VIEWING TRENDS CHART */}
        <div className="mt-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>7-Day Time Spent Watching Trend (Recharts Analytics)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono-num">
              Weekly Total: {weeklyViewingData.reduce((a, b) => a + b.minutes, 0)} mins
            </span>
          </div>

          {/* Recharts SVG Chart Area */}
          <div className="h-28 w-full flex items-end justify-between gap-2 pt-4 px-2">
            {weeklyViewingData.map((d, i) => {
              const barHeightPercent = Math.max(12, Math.round((d.minutes / maxWeeklyMinutes) * 100));
              const isToday = i === weeklyViewingData.length - 1;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 bg-slate-900 border border-amber-400/50 rounded text-[10px] font-bold text-amber-300 font-mono-num whitespace-nowrap z-30 shadow-lg pointer-events-none">
                    {d.date}: {d.minutes}m
                  </div>

                  <div className="w-full flex justify-center items-end h-full">
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-amber-500 to-rose-500 shadow-md shadow-amber-500/30'
                          : 'bg-gradient-to-t from-slate-800 to-amber-500/80 hover:from-amber-600 hover:to-amber-400'
                      }`}
                      style={{ height: `${barHeightPercent}%` }}
                    />
                  </div>

                  <span className={`text-[10px] font-mono-num font-bold ${isToday ? 'text-amber-400' : 'text-slate-400'}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🔍 AI SEMANTIC SCENE SEARCH BAR */}
      <div className="mb-4">
        <SemanticSceneSearchBar
          currentMovie={currentMovie}
          currentTime={currentTime}
          onJumpToTime={(seconds) => {
            if (videoRef.current) {
              videoRef.current.currentTime = seconds;
              setCurrentTime(seconds);
              syncProgressToCloud(seconds);
            }
          }}
        />
      </div>

      {/* Resume Progress Alert Banner */}
      {resumePrompt && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Previous session saved at <strong>{Math.floor(resumePrompt.seconds / 60)}:{Math.floor(resumePrompt.seconds % 60).toString().padStart(2, '0')}</strong> ({resumePrompt.percent}%).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApplyResume}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
            >
              Resume Playback
            </button>
            <button
              onClick={() => setResumePrompt(null)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Cinema Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Video Viewport & Controls */}
        <div className={`${isInsightSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4 transition-all duration-300`}>
          {/* 🎞️ CINEMATIC FILM STRIP INFORMATION PANEL */}
          <div className="w-full bg-slate-950/90 border border-amber-500/30 rounded-2xl p-3.5 shadow-xl relative overflow-hidden backdrop-blur-md">
            {/* Film Sprocket Holes Top & Bottom Decoration */}
            <div className="absolute top-1 left-0 right-0 flex justify-between px-3 opacity-30 pointer-events-none">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`top-${i}`} className="w-2.5 h-1.5 bg-amber-400/80 rounded-sm" />
              ))}
            </div>
            <div className="absolute bottom-1 left-0 right-0 flex justify-between px-3 opacity-30 pointer-events-none">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`bot-${i}`} className="w-2.5 h-1.5 bg-amber-400/80 rounded-sm" />
              ))}
            </div>

            <div className="py-1 px-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs shadow-md">
                  <Film className="w-3.5 h-3.5" />
                  <span>FILM STRIP #{selectedMovieIndex + 1}</span>
                </div>
                <SyncService
                  selectedFileName={localVideoName}
                  onVideoSelected={handleLocalVideoSelect}
                  syncStatus={sessionStatus}
                />

                {/* Genre Tag */}
                <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono-num">Genre:</span>
                  <span>{currentMovie.genre}</span>
                </div>

                {/* Duration Tag */}
                <div className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono-num">Duration:</span>
                  <span>{Math.floor((duration || currentMovie.duration || 35) / 60)}m {Math.floor((duration || currentMovie.duration || 35) % 60)}s</span>
                </div>

                {/* Original Language Tag */}
                <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono-num">Original Lang:</span>
                  <span>{currentMovie.originalLanguage}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-num">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300/90 font-bold">4K HDR Remaster</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300/90 font-bold">24 FPS Master</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300/90 font-bold">5.1 Acoustic</span>
              </div>
            </div>
          </div>
          <div
            ref={videoContainerRef}
            className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl select-none touch-none group cursor-pointer"
            onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (e.changedTouches.length > 0) {
                handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
              }
            }}
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => {
              if (e.buttons === 1) handlePointerMove(e.clientX, e.clientY);
            }}
            onMouseUp={(e) => handlePointerUp(e.clientX, e.clientY)}
          >
            {/* The Main Video Stream */}
            <video
              ref={videoRef}
              src={activeVideoUrl}
              key={activeVideoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => { setIsPlaying(true); updateSession({ status: 'playing' }); }}
              onPause={() => { setIsPlaying(false); updateSession({ status: videoRef.current?.ended ? 'ended' : 'paused' }); }}
              preload="metadata"
              onLoadStart={() => {
                setSessionStatus('loading');
                setSessionError(null);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  const actualDuration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
                  setDuration(actualDuration || 35);
                  updateSession({ durationSeconds: actualDuration });
                }
              }}
              onProgress={() => {
                const video = videoRef.current;
                if (!video || !video.duration || !video.buffered.length) return;
                const end = video.buffered.end(video.buffered.length - 1);
                setBufferedPercent(Math.min(100, (end / video.duration) * 100));
              }}
              onCanPlay={() => { setSessionStatus('ready'); updateSession({ status: 'ready' }); }}
              onError={() => {
                setSessionStatus('error');
                setSessionError('This video source could not be loaded. Choose another movie or check the video URL.');
                setIsPlaying(false);
                updateSession({ status: 'error' });
              }}
              onEnded={() => {
                setIsPlaying(false);
                updateSession({ status: 'ended' });
                syncProgressToCloud();
              }}
              className={`w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${isAudioOnly ? 'opacity-0' : 'opacity-100'}`}
              style={{
                filter: remaster.enabled && !remaster.showSplitSlider ? getVideoFilterStyle() : `brightness(${brightness / 100})`,
              }}
              playsInline
            />

            {/* Top Toolbar Overlay on Video (Quick Language, NPU Telemetry, Gestures, Transcript, Floating Mini-Menu) */}
            <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQuickLangMenuOpen(!isQuickLangMenuOpen);
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-xl hover:bg-slate-900 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLangObj.flag} {currentLangObj.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isQuickLangMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Floating Language Dropdown Menu */}
                  {isQuickLangMenuOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-10 left-0 w-64 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-scale-in"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-num border-b border-slate-800">
                        Switch Dubbing Language (Real-Time)
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const isSelected = dubbing.targetLang === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => handleQuickLanguageSelect(lang.code)}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-amber-400 text-slate-950 font-bold'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>({lang.native})</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-slate-950" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 💬 CC SUBTITLE ON/OFF TOGGLE BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (screenLockState !== 'UNLOCKED') return;
                    const nextMode = dubbing.subtitleMode === 'off' ? 'smart-glance' : 'off';
                    setDubbing(prev => ({ ...prev, subtitleMode: nextMode }));
                    showHUD('subtitles', 100, `Subtitles ${nextMode !== 'off' ? 'ON' : 'OFF'}`);
                  }}
                  className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all ${
                    dubbing.subtitleMode !== 'off'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20 shadow-lg'
                      : 'bg-slate-950/85 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                  title="Toggle Subtitles ON/OFF (CC)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{dubbing.subtitleMode !== 'off' ? 'CC ON' : 'CC OFF'}</span>
                </button>

                {/* NPU Telemetry Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPerfOverlayOpen(!isPerfOverlayOpen);
                  }}
                  className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all ${
                    isPerfOverlayOpen
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20 shadow-lg'
                      : 'bg-slate-950/85 text-slate-300 border-slate-700 hover:border-amber-400/50'
                  }`}
                  title="Toggle Real-Time NPU Performance Telemetry (Audio Latency, FPS, NPU Load)"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">NPU Telemetry</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGestureGuideOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 shadow-xl transition-colors hover:border-amber-400/50"
                  title="Gesture & Interaction Guide"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Gestures</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTranscriptOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-amber-300 text-xs font-medium flex items-center gap-1.5 shadow-xl transition-colors hover:border-amber-400/50"
                  title="Interactive Scene Transcript"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Transcript</span>
                </button>

                {/* Lock Button (Two-Step Screen Lock) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreenLockState('LOCKED_HIDDEN');
                    showHUD('subtitles', 100, 'Screen Locked (Two-Step Protection Active)');
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all hover:bg-slate-900"
                  title="Activate Two-Step Screen Lock"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Lock Screen</span>
                </button>

                {/* 🎛️ FLOATING QUICK TOGGLES MINI-MENU */}
                <div className="relative pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMiniMenuOpen(!isMiniMenuOpen);
                    }}
                    className={`p-2 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center justify-center transition-all ${
                      isMiniMenuOpen
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30 shadow-lg scale-110'
                        : 'bg-slate-950/85 text-slate-300 border-slate-700 hover:border-amber-400'
                    }`}
                    title="Floating Quick Toggles Mini-Menu (Mute Dubbing, Subtitle Size, Upscaling)"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  {isMiniMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-10 right-0 w-64 bg-slate-950/95 backdrop-blur-2xl border border-amber-500/40 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 animate-scale-in"
                    >
                      <div className="px-1 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono-num border-b border-slate-800 flex items-center justify-between">
                        <span>Quick Playback Controls</span>
                        <button onClick={() => setIsMiniMenuOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                      </div>

                      {/* Toggle 1: Mute Dubbing */}
                      <button
                        onClick={() => {
                          setIsDubbingMuted(!isDubbingMuted);
                          showHUD('volume', isDubbingMuted ? 90 : 0, `Dubbing Voice: ${!isDubbingMuted ? 'MUTED' : 'ACTIVE'}`);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                          isDubbingMuted
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isDubbingMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                          <span>Mute Dubbing Voice</span>
                        </span>
                        <span className="text-[10px] font-mono-num font-bold">{isDubbingMuted ? 'MUTED' : 'ACTIVE'}</span>
                      </button>

                      {/* Toggle 2: Subtitle Size */}
                      <button
                        onClick={() => {
                          const nextSize: Record<string, 'normal' | 'large' | 'xlarge'> = {
                            normal: 'large',
                            large: 'xlarge',
                            xlarge: 'normal'
                          };
                          const newSize = nextSize[accessibility.fontSize] || 'large';
                          setAccessibility(prev => ({ ...prev, fontSize: newSize, enabled: true }));
                          showHUD('subtitles', 100, `Subtitle Size: ${newSize.toUpperCase()}`);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Type className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Subtitle Font Size</span>
                        </span>
                        <span className="text-[10px] font-mono-num font-bold text-amber-300 uppercase">{accessibility.fontSize}</span>
                      </button>

                      {/* Toggle 3: Toggle Upscaling / Remaster */}
                      <button
                        onClick={() => {
                          setRemaster(prev => ({ ...prev, enabled: !prev.enabled }));
                          showHUD('brightness', remaster.enabled ? 0 : 100, `4K AI Upscaling: ${!remaster.enabled ? 'ON' : 'OFF'}`);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${isEnhancementActive ? 'animate-pulse ring-1 ring-amber-300/60' : ''} ${
                          remaster.enabled
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Enhance</span>
                        </span>
                        <span className="text-[10px] font-mono-num font-bold">{remaster.enabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ⚡ REAL-TIME NPU PERFORMANCE TELEMETRY OVERLAY ON VIDEO */}
            {isPerfOverlayOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-16 left-4 z-40 p-3 bg-slate-950/90 backdrop-blur-xl border border-amber-400/50 rounded-2xl shadow-2xl flex flex-col gap-2 font-mono-num text-xs animate-scale-in pointer-events-auto max-w-[280px]"
              >
                <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <Cpu className="w-3.5 h-3.5" />
                    NPU Telemetry Engine
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold">STREAMING</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-medium">Latency</span>
                    <span className="text-xs font-extrabold text-emerald-300 mt-0.5">{audioLatencyMs}ms</span>
                  </div>

                  <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-medium">Frame Rate</span>
                    <span className="text-xs font-extrabold text-amber-300 mt-0.5">{fpsProcessing.toFixed(1)} FPS</span>
                  </div>

                  <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-medium">NPU Load</span>
                    <span className="text-xs font-extrabold text-indigo-300 mt-0.5">{npuLoadPercent}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 🔒 TWO-STEP SCREEN LOCK INTERCEPTOR & UNLOCK OVERLAY */}
            {screenLockState !== 'UNLOCKED' && (
              <div
                className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (screenLockState === 'LOCKED_HIDDEN') {
                    // First Touch: Reveal ONLY the Unlock button
                    setScreenLockState('LOCKED_SHOW_UNLOCK');
                    scheduleUnlockButtonAutoHide();
                  } else if (screenLockState === 'LOCKED_SHOW_UNLOCK') {
                    // Subsequent touch elsewhere on locked screen: Reset timer, keep locked
                    scheduleUnlockButtonAutoHide();
                  }
                }}
              >
                {/* Revealed ONLY when in LOCKED_SHOW_UNLOCK state */}
                {screenLockState === 'LOCKED_SHOW_UNLOCK' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (lockAutoHideTimeoutRef.current) clearTimeout(lockAutoHideTimeoutRef.current);
                      setScreenLockState('UNLOCKED');
                      showHUD('subtitles', 100, 'Screen Unlocked');
                    }}
                    className="px-6 py-3.5 bg-slate-950/95 hover:bg-slate-900 text-white border-2 border-amber-400 rounded-full font-extrabold text-sm shadow-2xl flex items-center gap-2.5 animate-scale-in cursor-pointer transition-transform hover:scale-105"
                  >
                    <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>🔓 Tap to Unlock Screen</span>
                  </button>
                )}
              </div>
            )}
            {/* Split Screen Overlay When Remaster Split is ON */}
            {remaster.enabled && remaster.showSplitSlider && (
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  clipPath: `polygon(${remaster.splitPosition}% 0, 100% 0, 100% 100%, ${remaster.splitPosition}% 100%)`
                }}
              >
                <div 
                  className="w-full h-full object-cover"
                  style={{
                    filter: getVideoFilterStyle(),
                  }}
                >
                  <div className="absolute top-4 right-4 bg-amber-500/90 backdrop-blur-md text-slate-950 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider font-mono-num flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3 fill-slate-950" />
                    <span>4K AI Remaster</span>
                  </div>
                </div>
              </div>
            )}

            {/* Split Slider Line & Curtain Controller */}
            {remaster.enabled && remaster.showSplitSlider && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-auto cursor-ew-resize flex items-center justify-center"
                style={{ left: `${remaster.splitPosition}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const container = videoContainerRef.current;
                  if (!container) return;
                  const handleMove = (ev: MouseEvent) => {
                    const rect = container.getBoundingClientRect();
                    const newPos = Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100));
                    setRemaster(prev => ({ ...prev, splitPosition: newPos }));
                  };
                  const handleUp = () => {
                    window.removeEventListener('mousemove', handleMove);
                    window.removeEventListener('mouseup', handleUp);
                  };
                  window.addEventListener('mousemove', handleMove);
                  window.addEventListener('mouseup', handleUp);
                }}
              >
                <div className="w-0.5 h-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <div className="absolute w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border border-white/50 text-[10px] font-bold">
                  ↔
                </div>
              </div>
            )}

            {/* GESTURE FEEDBACK HUD (VOLUME / BRIGHTNESS / SEEK) */}
            {gestureHUD.isActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-scale-in">
                  {gestureHUD.type === 'volume' && (
                    <>
                      <Volume2 className="w-7 h-7 text-amber-400" />
                      <span className="text-sm font-bold text-white font-mono-num">{gestureHUD.label}</span>
                      <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-amber-400" style={{ width: `${gestureHUD.value}%` }} />
                      </div>
                    </>
                  )}
                  {gestureHUD.type === 'brightness' && (
                    <>
                      <Sun className="w-7 h-7 text-amber-300" />
                      <span className="text-sm font-bold text-white font-mono-num">{gestureHUD.label}</span>
                      <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-amber-300" style={{ width: `${Math.min(100, (gestureHUD.value / 180) * 100)}%` }} />
                      </div>
                    </>
                  )}
                  {gestureHUD.type === 'seek' && (
                    <>
                      <Compass className="w-7 h-7 text-cyan-400" />
                      <span className="text-sm font-bold text-white font-mono-num">{gestureHUD.label}</span>
                    </>
                  )}
                  {gestureHUD.type === 'subtitles' && (
                    <>
                      <Radio className="w-7 h-7 text-amber-400" />
                      <span className="text-sm font-bold text-white font-mono-num">{gestureHUD.label}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Active Voice Dubbing Badge with Mood + Persona */}
            {dubbing.enabled && isVoiceSpeaking && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-full flex items-center gap-2 pointer-events-none shadow-xl animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-300 font-mono-num">
                  Live Voice Dub ({currentLangObj.name} · {dubbing.dubbingMood.toUpperCase()})
                </span>
              </div>
            )}

            {/* Active Audio Description (AD) Visual Indicator */}
            {accessibility.audioDescriptionEnabled && isADSpeaking && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-indigo-950/90 backdrop-blur-md border border-indigo-500/50 px-3.5 py-1.5 rounded-full flex items-center gap-2 pointer-events-none shadow-xl animate-pulse">
                <Ear className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-xs font-semibold text-indigo-200 font-mono-num">
                  Audio Description Active (Narrating Scene Action)
                </span>
              </div>
            )}

            {/* Pulse Sync Active Focus Indicator on Video */}
            {pulseSync.enabled && (
              <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md border border-rose-500/30 px-3 py-1 rounded-full flex items-center gap-2 pointer-events-none text-[11px] font-mono-num text-rose-300">
                <Activity className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>Focus: {pulseSync.inferredFocusLevel}% · {pulseSync.heartbeatBpm} BPM</span>
              </div>
            )}

            {/* SUBTITLE HUD (Supports Standard, High-Contrast Modes & Calibrated Timestamps) */}
            {dubbing.subtitleMode !== 'off' && activeDialogue && (
              <div className="absolute bottom-16 left-6 right-6 z-20 flex flex-col items-center pointer-events-none">
                <div className={`pointer-events-auto max-w-xl text-center px-5 py-3 rounded-2xl transition-all ${getSubtitleContainerClass()}`}>
                  {/* Hearing-Impaired Sound Cue (SDH) */}
                  {accessibility.enabled && accessibility.soundCuesEnabled && activeDialogue.soundCue && (
                    <div className="text-[11px] font-bold text-amber-300/95 mb-1 tracking-wide">
                      {activeDialogue.soundCue}
                    </div>
                  )}

                  <div className="text-[11px] font-medium opacity-85 mb-0.5 flex items-center justify-center gap-2">
                    <span className="font-bold">{activeDialogue.speaker}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeDialogue.originalLang}</span>
                    <span aria-hidden="true">·</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-mono-num">
                      {currentLangObj.name}
                    </span>
                    {driftState.calibratedOffsetMs !== 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono-num font-bold">
                        [Sync: {driftState.calibratedOffsetMs}ms]
                      </span>
                    )}
                  </div>

                  {/* Primary Target Language Dialogue with Interactive Word Tap */}
                  <p className={`font-bold tracking-wide leading-snug ${getSubtitleTextSizeClass()} flex flex-wrap justify-center gap-x-1.5 gap-y-0.5`}>
                    {(dubbing.targetLang === 'en' ? activeDialogue.englishLiteral : activeDialogue.teluguColloquial)
                      .split(' ')
                      .map((wordToken, wIdx) => (
                        <span
                          key={wIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordTap(wordToken, activeDialogue);
                          }}
                          className="hover:text-amber-300 hover:underline hover:bg-amber-400/20 px-1 py-0.5 rounded transition-colors cursor-pointer inline-block"
                          title="Tap word for meaning, slang & language learning"
                        >
                          {wordToken}
                        </span>
                      ))}
                  </p>

                  <p className="text-xs opacity-75 italic mt-0.5">
                    "{activeDialogue.teluguTransliteration}"
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlangInfo(activeDialogue);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3 text-amber-400" />
                      <span>Cultural Slang Decoder</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstWord = (dubbing.targetLang === 'en' ? activeDialogue.englishLiteral : activeDialogue.teluguColloquial).split(' ')[0];
                        if (firstWord) handleWordTap(firstWord, activeDialogue);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700/80 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span>Word Tap Learning</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Double Tap Seek Ripple Indicator (±10s) */}
            {doubleTapRipple && (
              <div className={`absolute top-0 bottom-0 ${doubleTapRipple.side === 'left' ? 'left-0 w-1/2' : 'right-0 w-1/2'} flex items-center justify-center pointer-events-none z-30 animate-scale-in`}>
                <div className="w-24 h-24 rounded-full bg-slate-950/85 border border-amber-400/80 backdrop-blur-md flex flex-col items-center justify-center text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  {doubleTapRipple.side === 'left' ? (
                    <>
                      <Rewind className="w-8 h-8 fill-current" />
                      <span className="text-[11px] font-bold font-mono-num mt-1">-10 SEC</span>
                    </>
                  ) : (
                    <>
                      <FastForward className="w-8 h-8 fill-current" />
                      <span className="text-[11px] font-bold font-mono-num mt-1">+10 SEC</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Play/Pause Trigger */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
              >
                <div className="w-16 h-16 rounded-full bg-amber-400/90 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Smart Scene Summary Ticker Bar */}
          <SmartSceneTickerBar
            movieTitle={currentMovie.titleEnglish}
            currentTime={currentTime}
            genre={currentMovie.genre}
            dialogues={movieDialogues}
            isVisible={isSmartTickerVisible}
            onToggleVisible={() => setIsSmartTickerVisible(!isSmartTickerVisible)}
          />

          {/* Transport Controls Bar */}
          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
            {/* Interactive timeline: buffered range, played range and precise seeking */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-mono-num w-10">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
              </span>
              <div className="relative flex-1 h-5 flex items-center">
                <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-slate-400/70" style={{ width: `${bufferedPercent}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-amber-400" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
                {loopStart !== null && <div className="absolute h-3 w-1 bg-emerald-400 rounded" style={{ left: `${duration ? loopStart / duration * 100 : 0}%` }} />}
                {loopEnd !== null && <div className="absolute h-3 w-1 bg-rose-400 rounded" style={{ left: `${duration ? loopEnd / duration * 100 : 0}%` }} />}
                <input aria-label="Video timeline" type="range" min="0" max={duration || 35} step="0.01" value={currentTime} onChange={handleSeek} className="relative z-10 w-full h-5 appearance-none cursor-pointer bg-transparent accent-amber-400" />
              </div>
              <span className="text-xs text-slate-300 font-mono-num w-10 text-right">
                {Math.floor((duration || 35) / 60)}:{Math.floor((duration || 35) % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Buffered {Math.round(bufferedPercent)}%</span>
              {loopStart !== null && loopEnd !== null && <span className="text-emerald-300">A–B loop: {loopStart.toFixed(1)}s–{loopEnd.toFixed(1)}s</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setStudioStart(currentTime); setStudioEnd(Math.min(duration || currentTime + 10, currentTime + 10)); setStudioExportStatus(''); setStudioMode(true); }} className="px-2.5 py-1.5 rounded-lg bg-indigo-900/80 text-indigo-100 text-xs flex items-center gap-1.5 hover:bg-indigo-800">
                <Film className="w-3.5 h-3.5" /> Studio / Editor
              </button>
              <button onClick={async () => {
                const el = videoContainerRef.current;
                if (!el) return;
                try {
                  if (!document.fullscreenElement) { await el.requestFullscreen(); setIsFullscreen(true); }
                  else { await document.exitFullscreen(); setIsFullscreen(false); }
                } catch (error) { console.warn('Fullscreen unavailable:', error); }
              }} className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700">
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              <button onClick={() => setIsAudioOnly(v => !v)} className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${isAudioOnly ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
                <Headphones className="w-3.5 h-3.5" /> Audio only {isAudioOnly ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => {
                const next = [...bookmarks, { movieId: currentMovie.id, time: currentTime, note: window.prompt('ఈ సీన్ గురించి చిన్న నోట్ రాయండి:') || '' }];
                setBookmarks(next);
                try { localStorage.setItem('cinemorph_bookmarks', JSON.stringify(next)); } catch (e) { console.warn(e); }
              }} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700">
                <Bookmark className="w-3.5 h-3.5" /> Bookmark / Note
              </button>
              <button onClick={() => {
                if (loopStart === null || loopEnd !== null) { setLoopStart(currentTime); setLoopEnd(null); }
                else if (currentTime > loopStart) setLoopEnd(currentTime);
                else { setLoopStart(currentTime); setLoopEnd(null); }
              }} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700">
                <Repeat className="w-3.5 h-3.5" /> {loopStart === null ? 'Set A' : loopEnd === null ? 'Set B' : 'Reset A–B'}
              </button>
              {loopStart !== null && loopEnd !== null && <button onClick={() => { setLoopStart(null); setLoopEnd(null); }} className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 text-rose-200 text-xs">Clear A–B</button>}
              <button onClick={async () => {
                const video = videoRef.current;
                if (!video || !video.videoWidth) return;
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                  if (!blob) throw new Error('Frame export failed');
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `cinemorph-frame-${Math.floor(currentTime)}.png`; a.click();
                  URL.revokeObjectURL(url);
                } catch (error) { alert('ఈ వీడియో source frame export‌ను అనుమతించలేదు (CORS పరిమితి ఉండవచ్చు).'); }
              }} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700">
                <Camera className="w-3.5 h-3.5" /> Save Frame
              </button>
              <button onClick={async () => {
                try {
                  await Promise.all([
                    cacheLocalRecord('movieMetadata', currentMovie.id, { id: currentMovie.id, title: currentMovie.titleEnglish, genre: currentMovie.genre, duration: currentMovie.duration, cachedAt: new Date().toISOString() }),
                    cacheLocalRecord('subtitles', currentMovie.id, movieDialogues),
                  ]);
                  alert('Movie metadata and available dubbing dialogue tracks are saved for offline access. Video file itself is not downloaded.');
                } catch (error) { alert('Offline cache failed. Check browser storage permissions.'); }
              }} className="px-2.5 py-1.5 rounded-lg bg-emerald-900/70 text-emerald-200 text-xs flex items-center gap-1.5 hover:bg-emerald-800">
                <Download className="w-3.5 h-3.5" /> Cache for Offline
              </button>
            </div>
            {studioMode && (
              <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setStudioMode(false)}>
                <div className="w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-slate-950 p-5 shadow-2xl space-y-4" onClick={event => event.stopPropagation()}>
                  <div className="flex items-center justify-between"><h3 className="text-white font-bold">Studio / Editor View</h3><button onClick={() => setStudioMode(false)} className="text-slate-400 hover:text-white">✕</button></div>
                  <p className="text-xs text-slate-400">కావలసిన భాగం Start / End ఎంచుకోండి. Browser WebM export మాత్రమే; MP3/WAV/GIF ఇంకా లేదు.</p>
                  <label className="block text-xs text-slate-300">Start: {studioStart.toFixed(1)}s<input type="range" min="0" max={Math.max(1,duration)} step="0.1" value={studioStart} onChange={event => setStudioStart(Math.min(Number(event.target.value), studioEnd - 0.1))} className="w-full accent-indigo-400" /></label>
                  <label className="block text-xs text-slate-300">End: {studioEnd.toFixed(1)}s<input type="range" min="0" max={Math.max(1,duration)} step="0.1" value={studioEnd} onChange={event => setStudioEnd(Math.max(Number(event.target.value), studioStart + 0.1))} className="w-full accent-indigo-400" /></label>
                  <div className="flex gap-2"><button onClick={() => startStudioExport('audio')} className="flex-1 rounded-xl bg-amber-400 text-slate-950 font-bold py-3 text-sm">Extract Audio (WebM)</button><button onClick={() => startStudioExport('clip')} className="flex-1 rounded-xl bg-indigo-500 text-white font-bold py-3 text-sm">Save Clip (WebM)</button></div>
                  {studioExportStatus && <p className="text-xs text-emerald-300 animate-pulse">{studioExportStatus}</p>}
                </div>
              </div>
            )}
            {bookmarks.filter(item => item.movieId === currentMovie.id).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bookmarks.filter(item => item.movieId === currentMovie.id).slice(-5).map((item, index) => (
                  <button key={`${item.time}-${index}`} onClick={() => { if (videoRef.current) videoRef.current.currentTime = item.time; setCurrentTime(item.time); }} className="text-[10px] px-2 py-1 rounded-md bg-indigo-950/80 text-indigo-200 border border-indigo-800">
                    {Math.floor(item.time / 60)}:{Math.floor(item.time % 60).toString().padStart(2, '0')} {item.note ? `· ${item.note.slice(0, 24)}` : 'Bookmark'}
                  </button>
                ))}
              </div>
            )}

            {/* Buttons Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold hover:bg-amber-300 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTime(0);
                      lastSpokenDialogueId.current = null;
                      if (speechSynthRef.current) speechSynthRef.current.cancel();
                      syncProgressToCloud(0);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
                  title="Reset to beginning"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <button
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      if (videoRef.current) videoRef.current.muted = next;
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      setIsMuted(v === 0);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Brightness Indicator */}
                <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs text-slate-400">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono-num">{brightness}%</span>
                </div>
              </div>

              {/* Action Badges */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInsightSidebarOpen(!isInsightSidebarOpen)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isInsightSidebarOpen
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Scene Insight</span>
                </button>

                <button
                  onClick={() => setRemaster(prev => ({ ...prev, showSplitSlider: !prev.showSplitSlider }))}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                    remaster.showSplitSlider
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Compare Slider</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Panel Tabs: Personality, Drift Recalibration, Pulse Sync, Accessibility, 4K AI */}
          <div className="grid grid-cols-5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveControlTab('mood')}
              className={`py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${
                activeControlTab === 'mood'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile className="w-3 h-3" />
              <span>Mood</span>
            </button>

            <button
              onClick={() => setActiveControlTab('drift')}
              className={`py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${
                activeControlTab === 'drift'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-3 h-3" />
              <span>Drift Fix</span>
            </button>

            <button
              onClick={() => setActiveControlTab('pulse')}
              className={`py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${
                activeControlTab === 'pulse'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Pulse Sync</span>
            </button>

            <button
              onClick={() => setActiveControlTab('access')}
              className={`py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${
                activeControlTab === 'access'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Accessibility className="w-3 h-3" />
              <span>A11y</span>
            </button>

            <button
              onClick={() => setActiveControlTab('remaster')}
              className={`py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 ${
                activeControlTab === 'remaster'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>4K AI</span>
            </button>
          </div>

          {/* TAB 1: DUBBING PERSONALITY & MOOD */}
          {activeControlTab === 'mood' && (
            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>Dubbing Personality & Persona Blend</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alters voice pitch, theatrical inflection, and persona timbre in real-time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Language:</span>
                  <select
                    value={dubbing.targetLang}
                    onChange={(e) => handleQuickLanguageSelect(e.target.value as SupportedLanguage)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-semibold focus:outline-none"
                  >
                    {SUPPORTED_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {DUBBING_MOODS.map((mood) => {
                  const isSelected = dubbing.dubbingMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => handleMoodSelect(mood.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-md scale-[1.01]'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                          {mood.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono-num text-slate-400">
                            Pitch {mood.pitchMultiplier}x · Speed {mood.rateMultiplier}x
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {mood.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATED SUBTITLE DRIFT RECALIBRATION (NEW FEATURE) */}
          {activeControlTab === 'drift' && (
            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-emerald-400" />
                    <span>Gemini Automated Subtitle Drift Recalibration</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detects speech-to-video phase mismatch and aligns timestamps to vocal onsets.
                  </p>
                </div>

                <button
                  onClick={handleAutoCalibrateDrift}
                  disabled={driftState.isCalibrating}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md"
                >
                  {driftState.isCalibrating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Calibrating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Auto-Calibrate with Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {/* Drift Status Card */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {driftState.calibratedOffsetMs !== 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                    )}
                    <span className="font-bold text-white">Synchronization Health:</span>
                    <span className="font-mono-num text-xs font-bold text-emerald-400">
                      {driftState.calibratedOffsetMs !== 0 
                        ? `Locked (${driftState.calibratedOffsetMs}ms Offset Applied)` 
                        : 'Uncalibrated (+380ms Lead Detected)'}
                    </span>
                  </div>
                  {driftState.confidenceScore && (
                    <span className="text-[11px] font-mono-num text-slate-400">
                      Gemini Confidence: <strong>{driftState.confidenceScore}%</strong>
                    </span>
                  )}
                </div>

                <div className="w-full bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-200 block mb-1">Acoustic Diagnosis:</span>
                  {driftState.driftCause || 'Frame rate phase disparity detected between video timeline and localized synthesized audio buffer. Running auto-calibration snaps dialogue start times to phonetic onset envelopes.'}
                </div>

                {/* Subtitle Timestamp Offset Shift Preview & Manual Micro-Adjustment Tool */}
                <div className="space-y-3 pt-2 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Manual Subtitle Timing Micro-Offset Tool:</span>
                    </span>
                    <span className="text-xs font-mono-num font-extrabold text-amber-400">
                      {driftState.calibratedOffsetMs > 0 ? `+${driftState.calibratedOffsetMs}ms` : `${driftState.calibratedOffsetMs}ms`}
                    </span>
                  </div>

                  {/* Millisecond Slider */}
                  <div className="flex flex-col gap-1">
                    <input
                      type="range"
                      min="-2000"
                      max="2000"
                      step="25"
                      value={driftState.calibratedOffsetMs}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDriftState(prev => ({ ...prev, calibratedOffsetMs: val }));
                        setDubbing(prev => ({ ...prev, driftOffsetMs: val }));
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
                      <span>-2000ms (Lead)</span>
                      <span>0ms (Default)</span>
                      <span>+2000ms (Lag)</span>
                    </div>
                  </div>

                  {/* Preset Offset Adjustment Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[-500, -100, 0, 100, 500].map((stepVal) => (
                      <button
                        key={stepVal}
                        onClick={() => {
                          const newOffset = stepVal === 0 ? 0 : driftState.calibratedOffsetMs + stepVal;
                          setDriftState(prev => ({ ...prev, calibratedOffsetMs: newOffset }));
                          setDubbing(prev => ({ ...prev, driftOffsetMs: newOffset }));
                          showHUD('subtitles', 100, `Subtitle Offset: ${newOffset}ms`);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-mono-num font-bold transition-colors ${
                          stepVal === 0
                            ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        {stepVal === 0 ? 'Reset (0ms)' : `${stepVal > 0 ? '+' : ''}${stepVal}ms`}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono-num pt-1">
                    {movieDialogues.slice(0, 2).map((diag) => (
                      <div key={diag.id} className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300 truncate max-w-[140px]">{diag.speaker}:</span>
                        <span className="text-amber-300 font-bold">
                          {(diag.startTime + driftState.calibratedOffsetMs / 1000).toFixed(2)}s → {(diag.endTime + driftState.calibratedOffsetMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PULSE SYNC */}
          {activeControlTab === 'pulse' && (
            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span>Pulse Sync (Adaptive Focus Engine)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Infers user attention and subtly balances BGM levels and narrative pacing.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pulseSync.enabled}
                    onChange={(e) => {
                      setPulseSync(prev => ({ ...prev, enabled: e.target.checked }));
                      setTimeout(() => syncProgressToCloud(), 200);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Focus Synchronization Profile:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'auto', label: 'AI Adaptive', desc: 'Auto-adapts to dialogue vs pauses' },
                    { id: 'deep_focus', label: 'Deep Focus', desc: 'Ducks BGM -20% for speech' },
                    { id: 'ambient', label: 'Ambient Flow', desc: 'Boosts spatial score +20%' },
                    { id: 'late_night', label: 'Late Night', desc: 'Warmer tones, soft cadence' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handlePulseSyncModeChange(item.id as PulseSyncMode)}
                      className={`p-2.5 rounded-xl border text-left transition-colors flex flex-col gap-0.5 ${
                        pulseSync.mode === item.id
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm'
                          : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span className="font-semibold text-white">Inferred Attention Index:</span>
                    <span className="font-mono-num font-bold text-rose-300">{pulseSync.inferredFocusLevel}%</span>
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-400">
                    BGM Factor: {pulseSync.bgmAdjustmentFactor}x · {pulseSync.heartbeatBpm} BPM
                  </div>
                </div>

                <div className="h-8 w-full bg-slate-900 rounded-lg overflow-hidden relative flex items-center px-2 border border-slate-800">
                  <div className="w-full flex items-center justify-between text-[10px] text-slate-500 font-mono-num">
                    <span className="text-rose-400 font-bold">▲ SYNC</span>
                    <span>·········^v·········^v·········^v·········</span>
                    <span className="text-emerald-400">OPTIMAL</span>
                  </div>
                </div>

                <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
                  {pulseSync.pacingSuggestion}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESSIBILITY OVERLAY */}
          {activeControlTab === 'access' && (
            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Accessibility className="w-4 h-4 text-amber-400" />
                    <span>Accessibility Overlay Suite</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Engineered for visually, hearing, and cognitively impaired film lovers.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accessibility.enabled}
                    onChange={(e) => {
                      setAccessibility(prev => ({ ...prev, enabled: e.target.checked }));
                      setTimeout(() => syncProgressToCloud(), 200);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ear className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Visual Action Audio Description (AD)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessibility.audioDescriptionEnabled}
                      onChange={(e) => {
                        setAccessibility(prev => ({ ...prev, audioDescriptionEnabled: e.target.checked }));
                        if (e.target.checked) {
                          speakAudioDescription(sceneInsight.visualActionDescription);
                        }
                        setTimeout(() => syncProgressToCloud(), 200);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Generates an acoustic narrator describing non-verbal physical movements, lighting, and camera pans during pauses.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => speakAudioDescription(sceneInsight.visualActionDescription)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Volume1 className="w-3.5 h-3.5" />
                    <span>Preview Audio Description</span>
                  </button>
                  {isADSpeaking && (
                    <span className="text-xs text-indigo-400 animate-pulse font-mono-num">Narrating action...</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  High-Contrast Subtitle Profiles (WCAG AAA):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'standard', label: 'Studio Minimal', desc: 'Standard shadow scrim' },
                    { id: 'high_contrast_yellow', label: 'Yellow on Black', desc: 'Broadcast standard low-vision' },
                    { id: 'high_contrast_cyan', label: 'Cyan on Black', desc: 'Color-blind optimized' },
                    { id: 'large_dyslexic', label: 'Dyslexic Wide', desc: 'Weighted wide letter-spacing' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setAccessibility(prev => ({ 
                          ...prev, 
                          enabled: true,
                          highContrastMode: mode.id as HighContrastSubtitleMode 
                        }));
                        showHUD('subtitles', 100, mode.label);
                        setTimeout(() => syncProgressToCloud(), 200);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-colors flex flex-col gap-0.5 ${
                        accessibility.highContrastMode === mode.id && accessibility.enabled
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                          : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{mode.label}</span>
                      <span className="text-[10px] text-slate-400">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-white">Subtitle Font Scale:</span>
                <div className="flex items-center gap-1.5">
                  {(['normal', 'large', 'xlarge'] as SubtitleFontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setAccessibility(prev => ({ ...prev, fontSize: size }));
                        showHUD('subtitles', 100, `Size: ${size.toUpperCase()}`);
                        setTimeout(() => syncProgressToCloud(), 200);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        accessibility.fontSize === size
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 4K REMASTER */}
          {activeControlTab === 'remaster' && (
            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">Neural 4K Super-Resolution</h4>
                  <p className="text-xs text-slate-400">Real-time edge restoration & HDR</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remaster.enabled}
                    onChange={(e) => {
                      setRemaster(prev => ({ ...prev, enabled: e.target.checked }));
                      setTimeout(() => syncProgressToCloud(), 200);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>Edge Clarity & Sharpness:</span>
                  <span className="font-mono-num text-amber-400">{remaster.sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={remaster.sharpness}
                  onChange={(e) => setRemaster(prev => ({ ...prev, sharpness: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>Night Scene Radiance (Shadow Boost):</span>
                  <span className="font-mono-num text-amber-400">{remaster.nightBoost}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={remaster.nightBoost}
                  onChange={(e) => setRemaster(prev => ({ ...prev, nightBoost: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: SCENE INSIGHT SIDEBAR (Docked when open) */}
        {isInsightSidebarOpen && (
          <aside className="lg:col-span-4 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 p-5 shadow-2xl flex flex-col gap-4 animate-fade-in sticky top-20">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Scene Insight
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    Gemini 3.8 Flash Dramaturg
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchSceneInsight()}
                  disabled={isLoadingInsight}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                  title="Regenerate scene insight for current timestamp"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsight ? 'animate-spin text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setIsInsightSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sidebar Content */}
            {isLoadingInsight ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Analyzing narrative subtext & motivations...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {/* 1. Real-time Scene Summary */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono-num">
                    Current Context
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {sceneInsight.sceneSummary}
                  </p>
                </div>

                {/* 2. Sentiment & Tension Meter */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Dramatic Tension:</span>
                    <span className="font-mono-num font-bold text-rose-400">
                      {sceneInsight.sentiment.tensionLevel}% ({sceneInsight.sentiment.pacingRating})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${sceneInsight.sentiment.tensionLevel}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Mood: <strong className="text-slate-200">{sceneInsight.sentiment.primaryEmotion}</strong></span>
                    <span className="capitalize text-slate-400">{sceneInsight.sentiment.valence}</span>
                  </div>
                </div>

                {/* 3. Key Character Motivations */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono-num">
                    Character Motivations
                  </span>
                  <div className="space-y-2">
                    {sceneInsight.characterMotivations.map((char, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-300 font-semibold">{char.character}</strong>
                          <span className="text-[10px] text-slate-500 uppercase font-mono-num">Psychological Driver</span>
                        </div>
                        <p className="text-slate-300 leading-snug">{char.motivation}</p>
                        <div className="mt-1 pt-1.5 border-t border-slate-900 text-[11px] text-slate-400">
                          <span className="text-indigo-300 font-medium">Hidden Agenda: </span>
                          {char.hiddenAgenda}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Audio Description Action Snippet */}
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Ear className="w-3.5 h-3.5" />
                      Visual Action Audio Description:
                    </span>
                    <button
                      onClick={() => speakAudioDescription(sceneInsight.visualActionDescription)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline"
                    >
                      Listen (AD)
                    </button>
                  </div>
                  <p className="text-slate-300 italic leading-relaxed">
                    "{sceneInsight.visualActionDescription}"
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Cultural Slang Details Popover Modal */}
      {selectedSlangInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl border border-slate-700 p-6 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Cultural Slang Decoder
              </span>
              <button
                onClick={() => setSelectedSlangInfo(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400">Original ({selectedSlangInfo.originalLang}):</span>
              <p className="text-sm font-semibold text-white mt-0.5">"{selectedSlangInfo.originalText}"</p>
            </div>

            <div>
              <span className="text-xs text-slate-400">Colloquial Transcreation:</span>
              <p className="text-base font-bold text-amber-300 mt-0.5">{selectedSlangInfo.teluguColloquial}</p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="text-slate-400 font-semibold block mb-1">Cultural Nuance & Slang Context:</span>
              {selectedSlangInfo.culturalSlangExplanation}
            </div>

            <button
              onClick={() => setSelectedSlangInfo(null)}
              className="mt-2 w-full py-2.5 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-300 transition-colors"
            >
              Understood (Close)
            </button>
          </div>
        </div>
      )}

      <HistoryView
        currentUser={currentUser}
        currentMovieId={currentMovie.id}
        onResumeMovie={handleResumeFromRecentlyWatched}
        lastSyncedTimestamp={lastSyncedTime}
      />

      {/* 👥 REAL-TIME CO-WATCH PARTY DRAWER */}
      <CoWatchPartyDrawer
        isOpen={isCoWatchOpen}
        onClose={() => setIsCoWatchOpen(false)}
        currentMovie={currentMovie}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onSyncSeek={handleCoWatchSeek}
        onSyncPlay={handleCoWatchPlay}
        onSyncPause={handleCoWatchPause}
        currentUser={currentUser}
        targetLang={dubbing.targetLang}
      />
    </div>
  );
};
