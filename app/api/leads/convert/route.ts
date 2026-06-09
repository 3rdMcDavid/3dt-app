import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: Request) {
  const { leadId, email, businessName, phone } = await req.json();
  if (!leadId || !businessName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const resolvedEmail = email?.trim() || `noemail-${leadId}@placeholder`;

  const { error: clientError } = await supabase.from('clients').insert({
    name: businessName,
    email: resolvedEmail,
    phone: phone ?? null,
    company: businessName,
    status: 'active',
  });

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  const { error: leadError } = await supabase
    .from('leads')
    .update({ interested_at: new Date().toISOString() })
    .eq('id', leadId);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
