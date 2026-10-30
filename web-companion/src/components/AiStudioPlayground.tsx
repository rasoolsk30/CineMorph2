import React, { useState } from 'react';
import { 
  Sparkles, Volume2, Globe2, MessageSquare, Play, HelpCircle, 
  ArrowRight, Check, UserCheck, Sliders, Mic, ShieldAlert, Award, Radio
} from 'lucide-react';
import { DUBBING_MOODS, VOICE_PERSONAS } from '../data/cinemaSamples';
import { DubbingMood, VoicePersona } from '../types';
import { DubbingHistory } from './DubbingHistory';
import { saveDubbingHistoryItem, auth } from '../lib/firebase';

export const AiStudioPlayground: React.FC = () => {
  // Navigation between Transcreator and Persona Studio
  const [activeTab, setActiveTab] = useState<'personas' | 'transcreator'>('personas');

  // Transcreator state
  const [sourceLang, setSourceLang] = useState('Korean');
  const [selectedMood, setSelectedMood] = useState<DubbingMood>('dramatic');
  const [dialogue, setDialogue] = useState('이곳에서 살아 나갈 생각 마ら. 넌 이미 끝났어.');
  const [sceneContext, setSceneContext] = useState('Rainy night in Incheon port, detective corners underworld gangster in a high-stakes standoff');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>({
    localizedTelugu: 'ఇక్కడి నుంచి ప్రాణాలతో బయటపడతా అనుకోకు! నీ పని అయిపోయిందిరా!',
    transliteration: 'Ikkadi nunchi pranalatho bayatapadata anukoku! Nee pani aipoyindira!',
    directMeaning: "Don't think you'll leave here alive. You are finished.",
    culturalNote: 'Korean fatalistic underworld ultimatum adapted into natural colloquial cinema threats with heavy chest resonance.',
    vocalDirection: 'Gritted teeth delivery with low pitch; rapid deceleration on the final consonant.',
    lipSyncTip: 'Match 2.5s duration without trailing vowel drag.'
  });

  // Persona Studio State
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona>(VOICE_PERSONAS[0]);
  const [activeCinemaPersonaId, setActiveCinemaPersonaId] = useState<string>(() => {
    return localStorage.getItem('cinemorph_active_persona') || VOICE_PERSONAS[0].id;
  });
  
  // Custom Persona Clone sliders
  const [customPitch, setCustomPitch] = useState(0.70);
  const [customRate, setCustomRate] = useState(0.88);
  const [customVocalFry, setCustomVocalFry] = useState(70);
  const [customWarmth, setCustomWarmth] = useState(90);
  const [customPersonaName, setCustomPersonaName] = useState('My Custom Clone');
  const [isPersonaSpeaking, setIsPersonaSpeaking] = useState(false);
  const [savedSuccessToast, setSavedSuccessToast] = useState<string | null>(null);

  const handleTranscreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/transcreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogue,
          sourceLang,
          targetLang: 'Telugu',
          emotion: selectedMood,
          sceneContext
        })
      });
      const res = await response.json();
      if (res.success && res.data) {
        setResult(res.data);
        if (auth.currentUser) {
          void saveDubbingHistoryItem(auth.currentUser.uid, {
            movieId: 'ai-lab-scene',
            movieTitle: `${sourceLang} Cinema Standoff`,
            language: 'Telugu',
            dialogueText: dialogue,
            teluguTranscreation: res.data.localizedTelugu,
            personaName: selectedPersona.name,
            pitch: customPitch,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playSynthesizedVoice = (textOverride?: string, pitchOverride?: number, rateOverride?: number) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const textToSpeak = textOverride || result?.localizedTelugu;
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const moodPreset = DUBBING_MOODS.find(m => m.id === selectedMood) || DUBBING_MOODS[0];
    utterance.pitch = pitchOverride ?? moodPreset.pitchMultiplier;
    utterance.rate = rateOverride ?? moodPreset.rateMultiplier;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes('te') || v.lang.includes('hi') || v.lang.includes('IN') || v.lang.includes('en'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsPersonaSpeaking(true);
    utterance.onend = () => setIsPersonaSpeaking(false);
    utterance.onerror = () => setIsPersonaSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSetCinemaActivePersona = (personaId: string) => {
    setActiveCinemaPersonaId(personaId);
    localStorage.setItem('cinemorph_active_persona', personaId);
    window.dispatchEvent(new CustomEvent('cinemorph_persona_change', { detail: { personaId } }));
    
    setSavedSuccessToast(`Activated "${VOICE_PERSONAS.find(p => p.id === personaId)?.name || 'Custom Persona'}" for live Cinema Player!`);
    setTimeout(() => setSavedSuccessToast(null), 3500);
  };

  const samplePresets = [
    {
      title: 'Korean Neo-Noir (Squid Game Style)',
      lang: 'Korean',
      mood: 'dramatic' as DubbingMood,
      text: '우린 깐부잖아. 네 거 내 거가 어디 있어?',
      context: 'Childhood friends realizing betrayal in a high-stakes life-and-death standoff'
    },
    {
      title: 'Spanish Heist (Money Heist Style)',
      lang: 'Spanish',
      mood: 'action' as DubbingMood,
      text: '¡Empieza el matriarcado! Ahora yo tengo el control de este banco.',
      context: 'Protagonist cocking gun and seizing command of vault heist'
    },
    {
      title: 'Japanese Anime (Cyberpunk / Shinkai)',
      lang: 'Japanese',
      mood: 'noir' as DubbingMood,
      text: 'たとえ作られた記憶でも、今ここで感じている痛みは本物よ。',
      context: 'Augmented cyborg discovering truth in the rain'
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <span>Gemini 3.8 Flash Powered</span>
            <span aria-hidden="true">·</span>
            <span>Acoustic Neural Lab</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            AI Voice Personas & Dubbing Lab
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Clone celebrity vocal timbres or craft custom character personas with sub-bass harmonics and bespoke speech cadences.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center p-1 bg-slate-900 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('personas')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'personas'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Personas</span>
          </button>

          <button
            onClick={() => setActiveTab('transcreator')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'transcreator'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Dialogue Transcreator</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {savedSuccessToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{savedSuccessToast}</span>
        </div>
      )}

      {/* TAB 1: CHARACTER VOICE PROFILE & CELEBRITY CLONING */}
      {activeTab === 'personas' && (
        <div className="flex flex-col gap-6">
          {/* Top Persona Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {VOICE_PERSONAS.map((persona) => {
              const isSelected = selectedPersona.id === persona.id;
              const isCinemaActive = activeCinemaPersonaId === persona.id;

              return (
                <div
                  key={persona.id}
                  onClick={() => {
                    setSelectedPersona(persona);
                    setCustomPitch(persona.pitch);
                    setCustomRate(persona.rate);
                    setCustomVocalFry(persona.vocalFry);
                    setCustomWarmth(persona.warmth);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-xl scale-[1.02]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-num font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {persona.badge}
                      </span>
                      {isCinemaActive && (
                        <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                      {persona.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Inspired by {persona.celebrityInspiration}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-num text-slate-400">
                    <span>Pitch: {persona.pitch}x</span>
                    <span>Speed: {persona.rate}x</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Persona Deep Dive & Acoustic Tuning Studio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Persona Acoustic Blueprint (7 cols) */}
            <div className="lg:col-span-7 p-6 bg-slate-900/80 rounded-3xl border border-slate-800 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-num text-amber-400 font-bold uppercase">
                      Profile Blueprint
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{selectedPersona.badge}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mt-0.5">
                    {selectedPersona.name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Celebrity Archetype: <strong>{selectedPersona.celebrityInspiration}</strong>
                  </span>
                </div>

                <button
                  onClick={() => handleSetCinemaActivePersona(selectedPersona.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    activeCinemaPersonaId === selectedPersona.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{activeCinemaPersonaId === selectedPersona.id ? 'Active Cinema Voice' : 'Set as Cinema Voice'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedPersona.description}
              </p>

              {/* Sample Dialog Preview with Audio Playback */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono-num">
                  Acoustic Sample Test (Telugu Dub):
                </span>
                <p className="text-base font-bold text-amber-300 font-display">
                  "{selectedPersona.sampleLine}"
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <button
                    onClick={() => playSynthesizedVoice(selectedPersona.sampleLine, customPitch, customRate)}
                    disabled={isPersonaSpeaking}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPersonaSpeaking ? 'Speaking Sample...' : 'Hear Persona Audio'}</span>
                  </button>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono-num">
                    <span>Fry: {customVocalFry}%</span>
                    <span>·</span>
                    <span>Warmth: {customWarmth}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Custom Timbre Tuning Studio (5 cols) */}
            <div className="lg:col-span-5 p-6 bg-slate-900/80 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Acoustic Sliders & Timbre Warp</span>
                </h4>
                <button
                  onClick={() => {
                    setCustomPitch(selectedPersona.pitch);
                    setCustomRate(selectedPersona.rate);
                    setCustomVocalFry(selectedPersona.vocalFry);
                    setCustomWarmth(selectedPersona.warmth);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Slider 1: Base Pitch Modulation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Base Pitch (Sub-Bass vs High Register):</span>
                  <span className="font-mono-num text-amber-400">{customPitch.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.02"
                  value={customPitch}
                  onChange={(e) => setCustomPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Lower values (0.6x - 0.8x) recreate commanding baritone; higher values (1.1x - 1.4x) suit younger energetic voices.
                </span>
              </div>

              {/* Slider 2: Cadence Pace & Delivery */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Cadence Pace (Delivery Speed):</span>
                  <span className="font-mono-num text-amber-400">{customRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.02"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider 3: Vocal Fry & Texture */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Vocal Fry & Gravelly Rasp:</span>
                  <span className="font-mono-num text-amber-400">{customVocalFry}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customVocalFry}
                  onChange={(e) => setCustomVocalFry(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider 4: Chest Warmth & Resonance */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Chest Warmth & Resonance:</span>
                  <span className="font-mono-num text-amber-400">{customWarmth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customWarmth}
                  onChange={(e) => setCustomWarmth(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Apply to Live Player:</span>
                <button
                  onClick={() => handleSetCinemaActivePersona(selectedPersona.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300"
                >
                  Save Active Persona
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIALOGUE TRANSCREATOR */}
      {activeTab === 'transcreator' && (
        <div className="flex flex-col gap-6">
          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Sample Scripts:</span>
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSourceLang(preset.lang);
                  setSelectedMood(preset.mood);
                  setDialogue(preset.text);
                  setSceneContext(preset.context);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                {preset.title}
              </button>
            ))}
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Input Form (5 cols) */}
            <div className="lg:col-span-5 p-5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Dialogue & Scene Parameters</span>
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Source Language:</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Korean">Korean (한국어)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="English">English (Hollywood)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Dubbing Personality / Mood:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DUBBING_MOODS.map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        selectedMood === mood.id
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {mood.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Foreign Dialogue Line:</label>
                <textarea
                  rows={3}
                  value={dialogue}
                  onChange={(e) => setDialogue(e.target.value)}
                  placeholder="Paste or type movie dialogue line here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed font-mono-num"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Scene Emotional Context:</label>
                <input
                  type="text"
                  value={sceneContext}
                  onChange={(e) => setSceneContext(e.target.value)}
                  placeholder="Atmosphere, urgency, and character subtext..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleTranscreate}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Transcreating via Gemini 3.8 Flash...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Transcreate Dialogue Line</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Output & Voice Playback (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono-num">
                    Transcreation & Voice Output
                  </span>
                  <button
                    onClick={() => playSynthesizedVoice()}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Localized Voice</span>
                  </button>
                </div>

                {/* Colloquial Line */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90">
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    Authentic Colloquial Cinema Translation:
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-amber-300 tracking-wide leading-relaxed font-display">
                    "{result.localizedTelugu}"
                  </p>
                  <p className="text-xs text-slate-400 italic mt-1">
                    Phonetic Transliteration: {result.transliteration}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Literal English: {result.directMeaning}
                  </p>
                </div>

                {/* Cultural Nuance */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-col gap-1 text-xs">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cultural Slang Nuance:</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {result.culturalNote}
                  </p>
                </div>

                {/* Direction & Lip Sync */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Vocal Direction:</span>
                    <p className="text-slate-300">{result.vocalDirection}</p>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Lip-Sync Timing:</span>
                    <p className="text-slate-300">{result.lipSyncTip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ TELUGU DUBBING HISTORY COMPONENT (FIRESTORE PERSISTED) */}
      <div className="mt-8">
        <DubbingHistory currentUser={auth.currentUser} />
      </div>
    </div>
  );
};
