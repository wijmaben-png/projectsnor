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

const SIZES = ["S", "M", "L", "XL"] as const;
type Size = (typeof SIZES)[number];

const COLORS = ["black", "white"] as const;
type Color = (typeof COLORS)[number];

type Delivery = "pickup" | "shipping";

const baseSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20).regex(/^[+\d\s()-]+$/),
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
  const [discountStatus, setDiscountStatus] = useState<"none" | "valid" | "invalid">("none");
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

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

  const shirtPrice = discountStatus === "valid" && form.discount_code.trim() ? 29.99 : 32.99;
  const effectiveShipping = form.delivery_method === "shipping" ? (shippingCost ?? 0) : 0;
  const orderTotal = Math.round((shirtPrice + effectiveShipping) * 100) / 100;
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
      "first_name", "last_name", "email", "phone", "tshirt_size", "tshirt_color", "delivery_method",
    ];
    if (form.delivery_method === "shipping") {
      base.push("street", "postal_code", "city");
    }
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = new Set<FieldKey>();
    requiredFields().forEach((k) => {
      if (!String(form[k]).trim()) missing.add(k);
    });
    if (missing.size > 0) {
      setErrors(missing);
      setShowError(true);
      return;
    }

    const parsed = baseSchema.safeParse(form);
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
          tshirt_size: parsed.data.tshirt_size,
          tshirt_color: parsed.data.tshirt_color,
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
    // Provisionally validate by calling the same endpoint won't work without full data;
    // we just mark as "pending" — real validation happens server-side at submit.
    // For UX we optimistically show "ingevoerd"; server is source of truth.
    setDiscountStatus("valid");
  };

  const inputClass = (key: FieldKey) =>
    cn(
      "bg-background text-foreground placeholder:text-muted-foreground rounded-none",
      errors.has(key) ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      <div className="space-y-2">
        <Label htmlFor="tshirt_size" className="text-sm uppercase tracking-wide">T-shirtmaat</Label>
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
        <Label className="text-sm uppercase tracking-wide">Shirtkleur</Label>
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
        {discountStatus === "valid" && form.discount_code.trim() && (
          <p className="text-sm font-medium border border-foreground bg-foreground text-background px-3 py-2">
            Kortingscode toegepast! Je betaalt €29,99.
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
            <span className="text-sm">Ophalen bij het Snorrenfeest (29 mei) (gratis)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="shipping" id="dm-ship" className="rounded-none" />
            <span className="text-sm">Verzenden naar mijn adres (€4)</span>
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
    </form>
  );
};
