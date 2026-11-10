import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, X, ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GYM_CONTACT } from '../data/gymData';
import { useAuth, SUPER_ADMIN_EMAILS } from '../context/AuthContext';
import { ROLES_CONFIG } from '../types/roles';
import { extraerDniPeru } from '../lib/dniParser';
import { actualizarPasswordSocio } from '../lib/authPasswords';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTourModal?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onOpenTourModal,
}: LoginModalProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const { user, signOut, role, getRedirectPath, loginUser } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoLoggedInUser, setDemoLoggedInUser] = useState<string | null>(null);

  // Modal para cambio/recuperación de contraseña vinculada al DNI
  const [isChangingPasswordModal, setIsChangingPasswordModal] = useState(false);
  const [resetDni, setResetDni] = useState('');
  const [resetOldPw, setResetOldPw] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleModalClose = () => {
    onClose();
    setTimeout(() => {
      setErrorMessage('');
      setDni('');
      setPassword('');
      setIsLoading(false);
      setDemoLoggedInUser(null);
    }, 250);
  };

  const handleAdminQuickLogin = async (email: string, name: string) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await loginUser(email, name);
      setIsLoading(false);
      handleModalClose();
      // Marisol va directo al panel de control de acceso en mostrador
      navigate(email.toLowerCase().includes('marisol') ? '/caja' : (res.redirectPath || '/admin'));
    } catch {
      setIsLoading(false);
      setErrorMessage('Error al acceder. Inténtalo nuevamente.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extraerDniPeru(resetDni) || resetDni.replace(/\D/g, '').slice(0, 8);
    if (!clean || clean.length !== 8) {
      setResetStatus({ type: 'error', message: 'Ingresa un DNI válido de 8 dígitos numéricos.' });
      return;
    }
    if (resetNewPw !== resetConfirmPw) {
      setResetStatus({ type: 'error', message: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }
    if (resetNewPw.length < 6) {
      setResetStatus({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    const res = await actualizarPasswordSocio(clean, resetNewPw, resetOldPw || undefined);
    setIsResetting(false);

    if (res.success) {
      setResetStatus({ type: 'success', message: res.message });
      setTimeout(() => {
        setIsChangingPasswordModal(false);
        setDni(clean);
        setPassword(resetNewPw);
        setResetStatus(null);
      }, 1500);
    } else {
      setResetStatus({ type: 'error', message: res.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = dni.trim();
    const isEmail = rawInput.includes('@');
    const cleanDni = isEmail ? '' : (extraerDniPeru(rawInput) || rawInput.replace(/\D/g, '').slice(0, 8));
    const isMasterEmail = SUPER_ADMIN_EMAILS.some((adm: string) => adm.toLowerCase() === rawInput.toLowerCase());

    if (!isEmail && cleanDni.length !== 8) {
      setErrorMessage('Por favor ingresa un número de DNI válido de 8 dígitos.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    const adminName = isMasterEmail && rawInput.toLowerCase().includes('marisol')
      ? 'Marisol Flores'
      : isMasterEmail
      ? 'Luis Gerardo Lloclla'
      : undefined;

    const enteredPassword = password.trim() || cleanDni;

    try {
      const res = await loginUser(isEmail ? rawInput : cleanDni, adminName, enteredPassword);
      setIsLoading(false);

      if (res.success) {
        handleModalClose();
        navigate(res.redirectPath || '/cliente');
      } else {
        setErrorMessage(
          res.error ||
            'El DNI ingresado no pertenece a ningún socio registrado. Si eres alumno nuevo, acércate a recepción.'
        );
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Error al verificar credenciales con el sistema. Inténtalo nuevamente.');
    }
  };

  const handleResetPasswordViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola Trankilandia Gym, necesito ayuda para recuperar la contraseña de mi cuenta de socio (DNI: ${dni.trim() || 'No especificado'}).`
    );
    window.open(`https://wa.me/${GYM_CONTACT.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const handleSwitchToTour = () => {
    handleModalClose();
    setTimeout(() => {
      onOpenTourModal?.();
    }, 150);
  };

  const activeUserEmail = user?.email || demoLoggedInUser;
  const isCanonicalUser = Boolean(activeUserEmail?.endsWith('@socio.trankilandia.pe'));
  const userDniDisplay = isCanonicalUser ? `DNI: ${activeUserEmail?.split('@')[0]}` : activeUserEmail;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-amber-400 selection:text-black"
        >
          {/* Backdrop with Emil Kowalski ease-out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleModalClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-auto overflow-hidden"
          >
            {/* Ambient accent top light */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
              aria-hidden="true"
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleModalClose}
              aria-label="Cerrar ventana de inicio de sesión"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X className="w-4 h-4" />
            </button>

            {isChangingPasswordModal ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPasswordModal(false);
                      setResetStatus(null);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 mb-2 cursor-pointer font-bold"
                  >
                    ← Volver al inicio de sesión
                  </button>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display">
                    Cambiar Contraseña
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1 font-sans">
                    Si es tu primer ingreso, tu contraseña inicial es tu DNI.
                  </p>
                </div>

                {resetStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      resetStatus.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/15 border border-red-500/30 text-red-300'
                    }`}
                  >
                    {resetStatus.message}
                  </div>
                )}

                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                      Tu DNI (8 dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      value={resetDni}
                      onChange={(e) => setResetDni(e.target.value)}
                      placeholder="Ej: 72345678"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                      Contraseña Actual (o DNI si es primer cambio)
                    </label>
                    <input
                      type="password"
                      value={resetOldPw}
                      onChange={(e) => setResetOldPw(e.target.value)}
                      placeholder="Tu clave actual o DNI"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                      Nueva Contraseña (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetNewPw}
                      onChange={(e) => setResetNewPw(e.target.value)}
                      placeholder="Nueva clave segura"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetConfirmPw}
                      onChange={(e) => setResetConfirmPw(e.target.value)}
                      placeholder="Repite la nueva clave"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-extrabold uppercase py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isResetting ? 'Guardando...' : 'Guardar Nueva Contraseña'}</span>
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleResetPasswordViaWhatsApp}
                    className="text-[11px] text-zinc-400 hover:text-emerald-400 underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¿Olvidaste tu contraseña anterior? Ayuda por WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : !activeUserEmail ? (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ACCESO EXCLUSIVO DE SOCIOS</span>
                  </div>
                  <h2
                    id="login-modal-title"
                    className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display"
                  >
                    PORTAL DE SOCIOS
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 font-sans leading-relaxed">
                    Ingresa con tu <strong className="text-amber-400 font-bold">número de DNI</strong>. Si es tu primer ingreso, tu contraseña inicial es tu mismo DNI.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-sans space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                    {errorMessage.includes('no pertenece') && (
                      <button
                        type="button"
                        onClick={handleResetPasswordViaWhatsApp}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-1.5 cursor-pointer mt-1"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-400" />
                        <span>Contactar a Recepción por WhatsApp</span>
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User / DNI Input */}
                  <div>
                    <label
                      htmlFor="login-dni"
                      className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold mb-1.5"
                    >
                      DNI (8 dígitos)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="login-dni"
                        type="text"
                        value={dni}
                        onChange={(e) => {
                          setDni(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Ej: 70447554 o correo registrado"
                        required
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold"
                      >
                        Contraseña
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPasswordModal(true);
                            setResetDni(dni);
                          }}
                          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer"
                        >
                          ¿Cambiar clave?
                        </button>
                        <span className="text-zinc-600">·</span>
                        <button
                          type="button"
                          onClick={handleResetPasswordViaWhatsApp}
                          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors underline cursor-pointer"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu DNI si es tu primer ingreso"
                        required
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-400/90 font-mono mt-1.5 flex items-center gap-1.5">
                      <span>Primer ingreso: Su contraseña inicial corresponde a su número de DNI.</span>
                    </p>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-zinc-950 text-amber-400 focus:ring-amber-400 accent-amber-400 cursor-pointer"
                      />
                      <span className="text-xs text-zinc-400 font-sans">Recordarme en este equipo</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-black uppercase tracking-wider py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>VERIFICANDO...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>INGRESAR AL PORTAL</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Accesos Rápidos para Administradores (Marisol Flores / Luis Lloclla) */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Acceso Rápido Administradores
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">1 Clic</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdminQuickLogin('marisolflores@gmail.com', 'Marisol Flores')}
                      className="px-3 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold transition-all text-left flex items-center justify-between cursor-pointer group"
                    >
                      <span className="truncate">Marisol Flores</span>
                      <span className="text-[10px] text-amber-400 font-mono shrink-0 ml-1">ADMIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminQuickLogin('luisgerardolloccllasaune@gmail.com', 'Luis Gerardo Lloclla')}
                      className="px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-zinc-200 text-xs font-mono font-bold transition-all text-left flex items-center justify-between cursor-pointer group"
                    >
                      <span className="truncate">Luis Lloclla</span>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-1">ADMIN</span>
                    </button>
                  </div>
                </div>

                {/* Footer Switcher to Courtesy Pass / Non-Members */}
                <div className="mt-6 pt-5 border-t border-white/10 text-center">
                  <p className="text-xs text-zinc-400 font-sans">
                    ¿Aún no eres socio del club?{' '}
                    <button
                      type="button"
                      onClick={handleSwitchToTour}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Solicita un Pase de Cortesía gratis
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* Success / Logged In State */
              <div className="py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                  ¡SESIÓN ACTIVA!
                </h3>
                <p className="text-zinc-300 text-sm mt-2 font-sans">
                  Has iniciado sesión correctamente en el portal de Trankilandia Gym.
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-zinc-950 border border-white/10 text-left space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Usuario conectado:</span>
                    <span className="text-white font-mono font-bold truncate max-w-[190px]">
                      {userDniDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Rol en el sistema:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] uppercase ${ROLES_CONFIG[role].themeColor.badgeBg} ${ROLES_CONFIG[role].themeColor.badgeText} border ${ROLES_CONFIG[role].themeColor.badgeBorder}`}
                    >
                      {ROLES_CONFIG[role].name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Estado membresía:</span>
                    <span className="text-emerald-400 font-mono font-bold">ACTIVO · INGRESO LIBRE</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-mono">Sede:</span>
                    <span className="text-amber-400 font-mono font-bold">Sede Emadi · Huamanga</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  {/* Primary CTA: Jump to role dashboard */}
                  <button
                    type="button"
                    onClick={() => {
                      navigate(getRedirectPath());
                      handleModalClose();
                    }}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black py-3.5 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 font-display uppercase tracking-wide"
                  >
                    <span>IR A MI PANEL ({ROLES_CONFIG[role].name.toUpperCase()})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white py-2.5 rounded-xl text-xs font-mono border border-white/10 transition-colors cursor-pointer"
                  >
                    CONTINUAR NAVEGANDO EN LA WEB
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setDemoLoggedInUser(null);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-red-300 hover:text-red-200 py-2.5 rounded-xl text-xs font-mono transition-colors cursor-pointer"
                  >
                    <span>Cerrar Sesión</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPasswordViaWhatsApp}
                    className="w-full inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-zinc-400 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Soporte por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
