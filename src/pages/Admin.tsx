import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MERCH_PRODUCTS, COLOR_LABELS, orderItems, groupCustomers, matchesItems, type OrderItem } from "../../supabase/functions/_shared/merch-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Preorder = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  product_type: string;
  tshirt_size: string;
  tshirt_color: string;
  delivery_method: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  payment_status: string;
  amount_paid: number | null;
  discount_code_used: boolean;
  tracking_number: string | null;
  sendcloud_parcel_id: string | null;
  order_items?: OrderItem[];
};

type Filter = "all" | "pickup" | "shipping";
type ColorFilter = "all" | "black" | "white" | "blue" | "bone";
type ProductFilter = "all" | "shirt" | "longsleeve" | "cap";
const productLabel = (t: string) => t === "cap" ? "Pet" : t === "longsleeve" ? "Longsleeve" : "Shirt";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [labelLoadingId, setLabelLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const load = async () => {
    const { data, error } = await supabase
      .from("preorders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Laden mislukt", description: error.message, variant: "destructive" });
    } else {
      setPreorders((data ?? []) as Preorder[]);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/admin/login", { replace: true });
        return;
      }
      const userId = sessionData.session.user.id;
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        toast({ title: "Geen toegang", description: "Je account heeft geen admin-rechten.", variant: "destructive" });
        await supabase.auth.signOut();
        navigate("/admin/login", { replace: true });
        return;
      }
      setAuthorized(true);
      await load();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const handleCreateLabel = async (id: string) => {
    setLabelLoadingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("create-sendcloud-shipment", {
        body: { preorder_id: id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Label aangemaakt", description: data?.tracking_number ?? "Verzonden" });
      await load();
    } catch (err) {
      toast({
        title: "Label mislukt",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setLabelLoadingId(null);
    }
  };

  const handleBulkLabels = async () => {
    const pending = filtered.filter(
      (p) => p.delivery_method === "shipping" && p.payment_status === "paid" && !p.sendcloud_parcel_id
    );
    if (pending.length === 0) {
      toast({ title: "Geen openstaande labels", description: "Alle betaalde verzendingen hebben al een label." });
      return;
    }
    const confirmed = window.confirm(
      `Weet je zeker dat je ${pending.length} label(s) wilt aanmaken? Dit kan niet ongedaan worden.`
    );
    if (!confirmed) return;
    setBulkLoading(true);
    let success = 0;
    let fail = 0;
    for (const p of pending) {
      try {
        const { data, error } = await supabase.functions.invoke("create-sendcloud-shipment", {
          body: { preorder_id: p.id },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        success++;
      } catch {
        fail++;
      }
    }
    toast({
      title: "Bulk labels klaar",
      description: `${success} gelukt, ${fail} mislukt`,
      variant: fail > 0 ? "destructive" : "default",
    });
    await load();
    setBulkLoading(false);
  };

  const pendingLabelCount = preorders.filter(
    (p) => p.delivery_method === "shipping" && p.payment_status === "paid" && !p.sendcloud_parcel_id
  ).length;

  const filtered = preorders
    .filter((p) => p.payment_status !== "expired" && p.payment_status !== "failed" && p.payment_status !== "canceled")
    .filter((p) => filter === "all" ? true : p.delivery_method === filter)
    .filter((p) => matchesItems(orderItems(p), productFilter, modelFilter, colorFilter));
  const customers = groupCustomers(filtered);
  const itemCounts = filtered.flatMap((p) => orderItems(p)).filter((item) => matchesItems([item], productFilter, modelFilter, colorFilter)).reduce<Record<string, number>>((totals, item) => {
    const key = [item.product_name, COLOR_LABELS[item.tshirt_color], item.tshirt_size === "ONE" ? "" : item.tshirt_size].filter(Boolean).join(" · ");
    totals[key] = (totals[key] ?? 0) + item.quantity;
    return totals;
  }, {});

  const handleExport = () => {
    const headers = ["Bestelnummer","Datum","Voornaam","Achternaam","E-mail","Telefoon","Product","Model","Aantal","Artikelprijs","Maat","Kleur","Bezorging","Adres","Postcode","Plaats","Status","Besteltotaal","Korting","Tracking"];
    const rows = filtered.flatMap((p) => orderItems(p).map((item) => [
      p.id,
      new Date(p.created_at).toISOString(),
      p.first_name, p.last_name, p.email, p.phone, item.product_name, item.product_model, String(item.quantity), String(item.unit_price),
      item.tshirt_size, item.tshirt_color,
      p.delivery_method,
      p.street ?? "", p.postal_code ?? "", p.city ?? "",
      p.payment_status,
      p.amount_paid != null ? String(p.amount_paid) : "",
      p.discount_code_used ? "ja" : "nee",
      p.tracking_number ?? "",
    ]));
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preorders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-sm uppercase tracking-widest">Laden...</p>
      </main>
    );
  }
  if (!authorized) return null;

  const filterBtn = (label: string, value: Filter) => (
    <Button
      key={value}
      variant="outline"
      onClick={() => setFilter(value)}
      className={cn(
        "border-foreground rounded-none uppercase text-xs tracking-wider",
        filter === value ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background",
      )}
    >
      {label}
    </Button>
  );

  const colorBtn = (label: string, value: ColorFilter) => (
    <Button
      key={value}
      variant="outline"
      onClick={() => setColorFilter(value)}
      className={cn(
        "border-foreground rounded-none uppercase text-xs tracking-wider",
        colorFilter === value ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background",
      )}
    >
      {label}
    </Button>
  );

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-[100rem] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Project Snor</p>
            <h1 className="font-display text-3xl font-black tracking-tight mt-1">
              Bestellingen ({filtered.length})
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{customers.length} klanten · {filtered.flatMap(orderItems).reduce((n, i) => n + i.quantity, 0)} artikelen</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {filterBtn("Alle", "all")}
            {filterBtn("Ophalen", "pickup")}
            {filterBtn("Verzenden", "shipping")}
            <span className="w-px h-8 bg-foreground/30" />
            {colorBtn("Alle kleuren", "all")}
            {colorBtn("Zwart", "black")}
            {colorBtn("Wit", "white")}
            {colorBtn("Bone", "bone")}
            <span className="w-px h-8 bg-foreground/30" />
            {([["Alle producten","all"],["Shirts","shirt"],["Longsleeves","longsleeve"],["Petten","cap"]] as [string, ProductFilter][]).map(([l, v]) => (
              <Button key={v} variant="outline" onClick={() => setProductFilter(v)}
                className={cn("border-foreground rounded-none uppercase text-xs tracking-wider",
                  productFilter === v ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background")}>
                {l}
              </Button>
            ))}
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger aria-label="Productmodel" className="w-56 border-foreground rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Alle modellen</SelectItem>{MERCH_PRODUCTS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleBulkLabels} variant="outline" disabled={bulkLoading || pendingLabelCount === 0}
              className="border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider rounded-none">
              {bulkLoading ? "Bezig..." : `Alle labels verzenden (${pendingLabelCount})`}
            </Button>
            <Button onClick={handleExport} variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider rounded-none">
              Download CSV
            </Button>
            <Button onClick={handleSignOut} variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider rounded-none">
              Uitloggen
            </Button>
          </div>
        </header>

        <section aria-label="Artikelaantallen" className="border-y border-foreground py-4 mb-6 flex flex-wrap gap-x-8 gap-y-2">
          {Object.entries(itemCounts).map(([label, count]) => <p key={label} className="text-sm"><strong>{count}×</strong> {label}</p>)}
          {!Object.keys(itemCounts).length && <p className="text-sm text-muted-foreground">Geen artikelen voor deze selectie</p>}
        </section>

        <div className="border border-foreground overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground hover:bg-transparent">
                {["Datum","Naam","E-mail","Tel","Product","Maat","Kleur","Bezorging","Adres","Status","Bedrag","Korting","Tracking","Actie"].map((h) => (
                  <TableHead key={h} className="text-foreground uppercase text-xs tracking-wider whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-foreground hover:bg-transparent">
                  <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                    Geen bestellingen
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <Fragment key={customer[0]?.email}>
                    <TableRow className="bg-secondary border-foreground hover:bg-secondary"><TableCell colSpan={14} className="py-4"><strong>{customer[0]?.first_name} {customer[0]?.last_name}</strong><span className="ml-4 text-muted-foreground">{customer[0]?.email} · {customer.length} bestelling(en)</span></TableCell></TableRow>
                    {customer.map((p) => (
                  <TableRow key={p.id} className="border-foreground hover:bg-secondary">
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.phone}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{orderItems(p).map((item, i) => <div key={i} className="min-h-6">{item.quantity}× {item.product_name}</div>)}</TableCell>
                    <TableCell className="text-sm font-bold">{orderItems(p).map((item, i) => <div key={i} className="min-h-6">{item.product_type === "cap" ? "—" : item.tshirt_size}</div>)}</TableCell>
                    <TableCell className="text-sm">
                      {orderItems(p).map((item, i) => <div key={i} className="min-h-6">{COLOR_LABELS[item.tshirt_color] || "—"}</div>)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.delivery_method === "shipping" ? "Verzenden" : "Ophalen"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.delivery_method === "shipping"
                        ? `${p.street ?? ""}, ${p.postal_code ?? ""} ${p.city ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-bold">{p.payment_status}</TableCell>
                    <TableCell className="text-sm">{p.amount_paid != null ? `€${Number(p.amount_paid).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-sm">{p.discount_code_used ? "Ja" : "Nee"}</TableCell>
                    <TableCell className="text-xs">{p.tracking_number ?? "—"}</TableCell>
                    <TableCell>
                      {p.delivery_method === "shipping" && p.payment_status === "paid" && !p.sendcloud_parcel_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={labelLoadingId === p.id || bulkLoading}
                          onClick={() => handleCreateLabel(p.id)}
                          className="border-foreground rounded-none uppercase text-[10px] tracking-wider"
                        >
                          {labelLoadingId === p.id ? "Bezig..." : "Verstuur label"}
                        </Button>
                      ) : p.sendcloud_parcel_id ? (
                        <Badge className="bg-green-600 text-white border-green-600 rounded-none uppercase text-[10px] tracking-wider">
                          ✓ Verstuurd
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
};

export default Admin;
