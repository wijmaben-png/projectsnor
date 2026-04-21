import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  preorder_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SENDCLOUD_PUBLIC_KEY = Deno.env.get("SENDCLOUD_PUBLIC_KEY");
    const SENDCLOUD_SECRET_KEY = Deno.env.get("SENDCLOUD_SECRET_KEY");
    const SENDCLOUD_SENDER_ADDRESS_ID = Deno.env.get("SENDCLOUD_SENDER_ADDRESS_ID");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase env missing");
    }
    if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
      throw new Error("Sendcloud env missing");
    }
    if (!SENDCLOUD_SENDER_ADDRESS_ID) {
      throw new Error("SENDCLOUD_SENDER_ADDRESS_ID env missing");
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await userClient
      .from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: preorder, error: fetchErr } = await admin
      .from("preorders").select("*").eq("id", parsed.data.preorder_id).single();
    if (fetchErr || !preorder) throw new Error("preorder not found");

    if (preorder.delivery_method !== "shipping") {
      return new Response(JSON.stringify({ error: "not a shipping order" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (preorder.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "payment not confirmed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (preorder.sendcloud_parcel_id) {
      return new Response(JSON.stringify({ error: "label already created", parcel_id: preorder.sendcloud_parcel_id }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = "Basic " + btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);

    // Sendcloud API v3: create shipment
    const shipmentPayload = {
      shipments: [
        {
          name: `${preorder.first_name} ${preorder.last_name}`,
          company_name: "",
          address_line_1: preorder.street,
          house_number: "",
          postal_code: preorder.postal_code,
          city: preorder.city,
          country_code: "NL",
          email: preorder.email,
          telephone: preorder.phone,
          parcel_items: [
            {
              description: "Project Snor T-shirt",
              quantity: 1,
              weight: "0.300",
              value: "32.99",
              hs_code: "6109",
              origin_country: "NL",
            },
          ],
          weight: "0.300",
          sender_address_id: Number(SENDCLOUD_SENDER_ADDRESS_ID),
          order_number: preorder.id,
          external_reference: preorder.id,
        },
      ],
    };

    console.log("Sendcloud v3 request payload:", JSON.stringify(shipmentPayload, null, 2));

    const scRes = await fetch("https://panel.sendcloud.sc/api/v3/shipments", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(shipmentPayload),
    });

    const scData = await scRes.json();
    console.log("Sendcloud v3 response status:", scRes.status);
    console.log("Sendcloud v3 response body:", JSON.stringify(scData, null, 2));

    if (!scRes.ok) {
      console.error("Sendcloud v3 error:", JSON.stringify(scData));
      return new Response(JSON.stringify({ error: "sendcloud_error", details: scData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse v3 response: data is an array of shipment objects
    const shipments = scData.data ?? scData;
    const shipment = Array.isArray(shipments) ? shipments[0] : shipments;

    const parcelId = String(shipment?.id ?? "");
    const trackingNumber = shipment?.tracking_number || null;
    const trackingUrl = shipment?.tracking_url || null;
    const labelUrl = shipment?.label?.normal_printer || shipment?.label_url || null;

    console.log("Parsed shipment:", { parcelId, trackingNumber, trackingUrl, labelUrl });

    await admin.from("preorders").update({
      sendcloud_parcel_id: parcelId,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      label_created_at: new Date().toISOString(),
    }).eq("id", preorder.id);

    // Send tracking email (best-effort)
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY && trackingNumber) {
        const html = `
          <div style="font-family: Georgia, serif; padding:24px; color:#000;">
            <h1 style="font-style:italic;">Project Snor</h1>
            <p>Hoi ${preorder.first_name},</p>
            <p>Goed nieuws — je shirt is onderweg!</p>
            <p><strong>Trackingnummer:</strong> ${trackingNumber}</p>
            ${trackingUrl ? `<p><a href="${trackingUrl}">Volg je pakket</a></p>` : ""}
            <p>— Project Snor</p>
          </div>
        `;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Project Snor <onboarding@resend.dev>",
            to: [preorder.email],
            subject: "Je Project Snor shirt is onderweg",
            html,
          }),
        });
      }
    } catch (e) {
      console.error("tracking email failed:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      parcel_id: parcelId,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      label_url: labelUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("create-sendcloud-shipment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
