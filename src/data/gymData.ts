import type {
  NavItem,
  FeatureHighlight,
  Program,
  AboutData,
  GymContactInfo,
  PlanTier,
  ComparisonCategory,
  ScheduleClass,
  FacilityZone,
  FaqItem,
} from '../types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Planes & Membresías', href: '/planes' },
  { label: 'Horarios & Clases', href: '/clases' },
  { label: 'Instalaciones', href: '/instalaciones' },
];

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'free-entry',
    title: 'Ingreso Libre e Ilimitado',
    description: 'Entrena a la hora que quieras sin restricciones de turno. Todos nuestros planes incluyen pase libre a la sala de musculación.',
    iconName: 'Clock',
  },
  {
    id: 'heavy-equipment',
    title: 'Musculación & Peso Libre',
    description: 'Mancuernas completas, barras olímpicas, racks de sentadillas y máquinas de poleas para sobrecarga progresiva real.',
    iconName: 'Dumbbell',
  },
  {
    id: 'boxing-activity',
    title: 'Clases de Boxeo',
    description: 'Actividad adicional de combate y golpeo en sacos, manoplas y técnica guiada por instructores especializados.',
    iconName: 'Zap',
  },
  {
    id: 'family-community',
    title: 'Más que un Gym, Familia',
    description: 'Ambiente motivador en Ayacucho donde entrenadores y compañeros te impulsan a superarte cada día.',
    iconName: 'Users',
  },
];

export const PROGRAMS_DATA: Program[] = [
  {
    id: 'musculacion-fuerza',
    title: 'Musculación & Peso Libre',
    subtitle: 'Ingreso Libre Ilimitado',
    description: 'Desarrolla masa muscular, fuerza y tonificación con mancuernas, barras olímpicas y máquinas de poleas de alto impacto.',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Dumbbell',
    tag: 'Fuerza',
  },
  {
    id: 'clases-boxeo',
    title: 'Boxeo & Deportes de Contacto',
    subtitle: 'Actividad Adicional',
    description: 'Entrenamiento de alta exigencia cardiovascular y técnica de golpeo: trabajo en sacos pesados, manoplas, cuerda y desplazamientos.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    tag: 'Combate',
  },
  {
    id: 'entrenamiento-funcional',
    title: 'Acondicionamiento Funcional',
    subtitle: 'Resistencia & Agilidad',
    description: 'Circuitos dinámicos diseñados para quemar grasa, fortalecer el core y mejorar tu rendimiento físico general.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    iconName: 'Activity',
    tag: 'Resistencia',
  },
  {
    id: 'cardio-fitness',
    title: 'Área Cardiovascular & Baile',
    subtitle: 'Salud & Quema de Calorías',
    description: 'Caminadoras, elípticas, bicicletas de spinning y sesiones de ritmo fitness para activar tu salud cardiovascular.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    iconName: 'Flame',
    tag: 'Cardio',
  },
];

export const ABOUT_DATA: AboutData = {
  badge: 'TRANKILANDIA GYM AYACUCHO',
  title: 'MÁS QUE UN GIMNASIO, SOMOS FAMILIA.',
  paragraphs: [
    'En Trankilandia Gym creemos que el entrenamiento físico transforma vidas cuando se acompaña de una comunidad que te respalda y te exige.',
    'Ubicados en Ayacucho (Huamanga), contamos con una sala de musculación completa con ingreso libre, asesoría constante de instructores de sala y clases especializadas de boxeo para llevar tu resistencia al siguiente nivel.',
  ],
  imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
  stats: [
    { value: '100%', label: 'Planes con Ingreso Libre' },
    { value: '6:00 AM', label: 'Apertura de Lunes a Sábado' },
    { value: '+500', label: 'Atletas y familias activas' },
  ],
  ctaText: 'CONSULTAR POR WHATSAPP',
  ctaHref: 'https://wa.me/51999787489',
};

