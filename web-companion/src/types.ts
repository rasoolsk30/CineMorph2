export type SupportedLanguage = 'te' | 'ta' | 'hi' | 'kn' | 'ml' | 'en' | 'es' | 'ko' | 'ja';

export type DubbingMood = 'dramatic' | 'comedic' | 'documentary' | 'action' | 'noir';

export interface DubbingMoodPreset {
  id: DubbingMood;
  name: string;
  tagline: string;
  pitchMultiplier: number;
  rateMultiplier: number;
  description: string;
  badgeColor: string;
}

export interface VoicePersona {
  id: string;
  name: string;
  celebrityInspiration: string;
  tagline: string;
  pitch: number;
  rate: number;
  vocalFry: number; // 0 - 100%
  warmth: number; // 0 - 100%
  description: string;
  sampleLine: string;
  badge: string;
}

export interface DialogueLine {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  originalText: string;
  originalLang: string;
  teluguColloquial: string;
  teluguTransliteration: string;
  englishLiteral: string;
  culturalSlangExplanation: string;
  emotion: 'tense' | 'whisper' | 'angry' | 'desperate' | 'triumphant' | 'sorrow';
  vocalPitch: number;
  vocalRate: number;
  soundCue?: string;
}

export interface MovieScene {
  id: string;
  title: string;
  titleEnglish: string;
  originalLanguage: string;
  genre: string;
  duration: number;
  videoUrl: string;
  fallbackPosterUrl: string;
  synopsisEnglish: string;
  dialogues: DialogueLine[];
  directorVisualNotes: string;
  originalAudioScore: string;
  defaultActionDescription?: string;
}

export interface RemasterSettings {
  enabled: boolean;
  sharpness: number;
  hdrVibrancy: number;
  nightBoost: number;
  contrastBoost: number;
  denoise: number;
  splitPosition: number;
  showSplitSlider: boolean;
  fpsBoost60: boolean;
}

export interface DubbingSettings {
  enabled: boolean;
  targetLang: SupportedLanguage;
  dubbingMood: DubbingMood;
  activePersonaId?: string;
  voiceVolume: number;
  bgmMixLevel: number;
  emotionCloning: boolean;
  subtitleMode: 'smart-glance' | 'standard' | 'off';
  lipSyncAssist: boolean;
  driftOffsetMs: number;
}

export interface GestureState {
  isActive: boolean;
  type: 'volume' | 'brightness' | 'subtitles' | 'seek' | null;
  value: number;
  label: string;
}

export interface SceneInsight {
  sceneSummary: string;
  sentiment: {
    primaryEmotion: string;
    tensionLevel: number;
    valence: 'negative' | 'positive' | 'ambiguous';
    pacingRating: string;
  };
  characterMotivations: Array<{
    character: string;
    motivation: string;
    hiddenAgenda: string;
  }>;
  visualActionDescription: string;
  thematicMetaphor: string;
}

export type PulseSyncMode = 'auto' | 'deep_focus' | 'ambient' | 'late_night';

export interface PulseSyncState {
  enabled: boolean;
  mode: PulseSyncMode;
  inferredFocusLevel: number;
  pacingSuggestion: string;
  bgmAdjustmentFactor: number;
  sceneTransitionSpeed: 'cinematic' | 'accelerated' | 'gentle';
  heartbeatBpm: number;
}

export type HighContrastSubtitleMode = 'standard' | 'high_contrast_yellow' | 'high_contrast_cyan' | 'large_dyslexic';
export type SubtitleFontSize = 'normal' | 'large' | 'xlarge';

export interface AccessibilitySettings {
  enabled: boolean;
  audioDescriptionEnabled: boolean;
  highContrastMode: HighContrastSubtitleMode;
  fontSize: SubtitleFontSize;
  soundCuesEnabled: boolean;
  reducedMotion: boolean;
}

export interface SubtitleDriftState {
  driftDetected: boolean;
  detectedDriftMs: number;
  calibratedOffsetMs: number;
  isCalibrating: boolean;
  lastCalibratedAt?: string;
  confidenceScore?: number;
  driftCause?: string;
}

export interface WordDefinition {
  word: string;
  sourceSentence: string;
  phoneticSpelling?: string;
  meaningInEnglish: string;
  meaningInTargetLang: string;
  contextualUsage: string;
  cinematicExample: string;
  grammarTag?: string;
  synonyms?: string[];
}

export interface SmartSceneTicker {
  tickerHeadline: string;
  plotKeyPoints: string[];
  characterEmotions: Array<{
    character: string;
    state: string;
    emoji: string;
    intensity: number;
  }>;
  dramaticStakes: string;
  nextAnticipation: string;
}

export type PictureBoostPreset = 'none' | 'hdr_cinema' | 'oled_black' | 'vivid_pop' | 'crisp_sharp';

export interface PictureBoostSettings {
  preset: PictureBoostPreset;
  sharpness: number;
  contrast: number;
  saturation: number;
  brightness: number;
}

export type PlaybackSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

// Co-Watch Party Types
export interface CoWatchParticipant {
  uid: string;
  name: string;
  joinedAt: string;
  isHost?: boolean;
}

export interface CoWatchRoom {
  roomId: string;
  hostId: string;
  hostName: string;
  movieId: string;
  movieTitle: string;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  targetLang: string;
  createdAt: string;
  participants?: CoWatchParticipant[];
  activeUserCount?: number;
}

export interface CoWatchMessage {
  id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  color?: string;
}

// Semantic Search Result
export interface SemanticSearchResult {
  timestamp: number;
  formattedTime: string;
  sceneTitle: string;
  matchExcerpt: string;
  speaker: string;
  relevanceReason: string;
  matchScore: number;
}

// Voice Command
export interface VoiceCommandFeedback {
  transcript: string;
  commandType: string;
  description: string;
  timestamp: number;
  isRecognizing: boolean;
}

