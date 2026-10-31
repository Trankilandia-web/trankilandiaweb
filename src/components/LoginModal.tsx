import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, X, ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GYM_CONTACT } from '../data/gymData';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle, signInWithDni } from '../lib/supabase';
import { ROLES_CONFIG, UserRole } from '../types/roles';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTourModal?: () => void;
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 10.02 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function LoginModal({
  isOpen,
  onClose,
  onOpenTourModal,
}: LoginModalProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const { user, isConfigured, signOut, role, switchRole, getRedirectPath } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoLoggedInUser, setDemoLoggedInUser] = useState<string | null>(null);

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
      setIsGoogleLoading(false);
      setDemoLoggedInUser(null);
    }, 250);
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);

    if (!isConfigured) {
      // Friendly simulation if env vars are not configured yet
      setTimeout(() => {
        setIsGoogleLoading(false);
        setDemoLoggedInUser('socio.google@gmail.com');
        handleModalClose();
        navigate(getRedirectPath());
      }, 700);
      return;
    }

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Google OAuth';
      setErrorMessage(msg);
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDni = dni.trim().replace(/\D/g, '');
    if (cleanDni.length !== 8) {
      setErrorMessage('Por favor ingresa un número de DNI válido de 8 dígitos.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña (tu DNI si es tu primer ingreso).');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    if (!isConfigured) {
      // Local simulation
      setTimeout(() => {
        setIsLoading(false);
        setDemoLoggedInUser(`${cleanDni}@socio.trankilandia.pe`);
        handleModalClose();
        navigate(getRedirectPath());
      }, 700);
      return;
    }

    try {
      const { error } = await signInWithDni(cleanDni, password.trim());
      setIsLoading(false);
      if (error) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('credentials')
        ) {
          setErrorMessage(
            'DNI o contraseña incorrecta. Si es tu primer ingreso, escribe tu DNI en ambos campos.'
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        handleModalClose();
        navigate(getRedirectPath());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setErrorMessage(msg);
      setIsLoading(false);
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

            {!activeUserEmail ? (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>PORTAL DE SOCIOS</span>
                  </div>
                  <h2
                    id="login-modal-title"
                    className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white"
                  >
                    INICIAR SESIÓN
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 font-sans leading-relaxed">
                    Ingresa con tu cuenta de <strong className="text-white">Google</strong> o con tu <strong className="text-amber-400">número de DNI</strong>.
                  </p>
                </div>

                {/* Supabase Notice banner if not configured yet */}
                {!isConfigured && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-start gap-2.5 text-xs text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">
                      <strong>Conexión con Supabase &amp; Google:</strong> Configura tus variables en <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> para habilitar OAuth oficial. Puedes probar el botón abajo en modo demostración.
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-sans"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                {/* 1. GOOGLE ONE-CLICK SIGN IN BUTTON */}
                <motion.button
                  type="button"
                  disabled={isGoogleLoading || isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                      <span>CONECTANDO CON GOOGLE...</span>
                    </div>
                  ) : (
                    <>
                      <GoogleIcon className="w-5 h-5" />
                      <span>CONTINUAR CON GOOGLE</span>
                    </>
                  )}
                </motion.button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                    o ingresa con tu DNI
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User / DNI Input */}
                  <div>
                    <label
                      htmlFor="login-dni"
                      className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold mb-1.5"
                    >
                      Número de DNI (8 dígitos)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="login-dni"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        value={dni}
                        onChange={(e) => {
                          setDni(e.target.value.replace(/\D/g, '').slice(0, 8));
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Ej: 87654321"
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
                      <button
                        type="button"
                        onClick={handleResetPasswordViaWhatsApp}
                        className="text-[11px] font-mono text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer"
                      >
                        ¿Olvidaste tu clave?
                      </button>
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
                      <span>💡 ¿Primer ingreso? Tu contraseña inicial es tu mismo número de DNI.</span>
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
                      disabled={isLoading || isGoogleLoading}
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
                    <span className="text-amber-400 font-mono font-bold">Huamanga, Ayacucho</span>
                  </div>
                </div>

                {/* Tester / Simulator for testing roles */}
                <div className="mt-4 p-3 bg-zinc-950/70 border border-white/5 rounded-2xl text-left">
                  <div className="text-[11px] font-mono text-zinc-400 mb-2 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>PROBAR ROL (MODO PRUEBA):</span>
                    </span>
                    <span className="text-zinc-500 font-normal">Clic para cambiar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['admin', 'caja', 'entrenador', 'cliente'] as UserRole[]).map((r) => {
                      const cfg = ROLES_CONFIG[r];
                      const isCurrent = r === role;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => switchRole(r)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isCurrent
                              ? `${cfg.themeColor.badgeBg} ${cfg.themeColor.badgeText} border ${cfg.themeColor.badgeBorder} shadow-sm`
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>{cfg.name}</span>
                          {isCurrent && <span className="text-[11px] text-emerald-400">●</span>}
                        </button>
                      );
                    })}
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
