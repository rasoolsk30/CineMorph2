import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, MessageSquare, Send, Copy, Check, Radio, Play, Pause, 
  Sparkles, X, User, Heart, Flame, Smile, Popcorn, Zap, AlertCircle
} from 'lucide-react';
import { CoWatchRoom, CoWatchMessage, MovieScene } from '../types';
import {
  createCoWatchRoomRtdb as createCoWatchRoom, joinCoWatchRoomRtdb as joinCoWatchRoom,
  updateCoWatchPlaybackRtdb as updateCoWatchPlayback, subscribeToCoWatchRoomRtdb as subscribeToCoWatchRoom,
  sendCoWatchMessageRtdb as sendCoWatchMessage, subscribeToCoWatchMessagesRtdb as subscribeToCoWatchMessages
} from '../lib/cowatch-rtdb';
import { User as FirebaseUser } from 'firebase/auth';
import { ensureAuthenticatedUser } from '../lib/firebase';

interface CoWatchPartyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMovie: MovieScene;
  currentTime: number;
  isPlaying: boolean;
  onSyncSeek: (seconds: number) => void;
  onSyncPlay: () => void;
  onSyncPause: () => void;
  currentUser: FirebaseUser | null;
  targetLang: string;
}

export const CoWatchPartyDrawer: React.FC<CoWatchPartyDrawerProps> = ({
  isOpen,
  onClose,
  currentMovie,
  currentTime,
  isPlaying,
  onSyncSeek,
  onSyncPlay,
  onSyncPause,
  currentUser,
  targetLang,
}) => {
  const [activeRoom, setActiveRoom] = useState<CoWatchRoom | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [messages, setMessages] = useState<CoWatchMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHost = activeRoom ? activeRoom.hostId === currentUser?.uid : false;
  const lastSyncTimestampRef = useRef<number>(0);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to Room State Updates
  useEffect(() => {
    if (!activeRoom?.roomId) return;

    const unsubscribeRoom = subscribeToCoWatchRoom(activeRoom.roomId, (updatedRoom) => {
      if (!updatedRoom) {
        setErrorNotice('Watch party session was ended or closed.');
        setActiveRoom(null);
        return;
      }

      setActiveRoom(updatedRoom);

      // If user is guest and auto-sync is on, synchronize playback with host
      if (!isHost && autoSyncEnabled) {
        const timeDiff = Math.abs(currentTime - updatedRoom.currentTime);
        // Only seek if time drifted by more than 1.5 seconds to prevent audio jitter
        if (timeDiff > 1.5 && Date.now() - lastSyncTimestampRef.current > 1000) {
          lastSyncTimestampRef.current = Date.now();
          onSyncSeek(updatedRoom.currentTime);
        }

        // Sync play/pause state
        if (updatedRoom.isPlaying && !isPlaying) {
          onSyncPlay();
        } else if (!updatedRoom.isPlaying && isPlaying) {
          onSyncPause();
        }
      }
    });

    const unsubscribeMessages = subscribeToCoWatchMessages(activeRoom.roomId, (newMsgs) => {
      setMessages(newMsgs);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeMessages();
    };
  }, [activeRoom?.roomId, isHost, autoSyncEnabled, isPlaying, currentTime]);

  // Host updates playback to Firebase Realtime Database room state
  useEffect(() => {
    if (!activeRoom?.roomId || !isHost) return;

    // Throttle playback updates to Realtime Database
    const timeout = setTimeout(() => {
      updateCoWatchPlayback(activeRoom.roomId, isPlaying, currentTime);
    }, 600);

    return () => clearTimeout(timeout);
  }, [isPlaying, Math.floor(currentTime), isHost, activeRoom?.roomId]);

  // Create Room Handler
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorNotice(null);
    try {
      const signedInUser = currentUser || await ensureAuthenticatedUser();
      if (!signedInUser) throw new Error('Firebase anonymous sign-in failed. Enable Anonymous Authentication.');
      const generatedCode = `CINE-${Math.floor(1000 + Math.random() * 9000)}`;
      const hostUser = {
        uid: signedInUser.uid,
        name: signedInUser.displayName || signedInUser.email?.split('@')[0] || 'Party Host',
      };

      const room = await createCoWatchRoom(
        generatedCode,
        hostUser,
        currentMovie.id,
        currentMovie.titleEnglish,
        targetLang
      );

      setActiveRoom(room);
      // Send initial welcome message
      await sendCoWatchMessage(generatedCode, hostUser, `🎬 Started Co-Watch for "${currentMovie.titleEnglish}"!`);
    } catch (err: any) {
      console.warn('Create room error:', err);
      setErrorNotice(err?.message || 'Could not create a real Co-Watch room. Check Firebase Realtime Database URL, Anonymous Auth, and database rules.');
    } finally {
      setIsCreating(false);
    }
  };

  // Join Room Handler
  const handleJoinRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    setErrorNotice(null);

    try {
      const signedInUser = currentUser || await ensureAuthenticatedUser();
      if (!signedInUser) throw new Error('Firebase anonymous sign-in failed. Enable Anonymous Authentication.');
      const guestUser = {
        uid: signedInUser.uid,
        name: signedInUser.displayName || signedInUser.email?.split('@')[0] || 'Cinema Friend',
      };

      const room = await joinCoWatchRoom(code, guestUser);
      if (room) {
        setActiveRoom(room);
        await sendCoWatchMessage(code, guestUser, `👋 Joined the watch party!`);
      } else {
        setErrorNotice('Room code not found in Firebase Realtime Database. Ask the host to verify the room code.');
      }
    } catch (err: any) {
      console.warn('Join room error:', err);
      setErrorNotice('Room code not found or offline. Try creating a new party.');
    } finally {
      setIsJoining(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? chatInput).trim();
    if (!text || !activeRoom) return;

    const signedInUser = currentUser || await ensureAuthenticatedUser();
    if (!signedInUser) { setErrorNotice('Sign-in is required to send Co-Watch messages.'); return; }
    const sender = {
      uid: signedInUser.uid,
      name: signedInUser.displayName || signedInUser.email?.split('@')[0] || (isHost ? 'Host' : 'Viewer'),
    };

    setChatInput('');
    try {
      await sendCoWatchMessage(activeRoom.roomId, sender, text);
    } catch (e) {
      // Optimistic local add
      setMessages(prev => [
        ...prev,
        {
          roomId: activeRoom.roomId,
          senderId: sender.uid,
          senderName: sender.name,
          text,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  };

  const handleCopyCode = () => {
    if (!activeRoom) return;
    navigator.clipboard?.writeText(activeRoom.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col font-sans animate-slide-left">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Co-Watch Party</span>
              {activeRoom && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono-num">
              Real-Time Playback Sync & Live Chat
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      {!activeRoom ? (
        /* Create or Join Room View */
        <div className="flex-1 p-6 flex flex-col justify-center gap-6 overflow-y-auto">
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 text-amber-400 mx-auto flex items-center justify-center mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Watch With Friends</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Invite friends across devices with synchronized pause, play, seek, and real-time movie chat.
            </p>
          </div>

          {errorNotice && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Create Room Button */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300">Host a Watch Party:</span>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreating ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
              <span>Create New Co-Watch Room</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex-1 h-px bg-slate-800" />
            <span>OR</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Join Room Form */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300">Join an Existing Room:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 6-char code (e.g. CINE-7482)"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomCodeInput.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Co-Watch Room View */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Room Info Bar */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Room:</span>
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {activeRoom.roomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1 font-mono-num">
                <User className="w-3 h-3 text-amber-400" />
                <span>{activeRoom.participants?.length || activeRoom.activeUserCount || 1} online</span>
              </span>

              <button
                onClick={() => setActiveRoom(null)}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline"
              >
                Leave
              </button>
            </div>
          </div>

          {/* Sync Status Banner */}
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">
                {isHost ? '👑 You are Host (Timeline Leader)' : '⚡ Playback Synced with Host'}
              </span>
            </div>

            {!isHost && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-400 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[10px]">Auto-Sync</span>
              </label>
            )}
          </div>

          {/* Real-time Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
                <span>No messages yet. Send a greeting or emoji reaction!</span>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser?.uid;
                const isSystem = msg.senderId === 'system';

                if (isSystem) {
                  return (
                    <div key={idx} className="text-center my-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-amber-300/80 font-mono-num">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-500 font-mono-num">
                      <span className="font-semibold text-slate-400">{msg.senderName}</span>
                      <span>·</span>
                      <span>{msg.timestamp?.slice(0, 5) || 'now'}</span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-amber-400 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reaction Emojis Bar */}
          <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-base">
            {['🔥', '👏', '🍿', '😱', '😂', '⚡', '❤️'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendMessage(emoji)}
                className="hover:scale-125 transition-transform p-1 active:scale-95"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Chat with watch party..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
