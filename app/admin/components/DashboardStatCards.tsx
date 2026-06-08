'use client';

import { useState } from 'react';
import Link from 'next/link';
import LeadsSheet from './LeadsSheet';

type Props = {
  totalLeads: number;
  qualifiedLeads: number;
  approvedLeads: number;
  interestedLeads: number;
  activeClients: number;
  openInvoiceCount: number;
  openInvoiceTotal: number;
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n);
}

export default function DashboardStatCards({
  totalLeads, qualifiedLeads, approvedLeads, interestedLeads,
  activeClients, openInvoiceCount, openInvoiceTotal,
}: Props) {
  const [activeFilter, setFilter] = useState<string | null>(null);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(2, 1fr)' }}>
        {[
          { label:'Total Leads', value:totalLeads,     filter:'all'       },
          { label:'Qualified',   value:qualifiedLeads,  filter:'qualified' },
          { label:'Approved',    value:approvedLeads,   filter:'approved'  },
          { label:'Interested',  value:interestedLeads, filter:'interested'},
        ].map(card => (
          <button
            key={card.label}
            type="button"
            className="stat-card stat-card-link"
            onClick={() => setFilter(card.filter)}
            style={{ textAlign:'left', width:'100%' }}
          >
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
          </button>
        ))}

        <Link href="/admin/clients" className="stat-card stat-card-link">
          <div className="stat-label">Active Clients</div>
          <div className="stat-value">{activeClients}</div>
        </Link>

        <Link href="/admin/invoices" className="stat-card stat-card-link">
          <div className="stat-label">Open Invoices</div>
          <div className="stat-value">{openInvoiceCount}</div>
          {openInvoiceTotal > 0 && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
              {fmtMoney(openInvoiceTotal)}
            </div>
          )}
        </Link>
      </div>

      {activeFilter !== null && (
        <LeadsSheet initialFilter={activeFilter} onClose={() => setFilter(null)} />
      )}
    </>
  );
}
