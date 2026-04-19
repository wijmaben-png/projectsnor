DROP POLICY IF EXISTS "Anyone can insert preorders" ON public.preorders;

CREATE POLICY "Anyone can insert valid preorders"
ON public.preorders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(first_name) BETWEEN 1 AND 100
  AND char_length(last_name) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(phone) BETWEEN 4 AND 30
  AND tshirt_size IN ('S','M','L','XL')
  AND tshirt_color IN ('black','white')
  AND delivery_method IN ('pickup','shipping')
  AND payment_status = 'pending'
  AND mollie_payment_id IS NULL
  AND amount_paid IS NULL
  AND sendcloud_parcel_id IS NULL
  AND tracking_number IS NULL
  AND (
    delivery_method = 'pickup'
    OR (
      delivery_method = 'shipping'
      AND street IS NOT NULL AND char_length(street) BETWEEN 1 AND 200
      AND postal_code IS NOT NULL AND char_length(postal_code) BETWEEN 4 AND 20
      AND city IS NOT NULL AND char_length(city) BETWEEN 1 AND 100
    )
  )
);