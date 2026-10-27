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
  compact?: boolean;
  /** Hide the empty-state dropzone; only show the top add control + previews. */
  addOnly?: boolean;
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
  addOnly = false,
}: ImageUploadPreviewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const fileInput = (
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
  );

  if (addOnly || compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <button
          type="button"
          onClick={openPicker}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500 transition-colors hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
        >
          <ImagePlus size={14} />
          Add photo
        </button>
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div
                key={preview.url}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {fileInput}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 text-slate-500 transition-colors hover:border-primary-300 hover:bg-primary-50/30 dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
      >
        <ImagePlus size={24} className="text-slate-400" />
        <span className="text-caption font-medium">{label}</span>
        <span className="text-micro text-slate-400">{hint}</span>
      </button>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div
              key={preview.url}
              className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              <img src={preview.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {fileInput}
    </div>
  );
}
