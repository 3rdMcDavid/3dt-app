import type { LeadSource, SuggestedChannel } from '@/lib/types';

// Rule-based fit scores run 0–12 (legacy LLM rows were 1–10).
export function scoreColor(s: number | null) {
  if (s == null) return 'var(--muted)';
  if (s >= 9) return 'var(--green)';
  if (s >= 6) return 'var(--orange)';
  return 'var(--muted)';
}

export const SOURCE_LABEL: Record<LeadSource, string> = {
  scout:    'Scout',
  inquiry:  'Inquiry',
  referral: 'Referral',
  manual:   'Manual',
};

export const SOURCE_STYLE: Record<LeadSource, { bg: string; color: string; border: string }> = {
  inquiry:  { bg: 'rgba(34,197,94,0.15)',  color: 'var(--green)', border: 'rgba(34,197,94,0.35)' },
  referral: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc',      border: 'rgba(168,85,247,0.35)' },
  manual:   { bg: 'rgba(99,102,241,0.15)', color: '#818cf8',      border: 'rgba(99,102,241,0.35)' },
  scout:    { bg: 'var(--border)',         color: 'var(--muted)', border: 'var(--border)' },
};

export const CHANNEL_ICON: Record<SuggestedChannel, string> = {
  phone:       '📞',
  facebook_dm: '💬',
  email:       '✉️',
};

export const CHANNEL_LABEL: Record<SuggestedChannel, string> = {
  phone:       'Call',
  facebook_dm: 'Facebook DM',
  email:       'Email',
};
