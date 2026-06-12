import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Admin API routes use the service role client (bypasses RLS), and the proxy
// middleware only guards /admin pages — so each route must verify the caller's
// session itself. Returns a 401 response to short-circuit with, or null if
// the request is from the authenticated admin.
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
