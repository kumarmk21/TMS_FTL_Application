import { supabase } from './supabase';

export async function sendBillEmail(billId: string, billType: 'lr' | 'warehouse'): Promise<string> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bill-email`;

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ billId, billType }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Email send failed:', response.status, result);
    const errorMsg = result.details ? `${result.error}\n\nDetails: ${result.details}` : (result.error || `Failed to send email (Status: ${response.status})`);
    throw new Error(errorMsg);
  }

  return result.message;
}
