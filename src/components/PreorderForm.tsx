import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MERCH_PRODUCTS, priceItems, itemSubtotal, type CartItem } from "../../supabase/functions/_shared/merch-catalog";
import { Plus, Trash2 } from "lucide-react";

const SIZES = ["S", "M", "L", "XL"] as const;
type Size = (typeof SIZES)[number];

const COLORS = ["black", "white"] as const;
type Color = (typeof COLORS)[number];

const PRODUCTS = MERCH_PRODUCTS.filter((p) => p.available && p.price !== null);
type Product = (typeof PRODUCTS)[number]["id"];

const DISCOUNT_AMOUNT = 3.0;

type Delivery = "pickup" | "shipping";

const baseSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20).regex(/^[+\d\s()-]+$/),
  product_type: z.string(),
  tshirt_size: z.enum(SIZES),
  tshirt_color: z.enum(COLORS),
  delivery_method: z.enum(["pickup", "shipping"]),
  street: z.string().trim().max(200).optional(),
  postal_code: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  discount_code: z.string().trim().max(100).optional(),
});

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  product_type: "" | Product;
  tshirt_size: "" | Size;
  tshirt_color: "" | Color;
  delivery_method: "" | Delivery;
  street: string;
  postal_code: string;
  city: string;
  discount_code: string;
};

const initialState: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  product_type: "",
  tshirt_size: "",
  tshirt_color: "",
  delivery_method: "",
  street: "",
  postal_code: "",
  city: "",
  discount_code: "",
};

type FieldKey = keyof FormState;

