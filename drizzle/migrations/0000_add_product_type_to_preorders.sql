ALTER TABLE public.preorders ADD COLUMN product_type text NOT NULL DEFAULT 'shirt';

DROP POLICY "Anyone can insert valid preorders" ON public.preorders;
CREATE POLICY "Anyone can insert valid preorders"
ON public.preorders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(first_name) >= 1 AND char_length(first_name) <= 100
  AND char_length(last_name) >= 1 AND char_length(last_name) <= 100
  AND char_length(email) >= 3 AND char_length(email) <= 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(phone) >= 4 AND char_length(phone) <= 30
  AND product_type = ANY (ARRAY['shirt','longsleeve','cap'])
  AND (
    (product_type = 'cap' AND tshirt_size = 'ONE' AND tshirt_color = 'none')
    OR (product_type <> 'cap' AND tshirt_size = ANY (ARRAY['S','M','L','XL']) AND tshirt_color = ANY (ARRAY['black','white']))
  )
  AND delivery_method = ANY (ARRAY['pickup','shipping'])
  AND payment_status = 'pending'
  AND mollie_payment_id IS NULL
  AND amount_paid IS NULL
  AND sendcloud_parcel_id IS NULL
  AND tracking_number IS NULL
  AND (
    delivery_method = 'pickup'
    OR (
      delivery_method = 'shipping'
      AND street IS NOT NULL AND char_length(street) >= 1 AND char_length(street) <= 200
      AND postal_code IS NOT NULL AND char_length(postal_code) >= 4 AND char_length(postal_code) <= 20
      AND city IS NOT NULL AND char_length(city) >= 1 AND char_length(city) <= 100
    )
  )
);

DROP FUNCTION public.get_preorder_by_id(uuid);
CREATE FUNCTION public.get_preorder_by_id(_order_id uuid)
RETURNS TABLE(first_name text, tshirt_size text, tshirt_color text, delivery_method text, amount_paid numeric, payment_status text, product_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.first_name,
    p.tshirt_size,
    p.tshirt_color,
    p.delivery_method,
    p.amount_paid,
    p.payment_status,
    p.product_type
  FROM public.preorders p
  WHERE p.id = _order_id
    AND p.created_at > now() - interval '24 hours'
  LIMIT 1;
$$;