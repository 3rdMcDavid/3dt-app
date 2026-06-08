'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types';

type LeadUpdate = Database['public']['Tables']['leads']['Update'];

const STATUS_OPTIONS = [
  { value:'approved',       label:'Approved' },
  { value:'called',         label:'Called' },
  { value:'interested',     label:'Interested' },
  { value:'follow_up',      label:'Follow Up' },
  { value:'not_interested', label:'Not Interested' },
  { value:'won',            label:'Won' },
  { value:'lost',           label:'Lost' },
];

const STATUS_STYLE: Record<string, { bg:string; color:string; border:string }> = {
  approved:       { bg:'rgba(34,197,94,0.12)',  color:'var(--green)',  border:'rgba(34,197,94,0.3)' },
  called:         { bg:'rgba(99,102,241,0.12)', color:'#818cf8',       border:'rgba(99,102,241,0.3)' },
  interested:     { bg:'rgba(34,197,94,0.12)',  color:'var(--green)',  border:'rgba(34,197,94,0.3)' },
  follow_up:      { bg:'rgba(240,165,0,0.12)',  color:'var(--orange)', border:'rgba(240,165,0,0.3)' },
  not_interested: { bg:'rgba(239,68,68,0.12)',  color:'var(--red)',    border:'rgba(239,68,68,0.3)' },
  won:            { bg:'rgba(34,197,94,0.25)',  color:'var(--green)',  border:'rgba(34,197,94,0.5)' },
  lost:           { bg:'rgba(239,68,68,0.12)',  color:'var(--red)',    border:'rgba(239,68,68,0.3)' },
};

export type ApprovedLead = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  state: string | null;
  fit_score: number | null;
  phone: string | null;
  address: string | null;
  call_notes: string | null;
  follow_up_date: string | null;
  call_attempted_at: string | null;
  interested_at: string | null;
  created_at: string;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function StatusBadge({ state }: { state: string }) {
  const s = STATUS_STYLE[state] ?? { bg:'var(--border)', color:'var(--muted)', border:'var(--border)' };
  return (
    <span style={{
      fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:4,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      textTransform:'capitalize', whiteSpace:'nowrap', flexShrink:0,
    }}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function ApprovedLeadCard({ lead }: { lead: ApprovedLead }) {
  const [currentState, setCurrentState] = useState(lead.state ?? 'approved');
  const [callDate, setCallDate]         = useState(lead.call_attempted_at);
  const [convertDone, setConvertDone]   = useState(!!lead.interested_at);
  const [showConvert, setShowConvert]   = useState(
    lead.state === 'interested' && !lead.interested_at
  );
  const [convertEmail, setConvertEmail] = useState('');
  const [converting, setConverting]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const supabase = createClient();

  async function save(updates: LeadUpdate) {
    setSaving(true);
    await supabase.from('leads').update(updates).eq('id', lead.id);
    setSaving(false);
  }

  async function handleStatus(val: string) {
    const updates: LeadUpdate = { state: val };
    if (val === 'called' && !callDate) {
      const now = new Date().toISOString();
      updates.call_attempted_at = now;
      setCallDate(now);
    }
    setCurrentState(val);
    await save(updates);
    if (val === 'interested') setShowConvert(true);
  }

  async function handleConvert() {
    setConverting(true);
    const email = convertEmail.trim() || `noemail-${lead.id}@placeholder`;
    const { error } = await supabase.from('clients').insert({
      name: lead.business_name,
      email,
      phone: lead.phone,
      company: lead.business_name,
      status: 'active',
    });
    if (!error) {
      await save({ interested_at: new Date().toISOString() });
      setConvertDone(true);
      setShowConvert(false);
    }
    setConverting(false);
  }

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      {/* Name + status */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ fontWeight:700, fontSize:15, lineHeight:1.3 }}>{lead.business_name}</div>
        <StatusBadge state={currentState} />
      </div>

      {/* Type · location */}
      {(lead.business_type || lead.city) && (
        <div style={{ fontSize:12, color:'var(--muted)' }}>
          {[lead.business_type, [lead.city, lead.state].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Phone */}
      {lead.phone && (
        <a href={`tel:${lead.phone}`} style={{ fontSize:13, color:'var(--accent-lt)', textDecoration:'none' }}>
          📞 {lead.phone}
        </a>
      )}

      {/* Called date */}
      {callDate && (
        <div style={{ fontSize:12, color:'var(--muted)' }}>Called {fmtDate(callDate)}</div>
      )}

      <div style={{ borderTop:'1px solid var(--border)' }} />

      {/* Status dropdown */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:6 }}>
          Status
        </div>
        <select
          value={currentState}
          onChange={e => handleStatus(e.target.value)}
          disabled={saving}
          style={{ width:'100%' }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Convert to client banner */}
      {showConvert && !convertDone && (
        <div style={{
          background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
          borderRadius:10, padding:12,
        }}>
          <div style={{ fontWeight:600, color:'var(--green)', marginBottom:8, fontSize:13 }}>
            ✓ Mark as interested to create a client record
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <input
              type="email"
              placeholder="Email address (optional)"
              value={convertEmail}
              onChange={e => setConvertEmail(e.target.value)}
              style={{ fontSize:13 }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm btn-full"
              onClick={handleConvert}
              disabled={converting}
            >
              {converting ? 'Creating…' : 'Create Client →'}
            </button>
          </div>
        </div>
      )}

      {convertDone && (
        <div style={{
          background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
          borderRadius:8, padding:10, color:'var(--green)', fontWeight:600, fontSize:13,
        }}>
          ✓ {lead.business_name} added to Clients
        </div>
      )}

      {/* Call notes */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:6 }}>
          Call Notes
        </div>
        <textarea
          defaultValue={lead.call_notes ?? ''}
          placeholder="Add call notes…"
          style={{ width:'100%', minHeight:64, fontSize:13, lineHeight:1.5 }}
          onBlur={e => {
            const val = e.target.value;
            if (val !== (lead.call_notes ?? '')) save({ call_notes: val });
          }}
        />
      </div>

      {/* Follow-up date — only when state = follow_up */}
      {currentState === 'follow_up' && (
        <div>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:6 }}>
            Follow-Up Date
          </div>
          <input
            type="date"
            defaultValue={lead.follow_up_date ?? ''}
            style={{ fontSize:13, width:'100%' }}
            onChange={e => save({ follow_up_date: e.target.value || null })}
          />
        </div>
      )}
    </div>
  );
}

export default function ApprovedLeadsSection({ initialLeads }: { initialLeads: ApprovedLead[] }) {
  const [leads, setLeads] = useState<ApprovedLead[]>(initialLeads);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('scout-approved-leads')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: 'outreach_approved=eq.true' },
        (payload) => {
          const lead = payload.new as ApprovedLead & { outreach_approved: boolean };
          if (lead.outreach_approved) {
            setLeads(prev => prev.some(l => l.id === lead.id) ? prev : [lead, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <span style={{
          fontSize:11, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.8px', color:'var(--muted)',
        }}>
          Approved Leads
        </span>
        {leads.length > 0 && (
          <span style={{
            fontSize:11, fontWeight:700, background:'var(--accent)', color:'#fff',
            borderRadius:10, padding:'1px 7px', minWidth:18, textAlign:'center',
          }}>
            {leads.length}
          </span>
        )}
      </div>

      {leads.length === 0 ? (
        <p style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'24px 0' }}>
          No approved leads yet.
        </p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {leads.map(lead => (
            <ApprovedLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
