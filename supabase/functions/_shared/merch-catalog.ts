export const ORDERS_OPEN = false;
export const COLOR_LABELS: Record<string, string> = { black: "Zwart", white: "Wit", blue: "Blauw", bone: "Bone", none: "" };

type Product = { id: string; type: "shirt" | "longsleeve" | "cap"; label: string; price: number | null; available: boolean; sizes: readonly string[]; colors: readonly string[] };

const LONG_SIZES = ["S", "M", "L", "XL"] as const;

export const MERCH_PRODUCTS: readonly Product[] = [
  { id: "shirt", type: "shirt", label: "Shirt", price: 32.99, available: false, sizes: LONG_SIZES, colors: ["black", "white"] },
  { id: "snorrig-hart", type: "longsleeve", label: "Snorrig Hart", price: 44.99, available: true, sizes: LONG_SIZES, colors: ["black", "white"] },
  { id: "snorrig-walking-tee", type: "longsleeve", label: "Snorrig Walking Tee", price: 44.99, available: true, sizes: LONG_SIZES, colors: ["black", "white"] },
  { id: "pet-og", type: "cap", label: "Pet OG", price: 34.99, available: true, sizes: ["ONE"], colors: ["none"] },
  { id: "pet-ps", type: "cap", label: "Pet PS", price: 34.99, available: true, sizes: ["ONE"], colors: ["bone"] },
];

export type MerchModel = string;
export type CartItem = { product_model: string; tshirt_size: string; tshirt_color: string; quantity: number };
export type OrderItem = CartItem & { product_type: string; product_name: string; unit_price: number };

export function variantLabel(item: { tshirt_size: string; tshirt_color: string }) {
  return [item.tshirt_size === "ONE" ? "One size" : item.tshirt_size, COLOR_LABELS[item.tshirt_color] ?? item.tshirt_color].filter(Boolean).join(" · ");
}

export function priceItems(items: CartItem[]): OrderItem[] {
  if (items.length === 0) throw new Error("Kies ten minste één artikel.");
  return items.map((item) => {
    const product = MERCH_PRODUCTS.find((p) => p.id === item.product_model);
    if (!product || !product.available || product.price === null) throw new Error("Dit product is nog niet beschikbaar.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error("Ongeldig aantal.");
    if (!product.sizes.includes(item.tshirt_size) || !product.colors.includes(item.tshirt_color)) throw new Error("Kies een geldige maat en kleur.");
    return { ...item, product_type: product.type, product_name: product.label, unit_price: product.price };
  });
}

export function itemSubtotal(items: OrderItem[]) {
  return Math.round(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 100) / 100;
}

export function orderItems(order: { order_items?: unknown; product_type?: string; tshirt_size: string; tshirt_color: string }): OrderItem[] {
  if (Array.isArray(order.order_items) && order.order_items.length) return order.order_items as OrderItem[];
  const model = order.product_type === "cap" ? "pet-og" : order.product_type === "longsleeve" ? "snorrig-hart" : "shirt";
  const product = MERCH_PRODUCTS.find((p) => p.id === model);
  return [{ product_model: model, product_type: product?.type ?? "shirt", product_name: product?.label ?? "Shirt", tshirt_size: order.tshirt_size, tshirt_color: order.tshirt_color, quantity: 1, unit_price: product?.price ?? 0 }];
}

export function matchesItems(items: OrderItem[], type: string, model: string, color: string) {
  return items.some((item) => (type === "all" || item.product_type === type) && (model === "all" || item.product_model === model) && (color === "all" || item.tshirt_color === color));
}

export function groupCustomers<T extends { email: string }>(orders: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const order of orders) {
    const key = order.email.trim().toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(order);
    groups.set(key, group);
  }
  return [...groups.values()];
}
