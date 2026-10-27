import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../../api';
import { getApiErrorMessage } from '../../lib/utils';
import { useBusinessStore } from '../../stores';
import type { Category } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';

export function CategorySelect({
  value,
  onChange,
  label = 'Category',
  placeholder = 'Select category',
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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', activeBusiness?.id],
    queryFn: () => categoryApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      categoryApi.create({ businessId: activeBusiness!.id, name }) as Promise<Category>,
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(['categories', activeBusiness?.id], (current) => {
        const next = [...(current ?? []).filter((item) => item.id !== category.id), category];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
    },
  });

  return (
    <SearchableSelect
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search categories…"
      value={value}
      onChange={onChange}
      allowClear={optional}
      error={error}
      options={categories.map((category) => ({ value: category.id, label: category.name }))}
      emptyMessage="No categories"
      createLabel="Add category"
      createTitle="New category"
      createDescription="Group products so you can filter them faster."
      createFields={[{ name: 'name', label: 'Name', placeholder: 'e.g. Clothes', required: true }]}
      creating={createMutation.isPending}
      onCreate={async (values) => {
        try {
          const category = await createMutation.mutateAsync(values.name);
          return category.id;
        } catch (error) {
          throw new Error(getApiErrorMessage(error, 'Could not save that category.'));
        }
      }}
    />
  );
}
