'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPortalGetStartedEmail } from '@/app/admin/projects/actions';
import { sendPushNotification } from '@/lib/push';
import { stripe } from '@/lib/stripe';


export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: (formData.get('name') as string).trim(),
      email: (formData.get('email') as string).trim().toLowerCase(),
      phone: (formData.get('phone') as string)?.trim() || null,
      status: 'lead',
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

  await supabase
    .from('clients')
    .update({
      name: (formData.get('name') as string).trim(),
      email: (formData.get('email') as string).trim().toLowerCase(),
      phone: (formData.get('phone') as string)?.trim() || null,
      company: (formData.get('company') as string)?.trim() || null,
      status: newStatus,
    })
    .eq('id', id);

  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

export async function updateClientStatusAction(formData: FormData) {
  const id = formData.get('id') as string;
  const status = formData.get('status') as string;
  const supabase = await createClient();

  await supabase.from('clients').update({ status }).eq('id', id);

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
  const isToolProject  = projectType === 'tool' || projectType === 'website_tool';
  const handoffWord    = projectType === 'website_tool' ? 'launch and delivery' : isToolProject ? 'delivery' : 'launch';

  const itemLines = scopeItems.map(i => `  • ${i.name} — ${fmt(i.price)}`).join('\n');
  const carePlanLine = carePlan
    ? `\n  • Monthly Care Plan — $150/month (begins 30 days after ${handoffWord}; set up recurring billing separately)`
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
    `Final (50%): ${fmt(final)} — due before ${handoffWord}`,
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
    ? '⚠️ Care Plan selected — set up $150/mo recurring billing in Stripe.'
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

  // Persist scope items for reference and future add-ons (non-fatal — project already exists)
  if (scopeItems.length > 0) {
    try {
      await supabase.from('project_scope_items').insert(
        scopeItems.map(item => ({
          project_id: project.id,
          name: item.name,
          price: item.price,
          is_addon: false,
        }))
      );
    } catch (e) {
      console.error('Scope items insert failed (non-fatal):', e);
    }
  }

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

  // Fire portal email (client stays 'lead' until deposit is paid)
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
