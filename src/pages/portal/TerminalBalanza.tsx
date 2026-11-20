import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Bluetooth,
  Search,
  CheckCircle2,
  X,
  Share2,
  Lock,
  Smartphone,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  getStoredMembers,
  saveStoredMembers,
  loadCanonicalMembersFromExcel,
  GymMember,
} from '../../data/gymStore';
import { fetchSociosParaAdmin } from '../../lib/supabaseDb';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  isWebBluetoothAvailable,
  conectarBalanzaG78,
  ScaleConnectionHandle,
} from '../../lib/bleScaleConnector';
import {
  calcularMetricasCompletas,
  calcularDeltasMensuales,
  determinarDiagnostico,
} from '../../lib/bioimpedanceEngine';
import {
  guardarEvaluacion,
  obtenerUltimaEvaluacion,
} from '../../lib/evaluacionesService';
import { EvaluacionCorporal, DeltasEvaluacion, DiagnosticoRecomposicion } from '../../types/evaluacion';
import { verifyStaffPin } from '../../lib/staffStore';

export default function TerminalBalanza() {
  const navigate = useNavigate();

  // 1. Estado de Sesión del Operador
  const [operatorId, setOperatorId] = useState<string | null>(
    sessionStorage.getItem('trankilandia_active_staff_id')
  );
  const [operatorName, setOperatorName] = useState<string>(
    sessionStorage.getItem('trankilandia_active_staff_name') || 'Entrenador'
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // 2. Estado de Búsqueda y Selección del Socio
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<GymMember[]>([]);
  const [cloudSearchResults, setCloudSearchResults] = useState<GymMember[]>([]);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);
  const [previousEval, setPreviousEval] = useState<EvaluacionCorporal | null>(null);

  // 3. Parámetros Biométricos
  const [estaturaCm, setEstaturaCm] = useState<number>(170);
  const [edad, setEdad] = useState<number>(25);
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [showEstaturaModal, setShowEstaturaModal] = useState(false);

  // 4. Conexión Bluetooth & Pesaje
  const [bleSupported, setBleSupported] = useState(true);
  const [scaleConnection, setScaleConnection] = useState<ScaleConnectionHandle | null>(null);
  const [scaleStatus, setScaleStatus] = useState<string>('desconectado');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [liveWeight, setLiveWeight] = useState<number>(0);
  const [isWeightLocked, setIsWeightLocked] = useState(false);

  // 5. Modo Manual (para iPhone Safari o contingencia)
  const [manualMode, setManualMode] = useState(false);
  const [manualPeso, setManualPeso] = useState<string>('');
  const [manualGrasa, setManualGrasa] = useState<string>('');
  const [manualMusculo, setManualMusculo] = useState<string>('');

  // 6. Resultado y Guardado
  const [computedEval, setComputedEval] = useState<EvaluacionCorporal | null>(null);
  const [deltas, setDeltas] = useState<DeltasEvaluacion | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoRecomposicion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Carga inicial resiliente de socios (Caché Local -> Excel Canónico 417 -> Supabase 443)
  useEffect(() => {
    setBleSupported(isWebBluetoothAvailable());

    let isMounted = true;

    const loadAllMembers = async () => {
      // 1. Mostrar lo que haya en localStorage inmediatamente
      const local = getStoredMembers();
      if (local && local.length > 0 && isMounted) {
        setMembers(local);
      }

      // 2. Si hay pocos socios (< 50) o está vacío, cargar los 417 canónicos del bundle
      if (!local || local.length < 50) {
        try {
          const canonical = await loadCanonicalMembersFromExcel();
          if (canonical && canonical.length > 0 && isMounted) {
            setMembers((prev) => {
              const prevMap = new Map(prev.map((m) => [m.id, m]));
              canonical.forEach((c) => {
                if (!prevMap.has(c.id)) prevMap.set(c.id, c);
              });
              const merged = Array.from(prevMap.values());
              saveStoredMembers(merged);
              return merged;
            });
          }
        } catch (err) {
          console.warn('[TerminalBalanza] Error cargando canonical excel:', err);
        }
      }

      // 3. Sincronizar catálogo completo en vivo desde Supabase (443 socios)
      try {
        const cloudMembers = await fetchSociosParaAdmin();
        if (cloudMembers && cloudMembers.length > 0 && isMounted) {
          setMembers(cloudMembers);
          saveStoredMembers(cloudMembers);
        }
      } catch (err) {
        console.warn('[TerminalBalanza] Error sincronizando socios de Supabase:', err);
      }
    };

    loadAllMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Búsqueda en vivo en Supabase si se digitan 2+ caracteres
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setCloudSearchResults([]);
      setIsSearchingCloud(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingCloud(true);

    const timer = setTimeout(async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (!isCancelled) setIsSearchingCloud(false);
          return;
        }

        const isNum = /^\d+$/.test(q);
        let query = supabase.from('socios').select('*');

        if (isNum) {
          query = query.ilike('dni', `%${q}%`);
        } else {
          query = query.or(`nombre.ilike.%${q}%,dni.ilike.%${q}%`);
        }

        const { data: dbSocios } = await query.limit(10);

        if (!isCancelled && dbSocios) {
          const mapped: GymMember[] = dbSocios.map((s: any) => ({
            id: s.id,
            name: s.nombre,
            dni: s.dni || null,
            phone: s.celular || null,
            email: s.email || null,
            plan: s.plan,
            planPrice: Number(s.precio_plan) || 80,
            paymentType: s.tipo_pago || 'full',
            advancePaid: Number(s.adelanto_pagado) || 0,
            balanceDue: Number(s.saldo_pendiente) || 0,
            paymentDueDate: s.fecha_limite_pago || null,
            paymentMethod: 'efectivo',
            receiptNumber: s.numero_boleta || 'B001-000000',
            membershipStatus: s.estado_calculado === 'vencido' ? 'inactive' : 'active',
            expiresAt: s.fecha_fin || '2026-11-30',
            coachName: s.coach_asignado || 'Coach Marcos Rivas',
            shift: s.turno || 'manana',
            registeredAt: s.fecha_inicio || '2026-10-01',
            age: s.edad || null,
            gender: s.sexo || null,
            observations: s.observaciones || null,
          }));
          setCloudSearchResults(mapped);
        }
      } catch (err) {
        console.warn('[TerminalBalanza] Error en búsqueda cloud:', err);
      } finally {
        if (!isCancelled) setIsSearchingCloud(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Al seleccionar socio, cargar su estatura y última evaluación
  useEffect(() => {
    if (!selectedMember) {
      setPreviousEval(null);
      return;
    }

    const memberHeight = (selectedMember as any).estatura_cm;
    if (memberHeight && Number(memberHeight) > 100) {
      setEstaturaCm(Number(memberHeight));
    } else {
      setShowEstaturaModal(true);
    }

    if (selectedMember.age) {
      setEdad(Number(selectedMember.age));
    }
    const memberGender = selectedMember.gender || (selectedMember as any).sexo;
    if (memberGender === 'Femenino' || memberGender === 'Masculino') {
      setSexo(memberGender);
    }

    if (selectedMember.dni) {
      obtenerUltimaEvaluacion(selectedMember.dni).then((ult) => {
        setPreviousEval(ult);
      });
    }
  }, [selectedMember]);

  // Manejo de PIN NumPad
  const handlePinDigit = async (digit: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError(null);

    if (next.length === 4) {
      // Validar PIN canónico
      let staffId = 'staff-luis';
      let staffName = 'Luis Lloclla';

      if (next === '1234') {
        staffId = 'staff-marisol';
        staffName = 'Marisol Flores';
      } else if (next === '2026') {
        staffId = 'staff-luis';
        staffName = 'Luis Lloclla';
      } else {
        // Intentar validación remota/local
        const verify = await verifyStaffPin('staff-luis', next);
        if (!verify.success) {
          const verifyMarisol = await verifyStaffPin('staff-marisol', next);
          if (!verifyMarisol.success) {
            setPinError('PIN incorrecto. Ingrese 2026 o 1234.');
            setPinInput('');
            return;
          }
          staffId = 'staff-marisol';
          staffName = 'Marisol Flores';
        }
      }

      sessionStorage.setItem('trankilandia_active_staff_id', staffId);
      sessionStorage.setItem('trankilandia_active_staff_name', staffName);
      setOperatorId(staffId);
      setOperatorName(staffName);
      setPinInput('');
    }
  };

  // Iniciar Pesaje Bluetooth
  const handleStartBluetoothWeighing = async () => {
    try {
      setScaleStatus('buscando');
      setStatusMessage('Buscando balanza EUROMAR G78-BT...');

      const handle = await conectarBalanzaG78({
        onStatusChange: (estado, msg) => {
          setScaleStatus(estado);
          if (msg) setStatusMessage(msg);
        },
        onLiveWeight: (peso, estable) => {
          setLiveWeight(peso);
          setIsWeightLocked(estable);
          if (estable && selectedMember) {
            // Calcular evaluación
            const ev = calcularMetricasCompletas({
              socio_id: selectedMember.id,
              socio_dni: selectedMember.dni || '',
              peso_kg: peso,
              estatura_cm: estaturaCm,
              edad,
              sexo,
              evaluador_id: operatorId || 'staff-luis',
              evaluador_nombre: operatorName,
              origen: 'bluetooth_g78',
            });
            setComputedEval(ev);
            const d = calcularDeltasMensuales(ev, previousEval);
            setDeltas(d);
            setDiagnostico(determinarDiagnostico(d, ev));
          }
        },
        onError: (err) => {
          setStatusMessage(`Error: ${err.message}`);
        },
      });

      setScaleConnection(handle);
    } catch {
      // Error manejado en callback
    }
  };

  // Procesar entrada manual (iPhone o contingencia)
  const handleProcessManualWeighing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const pesoNum = parseFloat(manualPeso);
    if (isNaN(pesoNum) || pesoNum < 20 || pesoNum > 250) {
      alert('Ingresa un peso válido entre 20 kg y 250 kg.');
      return;
    }

    const grasaNum = manualGrasa ? parseFloat(manualGrasa) : undefined;
    const musculoNum = manualMusculo ? parseFloat(manualMusculo) : undefined;

    const ev = calcularMetricasCompletas({
      socio_id: selectedMember.id,
      socio_dni: selectedMember.dni || '',
      peso_kg: pesoNum,
      grasa_corporal_pct: grasaNum,
      masa_muscular_kg: musculoNum,
      estatura_cm: estaturaCm,
      edad,
      sexo,
      evaluador_id: operatorId || 'staff-luis',
      evaluador_nombre: operatorName,
      origen: 'manual',
    });

    setComputedEval(ev);
    const d = calcularDeltasMensuales(ev, previousEval);
    setDeltas(d);
    setDiagnostico(determinarDiagnostico(d, ev));
  };

  // Guardar Evaluación en Supabase
  const handleSaveEvaluation = async () => {
    if (!computedEval) return;
    setIsSaving(true);
    const res = await guardarEvaluacion(computedEval);
    setIsSaving(false);

    if (res.success) {
      setSavedSuccess(true);
      if (scaleConnection) {
        scaleConnection.disconnect();
      }
    } else {
      alert('Error guardando evaluación: ' + (res.error || 'Intente nuevamente'));
    }
  };

  // Reiniciar para siguiente socio
  const handleResetForNext = () => {
    setSelectedMember(null);
    setComputedEval(null);
    setDeltas(null);
    setDiagnostico(null);
    setLiveWeight(0);
    setIsWeightLocked(false);
    setSavedSuccess(false);
    setSearchQuery('');
    setManualPeso('');
    setManualGrasa('');
    setManualMusculo('');
    setScaleStatus('desconectado');
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!computedEval || !selectedMember) return;
    const phone = (selectedMember.phone || '').replace(/\D/g, '');
    const cleanPhone = phone.length === 9 ? `51${phone}` : phone;

    const texto = encodeURIComponent(
      `*TRANKILANDIA GYM · INFORME DE EVALUACIÓN CORPORAL*\n` +
      `👤 Socio: ${selectedMember.name}\n` +
      `📅 Fecha: ${new Date().toLocaleDateString('es-PE')}\n\n` +
      `⚖️ *Peso Total:* ${computedEval.peso_kg} kg\n` +
      `💪 *Masa Muscular:* ${computedEval.masa_muscular_kg} kg (${computedEval.masa_muscular_pct}%)\n` +
      `🔥 *Grasa Corporal:* ${computedEval.grasa_corporal_pct}%\n` +
      `🫀 *Grasa Visceral:* Nivel ${computedEval.grasa_visceral}\n` +
      `💧 *Hidratación:* ${computedEval.agua_pct}%\n` +
      `⚡ *Metabolismo Basal:* ${computedEval.bmr_kcal} kcal/día\n` +
      `⭐ *Puntuación Física:* ${computedEval.puntuacion_corporal}/100\n\n` +
      (diagnostico ? `🏆 *Diagnóstico:* ${diagnostico.titulo}\n${diagnostico.descripcion}\n\n` : '') +
      `📲 Consulta tus gráficos y progreso en: https://trankilandia-gym.vercel.app`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${texto}`, '_blank');
  };

  // =========================================================================
  // VISTA 1: BLOQUEO POR PIN DE PERSONAL
  // =========================================================================
  if (!operatorId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-amber-400 selection:text-black">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black font-display uppercase tracking-wider text-white">
                TRANKILANDIA GYM
              </h1>
              <p className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                TERMINAL DE PESAJES & BIA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-zinc-400 hover:text-white font-mono cursor-pointer"
          >
            Volver a la Web
          </button>
        </header>

        <main className="w-full max-w-sm mx-auto my-auto space-y-6 text-center">
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
              Terminal de Pesaje
            </h2>
            <p className="text-xs text-zinc-400 font-sans">
              Ingrese su PIN de 4 dígitos de entrenador o recepción para operar la báscula EUROMAR® G78-BT.
            </p>
          </div>

          {/* Display de 4 dígitos */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    filled
                      ? 'bg-amber-400 border-amber-400 shadow-md shadow-amber-400/50 scale-110'
                      : 'border-zinc-700 bg-zinc-900'
                  }`}
                />
              );
            })}
          </div>

          {pinError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              {pinError}
            </div>
          )}

          {/* NumPad Táctil */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') setPinInput('');
                  else if (btn === '⌫') setPinInput((p) => p.slice(0, -1));
                  else handlePinDigit(btn);
                }}
                className="h-14 rounded-2xl bg-zinc-900 border border-white/10 hover:border-amber-400/50 hover:bg-zinc-800 text-white font-mono font-bold text-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
              >
                {btn}
              </button>
            ))}
          </div>
        </main>

        <footer className="text-center text-[11px] font-mono text-zinc-600">
          Uso Exclusivo de Personal Autorizado · Trankilandia Gym Huamanga
        </footer>
      </div>
    );
  }

  // Combinar resultados locales + nube sin duplicados
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const localMatches = members.filter((m) => {
      const matchDni = m.dni && m.dni.toLowerCase().includes(q);
      const matchName = m.name && m.name.toLowerCase().includes(q);
      return matchDni || matchName;
    });

    const seenIds = new Set(localMatches.map((m) => m.id));
    const seenDnis = new Set(localMatches.map((m) => m.dni).filter(Boolean));

    const extraCloud = cloudSearchResults.filter(
      (c) => !seenIds.has(c.id) && (!c.dni || !seenDnis.has(c.dni))
    );

    return [...localMatches, ...extraCloud].slice(0, 10);
  }, [members, cloudSearchResults, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-display text-white uppercase tracking-tight">
                ESTACIÓN DE PESAJE BIA
              </span>
              <span className="text-[10px] font-mono bg-amber-400/10 border border-amber-400/30 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                EUROMAR G78
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Operador activo: <strong className="text-white">{operatorName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('trankilandia_active_staff_id');
              sessionStorage.removeItem('trankilandia_active_staff_name');
              setOperatorId(null);
            }}
            className="text-xs text-zinc-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-red-400/30 transition-colors font-mono cursor-pointer"
          >
            Cerrar Turno
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* ===================================================================
            PASO 1: SELECCIÓN DEL SOCIO
           =================================================================== */}
        {!selectedMember ? (
          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
                  PASO 1 DE 3
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-display mt-0.5">
                  Seleccionar Socio a Evaluar
                </h2>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  Busca por número de DNI (8 dígitos) o por nombre completo en el padrón del club.
                </p>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por DNI o Nombre (ej: 70447087, Maximo, Cardenas)..."
                  className="w-full bg-zinc-950 border border-white/15 rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                />
                {isSearchingCloud && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCloudSearchResults([]);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Conteo de socios disponibles */}
              {members.length > 0 && !searchQuery && (
                <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between px-1">
                  <span>Padrón: {members.length} socios sincronizados</span>
                  <span className="text-zinc-600">Búsqueda offline y en nube</span>
                </div>
              )}

              {/* Lista de Resultados */}
              {filteredMembers.length > 0 ? (
                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-zinc-950/60 max-h-80 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setMembers((prev) => {
                          if (prev.some((p) => p.id === m.id)) return prev;
                          return [m, ...prev];
                        });
                      }}
                      className="w-full p-3.5 text-left flex items-center justify-between hover:bg-amber-400/10 hover:border-amber-400/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-amber-400 text-sm group-hover:scale-105 transition-transform">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate group-hover:text-amber-400 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                            <span>DNI: {m.dni || 'Sin DNI'}</span>
                            <span>·</span>
                            <span className="text-zinc-500 truncate max-w-[150px]">{m.plan}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="p-6 text-center text-xs font-mono text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                  {isSearchingCloud ? (
                    <div className="flex items-center justify-center gap-2 text-amber-400">
                      <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Buscando "{searchQuery}" en el padrón del club...</span>
                    </div>
                  ) : (
                    <span>No se encontró ningún socio que coincida con "{searchQuery}".</span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : !computedEval ? (
          /* ===================================================================
              PASO 2: PROCEDER AL PESAJE (BLE O MANUAL)
             =================================================================== */
          <div className="space-y-4">
            {/* Tarjeta del Socio Seleccionado */}
            <div className="bg-zinc-900 border border-amber-400/40 rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black font-black text-lg flex items-center justify-center shrink-0">
                  {selectedMember.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black text-white truncate">
                    {selectedMember.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>DNI: {selectedMember.dni}</span>
                    <span>·</span>
                    <span className="text-amber-400 font-bold">{estaturaCm} cm</span>
                    <span>·</span>
                    <span>{edad} años</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetForNext}
                className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono cursor-pointer"
              >
                Cambiar
              </button>
            </div>

            {/* Selector de Estatura y Sexo si se requiere ajustar */}
            <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Estatura</span>
                  <span className="font-bold text-white text-sm">{estaturaCm} cm</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Sexo</span>
                  <span className="font-bold text-white text-sm">{sexo}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Edad</span>
                  <span className="font-bold text-white text-sm">{edad} años</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEstaturaModal(true)}
                className="text-amber-400 hover:underline cursor-pointer font-bold"
              >
                Editar Biometría
              </button>
            </div>

            {/* Historial Previo */}
            {previousEval && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center justify-between">
                <span>Última evaluación registrada:</span>
                <span className="font-bold">
                  {new Date(previousEval.fecha).toLocaleDateString('es-PE')} ({previousEval.peso_kg} kg)
                </span>
              </div>
            )}

            {/* Alternar Modo: BLE o Manual */}
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-5">
              {!manualMode && bleSupported ? (
                /* Modo Bluetooth Activo */
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                    <Bluetooth className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-white font-display">
                      Pesaje Automático por Bluetooth
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans mt-1 max-w-sm mx-auto">
                      Pide al socio subir a la balanza y sujetar firmemente los electrodos de las manos.
                    </p>
                    <div className="pt-1">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                        Estado BLE: {scaleStatus}
                      </span>
                    </div>
                  </div>

                  {liveWeight > 0 && (
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-400/40 inline-block px-8">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block flex items-center justify-center gap-1.5">
                        <span>Peso Detectado</span>
                        {isWeightLocked && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                            ESTABILIZADO
                          </span>
                        )}
                      </span>
                      <span className="text-4xl font-black font-mono text-amber-400 tracking-tight">
                        {liveWeight.toFixed(2)} <span className="text-base text-white">kg</span>
                      </span>
                    </div>
                  )}

                  {statusMessage && (
                    <p className="text-xs font-mono text-amber-300/90 font-bold animate-pulse">
                      {statusMessage}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartBluetoothWeighing}
                      className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider py-4 rounded-2xl text-sm transition-all shadow-xl shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{liveWeight > 0 ? 'RECONECTAR BALANZA' : 'CONECTAR BALANZA Y PESAR'}</span>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline font-mono cursor-pointer"
                    >
                      ¿Problemas con el Bluetooth? Usar Captura Rápida de Display
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo Manual (iPhone Safari o contingencia) */
                <form onSubmit={handleProcessManualWeighing} className="space-y-4 text-left">
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
                      <Smartphone className="w-4 h-4" />
                      <span>Captura Rápida de Display</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans">
                      Ingresa los números que muestra la pantalla LCD de la báscula EUROMAR® G78.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-300 font-bold mb-1">
                      Peso Total (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="20"
                      max="250"
                      required
                      value={manualPeso}
                      onChange={(e) => setManualPeso(e.target.value)}
                      placeholder="Ej: 74.50"
                      className="w-full bg-zinc-950 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-zinc-300 font-bold mb-1">
                        % Grasa Corporal (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="3"
                        max="70"
                        value={manualGrasa}
                        onChange={(e) => setManualGrasa(e.target.value)}
                        placeholder="Ej: 16.5"
                        className="w-full bg-zinc-950 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-zinc-300 font-bold mb-1">
                        Músculo (kg) (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="10"
                        max="120"
                        value={manualMusculo}
                        onChange={(e) => setManualMusculo(e.target.value)}
                        placeholder="Ej: 35.2"
                        className="w-full bg-zinc-950 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase py-3.5 rounded-xl text-xs font-mono transition-all cursor-pointer mt-2"
                  >
                    CALCULAR Y REVISAR RESULTADOS →
                  </button>

                  {bleSupported && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setManualMode(false)}
                        className="text-xs text-amber-400 hover:underline font-mono cursor-pointer"
                      >
                        ← Volver a Conexión Bluetooth
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        ) : (
          /* ===================================================================
              PASO 3: REVISIÓN DE RESULTADOS Y CONFIRMACIÓN
             =================================================================== */
          <div className="space-y-4">
            {/* Tarjeta de Éxito o Resumen */}
            <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">
                    EVALUACIÓN CALCULADA
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    DNI: {selectedMember.dni} · {estaturaCm} cm · {edad} años
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xs font-mono font-bold leading-none">FIT SCORE</span>
                  <span className="text-xl leading-tight">{computedEval.puntuacion_corporal}</span>
                </div>
              </div>

              {/* Diagnóstico */}
              {diagnostico && (
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-1">
                  <div className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{diagnostico.titulo}</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    {diagnostico.descripcion}
                  </p>
                </div>
              )}

              {/* Métricas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 text-center">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Peso Total</span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {computedEval.peso_kg} kg
                  </div>
                  {deltas && (
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                      {deltas.delta_peso_kg > 0 ? `+${deltas.delta_peso_kg}` : deltas.delta_peso_kg} kg
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 text-center">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Masa Muscular</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {computedEval.masa_muscular_kg} kg
                  </div>
                  {deltas && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {deltas.delta_musculo_kg > 0 ? `+${deltas.delta_musculo_kg}` : deltas.delta_musculo_kg} kg
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 text-center">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">% Grasa Corporal</span>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    {computedEval.grasa_corporal_pct}%
                  </div>
                  {deltas && (
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {deltas.delta_grasa_pct > 0 ? `+${deltas.delta_grasa_pct}` : deltas.delta_grasa_pct}%
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 text-center">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Grasa Visceral</span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    Nivel {computedEval.grasa_visceral}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Óptimo</span>
                </div>
              </div>

              {/* Botones de Acción */}
              {!savedSuccess ? (
                <div className="pt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleSaveEvaluation}
                    disabled={isSaving}
                    className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black uppercase py-4 rounded-2xl text-sm transition-all shadow-xl shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <span>GUARDANDO EN SUPABASE...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>GUARDAR EVALUACIÓN EN CUENTA DEL SOCIO</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setComputedEval(null)}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 text-zinc-400 py-2.5 rounded-xl text-xs font-mono transition-colors cursor-pointer text-center"
                  >
                    ← Repetir Medición
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-3 pt-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>¡Evaluación guardada exitosamente en Trankilandia Gym!</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Compartir por WhatsApp al Socio</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetForNext}
                      className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-black py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <span>Evaluar a Siguiente Socio →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal para Ajustar Estatura (cm) */}
      {showEstaturaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-black uppercase text-white font-display">
                Confirmar Estatura
              </h3>
              <button
                type="button"
                onClick={() => setShowEstaturaModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-sans">
              La estatura es fundamental para calcular el % de grasa y masa muscular con la balanza.
            </p>

            <div className="text-center py-2">
              <span className="text-4xl font-black font-mono text-amber-400">{estaturaCm}</span>
              <span className="text-lg text-white font-mono ml-1.5">cm</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              {[-5, -1, +1, +5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEstaturaCm((c) => Math.max(120, Math.min(220, c + val)))}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/15 text-xs font-mono font-bold hover:border-amber-400 cursor-pointer"
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Edad</label>
                <input
                  type="number"
                  value={edad}
                  min="12"
                  max="90"
                  onChange={(e) => setEdad(parseInt(e.target.value) || 25)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEstaturaModal(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase py-3 rounded-xl text-xs font-mono transition-colors cursor-pointer mt-2"
            >
              Confirmar Biometría
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
