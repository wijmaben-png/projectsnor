import { describe, expect, it } from "vitest";
import { MERCH_PRODUCTS, priceItems, itemSubtotal, groupCustomers, matchesItems } from "../../supabase/functions/_shared/merch-catalog";

describe("merch orders", () => {
  it("keeps longsleeve and cap together in one order", () => {
    const items = priceItems([
      { product_model: "snorrig-hart", tshirt_size: "L", tshirt_color: "white", quantity: 1 },
      { product_model: "pet-og", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 },
    ]);
    expect(items.map((i) => i.product_name)).toEqual(["Snorrig Hart", "Pet OG"]);
    expect(itemSubtotal(items)).toBe(79.98);
  });
  it("prices Walking Tee at 44.99 and Pet PS at 34.99", () => {
    expect(priceItems([{ product_model: "snorrig-walking-tee", tshirt_size: "M", tshirt_color: "black", quantity: 1 }])[0].unit_price).toBe(44.99);
    expect(priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "bone", quantity: 1 }])[0].unit_price).toBe(34.99);
  });
  it("requires Pet PS colour blue or bone", () => {
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 }])).toThrow();
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "black", quantity: 1 }])).toThrow();
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "blue", quantity: 1 }])).toThrow();
  });
  it("no longer sells the short-sleeve shirt", () => {
    expect(() => priceItems([{ product_model: "shirt", tshirt_size: "M", tshirt_color: "black", quantity: 1 }])).toThrow();
    expect(MERCH_PRODUCTS.filter((p) => p.available).map((p) => p.id)).toEqual(["snorrig-hart", "snorrig-walking-tee", "pet-og", "pet-ps"]);
  });
  it("groups a person's separate orders without merging other people", () => {
    const groups = groupCustomers([{ email: "a@example.test", id: 1 }, { email: "A@example.test", id: 2 }, { email: "b@example.test", id: 3 }]);
    expect(groups.map((g) => g.map((o) => o.id))).toEqual([[1, 2], [3]]);
  });
  it("filters by the model and variant of the same article", () => {
    const items = priceItems([{ product_model: "snorrig-hart", tshirt_size: "M", tshirt_color: "black", quantity: 1 }, { product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "bone", quantity: 1 }]);
    expect(matchesItems(items, "cap", "pet-ps", "blue")).toBe(true);
    expect(matchesItems(items, "cap", "pet-ps", "bone")).toBe(false);
  });
});
