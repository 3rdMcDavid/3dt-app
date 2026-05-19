'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPortalGetStartedEmail } from '@/app/admin/projects/actions';
import { sendPushNotification } from '@/lib/push';

async function firePortalEmailForClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  clientName: string,
  clientEmail: string
) {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  const project = projects?.[0];
  if (!project) return;

  const { data: sessions } = await supabase
    .from('portal_sessions')
    .select('token, sent_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const session = sessions?.[0];
  if (!session || session.sent_at) return;

  await sendPortalGetStartedEmail(clientName, clientEmail, project.title, session.token);
  await supabase
    .from('portal_sessions')
    .update({ sent_at: new Date().toISOString() })
    .eq('token', session.token);

  await sendPushNotification(
    '📧 Portal Email Sent',
    `Get-started link sent to ${clientName}`,
    `/admin/clients/${clientId}`
  );
}

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: (formData.get('name') as string).trim(),
      email: (formData.get('email') as string).trim().toLowerCase(),
      phone: (formData.get('phone') as string)?.trim() || null,
      status: (formData.get('status') as string) || 'lead',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  redirect(`/admin/clients/${data.id}`);
}

export async function updateClientAction(formData: FormData) {
  const id = formData.get('id') as string;
  const newStatus = formData.get('status') as string;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('clients')
    .select('status, name, email')
    .eq('id', id)
    .single();

  await supabase
    .from('clients')
    .update({
      name: (formData.get('name') as string).trim(),
      email: (formData.get('email') as string).trim().toLowerCase(),
      phone: (formData.get('phone') as string)?.trim() || null,
      status: newStatus,
    })
    .eq('id', id);

  // Fire portal email when David activates a lead
  if (existing?.status === 'lead' && newStatus === 'active') {
    try {
      const clientName = (formData.get('name') as string).trim();
      const clientEmail = (formData.get('email') as string).trim().toLowerCase();
      await firePortalEmailForClient(supabase, id, clientName, clientEmail);
    } catch (e) {
      console.error('Portal activation email failed:', e);
    }
  }

  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

export async function updateClientStatusAction(formData: FormData) {
  const id = formData.get('id') as string;
  const status = formData.get('status') as string;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('clients')
    .select('status, name, email')
    .eq('id', id)
    .single();

  await supabase.from('clients').update({ status }).eq('id', id);

  if (existing?.status === 'lead' && status === 'active') {
    try {
      await firePortalEmailForClient(supabase, id, existing.name, existing.email);
    } catch (e) {
      console.error('Portal activation email failed:', e);
    }
  }

  revalidatePath('/admin/clients');
}

export async function deleteClientAction(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('clients').delete().eq('id', id);
  revalidatePath('/admin/clients');
  redirect('/admin/clients');
}
