import { logEmailOutcome, recordEmailEvent } from './email-audit.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
}

Deno.test('keeps exact legacy statuses, reason strings and event deduplication', async () => {
  const requests: { table: string; body: Record<string, unknown> }[] = []
  const client = createClient('https://example.invalid', 'fake-test-key', {
    global: { fetch: async (input, init) => {
      const body = init && 'body' in init ? init.body : undefined
      requests.push({ table: String(input).split('/').pop()?.split('?')[0] ?? '', body: JSON.parse(String(body)) })
      return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  for (const reason of ['bounce', 'complaint', 'unsubscribe'] as const) {
    const event = { event_id: `event-${reason}`, data: { recipient: 'TEST@example.invalid', message_id: 'message' } }
    await recordEmailEvent(client, event, reason)
    await recordEmailEvent(client, event, reason)
    const entries = requests.slice(-4)
    equal(entries[0].body.reason, reason)
    equal(entries[0].body.metadata, null)
    equal(entries[1].body.id, entries[3].body.id)
    equal(entries[1].body.status, reason === 'bounce' ? 'bounced' : reason === 'complaint' ? 'complained' : 'suppressed')
    equal(entries[1].body.template_name, 'system')
  }
  await logEmailOutcome(client, 'order-confirmation', 'test@example.invalid', 'sent', undefined, 'order-one')
  equal(requests.at(-1)?.body.metadata, { preorder_id: 'order-one' })
})

Deno.test('event write errors throw so signed deliveries can retry', async () => {
  const client = createClient('https://example.invalid', 'fake-test-key', {
    global: { fetch: async () => new Response(JSON.stringify({ code: '42501', message: 'Denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) },
  })
  let threw = false
  try { await recordEmailEvent(client, { event_id: 'event-failure', data: { recipient: 'test@example.invalid', message_id: 'm' } }, 'bounce') } catch { threw = true }
  equal(threw, true)
})