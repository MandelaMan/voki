import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Badge';
import { FilterTabs, PageHeader } from '../components/ui/PageHeader';
import { formatCurrency } from '../lib/utils';
import { reportApi } from '../api';
import { useBusinessStore } from '../stores';

export default function ReportsPage() {
  const { activeBusiness } = useBusinessStore();
  const [profitRange, setProfitRange] = useState<'overall' | 'month'>('overall');

  const { startDate, endDate } = useMemo(() => {
    if (profitRange !== 'month') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [profitRange]);

  const { data: profit, isLoading } = useQuery({
    queryKey: ['report-profit', activeBusiness?.id, profitRange, startDate, endDate],
    queryFn: () => reportApi.profit(activeBusiness!.id, startDate, endDate),
    enabled: !!activeBusiness?.id,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['report-lowstock', activeBusiness?.id],
    queryFn: () => reportApi.lowStock(activeBusiness!.id),
    enabled: !!activeBusiness?.id,
  });

  const currency = activeBusiness?.currency || 'USD';

  const exportCsv = async (type: string) => {
    let data: unknown[];
    switch (type) {
      case 'inventory':
        data = await reportApi.inventory(activeBusiness!.id);
        break;
      case 'sales':
        data = await reportApi.sales(activeBusiness!.id);
        break;
      case 'lowstock':
        data = lowStock || [];
        break;
      default:
        return;
    }

    const csv = convertToCsv(data as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voki-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack">
      <PageHeader title="Reports" subtitle="Export and review business data" />

      <FilterTabs
        options={[
          { value: 'overall', label: 'Overall Profit' },
          { value: 'month', label: 'This Month Profit' },
        ]}
        value={profitRange}
        onChange={setProfitRange}
      />

      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : profit && (
        <Card>
          <h3 className="text-heading mb-3">
            {profitRange === 'month' ? 'This Month Profit Summary' : 'Profit Summary'}
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Sales</span>
              <span className="font-semibold tabular-nums">{profit.summary.totalSales}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold tabular-nums truncate">{formatCurrency(profit.summary.totalRevenue, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Profit</span>
              <span className="font-semibold text-emerald-600 tabular-nums truncate">{formatCurrency(profit.summary.totalProfit, currency)}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {[
          { type: 'inventory', label: 'Inventory Report', desc: 'All products and stock levels' },
          { type: 'sales', label: 'Sales Report', desc: 'All sales transactions' },
          { type: 'lowstock', label: 'Low Stock Report', desc: `${lowStock?.length || 0} items need attention` },
        ].map((report) => (
          <Card key={report.type} className="flex items-center gap-3 !p-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText size={20} className="text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{report.label}</p>
                <p className="text-xs text-slate-500 truncate">{report.desc}</p>
              </div>
            </div>
            <button
              onClick={() => exportCsv(report.type)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label={`Download ${report.label}`}
            >
              <Download size={18} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function convertToCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
