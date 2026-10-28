import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, ChevronDown, Sparkles, MapPin } from 'lucide-react';

interface HourlyOccupancy {
  hour: string;
  occupancy: number; // percentage 0 - 100
  isCurrent?: boolean;
}

const HOURLY_DATA: HourlyOccupancy[] = [
  { hour: '06:00', occupancy: 30 },
  { hour: '07:00', occupancy: 65 },
  { hour: '08:00', occupancy: 55 },
  { hour: '10:00', occupancy: 35 },
  { hour: '12:00', occupancy: 40 },
  { hour: '14:00', occupancy: 45 },
  { hour: '16:00', occupancy: 50 },
  { hour: '18:00', occupancy: 85 }, // Pico tarde
  { hour: '19:00', occupancy: 90, isCurrent: true }, // Pico actual
  { hour: '20:00', occupancy: 70 },
  { hour: '21:00', occupancy: 45 },
  { hour: '22:00', occupancy: 20 },
];

export interface LiveCapacityBarProps {
  onOpenTourModal?: () => void;
}

export default function LiveCapacityBar({ onOpenTourModal }: LiveCapacityBarProps): React.JSX.Element {
  const [showSchedule, setShowSchedule] = useState(false);
  const currentOccupancy = 42; // Real-time simulated reading

  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur-md border-y border-white/10 py-3.5 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Sede Info + Live Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                EN VIVO
              </span>
            </div>

            <span className="text-zinc-600 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5 text-zinc-300 text-xs sm:text-sm">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">Sede Central Insurgentes</span>
              <span className="text-zinc-500 text-xs hidden md:inline">· Abierto hasta las 23:00 hrs</span>
            </div>
          </div>

          {/* Occupancy Indicator & Interactive Heatmap Button */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400 font-medium">Afluencia actual:</span>
                  <span className="font-mono font-bold text-amber-400">{currentOccupancy}%</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Tránsito fluido
                  </span>
                </div>
                {/* Progress bar visual */}
                <div className="w-36 sm:w-48 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentOccupancy}%` }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  />
                </div>
              </div>
            </div>

            {/* Toggle Heatmap */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSchedule(!showSchedule)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 border border-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{showSchedule ? 'Ocultar horas pico' : 'Curva de horas pico'}</span>
              <motion.span
                animate={{ rotate: showSchedule ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.span>
            </motion.button>

            {/* Quick Guest Pass trigger */}
            {onOpenTourModal && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onOpenTourModal}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apartar Día de Prueba</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Expandable Heatmap of Occupancy (Smart Fit reference) */}
        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-3 text-xs text-zinc-400">
                  <span className="font-mono uppercase tracking-wider text-[11px] text-zinc-400">
                    Afluencia Promedio por Horario Hoy (Lunes a Viernes)
                  </span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>&lt;45% Ideal</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>45-75% Moderado</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>&gt;75% Alta afluencia</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {HOURLY_DATA.map((item) => {
                    const isPeak = item.occupancy >= 75;
                    const isModerate = item.occupancy >= 45 && item.occupancy < 75;
                    const barColor = isPeak
                      ? 'bg-rose-500'
                      : isModerate
                      ? 'bg-amber-400'
                      : 'bg-emerald-500';

                    return (
                      <div
                        key={item.hour}
                        className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                          item.isCurrent
                            ? 'bg-amber-400/10 border-amber-400/50'
                            : 'bg-zinc-800/50 border-white/5'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-medium text-zinc-400">
                          {item.hour}
                        </span>
                        <div className="w-full bg-zinc-950 h-10 rounded my-1 flex items-end p-0.5">
                          <motion.div
                            className={`w-full rounded-xs ${barColor}`}
                            initial={{ height: 0 }}
                            animate={{ height: `${item.occupancy}%` }}
                            transition={{ duration: 0.5, delay: 0.05 }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white">
                          {item.occupancy}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
