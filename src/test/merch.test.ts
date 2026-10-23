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
  it("distinguishes all requested models", () => {
    expect(MERCH_PRODUCTS.map((p) => p.id)).toEqual(["shirt", "snorrig-hart", "snorrig-walking-tee", "pet-og", "pet-ps"]);
  });
  it("groups a person's separate orders without merging other people", () => {
    const groups = groupCustomers([{ email: "a@example.test", id: 1 }, { email: "A@example.test", id: 2 }, { email: "b@example.test", id: 3 }]);
    expect(groups.map((g) => g.map((o) => o.id))).toEqual([[1, 2], [3]]);
  });
  it("filters by the model and variant of the same article", () => {
    const items = priceItems([{ product_model: "snorrig-hart", tshirt_size: "M", tshirt_color: "black", quantity: 1 }, { product_model: "pet-og", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 }]);
    expect(matchesItems(items, "cap", "pet-og", "all")).toBe(true);
    expect(matchesItems(items, "cap", "pet-og", "black")).toBe(false);
    expect(matchesItems(items, "longsleeve", "snorrig-walking-tee", "all")).toBe(false);
  });
  it("does not sell products awaiting photos and prices", () => {
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 }])).toThrow();
    expect(() => priceItems([{ product_model: "snorrig-walking-tee", tshirt_size: "L", tshirt_color: "black", quantity: 1 }])).toThrow();
  });
});