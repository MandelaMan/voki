import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { PageHeader, FilterTabs, ListRow } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/Badge';
import { formatRelative } from '../lib/utils';
import { notificationApi } from '../api';
import { useBusinessStore } from '../stores';
import { useState } from 'react';

export default function NotificationsPage() {
  const { activeBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications } = useQuery({
    queryKey: ['notifications', activeBusiness?.id],
    queryFn: () => notificationApi.list(activeBusiness?.id),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const filtered = notifications?.filter((n) => filter === 'all' || !n.read) || [];

  return (
    <div className="page-stack">
      <PageHeader title="Notifications" subtitle="Stay updated on your business" />

      <FilterTabs
        options={[
          { value: 'all' as const, label: 'All' },
          { value: 'unread' as const, label: 'Unread' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {!filtered.length ? (
        <EmptyState icon={<Bell size={48} />} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <ListRow
              key={n.id}
              icon={<Bell size={18} />}
              title={n.title}
              subtitle={n.message}
              badge={!n.read ? (
                <span className="text-micro px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">New</span>
              ) : undefined}
              trailing={<span className="text-caption text-slate-400">{formatRelative(n.createdAt)}</span>}
              onClick={() => !n.read && markReadMutation.mutate(n.id)}
              className={!n.read ? 'ring-2 ring-primary-100 dark:ring-primary-900/40' : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
