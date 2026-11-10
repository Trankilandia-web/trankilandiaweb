import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  UserPlus,
  AlertCircle,
  Delete,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Dumbbell,
  ShieldAlert,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  StaffUser,
  fetchStaffFromSupabase,
  verifyStaffPin,
  saveStaffUser,
} from '../../lib/staffStore';
import { useAuth } from '../../context/AuthContext';

export default function DesktopStaffLogin() {
  const navigate = useNavigate();
  const { loginStaff } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Estado de validación con Supabase
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(true);
  const [dbConfigured, setDbConfigured] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Modal para agregar colaborador
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<'admin' | 'cajero'>('cajero');
  const [newTurno, setNewTurno] = useState<'manana' | 'tarde' | 'noche' | 'completo'>('manana');
  const [newPin, setNewPin] = useState('');

  const loadStaffFromDatabase = async () => {
    setIsCheckingSupabase(true);
    setDbError(null);
    const result = await fetchStaffFromSupabase();
    if (result.configured && result.users.length > 0) {
      setStaffList(result.users);
      setDbConfigured(true);
    } else {
      setStaffList([]);
      setDbConfigured(false);
      setDbError(
        result.error ||
          'No se encontraron cuentas autorizadas en la tabla public.personal de Supabase.'
      );
    }
    setIsCheckingSupabase(false);
  };

  useEffect(() => {
    document.title = 'Trankilandia Gym · Central Hub Operativo';
    sessionStorage.setItem('trankilandia_desktop_mode', 'true');
    loadStaffFromDatabase();
  }, []);

  // Soporte para escribir con el teclado físico / NumPad
  useEffect(() => {
    if (!selectedStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setSelectedStaff(null);
        setPin('');
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStaff, pin]);

  const handleSelectStaff = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setPin('');
    setErrorMsg(null);
  };

  const handleDigitClick = (digit: string) => {
    if (pin.length >= 4 || isAuthenticating) return;
    const newPinStr = pin + digit;
    setPin(newPinStr);
    setErrorMsg(null);

    // Validación automática al ingresar los 4 dígitos
    if (newPinStr.length === 4 && selectedStaff) {
      submitPin(selectedStaff, newPinStr);
    }
  };

  const handleBackspace = () => {
    if (isAuthenticating) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const submitPin = async (staff: StaffUser, enteredPin: string) => {
    setIsAuthenticating(true);
    const result = await verifyStaffPin(staff.id, enteredPin);

    if (result.success && result.user) {
      const authRes = loginStaff(result.user);
      setTimeout(() => {
        setIsAuthenticating(false);
        navigate(authRes.redirectPath);
      }, 150);
    } else {
      setTimeout(() => {
        setIsAuthenticating(false);
        setErrorMsg(result.error || 'PIN incorrecto.');
        setPin('');
      }, 150);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || newPin.length !== 4) {
      alert('Debe ingresar el nombre y un PIN de exactamente 4 dígitos.');
      return;
    }

    const created = await saveStaffUser({
      nombre: newNombre.trim(),
      rol: newRol,
      turno: newTurno,
      pin: newPin,
      avatarColor:
        newRol === 'admin'
          ? 'from-purple-500 to-indigo-600 text-white'
          : 'from-emerald-400 to-teal-600 text-black',
      activo: true,
    });

    await loadStaffFromDatabase();
    setShowAddModal(false);
    setNewNombre('');
    setNewPin('');
    handleSelectStaff(created);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white font-sans flex flex-col justify-between selection:bg-amber-400 selection:text-black relative overflow-hidden">
      {/* Fondo estético sutil con efecto glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-amber-400/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Cabecera de la Terminal */}
      <header className="px-6 sm:px-12 py-5 border-b border-white/10 flex items-center justify-between z-10 backdrop-blur-md bg-zinc-950/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-display tracking-tight text-white uppercase">
                TRANKILANDIA GYM
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold uppercase">
                HUB ESCRITORIO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">Terminal de Punto de Venta, Acceso & Gerencia</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300">
            <span
              className={`w-2 h-2 rounded-full ${
                dbConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{dbConfigured ? 'Supabase Conectado' : 'Supabase Desconectado'}</span>
          </div>
          {dbConfigured && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400 hover:text-black text-xs font-bold font-mono transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Personal</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 z-10 max-w-5xl mx-auto w-full">
        {isCheckingSupabase ? (
          /* PANTALLA DE CARGA Y VERIFICACIÓN EN LA NUBE */
          <div className="text-center space-y-3 font-mono">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-300 font-bold">Verificando cuentas autorizadas en Supabase Cloud...</p>
            <p className="text-xs text-zinc-500">Conectando con base de datos en Huamanga, Ayacucho</p>
          </div>
        ) : !dbConfigured ? (
          /* PANTALLA DE BLOQUEO DE SEGURIDAD SI LA TABLA NO EXISTE EN SUPABASE */
          <div className="w-full max-w-lg bg-zinc-900/90 border border-red-500/40 rounded-3xl p-8 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  Inicialización de Seguridad Requerida
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Base de datos en la nube sin cuentas de personal
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono text-zinc-300 leading-relaxed">
              <p>
                Por razones de seguridad e integridad, la aplicación no permite el acceso con usuarios locales temporales. Las cuentas de acceso de Marisol, Luis y Mostrador deben residir en Supabase Cloud.
              </p>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2 text-zinc-400">
                <div className="font-bold text-white uppercase text-[11px]">Pasos de Habilitación:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abra el SQL Editor en su consola de Supabase.</li>
                  <li>
                    Ejecute el script:{' '}
                    <code className="text-amber-400 bg-black/40 px-1 py-0.5 rounded">
                      supabase/SOLUCION_COMPLETA_SUPABASE.sql
                    </code>
                  </li>
                  <li>Presione el botón inferior para verificar la conexión.</li>
                </ol>
              </div>
              {dbError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">
                  Detalle del servidor: {dbError}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={loadStaffFromDatabase}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-400/20 active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar Cuentas en Supabase</span>
            </button>
          </div>
        ) : selectedStaff ? (
          /* PANTALLA 2: INGRESO DE PIN NUMÉRICO */
          <div className="w-full max-w-md bg-zinc-900/90 border border-amber-400/40 rounded-3xl p-8 shadow-2xl shadow-amber-400/10 flex flex-col items-center animate-scale-up">
            <div className="flex items-center gap-4 p-3.5 pr-6 rounded-2xl bg-zinc-950 border border-white/10 mb-6 w-full">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedStaff.avatarColor} font-black text-xl flex items-center justify-center shadow-lg flex-shrink-0 text-white`}
              >
                {selectedStaff.iniciales}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-white truncate">{selectedStaff.nombre}</div>
                <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      selectedStaff.rol === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedStaff.rol === 'admin' ? 'Administrador' : 'Recepción / Caja'}
                  </span>
                  <span className="text-zinc-500">Turno: {selectedStaff.turno}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStaff(null);
                  setPin('');
                  setErrorMsg(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer transition-colors"
              >
                Cambiar
              </button>
            </div>

            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold mb-3">
              Ingrese su PIN de 4 dígitos:
            </p>

            {/* Display de 4 dígitos */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      filled
                        ? 'bg-amber-400 border-amber-400 shadow-md shadow-amber-400/50 scale-110'
                        : 'border-zinc-700 bg-zinc-950'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono mb-4 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Teclado numérico táctil */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isAuthenticating}
                  onClick={() => handleDigitClick(digit)}
                  className="h-14 rounded-2xl bg-zinc-950 border border-white/10 hover:border-amber-400/60 hover:bg-zinc-800 text-white font-mono text-xl font-bold transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => setPin('')}
                className="h-14 rounded-2xl bg-zinc-950 border border-white/10 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                BORRAR
              </button>
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => handleDigitClick('0')}
                className="h-14 rounded-2xl bg-zinc-950 border border-white/10 hover:border-amber-400/60 hover:bg-zinc-800 text-white font-mono text-xl font-bold transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-zinc-950 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] font-mono text-zinc-500 text-center">
              Puede escribir directamente desde el teclado numérico físico.
            </p>
          </div>
        ) : (
          /* PANTALLA 1: SELECCIÓN DE PERSONAL EN TURNO */
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-10">
              <span className="text-amber-400 font-mono text-xs uppercase font-extrabold tracking-widest inline-flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Control de Personal & Turnos
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white uppercase">
                ¿Quién está en turno hoy?
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto mt-2">
                Seleccione su perfil e ingrese su PIN de 4 dígitos para acceder al sistema.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleSelectStaff(staff)}
                  className="group p-6 rounded-3xl bg-zinc-900/80 border border-white/10 hover:border-amber-400 hover:bg-zinc-800/90 text-left transition-all duration-200 cursor-pointer shadow-xl hover:shadow-amber-400/10 hover:scale-[1.02] flex flex-col justify-between min-h-[220px]"
                >
                  <div className="flex items-start justify-between w-full">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${staff.avatarColor} font-black text-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform text-white`}
                    >
                      {staff.iniciales}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-amber-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors truncate">
                      {staff.nombre}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                      {staff.rol === 'admin' ? (
                        <span className="text-purple-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Administrador
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" />
                          Recepción / Caja
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500 mt-1 capitalize">Turno: {staff.turno}</p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-amber-300">
                    <span>Ingresar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Pie de Página de la Terminal */}
      <footer className="px-6 sm:px-12 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-500 z-10 bg-zinc-950/80">
        <div>Trankilandia Gym Hub · Huamanga, Ayacucho</div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>Autenticación en tiempo real con Supabase Cloud</span>
          <span className="text-zinc-600">·</span>
          <span>417 Socios Oficiales</span>
        </div>
      </footer>

      {/* Modal para Crear Personal / Cajero */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-black text-white font-display uppercase">
                Registrar Nuevo Personal
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. Carla Méndez"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Rol</label>
                  <select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="cajero">Recepción / Caja</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Turno</label>
                  <select
                    value={newTurno}
                    onChange={(e) => setNewTurno(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="manana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                    <option value="completo">Completo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">PIN de 4 Números</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 1234"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-widest text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase font-mono transition-transform active:scale-95 cursor-pointer shadow-lg mt-2"
              >
                Guardar en Supabase
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