export const GYM_CONTACT: GymContactInfo = {
  address: 'Huamanga, Ayacucho, Perú',
  phone: '+51999787489',
  phoneDisplay: '+51 999 787 489',
  email: 'contacto@trankilandiagym.pe',
  hours: {
    weekday: 'Lun - Sáb: 6:00 AM - 10:00 PM',
    sunday: 'Dom: 7:00 AM - 1:00 PM',
  },
  socialLinks: [
    { platform: 'Instagram', href: 'https://www.instagram.com/trankilandiagym/' },
    { platform: 'Facebook', href: 'https://www.facebook.com/search/top?q=Trankilandia%20Gym' },
    { platform: 'WhatsApp', href: 'https://wa.me/51999787489' },
  ],
};

export const MEMBERSHIP_PLANS: PlanTier[] = [
  {
    id: 'estudiante',
    name: 'Plan Estudiante',
    tagline: 'Para escolares y universitarios de Ayacucho',
    monthlyPrice: 75,
    quarterlyPrice: 200,    // S/. 66.6 / mes
    semiannualPrice: 370,   // S/. 61.6 / mes
    annualPrice: 680,       // S/. 56.6 / mes
    isPopular: false,
    badge: 'TARIFA ESPECIAL',
    includesFreeEntry: true,
    description: 'Acceso total e ilimitado a la sala de musculación, peso libre y máquinas. Presenta tu carné universitario o constancia de estudios.',
    highlights: [
      'Ingreso libre e ilimitado de lunes a domingo',
      'Acceso total a peso libre, barras y máquinas de poleas',
      'Rutina inicial estructurada por entrenador de sala',
      'Uso de casilleros y vestidores',
      'Acceso al área cardiovascular',
    ],
    ctaText: 'ELEGIR PLAN ESTUDIANTE',
  },
  {
    id: 'general',
    name: 'Plan General',
    tagline: 'El estándar más elegido para disciplina total',
    monthlyPrice: 95,
    quarterlyPrice: 255,    // S/. 85.0 / mes
    semiannualPrice: 470,   // S/. 78.3 / mes
    annualPrice: 840,       // S/. 70.0 / mes
    isPopular: true,
    badge: 'MÁS ELEGIDO',
    includesFreeEntry: true,
    description: 'La membresía completa para entrenar a tu ritmo. Sin restricciones de horario, con asesoría permanente en sala para corregir tu técnica.',
    highlights: [
      'Ingreso libre e ilimitado en cualquier horario de atención',
      'Acceso completo a sala de fuerza, mancuernas y máquinas',
      'Asesoría técnica constante por instructores de piso',
      'Evaluación y control periódico de medidas y avances',
      'Vestidores, lockers seguros y duchas con agua caliente',
      'Opción de agregar clases de boxeo con descuento especial',
    ],
    ctaText: 'ELEGIR PLAN GENERAL',
  },
  {
    id: 'combo_boxeo',
    name: 'Plan Gym + Boxeo',
    tagline: 'Musculación total + Clases dirigidas de combate',
    monthlyPrice: 140,
    quarterlyPrice: 380,    // S/. 126.6 / mes
    semiannualPrice: 690,   // S/. 115.0 / mes
    annualPrice: 1250,      // S/. 104.1 / mes
    isPopular: false,
    badge: 'COMBO COMPLETO',
    includesFreeEntry: true,
    includesBoxing: true,
    description: 'Combina el desarrollo muscular en sala con la intensidad física y técnica del boxeo. La fórmula definitiva para fuerza, quema de grasa y agilidad.',
    highlights: [
      'Todo lo incluido en el Plan General (Ingreso libre ilimitado)',
      'Clases dirigidas de Boxeo incluidas en el horario de tu elección',
      'Entrenamiento de sacos, manoplas, técnica de guardia y golpeo',
      'Acondicionamiento físico de combate y resistencia',
      'Guía técnica especializada con entrenador de boxeo',
      '2 Pases de cortesía para entrenar con amigos',
    ],
    ctaText: 'ELEGIR GYM + BOXEO',
  },
];

export const BOXING_ADDON = {
  title: 'Actividad Adicional: Clases de Boxeo',
  subtitle: 'Añádelo a cualquier membresía o tómalo de forma independiente',
  pricePerMonth: 50,
  details: [
    'Técnica de golpeo (jab, cross, ganchos, uppercuts) y desplazamientos',
    'Trabajo en sacos pesados de boxeo y manoplas con entrenador',
    'Acondicionamiento cardiovascular de alta intensidad metabólica',
    'No requiere experiencia previa, apto para hombres y mujeres',
  ],
};

