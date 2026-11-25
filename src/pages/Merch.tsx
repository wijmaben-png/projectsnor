import { Link } from "react-router-dom";
import { ArrowLeft, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShirtPreview } from "@/components/ShirtPreview";

const Merch = () => (
  <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
    <nav className="w-full max-w-xl mb-6"><Button asChild variant="ghost" className="rounded-none"><Link to="/"><ArrowLeft /> Project Snor</Link></Button></nav>
    <section className="w-full max-w-md border border-foreground p-8 text-center">
      <h2 className="font-title text-3xl md:text-4xl">Pre-order gesloten</h2>
      <p className="mt-3 text-sm md:text-base text-muted-foreground">De snorren zijn weer in de stalling. Drop 2 is niet meer te bestellen — bedankt dat jullie er zo snorrig op vooruitliepen. Een volgende drop komt er vast aan, dus houd deze pagina in de gaten.</p>
      <p className="mt-4 text-sm md:text-base">Wel nog te doen: tickets voor het Project Snor Feest 2.0.</p>
      <Button asChild size="sm" className="mt-4 rounded-none"><Link to="/tickets"><Ticket /> Naar de tickets</Link></Button>
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
