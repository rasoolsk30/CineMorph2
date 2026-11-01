export type CinemaSessionSource = 'local-file' | 'sample';
export type CinemaSessionStatus = 'initializing' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export interface CinemaSession {
  id: string;
  movieName: string;
  source: CinemaSessionSource;
  status: CinemaSessionStatus;
  startedAt: string;
  updatedAt: string;
  playbackSeconds: number;
  durationSeconds: number;
}

const makeSessionId = () => {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `cm-${randomId}`;
};

export function createCinemaSession(movieName: string, source: CinemaSessionSource): CinemaSession {
  const now = new Date().toISOString();
  return {
    id: makeSessionId(),
    movieName,
    source,
    status: 'initializing',
    startedAt: now,
    updatedAt: now,
    playbackSeconds: 0,
    durationSeconds: 0,
  };
}

export function updateCinemaSession(
  session: CinemaSession,
  patch: Partial<Pick<CinemaSession, 'status' | 'playbackSeconds' | 'durationSeconds'>>,
): CinemaSession {
  return { ...session, ...patch, updatedAt: new Date().toISOString() };
}

export function formatSessionTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
