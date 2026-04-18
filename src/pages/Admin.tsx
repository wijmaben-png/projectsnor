import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type Preorder = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tshirt_size: string;
};

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/admin/login", { replace: true });
        return;
      }
      const userId = sessionData.session.user.id;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        toast({
          title: "Geen toegang",
          description: "Je account heeft geen admin-rechten.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        navigate("/admin/login", { replace: true });
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("preorders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Laden mislukt", description: error.message, variant: "destructive" });
      } else {
        setPreorders(data ?? []);
      }
      setLoading(false);
    };
    init();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const handleExport = () => {
    const headers = ["Datum", "Voornaam", "Achternaam", "E-mail", "Telefoon", "Maat"];
    const rows = preorders.map((p) => [
      new Date(p.created_at).toISOString(),
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.tshirt_size,
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

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Project Snor
            </p>
            <h1 className="font-display text-3xl font-black tracking-tight mt-1">
              Bestellingen ({preorders.length})
            </h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider"
            >
              Download CSV
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background uppercase tracking-wider"
            >
              Uitloggen
            </Button>
          </div>
        </header>

        <div className="border border-foreground">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground hover:bg-transparent">
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  #
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  Datum
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  Voornaam
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  Achternaam
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  E-mail
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  Telefoon
                </TableHead>
                <TableHead className="text-foreground uppercase text-xs tracking-wider">
                  Maat
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preorders.length === 0 ? (
                <TableRow className="border-foreground hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nog geen bestellingen
                  </TableCell>
                </TableRow>
              ) : (
                preorders.map((p, i) => (
                  <TableRow key={p.id} className="border-foreground hover:bg-secondary">
                    <TableCell className="text-sm font-bold">
                      {preorders.length - i}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.created_at).toLocaleString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-sm">{p.first_name}</TableCell>
                    <TableCell className="text-sm">{p.last_name}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.phone}</TableCell>
                    <TableCell className="text-sm font-bold">{p.tshirt_size}</TableCell>
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
