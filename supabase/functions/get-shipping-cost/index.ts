const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetches the cheapest available NL shipping rate from Sendcloud for a 0.3kg parcel.
// Public endpoint (no auth) so the form can show the price before checkout.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SENDCLOUD_PUBLIC_KEY = Deno.env.get("SENDCLOUD_PUBLIC_KEY");
    const SENDCLOUD_SECRET_KEY = Deno.env.get("SENDCLOUD_SECRET_KEY");
    if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
      throw new Error("Sendcloud env missing");
    }

    const auth = "Basic " + btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);

    // Get shipping methods available for NL, weight 0.3kg
    const url = "https://panel.sendcloud.sc/api/v2/shipping_methods?to_country=NL";
    const res = await fetch(url, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Sendcloud shipping_methods error:", data);
      // Graceful fallback so the customer-facing form always has a price.
      return new Response(
        JSON.stringify({ shipping_cost: 4.5, currency: "EUR", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const methods: Array<{
      name?: string;
      carrier?: string;
      min_weight?: string;
      max_weight?: string;
      countries?: Array<{ iso_2?: string; price?: number | string }>;
    }> = data.shipping_methods ?? [];

    const weight = 0.3;
    let cheapest: number | null = null;
    let cheapestName: string | null = null;

    for (const m of methods) {
      const min = parseFloat(m.min_weight ?? "0");
      const max = parseFloat(m.max_weight ?? "999");
      if (weight < min || weight > max) continue;
      const nl = m.countries?.find((c) => c.iso_2 === "NL");
      if (!nl) continue;
      const price = typeof nl.price === "string" ? parseFloat(nl.price) : nl.price;
      if (typeof price !== "number" || isNaN(price) || price <= 0) continue;
      if (cheapest === null || price < cheapest) {
        cheapest = price;
        cheapestName = `${m.carrier ?? ""} ${m.name ?? ""}`.trim();
      }
    }

    console.log(`get-shipping-cost: scanned ${methods.length} methods, cheapest=${cheapest} (${cheapestName})`);

    if (cheapest === null) {
      console.warn("get-shipping-cost: no usable rate found, using fallback 4.5");
      cheapest = 4.5;
    }

    // Round to 2 decimals
    const shipping_cost = Math.round(cheapest * 100) / 100;

    return new Response(
      JSON.stringify({ shipping_cost, currency: "EUR" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("get-shipping-cost error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
