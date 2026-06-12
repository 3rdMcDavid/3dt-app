import { SOURCE_LABEL, SOURCE_STYLE } from '@/lib/leadDisplay';
import type { LeadSource } from '@/lib/types';

export default function SourceBadge({ source }: { source: LeadSource | null }) {
  if (!source) return null;
  const s = SOURCE_STYLE[source];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: '0.5px',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {SOURCE_LABEL[source]}
    </span>
  );
}
