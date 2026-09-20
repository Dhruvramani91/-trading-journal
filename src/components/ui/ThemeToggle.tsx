import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useThemeStore } from '@/store/themeStore';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors border border-line bg-bg-2 shadow-sm',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}