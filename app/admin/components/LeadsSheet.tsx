'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import LeadDetailSheet from './LeadDetailSheet';

const TABS = ['all','new','qualified','approved','interested','follow_up','rejected','won','lost'] as const;
const TAB_LABEL: Record<string, string> = {
  all:'All', new:'New', qualified:'Qualified', approved:'Approved',
  interested:'Interested', follow_up:'Follow Up', rejected:'Rejected',
  won:'Won', lost:'Lost',
};
const SORT_OPTS = ['newest','score','city','type'] as const;
const SORT_LABEL: Record<string, string> = {
  newest:'Newest', score:'Highest Score', city:'City', type:'Business Type',
};

type Lead = {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  fit_score: number | null;
  state: string | null;
  created_at: string;
};

type Props = { initialFilter: string; onClose: () => void };

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

export default function LeadsSheet({ initialFilter, onClose }: Props) {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoad]      = useState(true);
  const [filter, setFilter]     = useState(initialFilter);
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const touchY = useRef(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('leads')
      .select('id,business_name,business_type,city,fit_score,state,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setLeads(data ?? []); setLoad(false); });
  }, []);

  const visible = leads
    .filter(l => filter === 'all' || l.state === filter)
    .filter(l => !search || (l.business_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'score') return (b.fit_score ?? 0) - (a.fit_score ?? 0);
      if (sort === 'city')  return (a.city ?? '').localeCompare(b.city ?? '');
      if (sort === 'type')  return (a.business_type ?? '').localeCompare(b.business_type ?? '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div
        onTouchStart={e => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 72) onClose(); }}
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:201,
          height:'92dvh',
          background:'var(--surface)',
          borderRadius:'16px 16px 0 0',
          display:'flex', flexDirection:'column',
          animation:'sheet-up 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 20px 12px', borderBottom:'1px solid var(--border)',
        }}>
          <span style={{ fontWeight:700, fontSize:17 }}>Leads</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 6px' }}
          >✕</button>
        </div>

        {/* Filter tabs — horizontal scroll */}
        <div style={{
          display:'flex', gap:6, padding:'10px 16px',
          overflowX:'auto', scrollbarWidth:'none',
          borderBottom:'1px solid var(--border)', flexShrink:0,
        }}>
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                flexShrink:0, padding:'5px 12px', borderRadius:20,
                fontSize:13, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                border:'1px solid',
                borderColor: filter === tab ? 'var(--green)' : 'var(--border)',
                background:  filter === tab ? 'var(--green)' : 'transparent',
                color:       filter === tab ? '#fff' : 'var(--muted)',
              }}
            >{TAB_LABEL[tab]}</button>
          ))}
        </div>

        {/* Search + Sort */}
        <div style={{
          display:'flex', gap:8, padding:'10px 16px',
          borderBottom:'1px solid var(--border)', flexShrink:0,
        }}>
          <input
            type="search"
            placeholder="Search businesses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:1, padding:'7px 12px', fontSize:13 }}
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ width:130, padding:'7px 10px', fontSize:13, flexShrink:0 }}
          >
            {SORT_OPTS.map(s => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
          </select>
        </div>

        {/* Lead list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading ? (
            <p style={{ padding:28, color:'var(--muted)', fontSize:13, textAlign:'center' }}>Loading…</p>
          ) : visible.length === 0 ? (
            <p style={{ padding:28, color:'var(--muted)', fontSize:13, textAlign:'center' }}>No leads match.</p>
          ) : visible.map((lead, i) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedId(lead.id)}
              style={{
                width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left',
                padding:'13px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                display:'flex', alignItems:'center', gap:12,
              }}
            >
              {/* Score dot */}
              <div style={{
                width:10, height:10, borderRadius:'50%', flexShrink:0,
                background: scoreDot(lead.fit_score),
              }} />

              {/* Name + meta */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {lead.business_name}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:6, alignItems:'center', marginTop:2, flexWrap:'wrap' }}>
                  {lead.city && <span>{lead.city}</span>}
                  {lead.business_type && (
                    <span style={{ background:'var(--border)', borderRadius:4, padding:'1px 6px', fontSize:11 }}>
                      {lead.business_type}
                    </span>
                  )}
                  <span style={{ marginLeft:'auto', flexShrink:0 }}>{relativeDate(lead.created_at)}</span>
                </div>
              </div>

              {/* State badge */}
              {lead.state && (
                <span style={{
                  fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4,
                  border:'1px solid var(--border)', color:'var(--muted)',
                  flexShrink:0, textTransform:'capitalize', whiteSpace:'nowrap',
                }}>
                  {lead.state.replace(/_/g, ' ')}
                </span>
              )}

              {/* Tap indicator */}
              <span style={{ color:'var(--muted)', fontSize:16, flexShrink:0 }}>›</span>
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
    </>
  );
}
