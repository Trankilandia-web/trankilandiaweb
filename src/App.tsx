import { BrowserRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProgramsSection from './components/ProgramsSection';
import AboutSection from './components/AboutSection';
import QuickInfoBar from './components/QuickInfoBar';
import Footer from './components/Footer';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-black">
        <Navbar />
        <main>
          <Hero />
          <ProgramsSection />
          <AboutSection />
          <QuickInfoBar />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
