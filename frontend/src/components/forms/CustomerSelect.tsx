import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api';
import { useBusinessStore } from '../../stores';
import { SearchableSelect } from '../ui/SearchableSelect';

export type CustomerDraft = {
  name: string;
  phone: string;
};

function draftKey(name: string, phone: string) {
  return `__draft__:${name}|${phone}`;
}

function parseDraftKey(key: string): CustomerDraft | null {
  if (!key.startsWith('__draft__:')) return null;
  const rest = key.slice('__draft__:'.length);
  const pipe = rest.indexOf('|');
  if (pipe < 0) return { name: rest, phone: '' };
  return { name: rest.slice(0, pipe), phone: rest.slice(pipe + 1) };
}

/**
 * Search existing customers or open a modal to enter a new name/phone.
 * Customers are persisted when the sale completes (upsert), so create is local draft only.
 */
export function CustomerSelect({
  value,
  onChange,
  label = 'Customer',
  placeholder = 'Select customer',
  error,
}: {
  value: CustomerDraft;
  onChange: (next: CustomerDraft) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}) {
  const { activeBusiness } = useBusinessStore();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', activeBusiness?.id],
    queryFn: () => customerApi.list(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const matched = customers.find(
    (customer) =>
      customer.name === value.name
      && (customer.phone || '') === (value.phone || '')
  );

  const selectedValue = value.name.trim()
    ? (matched?.id || draftKey(value.name, value.phone))
    : '';

  const options = [
    ...(!matched && value.name.trim()
      ? [{
          value: draftKey(value.name, value.phone),
          label: value.name,
          description: value.phone || undefined,
        }]
      : []),
    ...customers.map((customer) => ({
      value: customer.id,
      label: customer.name,
      description: customer.phone || undefined,
    })),
  ];

  return (
    <SearchableSelect
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search customers…"
      value={selectedValue}
      onChange={(nextId) => {
        if (!nextId) {
          onChange({ name: '', phone: '' });
          return;
        }
        const draft = parseDraftKey(nextId);
        if (draft) {
          onChange(draft);
          return;
        }
        const customer = customers.find((item) => item.id === nextId);
        if (customer) {
          onChange({ name: customer.name, phone: customer.phone || '' });
        }
      }}
      allowClear
      error={error}
      options={options}
      emptyMessage="No customers"
      createLabel="Add customer"
      createTitle="Customer details"
      createDescription="Saved with the sale when you complete checkout."
      createFields={[
        { name: 'name', label: 'Name', placeholder: 'Customer name', required: true },
        { name: 'phone', label: 'Phone', placeholder: '07XX XXX XXX', required: false, inputMode: 'tel' },
      ]}
      createDefaults={{ name: value.name, phone: value.phone }}
      onCreate={(values) => {
        onChange({ name: values.name, phone: values.phone || '' });
        return draftKey(values.name, values.phone || '');
      }}
    />
  );
}
