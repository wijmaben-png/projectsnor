import { MERCH_PRODUCTS, matchesItems, orderItems, type OrderItem } from "../../supabase/functions/_shared/merch-catalog";

type SummaryOrder = { id: string; payment_status: string; tshirt_size: string; tshirt_color: string; product_type?: string; order_items?: OrderItem[] };
export type ProductSummary = { model: string; name: string; color: string; sizes: Record<string, number>; paidUnits: number; unpaidUnits: number; paidOrders: number };

export function summarizeOrders(orders: SummaryOrder[], type = "all", model = "all", color = "all"): ProductSummary[] {
  const rows = new Map<string, ProductSummary & { orderIds: Set<string> }>();
  for (const product of MERCH_PRODUCTS.filter((p) => p.available)) {
    for (const variant of product.colors) {
      if (!matchesItems([{ product_type: product.type, product_model: product.id, tshirt_color: variant } as OrderItem], type, model, color)) continue;
      rows.set(`${product.id}:${variant}`, { model: product.id, name: product.label, color: variant, sizes: {}, paidUnits: 0, unpaidUnits: 0, paidOrders: 0, orderIds: new Set() });
    }
  }
  for (const order of orders) {
    if (["expired", "failed", "canceled"].includes(order.payment_status)) continue;
    for (const item of orderItems(order)) {
      if (!matchesItems([item], type, model, color)) continue;
      const key = `${item.product_model}:${item.tshirt_color}`;
      const row = rows.get(key) ?? { model: item.product_model, name: item.product_name, color: item.tshirt_color, sizes: {}, paidUnits: 0, unpaidUnits: 0, paidOrders: 0, orderIds: new Set<string>() };
      if (order.payment_status === "paid") {
        row.paidUnits += item.quantity;
        row.sizes[item.tshirt_size] = (row.sizes[item.tshirt_size] ?? 0) + item.quantity;
        row.orderIds.add(order.id);
        row.paidOrders = row.orderIds.size;
      } else row.unpaidUnits += item.quantity;
      rows.set(key, row);
    }
  }
  return [...rows.values()].map(({ orderIds, ...row }) => row);
}