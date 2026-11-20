import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, MessageCircle, X } from 'lucide-react';
import { GYM_CONTACT } from '../data/gymData';
import { useAuth } from '../context/AuthContext';
import { ROLES_CONFIG } from '../types/roles';
import { extraerDniPeru } from '../lib/dniParser';
import { actualizarPasswordSocio } from '../lib/authPasswords';
import { useModalFocus } from '../hooks/useModalFocus';

export interface LoginModalProps { isOpen: boolean; onClose: () => void; onOpenTourModal?: () => void; }

export default function LoginModal({ isOpen, onClose, onOpenTourModal }: LoginModalProps): React.JSX.Element | null {
  const navigate = useNavigate();
  const { user, signOut, role, getRedirectPath, loginUser } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [resetDni, setResetDni] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const dialogRef = useModalFocus(isOpen, onClose, { initialFocus: '#login-identity' });

  useEffect(() => {
    if (isOpen) return;
    setDni(''); setPassword(''); setShowPassword(false); setError('');
    setChangingPassword(false); setResetDni(''); setOldPassword('');
    setNewPassword(''); setConfirmPassword(''); setStatus(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) dialogRef.current?.querySelector<HTMLInputElement>(changingPassword ? '#reset-dni' : '#login-identity')?.focus();
  }, [changingPassword, isOpen, dialogRef]);

  const contactSupport = () => {
    const identity = changingPassword ? resetDni : dni;
    const message = `Hola Trankilandia Gym, necesito ayuda para recuperar mi acceso de socio${identity.trim() ? ` (DNI o correo: ${identity.trim()})` : ''}.`;
    window.open(`https://wa.me/${GYM_CONTACT.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    const identity = dni.trim();
    const isEmail = identity.includes('@');
    const cleanDni = isEmail ? '' : (extraerDniPeru(identity) || identity.replace(/\D/g, ''));
    if (!isEmail && cleanDni.length !== 8) { setError('Ingresa un DNI de 8 dígitos o tu correo registrado.'); return; }
    setError(''); setIsLoading(true);
    try {
      const result = await loginUser(isEmail ? identity : cleanDni, undefined, password);
      if (result.success) { onClose(); navigate(result.redirectPath || '/cliente'); }
      else setError(result.error || 'No pudimos verificar tu acceso. Revisa tus datos e inténtalo nuevamente.');
    } catch { setError('No se pudo conectar con el sistema. Conservamos tus datos para que vuelvas a intentarlo.'); }
    finally { setIsLoading(false); }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    const cleanDni = extraerDniPeru(resetDni) || resetDni.replace(/\D/g, '');
    if (cleanDni.length !== 8) { setStatus({ type: 'error', message: 'Ingresa un DNI de 8 dígitos.' }); return; }
    if (!oldPassword) { setStatus({ type: 'error', message: 'Ingresa tu contraseña actual para verificar tu identidad.' }); return; }
    if (newPassword.length < 6) { setStatus({ type: 'error', message: 'Usa al menos 6 caracteres en la nueva contraseña.' }); return; }
    if (newPassword !== confirmPassword) { setStatus({ type: 'error', message: 'Las nuevas contraseñas no coinciden.' }); return; }
    setStatus(null); setIsLoading(true);
    try {
      const result = await actualizarPasswordSocio(cleanDni, newPassword, oldPassword);
      setStatus({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setDni(cleanDni); setPassword(''); }
    } catch { setStatus({ type: 'error', message: 'No se pudo guardar la contraseña. Vuelve a intentarlo.' }); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="login-modal-title" tabIndex={-1} className="modal-panel max-w-md">
        <button type="button" onClick={onClose} aria-label="Cerrar inicio de sesión" className="modal-close"><X size={20} /></button>
        {changingPassword ? (
          <>
            <button type="button" onClick={() => { setChangingPassword(false); setStatus(null); }} className="mb-5 inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"><ArrowLeft size={16} />Volver al acceso</button>
            <h2 id="login-modal-title" className="modal-title">Cambiar contraseña</h2>
            <p className="modal-description">Verifica tu identidad con tu contraseña actual. Si la olvidaste, solicita ayuda a recepción.</p>
            {status && <p role={status.type === 'error' ? 'alert' : 'status'} className={`form-message ${status.type === 'error' ? 'form-message-error' : 'form-message-success'}`}>{status.message}</p>}
            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
              <div><label className="field-label" htmlFor="reset-dni">DNI</label><input id="reset-dni" className="field-input" required inputMode="numeric" autoComplete="username" maxLength={8} pattern="[0-9]{8}" value={resetDni} onChange={(e) => setResetDni(e.target.value)} /></div>
              <div><label className="field-label" htmlFor="reset-current">Contraseña actual</label><input id="reset-current" className="field-input" type="password" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></div>
              <div><label className="field-label" htmlFor="reset-new">Nueva contraseña</label><input id="reset-new" className="field-input" type="password" required minLength={6} autoComplete="new-password" aria-describedby="new-password-hint" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><p id="new-password-hint" className="field-hint">Mínimo 6 caracteres.</p></div>
              <div><label className="field-label" htmlFor="reset-confirm">Confirmar nueva contraseña</label><input id="reset-confirm" className="field-input" type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
              <button className="button-primary w-full" disabled={isLoading} type="submit">{isLoading && <LoaderCircle className="animate-spin" size={18} />}{isLoading ? 'Guardando…' : 'Guardar contraseña'}</button>
            </form>
            <button type="button" onClick={contactSupport} className="mt-5 text-sm text-zinc-300 underline underline-offset-4 hover:text-white">Olvidé mi contraseña: contactar recepción</button>
          </>
        ) : user ? (
          <>
            <h2 id="login-modal-title" className="modal-title">Tu sesión está activa</h2>
            <p className="modal-description break-words">{user.user_metadata?.full_name || user.email}</p>
            <p className="mt-4 text-sm text-zinc-300">Acceso: {ROLES_CONFIG[role].name}</p>
            <div className="mt-6 space-y-3">
              <button type="button" onClick={() => { onClose(); navigate(getRedirectPath()); }} className="button-primary w-full">Ir a mi panel<ArrowRight size={18} /></button>
              <button type="button" onClick={onClose} className="button-secondary w-full">Seguir navegando</button>
              <button type="button" disabled={isLoading} onClick={async () => { setIsLoading(true); try { await signOut(); } catch { setError('No se pudo cerrar la sesión. Vuelve a intentarlo.'); } finally { setIsLoading(false); } }} className="w-full min-h-11 text-sm text-red-300 hover:text-red-200">{isLoading ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
            </div>
            {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <h2 id="login-modal-title" className="modal-title">Portal de socios</h2>
            <p className="modal-description">Ingresa con tu DNI o correo y tu contraseña registrada.</p>
            {error && <p className="form-message form-message-error" role="alert">{error}</p>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div><label htmlFor="login-identity" className="field-label">DNI o correo registrado</label><input id="login-identity" type="text" autoComplete="username" value={dni} onChange={(e) => { setDni(e.target.value); setError(''); }} placeholder="Tu DNI o correo" required className="field-input" /></div>
              <div>
                <label htmlFor="login-password" className="field-label">Contraseña</label>
                <div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="field-input pr-12" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center rounded-xl text-zinc-400 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                <button type="button" onClick={() => { setChangingPassword(true); setResetDni(dni.includes('@') ? '' : dni); }} className="mt-3 min-h-8 text-sm text-amber-400 underline underline-offset-4 hover:text-amber-300">Cambiar contraseña</button>
              </div>
              <button type="submit" disabled={isLoading} className="button-primary w-full">{isLoading ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}{isLoading ? 'Verificando acceso…' : 'Ingresar al portal'}</button>
            </form>
            <button type="button" onClick={contactSupport} className="mt-4 min-h-11 w-full inline-flex items-center justify-center gap-2 text-sm text-zinc-300 hover:text-white"><MessageCircle size={17} />¿Olvidaste tu contraseña?</button>
            {onOpenTourModal && <p className="mt-5 border-t border-white/10 pt-5 text-sm text-zinc-400">¿Aún no eres socio? <button type="button" onClick={() => { onClose(); onOpenTourModal(); }} className="text-amber-400 underline underline-offset-4 hover:text-amber-300">Solicitar pase de cortesía</button></p>}
          </>
        )}
      </div>
    </div>
  );
}
