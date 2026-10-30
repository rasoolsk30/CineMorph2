import React, { useState } from 'react';
import { 
  Zap, ShieldAlert, Cpu, Layers, Rocket, Target, Award, CheckCircle2, 
  Sparkles, Globe2, Volume2, Film, ChevronRight, Lock, TrendingUp, Users,
  Check, ArrowRight
} from 'lucide-react';

export const MarketMasterplan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'features' | 'philosophy' | 'roadmap' | 'business'>('features');

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* Hero Mission Statement Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0e121e] border border-slate-800 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
            <span>CineMorph AI Strategy Blueprint</span>
            <span aria-hidden="true">·</span>
            <span>Unfair Advantage & Zero-Competition Moat</span>
          </div>
          
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            The Death of Subtitles: Experience World Cinema in Your Native Voice with 100% Actor Emotion
          </h1>
          
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Reading subtitles while watching movies is a broken 1930s paradigm. When viewers are forced to stare at the bottom of the screen, they miss over 70% of visual cinematography, micro-expressions, and emotional storytelling.
            Here is the complete engineering and go-to-market blueprint for an unassailable AI cinema companion.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {[
              { id: 'features', label: '01. 7 Unprecedented Features' },
              { id: 'philosophy', label: '02. The Subtitle Fatigue Gap' },
              { id: 'roadmap', label: '03. Scratch-to-Release Roadmap' },
              { id: 'business', label: '04. Market Monopoly & Monetization' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1: 7 UNPRECEDENTED, ZERO-COMPETITION FEATURES */}
      {activeTab === 'features' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                7 Unassailable Product Features (Our Competitive Moat)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Capabilities that Netflix, Amazon Prime, or standard players cannot build without our architecture.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 01 · OTT COMPANION</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">No DRM Infringement</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Universal Floating OTT Companion (The Trojan Horse)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Instead of trying to license video content, CineMorph runs as a floating Android/iOS system overlay on top of Netflix, Prime Video, Disney+, or YouTube. It captures internal audio via system audio loopback, transcreates it in &lt;120ms, and routes dubbed audio directly into user earbuds.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: Zero streaming license fees, zero studio copyright friction.</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 02 · CLONING</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">Timbre Preservation</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Actor Timbre & Emotion Morphing
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No robotic text-to-speech. CineMorph extracts the original actor's vocal formant, pitch envelope, breathing pauses, and sobbing or shouting frequency in 2 seconds, morphing the target language voice to match the exact physical personality of the original foreign actor.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: Sounds as if the foreign actor personally spoke Telugu or English.</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 03 · AUDIO STEMS</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">Dolby 5.1 Intact</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Acoustic Vocal Separation (Zero BGM Loss)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Standard dubbed movies destroy the original sound mix. CineMorph uses quantized neural stem separation to surgically remove human dialogue frequencies while keeping 100% of Hans Zimmer scores, rainfall, bullet ricochets, and spatial sound intact.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: True cinematic Dolby Atmos theatrical immersion preserved.</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 04 · LOCALIZATION</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">Colloquial Punch</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Cultural Idiom & Slang Transcreator
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Translating literally destroys comedy and dramatic weight. CineMorph transcreates idioms, regional curses, and street slang into cultural equivalents (e.g. Korean "Gganbu" mapped to sacred childhood best friend; Spanish "como fantasmas" to vanishing without a trace).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: Authentic native cinema entertainment without awkward robotic phrasing.</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 05 · VISUAL RESTORATION</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">OLED Edge Super-Res</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Real-time Neural 4K Upscaler & Night Vision
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Low-bitrate or vintage 720p streams are upscaled on-device to crisp 4K HDR. In dark Korean/Nordic crime thrillers where the director deliberately shot in shadows, our intelligent "Night Scene Radiance" lifts shadow luminance without blowing out highlights.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: Low-quality streams look like pristine 4K Blu-ray transfers.</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono-num font-bold text-amber-400">FEAT 06 · EDGE NPU</span>
                  <span className="text-[11px] text-slate-500 font-mono-num">0 Cloud Server Bill</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  On-Device NPU Execution (Offline & Free Scale)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Routing millions of hours of streaming video through cloud GPUs would bankrupt any startup. CineMorph quantizes models into 4-bit INT8 running directly on mobile Snapdragon Hexagon or MediaTek APUs, costing $0 in cloud compute.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Advantage: 90%+ gross margin with zero server bandwidth bottlenecks.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: THE PROBLEM */}
      {activeTab === 'philosophy' && (
        <div className="p-6 bg-slate-900/70 rounded-3xl border border-slate-800 flex flex-col gap-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Why Current Video Players & OTT Platforms Are Failing Viewers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-amber-400 text-xs font-mono-num font-bold">Problem 01</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-2">Cognitive Reading Fatigue</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                During a 2-hour movie, reading over 1,800 lines of text causes visual fatigue. Viewer drop-off rates on foreign-language cinema exceed 64% within the first 25 minutes.
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-amber-400 text-xs font-mono-num font-bold">Problem 02</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-2">Studio Dubbing Prohibitive Costs</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Professional studio dubbing costs $18,000 to $30,000 per movie per language. OTTs only dub the top 2% Hollywood blockbusters, leaving 98% of world cinema locked behind text.
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-amber-400 text-xs font-mono-num font-bold">Problem 03</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-2">Emotional Disconnect</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Text conveys syntax, never emotion. When an actor is trembling with tears, reading flat white text drains the theatrical experience completely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STEP-BY-STEP ROADMAP */}
      {activeTab === 'roadmap' && (
        <div className="p-6 bg-slate-900/70 rounded-3xl border border-slate-800 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Development Roadmap: Scratch to Global Release (16-Week Plan)
            </h2>
            <span className="text-xs text-amber-400 font-mono-num">16-Week Production Plan</span>
          </div>

          <div className="space-y-4">
            {[
              {
                phase: 'PHASE 1 (Weeks 1 - 4)',
                title: 'Core AI Audio Pipeline & NPU Optimization',
                desc: 'Quantize Demucs neural stem separation and fine-tune latency on Snapdragon Hexagon / Apple Neural Engine to achieve <120ms total end-to-end transcreation latency.',
                milestone: 'Proof of Concept: Live real-time dialogue separation and dubbing on device.'
              },
              {
                phase: 'PHASE 2 (Weeks 5 - 8)',
                title: 'Floating Overlay & WebGL Remaster Engine',
                desc: 'Build Android Accessibility & Audio Loopback service allowing floating companion mode over Netflix, YouTube, and local player files with shader upscaling.',
                milestone: 'Alpha APK: Tested seamlessly on live Netflix Korean stream with zero stutter.'
              },
              {
                phase: 'PHASE 3 (Weeks 9 - 12)',
                title: 'Cultural Slang Engine & Closed Beta Testing',
                desc: 'Onboard 1,000 passionate cinephiles across Telugu, Tamil, and Hindi markets. Validate slang transcreation accuracy and tune emotion timbre presets.',
                milestone: 'Beta Validation: 92% retention rate; 88% prefer CineMorph over standard subtitles.'
              },
              {
                phase: 'PHASE 4 (Weeks 13 - 16)',
                title: 'Play Store Launch & Viral Creator Campaign',
                desc: 'Launch freemium subscription on Google Play & App Store. Partner with cinema review YouTubers demonstrating "Korean Cinema in Native Telugu Dubbing".',
                milestone: 'Launch Target: 250,000 organic downloads in first 30 days.'
              }
            ].map((step, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-400 font-mono-num">{step.phase}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <h4 className="text-sm font-bold text-white">{step.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.desc}</p>
                </div>
                <div className="shrink-0 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium">
                  {step.milestone}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: BUSINESS MODEL */}
      {activeTab === 'business' && (
        <div className="p-6 bg-slate-900/70 rounded-3xl border border-slate-800 flex flex-col gap-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            Monetization & Market Domination Strategy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-mono-num font-bold text-emerald-400">Model A: B2C Freemium</span>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Consumer Subscription</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Free Tier:</strong> 25 minutes daily real-time voice dubbing + 720p upscaler.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Pro Pass ($3.99 / mo or ₹149 / mo):</strong> Unlimited dubbing, voice actor cloning, 4K HDR neural remastering, and scene X-Ray analysis.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-mono-num font-bold text-indigo-400">Model B: B2B OTT SDK Licensing</span>
              <h3 className="text-base font-bold text-white mt-1 mb-2">SDK Licensing for Regional Streaming Services</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                License our edge dubbing SDK to regional OTT players (Aha, Zee5, Voot, SunNXT) enabling them to offer their entire back catalog in 10+ languages instantaneously without multi-million dollar studio dubbing overhead.
              </p>
              <div className="text-[11px] font-semibold text-indigo-300">
                Addressable Market: 500M+ regional cinephiles in India, Latin America, and Southeast Asia.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
