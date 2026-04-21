import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold italic">Project Snor</h1>

        {status === "loading" && <p className="text-muted-foreground">Laden...</p>}

        {status === "valid" && (
          <>
            <p>Weet je zeker dat je je wilt uitschrijven van onze e-mails?</p>
            <button
              onClick={handleUnsubscribe}
              className="border border-foreground bg-foreground text-background px-6 py-3 font-bold hover:bg-background hover:text-foreground transition-colors"
            >
              Uitschrijven
            </button>
          </>
        )}

        {status === "success" && (
          <p className="text-foreground">Je bent uitgeschreven. Je ontvangt geen e-mails meer van ons.</p>
        )}

        {status === "already" && (
          <p className="text-muted-foreground">Je bent al uitgeschreven.</p>
        )}

        {status === "invalid" && (
          <p className="text-muted-foreground">Ongeldige of verlopen link.</p>
        )}

        {status === "error" && (
          <p className="text-destructive">Er is iets misgegaan. Probeer het later opnieuw.</p>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
