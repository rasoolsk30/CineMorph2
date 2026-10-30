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
import { Play, Sparkles, BookOpen, Cpu, Smartphone } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'masterplan' | 'ai-lab' | 'architecture'>('player');
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Universal Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Preview Frame Wrapper */}
        {isMobilePreview ? (
          <div className="w-full max-w-[420px] bg-slate-950 border-4 border-slate-800 rounded-[3rem] p-3 shadow-2xl relative my-4 overflow-hidden min-h-[820px] flex flex-col">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-3 shrink-0" />

            <div className="flex-1 overflow-y-auto pb-20">
              {activeTab === 'player' && <CinemaPlayer />}
              {activeTab === 'masterplan' && <MarketMasterplan />}
              {activeTab === 'ai-lab' && <AiStudioPlayground />}
              {activeTab === 'architecture' && <ArchitectureView />}
            </div>

            {/* Mobile Fixed Bottom Nav Bar (Pattern 1) */}
            <div className="absolute bottom-3 left-3 right-3 h-16 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-around px-2 z-40">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${
                  activeTab === 'player' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span className="text-[10px] font-medium mt-1">Player</span>
              </button>

              <button
                onClick={() => setActiveTab('masterplan')}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${
                  activeTab === 'masterplan' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">Strategy</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-lab')}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${
                  activeTab === 'ai-lab' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">Voice AI</span>
              </button>

              <button
                onClick={() => setActiveTab('architecture')}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${
                  activeTab === 'architecture' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <Cpu className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">NPU Tech</span>
              </button>
            </div>
          </div>
        ) : (
          /* Full Desktop / Tablet Layout */
          <div className="w-full max-w-7xl">
            {activeTab === 'player' && <CinemaPlayer />}
            {activeTab === 'masterplan' && <MarketMasterplan />}
            {activeTab === 'ai-lab' && <AiStudioPlayground />}
            {activeTab === 'architecture' && <ArchitectureView />}
          </div>
        )}
      </main>

      {/* Clean Editorial Footer */}
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
