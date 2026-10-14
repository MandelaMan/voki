import { type FormEvent, type FormHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

const fieldsetClass = 'm-0 min-w-0 border-0 p-0';

type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'children'> & {
  busy?: boolean;
  children: ReactNode;
};

export function Form({ busy = false, className, children, onSubmit, ...props }: FormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    onSubmit?.(event);
  };

  return (
    <form {...props} aria-busy={busy || undefined} onSubmit={submit}>
      <fieldset disabled={busy} className={cn(fieldsetClass, className)}>
        {children}
      </fieldset>
    </form>
  );
}

export function FormFields({
  busy = false,
  className,
  children,
}: {
  busy?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset disabled={busy} aria-busy={busy || undefined} className={cn(fieldsetClass, className)}>
      {children}
    </fieldset>
  );
}
