import { motion } from 'motion/react';
import {
  UtensilsCrossed,
  Dumbbell,
  HeartPulse,
  ClipboardList,
  Flame,
  Music,
  Bike,
  Activity,
  Package,
  CheckCircle2,
  Users,
  MapPin,
  Phone,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { OFFICIAL_BENEFITS, COACH_TEAM_INFO, GYM_CONTACT } from '../data/gymData';

export default function OfficialBenefitsSection() {
  const getBenefitIcon = (id: string) => {
    switch (id) {
      case 'asesoria-nutricional':
        return UtensilsCrossed;
      case 'maquinas-musculacion':
        return Dumbbell;
      case 'maquinas-cardiovasculares':
        return HeartPulse;
      case 'rutinas-personalizadas':
        return ClipboardList;
      case 'aerobicos-grupal':
        return Flame;
      case 'baile-grupal':
        return Music;
      case 'spinning-grupal':
        return Bike;
      case 'funcional-grupal':
        return Activity;
      case 'complementos-nutricionales':
        return Package;
      case 'control-continuo':
      default:
        return CheckCircle2;
    }
  };

  const cleanPhone = GYM_CONTACT.phone.replace(/[^0-9]/g, '');

  return (
    <section className="bg-zinc-950 py-20 sm:py-28 border-t border-white/10 relative overflow-hidden">
      {/* Ambient Glow Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MÁS QUE UN GIMNASIO · MÁS CERCA DE TI</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
            BENEFICIOS EXCLUSIVOS <span className="text-amber-400">TRANKILANDIA</span>
          </h2>

          <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
            Máquinas modernas, planes accesibles y un acompañamiento integral para lograr tus objetivos físicos y de salud en Huamanga.
          </p>
        </div>

        {/* 10 Official Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {OFFICIAL_BENEFITS.map((benefit, index) => {
            const IconComponent = getBenefitIcon(benefit.id);
            return (
              <motion.div
                key={benefit.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.4)' }}
                className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between group transition-all duration-200 backdrop-blur-sm relative overflow-hidden"
              >
                {/* Number Badge Top Right */}
                <div className="absolute top-3.5 right-3.5 text-zinc-600 group-hover:text-amber-400/50 font-mono font-black text-xs transition-colors">
                  #{benefit.number}
                </div>

                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 mb-3.5 group-hover:bg-amber-400 group-hover:text-black transition-colors duration-200">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                    {benefit.category}
                  </span>

                  <h3 className="text-sm font-extrabold text-white uppercase tracking-tight font-display leading-snug">
                    {benefit.title}
                  </h3>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2.5 font-sans leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Staff Callout Banner (Official Flyer: 4 Entrenadores 2 mujeres - 2 varones) */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-black text-amber-400 flex items-center justify-center shrink-0 shadow-xl">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-black/80 block">
                  {COACH_TEAM_INFO.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black font-display mt-0.5">
                  {COACH_TEAM_INFO.headline}
                </h3>
                <p className="text-xs sm:text-sm font-sans font-medium text-black/90 max-w-2xl mt-1">
                  {COACH_TEAM_INFO.subheadline}
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${cleanPhone}?text=Hola%20Trankilandia%20Gym,%20deseo%20información%20sobre%20los%20planes%20y%20entrenadores.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-black hover:bg-zinc-900 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all shadow-xl cursor-pointer self-start md:self-auto shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Contactar por WhatsApp</span>
            </a>
          </div>
        </motion.div>

        {/* Official Sedes Cards (Flyer: 2 Sedes en Huamanga, Ayacucho) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  SEDE PRINCIPAL · PUEBLO LIBRE
                </span>
                <h4 className="text-base font-bold text-white font-display uppercase tracking-tight mt-0.5">
                  Vía Libertadores - Pueblo Libre
                </h4>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  Referencia: Reservorio, bajar en la entrada Ruta 3.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-3 border-t border-white/10">
              <span>Huamanga, Ayacucho</span>
              <span className="text-emerald-400 font-bold">ABIERTO DESDE 6:00 AM</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-amber-400/30 flex flex-col justify-between space-y-4 shadow-lg shadow-amber-400/5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-400 text-black shrink-0 font-black">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  SEGUNDA SEDE · EMADI
                </span>
                <h4 className="text-base font-bold text-white font-display uppercase tracking-tight mt-0.5">
                  Al frente del Hotel Internacional - José Olaya N° 640
                </h4>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  Máquinas modernas de musculación, aeróbicos, baile, spinning y funcional.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5 text-white">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Central: 999-787-489</span>
              </span>
              <span className="text-emerald-400 font-bold">SEGUNDA SEDE ACTIVA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
