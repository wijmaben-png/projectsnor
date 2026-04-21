import { useEffect, useState } from "react";
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

type Preorder = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
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
};

type Filter = "all" | "pickup" | "shipping";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [labelLoadingId, setLabelLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const load = async () => {
    const { data, error } = await supabase
      .from("preorders")
      .select("*")
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

  const filtered = preorders.filter((p) =>
    filter === "all" ? true : p.delivery_method === filter
  );

  const handleExport = () => {
    const headers = ["Datum","Voornaam","Achternaam","E-mail","Telefoon","Maat","Kleur","Bezorging","Adres","Postcode","Plaats","Status","Bedrag","Korting","Tracking"];
    const rows = filtered.map((p) => [
      new Date(p.created_at).toISOString(),
      p.first_name, p.last_name, p.email, p.phone,
      p.tshirt_size, p.tshirt_color,
      p.delivery_method,
      p.street ?? "", p.postal_code ?? "", p.city ?? "",
      p.payment_status,
      p.amount_paid != null ? String(p.amount_paid) : "",
      p.discount_code_used ? "ja" : "nee",
      p.tracking_number ?? "",
    ]);
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

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-[100rem] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Project Snor</p>
            <h1 className="font-display text-3xl font-black tracking-tight mt-1">
              Bestellingen ({filtered.length})
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {filterBtn("Alle", "all")}
            {filterBtn("Ophalen", "pickup")}
            {filterBtn("Verzenden", "shipping")}
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

        <div className="border border-foreground overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground hover:bg-transparent">
                {["Datum","Naam","E-mail","Tel","Maat","Kleur","Bezorging","Adres","Status","Bedrag","Korting","Tracking","Actie"].map((h) => (
                  <TableHead key={h} className="text-foreground uppercase text-xs tracking-wider whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-foreground hover:bg-transparent">
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    Geen bestellingen
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="border-foreground hover:bg-secondary">
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{p.phone}</TableCell>
                    <TableCell className="text-sm font-bold">{p.tshirt_size}</TableCell>
                    <TableCell className="text-sm">
                      {p.tshirt_color === "black" ? "Zwart" : p.tshirt_color === "white" ? "Wit" : p.tshirt_color}
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
                          disabled={labelLoadingId === p.id}
                          onClick={() => handleCreateLabel(p.id)}
                          className="border-foreground rounded-none uppercase text-[10px] tracking-wider"
                        >
                          {labelLoadingId === p.id ? "Bezig..." : "Verstuur label"}
                        </Button>
                      ) : p.sendcloud_parcel_id ? (
                        <span className="text-xs text-muted-foreground">Verstuurd</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
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
