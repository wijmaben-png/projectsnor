const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  preorder_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tshirt_size: string;
  tshirt_color: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = (await req.json()) as Payload;
    const { first_name, last_name, email, tshirt_size, tshirt_color } = body;

    if (!email || !first_name || !last_name || !tshirt_size || !tshirt_color) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fullName = `${first_name} ${last_name}`;
    const colorLabel = tshirt_color === "black" ? "Zwart" : tshirt_color === "white" ? "Wit" : tshirt_color;

    const html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; background:#fff; color:#000; padding:32px;">
        <h1 style="font-size:32px; font-style:italic; margin:0 0 24px;">Project Snor</h1>
        <p style="font-size:18px; margin:0 0 16px;">Bedankt voor je bestelling, ${fullName}!</p>
        <p style="margin:0 0 16px;">We hebben je pre-order ontvangen voor:</p>
        <ul style="margin:0 0 24px; padding-left:20px;">
          <li><strong>T-shirtmaat:</strong> ${tshirt_size}</li>
          <li><strong>Kleur:</strong> ${colorLabel}</li>
          <li><strong>Prijs:</strong> €27.99</li>
        </ul>
        <p style="margin:0 0 16px;">We nemen snel contact met je op met betalings- en verzendinformatie.</p>
        <p style="margin:0 0 24px;">Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation. Bedankt voor je steun!</p>
        <p style="font-size:12px; color:#666; margin:32px 0 0;">— Project Snor</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Project Snor <onboarding@resend.dev>",
        to: [email],
        subject: "Bedankt voor je Project Snor bestelling",
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-preorder-confirmation error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
