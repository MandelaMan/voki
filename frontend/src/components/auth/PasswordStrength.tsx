import { cn } from '../../lib/utils';

type Level = 'weak' | 'fair' | 'strong';

function measure(password: string): { level: Level; label: string; width: string; value: number } | null {
  if (!password) return null;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const length = password.length;
  let level: Level = 'weak';
  if (length >= 16 || (length >= 12 && classes >= 2) || (length >= 10 && classes >= 3)) {
    level = 'strong';
  } else if (length >= 8 && classes >= 2) {
    level = 'fair';
  }
  if (level === 'strong') return { level, label: 'Strong', width: '100%', value: 3 };
  if (level === 'fair') return { level, label: 'Fair', width: '66%', value: 2 };
  return { level, label: 'Weak', width: '33%', value: 1 };
}

export function PasswordStrength({ password }: { password: string }) {
  const result = measure(password);
  if (!result) return null;

  return (
    <div className="space-y-1 px-3">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="meter"
        aria-label={`Password strength: ${result.label}`}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={result.value}
        aria-valuetext={result.label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-200',
            result.level === 'weak' && 'bg-red-500',
            result.level === 'fair' && 'bg-amber-500',
            result.level === 'strong' && 'bg-emerald-500',
          )}
          style={{ width: result.width }}
        />
      </div>
      <p
        className={cn(
          'text-[11px] font-semibold',
          result.level === 'weak' && 'text-red-600 dark:text-red-400',
          result.level === 'fair' && 'text-amber-600 dark:text-amber-400',
          result.level === 'strong' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {result.label}
      </p>
    </div>
  );
}