export const PLAN_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    category: 'Acceso a Instalaciones',
    features: [
      {
        name: 'Ingreso Libre e Ilimitado (sin límite de horas)',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Zona de pesas, mancuernas y barras olímpicas',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Máquinas de poleas, piernas y dorsales guiadas',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Área cardiovascular (caminadoras y elípticas)',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Vestidores y casilleros seguros',
        silver: true,
        gold: true,
        black: true,
      },
    ],
  },
  {
    category: 'Actividad Adicional de Boxeo & Clases',
    features: [
      {
        name: 'Clases dirigidas de Boxeo con instructor',
        silver: 'Adicional (+S/. 50/mes)',
        gold: 'Adicional (+S/. 45/mes)',
        black: 'Incluidas en el plan',
      },
      {
        name: 'Acceso al área de sacos de boxeo',
        silver: 'En horario de clase',
        gold: 'En horario de clase',
        black: 'Acceso libre y en clases',
      },
      {
        name: 'Entrenamiento de técnica y manoplas',
        silver: false,
        gold: false,
        black: 'Incluido en clases',
      },
    ],
  },
  {
    category: 'Asesoría & Beneficios',
    features: [
      {
        name: 'Asesoría y corrección técnica de instructores en sala',
        silver: 'Inicial',
        gold: 'Permanente',
        black: 'Permanente + Boxeo',
      },
      {
        name: 'Control periódico de peso y medidas',
        silver: 'Básico',
        gold: 'Mensual',
        black: 'Mensual continuo',
      },
      {
        name: 'Pases de cortesía para acompañantes',
        silver: false,
        gold: '1 pase / trimestre',
        black: '2 pases / trimestre',
      },
      {
        name: 'Congelamiento por viaje o salud',
        silver: '7 días (semestral/anual)',
        gold: '15 días (semestral/anual)',
        black: '30 días (semestral/anual)',
      },
    ],
  },
];

