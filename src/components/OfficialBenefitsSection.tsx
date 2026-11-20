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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
            BENEFICIOS EXCLUSIVOS <span className="text-amber-400">TRANKILANDIA</span>
          </h2>

          <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
            Máquinas modernas, planes accesibles y un acompañamiento integral para lograr tus objetivos físicos y de salud en Huamanga.
          </p>
        </div>

        {/* 10 Official Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
          {OFFICIAL_BENEFITS.map((benefit) => {
            const IconComponent = getBenefitIcon(benefit.id);
            return (
              <div
                key={benefit.id}
                className="border-t border-white/10 py-5 flex items-start gap-4"
              >
                <IconComponent className="w-5 h-5 shrink-0 text-amber-400 mt-1" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {benefit.title}
                  </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  {benefit.description}
                </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Staff Callout Banner (Official Flyer: 4 Entrenadores 2 mujeres - 2 varones) */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black p-6 sm:p-8 shadow-2xl relative overflow-hidden"
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

        {/* Official Sede Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/80 border border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-amber-400/5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-400 text-black shrink-0 font-black shadow-lg shadow-amber-400/20">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  SEDE OFICIAL · EMADI
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wide">
                  SEDE ACTIVA
                </span>
              </div>
              <h4 className="text-base sm:text-xl font-bold text-white font-display uppercase tracking-tight mt-1">
                José Olaya N° 640 (Frente al Hotel Internacional)
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
                Huamanga, Ayacucho · Máquinas modernas de musculación, aeróbicos, baile, spinning y funcional.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
            <div className="text-xs font-mono text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Central: 999-787-489</span>
              </div>
              <div className="text-emerald-400 font-semibold">
                ABIERTO DESDE 6:00 AM
              </div>
            </div>
            <a
              href="https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20deseo%20visitar%20la%20Sede%20Emadi."
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
            >
              <span>Ver Ubicación</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
