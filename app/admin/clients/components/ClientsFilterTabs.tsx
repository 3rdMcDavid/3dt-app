'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TABS = [
  { label: 'All',       value: '' },
  { label: 'Leads',     value: 'lead' },
  { label: 'Active',    value: 'active' },
  { label: 'Completed', value: 'completed' },
];

export default function ClientsFilterTabs({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const searchParams = useSearchParams();
  const current = searchParams.get('status') ?? '';

  return (
    <div className="filter-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value ? `?status=${tab.value}` : '/admin/clients'}
          className={`filter-tab${current === tab.value ? ' active' : ''}`}
        >
          {tab.label}
          {counts[tab.value] !== undefined && (
            <span className="filter-tab-count">{counts[tab.value]}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
