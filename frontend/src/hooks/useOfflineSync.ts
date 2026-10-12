import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saleApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { offlineQueue } from '../lib/offline';

export function useOfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const sync = async () => {
      const queue = offlineQueue.getAll();
      if (queue.length === 0) return;

      try {
        const results = await saleApi.sync(queue as unknown as Record<string, unknown>[]);
        results.forEach((result: { success: boolean; offlineId?: string }) => {
          if (result.success && result.offlineId) {
            offlineQueue.remove(result.offlineId);
          }
        });
        refreshCommerce(queryClient);
      } catch {
        // Will retry on next online event
      }
    };

    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);

    if (navigator.onLine) sync();

    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);
}

export function useOnlineStatus() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
