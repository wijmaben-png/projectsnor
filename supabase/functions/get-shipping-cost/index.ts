import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { priceItems } from "../_shared/merch-catalog.ts";
import { shippingQuote } from "../_shared/shipping-quote.ts";

const BodySchema = z.object({
  items: z.array(z.object({ product_model: z.string(), tshirt_size: z.string(), tshirt_color: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(100),
  postal_code: z.string().trim().max(20).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Kies geldige artikelen voor verzending." }, 400);
    let items;
    try { items = priceItems(parsed.data.items); }
    catch { return json({ error: "Kies geldige artikelen voor verzending." }, 400); }
    const quote = await shippingQuote(items, parsed.data.postal_code);
    return json({ shipping_cost: quote.cost, currency: "EUR", method: quote.option.name, parcel_kind: quote.parcel.kind, weight_grams: quote.parcel.grams });
  } catch {
    return json({ error: "Verzendkosten zijn tijdelijk niet beschikbaar. Probeer het later opnieuw of kies ophalen." }, 503);
  }
});
