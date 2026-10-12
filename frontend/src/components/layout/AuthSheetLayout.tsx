import { ThemeToggle } from './ThemeToggle';

export function AuthSheetLayout({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col relative">
      <div className="fixed inset-0 bg-slate-800">
        <img
          src="/images/auth-signup-bg.png"
          alt=""
          className="w-full h-full object-cover object-[center_32%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-black/10" />
      </div>

      <ThemeToggle className="fixed top-3 right-3 z-20 bg-white/90 dark:bg-slate-900/90 shadow-soft" />

      <div className="relative flex-1 min-h-[46vh]" aria-hidden />

      <div className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-slate-950 rounded-t-[2.25rem] px-6 pt-5 pb-8 shadow-[0_-12px_48px_rgba(15,23,42,0.18)]">
        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />

        <div className="text-center mb-4">
          <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Voki
          </h1>
        </div>

        {(title || subtitle) && (
          <div className={subtitle ? 'mb-5' : 'mb-4'}>
            {title && (
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
