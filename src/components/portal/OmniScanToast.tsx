import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  CreditCard,
  RefreshCw,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';

export interface ScanResultData {
  status: 'al_dia' | 'por_vencer' | 'con_deuda' | 'vencido' | 'rebote' | 'no_encontrado' | 'no_inscrito' | null;
  socio: {
    id: string;
    dni: string;
    nombre: string;
    plan: string;
    precio_plan?: number;
    turno?: string;
    saldo_pendiente?: number;
    dias_restantes?: number;
    fecha_fin?: string;
    fecha_limite_pago?: string | null;
  } | null;
  dni: string;
  message: string;
  timestamp: number;
  reboteMinutos?: number;
}

interface OmniScanToastProps {
  scanResult: ScanResultData | null;
  onClose: () => void;
  onCobrarDeuda?: (dni: string) => void;
  onRenovarPlan?: (dni: string) => void;
  onRenovar?: (socio: any) => void;
  onInscribirDni?: (dni: string) => void;
  onInscribir?: (dni: string) => void;
  onVerPerfil?: (dni: string) => void;
}

export default function OmniScanToast({
  scanResult,
  onClose,
  onCobrarDeuda,
  onRenovarPlan,
  onRenovar,
  onInscribirDni,
  onInscribir,
  onVerPerfil,
}: OmniScanToastProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Auto-cierre tras 8 segundos de inactividad
  useEffect(() => {
    if (!scanResult || !scanResult.status) return;

    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);

    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 8500);

    return () => {
      clearInterval(interval);
      clearTimeout(autoCloseTimer);
    };
  }, [scanResult, onClose]);

  if (!scanResult || !scanResult.status) return null;

  const { status, socio, dni } = scanResult;

  // Configuración de estilo y semáforo según el estado del cliente
  const config = {
    al_dia: {
      border: 'border-emerald-500/70',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      title: 'ACCESO AUTORIZADO',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    por_vencer: {
      border: 'border-yellow-400/80',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(250,204,21,0.35)]',
      badgeBg: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50',
      title: 'MEMBRESÍA POR VENCER',
      icon: Clock,
      iconColor: 'text-yellow-400',
    },
    con_deuda: {
      border: 'border-amber-500/70',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(245,158,11,0.35)]',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      title: 'ADELANTO PENDIENTE',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    vencido: {
      border: 'border-red-500/70',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(239,68,68,0.35)]',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40',
      title: 'MEMBRESÍA VENCIDA',
      icon: XCircle,
      iconColor: 'text-red-400',
    },
    rebote: {
      border: 'border-blue-500/70',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      title: 'ANTI-REBOTE ACTIVO',
      icon: Clock,
      iconColor: 'text-blue-400',
    },
    no_encontrado: {
      border: 'border-red-500/80',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(239,68,68,0.35)]',
      badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
      title: 'DNI NO REGISTRADO',
      icon: XCircle,
      iconColor: 'text-red-400',
    },
    no_inscrito: {
      border: 'border-red-500/80',
      bg: 'bg-zinc-950/95',
      glow: 'shadow-[0_0_40px_rgba(239,68,68,0.35)]',
      badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
      title: 'DNI NO REGISTRADO',
      icon: XCircle,
      iconColor: 'text-red-400',
    },
  }[status];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed top-4 right-4 z-50 max-w-lg w-[calc(100vw-2rem)] pointer-events-auto">
        <motion.div
          key={dni + scanResult.timestamp}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`rounded-3xl border-2 ${config.border} ${config.bg} ${config.glow} p-5 backdrop-blur-xl relative overflow-hidden`}
        >
          {/* Header del Toast */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${config.badgeBg}`}>
                    {config.title}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                    <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>Lector 2D</span>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Registrado hace <strong className="text-white">{secondsAgo}s</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo: Información del Atleta */}
          {socio ? (
            <div className="py-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black font-black text-xl font-display flex items-center justify-center shrink-0 shadow-md">
                  {socio.nombre ? socio.nombre[0].toUpperCase() : 'S'}
                </div>

                <div className="truncate flex-1">
                  <h3 className="text-base font-black text-white uppercase tracking-tight font-display truncate">
                    {socio.nombre}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 mt-0.5">
                    <span>DNI: <strong className="text-amber-400">{socio.dni}</strong></span>
                    {socio.turno && (
                      <span className="text-zinc-500">· Turno: <strong className="text-white uppercase">{socio.turno}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fila de Detalles: Plan & Saldo */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Plan Activo</div>
                  <div className="font-bold text-white truncate mt-0.5">{socio.plan}</div>
                </div>

                {status === 'con_deuda' && socio.saldo_pendiente ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="text-[10px] text-amber-300 uppercase tracking-wider">Saldo por Cobrar</div>
                    <div className="font-black text-amber-400 text-sm mt-0.5">
                      S/. {socio.saldo_pendiente.toFixed(2)}
                    </div>
                  </div>
                ) : status === 'vencido' ? (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="text-[10px] text-red-300 uppercase tracking-wider">Estado</div>
                    <div className="font-bold text-red-400 mt-0.5">
                      {socio.plan === 'Sin Membresía Activa' || !socio.plan || (socio.precio_plan ?? 0) === 0
                        ? 'Sin Plan Activo'
                        : socio.dias_restantes
                        ? `Venció hace ${Math.abs(socio.dias_restantes)}d`
                        : 'Membresía Vencida'}
                    </div>
                  </div>
                ) : status === 'rebote' ? (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="text-[10px] text-blue-300 uppercase tracking-wider">Último Ingreso</div>
                    <div className="font-bold text-blue-300 mt-0.5">
                      Hace {scanResult.reboteMinutos || 1} min
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-300 uppercase tracking-wider">Membresía</div>
                    <div className="font-bold text-emerald-400 mt-0.5">100% Al Día</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3.5 space-y-1">
              <p className="text-xs font-mono text-zinc-200">
                El DNI <strong className="text-amber-400 font-bold">{dni}</strong> leído por el escáner no coincide con ningún socio registrado en el padrón.
              </p>
              <p className="text-[11px] font-mono text-red-300">
                Acceso no autorizado. Inscribe al atleta para permitir su ingreso.
              </p>
            </div>
          )}

          {/* Acciones Rápidas */}
          <div className="pt-2 flex items-center gap-2">
            {status === 'con_deuda' && onCobrarDeuda && socio && (
              <button
                type="button"
                onClick={() => {
                  onCobrarDeuda(socio.dni);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cobrar Deuda (S/. {socio.saldo_pendiente?.toFixed(2)})</span>
              </button>
            )}

            {(status === 'vencido' || status === 'por_vencer') && (onRenovarPlan || onRenovar) && socio && (
              <button
                type="button"
                onClick={() => {
                  if (onRenovar) {
                    onRenovar(socio);
                  } else if (onRenovarPlan) {
                    onRenovarPlan(socio.dni);
                  }
                  onClose();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  status === 'por_vencer'
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                    : 'bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-red-500/30 ring-2 ring-red-400/50'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{status === 'por_vencer' ? 'Renovar con Anticipación' : 'Renovar Membresía'}</span>
              </button>
            )}

            {(status === 'no_encontrado' || status === 'no_inscrito') && (onInscribir || onInscribirDni) && (
              <button
                type="button"
                onClick={() => {
                  if (onInscribir) {
                    onInscribir(dni);
                  } else if (onInscribirDni) {
                    onInscribirDni(dni);
                  }
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:from-amber-400 text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/25 ring-2 ring-amber-400/60"
              >
                <User className="w-3.5 h-3.5" />
                <span>Inscribir Atleta con este DNI</span>
              </button>
            )}

            {socio && onVerPerfil && (
              <button
                type="button"
                onClick={() => {
                  onVerPerfil(socio.dni);
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Ficha</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
