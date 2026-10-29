import { Link } from "react-router-dom";
import { ArrowLeft, Ticket, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelImage } from "@/components/PixelImage";
import portrait from "@/assets/project-snor-portrait.png";

const Tickets = () => (
  <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-6">
    <nav className="w-full max-w-xl mb-4"><Button asChild variant="ghost" className="rounded-none"><Link to="/"><ArrowLeft /> Project Snor</Link></Button></nav>
    <h1 className="font-title text-5xl md:text-7xl text-center max-w-xl">Project Snor Feest 2.0</h1>
    <Button asChild size="lg" className="mt-6 rounded-none"><a href="https://project-snor.tickable.nl/project-snor-feest-2-0" target="_blank" rel="noopener noreferrer"><Ticket /> Koop tickets</a></Button>
    <div className="w-64 md:w-80 aspect-square mt-6"><PixelImage src={portrait} alt="Project Snor portret" cols={20} rows={20} animate={false} className="w-full h-full" /></div>
    <p className="mt-8 font-display text-2xl">12 december 2026</p>
    <div className="mt-5 flex items-center gap-2"><Clock className="size-4" /><p>18:00–23:00</p></div>
    <address className="mt-5 not-italic text-center">
      <p className="font-semibold flex items-center justify-center gap-2"><MapPin className="size-4 shrink-0" />Club Ping Pong Utrecht</p>
      <p className="mt-2 text-sm text-muted-foreground">Concordiastraat 80<br />3551 EM Utrecht</p>
    </address>
    <footer className="mt-auto pt-12 text-xs uppercase tracking-widest text-muted-foreground">© Project Snor</footer>
  </main>
);
export default Tickets;