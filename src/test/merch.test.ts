import { describe, expect, it } from "vitest";
import { ORDERS_OPEN, MERCH_PRODUCTS, priceItems, itemSubtotal, orderPricing, groupCustomers, matchesItems } from "../../supabase/functions/_shared/merch-catalog";

describe("merch orders", () => {
  it("temporarily opens ordering for the customer's payment test", () => {
    expect(ORDERS_OPEN).toBe(true);
  });
  it("keeps longsleeve and cap together in one order", () => {
    const items = priceItems([
      { product_model: "snorrig-hart", tshirt_size: "L", tshirt_color: "white", quantity: 1 },
      { product_model: "pet-og", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 },
    ]);
    expect(items.map((i) => i.product_name)).toEqual(["Snorrig Hart", "Pet OG"]);
    expect(itemSubtotal(items)).toBe(79.98);
  });
  it.each([ ["snorrig-hart", 44.99], ["snorrig-walking-tee", 44.99], ["pet-og", 34.99], ["pet-ps", 34.99] ] as const)("restores %s to %s euros", (id, expectedPrice) => {
    const product = MERCH_PRODUCTS.find((p) => p.id === id);
    if (!product) throw new Error("Missing product");
    expect(priceItems([{ product_model: id, tshirt_size: product.sizes[0], tshirt_color: product.colors[0], quantity: 2 }])[0].unit_price).toBe(expectedPrice);
  });
  it("discounts the entire product subtotal by ten percent, rounded to cents", () => {
    expect(orderPricing(124.97, true)).toEqual({ discount: 12.5, products: 112.47, total: 112.47 });
  });
  it("never discounts shipping costs", () => {
    expect(orderPricing(124.97, true, 4.5)).toEqual({ discount: 12.5, products: 112.47, total: 116.97 });
  });
  it("does not discount products without a validated code", () => {
    expect(orderPricing(124.97, false, 4.5)).toEqual({ discount: 0, products: 124.97, total: 129.47 });
  });
  it("sells Pet PS only in bone or black, not blue", () => {
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 }])).toThrow();
    expect(priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "black", quantity: 1 }])[0].tshirt_color).toBe("black");
    expect(() => priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "blue", quantity: 1 }])).toThrow();
  });
  it("preserves black Pet PS order snapshots with one size and the cap price", () => {
    expect(priceItems([{ product_model: "pet-ps", tshirt_size: "ONE", tshirt_color: "black", quantity: 2 }])).toEqual([
      { product_model: "pet-ps", product_type: "cap", product_name: "Pet PS", tshirt_size: "ONE", tshirt_color: "black", quantity: 2, unit_price: 34.99 },
    ]);
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
    expect(matchesItems(items, "cap", "pet-ps", "bone")).toBe(true);
    expect(matchesItems(items, "cap", "pet-ps", "black")).toBe(false);
  });
});
