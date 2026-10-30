import React from 'react';
import { Film, Smartphone, Play } from 'lucide-react';

interface NavbarProps {
  activeTab: 'player' | 'masterplan' | 'ai-lab' | 'architecture';
  setActiveTab: (tab: 'player' | 'masterplan' | 'ai-lab' | 'architecture') => void;
  isMobilePreview: boolean;
  setIsMobilePreview: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMobilePreview,
  setIsMobilePreview,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#08090d]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div 
          onClick={() => setActiveTab('player')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors">
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              CineMorph <span className="text-amber-400 font-mono-num text-xs font-semibold px-1 py-0.2 border border-amber-500/30 rounded bg-amber-500/10">AI</span>
            </span>
          </div>
        </div>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('player')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'player'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Remaster Player
            {activeTab === 'player' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('masterplan')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'masterplan'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Market Moat Blueprint
            {activeTab === 'masterplan' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai-lab')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'ai-lab'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Voice & Slang Lab
            {activeTab === 'ai-lab' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'architecture'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            On-Device NPU Tech
            {activeTab === 'architecture' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action & Mobile Frame Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobilePreview(!isMobilePreview)}
            title="Toggle between Mobile App Frame and Full Desktop view"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              isMobilePreview
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isMobilePreview ? 'Desktop View' : 'Mobile Preview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('player')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Cinema</span>
          </button>
        </div>
      </div>
    </header>
  );
};
