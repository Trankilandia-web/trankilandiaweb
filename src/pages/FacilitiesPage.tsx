import React from 'react';
import {
  Check,
  Dumbbell,
  Volume2,
  Droplets,
  Lock,
  Waves,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FACILITY_ZONES } from '../data/gymData';
import type { FacilityZone } from '../types';

export interface FacilitiesPageProps {
  onOpenTourModal?: () => void;
}

interface ClubAmenity {
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  highlights: string[];
}

const CLUB_AMENITIES: ClubAmenity[] = [
  {
    title: 'Vestuarios y Duchas con Agua Caliente',
    badge: 'CONFORT & HIGIENE',
    icon: Droplets,
    description:
      'Duchas individuales con agua caliente para terminar tu rutina y continuar con tu día laboral o académico fresco y renovado.',
    highlights: [
      'Agua caliente constante',
      'Cabinas individuales de privacidad',
      'Lavamanos y espejos amplios',
      'Limpieza y desinfección permanente',
    ],
  },
  {
    title: 'Casilleros Diarios de Seguridad',
    badge: 'SEGURIDAD TOTAL',
    icon: Lock,
    description:
      'Lockers amplios para guardar mochilas, ropa de cambio y pertenencias personales mientras entrenas con total tranquilidad.',
    highlights: [
      'Espacio amplio para maletines y mochilas',
      'Seguridad y supervisión en recepción',
      'Uso gratuito diario durante tu rutina',
      'Zona ordenada y señalizada',
    ],
  },
  {
    title: 'Estación de Hidratación & Suplementos',
    badge: 'ENERGÍA Y RECUPERACIÓN',
    icon: Waves,
    description:
      'Puntos de agua fresca para rellenar tu termo y barra de bebidas rehidratantes, proteínas y snacks fitness para antes o después de entrenar.',
    highlights: [
      'Puntos de agua para rellenar botellas',
      'Bebidas isotónicas y rehidratantes',
      'Proteínas y suplementación deportiva',
      'Pre-entrenos y batidos energéticos',
    ],
  },
  {
    title: 'Sistema de Audio Motivacional & Iluminación',
    badge: 'ATMÓSFERA MOTIVADORA',
    icon: Volume2,
    description:
      'Música seleccionada para impulsarte en cada serie y repetición, junto a una iluminación clara que resalta tu esfuerzo en cada espejo.',
    highlights: [
      'Sonido envolvente en toda la sala de pesas',
      'Playlists de ritmo continuo para motivación',
      'Ventilación y flujo de aire constante',
      'Espacio amplio para no interrumpir tu rutina',
    ],
  },
];