export const PreorderForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Set<FieldKey>>(new Set());
  const [showError, setShowError] = useState(false);
  const [discountStatus, setDiscountStatus] = useState<"none" | "checking" | "valid" | "invalid">("none");
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const isCap = PRODUCTS.find((p) => p.id === form.product_type)?.type === "cap";

  // Fetch live shipping cost from Sendcloud when "shipping" is selected
  useEffect(() => {
    if (form.delivery_method !== "shipping") {
      setShippingCost(null);
      return;
    }
    let cancelled = false;
    setShippingLoading(true);
    supabase.functions
      .invoke("get-shipping-cost", { body: {} })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.shipping_cost) {
          setShippingCost(4.5);
        } else {
          setShippingCost(Number(data.shipping_cost));
        }
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => { cancelled = true; };
  }, [form.delivery_method]);

  const product = PRODUCTS.find((p) => p.id === form.product_type);
  const basePrice = cart.length ? itemSubtotal(priceItems(cart)) : 0;
  const productPrice = discountStatus === "valid" && form.discount_code.trim()
    ? Math.max(basePrice - DISCOUNT_AMOUNT, 0)
    : basePrice;
  const effectiveShipping = form.delivery_method === "shipping" ? (shippingCost ?? 0) : 0;
  const orderTotal = Math.round((productPrice + effectiveShipping) * 100) / 100;
  const fmt = (n: number) =>
    n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const updateField = (key: FieldKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "discount_code") setDiscountStatus("none");
    if (errors.has(key) && value.trim() !== "") {
      const next = new Set(errors);
      next.delete(key);
      setErrors(next);
      if (next.size === 0) setShowError(false);
    }
  };

  const requiredFields = (): FieldKey[] => {
    const base: FieldKey[] = [
      "first_name", "last_name", "email", "phone", "delivery_method",
    ];
    if (form.delivery_method === "shipping") {
      base.push("street", "postal_code", "city");
    }
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) {
      toast({ title: "Je winkelmand is leeg", description: "Voeg eerst een artikel toe." });
      return;
    }

    const missing = new Set<FieldKey>();
    requiredFields().forEach((k) => {
      if (!String(form[k]).trim()) missing.add(k);
    });
    if (missing.size > 0) {
      setErrors(missing);
      setShowError(true);
      return;
    }

    const payload = {
      ...form,
      tshirt_size: isCap ? "ONE" : form.tshirt_size,
      tshirt_color: isCap ? "none" : form.tshirt_color,
    };

    const parsed = baseSchema.safeParse({
      ...payload,
      tshirt_size: "S",
      tshirt_color: "black",
    });
    if (!parsed.success) {
      const invalid = new Set<FieldKey>();
      parsed.error.errors.forEach((err) => {
        const path = err.path[0] as FieldKey | undefined;
        if (path) invalid.add(path);
      });
      setErrors(invalid);
      setShowError(true);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-mollie-payment", {
        body: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          items: cart,
          delivery_method: parsed.data.delivery_method,
          street: parsed.data.street || null,
          postal_code: parsed.data.postal_code || null,
          city: parsed.data.city || null,
          discount_code: parsed.data.discount_code || null,
        },
      });

      if (error) {
        // Try to read error context body
        const ctx = (error as { context?: Response }).context;
        let body: { error?: string } | null = null;
        if (ctx && typeof ctx.json === "function") {
          try { body = await ctx.json(); } catch { /* ignore */ }
        }
        if (body?.error === "invalid_discount") {
          setDiscountStatus("invalid");
          setSubmitting(false);
          return;
        }
        throw new Error(error.message);
      }

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("Geen checkout URL ontvangen");
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: "Er ging iets mis",
        description: err instanceof Error ? err.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleApplyDiscount = async () => {
    const code = form.discount_code.trim();
    if (!code) return;
    setDiscountStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("validate-discount", {
        body: { discount_code: code },
      });
      if (error || !data?.valid) {
        setDiscountStatus("invalid");
      } else {
        setDiscountStatus("valid");
      }
    } catch {
      setDiscountStatus("invalid");
    }
  };

  const inputClass = (key: FieldKey) =>
    cn(
      "bg-background text-foreground placeholder:text-muted-foreground rounded-none",
      errors.has(key) ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm uppercase tracking-wide">Product</Label>
        <RadioGroup
          value={form.product_type}
          onValueChange={(v) => updateField("product_type", v)}
          className={cn(
            "flex flex-col gap-2 p-3 border",
            errors.has("product_type") ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
          )}
        >
          {PRODUCTS.map((p) => (
            <label key={p.id} className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2">
                <RadioGroupItem value={p.id} id={`product-${p.id}`} className="rounded-none" />
                <span className="text-sm">{p.label}</span>
              </span>
              <span className="text-sm font-bold">€{fmt(p.price ?? 0)}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-sm uppercase tracking-wide">Voornaam</Label>
          <Input id="first_name" type="text" maxLength={100} value={form.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
            aria-invalid={errors.has("first_name")} className={inputClass("first_name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-sm uppercase tracking-wide">Achternaam</Label>
          <Input id="last_name" type="text" maxLength={100} value={form.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
            aria-invalid={errors.has("last_name")} className={inputClass("last_name")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm uppercase tracking-wide">E-mailadres</Label>
        <Input id="email" type="email" maxLength={255} value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          aria-invalid={errors.has("email")} className={inputClass("email")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm uppercase tracking-wide">Telefoonnummer</Label>
        <Input id="phone" type="tel" maxLength={20} value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          aria-invalid={errors.has("phone")} className={inputClass("phone")} />
      </div>

      {!isCap && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tshirt_size" className="text-sm uppercase tracking-wide">Maat</Label>
            <Select value={form.tshirt_size} onValueChange={(v) => updateField("tshirt_size", v)}>
              <SelectTrigger id="tshirt_size" aria-invalid={errors.has("tshirt_size")}
                className={inputClass("tshirt_size")}>
                <SelectValue placeholder="Kies een maat" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm uppercase tracking-wide">Kleur</Label>
            <RadioGroup
              value={form.tshirt_color}
              onValueChange={(v) => updateField("tshirt_color", v)}
              className={cn(
                "flex gap-3 p-3 border",
                errors.has("tshirt_color") ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
              )}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="black" id="color-black" className="rounded-none" />
                <span className="text-sm">Zwart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="white" id="color-white" className="rounded-none" />
                <span className="text-sm">Wit</span>
              </label>
            </RadioGroup>
          </div>
        </>
      )}

      <Button type="button" variant="outline" className="w-full rounded-none border-foreground" onClick={() => {
        try {
          const item = { product_model: form.product_type, tshirt_size: isCap ? "ONE" : form.tshirt_size, tshirt_color: isCap ? "none" : form.tshirt_color, quantity: 1 };
          priceItems([item]);
          setCart((current) => {
            const index = current.findIndex((i) => i.product_model === item.product_model && i.tshirt_size === item.tshirt_size && i.tshirt_color === item.tshirt_color);
            return index < 0 ? [...current, item] : current.map((i, n) => n === index ? { ...i, quantity: i.quantity + 1 } : i);
          });
        } catch (error) { toast({ title: "Kies je artikel", description: error instanceof Error ? error.message : "Kies een product, maat en kleur." }); }
      }}><Plus /> Toevoegen aan winkelmand</Button>

      <section aria-label="Winkelmand" className="border-y border-foreground py-4 space-y-3">
        <h2 className="font-display text-xl">Je winkelmand</h2>
        {!cart.length && <p className="text-sm text-muted-foreground">Je winkelmand is leeg.</p>}
        {cart.length > 0 && priceItems(cart).map((item, index) => (
          <div key={`${item.product_model}-${item.tshirt_size}-${item.tshirt_color}`} className="flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0"><p className="font-bold">{item.product_name}</p>{item.product_type !== "cap" && <p>{item.tshirt_size} · {item.tshirt_color === "black" ? "Zwart" : "Wit"}</p>}</div>
            <Input aria-label={`Aantal ${item.product_name}`} type="number" min={1} value={item.quantity} className="w-16 rounded-none border-foreground" onChange={(e) => { const quantity = Number(e.target.value); if (Number.isInteger(quantity) && quantity > 0) setCart((items) => items.map((i, n) => n === index ? { ...i, quantity } : i)); }} />
            <span>€{fmt(item.unit_price * item.quantity)}</span>
            <Button type="button" variant="ghost" size="icon" title="Verwijder artikel" aria-label={`Verwijder ${item.product_name}`} onClick={() => setCart((items) => items.filter((_, n) => n !== index))}><Trash2 /></Button>
          </div>
        ))}
      </section>

      <div className="space-y-2">
        <Label htmlFor="discount_code" className="text-sm uppercase tracking-wide">Kortingscode (optioneel)</Label>
        <div className="flex gap-2">
          <Input id="discount_code" type="text" maxLength={100} value={form.discount_code}
            onChange={(e) => updateField("discount_code", e.target.value)}
            className={inputClass("discount_code")} />
          <Button type="button" variant="outline" onClick={handleApplyDiscount}
            className="border-foreground rounded-none uppercase text-xs tracking-wider">
            Toepassen
          </Button>
        </div>
        {discountStatus === "checking" && (
          <p className="text-sm text-muted-foreground">Controleren...</p>
        )}
        {discountStatus === "valid" && form.discount_code.trim() && (
          <p className="text-sm font-medium border border-foreground bg-foreground text-background px-3 py-2">
            Kortingscode toegepast! Je krijgt €{fmt(DISCOUNT_AMOUNT)} korting.
          </p>
        )}
        {discountStatus === "invalid" && (
          <p className="text-sm font-medium text-destructive">Ongeldige kortingscode.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm uppercase tracking-wide">Bezorgmethode</Label>
        <RadioGroup
          value={form.delivery_method}
          onValueChange={(v) => updateField("delivery_method", v)}
          className={cn(
            "flex flex-col gap-2 p-3 border",
            errors.has("delivery_method") ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
          )}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="pickup" id="dm-pickup" className="rounded-none" />
            <span className="text-sm">Ophalen bij het Snorrenfeest 12 december</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="shipping" id="dm-ship" className="rounded-none" />
            <span className="text-sm">Verzenden naar mijn adres</span>
          </label>
        </RadioGroup>
      </div>

      {form.delivery_method === "shipping" && (
        <div className="space-y-4 border border-foreground p-4">
          <div className="space-y-2">
            <Label htmlFor="street" className="text-sm uppercase tracking-wide">Straatnaam en huisnummer</Label>
            <Input id="street" type="text" maxLength={200} value={form.street}
              onChange={(e) => updateField("street", e.target.value)}
              aria-invalid={errors.has("street")} className={inputClass("street")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code" className="text-sm uppercase tracking-wide">Postcode</Label>
              <Input id="postal_code" type="text" maxLength={20} value={form.postal_code}
                onChange={(e) => updateField("postal_code", e.target.value)}
                aria-invalid={errors.has("postal_code")} className={inputClass("postal_code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm uppercase tracking-wide">Woonplaats</Label>
              <Input id="city" type="text" maxLength={100} value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                aria-invalid={errors.has("city")} className={inputClass("city")} />
            </div>
          </div>
        </div>
      )}

      {(form.delivery_method === "pickup" || form.delivery_method === "shipping") && (
        <div className="border border-foreground p-4 space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wider font-bold mb-2">Besteloverzicht</div>
          <div className="flex justify-between">
            <span>Artikelen{discountStatus === "valid" ? " (met korting)" : ""}</span>
            <span>{cart.length ? `€${fmt(productPrice)}` : "—"}</span>
          </div>
          {form.delivery_method === "shipping" && (
            <div className="flex justify-between">
              <span>Verzendkosten</span>
              <span>
                {shippingLoading || shippingCost === null
                  ? "Berekenen..."
                  : `€${fmt(effectiveShipping)}`}
              </span>
            </div>
          )}
          {form.delivery_method === "pickup" && (
            <div className="flex justify-between text-muted-foreground">
              <span>Ophalen bij het Snorrenfeest</span>
              <span>Gratis</span>
            </div>
          )}
          <div className="border-t border-foreground my-2" />
          <div className="flex justify-between font-bold text-base">
            <span>Totaal</span>
            <span>
              {!cart.length || (form.delivery_method === "shipping" && (shippingLoading || shippingCost === null))
                ? "—"
                : `€${fmt(orderTotal)}`}
            </span>
          </div>
        </div>
      )}

      {showError && (
        <p role="alert"
          className="border border-foreground bg-foreground text-background px-4 py-3 text-sm font-bold uppercase tracking-wide text-center">
          Vul alle verplichte velden in om verder te gaan.
        </p>
      )}

      <Button type="submit" disabled={submitting}
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none text-base font-bold uppercase tracking-wider">
        {submitting ? "Bezig..." : "Bestel nu & Betaal"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Let op: omdat dit een speciale pre-order is, is retourneren niet mogelijk.
      </p>
    </form>
  );
};
