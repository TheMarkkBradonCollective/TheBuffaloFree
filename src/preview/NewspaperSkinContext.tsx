import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

export const NEWSPAPER_CLASS = 'newspaper-preview';
const STORAGE_KEY = 'tbf_newspaper_look_v2';

interface NewspaperSkinContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const NewspaperSkinContext = createContext<NewspaperSkinContextValue | null>(null);

export function newspaperThemeColor(theme: 'light' | 'dark', _newspaper = false): string {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('capacitor-native')) {
    return '#000000';
  }
  return theme === 'light' ? '#ffffff' : '#0b0b0c';
}

function stripNewspaperLook() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove(NEWSPAPER_CLASS);
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Newspaper reskin is retired — Buffalo ships the original Buy Nothing look only. */
export function NewspaperSkinProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    stripNewspaperLook();
  }, []);

  const value = useMemo(
    () => ({
      enabled: false,
      setEnabled: () => {},
    }),
    [],
  );

  return <NewspaperSkinContext.Provider value={value}>{children}</NewspaperSkinContext.Provider>;
}

export function useNewspaperSkin() {
  const ctx = useContext(NewspaperSkinContext);
  return ctx ?? { enabled: false, setEnabled: () => {} };
}

export function isNewspaperSkinActive(): boolean {
  return false;
}

export function shouldShowNewspaperPreviewBanner(_enabled: boolean): boolean {
  return false;
}
