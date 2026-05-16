'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function saveContractTemplateAction(formData: FormData) {
  const content = (formData.get('content') as string).trim();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('contract_templates')
    .select('id')
    .single();

  if (existing) {
    await supabase
      .from('contract_templates')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('contract_templates').insert({ content });
  }

  revalidatePath('/admin/settings/contract');
  redirect('/admin/settings/contract');
}
