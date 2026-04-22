import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PixelImage } from "@/components/PixelImage";
import { supabase } from "@/integrations/supabase/client";
import portrait from "@/assets/project-snor-portrait.png";

interface Order {
  first_name: string;
  tshirt_size: string;
  tshirt_color: string;
  delivery_method: string;
  amount_paid: number | null;
  payment_status: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
}

const Bedankt = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Poll for webhook confirmation using secure RPC function
      for (let i = 0; i < 8; i++) {
        const { data } = await supabase.rpc("get_preorder_by_id", { _order_id: orderId });
        const row = Array.isArray(data) ? data[0] : data;
        if (cancelled) return;
        if (row?.payment_status === "paid") {
          setOrder(row as Order);
          break;
        }
        if (row && ["failed", "canceled", "expired"].includes(row.payment_status)) {
          setOrder(row as Order);
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  const colorLabel = order?.tshirt_color === "black" ? "Zwart" : order?.tshirt_color === "white" ? "Wit" : order?.tshirt_color;
  const deliveryLabel = order?.delivery_method === "shipping"
    ? "Verzenden naar je adres"
    : "Ophalen bij het Snorrenfeest (29 mei)";
  const isPaid = order?.payment_status === "paid";

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
      <section className="w-full max-w-xl flex flex-col items-center">
        <div className="w-64 md:w-80 aspect-square">
          <PixelImage
            src={portrait}
            alt="Project Snor portret"
            cols={20}
            rows={20}
            duration={1500}
            startDelay={200}
            className="w-full h-full"
          />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground uppercase tracking-widest">Bestelling laden...</p>
        ) : !order || !isPaid ? (
          <>
            <h1 className="mt-10 font-title text-4xl md:text-5xl text-center">
              Hmm...
            </h1>
            <p className="mt-5 text-center max-w-md text-muted-foreground">
              We kunnen je bestelling niet vinden. Neem contact op als je denkt dat er iets mis is gegaan.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-10 font-title text-5xl md:text-6xl text-center">
              Bedankt snorremans!
            </h1>
            <p className="mt-5 text-center max-w-md">
              We houden contact. Hou je inbox in de gaten voor een bevestigingsmail.
            </p>

            <div className="mt-10 w-full max-w-md border border-foreground p-6">
              <h2 className="font-display italic text-xl mb-4">Je bestelling</h2>
              <ul className="space-y-2 text-sm">
                <li><span className="uppercase tracking-wide text-muted-foreground">Maat:</span> <strong>{order.tshirt_size}</strong></li>
                <li><span className="uppercase tracking-wide text-muted-foreground">Kleur:</span> <strong>{colorLabel}</strong></li>
                <li><span className="uppercase tracking-wide text-muted-foreground">Bezorging:</span> <strong>{deliveryLabel}</strong></li>
                {order.delivery_method === "shipping" && order.street && (
                  <li>
                    <span className="uppercase tracking-wide text-muted-foreground">Adres:</span>{" "}
                    <strong>{order.street}, {order.postal_code} {order.city}</strong>
                  </li>
                )}
                <li>
                  <span className="uppercase tracking-wide text-muted-foreground">Betaald:</span>{" "}
                  <strong>{typeof order.amount_paid === "number" ? `€${order.amount_paid.toFixed(2)}` : "—"}</strong>
                </li>
              </ul>
            </div>
          </>
        )}

        <Link
          to="/"
          className="mt-12 text-sm uppercase tracking-widest underline underline-offset-4 hover:text-muted-foreground transition-colors"
        >
          ← Terug naar home
        </Link>
      </section>

      <footer className="mt-auto pt-12 text-xs uppercase tracking-widest text-muted-foreground">
        © Project Snor
      </footer>
    </main>
  );
};

export default Bedankt;
