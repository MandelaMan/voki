import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ImageIcon, X } from 'lucide-react';
import { cn, getImageUrl } from '../../lib/utils';

interface GalleryImage {
  id: string;
  path: string;
  order?: number;
  isPrimary?: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  alt: string;
  /** Shorter frame for a side-by-side product layout. */
  compact?: boolean;
}

export function ImageGallery({ images, alt, compact = false }: ImageGalleryProps) {
  const slides = useMemo(
    () => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.order ?? 0) - (b.order ?? 0)),
    [images]
  );
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStart = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const index = slides.length ? Math.min(current, slides.length - 1) : 0;
  const multiple = slides.length > 1;

  const goTo = (next: number) => {
    if (!slides.length) return;
    setCurrent((next + slides.length) % slides.length);
  };

  const onTouchStart = (clientX: number) => {
    touchStart.current = clientX;
    didSwipe.current = false;
  };

  const onTouchEnd = (clientX: number) => {
    if (touchStart.current == null) return;
    const delta = clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 40) return;
    didSwipe.current = true;
    goTo(index + (delta < 0 ? 1 : -1));
  };

  if (!slides.length) {
    return (
      <div className={cn(
        'rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-1 text-slate-400',
        compact ? 'h-44 sm:h-56' : 'h-40'
      )}>
        <ImageIcon size={22} />
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        <div className={cn(
          'relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden',
          compact ? 'h-44 sm:h-56 lg:h-64' : 'h-52 sm:h-64'
        )}>
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
            onTouchStart={(event) => onTouchStart(event.touches[0].clientX)}
            onTouchEnd={(event) => onTouchEnd(event.changedTouches[0].clientX)}
          >
            {slides.map((image) => (
              <button
                key={image.id}
                type="button"
                className={cn(
                  'min-w-full h-full flex items-center justify-center cursor-zoom-in',
                  compact ? 'p-1.5' : 'p-4'
                )}
                onClick={() => {
                  if (didSwipe.current) {
                    didSwipe.current = false;
                    return;
                  }
                  setZoomed(true);
                }}
                aria-label={`View ${alt}`}
              >
                <img
                  src={getImageUrl(image.path)!}
                  alt={alt}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          {multiple && (
            <>
              <SliderButton side="left" label="Previous photo" onClick={() => goTo(index - 1)} />
              <SliderButton side="right" label="Next photo" onClick={() => goTo(index + 1)} />
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[11px] font-semibold tabular-nums">
                {index + 1} / {slides.length}
              </span>
            </>
          )}
        </div>

        {multiple && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {slides.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'shrink-0 rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-900',
                  compact ? 'h-10 w-10' : 'h-14 w-14',
                  i === index
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-slate-200 dark:border-slate-700 opacity-70'
                )}
              >
                <img src={getImageUrl(image.path)!} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoomed && createPortal(
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 text-white"
            onClick={() => setZoomed(false)}
            aria-label="Close photo"
          >
            <X size={24} />
          </button>
          {multiple && (
            <>
              <SliderButton side="left" label="Previous photo" onClick={() => goTo(index - 1)} light />
              <SliderButton side="right" label="Next photo" onClick={() => goTo(index + 1)} light />
            </>
          )}
          <img
            src={getImageUrl(slides[index].path)!}
            alt={alt}
            className="max-w-full max-h-[85dvh] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}

function SliderButton({
  side,
  label,
  onClick,
  light,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  light?: boolean;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center',
        side === 'left' ? 'left-2' : 'right-2',
        light ? 'bg-white/15 text-white' : 'bg-white/90 text-slate-700 shadow-soft dark:bg-slate-800 dark:text-slate-100'
      )}
    >
      <Icon size={18} />
    </button>
  );
}
