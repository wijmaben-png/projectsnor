import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_DEFAULT = 32.99;
const PRICE_DISCOUNTED = 29.99;

const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  tshirt_size: z.enum(["S", "M", "L", "XL"]),
  tshirt_color: z.enum(["black", "white"]),
  delivery_method: z.enum(["pickup", "shipping"]),
  street: z.string().trim().max(200).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  discount_code: z.string().trim().max(100).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY");
    const DISCOUNT_CODE = Deno.env.get("DISCOUNT_CODE");
    const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MOLLIE_API_KEY) throw new Error("MOLLIE_API_KEY not configured");
    if (!PUBLIC_SITE_URL) throw new Error("PUBLIC_SITE_URL not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env not configured");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = parsed.data;

    if (data.delivery_method === "shipping") {
      if (!data.street || !data.postal_code || !data.city) {
        return new Response(
          JSON.stringify({ error: "Address required for shipping" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Discount code validation (server-side)
    let discountValid = false;
    if (data.discount_code && data.discount_code.length > 0) {
      if (DISCOUNT_CODE && data.discount_code.trim().toLowerCase() === DISCOUNT_CODE.trim().toLowerCase()) {
        discountValid = true;
      } else {
        return new Response(
          JSON.stringify({ error: "invalid_discount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const shirtPrice = discountValid ? PRICE_DISCOUNTED : PRICE_DEFAULT;

    // Fetch live shipping cost from Sendcloud when shipping
    let shippingCost = 0;
    if (data.delivery_method === "shipping") {
      const SENDCLOUD_PUBLIC_KEY = Deno.env.get("SENDCLOUD_PUBLIC_KEY");
      const SENDCLOUD_SECRET_KEY = Deno.env.get("SENDCLOUD_SECRET_KEY");
      if (SENDCLOUD_PUBLIC_KEY && SENDCLOUD_SECRET_KEY) {
        try {
          const auth = "Basic " + btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);
          const scRes = await fetch(
            "https://panel.sendcloud.sc/api/v2/shipping_methods?to_country=NL",
            { headers: { Authorization: auth, "Content-Type": "application/json" } },
          );
          const scData = await scRes.json();
          if (scRes.ok) {
            const weight = 0.3;
            let cheapest: number | null = null;
            for (const m of (scData.shipping_methods ?? []) as Array<{
              min_weight?: string; max_weight?: string;
              countries?: Array<{ iso_2?: string; price?: number }>;
            }>) {
              const min = parseFloat(m.min_weight ?? "0");
              const max = parseFloat(m.max_weight ?? "999");
              if (weight < min || weight > max) continue;
              const nl = m.countries?.find((c) => c.iso_2 === "NL");
              if (!nl || typeof nl.price !== "number" || nl.price <= 0) continue;
              if (cheapest === null || nl.price < cheapest) cheapest = nl.price;
            }
            shippingCost = cheapest !== null ? Math.round(cheapest * 100) / 100 : 4.5;
          } else {
            console.error("Sendcloud rate lookup failed:", scData);
            shippingCost = 4.5;
          }
        } catch (e) {
          console.error("Sendcloud rate lookup error:", e);
          shippingCost = 4.5;
        }
      } else {
        shippingCost = 4.5;
      }
    }

    const amount = Math.round((shirtPrice + shippingCost) * 100) / 100;
    const amountStr = amount.toFixed(2);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insert pending preorder
    const { data: preorder, error: insertError } = await supabase
      .from("preorders")
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        tshirt_size: data.tshirt_size,
        tshirt_color: data.tshirt_color,
        delivery_method: data.delivery_method,
        street: data.delivery_method === "shipping" ? data.street : null,
        postal_code: data.delivery_method === "shipping" ? data.postal_code : null,
        city: data.delivery_method === "shipping" ? data.city : null,
        discount_code_used: discountValid,
        amount_paid: amount,
        shipping_cost: shippingCost,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !preorder) {
      console.error("Preorder insert error:", insertError);
      throw new Error("Failed to create preorder");
    }

    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/mollie-webhook`;
    const redirectUrl = `${PUBLIC_SITE_URL.replace(/\/$/, "")}/?order=${preorder.id}`;

    const molliePayload = {
      amount: { currency: "EUR", value: amountStr },
      description: `Project Snor t-shirt (${data.tshirt_size}, ${data.tshirt_color})`,
      redirectUrl,
      webhookUrl,
      metadata: { preorder_id: preorder.id },
      method: ["ideal", "bancontact", "creditcard"],
    };

    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(molliePayload),
    });

    const mollieData = await mollieRes.json();
    if (!mollieRes.ok) {
      console.error("Mollie error:", mollieData);
      // Mark preorder as failed
      await supabase
        .from("preorders")
        .update({ payment_status: "failed" })
        .eq("id", preorder.id);
      return new Response(
        JSON.stringify({ error: "mollie_error", details: mollieData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("preorders")
      .update({ mollie_payment_id: mollieData.id })
      .eq("id", preorder.id);

    return new Response(
      JSON.stringify({
        checkout_url: mollieData._links?.checkout?.href,
        payment_id: mollieData.id,
        preorder_id: preorder.id,
        amount: amountStr,
        shipping_cost: shippingCost,
        discount_applied: discountValid,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("create-mollie-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
