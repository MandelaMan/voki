import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminField, AdminFilterBar, AdminSearch, AdminStatus, AdminTable } from '../components/admin/AdminTable';
import { adminApi } from '../api';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Badge';
import { formatCurrency, formatDate, getApiErrorMessage } from '../lib/utils';
import { useAuthStore } from '../stores';
import type { AdminUser } from '../types';

export default function AdminSubscribersPage() {
  const queryClient = useQueryClient();
  const { user, loadProfile } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [days, setDays] = useState('30');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: 'downgrade' | 'suspend' } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const overview = useQuery({
    queryKey: ['admin', debounced],
    queryFn: () => adminApi.overview(debounced),
    enabled: isAdmin,
  });

  const refresh = async (userId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-subscriber'] });
    if (userId && userId === user?.id) await loadProfile();
  };

  const setPlan = useMutation({
    mutationFn: (input: { userId: string; plan: 'FREE' | 'PREMIUM' }) =>
      adminApi.setPlan(input.userId, input.plan, input.plan === 'PREMIUM' ? Number(days) : undefined),
    onSuccess: async (updated) => {
      setError('');
      setConfirm(null);
      setNote(updated.isPremium
        ? `${updated.firstName} is on Premium until ${formatDate(updated.planExpiresAt || '')}`
        : `${updated.firstName} is on Free`);
      await refresh(updated.id);
    },
    onError: (planError) => setError(getApiErrorMessage(planError, 'Could not change the plan.')),
  });

  const setStatus = useMutation({
    mutationFn: (input: { userId: string; suspended: boolean }) => adminApi.setStatus(input.userId, input.suspended),
    onSuccess: async (updated) => {
      setError('');
      setConfirm(null);
      setNote(updated.suspended ? `${updated.firstName}'s account is suspended` : `${updated.firstName}'s account is active`);
      await refresh(updated.id);
    },
    onError: (statusError) => setError(getApiErrorMessage(statusError, 'Could not update the account.')),
  });

  if (!user?.role) return <Skeleton className="h-24 rounded-2xl" />;
  if (!isAdmin) {
    return (
      <div className="page-stack">
        <PageHeader title="Subscribers" />
        <Alert variant="error">This account is not a super admin.</Alert>
      </div>
    );
  }

  const daysValue = Number(days);
  const daysReady = Number.isInteger(daysValue) && daysValue >= 1 && daysValue <= 3650;

  return (
    <div className="page-stack">
      <PageHeader title="Subscribers" subtitle="Onboarded accounts and how to reach them" />
      {error && <Alert variant="error">{error}</Alert>}
      {note && !error && <Alert variant="success">{note}</Alert>}
      {overview.isLoading && <Skeleton className="h-24 rounded-2xl" />}
      {overview.data && (
        <AdminTable
          toolbar={(
            <AdminFilterBar>
              <AdminField label="Search">
                <AdminSearch
                  placeholder="Name, email, or phone"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </AdminField>
              <AdminField label="Days to add" className="max-w-[8rem]">
                <AdminSearch
                  inputMode="numeric"
                  value={days}
                  onChange={(event) => setDays(event.target.value.replace(/[^\d]/g, ''))}
                />
              </AdminField>
            </AdminFilterBar>
          )}
          rows={overview.data.users}
          rowKey={(account) => account.id}
          empty="No accounts match that search."
          columns={[
            {
              header: 'Name',
              cell: (account) => (
                <Link to={`/admin/subscribers/${account.id}`} className="font-semibold text-primary-600">
                  {account.firstName} {account.lastName}
                </Link>
              ),
            },
            { header: 'Email', cell: (account) => account.email },
            { header: 'Phone', cell: (account) => account.phone || '—' },
            {
              header: 'Plan',
              cell: (account) => account.suspended
                ? <AdminStatus tone="bad">Suspended</AdminStatus>
                : account.isPremium
                  ? <AdminStatus tone="good">Premium</AdminStatus>
                  : <AdminStatus tone="muted">Free</AdminStatus>,
            },
            { header: 'Shops', align: 'end', cell: (account) => account.stats.businesses },
            { header: 'Products', align: 'end', cell: (account) => account.stats.products },
            { header: 'Sales', align: 'end', cell: (account) => account.stats.sales },
            { header: 'Revenue', align: 'end', value: (account) => account.stats.revenue, cell: (account) => formatCurrency(account.stats.revenue, 'KES') },
            { header: 'Joined', value: (account) => new Date(account.createdAt).getTime(), cell: (account) => formatDate(account.createdAt) },
            {
              header: 'Actions',
              sortable: false,
              wrap: true,
              cell: (account) => (
                <AccountActions
                  account={account}
                  self={account.id === user.id}
                  confirming={confirm?.id === account.id ? confirm.action : null}
                  busy={setPlan.isPending || setStatus.isPending}
                  canUpgrade={daysReady}
                  onUpgrade={() => setPlan.mutate({ userId: account.id, plan: 'PREMIUM' })}
                  onAskDowngrade={() => setConfirm({ id: account.id, action: 'downgrade' })}
                  onAskSuspend={() => setConfirm({ id: account.id, action: 'suspend' })}
                  onRestore={() => setStatus.mutate({ userId: account.id, suspended: false })}
                  onCancel={() => setConfirm(null)}
                  onDowngrade={() => setPlan.mutate({ userId: account.id, plan: 'FREE' })}
                  onSuspend={() => setStatus.mutate({ userId: account.id, suspended: true })}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function AccountActions({
  account,
  self,
  confirming,
  busy,
  canUpgrade,
  onUpgrade,
  onAskDowngrade,
  onAskSuspend,
  onRestore,
  onCancel,
  onDowngrade,
  onSuspend,
}: {
  account: AdminUser;
  self: boolean;
  confirming: 'downgrade' | 'suspend' | null;
  busy: boolean;
  canUpgrade: boolean;
  onUpgrade: () => void;
  onAskDowngrade: () => void;
  onAskSuspend: () => void;
  onRestore: () => void;
  onCancel: () => void;
  onDowngrade: () => void;
  onSuspend: () => void;
}) {
  const canSuspend = !self && account.role !== 'SUPER_ADMIN';
  return (
    <div className="flex flex-col items-start gap-1.5">
          {confirming === 'downgrade' && (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
              <Button variant="danger" size="sm" loading={busy} onClick={onDowngrade}>End Premium</Button>
            </>
          )}
          {confirming === 'suspend' && (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
              <Button variant="danger" size="sm" loading={busy} onClick={onSuspend}>Suspend</Button>
            </>
          )}
          {!confirming && (
            <>
              <Button size="sm" disabled={!canUpgrade || account.suspended} loading={busy} onClick={onUpgrade}>
                {account.isPremium ? 'Add days' : 'Upgrade'}
              </Button>
              {account.isPremium && !account.suspended && (
                <Button variant="secondary" size="sm" onClick={onAskDowngrade}>Downgrade</Button>
              )}
              {canSuspend && !account.suspended && (
                <Button variant="secondary" size="sm" onClick={onAskSuspend}>Suspend</Button>
              )}
              {canSuspend && account.suspended && (
                <Button variant="secondary" size="sm" loading={busy} onClick={onRestore}>Restore</Button>
              )}
            </>
          )}
    </div>
  );
}
