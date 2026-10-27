import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { usePremium } from '../../stores';
import type { ImagePreview } from './ImageUploadPreview';

export function BackgroundRemovalAsk({
  open,
  previews,
  busy = false,
  onKeep,
  onRemove,
  onCancel,
}: {
  open: boolean;
  previews: ImagePreview[];
  busy?: boolean;
  onKeep: () => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const isPremium = usePremium();
  const count = previews.length;

  return (
    <Modal
      open={open}
      title={count === 1 ? 'Preview photo' : `Preview ${count} photos`}
      description="Want a clean white background before saving?"
      onClose={() => {
        if (!busy) onCancel();
      }}
      size="md"
    >
      <div className="space-y-4">
        <div className={`grid gap-2 ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {previews.map((preview) => (
            <div
              key={preview.url}
              className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
            >
              <img
                src={preview.url}
                alt=""
                className={`mx-auto object-contain ${count === 1 ? 'max-h-56 w-full' : 'aspect-square w-full'}`}
              />
            </div>
          ))}
        </div>

        {isPremium ? (
          <div className="space-y-2">
            <Button className="w-full" loading={busy} onClick={onRemove}>
              <Sparkles size={16} />
              Remove background
            </Button>
            <Button className="w-full" variant="secondary" disabled={busy} onClick={onKeep}>
              Keep original
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-caption text-slate-500">
              AI background removal is on Premium. You can still save the original now.
            </p>
            <Button className="w-full" disabled={busy} onClick={onKeep}>
              Keep original
            </Button>
            <Link to="/plan" className="block text-center text-caption font-semibold text-primary-600">
              See Premium
            </Link>
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
