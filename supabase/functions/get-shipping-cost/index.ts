const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetches the cheapest available NL shipping rate from Sendcloud for a 0.3kg parcel.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SENDCLOUD_PUBLIC_KEY = Deno.env.get("SENDCLOUD_PUBLIC_KEY");
    const SENDCLOUD_SECRET_KEY = Deno.env.get("SENDCLOUD_SECRET_KEY");
    if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
      throw new Error("Sendcloud env missing");
    }

    console.log(
      `Sendcloud creds present. public.length=${SENDCLOUD_PUBLIC_KEY.length}, secret.length=${SENDCLOUD_SECRET_KEY.length}, public.first8=${SENDCLOUD_PUBLIC_KEY.slice(0, 8)}`,
    );

    const auth = "Basic " + btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);
    const url = "https://panel.sendcloud.sc/api/v2/shipping_methods?to_country=NL";

    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "User-Agent": "ProjectSnor/1.0",
      },
    });
    const text = await res.text();
    console.log(`Sendcloud status=${res.status}, body.length=${text.length}, body.first200=${text.slice(0, 200)}`);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ shipping_cost: 4.5, currency: "EUR", fallback: true, debug_status: res.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let data: { shipping_methods?: Array<Record<string, unknown>> } = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }

    const methods = (data.shipping_methods ?? []) as Array<{
      name?: string; carrier?: string; min_weight?: string; max_weight?: string;
      countries?: Array<{ iso_2?: string; price?: number | string }>;
    }>;

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

    console.log(`Scanned ${methods.length} methods, cheapest=${cheapest} (${cheapestName})`);

    if (cheapest === null) {
      return new Response(
        JSON.stringify({ shipping_cost: 4.5, currency: "EUR", fallback: true, methods_count: methods.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const shipping_cost = Math.round(cheapest * 100) / 100;
    return new Response(
      JSON.stringify({ shipping_cost, currency: "EUR", method: cheapestName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("get-shipping-cost error:", msg);
    return new Response(
      JSON.stringify({ shipping_cost: 4.5, currency: "EUR", fallback: true, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
