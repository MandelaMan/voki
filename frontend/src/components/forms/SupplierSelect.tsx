import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supplierApi } from '../../api';
import { getApiErrorMessage } from '../../lib/utils';
import { useBusinessStore } from '../../stores';
import type { Supplier } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';

export function SupplierSelect({
  value,
  onChange,
  label = 'Supplier',
  placeholder = 'Select supplier',
  error,
  optional = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  optional?: boolean;
}) {
  const { activeBusiness } = useBusinessStore();
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', activeBusiness?.id],
    queryFn: () => supplierApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string }) =>
      supplierApi.create({
        businessId: activeBusiness!.id,
        name: data.name,
        phone: data.phone || undefined,
        address: data.address || undefined,
      }) as Promise<Supplier>,
    onSuccess: (supplier) => {
      queryClient.setQueryData<Supplier[]>(['suppliers', activeBusiness?.id], (current) => {
        const next = [...(current ?? []).filter((item) => item.id !== supplier.id), supplier];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
    },
  });

  return (
    <SearchableSelect
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search suppliers…"
      value={value}
      onChange={onChange}
      allowClear={optional}
      error={error}
      options={suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
        description: [supplier.phone, supplier.address].filter(Boolean).join(' · ') || undefined,
      }))}
      emptyMessage="No suppliers"
      createLabel="Add supplier"
      createTitle="New supplier"
      createDescription="Someone you buy stock from."
      createFields={[
        { name: 'name', label: 'Name', placeholder: 'Supplier or shop name', required: true },
        { name: 'phone', label: 'Phone', placeholder: 'Optional', required: false, inputMode: 'tel' },
        { name: 'address', label: 'Location', placeholder: 'Market, street, or town', required: false },
      ]}
      creating={createMutation.isPending}
      onCreate={async (values) => {
        try {
          const supplier = await createMutation.mutateAsync({
            name: values.name,
            phone: values.phone || undefined,
            address: values.address || undefined,
          });
          return supplier.id;
        } catch (error) {
          throw new Error(getApiErrorMessage(error, 'Could not save that supplier.'));
        }
      }}
    />
  );
}
