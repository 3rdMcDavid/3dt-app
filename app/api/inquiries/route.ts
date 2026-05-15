import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.WEBSITE_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-inquiry-secret',
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-inquiry-secret');
  if (secret !== process.env.INQUIRY_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let body: { first_name?: string; last_name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { first_name, last_name, email, message } = body;

  if (!first_name || !email) {
    return NextResponse.json({ error: 'first_name and email are required' }, { status: 400, headers: corsHeaders });
  }

  const name = [first_name, last_name].filter(Boolean).join(' ');

  const supabase = createServiceClient();
  const { error } = await supabase.from('clients').insert({
    name,
    email,
    phone: null,
    status: 'lead',
    notes: message ?? null,
  });

  if (error) {
    console.error('Inquiry insert error:', error);
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ success: true }, { status: 201, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
