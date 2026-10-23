import { PixelImage } from "@/components/PixelImage";
import { Link } from "react-router-dom";
import { Ticket, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import portrait from "@/assets/project-snor-portrait.png";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
      <header className="w-full max-w-xl flex justify-center">
        <h1 className="font-title text-6xl md:text-8xl text-center">
          <span className="title-shine">Project Snor</span>
        </h1>
      </header>

      <section className="w-full max-w-xl flex flex-col items-center mt-8">
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

        <nav aria-label="Tickets en merch" className="mt-10 w-full max-w-md grid gap-4">
          <Button asChild className="rounded-none h-auto min-h-20 px-5 py-4 whitespace-normal justify-between">
            <Link to="/tickets"><span className="flex items-center gap-4"><Ticket className="!size-6" /><span className="text-left"><span className="block text-xl font-bold uppercase">Tickets</span><span className="block text-xs mt-1">Snorre feest 2.0 · 12 december</span></span></span><ArrowUpRight className="!size-5" /></Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none h-auto min-h-20 px-5 py-4 whitespace-normal justify-between border-foreground">
            <Link to="/merch"><span className="flex items-center gap-4"><ShoppingBag className="!size-6" /><span className="text-xl font-bold uppercase">Snorre merch</span></span><ArrowUpRight className="!size-5" /></Link>
          </Button>
        </nav>
      </section>

      <footer className="mt-auto pt-12 text-xs uppercase tracking-widest text-muted-foreground">
        © Project Snor
      </footer>
    </main>
  );
};

export default Index;
