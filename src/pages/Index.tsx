import { PreorderForm } from "@/components/PreorderForm";
import portrait from "@/assets/project-snor-portrait.png";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
      <header className="w-full max-w-xl flex justify-center">
        <h1 className="font-display font-black italic text-4xl md:text-6xl tracking-tight text-center">
          Project Snor
        </h1>
      </header>

      <section className="w-full max-w-xl flex flex-col items-center mt-8">
        <img
          src={portrait}
          alt="Project Snor portret"
          className="w-64 md:w-80 h-auto"
        />

        <h2 className="mt-10 font-display text-2xl md:text-3xl font-bold tracking-tight text-center">
          Bestel jouw shirt voor
        </h2>

        <p className="mt-3 font-display text-6xl md:text-7xl font-black tracking-tight">
          €27.99
        </p>

        <p className="mt-5 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation.
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
