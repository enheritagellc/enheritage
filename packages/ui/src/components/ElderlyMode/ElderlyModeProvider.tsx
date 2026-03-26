import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface ElderlyModeContextValue {
  isElderlyMode: boolean;
  toggle: () => void;
}

const STORAGE_KEY = 'enheritage:elderlyMode';

export const ElderlyModeContext = createContext<ElderlyModeContextValue>({
  isElderlyMode: false,
  toggle: () => undefined,
});

export interface ElderlyModeProviderProps {
  children: React.ReactNode;
  defaultValue?: boolean;
}

export const ElderlyModeProvider: React.FC<ElderlyModeProviderProps> = ({
  children,
  defaultValue = false,
}) => {
  const [isElderlyMode, setIsElderlyMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // localStorage not available (SSR or private browsing)
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isElderlyMode));
    } catch {
      // ignore
    }
  }, [isElderlyMode]);

  const toggle = useCallback(() => {
    setIsElderlyMode((prev) => !prev);
  }, []);

  return (
    <ElderlyModeContext.Provider value={{ isElderlyMode, toggle }}>
      {children}
    </ElderlyModeContext.Provider>
  );
};

export function useElderlyMode(): ElderlyModeContextValue {
  const ctx = useContext(ElderlyModeContext);
  if (ctx === undefined) {
    throw new Error('useElderlyMode must be used within an ElderlyModeProvider');
  }
  return ctx;
}
