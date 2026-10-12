import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export function InventoryFab() {
  const { pathname } = useLocation();
  const isInventoryList = pathname === '/inventory';

  if (!isInventoryList) return null;

  return (
    <div
      className="fixed inset-x-0 z-[45] pointer-events-none lg:hidden"
      style={{ bottom: 'var(--voki-fab-bottom)' }}
    >
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3 md:px-4">
        <div className="flex justify-end">
          <Link
            to="/inventory/new"
            aria-label="Add product"
            className={cn(
              'pointer-events-auto w-14 h-14 rounded-full',
              'bg-primary-600 text-white flex items-center justify-center',
              'hover:bg-primary-700 hover:text-white active:scale-95 transition-transform',
              '[&_svg]:text-white'
            )}
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
