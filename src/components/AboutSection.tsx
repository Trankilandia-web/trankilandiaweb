import { ArrowRight } from 'lucide-react';
import { ABOUT_DATA } from '../data/gymData';

export default function AboutSection() {
  return (
    <section id="nosotros" className="py-24 bg-zinc-900/40 border-y border-white/5 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/5 blur-[140px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Columna Izquierda (Visual de Instalaciones) */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl group bg-zinc-900">
              <div className="aspect-[4/3] sm:aspect-[16/11] overflow-hidden">
                <img
                  src={ABOUT_DATA.imageUrl}
                  alt="Instalaciones de élite de Trankilandia Gym"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Overlay de viñeta oscura */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Badge flotante interior estilizado - branding ambiental */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 p-4 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                      TRANKILANDIA CLUB
                    </p>
                    <p className="text-[11px] text-zinc-400 font-sans tracking-wide">
                      INSTALACIONES DE ÉLITE
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-white/5 border border-white/10 text-zinc-300">
                  ZONA FITNESS
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha (Manifiesto y Métricas) */}
          <div className="flex flex-col items-start">
            {/* Athletic Brand Tag */}
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
              FILOSOFÍA DEL CLUB
            </span>

            {/* H2 Display */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase leading-[0.95]">
              MÁS QUE UN GIMNASIO, <br className="hidden sm:inline" />
              UN CENTRO DE ALTO RENDIMIENTO.
            </h2>

            {/* Manifiesto */}
            <div className="mt-6 space-y-4 text-zinc-400 text-base leading-relaxed">
              {ABOUT_DATA.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* 3 Métricas de autoridad */}
            <div className="grid grid-cols-3 gap-4 my-8 p-4 sm:p-5 w-full rounded-2xl bg-zinc-950/70 border border-white/10 text-center">
              {ABOUT_DATA.stats.map((stat, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center justify-center ${
                    index > 0 ? 'border-l border-white/10 pl-2' : ''
                  }`}
                >
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-[11px] sm:text-xs text-zinc-400 uppercase tracking-wider font-sans mt-1.5 leading-snug">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={ABOUT_DATA.ctaHref}
              className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-7 py-3.5 rounded-xl text-sm uppercase tracking-wider inline-flex items-center gap-2 active:scale-[0.98] transition-all group shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20"
            >
              <span>{ABOUT_DATA.ctaText}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
