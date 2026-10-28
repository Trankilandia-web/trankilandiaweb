import type { ElementType } from 'react';
import { Dumbbell, Award, ClipboardList, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { FEATURE_HIGHLIGHTS } from '../data/gymData';
import type { IconName } from '../types';

const ICON_MAP: Record<IconName, ElementType> = {
  Dumbbell,
  Award,
  ClipboardList,
  Users,
  Flame: Dumbbell,
  Activity: Dumbbell,
  Zap: Dumbbell,
  HeartPulse: Dumbbell,
  MapPin: Dumbbell,
  Phone: Dumbbell,
  Mail: Dumbbell,
  Clock: Dumbbell,
};

export default function FeatureBar() {
  return (
    <div className="w-full" aria-label="Ventajas principales de Trankilandia Gym">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURE_HIGHLIGHTS.map((feature) => {
          const IconComponent = ICON_MAP[feature.iconName] || Dumbbell;

          return (
            <motion.div
              key={feature.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-amber-400/40 transition-colors flex items-start gap-4 group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-105 group-hover:border-amber-400/40 transition-transform duration-300">
                <IconComponent className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-white font-bold text-base font-display tracking-tight leading-snug">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
