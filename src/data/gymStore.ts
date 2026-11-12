// ==============================================================================
// TRANKILANDIA GYM · STORE DE CLIENTES, COBROS CON ADELANTO Y RUTINAS DEL COACH
// ==============================================================================
// - Desacoplado de importaciones estáticas masivas de PII (realMembers.json).
// - El padrón oficial se consulta directamente desde Supabase en la nube.
// - Carga diferida (lazy dynamic import) disponible para semillas o fallback offline.
// ==============================================================================

export * from './plansStore';

export interface GymMember {
  id: string;
  name: string;
  dni?: string | null;
  email?: string | null;
  phone?: string | null;
  plan: string;
  planPrice: number;
  paymentType: 'full' | 'advance';
  advancePaid: number;
  balanceDue: number; // planPrice - advancePaid
  paymentDueDate?: string | null;
  paymentMethod: 'yape' | 'plin' | 'efectivo' | 'tarjeta';
  receiptNumber: string;
  membershipStatus: 'active' | 'expiring' | 'inactive';
  expiresAt: string;
  coachName: string;
  registeredAt: string;
  observations?: string | null;
  age?: number | null;
  gender?: string;
  shift?: 'manana' | 'tarde' | 'noche';
  documentStatus?: 'sin_documento' | 'pendiente' | 'verificado' | 'rechazado';
  documentType?: 'dni_escolar' | 'carnet_estudiante' | null;
  documentUrl?: string | null;
  documentNotes?: string | null;
}

export interface RoutineExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

export interface RoutineDay {
  id: string;
  dayName: string;
  focus: string;
  exercises: RoutineExercise[];
}

export interface MemberRoutine {
  memberId: string;
  routineTitle: string;
  objective: string;
  coachName: string;
  updatedAt: string;
  coachNotes: string;
  days: RoutineDay[];
}

export interface ProgressRecord {
  id: string;
  memberId: string;
  date: string;
  weightKg: number;
  benchPressKg: number;
  squatKg: number;
  deadliftKg: number;
  pullupsRep: number;
  notes: string;
}

// Initial Member: Luis Gerardo Llocclla Sauñe (Socio Fundador con membresía activa)
export const LUIS_GERARDO_MEMBER: GymMember = {
  id: 'MEM-2713',
  name: 'Luis Gerardo Llocclla Sauñe',
  dni: '70447087',
  email: 'luisgerardolloccllasaune@gmail.com',
  phone: '958183360',
  plan: 'Plan Libre Anual (12 Meses)',
  planPrice: 430,
  paymentType: 'advance',
  advancePaid: 100,
  balanceDue: 330,
  paymentDueDate: null,
  paymentMethod: 'efectivo',
  receiptNumber: 'B001-000933',
  membershipStatus: 'active',
  registeredAt: '2026-11-10',
  expiresAt: '2027-11-10',
  coachName: 'Coach Marcos Rivas',
  shift: 'manana',
  observations: 'Socio Fundador activo. Enfoque en hipertrofia y acondicionamiento.',
  age: 26,
  gender: 'Masculino',
};

// Padrón base de demostración (sin PII masivo en el bundle de producción)
export const INITIAL_MEMBERS: GymMember[] = [LUIS_GERARDO_MEMBER];

/**
 * Carga bajo demanda y asíncrona de los 417 socios canónicos desde realMembers.json.
 * Al usar import() dinámico, Vite aísla este archivo en un chunk separado
 * y NUNCA se descarga en la web pública de clientes.
 */
export async function loadCanonicalMembersFromExcel(): Promise<GymMember[]> {
  const mod = await import('./realMembers.json');
  return (mod.default as unknown) as GymMember[];
}

