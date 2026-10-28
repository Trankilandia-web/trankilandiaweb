import { Link } from 'react-router-dom';
import { ArrowRight, Ticket } from 'lucide-react';
import { motion } from 'motion/react';

export interface HeroProps {
  onOpenTourModal?: () => void;
}

export default function Hero({ onOpenTourModal }: HeroProps = {}) {
  return (
    <section
      id="inicio"
      className="relative min-h-[85vh] lg:min-h-[88vh] flex items-center overflow-hidden pt-24 pb-16 selection:bg-amber-400 selection:text-black"
    >
      {/* Background athlete photo with dark cinematic overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=85"
          alt="Entrenamiento y comunidad en Trankilandia Gym"
          className="w-full h-full object-cover object-center lg:object-[center_top] brightness-[0.52] select-none"
          loading="eager"
        />
        {/* Horizontal gradient: deep black on the left for maximum text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/40" />
        {/* Vertical bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
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
        {/* Club Brand Tag */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 mb-5 flex items-center gap-2.5 flex-wrap"
        >
          <span className="w-8 h-px bg-amber-400" />
          <span className="text-amber-400 font-bold">TRANKILANDIA CLUB</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">CENTRO DE ENTRENAMIENTO & BOXEO</span>
        </motion.div>

        {/* H1: World-class Gym Power & Energy */}
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 14, scale: 0.98 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.92] text-white max-w-4xl"
        >
          ENTRENA DURO.<br />
          <span className="text-amber-400">SUPÉRATE CADA DÍA.</span>
        </motion.h1>

        {/* Subtext: Concise, athletic, community-driven (<= 20 words per taste skill) */}
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-6 text-base sm:text-lg text-zinc-300 max-w-xl font-normal leading-relaxed font-sans"
        >
          Musculación de alto nivel, peso libre y escuela de boxeo. Más que un gimnasio, una familia que te impulsa a romper tus límites.
        </motion.p>

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
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-black font-black px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide shadow-xl shadow-amber-400/20 cursor-pointer"
            >
              <span>VER PLANES Y PRECIOS</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            onClick={onOpenTourModal}
            className="inline-flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-bold px-7 py-4 rounded-xl text-sm sm:text-base tracking-wide cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>SOLICITAR CLASE GRATIS</span>
          </motion.button>
        </motion.div>

        {/* Athletic Proof Metrics Strip (Equinox / Gold's Gym style) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-lg"
        >
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">LIBRE</div>
            <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Sin turnos ni límites</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">BOXEO</div>
            <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Escuela & Ring</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">+500</div>
            <div className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Atletas en comunidad</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
