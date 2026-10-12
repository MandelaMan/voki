import { useRef } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImagePreview {
  file: File;
  url: string;
}

interface ImageUploadPreviewProps {
  previews: ImagePreview[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function createPreviews(files: File[]): ImagePreview[] {
  return files.map((file) => ({ file, url: URL.createObjectURL(file) }));
}

export function revokePreviews(previews: ImagePreview[]) {
  previews.forEach((p) => URL.revokeObjectURL(p.url));
}

export function ImageUploadPreview({
  previews,
  onAdd,
  onRemove,
  label = 'Tap to upload photos',
  hint = 'PNG, JPG up to 10MB',
  className,
  compact = false,
}: ImageUploadPreviewProps & { compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('space-y-3', className)}>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={preview.url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img src={preview.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
          >
            <ImagePlus size={20} />
            <span className="text-micro">Add</span>
          </button>
        </div>
      )}

      {previews.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors',
            compact
              ? 'flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-semibold'
              : 'flex flex-col items-center justify-center gap-2 p-6 border-2 rounded-2xl'
          )}
        >
          <ImagePlus size={compact ? 14 : 24} className="text-slate-400" />
          <span className={compact ? '' : 'text-caption font-medium'}>{compact ? 'Add photo' : label}</span>
          {!compact && <span className="text-micro text-slate-400">{hint}</span>}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onAdd(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}