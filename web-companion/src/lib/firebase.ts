import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  getDocFromServer,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CoWatchRoom, CoWatchMessage } from '../types';

// Initialize Firebase App and Services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore: client is offline or network unreachable.");
    }
  }
}
// Connection checks are intentionally opt-in; local playback must not depend on Firebase.

// Auto authenticate with anonymous account or return existing
export async function ensureAuthenticatedUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth error:', err);
    return null;
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  try {
    const res = await signInWithPopup(auth, provider);
    return res.user;
  } catch (err) {
    console.error('Google Sign In Error:', err);
    return null;
  }
}

export async function logoutUser() {
  await signOut(auth);
}

export interface MovieWatchProgressData {
  userId: string;
  movieId: string;
  progressSeconds: number;
  progressPercent: number;
  lastWatchedAt: string;
  dubbingMood?: string;
  targetLang?: string;
  volume?: number;
  brightness?: number;
  subtitleMode?: string;
  dubbingEnabled?: boolean;
  remasterEnabled?: boolean;
  pulseSyncEnabled?: boolean;
  pulseSyncMode?: string;
  accessibilityOverlayEnabled?: boolean;
  highContrastSubtitleMode?: string;
  audioDescriptionEnabled?: boolean;
  subtitleFontSize?: string;
  activeVoicePersona?: string;
  subtitleDriftMs?: number;
}

