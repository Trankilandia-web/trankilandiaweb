import { ArrowRight, Play } from 'lucide-react';
import FeatureBar from './FeatureBar';

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-[100dvh] flex flex-col justify-between overflow-hidden pt-28 sm:pt-32 lg:pt-36 pb-8 sm:pb-12"
    >
      {/* Background athlete photo with dark cinematic overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=85"
          alt="Atleta entrenando con mancuerna en Trankilandia Gym"
          className="w-full h-full object-cover object-center lg:object-[center_top] brightness-[0.70] select-none"
          loading="eager"
        />
        {/* Horizontal gradient: deep black on the left for maximum text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        {/* Vertical bottom gradient: seamless transition into lower sections */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        {/* Subtle overall dark vignette */}
        <div className="absolute inset-0 bg-zinc-950/30" />
      </div>

      {/* Main Hero Content: Max 4 text elements for high-impact typography */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-8 lg:py-12">
        {/* 1. Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-mono font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>TRANKILANDIA CLUB · EST. 2026</span>
        </div>

        {/* 2. H1: Max 2 lines */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.08] text-white max-w-4xl">
          CONSTRUYE FUERZA.<br className="hidden sm:inline" />{' '}
          SUPERA <span className="text-amber-400">TUS LÍMITES</span>.
        </h1>

        {/* 3. Subtext: Under 20 words */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-300 max-w-xl font-normal leading-relaxed">
          Únete a una comunidad que te exige, te respalda y te transforma en tu versión más fuerte.
        </p>

        {/* 4. Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide active:scale-[0.98] transition-all duration-200 shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 group"
          >
            <span>ÚNETE AHORA</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" strokeWidth={2} />
          </a>
          <a
            href="#programas"
            className="inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-semibold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide active:scale-[0.98] transition-all duration-200 group"
          >
            <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform duration-200" />
            <span>VER VIDEO</span>
          </a>
        </div>
      </div>

      {/* Floating FeatureBar integrated at the foot of Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10 lg:mt-14">
        <FeatureBar />
      </div>
    </section>
  );
}
