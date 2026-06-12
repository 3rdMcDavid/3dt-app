'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LeadSource, SuggestedChannel } from '@/lib/types';
import { scoreColor, relativeDate, CHANNEL_ICON, CHANNEL_LABEL } from '@/lib/leadDisplay';
import SourceBadge from '@/app/admin/components/SourceBadge';

export type PendingLead = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  fit_score: number | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  outreach_draft: string | null;
  observation: string | null;
  owner_name: string | null;
  suggested_channel: SuggestedChannel | null;
  source: LeadSource | null;
  tier: 'A' | 'B' | null;
  created_at: string;
};

type Props = {
  initialLeads: PendingLead[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
};

function ScoreTag({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <span style={{
      fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:4,
      background: scoreColor(score), color:'#fff', flexShrink:0,
    }}>
      {score}
    </span>
  );
}

function LeadCard({
  lead,
  loading,
  onApprove,
  onReject,
}: {
  lead: PendingLead;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [copied, setCopied]       = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address || lead.business_name)}`;

  async function handleCopy() {
    if (!lead.outreach_draft) return;
    await navigator.clipboard.writeText(lead.outreach_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      {/* Name + source + score */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, lineHeight:1.3, color:'var(--text)' }}>{lead.business_name}</div>
          {lead.owner_name && lead.owner_name !== lead.business_name && (
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>👤 {lead.owner_name}</div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          <SourceBadge source={lead.source} />
          <ScoreTag score={lead.fit_score} />
        </div>
      </div>

      {/* Type · city · arrival date */}
      <div style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:6, flexWrap:'wrap' }}>
        <span>{[lead.business_type, lead.city].filter(Boolean).join(' · ')}</span>
        <span style={{ marginLeft:'auto', flexShrink:0 }}>{relativeDate(lead.created_at)}</span>
      </div>

      {/* Observation — the call opener */}
      {lead.observation && (
        <div style={{
          background:'rgba(240,165,0,0.08)', borderLeft:'3px solid var(--orange)',
          borderRadius:'0 8px 8px 0', padding:'8px 12px',
          fontSize:13, lineHeight:1.5, color:'var(--text)',
        }}>
          {lead.observation}
        </div>
      )}

      {/* Phone + suggested channel */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        {lead.phone && (
          <a href={`tel:${lead.phone}`} style={{ fontSize:13, color:'var(--accent-lt)', textDecoration:'none' }}>
            📞 {lead.phone}
          </a>
        )}
        {lead.suggested_channel && (
          <span style={{ fontSize:12, color:'var(--muted)' }} title="Suggested channel">
            {CHANNEL_ICON[lead.suggested_channel]} {CHANNEL_LABEL[lead.suggested_channel]}
          </span>
        )}
      </div>

      {/* Website + rating */}
      <div style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer"
            style={{ color:'var(--accent-lt)', fontSize:12 }}>
            🌐 {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
          </a>
        ) : (
          <span style={{ background:'rgba(239,68,68,0.15)', color:'var(--red)', borderRadius:4, padding:'1px 7px', fontSize:11, fontWeight:600 }}>
            🚫 No website
          </span>
        )}
        {lead.rating != null && (
          <span>⭐ {lead.rating} ({lead.review_count ?? 0} reviews)</span>
        )}
      </div>

      {/* Outreach draft collapsible */}
      {lead.outreach_draft && (
        <div style={{ border:'1px solid var(--border)', borderRadius:8 }}>
          <button
            type="button"
            onClick={() => setDraftOpen(o => !o)}
            style={{
              width:'100%', background:'none', border:'none', cursor:'pointer',
              padding:'8px 12px', display:'flex', justifyContent:'space-between',
              alignItems:'center', color:'var(--text)', fontSize:12, fontWeight:500,
            }}
          >
            <span>Outreach Draft</span>
            <span style={{ color:'var(--muted)', fontSize:11 }}>{draftOpen ? '▲' : '▼'}</span>
          </button>
          {draftOpen && (
            <div style={{ padding:'0 12px 12px', borderTop:'1px solid var(--border)' }}>
              <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6, whiteSpace:'pre-wrap', marginTop:10 }}>
                {lead.outreach_draft}
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopy} style={{ marginTop:8 }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginTop:2 }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ flex:1, justifyContent:'center', textDecoration:'none' }}
        >
          🗺 Maps
        </a>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onReject}
          disabled={loading}
          style={{
            flex:1, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)',
            color:'var(--red)', fontWeight:600, borderRadius:8, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          ✗ Reject
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onApprove}
          disabled={loading}
          style={{
            flex:1, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)',
            color:'var(--green)', fontWeight:600, borderRadius:8, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          ✓ Approve
        </button>
      </div>
    </div>
  );
}

export default function PendingReviewSection({ initialLeads, onApprove, onReject }: Props) {
  const [leads, setLeads]       = useState<PendingLead[]>(initialLeads);
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const [errMsg, setErrMsg]     = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('scout-pending-leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as PendingLead & { outreach_approved: boolean | null; pipeline_state: string };
          if (lead.pipeline_state === 'qualified' && !lead.outreach_approved) {
            setLeads(prev => prev.some(l => l.id === lead.id) ? prev : [lead, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(id: string) {
    if (inFlight.has(id)) return;
    const snapshot = leads.find(l => l.id === id);
    setInFlight(s => new Set(s).add(id));
    setLeads(prev => prev.filter(l => l.id !== id));
    setErrMsg(null);

    try {
      const res = await fetch('/api/leads/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onApprove?.(id);
    } catch (e) {
      if (snapshot) setLeads(prev => [snapshot, ...prev]);
      setErrMsg(`Approve failed: ${(e as Error).message}`);
    }
    setInFlight(s => { const n = new Set(s); n.delete(id); return n; });
  }

  async function handleReject(id: string) {
    if (inFlight.has(id)) return;
    const snapshot = leads.find(l => l.id === id);
    setInFlight(s => new Set(s).add(id));
    setLeads(prev => prev.filter(l => l.id !== id));

    const { error } = await supabase
      .from('leads')
      .update({ pipeline_state: 'rejected' })
      .eq('id', id);

    if (error) {
      if (snapshot) setLeads(prev => [snapshot, ...prev]);
    } else {
      onReject?.(id);
    }
    setInFlight(s => { const n = new Set(s); n.delete(id); return n; });
  }

  return (
    <div>
      {errMsg && (
        <div style={{
          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:8, padding:'8px 12px', marginBottom:10,
          fontSize:12, color:'var(--red)', display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          {errMsg}
          <button type="button" onClick={() => setErrMsg(null)}
            style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', padding:'0 4px', fontSize:14, lineHeight:1 }}>✕</button>
        </div>
      )}
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <span style={{
          fontSize:11, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.8px', color:'var(--muted)',
        }}>
          Pending Review
        </span>
        {leads.length > 0 && (
          <span style={{
            fontSize:11, fontWeight:700, background:'var(--orange)', color:'#fff',
            borderRadius:10, padding:'1px 7px', minWidth:18, textAlign:'center',
          }}>
            {leads.length}
          </span>
        )}
      </div>

      {leads.length === 0 ? (
        <p style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'24px 0' }}>
          No leads pending review.
        </p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              loading={inFlight.has(lead.id)}
              onApprove={() => handleApprove(lead.id)}
              onReject={() => handleReject(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
