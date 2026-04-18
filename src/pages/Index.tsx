import { PreorderForm } from "@/components/PreorderForm";
import logo from "@/assets/project-snor-logo.svg";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-10">
      <header className="w-full max-w-xl flex justify-center">
        <p className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em]">
          Project Snor
        </p>
      </header>

      <section className="w-full max-w-xl flex flex-col items-center mt-10">
        <img
          src={logo}
          alt="Project Snor logo"
          className="w-64 md:w-80 h-auto"
        />

        <h1 className="mt-12 text-3xl md:text-4xl font-black uppercase tracking-tight text-center">
          Bestel jouw shirt voor
        </h1>

        <p className="mt-4 text-6xl md:text-7xl font-black tracking-tight">
          €27,99
        </p>

        <p className="mt-6 text-sm md:text-base text-center max-w-md text-muted-foreground">
          Bij elke aankoop wordt €1 gedoneerd aan de Movember Foundation.
        </p>
      </section>

      <section className="w-full max-w-md mt-12 mb-16">
        <PreorderForm />
      </section>

      <footer className="mt-auto pt-8 text-xs uppercase tracking-widest text-muted-foreground">
        © Project Snor
      </footer>
    </main>
  );
};

export default Index;
