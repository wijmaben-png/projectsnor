import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShirtPreview } from "@/components/ShirtPreview";

const Merch = () => (
  <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
    <nav className="w-full max-w-xl mb-6"><Button asChild variant="ghost" className="rounded-none"><Link to="/"><ArrowLeft /> Project Snor</Link></Button></nav>
    <section className="w-full max-w-md mb-2 border border-foreground p-8 text-center">
      <h2 className="font-title text-3xl md:text-4xl">Coming soon</h2>
      <p className="mt-3 text-sm md:text-base text-muted-foreground">Bestellen is nog niet mogelijk. Hou deze pagina in de gaten, we gaan snel open.</p>
    </section>
    <section className="w-full max-w-xl flex flex-col items-center mt-8">
      <h1 className="font-title text-4xl md:text-5xl text-center">Drop 2, nu live</h1>
      <p className="mt-5 text-sm md:text-base text-center max-w-md text-muted-foreground">Er is geluisterd — dankjulliewel voor de stemmen. Onze tweede merch drop ooit is binnen: twee verse longsleeves en een pet die je snor er nog strakker uit laat zien.</p>
      <p className="mt-3 text-sm md:text-base text-center max-w-md text-muted-foreground">Beperkte oplage, dus wees er snor bij.</p>
      <div className="mt-8 flex justify-center w-full"><ShirtPreview /></div>
    </section>
    <footer className="mt-auto pt-8 text-xs uppercase tracking-widest text-muted-foreground">© Project Snor</footer>
  </main>
);
export default Merch;