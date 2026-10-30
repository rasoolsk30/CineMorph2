import React from 'react';
import { Cpu, Layers, Zap, Smartphone, Headphones, ShieldCheck, ArrowRight } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
          <span>Technical Blueprints</span>
          <span aria-hidden="true">·</span>
          <span>Edge NPU Architecture</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Mobile On-Device Neural Architecture (Zero-Cloud-Cost System)
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Routing millions of continuous streaming video hours to AWS or GCP cloud GPUs leads to astronomical infrastructure costs. 
          CineMorph executes 100% of vocal stem separation, inference, and video shaders on the user’s mobile NPU (Neural Processing Unit).
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="p-6 bg-slate-900/80 rounded-3xl border border-slate-800 flex flex-col gap-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Real-time Audio & Video Pipeline (&lt;120ms End-to-End Latency)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num font-bold text-amber-400">STAGE 01</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-1.5">Audio Loopback Capture</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Captures system audio via Android AudioPlaybackCapture API from Netflix, Prime Video, or YouTube as 16kHz PCM stream.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono-num">
              Latency: ~15ms
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num font-bold text-amber-400">STAGE 02</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-1.5">Neural Vocal Separation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quantized 4-bit Demucs model splits incoming audio into dialogue vocal stems and pristine Dolby 5.1 BGM/SFX tracks.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono-num">
              Latency: ~40ms
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num font-bold text-amber-400">STAGE 03</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-1.5">Slang Transcreation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Contextual speech translation converts foreign phrasing into natural colloquial native cinema punchlines.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono-num">
              Latency: ~35ms
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono-num font-bold text-amber-400">STAGE 04</span>
              <h4 className="text-sm font-bold text-white mt-1 mb-1.5">Voice Synthesis & Mix</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Applies actor emotion timbre matching, recombines with isolated Dolby BGM, and streams low-jitter audio to headphones.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono-num">
              Latency: ~30ms
            </div>
          </div>
        </div>
      </div>

      {/* Chipset Support Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Cpu className="w-4 h-4" />
            <h4 className="text-sm font-bold text-white">Snapdragon Hexagon NPU</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Native hardware acceleration for Snapdragon 8 Gen 2 / Gen 3. Reduces battery consumption by 82%; 2 hours of continuous AI dubbing uses under 6% total battery.
          </p>
        </div>

        <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Zap className="w-4 h-4" />
            <h4 className="text-sm font-bold text-white">MediaTek Dimensity APU</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Custom NeuroPilot INT8 kernels designed for mass-market budget smartphones across India and Southeast Asia, guaranteeing zero thermal throttling.
          </p>
        </div>

        <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="text-sm font-bold text-white">100% On-Device Privacy</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Streaming audio and video frames never leave the smartphone. No audio data is uploaded to remote servers, eliminating legal and copyright concerns.
          </p>
        </div>
      </div>
    </div>
  );
};
