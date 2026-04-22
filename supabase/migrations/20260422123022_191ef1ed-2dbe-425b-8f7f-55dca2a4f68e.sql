
-- Drop the overly permissive anon SELECT policy
DROP POLICY "Anyone can read their own preorder by id" ON public.preorders;

-- Create a security definer function that returns a single preorder by id
-- This prevents anon users from listing all preorders
CREATE OR REPLACE FUNCTION public.get_preorder_by_id(_order_id uuid)
RETURNS TABLE(
  first_name text,
  tshirt_size text,
  tshirt_color text,
  delivery_method text,
  amount_paid numeric,
  payment_status text,
  street text,
  postal_code text,
  city text
)
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
    p.street,
    p.postal_code,
    p.city
  FROM public.preorders p
  WHERE p.id = _order_id
  LIMIT 1;
$$;
