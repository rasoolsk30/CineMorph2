/** Firebase Realtime Database Co-Watch service.
 * Set VITE_FIREBASE_DATABASE_URL to the exact URL shown in Firebase Console.
 * Watch history remains in Firestore; room state and chat use Realtime Database.
 */
import { getDatabase, ref, get, set, update, push, onValue, query, limitToLast, type Unsubscribe } from 'firebase/database';
import { app } from './firebase';
import type { CoWatchRoom, CoWatchMessage } from '../types';

declare global {
  interface Window { __CINEMORPH_CONFIG__?: { firebaseDatabaseURL?: string };
  }
}

const databaseUrl = (window.__CINEMORPH_CONFIG__?.firebaseDatabaseURL || import.meta.env.VITE_FIREBASE_DATABASE_URL || '').trim();
function database() {
  if (!databaseUrl) throw new Error('Co-Watch needs VITE_FIREBASE_DATABASE_URL from Firebase Console.');
  return getDatabase(app, databaseUrl);
}
const roomPath = (id: string) => `cowatch_rooms/${id}`;

export async function createCoWatchRoomRtdb(roomId: string, host: { uid: string; name: string }, movieId: string, movieTitle: string, targetLang = 'te'): Promise<CoWatchRoom> {
  const now = Date.now();
  const room: CoWatchRoom = {
    roomId, hostId: host.uid, hostName: host.name || 'Cinema Host', movieId, movieTitle,
    isPlaying: false, currentTime: 0, lastUpdated: now, targetLang, createdAt: new Date(now).toISOString(),
    participants: [{ uid: host.uid, name: host.name || 'Cinema Host', joinedAt: new Date(now).toISOString(), isHost: true }], activeUserCount: 1
  };
  await set(ref(database(), roomPath(roomId)), room);
  return room;
}

export async function joinCoWatchRoomRtdb(roomId: string, user: { uid: string; name: string }): Promise<CoWatchRoom | null> {
  const db = database();
  const roomRef = ref(db, roomPath(roomId));
  const snap = await get(roomRef);
  if (!snap.exists()) return null;
  const room = snap.val() as CoWatchRoom;
  const participants = Array.isArray(room.participants) ? room.participants : [];
  if (!participants.some(p => p.uid === user.uid)) {
    participants.push({ uid: user.uid, name: user.name || 'Guest', joinedAt: new Date().toISOString(), isHost: false });
  }
  // Room metadata is host-writable; guest membership is returned locally to avoid granting guests room-wide write access.
  return { ...room, participants, activeUserCount: participants.length };
}

export async function updateCoWatchPlaybackRtdb(roomId: string, isPlaying: boolean, currentTime: number): Promise<void> {
  await update(ref(database(), roomPath(roomId)), { isPlaying, currentTime: Math.max(0, currentTime), lastUpdated: Date.now() });
}

export function subscribeToCoWatchRoomRtdb(roomId: string, callback: (room: CoWatchRoom | null) => void): Unsubscribe {
  return onValue(ref(database(), roomPath(roomId)), snap => callback(snap.exists() ? snap.val() as CoWatchRoom : null));
}

export async function sendCoWatchMessageRtdb(roomId: string, sender: { uid: string; name: string }, text: string, color = '#f59e0b'): Promise<void> {
  const messagesRef = ref(database(), `${roomPath(roomId)}/messages`);
  await set(push(messagesRef), { roomId, senderId: sender.uid, senderName: (sender.name || 'Viewer').slice(0, 64), text: text.slice(0, 500), timestamp: new Date().toISOString(), color });
}

export function subscribeToCoWatchMessagesRtdb(roomId: string, callback: (messages: CoWatchMessage[]) => void): Unsubscribe {
  const messagesRef = query(ref(database(), `${roomPath(roomId)}/messages`), limitToLast(50));
  let items: CoWatchMessage[] = [];
  return onValue(messagesRef, snap => {
    items = [];
    snap.forEach(child => { const value = child.val(); if (value) items.push({ id: child.key || undefined, ...value } as CoWatchMessage); });
    items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    callback(items);
  });
}
