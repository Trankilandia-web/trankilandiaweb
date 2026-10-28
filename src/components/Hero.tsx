import { Link } from 'react-router-dom';
import { ArrowRight, Ticket, CheckCircle2, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export interface HeroProps {
  onOpenTourModal?: () => void;
}

export default function Hero({ onOpenTourModal }: HeroProps = {}) {
  return (
    <section
      id="inicio"
      className="relative min-h-[85vh] lg:min-h-[88vh] flex items-center overflow-hidden pt-28 pb-16 selection:bg-amber-400 selection:text-black"
    >
      {/* Background athlete photo with dark cinematic overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=85"
          alt="Entrenamiento de fuerza en Trankilandia Gym Ayacucho"
          className="w-full h-full object-cover object-center lg:object-[center_top] brightness-[0.60] select-none"
          loading="eager"
        />
        {/* Horizontal gradient: deep black on the left for maximum text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/40" />
        {/* Vertical bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      </div>

      {/* Main Hero Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.1,
            },
          },
        }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto"
      >
        {/* Brand Tag with Real Location */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 mb-5 flex items-center gap-2.5 flex-wrap"
        >
          <span className="w-6 h-px bg-amber-400" />
          <span className="text-amber-400 font-bold">TRANKILANDIA GYM</span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1 text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            HUAMANGA, AYACUCHO
          </span>
        </motion.div>

        {/* H1: Authentic motto and impact */}
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 14, scale: 0.98 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.96] text-white max-w-3xl"
        >
          MÁS QUE UN GIMNASIO,<br />
          <span className="text-amber-400">SOMOS FAMILIA.</span>
        </motion.h1>

        {/* Subtext: Clear, honest, highlighting free entry and boxing */}
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-5 text-base sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed font-sans"
        >
          Tu centro de musculación y acondicionamiento en Ayacucho. Todos nuestros planes cuentan con <strong>ingreso libre e ilimitado</strong> en sala de pesas, máquinas guiadas y la opción de sumar <strong>clases adicionales de boxeo</strong>.
        </motion.p>

        {/* Real Key Pillars */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-zinc-300"
        >
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Ingreso Libre sin límite de turno</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Planes en Soles: Mes, Trimestre, Semestre y Año</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Clases de Boxeo adicionales</span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
        >
          <Link to="/planes">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-7 py-4 rounded-xl text-sm sm:text-base tracking-wide shadow-xl shadow-amber-400/20 cursor-pointer"
            >
              <span>VER PLANES EN SOLES</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            onClick={onOpenTourModal}
            className="inline-flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-semibold px-7 py-4 rounded-xl text-sm sm:text-base tracking-wide cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>SOLICITAR DÍA DE PRUEBA</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
