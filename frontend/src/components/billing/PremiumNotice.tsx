import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePremium } from '../../stores';

export function PremiumNotice({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/25 text-primary-600 flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-medium font-semibold">{title}</p>
          {description && <p className="text-caption text-slate-500 mt-0.5">{description}</p>}
          <Button to="/plan" size="sm" variant="soft" className="mt-3">See Premium</Button>
        </div>
      </div>
    </Card>
  );
}

export function BackgroundRemovalOption({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const isPremium = usePremium();
  if (!isPremium) {
    return (
      <Link to="/plan" className="inline-flex text-caption font-medium text-primary-600">
        Premium removes photo backgrounds
      </Link>
    );
  }

  return (
    <label className="flex items-center gap-2 text-caption cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 rounded accent-primary-600"
      />
      <span>Remove background with AI</span>
    </label>
  );
}
