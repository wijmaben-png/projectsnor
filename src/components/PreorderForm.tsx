import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const preorderSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[+\d\s()-]+$/),
  tshirt_size: z.enum(SIZES),
});

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tshirt_size: "" | Size;
};

const initialState: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  tshirt_size: "",
};

type FieldKey = keyof FormState;

export const PreorderForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Set<FieldKey>>(new Set());
  const [showError, setShowError] = useState(false);

  const updateField = (key: FieldKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors.has(key) && value.trim() !== "") {
      const next = new Set(errors);
      next.delete(key);
      setErrors(next);
      if (next.size === 0) setShowError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required-field check first
    const missing = new Set<FieldKey>();
    (Object.keys(form) as FieldKey[]).forEach((k) => {
      if (!String(form[k]).trim()) missing.add(k);
    });
    if (missing.size > 0) {
      setErrors(missing);
      setShowError(true);
      return;
    }

    // Format validation
    const parsed = preorderSchema.safeParse(form);
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
    const { error } = await supabase
      .from("preorders")
      .insert([
        {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          tshirt_size: parsed.data.tshirt_size,
        },
      ]);

    if (error) {
      console.error("Preorder insert error:", error);
      setSubmitting(false);
      toast({
        title: "Er ging iets mis",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    supabase.functions
      .invoke("send-preorder-confirmation", {
        body: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          email: parsed.data.email,
          tshirt_size: parsed.data.tshirt_size,
        },
      })
      .catch(() => {});

    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="border border-foreground p-8 text-center">
        <p className="text-xl font-bold">
          Bedankt! We nemen snel contact met je op.
        </p>
      </div>
    );
  }

  const inputClass = (key: FieldKey) =>
    cn(
      "bg-background text-foreground placeholder:text-muted-foreground",
      errors.has(key) ? "border-2 border-foreground ring-2 ring-foreground" : "border-foreground",
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-sm uppercase tracking-wide">
            Voornaam
          </Label>
          <Input
            id="first_name"
            type="text"
            maxLength={100}
            value={form.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
            aria-invalid={errors.has("first_name")}
            className={inputClass("first_name")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-sm uppercase tracking-wide">
            Achternaam
          </Label>
          <Input
            id="last_name"
            type="text"
            maxLength={100}
            value={form.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
            aria-invalid={errors.has("last_name")}
            className={inputClass("last_name")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm uppercase tracking-wide">
          E-mailadres
        </Label>
        <Input
          id="email"
          type="email"
          maxLength={255}
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          aria-invalid={errors.has("email")}
          className={inputClass("email")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm uppercase tracking-wide">
          Telefoonnummer
        </Label>
        <Input
          id="phone"
          type="tel"
          maxLength={20}
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          aria-invalid={errors.has("phone")}
          className={inputClass("phone")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tshirt_size" className="text-sm uppercase tracking-wide">
          T-shirtmaat
        </Label>
        <Select
          value={form.tshirt_size}
          onValueChange={(v) => updateField("tshirt_size", v)}
        >
          <SelectTrigger
            id="tshirt_size"
            aria-invalid={errors.has("tshirt_size")}
            className={inputClass("tshirt_size")}
          >
            <SelectValue placeholder="Kies een maat" />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showError && (
        <p
          role="alert"
          className="border border-foreground bg-foreground text-background px-4 py-3 text-sm font-bold uppercase tracking-wide text-center"
        >
          Vul alle verplichte velden in om verder te gaan.
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold uppercase tracking-wider"
      >
        {submitting ? "Bezig..." : "Bestel nu"}
      </Button>
    </form>
  );
};
