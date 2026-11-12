import { useState, useRef, useCallback } from 'react';
import { GymMember } from '../data/gymStore';
import { SocioRecepcion, AsistenciaActiva, registrarAsistencia, deduplicarAsistenciasActivas } from '../lib/supabaseDb';
import { extraerDniPeru } from '../lib/dniParser';
import { getLocalPeruDateString, calculateDaysRemaining } from '../lib/dateUtils';
import { playGymAlert } from '../lib/audioVoiceAlerts';

export type ScanStatus = 'activo' | 'por_vencer' | 'vencido' | 'deuda' | 'no_inscrito' | null;

export function playAttendanceTone(tipo: 'ok' | 'alerta' | 'error' | 'saludable' | 'por_vencer' | 'vencida'): void {
  if (tipo === 'ok' || tipo === 'saludable') {
    playGymAlert('saludable');
  } else if (tipo === 'alerta' || tipo === 'por_vencer') {
    playGymAlert('por_vencer');
  } else {
    playGymAlert('vencida');
  }
}

export interface UseMemberAttendanceOptions {
  members: GymMember[];
  asistencias?: AsistenciaActiva[];
  setAsistencias: React.Dispatch<React.SetStateAction<AsistenciaActiva[]>>;
}

export interface UseMemberAttendanceReturn {
  scanInput: string;
  setScanInput: React.Dispatch<React.SetStateAction<string>>;
  lastScannedSocio: SocioRecepcion | null;
  setLastScannedSocio: React.Dispatch<React.SetStateAction<SocioRecepcion | null>>;
  lastScanStatus: ScanStatus;
  setLastScanStatus: React.Dispatch<React.SetStateAction<ScanStatus>>;
  lastScanMessage: string;
  setLastScanMessage: React.Dispatch<React.SetStateAction<string>>;
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  handleScanSubmit: (e: React.FormEvent) => Promise<void>;
  procesarQuery: (query: string) => Promise<void>;
  procesarSocioDirecto: (socio: GymMember) => Promise<void>;
  registrarIngreso: (socio: GymMember) => Promise<void>;
  playTone: (tipo: 'ok' | 'alerta' | 'error') => void;
  resetScanner: () => void;
}

