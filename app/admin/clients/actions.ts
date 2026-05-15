'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  const supabase = await createClient();

  await supabase
    .from('clients')
    .update({
      name: (formData.get('name') as string).trim(),
      email: (formData.get('email') as string).trim().toLowerCase(),
      phone: (formData.get('phone') as string)?.trim() || null,
      status: formData.get('status') as string,
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

export async function deleteClientAction(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('clients').delete().eq('id', id);
  revalidatePath('/admin/clients');
  redirect('/admin/clients');
}