// Save Watch Progress
export async function saveWatchProgress(userId: string, movieId: string, data: Partial<MovieWatchProgressData>) {
  if (!userId || !movieId) return;
  const path = `users/${userId}/watch_progress/${movieId}`;
  const docRef = doc(db, 'users', userId, 'watch_progress', movieId);
  
  const payload: MovieWatchProgressData = {
    userId,
    movieId,
    progressSeconds: Math.max(0, Number(data.progressSeconds || 0)),
    progressPercent: Math.min(100, Math.max(0, Number(data.progressPercent || 0))),
    lastWatchedAt: new Date().toISOString(),
    dubbingMood: data.dubbingMood || 'dramatic',
    targetLang: data.targetLang || 'te',
    volume: Math.min(1, Math.max(0, Number(data.volume ?? 0.8))),
    brightness: Math.min(250, Math.max(30, Number(data.brightness ?? 100))),
    subtitleMode: data.subtitleMode || 'smart-glance',
    dubbingEnabled: data.dubbingEnabled ?? true,
    remasterEnabled: data.remasterEnabled ?? true,
    pulseSyncEnabled: data.pulseSyncEnabled ?? false,
    pulseSyncMode: data.pulseSyncMode || 'auto',
    accessibilityOverlayEnabled: data.accessibilityOverlayEnabled ?? false,
    highContrastSubtitleMode: data.highContrastSubtitleMode || 'standard',
    audioDescriptionEnabled: data.audioDescriptionEnabled ?? false,
    subtitleFontSize: data.subtitleFontSize || 'normal',
    activeVoicePersona: data.activeVoicePersona || 'persona-allu',
    subtitleDriftMs: data.subtitleDriftMs ?? 0,
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch Watch Progress for single movie
export async function getWatchProgress(userId: string, movieId: string): Promise<MovieWatchProgressData | null> {
  if (!userId || !movieId) return null;
  const path = `users/${userId}/watch_progress/${movieId}`;
  const docRef = doc(db, 'users', userId, 'watch_progress', movieId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MovieWatchProgressData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Fetch All Watch Progress for User (Recently Watched list)
export async function getAllWatchProgress(userId: string): Promise<MovieWatchProgressData[]> {
  if (!userId) return [];
  const path = `users/${userId}/watch_progress`;
  const colRef = collection(db, 'users', userId, 'watch_progress');
  try {
    const querySnap = await getDocs(colRef);
    const results: MovieWatchProgressData[] = [];
    querySnap.forEach((doc) => {
      if (doc.exists()) {
        results.push(doc.data() as MovieWatchProgressData);
      }
    });
    // Sort by lastWatchedAt descending
    return results.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// ==========================================
// Co-Watch Real-Time Party & Synced Playback
// ==========================================

export async function createCoWatchRoom(
  roomId: string,
  host: { uid: string; name: string },
  movieId: string,
  movieTitle: string,
  targetLang: string = 'te'
): Promise<CoWatchRoom> {
  const path = `cowatch_rooms/${roomId}`;
  const docRef = doc(db, 'cowatch_rooms', roomId);
  const now = Date.now();
  const roomData: CoWatchRoom = {
    roomId,
    hostId: host.uid,
    hostName: host.name || 'Cinema Host',
    movieId,
    movieTitle,
    isPlaying: false,
    currentTime: 0,
    lastUpdated: now,
    targetLang,
    createdAt: new Date().toISOString(),
    participants: [
      { uid: host.uid, name: host.name || 'Cinema Host', joinedAt: new Date().toISOString(), isHost: true }
    ],
    activeUserCount: 1
  };

  try {
    await setDoc(docRef, roomData);
    return roomData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function joinCoWatchRoom(
  roomId: string,
  user: { uid: string; name: string }
): Promise<CoWatchRoom | null> {
  const path = `cowatch_rooms/${roomId}`;
  const docRef = doc(db, 'cowatch_rooms', roomId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as CoWatchRoom;
    const participants = data.participants || [];
    const exists = participants.some(p => p.uid === user.uid);
    const updatedParticipants = exists
      ? participants
      : [...participants, { uid: user.uid, name: user.name || 'Guest', joinedAt: new Date().toISOString() }];

    await updateDoc(docRef, {
      participants: updatedParticipants,
      activeUserCount: updatedParticipants.length,
      lastUpdated: Date.now()
    });

    return { ...data, participants: updatedParticipants, activeUserCount: updatedParticipants.length };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateCoWatchPlayback(
  roomId: string,
  isPlaying: boolean,
  currentTime: number
): Promise<void> {
  const docRef = doc(db, 'cowatch_rooms', roomId);
  try {
    await updateDoc(docRef, {
      isPlaying,
      currentTime: Math.max(0, Math.round(currentTime * 100) / 100),
      lastUpdated: Date.now()
    });
  } catch (err) {
    console.warn('Playback sync notice:', err);
  }
}

export function subscribeToCoWatchRoom(
  roomId: string,
  onUpdate: (room: CoWatchRoom | null) => void
): () => void {
  const docRef = doc(db, 'cowatch_rooms', roomId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as CoWatchRoom);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn('CoWatch room snapshot warning:', err);
  });
}

export async function sendCoWatchMessage(
  roomId: string,
  sender: { uid: string; name: string },
  text: string,
  color: string = '#f59e0b'
): Promise<void> {
  const path = `cowatch_rooms/${roomId}/messages`;
  const colRef = collection(db, 'cowatch_rooms', roomId, 'messages');
  try {
    await addDoc(colRef, {
      roomId,
      senderId: sender.uid,
      senderName: sender.name || 'Viewer',
      text: text.slice(0, 300),
      timestamp: new Date().toISOString(),
      color
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToCoWatchMessages(
  roomId: string,
  onUpdate: (messages: CoWatchMessage[]) => void
): () => void {
  const colRef = collection(db, 'cowatch_rooms', roomId, 'messages');
  const q = query(colRef, orderBy('timestamp', 'asc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const msgs: CoWatchMessage[] = [];
    snapshot.forEach(docSnap => {
      msgs.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    onUpdate(msgs);
  }, (err) => {
    console.warn('CoWatch chat snapshot warning:', err);
  });
}

export interface DubbingHistoryItem {
  id?: string;
  userId: string;
  movieId: string;
  movieTitle: string;
  language: string;
  dialogueText: string;
  teluguTranscreation: string;
  personaName: string;
  pitch: number;
  createdAt: string;
}

export async function saveDubbingHistoryItem(userId: string, item: Omit<DubbingHistoryItem, 'userId' | 'createdAt'>): Promise<void> {
  if (!userId) return;
  const colRef = collection(db, 'users', userId, 'dubbing_history');
  const payload: DubbingHistoryItem = {
    ...item,
    userId,
    createdAt: new Date().toISOString(),
  };
  try {
    await addDoc(colRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/dubbing_history`);
  }
}

export async function getDubbingHistoryItems(userId: string): Promise<DubbingHistoryItem[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'dubbing_history');
  try {
    const snap = await getDocs(colRef);
    const results: DubbingHistoryItem[] = [];
    snap.forEach((doc) => {
      if (doc.exists()) {
        results.push({ id: doc.id, ...(doc.data() as any) });
      }
    });
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/dubbing_history`);
    return [];
  }
}