// Initial Custom Routines per Member
export const INITIAL_ROUTINES: Record<string, MemberRoutine> = {
  'MEM-001': {
    memberId: 'MEM-001',
    routineTitle: 'Fuerza Hipertrofia & Escuela de Boxeo',
    objective: 'Aumento de masa muscular y potencia de golpeo',
    coachName: 'Coach Marcos Rivas',
    updatedAt: '28 Oct 2026',
    coachNotes:
      'Controlar la fase excéntrica en los presses de banca. En el saco, mantener guardia cerrada y girar cadera en el hook.',
    days: [
      {
        id: 'D1',
        dayName: 'Día 1: Empuje (Pecho, Hombro, Tríceps)',
        focus: 'Fuerza & Densidad',
        exercises: [
          { id: 'E1', name: 'Press Banca con Barra', sets: 4, reps: '8-10', rest: '90s', notes: 'Pesado, pausa en pecho' },
          { id: 'E2', name: 'Press Inclinado con Mancuernas', sets: 3, reps: '10-12', rest: '60s', notes: 'Enfoque clavicular' },
          { id: 'E3', name: 'Press Militar de Pie', sets: 4, reps: '8', rest: '90s', notes: 'Apretar glúteos y core' },
          { id: 'E4', name: 'Fondos en Paralelas lastrados', sets: 3, reps: '10', rest: '60s', notes: 'Inclinación leve al frente' },
          { id: 'E5', name: 'Sombra de Boxeo con Mancuernas 1kg', sets: 4, reps: '3 min', rest: '45s', notes: 'Jabs, cross y desplazamientos' },
        ],
      },
      {
        id: 'D2',
        dayName: 'Día 2: Tracción (Espalda & Bíceps)',
        focus: 'Amplitud & Potencia dorsal',
        exercises: [
          { id: 'E6', name: 'Dominadas con Agarre Prono', sets: 4, reps: '8-10', rest: '90s', notes: 'Subir hasta barbilla' },
          { id: 'E7', name: 'Remo con Barra Pendlay', sets: 4, reps: '8', rest: '90s', notes: 'Espalda paralela al piso' },
          { id: 'E8', name: 'Jalón al Pecho Agarre Neutro', sets: 3, reps: '12', rest: '60s', notes: 'Retracción escapular' },
          { id: 'E9', name: 'Curl con Barra Z de Pie', sets: 3, reps: '10-12', rest: '60s', notes: 'Codos pegados al torso' },
          { id: 'E10', name: 'Saco Pesado de Boxeo', sets: 5, reps: '3 min', rest: '60s', notes: 'Combinaciones 1-2 y ganchos al cuerpo' },
        ],
      },
      {
        id: 'D3',
        dayName: 'Día 3: Pierna & Core de Acero',
        focus: 'Base y estabilidad atlética',
        exercises: [
          { id: 'E11', name: 'Sentadilla Libre con Barra', sets: 4, reps: '8', rest: '120s', notes: 'Romper paralelo con firmeza' },
          { id: 'E12', name: 'Prensa Inclinada 45°', sets: 4, reps: '12', rest: '90s', notes: 'Sin hiperextender rodillas' },
          { id: 'E13', name: 'Peso Muerto Rumano con Mancuernas', sets: 3, reps: '10', rest: '75s', notes: 'Sentir estiramiento de femorales' },
          { id: 'E14', name: 'Elevaciones de Piernas Colgado', sets: 4, reps: '15', rest: '45s', notes: 'Para impacto y recepción en ring' },
        ],
      },
    ],
  },
  'MEM-2713': {
    memberId: 'MEM-2713',
    routineTitle: 'Fuerza Hipertrofia & Escuela de Boxeo',
    objective: 'Aumento de masa muscular y potencia de golpeo',
    coachName: 'Coach Marcos Rivas',
    updatedAt: '01 Nov 2026',
    coachNotes:
      'Controlar la fase excéntrica en los presses de banca. En el saco, mantener guardia cerrada y girar cadera en el hook.',
    days: [
      {
        id: 'D1',
        dayName: 'Día 1: Empuje (Pecho, Hombro, Tríceps)',
        focus: 'Fuerza & Densidad',
        exercises: [
          { id: 'E1', name: 'Press Banca con Barra', sets: 4, reps: '8-10', rest: '90s', notes: 'Pesado, pausa en pecho' },
          { id: 'E2', name: 'Press Inclinado con Mancuernas', sets: 3, reps: '10-12', rest: '60s', notes: 'Enfoque clavicular' },
          { id: 'E3', name: 'Press Militar de Pie', sets: 4, reps: '8', rest: '90s', notes: 'Apretar glúteos y core' },
          { id: 'E4', name: 'Fondos en Paralelas lastrados', sets: 3, reps: '10', rest: '60s', notes: 'Inclinación leve al frente' },
          { id: 'E5', name: 'Sombra de Boxeo con Mancuernas 1kg', sets: 4, reps: '3 min', rest: '45s', notes: 'Jabs, cross y desplazamientos' },
        ],
      },
      {
        id: 'D2',
        dayName: 'Día 2: Tracción (Espalda & Bíceps)',
        focus: 'Amplitud & Potencia dorsal',
        exercises: [
          { id: 'E6', name: 'Dominadas con Agarre Prono', sets: 4, reps: '8-10', rest: '90s', notes: 'Subir hasta barbilla' },
          { id: 'E7', name: 'Remo con Barra Pendlay', sets: 4, reps: '8', rest: '90s', notes: 'Espalda paralela al piso' },
          { id: 'E8', name: 'Jalón al Pecho Agarre Neutro', sets: 3, reps: '12', rest: '60s', notes: 'Retracción escapular' },
          { id: 'E9', name: 'Curl con Barra Z de Pie', sets: 3, reps: '10-12', rest: '60s', notes: 'Codos pegados al torso' },
          { id: 'E10', name: 'Saco Pesado de Boxeo', sets: 5, reps: '3 min', rest: '60s', notes: 'Combinaciones 1-2 y ganchos al cuerpo' },
        ],
      },
      {
        id: 'D3',
        dayName: 'Día 3: Pierna & Core de Acero',
        focus: 'Base y estabilidad atlética',
        exercises: [
          { id: 'E11', name: 'Sentadilla Libre con Barra', sets: 4, reps: '8', rest: '120s', notes: 'Romper paralelo con firmeza' },
          { id: 'E12', name: 'Prensa Inclinada 45°', sets: 4, reps: '12', rest: '90s', notes: 'Sin hiperextender rodillas' },
          { id: 'E13', name: 'Peso Muerto Rumano con Mancuernas', sets: 3, reps: '10', rest: '75s', notes: 'Sentir estiramiento de femorales' },
          { id: 'E14', name: 'Elevaciones de Piernas Colgado', sets: 4, reps: '15', rest: '45s', notes: 'Para impacto y recepción en ring' },
        ],
      },
    ],
  },
};

