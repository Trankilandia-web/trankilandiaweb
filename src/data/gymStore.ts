// ==============================================================================
// TRANKILANDIA GYM · STORE DE CLIENTES, COBROS CON ADELANTO Y RUTINAS DEL COACH
// ==============================================================================

import realMembersData from './realMembers.json';

export interface GymMember {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone?: string;
  plan: string;
  planPrice: number;
  paymentType: 'full' | 'advance';
  advancePaid: number;
  balanceDue: number; // planPrice - advancePaid
  paymentDueDate?: string;
  paymentMethod: 'yape' | 'plin' | 'efectivo' | 'tarjeta';
  receiptNumber: string;
  membershipStatus: 'active' | 'expiring' | 'inactive';
  expiresAt: string;
  coachName: string;
  registeredAt: string;
  observations?: string;
  age?: number;
  gender?: string;
  shift?: 'manana' | 'tarde' | 'noche';
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

// Initial Real Members Loaded directly from Gym.xlsm (389 socios)
export const INITIAL_MEMBERS: GymMember[] = realMembersData as GymMember[];

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
};

// Initial Progress Records
export const INITIAL_PROGRESS: ProgressRecord[] = [
  {
    id: 'PRG-01',
    memberId: 'MEM-001',
    date: '28 Oct 2026',
    weightKg: 76.5,
    benchPressKg: 95,
    squatKg: 120,
    deadliftKg: 140,
    pullupsRep: 14,
    notes: 'Excelente fuerza en sentadilla profunda y mejoría notable en resistencia en saco.',
  },
  {
    id: 'PRG-02',
    memberId: 'MEM-001',
    date: '30 Sep 2026',
    weightKg: 75.2,
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

// Helper to get members from LocalStorage or Fallback
export const getStoredMembers = (): GymMember[] => {
  try {
    const raw = localStorage.getItem('trankilandia_members');
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_MEMBERS;
};

export const saveStoredMembers = (members: GymMember[]) => {
  try {
    localStorage.setItem('trankilandia_members', JSON.stringify(members));
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
