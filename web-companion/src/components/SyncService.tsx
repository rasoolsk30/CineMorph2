import React, { useRef, useState } from 'react';
import { FileVideo, Link2, CheckCircle2, AlertCircle } from 'lucide-react';

type SyncServiceProps = {
  selectedFileName: string | null;
  onVideoSelected: (file: File) => void;
  syncStatus: 'loading' | 'ready' | 'error';
};

/**
 * Browser-only local media linker for synchronization testing.
 * The selected file stays on the user's device; it is not uploaded.
 */
export const SyncService: React.FC<SyncServiceProps> = ({
  selectedFileName,
  onVideoSelected,
  syncStatus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mkv|avi|mov|webm|mp4|m4v)$/i.test(file.name);
    if (!isVideo) {
      setSelectionError('Choose a supported video file.');
      event.target.value = '';
      return;
    }
    setSelectionError(null);
    onVideoSelected(file);
    // Let the same file be selected again after a later change.
    event.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20"
        aria-label="Link a local video for synchronization testing"
      >
        <FileVideo className="h-3.5 w-3.5" />
        <span>Sync Service · Choose Video</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.avi,.mov,.webm,.mp4,.m4v"
        onChange={handleChange}
        className="sr-only"
        aria-label="Select a local video file"
      />
      {selectedFileName ? (
        <span className="inline-flex max-w-[240px] items-center gap-1.5 truncate text-[11px] text-sky-300" title={selectedFileName}>
          {syncStatus === 'ready' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Link2 className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">Linked: {selectedFileName}</span>
        </span>
      ) : (
        <span className="text-[11px] text-slate-400">Link a local file to test playback sync</span>
      )}
      {selectionError && (
        <span role="alert" className="inline-flex items-center gap-1 text-[11px] text-rose-300">
          <AlertCircle className="h-3.5 w-3.5" /> {selectionError}
        </span>
      )}
      <span className="basis-full text-[10px] text-slate-500">
        Browser-local only · no upload · frame-step keys: ← / →
      </span>
    </div>
  );
};
