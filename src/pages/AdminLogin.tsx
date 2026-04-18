import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/admin", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setLoading(false);
      if (error) {
        toast({ title: "Aanmelden mislukt", description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: "Account aangemaakt",
        description: "Je kunt nu inloggen.",
      });
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Inloggen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-10">
          Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm uppercase tracking-wide">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-foreground text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm uppercase tracking-wide">
              Wachtwoord
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-foreground text-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider"
          >
            {loading ? "Bezig..." : mode === "signin" ? "Inloggen" : "Account aanmaken"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-6 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Nieuw account aanmaken" : "Terug naar inloggen"}
        </button>
      </div>
    </main>
  );
};

export default AdminLogin;
