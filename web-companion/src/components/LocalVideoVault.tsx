import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Trash2, RotateCcw, Play, FolderOpen, ShieldAlert, CheckSquare } from 'lucide-react';

type VaultEntry = { id: string; name: string; type: string; size: number; blob: Blob; deletedAt: number | null; addedAt: number };
const DB_NAME = 'cinemorph-local-vault';
const STORE = 'videos';
function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Vault storage unavailable'));
  });
}
async function vaultRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    let result: T;
    let settled = false;
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => {
      if (!settled) {
        settled = true;
        db.close();
        reject(req.error || new Error('Vault operation failed'));
      }
    };
    tx.oncomplete = () => {
      db.close();
      if (!settled) { settled = true; resolve(result); }
    };
    tx.onabort = () => {
      db.close();
      if (!settled) { settled = true; reject(tx.error || new Error('Vault transaction was aborted')); }
    };
    tx.onerror = () => {
      db.close();
      if (!settled) { settled = true; reject(tx.error || new Error('Vault transaction failed')); }
    };
  });
}
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random();

export const LocalVideoVault: React.FC<{ onPlayFile: (file: File) => void }> = ({ onPlayFile }) => {
  const [staged, setStaged] = useState<File[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [tab, setTab] = useState<'vault' | 'bin'>('vault');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'largest'>('newest');
  const refresh = async () => {
    try { setEntries(await vaultRequest<VaultEntry[]>('readonly', store => store.getAll())); }
    catch (e: any) { setError(e?.message || 'Could not read local vault.'); }
  };
  useEffect(() => { void refresh(); }, []);
  const visible = useMemo(() => entries
    .filter(e => tab === 'vault' ? !e.deletedAt : !!e.deletedAt)
    .filter(e => e.name.toLowerCase().includes(searchText.trim().toLowerCase()))
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'largest' ? b.size - a.size : b.addedAt - a.addedAt), [entries, tab, searchText, sortBy]);
  const allVisibleSelected = visible.length > 0 && visible.every(entry => selectedEntries.includes(entry.id));
  const toggleAllVisible = () => setSelectedEntries(allVisibleSelected ? [] : visible.map(entry => entry.id));
  const toggleEntry = (id: string, checked: boolean) => setSelectedEntries(old => checked ? [...old.filter(x => x !== id), id] : old.filter(x => x !== id));
  const runBulkAction = async (action: 'recycle' | 'restore' | 'delete') => {
    const targets = visible.filter(entry => selectedEntries.includes(entry.id));
    if (!targets.length) return;
    if (action === 'delete' && !window.confirm(`Permanently delete ${targets.length} selected video(s) from the CineMorph Vault? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      for (const entry of targets) {
        if (action === 'recycle') await vaultRequest('readwrite', store => store.put({ ...entry, deletedAt: Date.now() }));
        else if (action === 'restore') await vaultRequest('readwrite', store => store.put({ ...entry, deletedAt: null }));
        else await vaultRequest('readwrite', store => store.delete(entry.id));
      }
      setSelectedEntries([]);
      await refresh();
    } catch (e: any) { setError(e?.message || 'The selected action could not be completed.'); }
    finally { setBusy(false); }
  };
  const stageFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith('video/') || /\.(mkv|avi|mov|webm|mp4|m4v)$/i.test(f.name));
    setStaged(prev => [...prev, ...valid]);
    setError(valid.length === files.length ? '' : 'Some selected files were not recognized as videos.');
  };
  const moveToVault = async () => {
    if (!selected.length) return;
    setBusy(true); setError('');
    try {
      for (const id of selected) {
        const file = staged[Number(id)];
        if (file) await vaultRequest<IDBValidKey>('readwrite', store => store.put({ id: makeId(), name: file.name, type: file.type, size: file.size, blob: file, deletedAt: null, addedAt: Date.now() } satisfies VaultEntry));
      }
      setStaged([]); setSelected([]); await refresh();
    } catch (e: any) { setError(e?.name === 'QuotaExceededError' ? 'Device storage is full. Free space and try again.' : e?.message || 'Could not save videos to vault.'); }
    finally { setBusy(false); }
  };
  const runSingleAction = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await operation(); await refresh(); }
    catch (e: any) { setError(e?.message || 'The video action could not be completed.'); }
    finally { setBusy(false); }
  };
  const softDelete = async (entry: VaultEntry) => runSingleAction(() => vaultRequest('readwrite', store => store.put({ ...entry, deletedAt: Date.now() })));
  const restore = async (entry: VaultEntry) => runSingleAction(() => vaultRequest('readwrite', store => store.put({ ...entry, deletedAt: null })));
  const permanentDelete = async (entry: VaultEntry) => {
    if (!window.confirm('Permanently delete this video from the CineMorph Vault? This cannot be undone.')) return;
    await runSingleAction(() => vaultRequest('readwrite', store => store.delete(entry.id)));
  };
  const play = (entry: VaultEntry) => onPlayFile(new File([entry.blob], entry.name, { type: entry.type || 'video/mp4' }));
  const sizeLabel = (bytes: number) => bytes >= 1024 ** 3 ? (bytes / 1024 ** 3).toFixed(2) + ' GB' : (bytes / 1024 ** 2).toFixed(1) + ' MB';

  return <section className="mb-5 rounded-2xl border border-indigo-500/25 bg-slate-950/80 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-sm font-bold text-white"><Archive className="h-4 w-4 text-indigo-300" /> Local Video Vault</h3><p className="mt-1 text-[11px] text-slate-400">Copy videos into this app's private local library on this device. Original files are not changed or deleted.</p></div>
      <label className="cursor-pointer rounded-lg bg-indigo-400 px-3 py-2 text-xs font-bold text-slate-950"><FolderOpen className="mr-1 inline h-3.5 w-3.5" /> Select videos<input className="hidden" type="file" multiple accept="video/*,.mkv,.avi,.mov,.webm,.mp4,.m4v" onChange={e => stageFiles(e.target.files)} /></label>
    </div>
    {staged.length > 0 && <div className="mt-3 rounded-xl border border-slate-800 p-3"><p className="mb-2 text-xs font-semibold text-slate-200">Selected files — tick the videos to add</p>
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-indigo-200"><input type="checkbox" checked={staged.length > 0 && selected.length === staged.length} onChange={e => setSelected(e.target.checked ? staged.map((_, i) => String(i)) : [])} /> Select all staged videos</label>
      {staged.map((f, i) => <label key={i} className="flex items-center gap-2 border-b border-slate-900 py-2 text-xs text-slate-300"><input type="checkbox" checked={selected.includes(String(i))} onChange={e => setSelected(old => e.target.checked ? [...old, String(i)] : old.filter(x => x !== String(i)))} /><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-slate-500">{sizeLabel(f.size)}</span></label>)}
      <button disabled={!selected.length || busy} onClick={moveToVault} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">{busy ? 'Saving…' : 'Copy selected to Vault'}</button>
    </div>}
    <div className="mt-4 flex gap-2"><button onClick={() => { setTab('vault'); setSelectedEntries([]); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === 'vault' ? 'bg-indigo-400 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Vault ({entries.filter(e => !e.deletedAt).length})</button><button onClick={() => { setTab('bin'); setSelectedEntries([]); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === 'bin' ? 'bg-indigo-400 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>Recycle Bin ({entries.filter(e => !!e.deletedAt).length})</button></div>
    <div className="mt-3 flex flex-wrap gap-2">
      <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search videos…" className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-400" />
      <select value={sortBy} onChange={e => setSortBy(e.target.value as 'newest' | 'name' | 'largest')} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="largest">Largest first</option></select>
    </div>
    {visible.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">{tab === 'vault' ? 'Vault is empty. Select videos above to add them.' : 'Recycle Bin is empty.'}</p> : <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-200"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /><CheckSquare className="h-4 w-4 text-indigo-300" /> Select all ({visible.length})</label>
        <span className="text-[10px] text-slate-400">{selectedEntries.filter(id => visible.some(entry => entry.id === id)).length} selected</span>
        <div className="flex flex-wrap gap-2">
          {tab === 'vault' ? <button disabled={!selectedEntries.length || busy} onClick={() => void runBulkAction('recycle')} className="rounded-md bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 disabled:opacity-40"><Trash2 className="mr-1 inline h-3 w-3" /> Recycle selected</button> : <>
            <button disabled={!selectedEntries.length || busy} onClick={() => void runBulkAction('restore')} className="rounded-md bg-emerald-500/15 px-3 py-2 text-[11px] font-bold text-emerald-300 disabled:opacity-40"><RotateCcw className="mr-1 inline h-3 w-3" /> Restore selected</button>
            <button disabled={!selectedEntries.length || busy} onClick={() => void runBulkAction('delete')} className="rounded-md bg-red-500/15 px-3 py-2 text-[11px] font-bold text-red-300 disabled:opacity-40"><Trash2 className="mr-1 inline h-3 w-3" /> Delete permanently</button>
          </>}
        </div>
      </div>
      <div className="mt-2 divide-y divide-slate-900">{visible.map(entry => <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
        <input aria-label={`Select ${entry.name}`} type="checkbox" checked={selectedEntries.includes(entry.id)} onChange={e => toggleEntry(entry.id, e.target.checked)} />
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-200">{entry.name}</p><p className="text-[10px] text-slate-500">{sizeLabel(entry.size)}</p></div>
        {tab === 'vault' ? <><button onClick={() => play(entry)} className="rounded-md bg-emerald-500/15 px-2.5 py-2 text-[11px] font-semibold text-emerald-300"><Play className="mr-1 inline h-3 w-3" /> Play</button><button onClick={() => void softDelete(entry)} className="rounded-md bg-slate-800 px-2.5 py-2 text-[11px] text-slate-300"><Trash2 className="mr-1 inline h-3 w-3" /> Recycle</button></> : <><button onClick={() => void restore(entry)} className="rounded-md bg-emerald-500/15 px-2.5 py-2 text-[11px] text-emerald-300"><RotateCcw className="mr-1 inline h-3 w-3" /> Restore</button><button onClick={() => void permanentDelete(entry)} className="rounded-md bg-red-500/15 px-2.5 py-2 text-[11px] text-red-300"><Trash2 className="mr-1 inline h-3 w-3" /> Delete forever</button></>}
      </div>)}</div>
    </>}
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-amber-200/80"><ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Browser security limitation: recycling or permanently deleting here affects only the Vault copy. The original file in Downloads/Gallery cannot be moved or deleted by this web app; native Android file access is needed for that.</p>
  </section>;
};