export const SCHEDULE_DAYS: readonly ScheduleClass['day'][] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const SCHEDULE_CLASSES: ScheduleClass[] = [
  // Lunes
  {
    id: 'lun-boxeo-0700',
    day: 'Lunes',
    time: '07:00 - 08:00',
    title: 'Boxeo: Técnica & Golpeo Matutino',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'lun-fuerza-0900',
    day: 'Lunes',
    time: '09:00 - 10:30',
    title: 'Musculación Guiada: Pecho y Tríceps',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 8,
  },
  {
    id: 'lun-boxeo-1830',
    day: 'Lunes',
    time: '18:30 - 19:30',
    title: 'Boxeo Tarde: Sacos & Resistencia',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Extrema',
    spotsLeft: 4,
  },
  {
    id: 'lun-funcional-1945',
    day: 'Lunes',
    time: '19:45 - 20:45',
    title: 'Circuito Funcional & Quema de Grasa',
    category: 'Funcional',
    coach: 'Coach de Acondicionamiento',
    intensity: 'Alta',
    spotsLeft: 7,
  },

  // Martes
  {
    id: 'mar-fuerza-0800',
    day: 'Martes',
    time: '08:00 - 09:30',
    title: 'Musculación: Piernas y Glúteos',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'mar-boxeo-1830',
    day: 'Martes',
    time: '18:30 - 19:30',
    title: 'Boxeo: Desplazamientos & Manoplas',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'mar-hiit-1945',
    day: 'Martes',
    time: '19:45 - 20:30',
    title: 'Cardio HIIT Metabólico',
    category: 'HIIT',
    coach: 'Coach de Acondicionamiento',
    intensity: 'Extrema',
    spotsLeft: 8,
  },

  // Miércoles
  {
    id: 'mie-boxeo-0700',
    day: 'Miércoles',
    time: '07:00 - 08:00',
    title: 'Boxeo: Fundamentos & Guardia',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Alta',
    spotsLeft: 7,
  },
  {
    id: 'mie-fuerza-0900',
    day: 'Miércoles',
    time: '09:00 - 10:30',
    title: 'Musculación: Espalda y Bíceps',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'mie-boxeo-1830',
    day: 'Miércoles',
    time: '18:30 - 19:30',
    title: 'Boxeo Tarde: Combinaciones de Golpeo',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Extrema',
    spotsLeft: 3,
  },

  // Jueves
  {
    id: 'jue-fuerza-0800',
    day: 'Jueves',
    time: '08:00 - 09:30',
    title: 'Musculación: Hombros y Trapecios',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 8,
  },
  {
    id: 'jue-boxeo-1830',
    day: 'Jueves',
    time: '18:30 - 19:30',
    title: 'Boxeo: Defensa & Esquivas',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'jue-funcional-1945',
    day: 'Jueves',
    time: '19:45 - 20:45',
    title: 'Entrenamiento Funcional Integral',
    category: 'Funcional',
    coach: 'Coach de Acondicionamiento',
    intensity: 'Alta',
    spotsLeft: 6,
  },

  // Viernes
  {
    id: 'vie-boxeo-0700',
    day: 'Viernes',
    time: '07:00 - 08:00',
    title: 'Boxeo: Rounds en Saco Pesado',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Extrema',
    spotsLeft: 5,
  },
  {
    id: 'vie-fuerza-0900',
    day: 'Viernes',
    time: '09:00 - 10:30',
    title: 'Musculación: Pierna y Core',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 7,
  },
  {
    id: 'vie-boxeo-1830',
    day: 'Viernes',
    time: '18:30 - 19:30',
    title: 'Boxeo: Sparring Controlado & Manoplas',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Extrema',
    spotsLeft: 4,
  },

  // Sábado
  {
    id: 'sab-boxeo-0830',
    day: 'Sábado',
    time: '08:30 - 09:30',
    title: 'Boxeo Fin de Semana: Circuito Completo',
    category: 'Boxeo',
    coach: 'Instructor de Combate',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'sab-fuerza-1000',
    day: 'Sábado',
    time: '10:00 - 11:30',
    title: 'Full Body & Pesas Libres',
    category: 'Fuerza',
    coach: 'Coach de Sala',
    intensity: 'Alta',
    spotsLeft: 9,
  },

  // Domingo
  {
    id: 'dom-funcional-0830',
    day: 'Domingo',
    time: '08:30 - 09:30',
    title: 'Activación Dominical & Cardio',
    category: 'Funcional',
    coach: 'Coach de Sala',
    intensity: 'Media',
    spotsLeft: 10,
  },
];

