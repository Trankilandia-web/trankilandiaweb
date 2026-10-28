import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import FeatureBar from './FeatureBar';

export interface HeroProps {
  onOpenTourModal?: () => void;
}

export default function Hero({ onOpenTourModal }: HeroProps = {}) {
  return (
    <section
      id="inicio"
      className="relative min-h-[100dvh] flex flex-col justify-between overflow-hidden pt-28 sm:pt-32 lg:pt-36 pb-8 sm:pb-12"
    >
      {/* Background athlete photo with dark cinematic overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=85"
          alt="Atleta de élite entrenando con mancuerna en Trankilandia Gym"
          className="w-full h-full object-cover object-center lg:object-[center_top] brightness-[0.70] select-none"
          loading="eager"
        />
        {/* Horizontal gradient: deep black on the left for maximum text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-transparent" />
        {/* Vertical bottom gradient: seamless transition into lower sections */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        {/* Subtle overall dark vignette */}
        <div className="absolute inset-0 bg-zinc-950/30" />
      </div>

      {/* Main Hero Content with Motion stagger */}
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
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-8 lg:py-12"
      >
        {/* Athletic Brand Tag */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 mb-6 flex items-center gap-3"
        >
          <span className="w-8 h-px bg-amber-400" />
          <span>TRANKILANDIA CLUB · ALTO RENDIMIENTO BIOMECÁNICO</span>
        </motion.div>

        {/* H1: Raw athletic impact */}
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 16, scale: 0.98 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.92] text-white max-w-4xl"
        >
          CONSTRUYE FUERZA.<br />
          SUPERA TUS LÍMITES.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-6 text-base sm:text-lg md:text-xl text-zinc-300 max-w-xl font-normal leading-relaxed"
        >
          Equipamiento oficial Eleiko y Hammer Strength, entrenadores certificados y un ecosistema diseñado para maximizar tu disciplina física y mental.
        </motion.p>

        {/* Action Buttons with Emil Kowalski responsive active scale */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
          }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
        >
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            onClick={onOpenTourModal}
            className="inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 group whitespace-nowrap cursor-pointer"
          >
            <span>AGENDAR TOUR VIP GRATIS</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" strokeWidth={2} />
          </motion.button>

          <Link to="/instalaciones">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="inline-flex w-full items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-semibold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide group whitespace-nowrap cursor-pointer"
            >
              <Building2 className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-200" strokeWidth={2} />
              <span>EXPLORAR INSTALACIONES</span>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating FeatureBar integrated at the foot of Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10 lg:mt-14">
        <FeatureBar />
      </div>
    </section>
  );
}
