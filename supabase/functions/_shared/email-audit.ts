import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function logEmailOutcome(
  client: SupabaseClient,
  template: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
  orderId?: string,
) {
  const { error } = await client.from('email_send_log').insert({
    template_name: template,
    recipient_email: recipient,
    status,
    message_id: null,
    error_message: errorMessage ?? null,
    metadata: orderId ? { preorder_id: orderId } : null,
  })
  if (error) console.error('Email audit write failed', { code: error.code, message: error.message })
}

export async function recordEmailEvent(
  client: SupabaseClient,
  event: { event_id: string; data: { recipient: string; message_id: string } },
  reason: 'bounce' | 'complaint' | 'unsubscribe',
) {
  const email = event.data.recipient.toLowerCase()
  const { error: suppressionError } = await client.from('suppressed_emails').upsert(
    { email, reason, metadata: null }, { onConflict: 'email' },
  )
  if (suppressionError) throw suppressionError

  // Stable primary key per event makes redelivery idempotent without changing
  // the kept tables or repurposing their message_id / metadata contract.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.event_id))
  const hex = Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  const { error: logError } = await client.from('email_send_log').upsert({
    id,
    message_id: event.data.message_id || null,
    template_name: 'system',
    recipient_email: email,
    status: reason === 'bounce' ? 'bounced' : reason === 'complaint' ? 'complained' : 'suppressed',
    error_message: reason === 'bounce' ? 'Permanent bounce — email address is invalid or rejected' : reason === 'complaint' ? 'Spam complaint — recipient marked email as spam' : 'Recipient unsubscribed',
    metadata: null,
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (logError) throw logError
}