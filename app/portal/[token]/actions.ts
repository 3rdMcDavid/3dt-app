'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function signContractAction(formData: FormData) {
  const token = formData.get('token') as string;
  const contractId = formData.get('contract_id') as string;
  const signatureName = (formData.get('signature_name') as string).trim();

  if (!signatureName) return;

  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  const supabase = createServiceClient();

  // Validate token is still valid before signing
  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return;

  await supabase
    .from('contracts')
    .update({
      signed_at: new Date().toISOString(),
      signature_name: signatureName,
      signature_ip: ip,
    })
    .eq('id', contractId);

  revalidatePath(`/portal/${token}/contract`);
}
