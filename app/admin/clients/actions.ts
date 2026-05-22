'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPortalGetStartedEmail } from '@/app/admin/projects/actions';
import { sendPushNotification } from '@/lib/push';
import { stripe } from '@/lib/stripe';

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
    .gt('expires_at', new Date().toISOString())
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

export async function onboardClientAction(formData: FormData) {
  const clientId = formData.get('client_id') as string;
  const title = (formData.get('title') as string).trim();
  const depositAmount = parseFloat(formData.get('deposit_amount') as string);

  const supabase = await createClient();

  const [{ data: client }, { data: template }] = await Promise.all([
    supabase.from('clients').select('name, email').eq('id', clientId).single(),
    supabase.from('contract_templates').select('content').single(),
  ]);

  if (!client) throw new Error('Client not found');

  // Create project
  const { data: project } = await supabase
    .from('projects')
    .insert({ title, client_id: clientId, stage: 'discovery' })
    .select()
    .single();

  if (!project) throw new Error('Failed to create project');

  // Generate contract content from template
  const content = (template?.content ?? '')
    .replace(/\{\{client_name\}\}/g, client.name)
    .replace(/\{\{project_title\}\}/g, title)
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago',
    }));

  // Create contract, portal session, and deposit invoice in parallel
  const [, { data: portalSession }, { data: invoice }] = await Promise.all([
    supabase.from('contracts').insert({ project_id: project.id, content }),
    supabase.from('portal_sessions').insert({ project_id: project.id }).select('token').single(),
    supabase.from('invoices').insert({
      project_id: project.id,
      amount: depositAmount,
      type: 'deposit',
      status: 'unpaid',
    }).select().single(),
  ]);

  // Generate Stripe payment link upfront so it's ready when client hits Step 2
  if (portalSession && invoice) {
    try {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(depositAmount * 100),
        product_data: { name: `${title} — Deposit` },
      });
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_id: invoice.id },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?token=${portalSession.token}`,
          },
        },
      });
      await supabase.from('invoices').update({
        stripe_payment_id: paymentLink.id,
        stripe_payment_url: paymentLink.url,
      }).eq('id', invoice.id);
    } catch (e) {
      console.error('Stripe link generation failed:', e);
    }
  }

  // Mark client active and send portal email
  await supabase.from('clients').update({ status: 'active' }).eq('id', clientId);

  if (portalSession) {
    try {
      await sendPortalGetStartedEmail(client.name, client.email, title, portalSession.token);
      await supabase
        .from('portal_sessions')
        .update({ sent_at: new Date().toISOString() })
        .eq('token', portalSession.token);
      await sendPushNotification(
        '🚀 Client Onboarded',
        `${client.name} — portal sent`,
        `/admin/projects/${project.id}`
      );
    } catch (e) {
      console.error('Portal email failed:', e);
    }
  }

  redirect(`/admin/projects/${project.id}`);
}

export async function deleteClientAction(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('clients').delete().eq('id', id);
  revalidatePath('/admin/clients');
  redirect('/admin/clients');
}
