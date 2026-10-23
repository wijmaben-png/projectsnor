CREATE TABLE public.order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 preorder_id uuid NOT NULL REFERENCES public.preorders(id) ON DELETE CASCADE,
 product_model text NOT NULL,
 product_type text NOT NULL,
 product_name text NOT NULL,
 tshirt_size text NOT NULL,
 tshirt_color text NOT NULL,
 quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
 unit_price numeric NOT NULL CHECK (unit_price >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX order_items_preorder_idx ON public.order_items(preorder_id);
CREATE INDEX order_items_model_idx ON public.order_items(product_model);
INSERT INTO public.order_items (preorder_id, product_model, product_type, product_name, tshirt_size, tshirt_color, quantity, unit_price)
SELECT id, CASE product_type WHEN 'cap' THEN 'pet-og' WHEN 'longsleeve' THEN 'snorrig-hart' ELSE 'shirt' END, product_type, CASE product_type WHEN 'cap' THEN 'Pet OG' WHEN 'longsleeve' THEN 'Snorrig Hart' ELSE 'Shirt' END, tshirt_size, tshirt_color, 1, GREATEST(COALESCE(amount_paid - COALESCE(shipping_cost,0) + CASE WHEN discount_code_used THEN 3 ELSE 0 END, CASE product_type WHEN 'cap' THEN 34.99 WHEN 'longsleeve' THEN 44.99 ELSE 32.99 END),0) FROM public.preorders;
CREATE OR REPLACE FUNCTION public.get_merch_order(_order_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('first_name',p.first_name,'delivery_method',p.delivery_method,'amount_paid',p.amount_paid,'payment_status',p.payment_status,'order_items',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_model',i.product_model,'product_type',i.product_type,'product_name',i.product_name,'tshirt_size',i.tshirt_size,'tshirt_color',i.tshirt_color,'quantity',i.quantity,'unit_price',i.unit_price) ORDER BY i.created_at,i.id) FROM public.order_items i WHERE i.preorder_id=p.id),'[]'::jsonb)) FROM public.preorders p WHERE p.id=_order_id AND p.created_at > now() - interval '24 hours';
$$;
REVOKE ALL ON FUNCTION public.get_merch_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_merch_order(uuid) TO anon, authenticated, service_role;
COMMENT ON TABLE public.order_items IS 'Merch item snapshots per order; preorders remains the payment and fulfillment header. Legacy product fields on preorders hold the first item for backward compatibility.';