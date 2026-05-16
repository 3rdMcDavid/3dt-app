'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';

// Stage advancement map — admin "Send Draft" button
const NEXT_REVISION_STAGE: Record<string, string> = {
  intake_received: 'revision_1_open',
  revision_1_received: 'revision_2_open',
  revision_2_received: 'post_final_open',
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();
  const clientId = formData.get('client_id') as string;

  const { data: client } = await supabase
    .from('clients')
    .select('name, email')
    .eq('id', clientId)
    .single();

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title: (formData.get('title') as string).trim(),
      client_id: clientId,
      stage: (formData.get('stage') as string) || 'discovery',
      notes: (formData.get('notes') as string)?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-create contract from template and email signing link (best-effort)
  if (client) {
    try {
      const { data: template } = await supabase
        .from('contract_templates')
        .select('content')
        .single();

      const content = (template?.content ?? '')
        .replace(/\{\{client_name\}\}/g, client.name)
        .replace(/\{\{project_title\}\}/g, project.title)
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

      const { data: contract } = await supabase
        .from('contracts')
        .insert({ project_id: project.id, content })
        .select('sign_token')
        .single();

      if (contract) {
        const signUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${contract.sign_token}`;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: client.email,
          subject: `Please review and sign your contract — ${project.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
              <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
              <p style="margin-bottom:16px;line-height:1.6;">
                We're excited to get started on your website project <strong>${project.title}</strong>!
                Please review and sign your contract below. Once signed, you'll receive your deposit invoice.
              </p>
              <a href="${signUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Review &amp; Sign Contract →
              </a>
              <p style="margin-top:24px;color:#6B6B60;font-size:12px;">Questions? Reply to this email.</p>
            </div>
          `,
        });

        await supabase
          .from('contracts')
          .update({ sign_email_sent_at: new Date().toISOString() })
          .eq('sign_token', contract.sign_token);
      }
    } catch (e) {
      console.error('Auto contract/email failed:', e);
    }
  }

  redirect(`/admin/projects/${project.id}`);
}

export async function advanceRevisionStageAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const currentStage = formData.get('current_stage') as string;
  const nextStage = NEXT_REVISION_STAGE[currentStage];
  if (!nextStage) return;

  const supabase = await createClient();
  await supabase.from('projects').update({ revision_stage: nextStage }).eq('id', projectId);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function updateProjectAction(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();

  await supabase
    .from('projects')
    .update({
      title: (formData.get('title') as string).trim(),
      client_id: formData.get('client_id') as string,
      stage: formData.get('stage') as string,
      notes: (formData.get('notes') as string)?.trim() || null,
    })
    .eq('id', id);

  revalidatePath(`/admin/projects/${id}`);
  redirect(`/admin/projects/${id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('projects').delete().eq('id', id);
  revalidatePath('/admin/projects');
  redirect('/admin/projects');
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function upsertProposalAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const proposalId = formData.get('proposal_id') as string;
  const supabase = await createClient();

  const payload = {
    project_id: projectId,
    deliverables: (formData.get('deliverables') as string).trim(),
    price: parseFloat(formData.get('price') as string),
    status: (formData.get('status') as string) || 'draft',
  };

  if (proposalId) {
    await supabase.from('proposals').update(payload).eq('id', proposalId);
  } else {
    await supabase.from('proposals').insert(payload);
  }

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function upsertContractAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const contractId = formData.get('contract_id') as string;
  const supabase = await createClient();

  const payload = {
    project_id: projectId,
    content: (formData.get('content') as string).trim(),
  };

  if (contractId) {
    await supabase.from('contracts').update(payload).eq('id', contractId);
  } else {
    await supabase.from('contracts').insert(payload);
  }

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function createInvoiceAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const supabase = await createClient();

  await supabase.from('invoices').insert({
    project_id: projectId,
    amount: parseFloat(formData.get('amount') as string),
    type: formData.get('type') as 'deposit' | 'final',
    status: 'unpaid',
    due_date: (formData.get('due_date') as string) || null,
  });

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function markInvoicePaidAction(formData: FormData) {
  const invoiceId = formData.get('invoice_id') as string;
  const projectId = formData.get('project_id') as string;
  const supabase = await createClient();

  await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function generateStripePaymentLinkAction(formData: FormData) {
  const invoiceId = formData.get('invoice_id') as string;
  const projectId = formData.get('project_id') as string;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .single();

  if (!invoice || !project) throw new Error('Invoice or project not found');

  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: Math.round(invoice.amount * 100),
    product_data: {
      name: `${project.title} — ${invoice.type === 'deposit' ? 'Deposit' : 'Final Payment'}`,
    },
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { invoice_id: invoiceId },
    after_completion: {
      type: 'redirect',
      redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success` },
    },
  });

  await supabase
    .from('invoices')
    .update({
      stripe_payment_id: paymentLink.id,
      stripe_payment_url: paymentLink.url,
    })
    .eq('id', invoiceId);

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function deleteInvoiceAction(formData: FormData) {
  const invoiceId = formData.get('invoice_id') as string;
  const projectId = formData.get('project_id') as string;
  const supabase = await createClient();

  await supabase.from('invoices').delete().eq('id', invoiceId);
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function deleteDocumentAction(formData: FormData) {
  const documentId = formData.get('document_id') as string;
  const projectId = formData.get('project_id') as string;
  const fileUrl = formData.get('file_url') as string;

  const service = createServiceClient();
  await service.storage.from('documents').remove([fileUrl]);
  await service.from('documents').delete().eq('id', documentId);

  revalidatePath(`/admin/projects/${projectId}`);
}

// ─── Portal Sessions ──────────────────────────────────────────────────────────

export async function generatePortalLinkAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const supabase = await createClient();

  await supabase.from('portal_sessions').insert({ project_id: projectId });

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}

export async function sendPortalEmailAction(formData: FormData) {
  const projectId = formData.get('project_id') as string;
  const token = formData.get('token') as string;
  const clientEmail = formData.get('client_email') as string;
  const clientName = formData.get('client_name') as string;
  const projectTitle = formData.get('project_title') as string;
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: clientEmail,
    subject: `Your client portal is ready — ${projectTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:8px;">Hi ${clientName},</h2>
        <p style="margin-bottom:20px;line-height:1.6;">Your client portal for <strong>${projectTitle}</strong> is ready. You can view your project details, review your contract, and make payments through the link below.</p>
        <a href="${portalUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Open Your Portal →</a>
        <p style="margin-top:24px;color:#6B6B60;font-size:12px;">This link is valid for 30 days. Reply to this email if you have any questions.</p>
      </div>
    `,
  });

  const supabase = await createClient();
  await supabase
    .from('portal_sessions')
    .update({ sent_at: new Date().toISOString() })
    .eq('token', token);

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}`);
}
