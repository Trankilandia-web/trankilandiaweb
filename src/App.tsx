import Navbar from './components/Navbar';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-zinc-950">
      <Navbar />
      <main className="pt-20">
        <section id="inicio" className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <h1 className="text-4xl font-black text-amber-400">TRANKILANDIA GYM</h1>
        </section>
      </main>
    </div>
  );
}
