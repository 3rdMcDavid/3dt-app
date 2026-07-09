'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database, LeadSource, SuggestedChannel } from '@/lib/types';

type LeadUpdate = Database['public']['Tables']['leads']['Update'];
import { scoreColor, CHANNEL_ICON, CHANNEL_LABEL } from '@/lib/leadDisplay';
import SourceBadge from './SourceBadge';

const STATUS_OPTIONS = [
  { value:'new',        label:'New' },
  { value:'qualified',  label:'Qualified' },
  { value:'approved',   label:'Approved' },
  { value:'contacted',  label:'Contacted' },
  { value:'follow_up',  label:'Follow Up' },
  { value:'interested', label:'Interested' },
  { value:'rejected',   label:'Rejected' },
  { value:'won',        label:'Won' },
  { value:'lost',       label:'Lost' },
];

const FOLLOW_UP_ACTIVE_STATES = ['approved', 'contacted', 'follow_up'];

function followUpSummary(lead: {
  pipeline_state: string | null;
  auto_follow_up: boolean;
  follow_up_touches_sent: number;
}): string {
  if (lead.follow_up_touches_sent >= 2) return '2/2 sent — sequence done';
  if (!FOLLOW_UP_ACTIVE_STATES.includes(lead.pipeline_state ?? ''))
    return `stopped (${lead.pipeline_state})`;
  if (!lead.auto_follow_up) return 'off';
  return `${lead.follow_up_touches_sent}/2 sent`;
}

type Lead = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  pipeline_state: string | null;
  fit_score: number | null;
  fit_reason: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  outreach_draft: string | null;
  call_notes: string | null;
  follow_up_date: string | null;
  call_attempted_at: string | null;
  interested_at: string | null;
  observation: string | null;
  owner_name: string | null;
  suggested_channel: SuggestedChannel | null;
  source: LeadSource | null;
  inquiry_notes: string | null;
  auto_follow_up: boolean;
  follow_up_touches_sent: number;
  last_follow_up_at: string | null;
};

type Props = {
  leadId: string;
  onClose: () => void;
  onLeadUpdate: (id: string, updates: Partial<Lead>) => void;
};

