type ShippingItem = { product_type: string; quantity: number };

// Provisional packing allowance and outer dimensions; replace after measuring packed orders.
export const PACKAGING_GRAMS = 100;
export function shippingParcel(items: ShippingItem[]) {
  if (!items.length) throw new Error("Voeg eerst een artikel toe.");
  let grams = PACKAGING_GRAMS;
  let longsleeves = 0;
  let caps = 0;
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("Ongeldig aantal.");
    if (item.product_type === "longsleeve" || item.product_type === "shirt") {
      longsleeves += item.quantity;
      grams += item.quantity * 200;
    } else if (item.product_type === "cap") {
      caps += item.quantity;
      grams += item.quantity * 100;
    } else throw new Error("Onbekend product voor verzending.");
  }
  const mailbox = longsleeves === 1 && caps === 0;
  return {
    kind: mailbox ? "mailbox" as const : "parcel" as const,
    grams,
    weight: { value: (grams / 1000).toFixed(3), unit: "kg" },
    dimensions: mailbox
      ? { length: "25", width: "20", height: "3", unit: "cm" }
      : { length: "40", width: "30", height: String(Math.max(15, Math.ceil(longsleeves / 2) * 3 + caps * 3)), unit: "cm" },
  };
}

export type ShippingOption = {
  code: string; name?: string; product?: { name?: string; code?: string };
  functionalities?: { form_factor?: string; last_mile?: string; returns?: boolean };
  contract?: { id?: number }; quote_error?: unknown;
  quotes?: { price?: { total?: { value?: string; currency?: string } } }[];
};

export function chooseShippingOption(options: ShippingOption[], kind: "mailbox" | "parcel") {
  const candidates = options.flatMap((option) => {
    const name = `${option.code} ${option.name ?? ""} ${option.product?.name ?? ""}`.toLowerCase();
    const mailbox = /brievenbus|mailbox|letterbox/.test(name) || option.functionalities?.form_factor === "letter";
    if (mailbox !== (kind === "mailbox") || option.functionalities?.returns || option.quote_error) return [];
    if (option.functionalities?.last_mile !== "home_delivery") return [];
    if (kind === "parcel" && option.functionalities?.form_factor !== "parcel") return [];
    const prices = (option.quotes ?? []).flatMap((quote) => {
      const total = quote.price?.total;
      const amount = Number(total?.value);
      return total?.currency === "EUR" && Number.isFinite(amount) && amount > 0 ? [amount] : [];
    });
    if (!prices.length || !option.code) return [];
    return [{ option, cost: Math.round(Math.min(...prices) * 100) / 100 }];
  }).sort((a, b) => a.cost - b.cost || a.option.code.localeCompare(b.option.code));
  const selected = candidates[0];
  if (!selected) throw new Error("Verzendkosten zijn tijdelijk niet beschikbaar. Probeer het later opnieuw of kies ophalen.");
  return selected;
}

