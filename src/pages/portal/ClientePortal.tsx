import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Dumbbell,
  MessageCircle,
  Flame,
  AlertTriangle,
  Check,
  Printer,
  Sparkles,
  Download,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Clock,
  UserCheck,
  CreditCard,
  Lock,
  X,
  Upload,
  ShieldCheck,
  QrCode,
  Barcode,
  KeyRound,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Phone,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PortalHeader from '../../components/portal/PortalHeader';
import ReceiptModal from '../../components/portal/ReceiptModal';
import { useAuth } from '../../context/AuthContext';
import {
  GymMember,
  MemberRoutine,
  getStoredMembers,
  saveStoredMembers,
  getStoredRoutines,
  getStoredProgress,
  INITIAL_ROUTINES,
  getStoredMembershipPlans,
} from '../../data/gymStore';
import {
  getMemberRoutine,
  vincularDniCliente,
  vincularCorreoASocio,
  obtenerSocioPorUserId,
  updateMemberProfile,
  subscribeToGymRealtime,
} from '../../lib/supabaseDb';
import {
  actualizarPasswordSocio,
  getStoredCustomPassword,
} from '../../lib/authPasswords';
import {
  exportCarnetDigitalPNG,
} from '../../lib/barcode128';
import Barcode128 from '../../components/Barcode128';
import QRCode2D from '../../components/QRCode2D';

// Entrenadores oficiales del gimnasio (2 mujeres y 2 varones distribuidos en los 3 turnos)
export const OFFICIAL_COACHES = [
  {
    id: 'coach-marcos',
    name: 'Coach Marcos Rivas',
    gender: 'varon' as const,
    shift: 'manana' as const,
    shiftLabel: 'Mañana (6:00 AM - 2:00 PM)',
    specialty: 'Fuerza, Hipertrofia & Musculación',
  },
  {
    id: 'coach-camila',
    name: 'Coach Camila Mendoza',
    gender: 'mujer' as const,
    shift: 'manana' as const,
    shiftLabel: 'Mañana (6:00 AM - 2:00 PM)',
    specialty: 'Acondicionamiento, Glúteos & Cardio',
  },
  {
    id: 'coach-valeria',
    name: 'Coach Valeria Gómez',
    gender: 'mujer' as const,
    shift: 'tarde' as const,
    shiftLabel: 'Tarde (2:00 PM - 6:00 PM)',
    specialty: 'Definición, Tonificación & Funcional',
  },
  {
    id: 'coach-daniel',
    name: 'Coach Daniel Quispe',
    gender: 'varon' as const,
    shift: 'noche' as const,
    shiftLabel: 'Noche (6:00 PM - 10:00 PM)',
    specialty: 'Potencia, Boxeo & Hipertrofia Pesada',
  },
];

export const getClientePlansCatalog = () => {
  const plans = getStoredMembershipPlans().filter((p) => p.isActive !== false);
  const result: any[] = [];

  plans.forEach((p) => {
    if (p.id === 'escolar') {
      result.push({
        id: 'escolar',
        name: 'Plan Escolar (14-17 años)',
        price: p.monthlyPrice,
        duration: '1 mes',
        badge: p.badge || `Escolar · S/. ${p.monthlyPrice}/mes`,
        requiresDocument: true,
        documentRequirement: 'Foto de DNI (14 a 17 años)',
        features: p.highlights || ['Requisito: DNI acreditando edad 14 a 17 años', 'Acceso a sala de pesas y máquinas', 'Supervisión técnica de entrenadores'],
      });
    } else if (p.id === 'universitario') {
      result.push({
        id: 'universitario',
        name: 'Plan Universitario / Instituto (1 Mes)',
        price: p.monthlyPrice,
        duration: '1 mes',
        badge: `Universitario · S/. ${p.monthlyPrice}/mes`,
        requiresDocument: true,
        documentRequirement: 'Carnet de Universidad/Instituto o Matrícula',
        features: ['Requisito: Carnet vigente de estudiante', 'Acceso completo a máquinas y peso libre', 'Horario libre en tu turno oficial'],
      });
      if (p.quarterlyPrice > 0) {
        result.push({
          id: 'universitario-3m',
          name: 'Plan Universitario (Trimestral - 3 Meses)',
          price: p.quarterlyPrice,
          duration: '3 meses',
          popular: true,
          badge: `Promoción Oficial · S/. ${(p.quarterlyPrice / 3).toFixed(0)}/mes`,
          requiresDocument: true,
          documentRequirement: 'Carnet de Universidad/Instituto o Matrícula',
          features: [`¡Solo S/. ${(p.quarterlyPrice / 3).toFixed(1)} al mes!`, '3 meses completos de entrenamiento', 'Rutina progresiva trimestral'],
        });
      }
    } else if (p.id === 'combo_boxeo') {
      result.push({
        id: 'combo_boxeo',
        name: 'Combo Musculación + Escuela de Boxeo',
        price: p.monthlyPrice,
        duration: '1 mes',
        badge: p.badge || `Combo · S/. ${p.monthlyPrice}/mes`,
        features: p.highlights || ['Acceso a sala de pesas y máquinas', 'Clases dirigidas de Boxeo con instructores'],
      });
    } else {
      // General o personalizado
      result.push({
        id: p.id,
        name: `1 Mes · ${p.name}`,
        price: p.monthlyPrice,
        duration: '1 mes',
        badge: p.badge || 'Estándar Libre',
        popular: p.isPopular,
        features: p.highlights || ['Acceso total a máquinas y peso libre', 'Asesoría con entrenadores oficiales'],
      });
      if (p.quarterlyPrice > 0) {
        result.push({
          id: `${p.id}-3m`,
          name: `3 Meses · ${p.name}`,
          price: p.quarterlyPrice,
          duration: '3 meses',
          badge: 'Ahorro Trimestral',
          features: [`S/. ${(p.quarterlyPrice / 3).toFixed(1)} al mes`, 'Rutina de 12 semanas por coach'],
        });
      }
      if (p.semiannualPrice > 0) {
        result.push({
          id: `${p.id}-6m`,
          name: `6 Meses · ${p.name}`,
          price: p.semiannualPrice,
          duration: '6 meses',
          badge: 'Semestral',
          features: ['Medio año de transformación física', 'Acompañamiento personalizado'],
        });
      }
      if (p.annualPrice > 0) {
        result.push({
          id: `${p.id}-1y`,
          name: `1 Año · ${p.name}`,
          price: p.annualPrice,
          duration: '12 meses',
          badge: 'Máximo Ahorro',
          features: ['12 meses de acceso total', 'Carnet digital VIP'],
        });
      }
    }
  });

  return result;
};

export const GYM_PLANS_CATALOG = getClientePlansCatalog();

interface ClientCache {
  timestamp: number;
  routine: MemberRoutine | null;
}

