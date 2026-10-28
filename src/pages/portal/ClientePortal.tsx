import {
  Dumbbell,
  CreditCard,
  MessageCircle,
  Flame,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import { useAuth } from '../../context/AuthContext';

export default function ClientePortal() {
  const { user } = useAuth();

  const memberName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Luis Gerardo Llocclla';
  const memberEmail = user?.email || 'luisgerardolloccllasaune@gmail.com';

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <PortalHeader
        currentRole="cliente"
        title="Portal del Socio"
        subtitle="Mi Carnet Digital & Estado de Membresía · Trankilandia Gym"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero / Member Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Digital Membership Pass (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-tight text-white font-display">
                    TRANKILANDIA CLUB
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono tracking-widest">
                    CARNET DE SOCIO ACTIVO
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVO
              </span>
            </div>

            {/* Member Details */}
            <div className="mt-6 flex items-center gap-4">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={memberName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black text-2xl flex items-center justify-center border-2 border-amber-400 shadow-md">
                  {memberName[0].toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  {memberName}
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{memberEmail}</p>
                <div className="text-[11px] font-mono text-amber-400 font-bold mt-1">
                  ID SOCIO: TRK-84920
                </div>
              </div>
            </div>

            {/* QR Section for Torniquete Entrance */}
            <div className="mt-6 p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-lg inline-block">
                {/* Clean inline SVG QR representation */}
                <svg
                  className="w-32 h-32"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  {/* Outer markers */}
                  <rect x="10" y="10" width="24" height="24" fill="black" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="black" />

                  <rect x="66" y="10" width="24" height="24" fill="black" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="black" />

                  <rect x="10" y="66" width="24" height="24" fill="black" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="black" />

                  {/* QR Data Pattern */}
                  <rect x="42" y="12" width="6" height="6" fill="black" />
                  <rect x="52" y="12" width="6" height="6" fill="black" />
                  <rect x="42" y="24" width="6" height="6" fill="black" />
                  <rect x="12" y="42" width="6" height="6" fill="black" />
                  <rect x="24" y="42" width="6" height="6" fill="black" />
                  <rect x="36" y="36" width="12" height="12" fill="black" />
                  <rect x="54" y="42" width="6" height="6" fill="black" />
                  <rect x="66" y="42" width="12" height="6" fill="black" />
                  <rect x="42" y="54" width="6" height="12" fill="black" />
                  <rect x="54" y="60" width="12" height="6" fill="black" />
                  <rect x="72" y="66" width="6" height="12" fill="black" />
                  <rect x="84" y="72" width="6" height="6" fill="black" />
                  <rect x="60" y="78" width="18" height="6" fill="black" />
                </svg>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 mt-2.5">
                Muestra este código al escáner para ingresar a la sala en Huamanga
              </p>
            </div>

            {/* Plan Specs */}
            <div className="mt-5 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Plan Actual:</span>
                <span className="text-white font-bold">Combo Musculación + Boxeo</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Vencimiento:</span>
                <span className="text-emerald-400 font-bold">22 Noviembre 2026 (24 días)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Sede:</span>
                <span className="text-amber-400 font-bold">Huamanga, Ayacucho</span>
              </div>
            </div>
          </div>

          {/* Member Activities & Training WOD (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Visitas en Octubre</span>
                <div className="mt-2 text-2xl font-black font-display text-white">16 días</div>
                <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Constancia de 4 días/sem</p>
              </div>

              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Clases de Boxeo</span>
                <div className="mt-2 text-2xl font-black font-display text-amber-400">8 asistidas</div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Coach Marcos Rivas</p>
              </div>

              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-mono text-zinc-400 uppercase">Estado Membresía</span>
                <div className="mt-2 text-2xl font-black font-display text-emerald-400">AL DÍA</div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Ingreso Libre activo</p>
              </div>
            </div>

            {/* Coach's WOD Routine */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Rutina del Día · Pizarra del Coach
                </h3>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs font-sans text-zinc-200 leading-relaxed">
                <div className="font-bold text-amber-400 font-mono mb-1">
                  FUERZA & GOLPEO (HOY EN SALA):
                </div>
                Press Militar 4x8 pesado + Fondos en paralelas lastrados 3x10 + 5 rounds de golpeo al costal (1 min descanso activo).
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Horario Boxeo Hoy:</div>
                  <div className="text-white font-bold mt-0.5">05:00 PM - 06:30 PM</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="text-zinc-400">Horario Sala Pesas:</div>
                  <div className="text-white font-bold mt-0.5">06:00 AM - 10:00 PM (Libre)</div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                    Historial de Pagos
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">Comprobantes válidos</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">Renovación Combo Boxeo + Musculación</div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      22 Oct 2026 · Boleta B001-000492 · Pagado con Yape
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold text-sm">S/. 140.00</span>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">PAGADO</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">¿Dudas con tu plan o deseas congelar días?</span>
                <a
                  href="https://wa.me/51999999999?text=Hola%20Trankilandia%20Gym,%20soy%20socio%20y%20tengo%20una%20consulta%20sobre%20mi%20membresía"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Contactar a Recepción por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
