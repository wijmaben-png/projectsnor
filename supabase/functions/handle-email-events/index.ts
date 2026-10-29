import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { recordEmailEvent } from '../_shared/email-audit.ts'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    // Placeholder handlers — replace each log with the feature's reaction.
    // Throw on failure so the delivery is retried.
    'email.bounced': async (event) => {
      await recordEmailEvent(client, event, 'bounce')
    },
    'email.complaint': async (event) => {
      await recordEmailEvent(client, event, 'complaint')
    },
    'email.unsubscribed': async (event) => {
      await recordEmailEvent(client, event, 'unsubscribe')
    },
  },
})

Deno.serve((req) => handler(req))
