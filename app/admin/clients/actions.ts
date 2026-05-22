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
  const projectType = (formData.get('project_type') as string) || 'website';
  const carePlan = formData.get('care_plan') === 'true';

  let scopeItems: { name: string; price: number }[] = [];
  try {
    scopeItems = JSON.parse((formData.get('scope') as string) || '[]');
  } catch { scopeItems = []; }

  if (scopeItems.length === 0) throw new Error('Select at least one service before onboarding.');

  const total = scopeItems.reduce((a, b) => a + b.price, 0);
  const deposit = Math.round((total / 2) * 100) / 100;
  const final = Math.round((total - deposit) * 100) / 100;

  function fmt(n: number) {
    return `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;
  }

  const supabase = await createClient();

  const [{ data: client }, { data: template }] = await Promise.all([
    supabase.from('clients').select('name, email').eq('id', clientId).single(),
    supabase.from('contract_templates').select('content').single(),
  ]);

  if (!client) throw new Error('Client not found');

  // Build deliverables block for the contract
  const itemLines = scopeItems.map(i => `  • ${i.name} — ${fmt(i.price)}`).join('\n');
  const carePlanLine = carePlan
    ? `\n  • Monthly Care Plan — $75/month (begins 30 days after launch; set up recurring billing separately)`
    : '';
  const deliverablesBlock = [
    'SCOPE OF WORK',
    '',
    'The following services are included in this agreement:',
    '',
    itemLines + carePlanLine,
    '',
    `Project Total: ${fmt(total)}`,
    `Deposit (50%): ${fmt(deposit)} — due at signing`,
    `Final (50%): ${fmt(final)} — due before launch`,
  ].join('\n');

  let content = (template?.content ?? '')
    .replace(/\{\{client_name\}\}/g, client.name)
    .replace(/\{\{project_title\}\}/g, title)
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago',
    }));

  content = content.includes('{{deliverables}}')
    ? content.replace('{{deliverables}}', deliverablesBlock)
    : deliverablesBlock + '\n\n---\n\n' + content;

  const projectNotes = carePlan
    ? '⚠️ Care Plan selected — set up $75/mo recurring billing in Stripe.'
    : null;

  // Create project
  const { data: project } = await supabase
    .from('projects')
    .insert({ title, client_id: clientId, project_type: projectType, stage: 'discovery', notes: projectNotes })
    .select()
    .single();

  if (!project) throw new Error('Failed to create project');

  // Create contract, portal session, and deposit invoice in parallel
  const [, { data: portalSession }, { data: depositInvoice }] = await Promise.all([
    supabase.from('contracts').insert({ project_id: project.id, content }),
    supabase.from('portal_sessions').insert({ project_id: project.id }).select('token').single(),
    supabase.from('invoices').insert({
      project_id: project.id, amount: deposit, type: 'deposit', status: 'unpaid',
    }).select().single(),
  ]);

  // Create final invoice
  await supabase.from('invoices').insert({
    project_id: project.id, amount: final, type: 'final', status: 'unpaid',
  });

  // Generate Stripe payment link for deposit — ready before client even signs
  if (portalSession && depositInvoice) {
    try {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(deposit * 100),
        product_data: { name: `${title} — Deposit` },
      });
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_id: depositInvoice.id },
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
      }).eq('id', depositInvoice.id);
    } catch (e) {
      console.error('Stripe link generation failed:', e);
    }
  }

  // Mark client active and fire portal email
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