export const FACILITY_ZONES: FacilityZone[] = [
  {
    id: 'zona-peso-libre',
    title: 'Sala de Musculación & Peso Libre',
    badge: 'INGRESO LIBRE',
    description: 'Espacio completo para hipertrofia y aumento de fuerza. Mancuernas de todos los pesos, barras olímpicas, bancas planas e inclinadas y jaulas de sentadillas.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Mancuernas de goma y acero en amplio rango de pesos (2 kg a 45 kg+)',
      'Barras olímpicas y semi-olímpicas con discos de fundición y parachoques',
      'Bancas profesionales planas, inclinadas y declinadas ajustables',
      'Racks de potencia y estaciones seguras para sentadilla libre',
    ],
    amenities: [
      'Pisos de caucho de alta densidad para amortiguación de impacto',
      'Espejos panorámicos para control de postura y técnica',
      'Cinturones lumbares y accesorios de agarre disponibles',
    ],
  },
  {
    id: 'zona-maquinas-poleas',
    title: 'Circuito de Máquinas & Poleas Guiadas',
    badge: 'AISLAMIENTO MUSCULAR',
    description: 'Variedad de máquinas con trayectoria guiada ideales para aislar grupos musculares con seguridad, desde principiantes hasta avanzados.',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Prensa de piernas a 45° y máquina Hack para cuádriceps',
      'Estaciones de polea alta para dorsales y polea baja para remo',
      'Máquina Smith multipower guiada con topes de seguridad',
      'Camillas para femorales y sillones para extensión de cuádriceps',
    ],
    amenities: [
      'Instrucciones y diagramas anatómicos en cada máquina',
      'Ajuste ergonómico rápido para diferentes estaturas',
      'Asesoría constante del entrenador de sala en cada serie',
    ],
  },
  {
    id: 'zona-boxeo-combate',
    title: 'Área de Boxeo & Deportes de Contacto',
    badge: 'ACTIVIDAD ADICIONAL',
    description: 'Zona dedicada al boxeo con sacos pesados de golpeo, pera de velocidad y piso acolchado para entrenamientos de combate y resistencia.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Batería de sacos pesados de boxeo para golpeo continuo y combinaciones',
      'Peras de velocidad y sacos de doble elástico para reflejos',
      'Área de tatami de alto impacto para trabajo de pies y movilidad',
      'Manoplas y escudos para entrenamiento asistido con el instructor',
    ],
    amenities: [
      'Clases dirigidas con entrenador de boxeo',
      'Entrenamientos aptos tanto para principiantes como practicantes avanzados',
      'Temporizador de asaltos y campanas de descanso',
    ],
  },
  {
    id: 'zona-cardio-funcional',
    title: 'Cardio, Calistenia & Estiramiento',
    badge: 'RESISTENCIA & SALUD',
    description: 'Sector destinado al acondicionamiento aeróbico, calentamiento previo y estiramientos finales para una sesión equilibrada y segura.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Caminadoras eléctricas profesionales y elípticas cardiovasculares',
      'Bicicletas estáticas de spinning para intervalos de resistencia',
      'Barras de dominadas, fondos y barras para calistenia',
      'Colchonetas de suelo, bandas elásticas y cajones pliométricos',
    ],
    amenities: [
      'Música motivacional con sonido envolvente en toda la sala',
      'Casilleros diarios para dejar tus pertenencias bajo llave',
      'Vestidores limpios y duchas con agua caliente',
    ],
  },
];

export const MEMBERSHIP_FAQS: FaqItem[] = [
  {
    question: '¿Qué significa que todos los planes tengan "Ingreso Libre"?',
    answer: 'Significa que una vez inscrito, puedes ingresar a entrenar a la sala de musculación y peso libre en cualquier momento dentro de nuestros horarios de atención (de 6:00 AM a 10:00 PM), tantas veces como desees y sin límite de tiempo por sesión (estimado común de 1:30 a 2 horas).',
    category: 'Membresías',
  },
  {
    question: '¿Cuáles son los periodos disponibles para pagar la membresía?',
    answer: 'Manejamos 4 modalidades en soles: Mensual (1 mes), Trimestral (3 meses), Semestral (6 meses) y Anual (12 meses). Cuanto mayor sea el periodo elegido, menor es el costo equivalente por mes, permitiéndote un ahorro significativo.',
    category: 'Membresías',
  },
  {
    question: '¿Cómo funcionan las clases de Boxeo como actividad adicional?',
    answer: 'Las clases de boxeo son una actividad especializada dirigida por un instructor. Puedes contratarlas incluidas directamente con el "Plan Gym + Boxeo" o añadirlas como un adicional mensual (+ S/. 50/mes) a tu membresía regular de musculación.',
    category: 'Boxeo',
  },
  {
    question: '¿Qué requisitos necesito para acceder al Plan Estudiante?',
    answer: 'El Plan Estudiante ofrece una tarifa preferencial en soles. Solo necesitas presentar tu carné universitario vigente, carné de instituto o constancia de matrícula al momento de tu inscripción en recepción.',
    category: 'Planes',
  },
  {
    question: '¿Cuentan con asesoría o entrenador en sala?',
    answer: 'Sí. Contamos con instructores de sala que te guían en el uso correcto de las máquinas, te estructuran tu rutina inicial y te ayudan a corregir tu técnica para entrenar con total seguridad y evitar lesiones.',
    category: 'Entrenamiento',
  },
  {
    question: '¿Dónde está ubicado Trankilandia Gym en Ayacucho?',
    answer: 'Estamos ubicados en Huamanga, Ayacucho, Perú. Puedes comunicarte directamente a nuestro WhatsApp oficial al +51 999 787 489 para enviarte la ubicación exacta y consultar promociones del mes.',
    category: 'Ubicación',
  },
];