export default function LeadDetailSheet({ leadId, onClose, onLeadUpdate }: Props) {
  const [lead, setLead]               = useState<Lead | null>(null);
  const [loading, setLoading]         = useState(true);
  const [draftOpen, setDraftOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [convertEmail, setConvertEmail] = useState('');
  const [converting, setConverting]   = useState(false);
  const [convertErr, setConvertErr]   = useState<string | null>(null);
  const [convertDone, setConvertDone] = useState(false);
  const touchY = useRef(0);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()
      .then(({ data }) => {
        setLead(data as Lead);
        setConvertEmail((data as Lead | null)?.email ?? '');
        setLoading(false);
      });
  }, [leadId]);

  async function save(updates: Partial<Lead>) {
    if (!lead) return;
    setSaving(true);
    const { error } = await supabase.from('leads').update(updates as LeadUpdate).eq('id', lead.id);
    if (!error) {
      const merged = { ...lead, ...updates };
      setLead(merged);
      onLeadUpdate(lead.id, updates);
    }
    setSaving(false);
  }

  async function handleStatus(val: string) {
    const updates: Partial<Lead> = { pipeline_state: val };
    if (val === 'contacted' && !lead?.call_attempted_at) {
      updates.call_attempted_at = new Date().toISOString();
    }
    await save(updates);
    if (val === 'interested') setShowConvert(true);
  }

  async function handleConvert() {
    if (!lead) return;
    setConverting(true);
    setConvertErr(null);
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          email: convertEmail.trim() || null,
          businessName: lead.business_name,
          phone: lead.phone,
        }),
      });
      if (res.ok) {
        const merged = { ...lead, interested_at: new Date().toISOString() };
        setLead(merged);
        onLeadUpdate(lead.id, { interested_at: merged.interested_at });
        setConvertDone(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setConvertErr(body.error ?? `Failed (HTTP ${res.status})`);
      }
    } catch (e) {
      setConvertErr((e as Error).message);
    } finally {
      setConverting(false);
    }
  }

  async function handleCopy() {
    if (!lead?.outreach_draft) return;
    await navigator.clipboard.writeText(lead.outreach_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mapsUrl = lead
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address || lead.business_name)}`
    : '#';

  const isInterested = lead?.pipeline_state === 'interested' || showConvert;

  return (
    <>
      {/* Dim layer over LeadsSheet */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:210, background:'rgba(0,0,0,0.4)' }}
      />

      {/* Sheet */}
      <div
        onTouchStart={e => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 72) onClose(); }}
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:211,
          height:'96dvh',
          background:'var(--surface)',
          borderRadius:'16px 16px 0 0',
          display:'flex', flexDirection:'column',
          animation:'sheet-up 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)' }} />
        </div>

        {loading || !lead ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <p style={{ color:'var(--muted)', fontSize:13 }}>Loading…</p>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', paddingBottom:40 }}>

            {/* Header */}
            <div style={{
              display:'flex', alignItems:'flex-start', justifyContent:'space-between',
              padding:'8px 20px 14px', borderBottom:'1px solid var(--border)',
            }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:18 }}>{lead.business_name}</span>
                  <SourceBadge source={lead.source} />
                </div>
                {lead.owner_name && lead.owner_name !== lead.business_name && (
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>👤 {lead.owner_name}</div>
                )}
                {lead.business_type && (
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{lead.business_type}</div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer', padding:'4px 6px', lineHeight:1 }}
              >✕</button>
            </div>

            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Observation — the call opener */}
              {lead.observation && (
                <div style={{
                  background:'rgba(240,165,0,0.08)', borderLeft:'3px solid var(--orange)',
                  borderRadius:'0 8px 8px 0', padding:'10px 14px',
                  fontSize:14, lineHeight:1.6, color:'var(--text)',
                }}>
                  {lead.observation}
                </div>
              )}

              {/* Inquiry notes (service / budget / message from the form) */}
              {lead.inquiry_notes && (
                <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                  {lead.inquiry_notes}
                </div>
              )}

              {/* Contact info */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {lead.address && (
                  <div style={{ fontSize:13, color:'var(--muted)', display:'flex', gap:8 }}>
                    <span>📍</span><span>{lead.address}</span>
                  </div>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} style={{ fontSize:13, color:'var(--accent-lt)', display:'flex', gap:8, textDecoration:'none' }}>
                    <span>📞</span><span>{lead.phone}</span>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} style={{ fontSize:13, color:'var(--accent-lt)', display:'flex', gap:8, textDecoration:'none' }}>
                    <span>✉️</span><span>{lead.email}</span>
                  </a>
                )}
                {lead.suggested_channel && (
                  <div style={{ fontSize:13, color:'var(--muted)', display:'flex', gap:8 }} title="Suggested channel">
                    <span>{CHANNEL_ICON[lead.suggested_channel]}</span>
                    <span>Suggested: {CHANNEL_LABEL[lead.suggested_channel]}</span>
                  </div>
                )}
                <div style={{ fontSize:13, color:'var(--muted)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  {lead.rating != null && (
                    <span>⭐ {lead.rating} ({lead.review_count ?? 0} reviews)</span>
                  )}
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer"
                      style={{ color:'var(--accent-lt)', fontSize:13 }}>
                      🌐 {lead.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span style={{ background:'var(--border)', borderRadius:4, padding:'1px 8px', fontSize:11, fontWeight:600 }}>
                      No website
                    </span>
                  )}
                </div>
              </div>

              {/* Fit score */}
              {lead.fit_score != null && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>
                      Fit Score
                    </span>
                    <span style={{ fontWeight:700, color: scoreColor(lead.fit_score) }}>{lead.fit_score}</span>
                  </div>
                  <div style={{ background:'var(--border)', borderRadius:4, height:6, overflow:'hidden' }}>
                    <div style={{
                      width:`${Math.min(100, (lead.fit_score / 12) * 100)}%`, height:'100%',
                      background: scoreColor(lead.fit_score), borderRadius:4,
                    }} />
                  </div>
                  {lead.fit_reason && (
                    <p style={{ fontSize:12, color:'var(--muted)', marginTop:6, lineHeight:1.5 }}>{lead.fit_reason}</p>
                  )}
                </div>
              )}

              {/* Outreach draft */}
              {lead.outreach_draft && (
                <div style={{ border:'1px solid var(--border)', borderRadius:10 }}>
                  <button
                    type="button"
                    onClick={() => setDraftOpen(o => !o)}
                    style={{
                      width:'100%', background:'none', border:'none', cursor:'pointer',
                      padding:'10px 14px', display:'flex', justifyContent:'space-between',
                      alignItems:'center', color:'var(--text)', fontSize:13, fontWeight:500,
                    }}
                  >
                    <span>Outreach Draft</span>
                    <span style={{ color:'var(--muted)', fontSize:11 }}>{draftOpen ? '▲' : '▼'}</span>
                  </button>
                  {draftOpen && (
                    <div style={{ padding:'0 14px 14px' }}>
                      <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                        {lead.outreach_draft}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleCopy}
                        style={{ marginTop:10 }}
                      >{copied ? '✓ Copied' : 'Copy'}</button>
                    </div>
                  )}
                </div>
              )}

              {/* Maps */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ justifyContent:'center' }}
              >
                🗺 Google Maps
              </a>

              <div style={{ borderTop:'1px solid var(--border)' }} />

              {/* Status */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:8 }}>
                  Status
                </div>
                <select
                  value={lead.pipeline_state ?? 'new'}
                  onChange={e => handleStatus(e.target.value)}
                  disabled={saving}
                  style={{ width:'100%' }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {lead.call_attempted_at && (
                  <p style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>
                    Contacted {new Date(lead.call_attempted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                  </p>
                )}
                {lead.source === 'inquiry' && (
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    marginTop:12, padding:'10px 12px',
                    background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>Auto follow-up</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{followUpSummary(lead)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => save({ auto_follow_up: !lead.auto_follow_up })}
                      disabled={saving}
                      style={{
                        padding:'6px 14px', borderRadius:999, border:'none', cursor:'pointer',
                        fontSize:12, fontWeight:700,
                        background: lead.auto_follow_up ? 'var(--green)' : 'var(--border)',
                        color: lead.auto_follow_up ? '#0F1117' : 'var(--text)',
                      }}
                    >
                      {lead.auto_follow_up ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
              </div>

              {/* Convert to client banner */}
              {isInterested && !convertDone && (
                <div style={{
                  background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
                  borderRadius:10, padding:14,
                }}>
                  <div style={{ fontWeight:600, color:'var(--green)', marginBottom:10, fontSize:14 }}>
                    ✓ Interested — create a client record?
                  </div>
                  {!showConvert ? (
                    <button type="button" className="btn btn-primary btn-sm btn-full"
                      onClick={() => setShowConvert(true)}>
                      Convert to Client →
                    </button>
                  ) : (
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
                        {converting ? 'Creating…' : `Add ${lead.business_name} to Clients →`}
                      </button>
                      {convertErr && (
                        <div style={{ fontSize:12, color:'var(--red)' }}>{convertErr}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {convertDone && (
                <div style={{
                  background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
                  borderRadius:10, padding:14, color:'var(--green)', fontWeight:600,
                }}>
                  ✓ {lead.business_name} added to Clients
                </div>
              )}

              <div style={{ borderTop:'1px solid var(--border)' }} />

              {/* Call notes */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:8 }}>
                  Call Notes
                </div>
                <textarea
                  key={lead.id}
                  defaultValue={lead.call_notes ?? ''}
                  placeholder="Add call notes…"
                  style={{ minHeight:80, fontSize:13, lineHeight:1.5, width:'100%' }}
                  onBlur={e => {
                    const val = e.target.value;
                    if (val !== (lead.call_notes ?? '')) save({ call_notes: val });
                  }}
                />
              </div>

              {/* Follow-up date — only shown when status = follow_up */}
              {lead.pipeline_state === 'follow_up' && (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)', marginBottom:8 }}>
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
          </div>
        )}
      </div>
    </>
  );
}
