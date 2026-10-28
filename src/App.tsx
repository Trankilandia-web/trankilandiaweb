import Navbar from './components/Navbar';
import Hero from './components/Hero';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-zinc-950">
      <Navbar />
      <main>
        <Hero />
      </main>
    </div>
  );
}
