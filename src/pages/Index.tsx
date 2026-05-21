import { PixelImage } from "@/components/PixelImage";
import { ShirtPreview } from "@/components/ShirtPreview";
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

        <h2 className="mt-10 font-title text-4xl md:text-5xl text-center">
          Voorverkoop gesloten
        </h2>

        <p className="mt-5 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bedankt voor alle bestellingen! De voorverkoop van de Project Snor
          shirts is gesloten. Het is niet meer mogelijk om een shirt te
          bestellen.
        </p>

        <p className="mt-3 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bij elke verkochte shirt is €1 gedoneerd aan de
          {" "}
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

      <div
        role="status"
        className="w-full max-w-md mt-10 mb-16 border border-foreground px-4 py-3 text-sm font-bold uppercase tracking-wide text-center bg-foreground text-background"
      >
        Bestellen niet meer mogelijk
      </div>

      <footer className="mt-auto pt-8 text-xs uppercase tracking-widest text-muted-foreground">
        © Project Snor
      </footer>
    </main>
  );
};

export default Index;