export default function FacilitiesPage({
  onOpenTourModal,
}: FacilitiesPageProps = {}): React.JSX.Element {
  const handleOpenTour = () => {
    if (onOpenTourModal) {
      onOpenTourModal();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-display pt-28 pb-24 relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* Luces ambientales */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-400/10 blur-[160px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ========================================================= */}
        {/* 1. CABECERA EDITORIAL ARQUITECTÓNICA */}
        {/* ========================================================= */}
        <header className="pb-12 mb-16 border-b border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                ESPACIOS &amp; ZONAS DE ENTRENAMIENTO
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.95]">
                ESPACIOS PARA TU MEJOR VERSIÓN.
              </h1>
              <p className="mt-4 text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl font-sans">
                Distribución planificada para entrenar con fluidez, sin filas innecesarias ni esperas. Sala de musculación con ingreso libre, máquinas guiadas y área dedicada para clases de boxeo.
              </p>
            </div>

            {/* Ficha técnica resumida */}
            <div className="lg:col-span-4 bg-zinc-900/80 border border-white/10 p-5 rounded-2xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 mb-3 font-bold flex items-center justify-between">
                <span>SEDE PRINCIPAL</span>
                <span className="text-zinc-500 font-mono">TRANKILANDIA</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Modalidad:</span>
                  <span className="font-mono font-bold text-white">Ingreso Libre Ilimitado</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Sala de Fuerza:</span>
                  <span className="font-mono font-bold text-white">Pesas, Barras & Poleas</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Actividad Adicional:</span>
                  <span className="font-mono font-bold text-amber-400">Área & Clases de Boxeo</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Servicios:</span>
                  <span className="font-mono font-bold text-white">Duchas Calientes & Lockers</span>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. SHOWCASE DE ZONAS DEPORTIVAS (FACILITY_ZONES) */}
        {/* ========================================================= */}
        <section className="mb-28" aria-label="Zonas deportivas del club">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
                DISTRIBUCIÓN ZONIFICADA
              </span>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                ZONAS DE ENTRENAMIENTO
              </h2>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md font-sans">
              Cuatro ambientes complementarios diseñados para cubrir desde la sobrecarga pesada hasta la agilidad y técnica de combate.
            </p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {FACILITY_ZONES.map((zone: FacilityZone, index: number) => {
              const isEven = index % 2 === 0;
              const zoneNumber = String(index + 1).padStart(2, '0');

              return (
                <motion.article
                  key={zone.id}
                  id={zone.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="relative bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-sm hover:border-amber-400/30 transition-colors overflow-hidden group"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Fotografía de la zona */}
                    <div
                      className={`lg:col-span-6 ${
                        isEven ? 'lg:order-1' : 'lg:order-2'
                      }`}
                    >
                      <div className="relative aspect-4/3 lg:aspect-16/11 rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-zinc-950 group-hover:border-amber-400/30 transition-colors">
                        <img
                          src={zone.imageUrl}
                          alt={zone.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent" />

                        <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-white/15 text-amber-400 text-xs font-mono font-bold tracking-wider">
                          <span>{zone.badge}</span>
                        </div>

                        <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300">
                          ZONA {zoneNumber} / 04
                        </div>
                      </div>
                    </div>

                    {/* Contenido Editorial & Especificaciones */}
                    <div
                      className={`lg:col-span-6 flex flex-col justify-between ${
                        isEven ? 'lg:order-2' : 'lg:order-1'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
                            ZONA {zoneNumber}
                          </span>
                          <span className="w-8 h-px bg-white/20" />
                          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                            TRANKILANDIA CLUB
                          </span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-4">
                          {zone.title}
                        </h3>

                        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                          {zone.description}
                        </p>

                        {/* Bloque de Especificaciones de Maquinaria / Equipamiento */}
                        <div className="mb-6 pt-5 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-3.5">
                            <Dumbbell className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                              Equipamiento Destacado
                            </h4>
                          </div>

                          <ul className="space-y-2.5">
                            {zone.specs.map((spec, specIdx) => (
                              <li
                                key={specIdx}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300 font-sans"
                              >
                                <div className="w-4 h-4 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                                  <Check className="w-2.5 h-2.5 text-amber-400 stroke-[3]" />
                                </div>
                                <span className="leading-snug">{spec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Bloque de Amenidades de la Zona */}
                        <div className="pt-5 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                              Ventajas de la Zona
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {zone.amenities.map((amenity, amenIdx) => (
                              <span
                                key={amenIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-white/10 hover:border-amber-400/30 text-zinc-300 text-xs font-sans transition-colors"
                              >
                                <span className="w-1 h-1 rounded-full bg-amber-400" />
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Botón rápido de acción contextual */}
                      <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={handleOpenTour}
                          className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-400 hover:text-amber-300 transition-colors group/btn cursor-pointer"
                        >
                          <span>Visitar esta zona en persona</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </motion.button>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                          Ingreso libre
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. CUADRÍCULA DE AMENIDADES DEL CLUB */}
        {/* ========================================================= */}
        <section className="mb-28" aria-label="Comodidades del club">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
              SERVICIOS INCLUIDOS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-4">
              COMODIDADES DE NUESTRO GIMNASIO
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-sans">
              Queremos que cada visita sea cómoda, higiénica y enfocada en tu rendimiento físico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {CLUB_AMENITIES.map((amenity, idx) => {
              const Icon = amenity.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:border-amber-400/40 transition-colors group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-400/20 transition-all duration-300">
                        <Icon className="w-6 h-6 text-amber-400" />
                      </div>

                      <span className="px-2.5 py-1 rounded-md bg-zinc-950/80 border border-white/10 text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                        {amenity.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold uppercase text-white tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
                      {amenity.title}
                    </h3>

                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                      {amenity.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {amenity.highlights.map((item, hIdx) => (
                        <li
                          key={hIdx}
                          className="flex items-center gap-2 text-xs text-zinc-300 font-sans"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. BANNER DE CONVERSIÓN INFERIOR */}
        {/* ========================================================= */}
        <section
          className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 sm:p-12 lg:p-16 text-center shadow-2xl"
          aria-label="Agendar tour VIP"
        >
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-3">
              VEN A CONOCERNOS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight mb-4">
              Comprueba el Ambiente de Trankilandia Gym
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl mx-auto font-sans">
              Ven a conocer la sala de musculación, prueba las máquinas y consulta por las clases de boxeo. Te esperamos con los brazos abiertos.
            </p>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenTour}
              className="inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide shadow-xl shadow-amber-400/20 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>SOLICITAR PASE DE CORTESÍA</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </section>
      </div>
    </div>
  );
}
