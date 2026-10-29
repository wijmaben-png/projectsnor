import { shippingParcel, chooseShippingOption } from "./shipping.ts";
type ShippingItem = { product_type: string; quantity: number };

export async function shippingQuote(items: ShippingItem[], postalCode?: string | null) {
  const publicKey = Deno.env.get("SENDCLOUD_PUBLIC_KEY");
  const secretKey = Deno.env.get("SENDCLOUD_SECRET_KEY");
  if (!publicKey || !secretKey) throw new Error("Verzendkosten zijn tijdelijk niet beschikbaar.");
  const parcel = shippingParcel(items);
  const res = await fetch("https://panel.sendcloud.sc/api/v3/shipping-options", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${publicKey}:${secretKey}`), "Content-Type": "application/json" },
    body: JSON.stringify({
      from_address: { country_code: "NL" },
      to_address: { country_code: "NL", ...(postalCode ? { postal_code: postalCode.replace(/\s/g, "").toUpperCase() } : {}) },
      carrier_code: "postnl",
      parcels: [{ weight: parcel.weight, dimensions: parcel.dimensions }],
      calculate_quotes: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.error("Sendcloud quote status:", res.status);
    throw new Error("Verzendkosten zijn tijdelijk niet beschikbaar. Probeer het later opnieuw of kies ophalen.");
  }
  const data = await res.json();
  const options = Array.isArray(data.data) ? data.data : [];
  let selected;
  try { selected = chooseShippingOption(options, parcel.kind); }
  catch (error) {
    console.error("No matching shipping quote:", JSON.stringify({ kind: parcel.kind, options: options.map((o: { code?: string; name?: string; functionalities?: unknown; quotes?: unknown; quote_error?: unknown }) => ({ code: o.code, name: o.name, functionalities: o.functionalities, quotes: o.quotes, quote_error: o.quote_error })) }));
    throw error;
  }
  return { ...selected, parcel };
}