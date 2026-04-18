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

const preorderSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Vul je volledige naam in" })
    .max(100, { message: "Naam is te lang" }),
  email: z
    .string()
    .trim()
    .email({ message: "Ongeldig e-mailadres" })
    .max(255, { message: "E-mailadres is te lang" }),
  phone: z
    .string()
    .trim()
    .min(6, { message: "Ongeldig telefoonnummer" })
    .max(20, { message: "Telefoonnummer is te lang" })
    .regex(/^[+\d\s()-]+$/, { message: "Alleen cijfers en + ( ) - toegestaan" }),
  tshirt_size: z.enum(["S", "M", "L", "XL"], {
    errorMap: () => ({ message: "Kies een maat" }),
  }),
});

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  tshirt_size: "" | "S" | "M" | "L" | "XL";
};

const initialState: FormState = {
  full_name: "",
  email: "",
  phone: "",
  tshirt_size: "",
};

export const PreorderForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = preorderSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({
        title: "Controleer het formulier",
        description: first?.message ?? "Ongeldige invoer",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("preorders")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      setSubmitting(false);
      toast({
        title: "Er ging iets mis",
        description: "Probeer het opnieuw.",
        variant: "destructive",
      });
      return;
    }

    // Fire-and-forget confirmation email
    supabase.functions
      .invoke("send-preorder-confirmation", {
        body: {
          preorder_id: data.id,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          tshirt_size: parsed.data.tshirt_size,
        },
      })
      .catch(() => {
        // Silent — user already saw success
      });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-sm uppercase tracking-wide">
          Volledige naam
        </Label>
        <Input
          id="full_name"
          type="text"
          required
          maxLength={100}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="bg-background border-foreground text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm uppercase tracking-wide">
          E-mailadres
        </Label>
        <Input
          id="email"
          type="email"
          required
          maxLength={255}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="bg-background border-foreground text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm uppercase tracking-wide">
          Telefoonnummer
        </Label>
        <Input
          id="phone"
          type="tel"
          required
          maxLength={20}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="bg-background border-foreground text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tshirt_size" className="text-sm uppercase tracking-wide">
          T-shirtmaat
        </Label>
        <Select
          value={form.tshirt_size}
          onValueChange={(v) =>
            setForm({ ...form, tshirt_size: v as FormState["tshirt_size"] })
          }
        >
          <SelectTrigger
            id="tshirt_size"
            className="bg-background border-foreground text-foreground"
          >
            <SelectValue placeholder="Kies een maat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="XL">XL</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