// Initial Progress Records
export const INITIAL_PROGRESS: ProgressRecord[] = [
  {
    id: 'PRG-01',
    memberId: 'MEM-001',
    date: '15 Oct 2026',
    weightKg: 78.5,
    benchPressKg: 95,
    squatKg: 120,
    deadliftKg: 140,
    pullupsRep: 14,
    notes: 'Excelente respuesta en el tren superior. Mejorando pegada en guardia zurda.',
  },
  {
    id: 'PRG-02',
    memberId: 'MEM-2713',
    date: '01 Nov 2026',
    weightKg: 75.0,
    benchPressKg: 90,
    squatKg: 115,
    deadliftKg: 135,
    pullupsRep: 12,
    notes: 'Inicio del ciclo de fuerza. Adaptación técnica.',
  },
  {
    id: 'PRG-03',
    memberId: 'MEM-002',
    date: '20 Oct 2026',
    weightKg: 58.2,
    benchPressKg: 45,
    squatKg: 65,
    deadliftKg: 75,
    pullupsRep: 6,
    notes: 'Buena técnica de golpeo, aumentando velocidad en combinaciones 1-2.',
  },
];

const STORAGE_KEY = 'trankilandia_members_v6';

// Helper para recuperar socios desde LocalStorage (sincronizados desde Supabase)
export const getStoredMembers = (): GymMember[] => {
  try {
    ['trankilandia_members', 'trankilandia_members_v1', 'trankilandia_members_v2', 'trankilandia_members_v3', 'trankilandia_members_v4', 'trankilandia_members_v5'].forEach((k) => {
      if (localStorage.getItem(k)) {
        localStorage.removeItem(k);
      }
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: GymMember[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [];
};

/**
 * Restablece y fuerza la recarga limpia de todos los 417 socios de respaldo desde el Excel
 */
export const reloadFreshMembersFromExcel = async (): Promise<GymMember[]> => {
  try {
    ['trankilandia_members', 'trankilandia_members_v1', 'trankilandia_members_v2', 'trankilandia_members_v3', 'trankilandia_members_v4', 'trankilandia_members_v5', STORAGE_KEY].forEach((k) => {
      localStorage.removeItem(k);
    });
    const canonical = await loadCanonicalMembersFromExcel();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gym-members-updated', { detail: { count: canonical.length } }));
    }
    return canonical;
  } catch {}
  return [];
};

/**
 * Genera un ID canónico y único para un nuevo socio (MEM-XXX),
 * garantizando que nunca colisione ni sobrescriba a ningún socio existente.
 */
export function generateNextMemberId(existingMembers?: GymMember[]): string {
  const list = existingMembers || getStoredMembers();
  let maxId = 928; // ID base canónico más alto de la migración

  const existingIds = new Set<string>();

  for (const m of list) {
    if (m && m.id) {
      existingIds.add(m.id);
      const match = m.id.match(/^MEM-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxId && num < 100000) {
          maxId = num;
        }
      }
    }
  }

  let nextCandidate = maxId + 1;
  while (existingIds.has(`MEM-${nextCandidate}`) || existingIds.has(`MEM-00${nextCandidate}`)) {
    nextCandidate++;
  }

  return `MEM-${nextCandidate}`;
}

export const saveStoredMembers = (members: GymMember[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gym-members-updated', { detail: { count: members.length } }));
    }
  } catch {}
};

// Helper for routines
export const getStoredRoutines = (): Record<string, MemberRoutine> => {
  try {
    const raw = localStorage.getItem('trankilandia_routines');
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_ROUTINES;
};

export const saveStoredRoutines = (routines: Record<string, MemberRoutine>) => {
  try {
    localStorage.setItem('trankilandia_routines', JSON.stringify(routines));
  } catch {}
};

// Helper for progress
export const getStoredProgress = (): ProgressRecord[] => {
  try {
    const raw = localStorage.getItem('trankilandia_progress');
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_PROGRESS;
};

export const saveStoredProgress = (progress: ProgressRecord[]) => {
  try {
    localStorage.setItem('trankilandia_progress', JSON.stringify(progress));
  } catch {}
};
