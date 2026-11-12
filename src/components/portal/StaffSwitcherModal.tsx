import React, { useState, useEffect } from 'react';
import { UserPlus, Lock, AlertCircle, X, Delete, ArrowLeft } from 'lucide-react';
import {
  StaffUser,
  getStaffList,
  fetchStaffFromSupabase,
  verifyStaffPin,
  saveStaffUser,
} from '../../lib/staffStore';

interface StaffSwitcherModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onStaffAuthenticated: (staff: StaffUser) => void;
  currentStaff: StaffUser | null;
}

export default function StaffSwitcherModal({
  isOpen,
  onClose,
  onStaffAuthenticated,
  currentStaff,
}: StaffSwitcherModalProps) {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Formulario nuevo personal
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<'admin' | 'cajero'>('cajero');
  const [newTurno, setNewTurno] = useState<'manana' | 'tarde' | 'noche' | 'completo'>('manana');
  const [newPin, setNewPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStaffList(getStaffList());
      fetchStaffFromSupabase().then((res) => {
        if (res.configured && res.users.length > 0) {
          setStaffList(res.users);
        }
      });
      setPin('');
      setErrorMsg(null);
      setSelectedStaff(null);
    }
  }, [isOpen]);

  // Soporte para escribir con el teclado físico
  useEffect(() => {
    if (!isOpen || !selectedStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setSelectedStaff(null);
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStaff, pin]);

  if (!isOpen) return null;

  const handleSelectStaff = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setPin('');
    setErrorMsg(null);
  };

  const handleDigitClick = (digit: string) => {
    if (pin.length >= 4) return;
    const newPinStr = pin + digit;
    setPin(newPinStr);
    setErrorMsg(null);

    // Si ya completó los 4 dígitos, validar automáticamente
    if (newPinStr.length === 4 && selectedStaff) {
      setTimeout(async () => {
        const result = await verifyStaffPin(selectedStaff.id, newPinStr);
        if (result.success && result.user) {
          onStaffAuthenticated(result.user);
          if (onClose) onClose();
        } else {
          setErrorMsg(result.error || 'PIN incorrecto.');
          setPin('');
        }
      }, 150);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || newPin.length !== 4) {
      alert('Por favor ingresa un nombre y un PIN de exactamente 4 dígitos.');
      return;
    }

    if (!newAdminPin || newAdminPin.length !== 4) {
      alert('Ingresa el PIN de un Administrador (Marisol: 1234 o Luis: 2026) para autorizar.');
      return;
    }

    const res = await saveStaffUser(
      {
        nombre: newNombre.trim(),
        rol: newRol,
        turno: newTurno,
        pin: newPin,
        avatarColor:
          newRol === 'admin'
            ? 'from-purple-500 to-indigo-600 text-white'
            : 'from-emerald-400 to-teal-600 text-black',
        activo: true,
      },
      {
        adminPin: newAdminPin,
      }
    );

    if (!res.success || !res.user) {
      alert(`Error al registrar colaborador: ${res.error || 'Autorización fallida.'}`);
      return;
    }

    const fresh = await fetchStaffFromSupabase();
    if (fresh.configured && fresh.users.length > 0) {
      setStaffList(fresh.users);
    }
    setShowAddModal(false);
    setNewNombre('');
    setNewPin('');
    setNewAdminPin('');
    // Seleccionar de inmediato el nuevo usuario
    handleSelectStaff(res.user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-400/10 text-white">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display tracking-tight text-white uppercase">
                {selectedStaff ? `Ingreso de ${selectedStaff.nombre}` : 'Cambio Rápido de Turno'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {selectedStaff
                  ? `Ingresa tu PIN de 4 dígitos para activar tu sesión`
                  : 'Selecciona tu viñeta de personal para operar la PC'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* CONTENIDO 1: PANTALLA DE PIN SI SELECCIONÓ UN PERSONAL */}
        {selectedStaff ? (
          <div className="py-6 flex flex-col items-center">
            {/* Viñeta seleccionada */}
            <div className="flex items-center gap-4 p-3 pr-6 rounded-2xl bg-zinc-900 border border-white/10 mb-6">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedStaff.avatarColor} font-black text-xl flex items-center justify-center shadow-lg`}
              >
                {selectedStaff.iniciales}
              </div>
              <div>
                <div className="text-base font-black text-white">{selectedStaff.nombre}</div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                      selectedStaff.rol === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedStaff.rol === 'admin' ? 'Administrador' : 'Recepción / Caja'}
                  </span>
                  <span className="text-zinc-500">· Turno {selectedStaff.turno}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="ml-auto p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                title="Cambiar usuario"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Display de 4 dígitos */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      filled
                        ? 'bg-amber-400 border-amber-400 shadow-md shadow-amber-400/50 scale-110'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  />
                );
              })}
            </div>

            {/* Mensaje de error si falló */}
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono mb-4 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Teclado numérico táctil (0-9) */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitClick(digit)}
                  className="h-14 rounded-2xl bg-zinc-900 border border-white/10 hover:border-amber-400/60 hover:bg-zinc-800 text-white font-mono text-xl font-bold transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-14 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 font-mono text-xs font-bold transition-all cursor-pointer"
              >
                BORRAR
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick('0')}
                className="h-14 rounded-2xl bg-zinc-900 border border-white/10 hover:border-amber-400/60 hover:bg-zinc-800 text-white font-mono text-xl font-bold transition-all active:scale-95 cursor-pointer shadow-md"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* CONTENIDO 2: LISTA DE VIÑETAS DE PERSONAL */
          <div className="py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {staffList.map((staff) => {
                const isCurrent = currentStaff?.id === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handleSelectStaff(staff)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                      isCurrent
                        ? 'bg-amber-400/10 border-amber-400/50 shadow-md shadow-amber-400/10'
                        : 'bg-zinc-900/80 border-white/10 hover:border-amber-400/40 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${staff.avatarColor} font-black text-lg flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      {staff.iniciales}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                        {staff.nombre}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mt-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            staff.rol === 'admin' ? 'text-purple-400' : 'text-emerald-400'
                          }`}
                        >
                          {staff.rol === 'admin' ? 'Admin' : 'Cajero'}
                        </span>
                        <span>· {staff.turno}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-amber-400 flex-shrink-0 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Botón para que Marisol o Luis agreguen nuevo personal */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">
                Seguridad: Solo administradores pueden agregar o dar de baja cajeros.
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400 hover:text-black text-xs font-bold transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Agregar Cajero</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL SECUNDARIO: AGREGAR NUEVO CAJERO */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
            <div className="w-full max-w-md bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <h3 className="text-lg font-black text-white font-display uppercase">Nuevo Trabajador / Cajero</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Rol</label>
                    <select
                      value={newRol}
                      onChange={(e) => setNewRol(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="cajero">Cajero / Recepción</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Turno</label>
                    <select
                      value={newTurno}
                      onChange={(e) => setNewTurno(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="manana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                      <option value="completo">Completo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">PIN Numérico de Acceso (4 dígitos)</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    pattern="[0-9]{4}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-xl tracking-widest text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] font-mono text-zinc-500 mt-1 block">
                    El trabajador solo necesitará recordar este PIN de 4 dígitos.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">PIN de Administrador Autorizador</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    pattern="[0-9]{4}"
                    value={newAdminPin}
                    onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="PIN de Marisol (1234) o Luis (2026)"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-xl tracking-widest text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] font-mono text-zinc-500 mt-1 block">
                    Autoriza la creación del colaborador en Supabase.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-black hover:bg-amber-300 shadow-md"
                  >
                    Guardar Personal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
