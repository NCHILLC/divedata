// The divers a person follows. Kept on the phone only (AGENTS.md "Never": nothing is sent away).
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DiverRef } from './divemeets/parsers';

const KEY = 'follows';

type Follows = { divers: DiverRef[]; isFollowed(diverNumber: number): boolean; toggle(diver: DiverRef): Promise<void> };

const FollowsContext = createContext<Follows | null>(null);

export function FollowsProvider({ children }: { children: React.ReactNode }) {
  const [divers, setDivers] = useState<DiverRef[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => saved && setDivers(JSON.parse(saved)))
      .catch(() => {}); // unreadable storage starts with no followed divers
  }, []);

  const toggle = useCallback(
    async (diver: DiverRef) => {
      const next = divers.some((d) => d.diverNumber === diver.diverNumber)
        ? divers.filter((d) => d.diverNumber !== diver.diverNumber)
        : [...divers, diver];
      setDivers(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    },
    [divers],
  );

  const value = useMemo(
    () => ({ divers, toggle, isFollowed: (n: number) => divers.some((d) => d.diverNumber === n) }),
    [divers, toggle],
  );
  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows(): Follows {
  const follows = useContext(FollowsContext);
  if (!follows) throw new Error('useFollows needs a FollowsProvider');
  return follows;
}
