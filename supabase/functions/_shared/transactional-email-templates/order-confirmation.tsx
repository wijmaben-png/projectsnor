import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Project Snor"

interface OrderConfirmationProps {
  first_name?: string
  last_name?: string
  tshirt_size?: string
  tshirt_color?: string
  delivery_method?: string
  amount_paid?: number
  street?: string
  postal_code?: string
  city?: string
}

const OrderConfirmationEmail = ({
  first_name = 'Klant',
  last_name = '',
  tshirt_size = '',
  tshirt_color = 'black',
  delivery_method = 'pickup',
  amount_paid,
  street,
  postal_code,
  city,
}: OrderConfirmationProps) => {
  const colorLabel = tshirt_color === 'black' ? 'Zwart' : tshirt_color === 'white' ? 'Wit' : tshirt_color
  const priceLabel = typeof amount_paid === 'number' ? `€${amount_paid.toFixed(2)}` : '—'
  const isShipping = delivery_method === 'shipping'
  const addressLine = isShipping && street
    ? `${street}, ${postal_code ?? ''} ${city ?? ''}`.trim()
    : ''

  return (
    <Html lang="nl" dir="ltr">
      <Head />
      <Preview>Bedankt voor je bestelling bij {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{SITE_NAME}</Heading>
          <Text style={text}>Hey {first_name}!</Text>
          <Text style={text}>Bedankt voor je bestelling bij {SITE_NAME}.</Text>

          <Section style={orderBox}>
            <Text style={orderTitle}>Je bestelling</Text>
            <Text style={orderItem}>Maat: <strong>{tshirt_size}</strong></Text>
            <Text style={orderItem}>Kleur: <strong>{colorLabel}</strong></Text>
            <Text style={orderItem}>Totaalbedrag: <strong>{priceLabel}</strong></Text>
          </Section>

          {isShipping ? (
            <Text style={text}>
              Je shirt wordt verzonden naar <strong>{addressLine}</strong>. Je ontvangt zo snel mogelijk een tracking nummer.
            </Text>
          ) : (
            <Text style={text}>
              Je shirt kun je ophalen op <strong>29 mei tijdens het Snorrenfeest</strong>. We zien je daar!
            </Text>
          )}

          <Hr style={hr} />
          <Text style={text}>Groetjes,{'\n'}het {SITE_NAME} team</Text>
          <Text style={footer}>Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderConfirmationEmail,
  subject: 'Bedankt voor je bestelling bij Project Snor!',
  displayName: 'Bestelbevestiging',
  previewData: {
    first_name: 'Jan',
    last_name: 'de Vries',
    tshirt_size: 'L',
    tshirt_color: 'black',
    delivery_method: 'pickup',
    amount_paid: 27.99,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "Georgia, 'Times New Roman', serif" }
const container = { padding: '32px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '32px', fontWeight: 'bold' as const, fontStyle: 'italic' as const, color: '#000000', margin: '0 0 24px' }
const text = { fontSize: '16px', color: '#000000', lineHeight: '1.5', margin: '0 0 16px' }
const orderBox = { border: '1px solid #000000', padding: '16px 20px', margin: '24px 0' }
const orderTitle = { fontSize: '16px', fontStyle: 'italic' as const, color: '#000000', margin: '0 0 8px' }
const orderItem = { fontSize: '14px', color: '#000000', margin: '0 0 4px' }
const hr = { borderColor: '#000000', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#666666', margin: '32px 0 0' }
