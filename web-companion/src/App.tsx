/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CinemaPlayer } from './components/CinemaPlayer';
import { MarketMasterplan } from './components/MarketMasterplan';
import { AiStudioPlayground } from './components/AiStudioPlayground';
import { ArchitectureView } from './components/ArchitectureView';
import { LocalVideoVault } from './components/LocalVideoVault';
import { Play, Sparkles, BookOpen, Cpu, Film, Archive } from 'lucide-react';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CineMorph UI crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="w-full max-w-3xl mx-auto my-8 rounded-2xl border border-red-500/40 bg-slate-950 p-6 text-slate-100">
          <h2 className="text-xl font-bold text-red-400">CineMorph UI Error</h2>
          <p className="mt-2 text-sm text-slate-300">
            The page loaded, but a frontend component crashed. Share the error below so it can be fixed.
          </p>
          <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black p-4 text-xs text-amber-200">
            {this.state.error.message}
            {this.state.error.stack ? `\\n\\n${this.state.error.stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950"
          >
            Reload CineMorph
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'vault' | 'masterplan' | 'ai-lab' | 'architecture'>('player');
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isCinemaLaunched, setIsCinemaLaunched] = useState(false);
  const [selectedLocalMovie, setSelectedLocalMovie] = useState<File | null>(null);

  const launchCinema = () => {
    setActiveTab('player');
    if (!selectedLocalMovie) {
      setIsCinemaLaunched(false);
      return;
    }
    setIsCinemaLaunched(true);
    window.setTimeout(() => {
      document.getElementById('cinemorph-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
  };

  const playVaultFile = (file: File) => {
    setSelectedLocalMovie(file);
    setIsCinemaLaunched(true);
    setActiveTab('player');
  };

  const renderLaunchScreen = () => (
    <section className="w-full max-w-5xl mx-auto min-h-[68vh] flex items-center justify-center">
      <div className="w-full rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 sm:p-14 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
          <Film className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-amber-400">CineMorph AI</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Your Cinema. Your Controls.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-7 text-slate-400">
          Launch the cinema workspace, choose a movie, and configure playback, audio, subtitles and available AI tools in one place.
        </p>
        <label className="mx-auto mt-7 flex max-w-xl cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/70 px-5 py-5 text-sm text-slate-200 transition hover:border-amber-400 hover:bg-slate-900">
          <span className="font-semibold">{selectedLocalMovie ? 'Selected movie' : 'Choose a local movie'}</span>
          <span className="max-w-full truncate text-xs text-slate-400">{selectedLocalMovie ? selectedLocalMovie.name : 'Select a video file from this device · no upload'}</span>
          <input
            type="file"
            accept="video/*,.mkv,.avi,.mov,.webm,.mp4,.m4v"
            className="sr-only"
            onChange={event => setSelectedLocalMovie(event.target.files?.[0] || null)}
          />
        </label>
        <button
          type="button"
          onClick={launchCinema}
          disabled={!selectedLocalMovie}
          className="mt-8 inline-flex items-center gap-3 rounded-xl bg-amber-400 px-7 py-4 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98]"
        >
          <Play className="h-5 w-5 fill-current" />
          Launch Cinema
        </button>
        <p className="mt-5 text-xs text-slate-500">The selected movie stays on this device. Launch starts its local playback session; AI and cloud services report their own availability.</p>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
        onLaunchCinema={launchCinema}
      />

      <AppErrorBoundary>
        <main className="flex-1 flex flex-col items-center justify-start w-full px-4 sm:px-6 lg:px-8 py-6">
          {isMobilePreview ? (
            <div className="w-full max-w-[420px] bg-slate-950 border-4 border-slate-800 rounded-[3rem] p-3 shadow-2xl relative my-4 overflow-hidden min-h-[820px] flex flex-col">
              <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-3 shrink-0" />
              <div className="flex-1 overflow-y-auto pb-20">
                {activeTab === 'player' && !isCinemaLaunched && renderLaunchScreen()}
                {activeTab === 'vault' && <LocalVideoVault onPlayFile={playVaultFile} />}
                {activeTab === 'player' && isCinemaLaunched && <CinemaPlayer initialLocalFile={selectedLocalMovie} />}
                {activeTab === 'masterplan' && <MarketMasterplan />}
                {activeTab === 'ai-lab' && <AiStudioPlayground />}
                {activeTab === 'architecture' && <ArchitectureView />}
              </div>
              <div className="absolute bottom-3 left-3 right-3 h-16 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-around px-2 z-40">
                <button onClick={launchCinema} className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${activeTab === 'player' ? 'text-amber-400' : 'text-slate-400'}`}>
                  <Play className="w-5 h-5 fill-current" />
                  <span className="text-[10px] font-medium mt-1">Player</span>
                </button>
                <button onClick={() => setActiveTab('vault')} className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${activeTab === 'vault' ? 'text-amber-400' : 'text-slate-400'}`}>
                  <Archive className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1">Vault</span>
                </button>
                <button onClick={() => setActiveTab('masterplan')} className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${activeTab === 'masterplan' ? 'text-amber-400' : 'text-slate-400'}`}>
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1">Strategy</span>
                </button>
                <button onClick={() => setActiveTab('ai-lab')} className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${activeTab === 'ai-lab' ? 'text-amber-400' : 'text-slate-400'}`}>
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1">Voice AI</span>
                </button>
                <button onClick={() => setActiveTab('architecture')} className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${activeTab === 'architecture' ? 'text-amber-400' : 'text-slate-400'}`}>
                  <Cpu className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1">NPU Tech</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-7xl">
              {activeTab === 'player' && !isCinemaLaunched && renderLaunchScreen()}
              {activeTab === 'vault' && <LocalVideoVault onPlayFile={playVaultFile} />}
              {activeTab === 'player' && isCinemaLaunched && <CinemaPlayer initialLocalFile={selectedLocalMovie} />}
              {activeTab === 'masterplan' && <MarketMasterplan />}
              {activeTab === 'ai-lab' && <AiStudioPlayground />}
              {activeTab === 'architecture' && <ArchitectureView />}
            </div>
          )}
        </main>
      </AppErrorBoundary>

      <footer className="border-t border-slate-900 bg-[#06070a] py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">CineMorph AI</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Reading Cinema Experience</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>On-Device NPU Synthesis</span>
            <span aria-hidden="true">·</span>
            <span>Dolby 5.1 Acoustic Isolation</span>
            <span aria-hidden="true">·</span>
            <span>Firestore Cloud Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
