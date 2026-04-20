import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!MOLLIE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Env not configured");
    }

    // Mollie sends application/x-www-form-urlencoded with field "id"
    const contentType = req.headers.get("content-type") || "";
    let paymentId: string | null = null;
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      paymentId = String(form.get("id") || "");
    } else {
      try {
        const j = await req.json();
        paymentId = j.id;
      } catch {
        const text = await req.text();
        const params = new URLSearchParams(text);
        paymentId = params.get("id");
      }
    }

    if (!paymentId) {
      return new Response("missing id", { status: 400, headers: corsHeaders });
    }

    // Fetch the payment from Mollie to get authoritative status
    const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` },
    });
    const payment = await mollieRes.json();
    if (!mollieRes.ok) {
      console.error("Mollie fetch error:", payment);
      return new Response("mollie error", { status: 502, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const status: string = payment.status; // paid, failed, canceled, expired, open, pending
    const preorderId = payment.metadata?.preorder_id;

    let dbStatus = "pending";
    if (status === "paid") dbStatus = "paid";
    else if (status === "failed") dbStatus = "failed";
    else if (status === "canceled") dbStatus = "canceled";
    else if (status === "expired") dbStatus = "expired";

    // Get current row
    const query = supabase.from("preorders").select("*").limit(1);
    const { data: rows } = preorderId
      ? await query.eq("id", preorderId)
      : await query.eq("mollie_payment_id", paymentId);
    const row = rows?.[0];

    if (!row) {
      console.warn("No preorder found for payment", paymentId);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const wasPaid = row.payment_status === "paid";

    await supabase
      .from("preorders")
      .update({ payment_status: dbStatus })
      .eq("id", row.id);

    // On first paid transition, send confirmation email
    if (dbStatus === "paid" && !wasPaid) {
      try {
        const INTERNAL_FUNCTION_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
        await supabase.functions.invoke("send-preorder-confirmation", {
          headers: { "x-internal-secret": INTERNAL_FUNCTION_SECRET },
          body: {
            preorder_id: row.id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            tshirt_size: row.tshirt_size,
            tshirt_color: row.tshirt_color,
            delivery_method: row.delivery_method,
            amount_paid: row.amount_paid,
            street: row.street,
            postal_code: row.postal_code,
            city: row.city,
          },
        });
      } catch (e) {
        console.error("confirmation email failed:", e);
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("mollie-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
