
'use client';

import { FirebaseProvider } from '@/firebase/provider';
import { CricketProvider } from '@/components/cricket/cricket-provider';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseProvider>
      <CricketProvider>{children}</CricketProvider>
    </FirebaseProvider>
  );
}
