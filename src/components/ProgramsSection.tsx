import type { ElementType } from 'react';
import { Dumbbell, Flame, Zap, HeartPulse, ArrowRight } from 'lucide-react';
import { PROGRAMS_DATA } from '../data/gymData';
import type { IconName } from '../types';

const ICON_MAP: Record<IconName, ElementType> = {
  Dumbbell,
  Award: Dumbbell,
  ClipboardList: Dumbbell,
  Users: Dumbbell,
  Flame,
  Activity: Zap,
  Zap,
  HeartPulse,
  MapPin: Dumbbell,
  Phone: Dumbbell,
  Mail: Dumbbell,
  Clock: Dumbbell,
};

export default function ProgramsSection() {
  return (
    <section id="programas" className="py-24 bg-zinc-950 relative">
      {/* Subtle ambient lighting */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-400/5 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 pb-6 border-b border-white/10">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
              DISCIPLINAS & METODOLOGÍA
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white uppercase leading-none">
              PROGRAMAS DE ALTO IMPACTO.
            </h2>
          </div>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md font-sans">
            Sobrecarga progresiva, acondicionamiento metabólico y movilidad guiada por entrenadores certificados.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROGRAMS_DATA.map((program) => {
            const Icon = ICON_MAP[program.iconName] || Dumbbell;

            return (
              <article
                key={program.id}
                className="group flex flex-col bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-amber-400/5"
              >
                {/* Image Container with Zoom */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={program.imageUrl}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                  {/* Category Tag Badge */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">
                    {program.tag}
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col flex-1 p-6 justify-between">
                  <div>
                    {/* Icon & Subtitle Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:border-amber-400/40 group-hover:bg-amber-400/15 transition-colors">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-medium">
                        {program.subtitle}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">
                      {program.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                      {program.description}
                    </p>
                  </div>

                  {/* Interactive CTA Link */}
                  <div className="pt-6 mt-6 border-t border-white/5">
                    <a
                      href="/clases"
                      aria-label={`Ver horarios para ${program.title}`}
                      className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-amber-400 group-hover:text-amber-300 transition-colors"
                    >
                      <span>VER HORARIOS &amp; CLASES</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" strokeWidth={2.5} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
