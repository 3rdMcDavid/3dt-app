'use client';

import { useState } from 'react';
import LeadDetailSheet from './LeadDetailSheet';
import LeadsSheet from './LeadsSheet';

type Lead = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  fit_score: number | null;
  state: string | null;
  created_at: string;
};

function relativeDate(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreDot(score: number | null) {
  if (score == null) return 'var(--border)';
  if (score >= 8) return 'var(--green)';
  if (score >= 5) return 'var(--orange)';
  return 'var(--red)';
}

export default function DashboardNewLeads({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads]         = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSheet, setShowSheet]   = useState(false);

  if (leads.length === 0) return null;

  return (
    <>
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            New Leads
          </span>
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', padding: 0, fontWeight: 500 }}
          >
            View all →
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {leads.map((lead, i) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedId(lead.id)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                padding: '13px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                background: scoreDot(lead.fit_score),
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  {lead.business_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                  {lead.city && <span>{lead.city}</span>}
                  {lead.business_type && (
                    <span style={{ background: 'var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>
                      {lead.business_type}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{relativeDate(lead.created_at)}</span>
                </div>
              </div>

              <span style={{ color: 'var(--muted)', fontSize: 16, flexShrink: 0, marginTop: 1 }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {selectedId !== null && (
        <LeadDetailSheet
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onLeadUpdate={(id, updates) =>
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
          }
        />
      )}

      {showSheet && (
        <LeadsSheet initialFilter="qualified" onClose={() => setShowSheet(false)} />
      )}
    </>
  );
}
