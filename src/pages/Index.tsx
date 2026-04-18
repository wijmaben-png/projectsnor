import { PreorderForm } from "@/components/PreorderForm";
import { PixelImage } from "@/components/PixelImage";
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
          €27,99
        </p>

        <p className="mt-5 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bij elke aankoop wordt €1 gedoneerd aan de
          <br />
          <em className="font-display italic">Movember Foundation</em>.
        </p>
      </section>

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
