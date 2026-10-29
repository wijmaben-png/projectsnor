import { describe, expect, it } from "vitest";
import { summarizeOrders } from "../lib/order-summary";
import { priceItems } from "../../supabase/functions/_shared/merch-catalog";

const items = priceItems([
  { product_model: "snorrig-hart", tshirt_size: "M", tshirt_color: "black", quantity: 2 },
  { product_model: "pet-og", tshirt_size: "ONE", tshirt_color: "none", quantity: 1 },
]);
const order = { id: "one", payment_status: "paid", tshirt_size: "M", tshirt_color: "black", order_items: items };
describe("product quantities", () => {
  it("counts two shirts as two units but one order and keeps the companion cap", () => {
    const rows = summarizeOrders([order]);
    expect(rows.find((r) => r.model === "snorrig-hart" && r.color === "black")).toMatchObject({ paidUnits: 2, paidOrders: 1, sizes: { M: 2 } });
    expect(rows.find((r) => r.model === "pet-og")).toMatchObject({ paidUnits: 1, paidOrders: 1 });
  });
  it("separates unpaid units and excludes unsuccessful payments", () => {
    const rows = summarizeOrders([order, { ...order, id: "two", payment_status: "open" }, ...["expired", "failed", "canceled"].map((payment_status) => ({ ...order, payment_status }))]);
    expect(rows.find((r) => r.model === "snorrig-hart" && r.color === "black")).toMatchObject({ paidUnits: 2, unpaidUnits: 2, paidOrders: 1 });
  });
  it("filters the matching model and color without counting companion products", () => {
    expect(summarizeOrders([order], "longsleeve", "snorrig-hart", "black")).toEqual([expect.objectContaining({ paidUnits: 2, color: "black" })]);
    expect(order.order_items).toHaveLength(2);
  });
});