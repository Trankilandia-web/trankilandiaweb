import { useState } from 'react';
import {
  Trophy,
  Dumbbell,
  Flame,
  Heart,
  Droplets,
  Calendar,
  Zap,
  Sparkles,
  Lock,
  Flag,
  Award,
} from 'lucide-react';
import { MedallaLogro, CategoriaMedalla, NivelMedalla } from '../../types/evaluacion';

interface MedallasLogroProps {
  medallas: MedallaLogro[];
  socioNombre?: string;
}

export default function MedallasLogro({ medallas }: MedallasLogroProps) {
  const [filtro, setFiltro] = useState<'todas' | CategoriaMedalla>('todas');

  if (!medallas || medallas.length === 0) {
    return null;
  }

  const desbloqueadasCount = medallas.filter((m) => m.desbloqueada).length;
  const totalCount = medallas.length;
  const progresoPct = Math.round((desbloqueadasCount / totalCount) * 100);

  // Filtrado
  const medallasFiltradas = medallas.filter((m) => {
    if (filtro === 'todas') return true;
    return m.categoria === filtro;
  });

  // Icon mapping
  const renderIcon = (icono: string, className: string) => {
    switch (icono) {
      case 'Dumbbell':
        return <Dumbbell className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'Droplets':
        return <Droplets className={className} />;
      case 'Calendar':
        return <Calendar className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Flag':
        return <Flag className={className} />;
      case 'Trophy':
      default:
        return <Trophy className={className} />;
    }
  };

  const getEstiloNivel = (nivel: NivelMedalla, desbloqueada: boolean) => {
    if (!desbloqueada) {
      return {
        cardBorder: 'border-white/5 bg-zinc-950/60 opacity-60',
        badgeBg: 'bg-zinc-800 text-zinc-500 border-zinc-700',
        iconColor: 'text-zinc-600',
        label: 'BLOQUEADA',
      };
    }

    switch (nivel) {
      case 'diamante':
        return {
          cardBorder:
            'border-cyan-400/50 bg-gradient-to-br from-cyan-950/30 via-zinc-900 to-zinc-950 shadow-lg shadow-cyan-500/10',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm shadow-cyan-400/20',
          iconColor: 'text-cyan-300',
          label: 'DIAMANTE',
        };
      case 'oro':
        return {
          cardBorder:
            'border-amber-400/50 bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950 shadow-lg shadow-amber-400/10',
          badgeBg: 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-sm shadow-amber-400/20',
          iconColor: 'text-amber-400',
          label: 'ORO',
        };
      case 'plata':
        return {
          cardBorder: 'border-zinc-400/40 bg-zinc-900/90 shadow-md shadow-zinc-400/5',
          badgeBg: 'bg-zinc-300/20 text-zinc-300 border-zinc-400/30',
          iconColor: 'text-zinc-300',
          label: 'PLATA',
        };
      case 'bronce':
      default:
        return {
          cardBorder: 'border-amber-700/40 bg-zinc-900/80 shadow-md shadow-amber-700/5',
          badgeBg: 'bg-amber-700/20 text-amber-500 border-amber-700/30',
          iconColor: 'text-amber-500',
          label: 'BRONCE',
        };
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
            <Award className="w-4 h-4" />
            <span>Gamificación & Hitos</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
            Tus Medallas y Logros
          </h4>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Desbloquea insignias automáticas con cada evaluación de bioimpedancia.
          </p>
        </div>

        {/* Contador de progreso */}
        <div className="flex items-center gap-3 bg-zinc-950 p-2.5 px-4 rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-mono font-black text-sm">
            {desbloqueadasCount}
          </div>
          <div className="font-mono text-xs">
            <span className="font-bold text-white block">
              {desbloqueadasCount} de {totalCount} Desbloqueadas
            </span>
            <div className="w-24 bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de categoría */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { key: 'todas', label: 'Todas' },
          { key: 'musculo', label: 'Músculo' },
          { key: 'grasa', label: 'Grasa' },
          { key: 'salud', label: 'Salud' },
          { key: 'constancia', label: 'Constancia' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFiltro(tab.key as any)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer font-bold ${
              filtro === tab.key
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de Medallas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {medallasFiltradas.map((medalla) => {
          const estilo = getEstiloNivel(medalla.nivel, medalla.desbloqueada);
          const progresoPctBarra = Math.min(
            100,
            Math.max(5, Math.round((medalla.progresoActual / (medalla.metaNivel || 1)) * 100))
          );

          return (
            <div
              key={medalla.id}
              className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${estilo.cardBorder}`}
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        medalla.desbloqueada
                          ? 'bg-zinc-950 border-white/10'
                          : 'bg-zinc-900 border-white/5'
                      }`}
                    >
                      {medalla.desbloqueada ? (
                        renderIcon(medalla.icono, `w-4 h-4 ${estilo.iconColor}`)
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase inline-block ${estilo.badgeBg}`}
                      >
                        {estilo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Título y descripción */}
                <h5
                  className={`text-sm font-black uppercase font-display tracking-tight leading-tight mb-1 ${
                    medalla.desbloqueada ? 'text-white' : 'text-zinc-500'
                  }`}
                >
                  {medalla.titulo}
                </h5>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {medalla.descripcion}
                </p>
              </div>

              {/* Barra de progreso si está bloqueada */}
              {!medalla.desbloqueada && !medalla.esSecreta && (
                <div className="mt-3 pt-2.5 border-t border-white/5 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>Avance:</span>
                    <span>
                      {medalla.progresoActual} / {medalla.metaNivel} {medalla.unidad}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400/60 h-1.5 rounded-full"
                      style={{ width: `${progresoPctBarra}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tag para secretas bloqueadas */}
              {!medalla.desbloqueada && medalla.esSecreta && (
                <div className="mt-3 pt-2 border-t border-white/5 font-mono text-[10px] text-amber-400/70 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Trofeo misterioso oculto</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
