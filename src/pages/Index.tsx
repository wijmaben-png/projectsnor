import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PreorderForm } from "@/components/PreorderForm";
import { PixelImage } from "@/components/PixelImage";
import { ShirtPreview } from "@/components/ShirtPreview";
import { supabase } from "@/integrations/supabase/client";
import portrait from "@/assets/project-snor-portrait.png";

const Index = () => {
  const [params, setParams] = useSearchParams();
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const orderId = params.get("order");
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      // Poll a few times for the webhook using secure RPC
      for (let i = 0; i < 6; i++) {
        const { data } = await supabase.rpc("get_preorder_by_id", { _order_id: orderId });
        const row = Array.isArray(data) ? data[0] : data;
        if (cancelled) return;
        if (row?.payment_status === "paid") {
          setBanner({ kind: "success", text: "Bedankt voor je bestelling! Je ontvangt een bevestiging per e-mail." });
          break;
        }
        if (row?.payment_status === "failed" || row?.payment_status === "canceled" || row?.payment_status === "expired") {
          setBanner({ kind: "error", text: "Je betaling is niet gelukt. Probeer het opnieuw." });
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      // clean URL
      const next = new URLSearchParams(params);
      next.delete("order");
      setParams(next, { replace: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
      <header className="w-full max-w-xl flex justify-center">
        <h1 className="font-title text-6xl md:text-8xl text-center">
          <span className="title-shine">Project Snor</span>
        </h1>
      </header>

      <section className="w-full max-w-xl flex flex-col items-center mt-8">
        {/* Reserve fixed aspect-ratio space so layout doesn't shift while image animates in */}
        <div className="w-64 md:w-80 aspect-square">
          <PixelImage
            src={portrait}
            alt="Project Snor portret"
            cols={20}
            rows={20}
            duration={2000}
            startDelay={300}
            className="w-full h-full"
          />
        </div>

        <h2 className="mt-10 font-title text-4xl md:text-5xl text-center">
          Bestel jouw shirt voor
        </h2>

        <p className="mt-3 font-title text-6xl md:text-7xl price-bounce">
          €32,99
        </p>

        <p className="mt-5 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bij elke aankoop wordt €1 gedoneerd aan de
          <br />
          <a
            href="https://nl.movember.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display italic underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Movember Foundation
          </a>
          .
        </p>

        <div className="mt-8 flex justify-center w-full">
          <ShirtPreview />
        </div>
      </section>

      {banner && (
        <div
          role="status"
          className={`w-full max-w-md mt-8 border border-foreground px-4 py-3 text-sm font-bold uppercase tracking-wide text-center ${
            banner.kind === "success" ? "bg-foreground text-background" : "bg-background text-foreground"
          }`}
        >
          {banner.text}
        </div>
      )}

      <section className="w-full max-w-md mt-10 mb-16">
        <PreorderForm />
      </section>

      <footer className="mt-auto pt-8 text-xs uppercase tracking-widest text-muted-foreground">
        © Project Snor
      </footer>
    </main>
  );
};

export default Index;