export function useMemberAttendance({
  members,
  asistencias,
  setAsistencias,
}: UseMemberAttendanceOptions): UseMemberAttendanceReturn {
  const [scanInput, setScanInput] = useState('');
  const [lastScannedSocio, setLastScannedSocio] = useState<SocioRecepcion | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<ScanStatus>(null);
  const [lastScanMessage, setLastScanMessage] = useState<string>('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanTimestamp = useRef<number>(0);
  const isScanningLock = useRef<boolean>(false);

  const playTone = useCallback((tipo: 'ok' | 'alerta' | 'error') => {
    playAttendanceTone(tipo);
  }, []);

  const resetScanner = useCallback(() => {
    setScanInput('');
    setLastScannedSocio(null);
    setLastScanStatus(null);
    setLastScanMessage('');
  }, []);

  const registrarIngreso = useCallback(
    async (socio: GymMember) => {
      try {
        const res = await registrarAsistencia({
          socio_id: socio.id,
          dni: socio.dni || '',
          nombre: socio.name,
          turno: socio.shift || 'manana',
        });
        const newId = res?.data?.id || `ast-${Date.now()}`;
        setAsistencias((prev) =>
          deduplicarAsistenciasActivas([
            {
              id: newId,
              socio_id: socio.id,
              dni: socio.dni || '',
              nombre: socio.name,
              turno: socio.shift || 'manana',
              fecha_ingreso: new Date().toISOString(),
            },
            ...prev,
          ])
        );
      } catch {
        // Fallback local
        setAsistencias((prev) =>
          deduplicarAsistenciasActivas([
            {
              id: `local-${Date.now()}`,
              socio_id: socio.id,
              dni: socio.dni || '',
              nombre: socio.name,
              turno: socio.shift || 'manana',
              fecha_ingreso: new Date().toISOString(),
            },
            ...prev,
          ])
        );
      }
    },
    [setAsistencias]
  );

  const procesarSocioDirecto = useCallback(
    async (socio: GymMember) => {
      const today = getLocalPeruDateString();
      const exp = socio.expiresAt || today;
      const diffDays = calculateDaysRemaining(exp, today);
      const hasDebt = socio.balanceDue > 0;

      const socioRecepcion: SocioRecepcion = {
        id: socio.id,
        dni: socio.dni || '',
        nombre: socio.name,
        plan: socio.plan,
        precio_plan: socio.planPrice,
        tipo_pago: socio.paymentType,
        adelanto_pagado: socio.advancePaid,
        saldo_pendiente: socio.balanceDue,
        fecha_limite_pago: socio.paymentDueDate || null,
        fecha_fin: socio.expiresAt,
        turno: socio.shift || 'manana',
        coach_asignado: socio.coachName || 'Coach Marcos Rivas',
        dias_restantes: diffDays,
        estado_calculado: diffDays < 0 ? 'vencido' : diffDays <= 7 ? 'por_vencer' : 'activo',
        tiene_deuda_activa: hasDebt,
        numero_boleta: socio.receiptNumber,
      };

      setLastScannedSocio(socioRecepcion);
      setScanInput('');

      // Regla de negocio: Bloqueo estricto de múltiples ingresos en menos de 90 minutos
      const ninetyMinMs = 90 * 60 * 1000;
      const now = Date.now();
      const cleanDni = socio.dni ? socio.dni.replace(/\D/g, '').slice(0, 8) : '';
      const yaEnSala = asistencias?.find((a) => {
        const aCleanDni = a.dni ? a.dni.replace(/\D/g, '').slice(0, 8) : '';
        const match =
          (a.socio_id && socio.id && a.socio_id === socio.id) ||
          (cleanDni && aCleanDni && cleanDni === aCleanDni) ||
          (a.nombre && socio.name && a.nombre.trim().toLowerCase() === socio.name.trim().toLowerCase());
        if (!match) return false;
        const diffMs = now - new Date(a.fecha_ingreso).getTime();
        return diffMs >= 0 && diffMs < ninetyMinMs;
      });

      if (yaEnSala) {
        const horaIngreso = new Date(yaEnSala.fecha_ingreso).toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        });
        playGymAlert('rebote');
        setLastScanStatus('activo');
        setLastScanMessage(
          `El atleta ${socio.name} ya se encuentra entrenando en sala (ingresó a las ${horaIngreso}). No se duplica su ingreso.`
        );
        return;
      }

      if (diffDays < 0) {
        playGymAlert('vencida');
        setLastScanStatus('vencido');
        setLastScanMessage(`Membresía vencida hace ${Math.abs(diffDays)} días (${socio.expiresAt}).`);
      } else if (hasDebt) {
        playGymAlert('por_vencer');
        setLastScanStatus('deuda');
        setLastScanMessage(`Membresía activa pero DEBE S/. ${socio.balanceDue}.00.`);
      } else if (diffDays <= 7) {
        playGymAlert('por_vencer');
        setLastScanStatus('por_vencer');
        setLastScanMessage(`Membresía por vencer en ${diffDays} días (${socio.expiresAt}).`);
        await registrarIngreso(socio);
      } else {
        playGymAlert('saludable');
        setLastScanStatus('activo');
        setLastScanMessage(`¡Pase Libre! Membresía vigente con ${diffDays} días restantes.`);
        await registrarIngreso(socio);
      }
    },
    [asistencias, registrarIngreso]
  );

  const procesarQuery = useCallback(
    async (queryInput: string) => {
      const now = Date.now();
      if (now - lastScanTimestamp.current < 800 || isScanningLock.current) {
        return;
      }

      const query = queryInput.trim();
      if (!query) return;

      try {
        isScanningLock.current = true;
        lastScanTimestamp.current = now;

        const parsedDni = extraerDniPeru(query) || query.replace(/\D/g, '').slice(0, 8);
        const cleanDni = parsedDni || query;

        const queryLower = query.toLowerCase().trim();
        const tokens = queryLower.split(/\s+/).filter((t) => t.length >= 2);

        // 1. Coincidencia por DNI
        let socio = members.find(
          (m) =>
            (m.dni && m.dni.trim() === cleanDni) ||
            (m.dni && m.dni.trim() === query)
        );

        // 2. Coincidencia de nombre completo o contenido
        if (!socio) {
          socio = members.find((m) => m.name.toLowerCase().includes(queryLower));
        }

        // 3. Coincidencia si todas las palabras buscadas están en el nombre (independiente del orden)
        if (!socio && tokens.length > 1) {
          socio = members.find((m) => {
            const mName = m.name.toLowerCase();
            return tokens.every((t) => mName.includes(t));
          });
        }

        // 4. Coincidencia por token distintivo de al menos 4 caracteres (ej. apellido "asto")
        if (!socio && tokens.length > 1) {
          socio = members.find((m) => {
            const mName = m.name.toLowerCase();
            return tokens.some((t) => t.length >= 4 && mName.includes(t));
          });
        }

        if (!socio) {
          playGymAlert('error');
          setLastScanStatus('no_inscrito');
          setLastScannedSocio(null);
          setLastScanMessage(`DNI o atleta "${query}" no registrado en el padrón.`);
          setScanInput('');
          return;
        }

        await procesarSocioDirecto(socio);
      } finally {
        isScanningLock.current = false;
      }
    },
    [members, procesarSocioDirecto]
  );

  const handleScanSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await procesarQuery(scanInput);
    },
    [scanInput, procesarQuery]
  );

  return {
    scanInput,
    setScanInput,
    lastScannedSocio,
    setLastScannedSocio,
    lastScanStatus,
    setLastScanStatus,
    lastScanMessage,
    setLastScanMessage,
    scanInputRef,
    handleScanSubmit,
    procesarQuery,
    procesarSocioDirecto,
    registrarIngreso,
    playTone,
    resetScanner,
  };
}
