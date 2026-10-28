import React from 'react';
import {
  Check,
  Dumbbell,
  Calendar,
  Volume2,
  Droplets,
  Lock,
  Waves,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
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
    title: 'Vestuarios y Regaderas de Alta Presión',
    badge: 'CONFORT & PRIVACIDAD',
    icon: Droplets,
    description:
      'Cabinas individuales de ducha con control termostático digital y presión regulada. Acabados en piedra volcánica, dispensadores de jabón y champú botánico orgánico, y secadores iónicos profesionales.',
    highlights: [
      'Presión constante termorregulada a 38°C',
      'Servicio de toallas limpias ilimitadas',
      'Amenidades biodegradables libres de sulfatos',
      'Cabinas de secado rápido y cambiadores privados',
    ],
  },
  {
    title: 'Casilleros con Cerradura Digital Inteligente',
    badge: 'SEGURIDAD TOTAL',
    icon: Lock,
    description:
      'Lockers amplios construidos en acero de alto calibre con teclado numérico biométrico de combinación libre. Entrena sin preocuparte por llaves, candados externos ni pérdidas.',
    highlights: [
      'Cierre y apertura por PIN numérico personalizable',
      'Capacidad para maletas deportivas de viaje',
      'Puertos USB-C interiores para recarga de dispositivos',
      'Monitoreo perimetral y supervisión de accesos',
    ],
  },
  {
    title: 'Estación de Hidratación Purificada Alcalina',
    badge: 'REHIDRATACIÓN CELULAR',
    icon: Waves,
    description:
      'Fuentes automatizadas "hands-free" con filtración por ósmosis inversa de 5 fases, agua alcalina mineralizada con electrolitos biodisponibles y refrigeración constante a 8°C.',
    highlights: [
      'Filtración por ósmosis inversa de 5 etapas',
      'pH balanceado alcalino optimizado (pH 8.5)',
      'Agua purificada libre de cloro y microplásticos',
      'Boquillas higiénicas con sensor sin contacto',
    ],
  },
  {
    title: 'Sistema de Audio Envolvente Acústico y WiFi 6',
    badge: 'ATMÓSFERA INMERSIVA',
    icon: Volume2,
    description:
      'Tratamiento arquitectónico fonoabsorbente que elimina reverberaciones y ecos, combinado con un sistema de sonido focalizado de alta fidelidad y red Wi-Fi 6 de fibra simétrica.',
    highlights: [
      'Paneles fonoabsorbentes acústicos de alta densidad',
      'Altavoces de estudio Genelec distribuidos por zonas',
      'Conectividad Wi-Fi 6 de gigabit sin zonas muertas',
      'Playlists de ritmo calibrado para concentración y bombeo',
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
      {/* Luces ambientales cinemáticas de fondo */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-400/10 blur-[160px] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-[1200px] -left-40 w-[600px] h-[600px] bg-amber-400/5 blur-[180px] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-40 -right-40 w-[600px] h-[600px] bg-amber-400/5 blur-[180px] rounded-full pointer-events-none"
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
                ESPECIFICACIÓN ARQUITECTÓNICA & BIOMECÁNICA
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.95]">
                1,500 M² DE PRECISIÓN BIOMECÁNICA.
              </h1>
              <p className="mt-4 text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl font-sans">
                Distribución espacial planificada para erradicar cuellos de botella y maximizar el flujo de entrenamiento continuo. Equipamiento oficial de alta competencia calibrado milimétricamente.
              </p>
            </div>

            {/* Ficha técnica resumida estilo blueprint */}
            <div className="lg:col-span-4 bg-zinc-900/80 border border-white/10 p-5 rounded-2xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 mb-3 font-bold flex items-center justify-between">
                <span>ESTÁNDAR DEL COMPLEJO</span>
                <span className="text-zinc-500">REV. 2026</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Superficie Total:</span>
                  <span className="font-mono font-bold text-white">1,500 m²</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Maquinaria Oficial:</span>
                  <span className="font-mono font-bold text-white">Eleiko & Hammer Strength</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-400">Zona Húmeda:</span>
                  <span className="font-mono font-bold text-white">Sauna Finlandés & Spa</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Climatización:</span>
                  <span className="font-mono font-bold text-white">Microfiltrado HEPA 22°C</span>
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
              <span className="text-amber-400 text-xs font-mono font-bold tracking-widest uppercase block mb-1">
                DISTRIBUCIÓN ZONIFICADA
              </span>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                ZONAS DEPORTIVAS DE ALTO RENDIMIENTO
              </h2>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md font-sans">
              Cuatro ecosistemas complementarios diseñados para cubrir desde la sobrecarga pesada
              hasta la regeneración celular acelerada.
            </p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {FACILITY_ZONES.map((zone: FacilityZone, index: number) => {
              const isEven = index % 2 === 0;
              const zoneNumber = String(index + 1).padStart(2, '0');

              return (
                <article
                  key={zone.id}
                  id={zone.id}
                  className="relative bg-zinc-900/30 border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-sm hover:border-amber-400/30 transition-all duration-500 overflow-hidden group"
                >
                  {/* Gradiente sutil reactivo al hover */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/[0.03] group-hover:bg-amber-400/[0.07] blur-[100px] pointer-events-none transition-all duration-700 rounded-full" />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Fotografía de alta fidelidad */}
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
                        {/* Gradientes oscuros cinematográficos */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent" />

                        {/* Badge de categoría en la imagen */}
                        <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/15 text-amber-400 text-xs font-mono font-bold tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {zone.badge}
                        </div>

                        {/* Numeración en la esquina inferior */}
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
                        {/* Eyebrow de la zona */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
                            ZONA {zoneNumber}
                          </span>
                          <span className="w-8 h-px bg-white/20" />
                          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                            TRANKILANDIA CLUB
                          </span>
                        </div>

                        {/* Título y Descripción */}
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
                              Especificaciones de Maquinaria & Equipamiento
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
                              Amenidades de la Zona
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {zone.amenities.map((amenity, amenIdx) => (
                              <span
                                key={amenIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-white/10 hover:border-amber-400/30 text-zinc-300 text-xs font-sans transition-colors"
                              >
                                <span className="w-1 h-1 rounded-full bg-amber-400/80" />
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Botón rápido de acción contextual */}
                      <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleOpenTour}
                          className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-400 hover:text-amber-300 transition-colors group/btn"
                        >
                          <span>Conocer esta zona en tour guiado</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline">
                          Capacidad optimizada
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. CUADRÍCULA DE AMENIDADES DEL CLUB */}
        {/* ========================================================= */}
        <section className="mb-28" aria-label="Amenidades premium del club">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
                SERVICIOS PREMIUM INCLUIDOS
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-4">
              AMENIDADES INTEGRALES DEL CLUB
            </h2>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-sans">
              Cada sesión comienza y concluye en un entorno diseñado para maximizar tu confort,
              seguridad y concentración. La experiencia Trankilandia va más allá de las máquinas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {CLUB_AMENITIES.map((amenity, idx) => {
              const Icon = amenity.icon;
              return (
                <div
                  key={idx}
                  className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:border-amber-400/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-400/20 transition-all duration-300">
                        <Icon className="w-6 h-6 text-amber-400" />
                      </div>

                      <span className="px-2.5 py-1 rounded-md bg-zinc-950/80 border border-white/10 text-[10px] font-mono font-bold tracking-wider text-amber-400/90 uppercase">
                        {amenity.badge}
                      </span>
                    </div>

                    {/* Título y descripción */}
                    <h3 className="text-xl font-bold uppercase text-white tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
                      {amenity.title}
                    </h3>

                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                      {amenity.description}
                    </p>
                  </div>

                  {/* Highlights de la amenidad */}
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
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. BANNER DE CONVERSIÓN INFERIOR */}
        {/* ========================================================= */}
        <section
          className="relative bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border border-amber-400/25 rounded-3xl p-8 sm:p-12 lg:p-16 text-center backdrop-blur-md overflow-hidden shadow-2xl"
          aria-label="Agendar tour VIP"
        >
          {/* Acento lumínico superior */}
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-amber-400/20 blur-[120px] rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Tag superior */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 mb-6">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
                ACCESO EXCLUSIVO
              </span>
            </div>

            {/* Titular */}
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-6 leading-tight">
              ¿Quieres sentir la energía de Trankilandia Gym en persona?
            </h2>

            {/* Texto descriptivo */}
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl mx-auto font-sans">
              Recorre nuestras 4 zonas deportivas, prueba la biomecánica de nuestras máquinas Hammer
              Strength y Eleiko, y recibe una asesoría personalizada de objetivos con uno de nuestros
              Head Coaches. Sin costo ni compromiso.
            </p>

            {/* Botón CTA exacto */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleOpenTour}
                className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide inline-flex items-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-400/10"
              >
                <span>AGENDAR TOUR VIP PRIVADO</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Microcopia de confianza */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Reserva confirmada por WhatsApp
              </span>
              <span>•</span>
              <span>Duración aprox: 30 minutos</span>
              <span>•</span>
              <span>Aforo controlado por horario</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
