import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pencil, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { PageHeader } from '../components/ui/PageHeader';
import { categoryApi } from '../api';
import { refreshCommerce } from '../lib/refresh';
import { getApiErrorMessage } from '../lib/utils';
import { useBusinessStore } from '../stores';

export default function CategoriesPage() {
  const { activeBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories', activeBusiness?.id],
    queryFn: () => categoryApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => categoryApi.create({ businessId: activeBusiness!.id, name: name.trim() }),
    onSuccess: () => {
      setActionError('');
      refreshCommerce(queryClient);
      setName('');
      setShowForm(false);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not save that category.')),
  });

  const updateMutation = useMutation({
    mutationFn: () => categoryApi.update(editingId!, { businessId: activeBusiness!.id, name: editName }),
    onSuccess: () => {
      setActionError('');
      refreshCommerce(queryClient);
      setEditingId(null);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not update that category.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id, activeBusiness!.id),
    onSuccess: () => {
      setActionError('');
      refreshCommerce(queryClient);
    },
    onError: (error) => setActionError(getApiErrorMessage(error, 'Could not delete that category.')),
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Categories"
        subtitle="Organize your products"
        action={<Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={18} /> Add</Button>}
      />

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {showForm && (
        <Card className="flex flex-col gap-2 sm:flex-row sm:items-end !p-3">
          <div className="flex-1 min-w-0 w-full">
            <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!name.trim()} className="w-full sm:w-auto">Save</Button>
        </Card>
      )}

      <div className="space-y-2">
        {categories?.map((cat) => (
          <Card key={cat.id} className="!p-3 space-y-2">
            {editingId === cat.id ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Button size="sm" disabled={!editName.trim()} loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{cat.name}</p>
                  <Link to={`/inventory?categoryId=${cat.id}`} className="text-xs font-semibold text-primary-600">
                    {cat._count?.products || 0} products
                  </Link>
                </div>
                <div className="flex shrink-0">
                  <button type="button" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-2 text-slate-500" aria-label={`Edit ${cat.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(cat.id)} className="p-2 text-red-500" aria-label={`Delete ${cat.name}`}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
