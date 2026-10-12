import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { isDarkTheme, useThemeStore } from '../../stores';
import { cn } from '../../lib/utils';

export function useIsDark() {
  const theme = useThemeStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (theme === 'system') return systemDark;
  return isDarkTheme(theme);
}

export function toggleColorMode() {
  const { theme, setTheme } = useThemeStore.getState();
  const dark = isDarkTheme(theme);
  setTheme(dark ? 'light' : 'dark');
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useIsDark();

  return (
    <button
      type="button"
      onClick={toggleColorMode}
      className={cn(
        'p-2 rounded-xl text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
