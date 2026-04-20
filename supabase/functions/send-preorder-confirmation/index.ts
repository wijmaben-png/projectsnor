const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  preorder_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  tshirt_size: string;
  tshirt_color: string;
  delivery_method?: string;
  amount_paid?: number;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const INTERNAL_FUNCTION_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    const providedSecret = req.headers.get("x-internal-secret");
    if (!INTERNAL_FUNCTION_SECRET || providedSecret !== INTERNAL_FUNCTION_SECRET) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = (await req.json()) as Payload;
    const {
      first_name, last_name, email, tshirt_size, tshirt_color,
      delivery_method, amount_paid, street, postal_code, city,
    } = body;

    if (!email || !first_name || !last_name || !tshirt_size || !tshirt_color) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const colorLabel = tshirt_color === "black" ? "Zwart" : tshirt_color === "white" ? "Wit" : tshirt_color;
    const priceLabel = typeof amount_paid === "number" ? `€${amount_paid.toFixed(2)}` : "—";
    const isShipping = delivery_method === "shipping";
    const addressLine = isShipping && street
      ? `${street}, ${postal_code ?? ""} ${city ?? ""}`.trim()
      : "";

    const deliveryBlock = isShipping
      ? `<p style="margin:0 0 16px;">Je shirt wordt verzonden naar <strong>${addressLine}</strong>. Je ontvangt zo snel mogelijk een tracking nummer.</p>`
      : `<p style="margin:0 0 16px;">Je shirt kun je ophalen op <strong>29 mei tijdens het Snorrenfeest</strong>. We zien je daar!</p>`;

    const html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; background:#ffffff; color:#000000; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="font-size:32px; font-style:italic; margin:0 0 24px;">Project Snor</h1>
        <p style="font-size:18px; margin:0 0 16px;">Hey ${first_name}!</p>
        <p style="margin:0 0 16px;">Bedankt voor je bestelling bij Project Snor.</p>

        <div style="border:1px solid #000000; padding:16px 20px; margin:24px 0;">
          <p style="margin:0 0 8px; font-style:italic;">Je bestelling</p>
          <ul style="margin:0; padding-left:18px;">
            <li><strong>Maat:</strong> ${tshirt_size}</li>
            <li><strong>Kleur:</strong> ${colorLabel}</li>
            <li><strong>Totaalbedrag:</strong> ${priceLabel}</li>
          </ul>
        </div>

        ${deliveryBlock}

        <p style="margin:24px 0 0;">Groetjes,<br/>het Project Snor team</p>
        <p style="font-size:12px; color:#666; margin:32px 0 0;">Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Project Snor <onboarding@resend.dev>",
        to: [email],
        subject: "Bedankt voor je bestelling bij Project Snor!",
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-preorder-confirmation error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
