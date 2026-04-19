
ALTER TABLE public.preorders 
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS mollie_payment_id text,
  ADD COLUMN IF NOT EXISTS discount_code_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS sendcloud_parcel_id text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS label_created_at timestamptz;

-- Allow service role updates via admin/webhook (RLS already restricts public)
-- Add admin update policy so admins can manage rows from the dashboard if needed
DROP POLICY IF EXISTS "Admins can update preorders" ON public.preorders;
CREATE POLICY "Admins can update preorders"
  ON public.preorders
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index on mollie payment id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_preorders_mollie_payment_id ON public.preorders(mollie_payment_id);