export interface FirstLoginPasswordModalProps {
  isOpen: boolean;
  effectiveDni: string;
  memberName: string;
  showGoogleEmailInput: boolean;
  firstLoginPassword: string;
  setFirstLoginPassword: (val: string) => void;
  firstLoginConfirm: string;
  setFirstLoginConfirm: (val: string) => void;
  firstLoginEmail: string;
  setFirstLoginEmail: (val: string) => void;
  showFirstLoginPw: boolean;
  setShowFirstLoginPw: (val: boolean | ((prev: boolean) => boolean)) => void;
  firstLoginError: string | null;
  isSubmittingFirstLogin: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function FirstLoginPasswordModal({
  isOpen,
  memberName,
  showGoogleEmailInput,
  firstLoginPassword,
  setFirstLoginPassword,
  firstLoginConfirm,
  setFirstLoginConfirm,
  firstLoginEmail,
  setFirstLoginEmail,
  showFirstLoginPw,
  setShowFirstLoginPw,
  firstLoginError,
  isSubmittingFirstLogin,
  onSubmit,
}: FirstLoginPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 border border-amber-400/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

        {/* Encabezado con badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Primer Ingreso · Seguridad de la Cuenta</span>
        </div>

        {/* Título */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>🔒</span> Actualiza tu Contraseña de Ingreso
        </h2>

        {/* Subtítulo */}
        <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
          Hola <span className="font-semibold text-white">{memberName}</span>. Tu cuenta inicial usa tu número de DNI como contraseña. Para proteger tu información, por favor define tu contraseña personal de acceso.
        </p>

        {/* Mensaje de error si hubo fallo en validación */}
        {firstLoginError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{firstLoginError}</span>
          </div>
        )}

        {/* Formulario de actualización */}
        <form onSubmit={onSubmit} className="mt-5 space-y-4 font-mono text-xs">
          {/* Input: Nueva Contraseña */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 font-sans">
              Nueva Contraseña <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showFirstLoginPw ? 'text' : 'password'}
                required
                minLength={6}
                value={firstLoginPassword}
                onChange={(e) => setFirstLoginPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowFirstLoginPw((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={showFirstLoginPw ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showFirstLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-sans">Mínimo 6 caracteres alfanuméricos</p>
          </div>

          {/* Input: Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 font-sans">
              Confirmar Nueva Contraseña <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showFirstLoginPw ? 'text' : 'password'}
                required
                minLength={6}
                value={firstLoginConfirm}
                onChange={(e) => setFirstLoginConfirm(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-sans"
              />
            </div>
          </div>

          {/* Input (Opcional): Vincular cuenta de Google (Correo Gmail) */}
          {showGoogleEmailInput && (
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 font-sans">
                  Vincular tu cuenta de Google (Correo Gmail)
                </label>
                <span className="text-[10px] font-mono text-amber-400/80 uppercase font-semibold">Opcional</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={firstLoginEmail}
                  onChange={(e) => setFirstLoginEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-sans"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                Te permitirá iniciar sesión con Google con 1 solo clic en el futuro.
              </p>
            </div>
          )}

          {/* Botón de envío */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmittingFirstLogin}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
            >
              {isSubmittingFirstLogin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando Contraseña...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar Mi Nueva Contraseña y Ver Mi Carnet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ClientePortal() {
  const { user } = useAuth();
  const [members, setMembers] = useState<GymMember[]>(getStoredMembers());

  // Identificador de socio en sesión activa
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Estados de rutina y entrenamiento
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Rutina cargada con caché de 10 min
  const [memberRoutine, setMemberRoutine] = useState<MemberRoutine | null>(null);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(false);
  const [lastCacheSync, setLastCacheSync] = useState<string>('');

  // Estados para vinculación manual de DNI por parte del cliente
  const [inputDni, setInputDni] = useState('');
  const [inputName, setInputName] = useState(user?.user_metadata?.full_name || '');
  const [isLinkingDni, setIsLinkingDni] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [plansCatalogList, setPlansCatalogList] = useState(getClientePlansCatalog);
  const [selectedPlanForSub, setSelectedPlanForSub] = useState<string>('1 mes · Musculación Libre');
  const [isLoadingSocioOnline, setIsLoadingSocioOnline] = useState(false);
  const [codeFormat, setCodeFormat] = useState<'qr' | 'barcode'>('qr');

  // Tab activa del cliente
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'carnet' | 'rutina' | 'membresia' | 'perfil' | 'seguridad'>(
    tabParam === 'seguridad' || tabParam === 'rutina' || tabParam === 'membresia' || tabParam === 'perfil' ? tabParam : 'carnet'
  );

  // Estados para gestión de Mis Datos Personales (Pestaña 'perfil')
  const [perfilNombre, setPerfilNombre] = useState('');
  const [perfilTelefono, setPerfilTelefono] = useState('');
  const [perfilEdad, setPerfilEdad] = useState<string>('');
  const [perfilGenero, setPerfilGenero] = useState<'Masculino' | 'Femenino' | 'Otro'>('Masculino');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [perfilObservaciones, setPerfilObservaciones] = useState('');
  const [perfilStatus, setPerfilStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingPerfil, setIsSavingPerfil] = useState(false);

  // Estados para Cambio de Contraseña DNI y Vinculación de Correo/Google
  const [passwordActualInput, setPasswordActualInput] = useState('');
  const [passwordNuevoInput, setPasswordNuevoInput] = useState('');
  const [passwordConfirmarInput, setPasswordConfirmarInput] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [emailVincularInput, setEmailVincularInput] = useState('');
  const [emailVincularStatus, setEmailVincularStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setPlansCatalogList(getClientePlansCatalog());
    window.addEventListener('gym-plans-updated', handleUpdate);
    return () => window.removeEventListener('gym-plans-updated', handleUpdate);
  }, []);

  // Sincronización automática de perfil/socio desde Supabase al iniciar sesión (Multi-dispositivo)
  useEffect(() => {
    let isMounted = true;
    async function sincronizarSocioOnline() {
      if (!user?.id) return;
      setIsLoadingSocioOnline(true);
      try {
        const onlineMember = await obtenerSocioPorUserId(user.id);
        if (onlineMember && isMounted) {
          setMembers((prev) => {
            const exists = prev.some(
              (m) => m.id === onlineMember.id || (onlineMember.dni && m.dni === onlineMember.dni)
            );
            return exists
              ? prev.map((m) =>
                  m.id === onlineMember.id || (onlineMember.dni && m.dni === onlineMember.dni)
                    ? onlineMember
                    : m
                )
              : [onlineMember, ...prev];
          });
          setSelectedMemberId(onlineMember.id);
        }
      } catch {}
      if (isMounted) setIsLoadingSocioOnline(false);
    }
    sincronizarSocioOnline();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Socio activo determinado por correo personal o DNI vinculado
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userDni = (user?.user_metadata?.dni || '').trim();
  const canonicalDniMatch = userEmail.match(/^(\d{8})@socio\.trankilandia\.pe$/);
  const effectiveDni = userDni || (canonicalDniMatch ? canonicalDniMatch[1] : '');

  const linkedMember = members.find(
    (m) =>
      (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
      (effectiveDni && m.dni && m.dni.trim() === effectiveDni)
  ) || null;

  const currentMember =
    (selectedMemberId ? members.find((m) => m.id === selectedMemberId) : null) ||
    linkedMember ||
    null;

  const hasOfficialEmail = Boolean(
    (currentMember?.email &&
      !currentMember.email.endsWith('@socio.trankilandia.pe') &&
      !currentMember.email.endsWith('@cliente.trankilandia.pe')) ||
    (userEmail &&
      !userEmail.endsWith('@socio.trankilandia.pe') &&
      !userEmail.endsWith('@cliente.trankilandia.pe'))
  );

  useEffect(() => {
    if (currentMember) {
      setPerfilNombre(currentMember.name || '');
      setPerfilTelefono(currentMember.phone || '');
      setPerfilEdad(currentMember.age ? String(currentMember.age) : '');
      setPerfilGenero((currentMember.gender as 'Masculino' | 'Femenino' | 'Otro') || 'Masculino');
      setPerfilEmail(currentMember.email || userEmail || '');
      setPerfilObservaciones(currentMember.observations || '');
    }
  }, [currentMember, userEmail]);

  const handleGuardarMisDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;
    setIsSavingPerfil(true);
    setPerfilStatus(null);
    try {
      const updatedData: Partial<GymMember> = {
        name: perfilNombre.trim() || currentMember.name,
        phone: perfilTelefono.trim(),
        age: perfilEdad ? Number(perfilEdad) : undefined,
        gender: perfilGenero,
        observations: perfilObservaciones.trim(),
      };

      if (!hasOfficialEmail && perfilEmail.trim()) {
        updatedData.email = perfilEmail.trim().toLowerCase();
      }

      await updateMemberProfile(currentMember.id, updatedData);

      const freshMembers = getStoredMembers();
      const updatedList = freshMembers.map((m) =>
        m.id === currentMember.id ? { ...m, ...updatedData } : m
      );
      saveStoredMembers(updatedList);
      setMembers(updatedList);

      window.dispatchEvent(new CustomEvent('gym-members-updated'));
      setPerfilStatus({
        type: 'success',
        message: '¡Tus datos personales fueron actualizados con éxito!',
      });
      setTimeout(() => setPerfilStatus(null), 4000);
    } catch (err: any) {
      setPerfilStatus({
        type: 'error',
        message: err?.message || 'Error al actualizar tus datos personales.',
      });
    } finally {
      setIsSavingPerfil(false);
    }
  };

  // Sincronización en Tiempo Real Multi-Dispositivo (Carnet, Vigencia y Turno)
  useEffect(() => {
    let isMounted = true;

    const refrescarSocio = async () => {
      // 1. Refrescar lista de miembros desde almacenamiento local
      const freshMembers = getStoredMembers();
      if (isMounted) {
        setMembers(freshMembers);
      }

      // 2. Si hay usuario autenticado, recargar desde Supabase para reflejar nueva vigencia o turno
      if (user?.id) {
        try {
          const freshOnline = await obtenerSocioPorUserId(user.id);
          if (freshOnline && isMounted) {
            setMembers((prev) => {
              const exists = prev.some(
                (m) => m.id === freshOnline.id || (freshOnline.dni && m.dni === freshOnline.dni)
              );
              return exists
                ? prev.map((m) =>
                    m.id === freshOnline.id || (freshOnline.dni && m.dni === freshOnline.dni)
                      ? freshOnline
                      : m
                  )
                : [freshOnline, ...prev];
            });
            setSelectedMemberId(freshOnline.id);
          }
        } catch (err) {
          console.warn('Error sincronizando socio en ClientePortal:', err);
        }
      }
    };

    // Escuchar eventos locales de actualización de socios (gym-members-updated)
    const handleMembersUpdated = () => {
      refrescarSocio();
    };
    window.addEventListener('gym-members-updated', handleMembersUpdated);

    // Escuchar cambios entre pestañas vía storage
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('members')) {
        refrescarSocio();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Suscribirse a Supabase Realtime si está conectado
    const unsubscribeRealtime = subscribeToGymRealtime({
      onSociosChange: async (payload) => {
        const updatedSocio = payload?.new;
        if (!updatedSocio) return;

        // Comprobar si el cambio coincide con este cliente
        const matchesUser =
          (user?.id && (updatedSocio.user_id === user.id || updatedSocio.id === user.id)) ||
          (effectiveDni && updatedSocio.dni && updatedSocio.dni.trim() === effectiveDni.trim()) ||
          (userEmail && updatedSocio.email && updatedSocio.email.toLowerCase().trim() === userEmail);

        if (matchesUser) {
          // Actualización inmediata del carnet y vigencia en el estado local
          const isExpired = updatedSocio.fecha_fin
            ? updatedSocio.fecha_fin < new Date().toISOString().split('T')[0]
            : false;

          const directMapped: GymMember = {
            id: updatedSocio.id,
            name: updatedSocio.nombre,
            dni: updatedSocio.dni,
            email: updatedSocio.email || '',
            phone: updatedSocio.celular || '',
            plan: updatedSocio.plan,
            planPrice: Number(updatedSocio.precio_plan) || 80,
            paymentType: updatedSocio.tipo_pago || 'full',
            advancePaid: Number(updatedSocio.adelanto_pagado) || 0,
            balanceDue: Number(updatedSocio.saldo_pendiente) || 0,
            paymentDueDate: updatedSocio.fecha_limite_pago || undefined,
            paymentMethod: updatedSocio.metodo_pago || 'efectivo',
            receiptNumber: updatedSocio.numero_boleta || 'B001-000000',
            membershipStatus: isExpired ? 'inactive' : 'active',
            expiresAt: updatedSocio.fecha_fin ? `${updatedSocio.fecha_fin}` : '30 Nov 2026',
            coachName: updatedSocio.coach_asignado || 'Coach Marcos Rivas',
            registeredAt: updatedSocio.created_at
              ? new Date(updatedSocio.created_at).toLocaleDateString('es-PE')
              : 'Oct 2026',
            observations: updatedSocio.observaciones || undefined,
            age: updatedSocio.edad || undefined,
            gender: updatedSocio.sexo || undefined,
            shift: (updatedSocio.turno as 'manana' | 'tarde' | 'noche') || 'manana',
          };

          if (isMounted) {
            setMembers((prev) => {
              const exists = prev.some(
                (m) => m.id === directMapped.id || (directMapped.dni && m.dni === directMapped.dni)
              );
              const next = exists
                ? prev.map((m) =>
                    m.id === directMapped.id || (directMapped.dni && m.dni === directMapped.dni)
                      ? { ...m, ...directMapped }
                      : m
                  )
                : [directMapped, ...prev];
              saveStoredMembers(next);
              return next;
            });
            setSelectedMemberId(directMapped.id);
          }

          // Confirmar y sincronizar con BD completa
          refrescarSocio();
        }
      },
    });

    return () => {
      isMounted = false;
      window.removeEventListener('gym-members-updated', handleMembersUpdated);
      window.removeEventListener('storage', handleStorage);
      unsubscribeRealtime();
    };
  }, [user?.id, userEmail, effectiveDni]);

  // Estados para Modal Automático de Primer Ingreso con DNI
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [firstLoginPassword, setFirstLoginPassword] = useState('');
  const [firstLoginConfirm, setFirstLoginConfirm] = useState('');
  const [firstLoginEmail, setFirstLoginEmail] = useState('');
  const [showFirstLoginPw, setShowFirstLoginPw] = useState(false);
  const [firstLoginError, setFirstLoginError] = useState<string | null>(null);
  const [isSubmittingFirstLogin, setIsSubmittingFirstLogin] = useState(false);
  const [firstLoginToast, setFirstLoginToast] = useState<string | null>(null);

  // Auto-activar modal de primer ingreso si el usuario inició con DNI de 8 dígitos y aún usa la clave por defecto
  useEffect(() => {
    if (effectiveDni && /^\d{8}$/.test(effectiveDni) && !getStoredCustomPassword(effectiveDni)) {
      setShowFirstLoginModal(true);
    }
  }, [effectiveDni, user]);

  // Auto-descartar toast tras 5 segundos
  useEffect(() => {
    if (!firstLoginToast) return;
    const timer = setTimeout(() => setFirstLoginToast(null), 5000);
    return () => clearTimeout(timer);
  }, [firstLoginToast]);

  const handleFirstLoginPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstLoginError(null);

    // 1. Validar que ambas contraseñas coincidan y tengan al menos 6 caracteres
    if (firstLoginPassword.length < 6) {
      setFirstLoginError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (firstLoginPassword !== firstLoginConfirm) {
      setFirstLoginError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (firstLoginPassword === effectiveDni) {
      setFirstLoginError('Por tu seguridad, la nueva contraseña no puede ser tu mismo número de DNI.');
      return;
    }

    const cleanEmail = firstLoginEmail.trim().toLowerCase();
    if (cleanEmail) {
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setFirstLoginError('Por favor ingresa una dirección de correo Gmail/Google válida.');
        return;
      }
    }

    setIsSubmittingFirstLogin(true);

    try {
      // 2. Invocar actualizarPasswordSocio(effectiveDni, nuevaClave)
      const resPw = await actualizarPasswordSocio(effectiveDni, firstLoginPassword);
      if (!resPw.success) {
        setFirstLoginError(resPw.message);
        setIsSubmittingFirstLogin(false);
        return;
      }

      // 3. Si se ingresó correo Google, invocar vincularCorreoASocio(effectiveDni, nuevoCorreo)
      if (cleanEmail) {
        const resEmail = await vincularCorreoASocio(effectiveDni, cleanEmail);
        if (resEmail.success && resEmail.member) {
          setMembers((prev) =>
            prev.map((m) => (m.id === resEmail.member!.id ? resEmail.member! : m))
          );
        }
      }

      // 4. Cerrar el modal, emitir toast de éxito y permitir navegar libremente en el portal
      setShowFirstLoginModal(false);
      setFirstLoginToast('¡Contraseña actualizada con éxito! Tu cuenta ahora está protegida.');
    } catch (err: any) {
      setFirstLoginError(err?.message || 'Error inesperado al actualizar la contraseña.');
    } finally {
      setIsSubmittingFirstLogin(false);
    }
  };

  const isNoMembership = Boolean(
    currentMember &&
      (currentMember.membershipStatus === 'inactive' ||
        currentMember.plan === 'Sin Membresía Activa' ||
        (currentMember.planPrice ?? 0) === 0)
  );

  const handleVincularDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLinkingDni(true);
    setLinkError(null);

    const res = await vincularDniCliente(user.id, user.email || '', inputDni, inputName);
    setIsLinkingDni(false);

    if (res.success && res.member) {
      const updated = members.some((m) => m.id === res.member!.id)
        ? members.map((m) => (m.id === res.member!.id ? res.member! : m))
        : [res.member!, ...members];
      setMembers(updated);
      setSelectedMemberId(res.member.id);
    } else {
      setLinkError(res.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const dniToUse = effectiveDni || currentMember?.dni;
    if (!dniToUse) {
      setPasswordStatus({
        type: 'error',
        message: 'No se detectó un DNI asociado a esta cuenta para cambiar la contraseña.',
      });
      return;
    }

    if (passwordNuevoInput !== passwordConfirmarInput) {
      setPasswordStatus({
        type: 'error',
        message: 'La nueva contraseña y su confirmación no coinciden.',
      });
      return;
    }

    if (passwordNuevoInput.length < 6) {
      setPasswordStatus({
        type: 'error',
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus(null);

    const res = await actualizarPasswordSocio(dniToUse, passwordNuevoInput, passwordActualInput || undefined);
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordStatus({ type: 'success', message: res.message });
      setPasswordActualInput('');
      setPasswordNuevoInput('');
      setPasswordConfirmarInput('');
    } else {
      setPasswordStatus({ type: 'error', message: res.message });
    }
  };

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const dniToUse = effectiveDni || currentMember?.dni;
    if (!dniToUse) {
      setEmailVincularStatus({
        type: 'error',
        message: 'Primero debes tener un DNI asignado para unificar tu cuenta.',
      });
      return;
    }

    if (!emailVincularInput || !emailVincularInput.includes('@')) {
      setEmailVincularStatus({
        type: 'error',
        message: 'Ingresa una dirección de correo electrónico válida.',
      });
      return;
    }

    setIsLinkingEmail(true);
    setEmailVincularStatus(null);

    const res = await vincularCorreoASocio(dniToUse, emailVincularInput);
    setIsLinkingEmail(false);

    if (res.success && res.member) {
      setEmailVincularStatus({ type: 'success', message: res.message });
      setEmailVincularInput('');
      setMembers((prev) => prev.map((m) => (m.id === res.member!.id ? res.member! : m)));
    } else {
      setEmailVincularStatus({ type: 'error', message: res.message });
    }
  };

  // CARGAR RUTINA CON CACHÉ DE CLIENTE (TTL: 10 MINUTOS EN SESSIONSTORAGE)
  const loadRoutineWithCache = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!currentMember) return;
      const cacheKey = `trankilandia_routine_${currentMember.id}`;

      // 1. Revisar caché local si no se fuerza la recarga
      if (!forceRefresh) {
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed: ClientCache = JSON.parse(raw);
            const isFresh = Date.now() - parsed.timestamp < 10 * 60 * 1000; // 10 min TTL
            if (isFresh && parsed.routine) {
              setMemberRoutine(parsed.routine);
              setLastCacheSync(
                new Date(parsed.timestamp).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              );
              return;
            }
          }
        } catch {}
      }

      // 2. Fetch fresco desde Supabase
      setIsLoadingRoutine(true);
      try {
        const freshRoutine = await getMemberRoutine(currentMember.id);
        const fallback =
          freshRoutine ||
          getStoredRoutines()[currentMember.id] ||
          INITIAL_ROUTINES['MEM-001'] || {
            memberId: currentMember.id,
            routineTitle: 'Rutina Base de Fuerza & Musculación',
            objective: 'Acondicionamiento físico general',
            coachName: currentMember.coachName || 'Coach Marcos Rivas',
            updatedAt: 'Hoy',
            coachNotes: 'Mantener buena forma y calentar 10 minutos antes de entrenar.',
            days: [],
          };

        setMemberRoutine(fallback);

        // Guardar en sessionStorage
        const cacheData: ClientCache = {
          timestamp: Date.now(),
          routine: fallback,
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        setLastCacheSync(
          new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        );
      } catch {
        // En caso de falla, fallback local
        const local = getStoredRoutines()[currentMember.id] || INITIAL_ROUTINES['MEM-001'];
        setMemberRoutine(local);
      }
      setIsLoadingRoutine(false);
    },
    [currentMember]
  );

  useEffect(() => {
    loadRoutineWithCache(false);
  }, [loadRoutineWithCache]);


  // DESCARGA DEL CARNET DIGITAL EN ALTA RESOLUCIÓN (SCALE 2.5)
  const handleDownloadCarnetPNG = () => {
    if (!currentMember || !currentMember.dni) return;
    exportCarnetDigitalPNG(
      {
        nombre: currentMember.name,
        dni: currentMember.dni,
        memberId: currentMember.id,
        plan: currentMember.plan,
        turno: currentMember.shift || 'manana',
        coach: currentMember.coachName || 'Coach Marcos Rivas',
        estado: currentMember.balanceDue > 0 ? 'Con Adelanto' : 'Al Día',
        tieneDeuda: currentMember.balanceDue > 0,
        saldoDeuda: currentMember.balanceDue,
        vencimiento: currentMember.expiresAt || '30 Nov 2026',
      },
      2.5
    );
  };

  const progressList = currentMember
    ? getStoredProgress().filter((p) => p.memberId === currentMember.id)
    : [];
  const latestProgress = progressList[0];

  const activeRoutine = memberRoutine || INITIAL_ROUTINES['MEM-001'];
  const activeDay = activeRoutine?.days?.[selectedDayIndex] || activeRoutine?.days?.[0];

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16 selection:bg-amber-400 selection:text-black">
      <PortalHeader
        currentRole="cliente"
        title="Portal del Socio"
        subtitle="Tu Carnet Digital, Horario y Rutina Personalizada"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoadingSocioOnline ? (
          <div className="max-w-md mx-auto py-24 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Verificando tu membresía en el padrón...</p>
          </div>
        ) : !currentMember ? (
          /* FORMULARIO DE REGISTRO / VINCULACIÓN UNIVERSAL PARA CLIENTES CON DNI */
          <div className="max-w-md mx-auto py-8">
            <div className="bg-zinc-900 border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight font-display">
                Genera tu Tarjeta de Ingreso
              </h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Ingresa tu nombre y número de DNI para vincular tu carnet oficial de Trankilandia Gym con código de acceso:
              </p>

              <form onSubmit={handleVincularDni} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase text-zinc-400 mb-1.5 font-bold">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-zinc-400 mb-1.5 font-bold">
                    Número de DNI (8 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={inputDni}
                    onChange={(e) => setInputDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="87654321"
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-lg text-white font-mono tracking-widest outline-none transition-colors"
                    required
                  />
                </div>

                {linkError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{linkError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLinkingDni || inputDni.length < 8}
                  className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider text-xs transition-all shadow-lg hover:shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLinkingDni ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando Carnet...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Activar Carnet Digital</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* ALERTA DE SIN MEMBRESÍA O SALDO PENDIENTE */}
            {isNoMembership ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center flex-shrink-0 font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                      Membresía Pendiente de Activación
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Tu carnet está listo. Para desbloquear sala de musculación y rutinas, activa tu plan hoy.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlansModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Elegir Plan
                </button>
              </div>
            ) : currentMember.balanceDue > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-black font-bold flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-tight text-white">
                      Saldo pendiente por liquidar en Caja
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Tienes un saldo de <span className="font-bold text-amber-400">S/. {currentMember.balanceDue}.00</span> por cancelar.
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20soy%20${encodeURIComponent(
                    currentMember.name
                  )}%20(DNI%20${currentMember.dni}),%20deseo%20completar%20mi%20saldo%20pendiente%20de%20S/.%20${currentMember.balanceDue}.00`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Pagar vía WhatsApp</span>
                </a>
              </div>
            ) : null}

            {/* BARRA DE NAVEGACIÓN DE PESTAÑAS DEL CLIENTE */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('carnet')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'carnet'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Mi Carnet</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rutina')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'rutina'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Mi Rutina</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('membresia')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'membresia'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Mi Membresía</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('perfil')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'perfil'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Mis Datos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('seguridad')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'seguridad'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Seguridad</span>
              </button>
            </div>

            {/* PESTAÑA 1: MI CARNET DIGITAL */}
            {activeTab === 'carnet' && (
              <div className="space-y-6">
                {/* TARJETA DIGITAL ESTILO APPLE WALLET */}
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header de la Tarjeta */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-sm tracking-tight text-white font-display">
                          TRANKILANDIA GYM
                        </div>
                        <div className="text-[10px] text-amber-400 font-mono tracking-wider">
                          SEDE EMADI · AYACUCHO
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                        isNoMembership
                          ? 'bg-zinc-800 text-amber-300 border-amber-400/30'
                          : currentMember.balanceDue > 0
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isNoMembership
                            ? 'bg-amber-400'
                            : currentMember.balanceDue > 0
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-emerald-400'
                        }`}
                      />
                      {isNoMembership
                        ? 'POR ACTIVAR'
                        : currentMember.balanceDue > 0
                        ? 'CON ADELANTO'
                        : 'SOCIO AL DÍA'}
                    </span>
                  </div>

                  {/* Datos del Socio */}
                  <div className="mt-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black font-black text-xl flex items-center justify-center border-2 border-amber-400 shadow-md">
                      {currentMember.name[0]?.toUpperCase() || 'S'}
                    </div>

                    <div className="truncate">
                      <h2 className="text-base sm:text-lg font-black text-white font-display uppercase tracking-tight truncate">
                        {currentMember.name}
                      </h2>
                      <div className="text-xs text-amber-400 font-mono font-bold mt-0.5">
                        DNI: {currentMember.dni}
                      </div>
                    </div>
                  </div>

                  {/* Selector de QR o Código de Barras */}
                  <div className="mt-5 p-1 bg-zinc-950/80 rounded-xl border border-white/10 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCodeFormat('qr')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        codeFormat === 'qr'
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Código QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeFormat('barcode')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        codeFormat === 'barcode'
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Código de Barras 1D</span>
                    </button>
                  </div>

                  {/* Contenedor Físico de Lectura */}
                  <div className="mt-3 p-4 rounded-2xl bg-white shadow-xl text-center flex flex-col items-center justify-center min-h-[160px]">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      Presenta este código al ingresar en puerta
                    </div>

                    {codeFormat === 'qr' ? (
                      <div className="flex flex-col items-center py-1">
                        <QRCode2D value={currentMember.dni || ''} size={135} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        <Barcode128 value={currentMember.dni || ''} />
                      </div>
                    )}
                  </div>

                  {/* Fila de Acciones Principales */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadCarnetPNG}
                      className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-black py-3 px-4 rounded-xl text-xs font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Carnet para Celular</span>
                    </button>

                    {!isNoMembership && (
                      <button
                        type="button"
                        onClick={() => setIsReceiptOpen(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Ver Boleta</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* HORARIO & COACH ASIGNADO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Turno */}
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                      {currentMember.shift === 'manana' && <Sun className="w-5 h-5" />}
                      {currentMember.shift === 'tarde' && <Sunset className="w-5 h-5" />}
                      {currentMember.shift === 'noche' && <Moon className="w-5 h-5" />}
                      {!currentMember.shift && <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Tu Horario Oficial</div>
                      <div className="text-sm font-bold text-white uppercase mt-0.5">
                        {currentMember.shift === 'manana'
                          ? 'Mañana (6:00 AM - 2:00 PM)'
                          : currentMember.shift === 'tarde'
                          ? 'Tarde (2:00 PM - 6:00 PM)'
                          : 'Noche (6:00 PM - 10:00 PM)'}
                      </div>
                    </div>
                  </div>

                  {/* Coach */}
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Entrenador en Sala</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {currentMember.coachName || 'Coach Marcos Rivas'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: MI RUTINA DE ENTRENAMIENTO */}
            {activeTab === 'rutina' && (
              <div className="space-y-5">
                {isNoMembership ? (
                  <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">
                      Rutina Bloqueada
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Tu programa de entrenamiento con series y repeticiones se activará cuando actives tu membresía.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPlansModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase cursor-pointer"
                    >
                      Activar Plan
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
                    {/* Header de la Rutina */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h3 className="text-base font-bold text-white uppercase">
                          {activeRoutine?.routineTitle || 'Plan de Entrenamiento'}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Supervisado por <strong className="text-amber-400">{activeRoutine?.coachName || currentMember.coachName || 'Coach Marcos'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {lastCacheSync && (
                          <span className="text-[10px] text-zinc-500 hidden sm:inline">
                            Sincronizado: {lastCacheSync}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={isLoadingRoutine}
                          onClick={() => loadRoutineWithCache(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoutine ? 'animate-spin text-amber-400' : ''}`} />
                          <span>Sincronizar</span>
                        </button>
                      </div>
                    </div>

                    {/* Selector de Días */}
                    {activeRoutine?.days && activeRoutine.days.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {activeRoutine.days.map((d, idx) => (
                          <button
                            key={d.id || idx}
                            type="button"
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                              selectedDayIndex === idx
                                ? 'bg-amber-400 text-black shadow-sm'
                                : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {d.dayName}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Enfoque del Día */}
                    {activeDay && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>
                            Grupo Muscular: <strong className="text-white">{activeDay.focus}</strong>
                          </span>
                          <span>
                            {activeDay.exercises.filter((ex) => completedExercises[ex.id]).length} de {activeDay.exercises.length} completados
                          </span>
                        </div>

                        {/* Ejercicios */}
                        <div className="space-y-2.5">
                          {activeDay.exercises.map((ex) => {
                            const isDone = completedExercises[ex.id];
                            return (
                              <div
                                key={ex.id}
                                onClick={() => toggleExercise(ex.id)}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                                      isDone
                                        ? 'bg-emerald-500 border-emerald-500 text-black'
                                        : 'border-white/20'
                                    }`}
                                  >
                                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>

                                  <div>
                                    <div className={`font-bold text-sm ${isDone ? 'line-through text-zinc-400' : 'text-white'}`}>
                                      {ex.name}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                      <span className="text-amber-400 font-bold">{ex.sets} series</span>
                                      <span>•</span>
                                      <span>{ex.reps} reps</span>
                                      <span>•</span>
                                      <span>Descanso: {ex.rest}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA 3: MI MEMBRESÍA & PAGOS */}
            {activeTab === 'membresia' && (
              <div className="space-y-5">
                {/* Resumen del Plan */}
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs uppercase text-zinc-400 font-bold">Estado del Plan</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isNoMembership
                          ? 'bg-zinc-800 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isNoMembership ? 'Inactivo' : 'Activo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Plan:</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{currentMember.plan}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">Vencimiento:</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{currentMember.expiresAt || '30 Nov 2026'}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">Estado de Pago:</span>
                      <span className={`font-bold text-sm mt-0.5 block ${currentMember.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {currentMember.balanceDue > 0 ? `Debe S/. ${currentMember.balanceDue}` : 'Al Día'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowPlansModal(true)}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Renovar o Cambiar Plan
                    </button>

                    <a
                      href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20soy%20${encodeURIComponent(
                        currentMember.name
                      )}%20(DNI%20${currentMember.dni}).%20Quisiera%20consultar%20sobre%20mi%20membresía.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Consultar en Recepción</span>
                    </a>
                  </div>
                </div>

                {/* Marcas Personales (PRs) */}
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-zinc-300">Mis Marcas Personales</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-zinc-500 block">Peso Corporal</span>
                      <span className="text-lg font-black text-white">{latestProgress?.weightKg || 76.5} kg</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-amber-400/20">
                      <span className="text-[10px] text-amber-400 block">Press Banca</span>
                      <span className="text-lg font-black text-amber-400">{latestProgress?.benchPressKg || 95} kg</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-amber-400/20">
                      <span className="text-[10px] text-amber-400 block">Sentadilla</span>
                      <span className="text-lg font-black text-amber-400">{latestProgress?.squatKg || 120} kg</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-amber-400/20">
                      <span className="text-[10px] text-amber-400 block">Peso Muerto</span>
                      <span className="text-lg font-black text-amber-400">{latestProgress?.deadliftKg || 140} kg</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA: GESTIÓN DE MIS DATOS PERSONALES */}
            {activeTab === 'perfil' && (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                      <User className="w-4 h-4" />
                      <span>Ficha Oficial del Socio</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
                      Gestión de Mis Datos Personales
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                      Mantén tu información personal y de contacto al día. Tu documento de identidad y correo oficial vinculado están protegidos por seguridad del sistema.
                    </p>
                  </div>

                  {perfilStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
                        perfilStatus.type === 'success'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/15 border border-red-500/30 text-red-300'
                      }`}
                    >
                      {perfilStatus.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      )}
                      <span className="font-medium">{perfilStatus.message}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleGuardarMisDatos} className="space-y-5">
                    {/* Fila 1: DNI y Correo (Bloqueados por regla de seguridad oficial) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* DNI Oficial Bloqueado */}
                      <div className="bg-zinc-950/70 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                            DNI / Documento Oficial
                          </label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-white/10 font-bold">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            Bloqueado
                          </span>
                        </div>
                        <div className="relative mt-2">
                          <input
                            type="text"
                            readOnly
                            value={currentMember.dni || effectiveDni || 'Sin DNI'}
                            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 font-mono cursor-not-allowed select-none pl-9 font-bold"
                          />
                          <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                          Identificación oficial inalterable por auditoría y seguridad.
                        </p>
                      </div>

                      {/* Correo Electrónico (Bloqueado si tiene valor; editable si la casilla está vacía) */}
                      <div className="bg-zinc-950/70 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                            Correo Electrónico (Email)
                          </label>
                          {hasOfficialEmail ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-white/10 font-bold">
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                              Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                              Por Asignar
                            </span>
                          )}
                        </div>
                        <div className="relative mt-2">
                          <input
                            type="email"
                            readOnly={hasOfficialEmail}
                            value={perfilEmail}
                            onChange={(e) => setPerfilEmail(e.target.value)}
                            placeholder="tu_correo@gmail.com"
                            className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-mono pl-9 ${
                              hasOfficialEmail
                                ? 'bg-zinc-900/80 border border-white/10 text-zinc-300 cursor-not-allowed select-none font-bold'
                                : 'bg-zinc-900 border border-amber-400/30 text-white focus:outline-none focus:border-amber-400'
                            }`}
                          />
                          <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                          {hasOfficialEmail
                            ? 'Correo oficial vinculado a tu cuenta (protegido contra modificaciones).'
                            : 'Casilla vacía: ingresa tu correo personal para vincularlo.'}
                        </p>
                      </div>
                    </div>

                    {/* Fila 2: Nombre Completo y Teléfono Celular */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          required
                          value={perfilNombre}
                          onChange={(e) => setPerfilNombre(e.target.value)}
                          placeholder="Tu nombre completo"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Teléfono Celular
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            maxLength={12}
                            value={perfilTelefono}
                            onChange={(e) => setPerfilTelefono(e.target.value.replace(/[^\d+ ]/g, ''))}
                            placeholder="Ej. 958183360"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono pr-10"
                          />
                          <Phone className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Fila 3: Edad y Género */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Edad
                        </label>
                        <input
                          type="number"
                          min={12}
                          max={99}
                          value={perfilEdad}
                          onChange={(e) => setPerfilEdad(e.target.value)}
                          placeholder="Ej. 26"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Género / Sexo
                        </label>
                        <select
                          value={perfilGenero}
                          onChange={(e) => setPerfilGenero(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila 4: Observaciones Médicas / Físicas / Lesiones */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Observaciones Médicas, Lesiones o Indicaciones Especiales
                      </label>
                      <textarea
                        rows={3}
                        value={perfilObservaciones}
                        onChange={(e) => setPerfilObservaciones(e.target.value)}
                        placeholder="Ej. Cirugía previa de meniscos, dolor lumbar leve, asmático, alergias, o tus metas de peso/fuerza."
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none font-sans"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Esta información es visible para tus entrenadores asignados para adaptar tus series y cargas en sala.
                      </p>
                    </div>

                    {/* Botón de Guardar */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingPerfil}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold uppercase tracking-wider text-xs transition-all shadow-lg hover:shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingPerfil ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Guardando Mis Datos...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Guardar Mis Datos</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* PESTAÑA 4: SEGURIDAD, CONTRASEÑA & CUENTAS VINCULADAS */}
            {activeTab === 'seguridad' && (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Cuenta Única &amp; Doble Acceso</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
                      Seguridad y Métodos de Ingreso
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                      En Trankilandia Gym puedes ingresar con tu <strong className="text-white">DNI y contraseña</strong> o con tu <strong className="text-white">cuenta de Google</strong>. Ambos accesos están vinculados a este mismo perfil y carnet oficial.
                    </p>
                  </div>

                  {/* Tarjetas de Métodos de Ingreso */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Tarjeta 1: Acceso con DNI & Cambio de Contraseña */}
                    <div className="bg-zinc-950/80 border border-amber-400/30 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm uppercase">Acceso con DNI</h4>
                            <p className="text-[11px] font-mono text-zinc-400">DNI: {effectiveDni || currentMember?.dni || 'Sin DNI asignado'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {getStoredCustomPassword(effectiveDni || currentMember?.dni || '') ? 'Clave Personalizada' : 'Clave Inicial DNI'}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Tu contraseña inicial de acceso es tu mismo número de DNI. Puedes actualizarla por una contraseña privada cuando desees.
                      </p>

                      {passwordStatus && (
                        <div
                          className={`p-3 rounded-xl text-xs ${
                            passwordStatus.type === 'success'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                              : 'bg-red-500/15 border border-red-500/30 text-red-300'
                          }`}
                        >
                          {passwordStatus.message}
                        </div>
                      )}

                      <form onSubmit={handleChangePassword} className="space-y-3 font-mono text-xs">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                            Contraseña Actual (o tu DNI si es primer cambio)
                          </label>
                          <input
                            type="password"
                            value={passwordActualInput}
                            onChange={(e) => setPasswordActualInput(e.target.value)}
                            placeholder="Tu DNI o clave actual"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
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
                            value={passwordNuevoInput}
                            onChange={(e) => setPasswordNuevoInput(e.target.value)}
                            placeholder="Nueva clave segura"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
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
                            value={passwordConfirmarInput}
                            onChange={(e) => setPasswordConfirmarInput(e.target.value)}
                            placeholder="Repite la nueva clave"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isChangingPassword}
                          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-extrabold uppercase py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                        >
                          {isChangingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                      </form>
                    </div>

                    {/* Tarjeta 2: Acceso con Google & Vinculación de Correo */}
                    <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white text-zinc-900 font-black">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm uppercase">Cuenta de Google</h4>
                            <p className="text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
                              {currentMember?.email && !currentMember.email.endsWith('@socio.trankilandia.pe') && !currentMember.email.endsWith('@cliente.trankilandia.pe')
                                ? currentMember.email
                                : userEmail && !userEmail.endsWith('@socio.trankilandia.pe')
                                ? userEmail
                                : 'Sin correo personal vinculado'}
                            </p>
                          </div>
                        </div>

                        {currentMember?.email && !currentMember.email.endsWith('@socio.trankilandia.pe') && !currentMember.email.endsWith('@cliente.trankilandia.pe') ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Vinculado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Pendiente
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Vincula tu correo personal para iniciar sesión con un solo clic usando el botón <strong className="text-white">Continuar con Google</strong> en tu celular o computadora.
                      </p>

                      {emailVincularStatus && (
                        <div
                          className={`p-3 rounded-xl text-xs ${
                            emailVincularStatus.type === 'success'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                              : 'bg-red-500/15 border border-red-500/30 text-red-300'
                          }`}
                        >
                          {emailVincularStatus.message}
                        </div>
                      )}

                      <form onSubmit={handleLinkEmail} className="space-y-3 font-mono text-xs">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-zinc-300 mb-1 font-semibold">
                            Correo Electrónico (Gmail o Personal)
                          </label>
                          <input
                            type="email"
                            required
                            value={emailVincularInput}
                            onChange={(e) => setEmailVincularInput(e.target.value)}
                            placeholder="ejemplo@gmail.com"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLinkingEmail}
                          className="w-full bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-extrabold uppercase py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
                        >
                          {isLinkingEmail ? 'Vinculando...' : 'Vincular Correo a Mi Cuenta'}
                        </button>
                      </form>

                      <div className="pt-2 text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Tanto el DNI como el correo Google abren la misma cuenta de socio.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </>
        )}
      </main>

      {/* MODAL DE BOLETA / COMPROBANTE OFICIAL */}
      {currentMember && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          member={currentMember}
          paymentAmount={currentMember.advancePaid}
          paymentTypeTitle={currentMember.paymentType === 'advance' ? 'Adelanto de Membresía' : 'Membresía Completa'}
          paymentMethod={currentMember.paymentMethod}
        />
      )}

      {/* MODAL DE PLANES Y SUSCRIPCIÓN PARA SOCIOS NUEVOS O SIN MEMBRESÍA */}
      {showPlansModal && currentMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-zinc-900 border border-amber-400/40 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setShowPlansModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-amber-400 text-black font-black">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                  Planes de Membresía Trankilandia Gym
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Elige tu plan oficial para activar el acceso a sala de musculación y rutinas.
                </p>
              </div>
            </div>

            {/* Grid de Planes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {plansCatalogList.map((plan) => {
                const isSelected = selectedPlanForSub === plan.name;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanForSub(plan.name)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                        : 'bg-zinc-950/80 border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {plan.badge}
                        </span>
                        {plan.popular && (
                          <span className="text-[9px] font-mono font-black uppercase text-amber-400">
                            ★ POPULAR
                          </span>
                        )}
                      </div>

                      <div className="font-black text-sm uppercase font-display leading-tight">
                        {plan.name}
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-display mt-2">
                        S/. {plan.price}.00
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                        Duración: {plan.duration}
                      </div>

                      <ul className="mt-3 space-y-1 text-[11px] font-mono text-zinc-400">
                        {(plan.features || []).map((feat: string, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {isSelected ? 'Seleccionado' : 'Elegir'}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-black'
                            : 'border-white/30'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECCIÓN DE CARGA Y VALIDACIÓN DE DOCUMENTO PARA PLANES CON DESCUENTO */}
            {(selectedPlanForSub.toLowerCase().includes('escolar') || selectedPlanForSub.toLowerCase().includes('universit')) && (
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-400/10 border-2 border-amber-400/40 space-y-3 font-mono">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <h4 className="text-sm font-black text-amber-300 uppercase">
                      {selectedPlanForSub.toLowerCase().includes('escolar')
                        ? 'Validación Obligatoria: DNI Escolar (14 a 17 años)'
                        : 'Validación Obligatoria: Carnet de Universidad / Instituto'}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      currentMember.documentStatus === 'verificado'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : currentMember.documentStatus === 'pendiente'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {currentMember.documentStatus === 'verificado'
                      ? '✓ Documento Aprobado'
                      : currentMember.documentStatus === 'pendiente'
                      ? '🟡 Foto en Revisión'
                      : '⚪ Foto Pendiente'}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {selectedPlanForSub.toLowerCase().includes('escolar')
                    ? 'Para acceder a la tarifa escolar de S/. 50.00/mes, debes acreditar tu edad (14 a 17 años). Sube una foto de tu DNI o preséntalo físicamente en el mostrador.'
                    : 'Para la tarifa universitaria de S/. 60.00/mes o 3 meses x S/. 150.00, sube una foto nítida de tu carnet universitario/instituto vigente o constancia de matrícula.'}
                </p>

                {/* Foto cargada o botón para subir */}
                {currentMember.documentUrl ? (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-950 border border-white/10">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentMember.documentUrl}
                        alt="Documento cargado"
                        className="w-14 h-14 object-cover rounded-lg border border-white/10"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Foto de documento adjuntada</div>
                        <div className="text-[11px] text-zinc-400">
                          Estado:{' '}
                          <span className="text-amber-400 font-bold">
                            {currentMember.documentStatus === 'verificado'
                              ? 'Verificado ✓'
                              : 'Pendiente de validación'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-colors border border-white/10">
                      <span>Cambiar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const dataUrl = event.target?.result as string;
                              const docType = selectedPlanForSub.toLowerCase().includes('escolar')
                                ? 'dni_escolar'
                                : 'carnet_estudiante';
                              const updated = await updateMemberProfile(currentMember.id, {
                                documentUrl: dataUrl,
                                documentStatus: 'pendiente',
                                documentType: docType,
                                documentNotes: 'Documento subido por el alumno vía portal web',
                              });
                              saveStoredMembers(updated);
                              setMembers(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-amber-400/40 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <div className="text-xs font-bold text-white">Sube la foto de tu documento ahora</div>
                      <div className="text-[11px] text-zinc-400">Formatos permitidos: JPG, PNG o foto con la cámara</div>
                    </div>
                    <label className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>Subir Foto de DNI / Carnet</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const dataUrl = event.target?.result as string;
                              const docType = selectedPlanForSub.toLowerCase().includes('escolar')
                                ? 'dni_escolar'
                                : 'carnet_estudiante';
                              const updated = await updateMemberProfile(currentMember.id, {
                                documentUrl: dataUrl,
                                documentStatus: 'pendiente',
                                documentType: docType,
                                documentNotes: 'Documento subido por el alumno vía portal web',
                              });
                              saveStoredMembers(updated);
                              setMembers(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Opciones de Pago */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4 font-mono">
              <div className="text-xs font-bold uppercase text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>¿Cómo activar tu membresía seleccionada?</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Opción 1: Yape / Plin */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-amber-400/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">OPCIÓN 1: Yape / Plin</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      Inmediato
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Transfiere al número oficial de Trankilandia Gym:
                  </p>
                  <div className="text-lg font-black text-white font-mono bg-black/60 p-2 rounded-lg border border-white/10 flex items-center justify-between">
                    <span>999 787 489</span>
                    <span className="text-[10px] text-zinc-400">Trankilandia Gym</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Envía la captura de tu transferencia con tu DNI (<strong>{currentMember.dni}</strong>).
                  </p>
                  <a
                    href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20soy%20${encodeURIComponent(
                      currentMember.name
                    )}%20(DNI%20${currentMember.dni}).%20Deseo%20activar%20el%20plan%20"${encodeURIComponent(
                      selectedPlanForSub
                    )}"%20vía%20Yape/Plin.${
                      selectedPlanForSub.toLowerCase().includes('escolar') || selectedPlanForSub.toLowerCase().includes('universit')
                        ? '%20He%20adjuntado%20la%20foto%20de%20mi%20documento%20para%20la%20tarifa%20preferencial.'
                        : ''
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Voucher por WhatsApp</span>
                  </a>
                </div>

                {/* Opción 2: Efectivo / Tarjeta en Recepción */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">OPCIÓN 2: En Recepción</span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-bold">
                      Presencial
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Acércate a la Sede Emadi de Trankilandia Gym (José Olaya N° 640):
                  </p>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Muestra tu carnet digital con código de barras desde el celular.</li>
                    <li>Paga en efectivo, tarjeta POS, Yape o Plin en el mostrador.</li>
                    <li>Recepción activa tu ingreso en 1 segundo con la pistola láser.</li>
                  </ul>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlansModal(false);
                        handleDownloadCarnetPNG();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Carnet para Sede</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOQUEANTE DE PRIMER INGRESO CON DNI */}
      <AnimatePresence>
        {showFirstLoginModal && (
          <FirstLoginPasswordModal
            isOpen={showFirstLoginModal}
            effectiveDni={effectiveDni}
            memberName={
              currentMember?.name
                ? currentMember.name.split(' ')[0]
                : user?.user_metadata?.full_name?.split(' ')[0] || 'Socio'
            }
            showGoogleEmailInput={
              !currentMember?.email ||
              currentMember.email.toLowerCase().endsWith('@socio.trankilandia.pe') ||
              currentMember.email.toLowerCase().endsWith('@cliente.trankilandia.pe')
            }
            firstLoginPassword={firstLoginPassword}
            setFirstLoginPassword={setFirstLoginPassword}
            firstLoginConfirm={firstLoginConfirm}
            setFirstLoginConfirm={setFirstLoginConfirm}
            firstLoginEmail={firstLoginEmail}
            setFirstLoginEmail={setFirstLoginEmail}
            showFirstLoginPw={showFirstLoginPw}
            setShowFirstLoginPw={setShowFirstLoginPw}
            firstLoginError={firstLoginError}
            isSubmittingFirstLogin={isSubmittingFirstLogin}
            onSubmit={handleFirstLoginPasswordSubmit}
          />
        )}
      </AnimatePresence>

      {/* TOAST DE ÉXITO TRAS CONFIGURAR PRIMER INGRESO */}
      <AnimatePresence>
        {firstLoginToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-5 right-5 z-50 max-w-md bg-zinc-900 border border-emerald-500/50 shadow-2xl rounded-2xl p-4 flex items-start gap-3 text-emerald-300"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-white text-sm">¡Seguridad Configurada!</p>
              <p className="text-zinc-300 mt-0.5 leading-relaxed">{firstLoginToast}</p>
            </div>
            <button
              type="button"
              onClick={() => setFirstLoginToast(null)}
              className="text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
