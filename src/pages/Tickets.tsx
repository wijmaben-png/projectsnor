import { Link } from "react-router-dom";
import { ArrowLeft, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import portrait from "@/assets/project-snor-portrait.png";

const Tickets = () => (
  <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
    <nav className="w-full max-w-xl mb-8"><Button asChild variant="ghost" className="rounded-none"><Link to="/"><ArrowLeft /> Project Snor</Link></Button></nav>
    <h1 className="font-title text-5xl md:text-7xl text-center">Snorre feest 2.0</h1>
    <img src={portrait} alt="Project Snor portret" className="w-64 md:w-80 aspect-square object-contain mt-8" />
    <p className="mt-8 font-display text-2xl">12 december 2026</p>
    <div className="mt-8 flex flex-col items-center gap-3"><Ticket className="size-7" /><p className="text-center text-muted-foreground">De ticketverkoop is nog niet geopend.</p></div>
    <footer className="mt-auto pt-12 text-xs uppercase tracking-widest text-muted-foreground">© Project Snor</footer>
  </main>
);
export default Tickets;