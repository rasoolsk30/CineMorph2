import React from 'react';
import { RecentlyWatchedSection } from './RecentlyWatchedSection';
import type { User } from 'firebase/auth';

export interface HistoryViewProps {
  currentUser?: User | null;
  currentMovieId?: string;
  onResumeMovie: (movieId: string, progressSeconds: number) => void;
  lastSyncedTimestamp?: string | null;
}

/** Named HistoryView screen for the last ten Firestore watch-progress records. */
export const HistoryView: React.FC<HistoryViewProps> = (props) => (
  <section aria-label="Watch history">
    <RecentlyWatchedSection {...props} />
  </section>
);
