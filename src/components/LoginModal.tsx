import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, X, ArrowRight, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GYM_CONTACT } from '../data/gymData';

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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setIsSuccess(false);
      setErrorMessage('');
      setIdentifier('');
      setPassword('');
      setIsLoading(false);
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu DNI / correo y contraseña.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    // Simulate login authentication
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 900);
  };

  const handleResetPasswordViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola Trankilandia Gym, necesito ayuda para recuperar la contraseña de mi cuenta de socio (DNI: ${identifier.trim() || 'No especificado'}).`
    );
    window.open(`https://wa.me/${GYM_CONTACT.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const handleSwitchToTour = () => {
    handleModalClose();
    setTimeout(() => {
      onOpenTourModal?.();
    }, 150);
  };

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

            {!isSuccess ? (
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
                    Accede a tu cuenta para consultar el estado de tu membresía, registrar asistencia y ver tus planes.
                  </p>
                </div>

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

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User / DNI Input */}
                  <div>
                    <label
                      htmlFor="login-identifier"
                      className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold mb-1.5"
                    >
                      DNI / Correo o Teléfono
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="login-identifier"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Ej. 72481920 o socio@correo.com"
                        required
                        className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-sans"
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
                        placeholder="••••••••"
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
                  ¡BIENVENIDO, SOCIO!
                </h3>
                <p className="text-zinc-300 text-sm mt-2 font-sans">
                  Tu sesión ha sido verificada correctamente. Accediendo a tus datos de membresía...
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-zinc-950 border border-white/10 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-mono">Usuario activo:</span>
                    <span className="text-white font-mono font-bold">{identifier}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-mono">Estado membresía:</span>
                    <span className="text-emerald-400 font-mono font-bold">ACTIVO · INGRESO LIBRE</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-mono">Sede:</span>
                    <span className="text-amber-400 font-mono font-bold">Huamanga, Ayacucho</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    CERRAR VENTANA
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPasswordViaWhatsApp}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 py-2.5 rounded-xl text-xs font-mono transition-colors cursor-pointer"
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
