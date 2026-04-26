DROP FUNCTION IF EXISTS public.get_preorder_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_preorder_by_id(_order_id uuid)
 RETURNS TABLE(first_name text, tshirt_size text, tshirt_color text, delivery_method text, amount_paid numeric, payment_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.first_name,
    p.tshirt_size,
    p.tshirt_color,
    p.delivery_method,
    p.amount_paid,
    p.payment_status
  FROM public.preorders p
  WHERE p.id = _order_id
    AND p.created_at > now() - interval '24 hours'
  LIMIT 1;
$function$;