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
  { label: 'Planes & Tarifas', href: '/planes' },
  { label: 'Horarios & Clases', href: '/clases' },
  { label: 'Instalaciones', href: '/instalaciones' },
];

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'free-entry',
    title: 'Libertad de Horarios',
    description: 'Entrena cuando mejor se adapte a tu día. Tienes acceso libre a nuestra sala de pesas y máquinas sin turnos fijados.',
    iconName: 'Clock',
  },
  {
    id: 'heavy-equipment',
    title: 'Fuerza & Musculación',
    description: 'Mancuernas en todos los pesos, barras olímpicas y máquinas completas para desarrollar fuerza y tonificación a tu ritmo.',
    iconName: 'Dumbbell',
  },
  {
    id: 'boxing-activity',
    title: 'Escuela de Boxeo',
    description: 'Aprende técnica real de golpeo, quema calorías y desata tu energía en sesiones dinámicas de saco y manoplas.',
    iconName: 'Zap',
  },
  {
    id: 'family-community',
    title: 'Más que un Gym, Familia',
    description: 'Un ambiente cálido y motivador en Huamanga donde entrenas con amigos y entrenadores que te apoyan en cada paso.',
    iconName: 'Users',
  },
];

export const PROGRAMS_DATA: Program[] = [
  {
    id: 'musculacion-fuerza',
    title: 'Musculación & Tonificación',
    subtitle: 'Fuerza & Masa Muscular',
    description: 'Desarrolla fuerza, postura y firmeza muscular con pesas libres, barras olímpicas y circuito guiado de máquinas con orientación constante.',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Dumbbell',
    tag: 'Fuerza',
  },
  {
    id: 'clases-boxeo',
    title: 'Escuela de Boxeo',
    subtitle: 'Técnica, Energía y Agilidad',
    description: 'Aprende la disciplina del boxeo: desplazamientos, combinaciones de golpeo, trabajo intenso en sacos pesados y manoplas con el profesor.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    tag: 'Boxeo',
  },
  {
    id: 'entrenamiento-funcional',
    title: 'Acondicionamiento Funcional',
    subtitle: 'Resistencia & Quema de Grasa',
    description: 'Circuitos de cuerpo completo con ejercicios dinámicos pensados para mejorar tu capacidad cardiovascular, agilidad y vitalidad diaria.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    iconName: 'Activity',
    tag: 'Resistencia',
  },
  {
    id: 'cardio-fitness',
    title: 'Cardio & Ritmo Fitness',
    subtitle: 'Salud y Vitalidad',
    description: 'Caminadoras, elípticas, bicicletas de spinning y sesiones de ritmo fitness para activar tu energía y cuidar tu salud cardiovascular.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    iconName: 'Flame',
    tag: 'Cardio',
  },
];

export const ABOUT_DATA: AboutData = {
  badge: 'TRANKILANDIA GYM · HUAMANGA, AYACUCHO',
  title: 'MÁS QUE UN GIMNASIO, SOMOS FAMILIA.',
  paragraphs: [
    'En Trankilandia Gym entendemos que la constancia y la salud florecen cuando estás en un lugar donde te sientes bienvenido, respetado y respaldado.',
    'Ubicados en Ayacucho (Huamanga), ponemos a tu disposición una completa sala de pesas y musculación, instructores cercanos que te enseñan la técnica correcta y clases dirigidas de boxeo para poner a prueba tu agilidad y resistencia.',
  ],
  imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
  stats: [
    { value: '100%', label: 'Ambiente Motivador' },
    { value: '6:00 AM', label: 'Apertura de Lunes a Sábado' },
    { value: '+500', label: 'Miembros en la Familia' },
  ],
  ctaText: 'ESCRÍBENOS POR WHATSAPP',
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
    tagline: 'Tarifa especial para universitarios y escolares de Ayacucho',
    monthlyPrice: 75,
    quarterlyPrice: 200,    // S/. 66.6 / mes · Ahorras S/. 25
    semiannualPrice: 370,   // S/. 61.6 / mes · Ahorras S/. 80
    annualPrice: 680,       // S/. 56.6 / mes · Ahorras S/. 220
    isPopular: false,
    badge: 'TARIFA ESTUDIANTE',
    includesFreeEntry: true,
    description: 'Diseñado para que mantengas tu energía y salud física activa junto a tus estudios. Presenta tu carné y accede con total comodidad a nuestras instalaciones.',
    highlights: [
      'Acceso completo a sala de pesas, mancuernas y máquinas',
      'Horario libre de lunes a domingo para adaptarse a tus clases',
      'Rutina inicial y orientación de los profesores de sala',
      'Vestidores limpios, casilleros diarios y agua caliente',
      'Área de cardio para calentamiento y salud aeróbica',
    ],
    ctaText: 'ELEGIR PLAN ESTUDIANTE',
  },
  {
    id: 'general',
    name: 'Plan General',
    tagline: 'La membresía más elegida para transformar tu rutina',
    monthlyPrice: 95,
    quarterlyPrice: 255,    // S/. 85.0 / mes · Ahorras S/. 30
    semiannualPrice: 470,   // S/. 78.3 / mes · Ahorras S/. 100
    annualPrice: 840,       // S/. 70.0 / mes · Ahorras S/. 300
    isPopular: true,
    badge: 'MÁS ELEGIDO',
    includesFreeEntry: true,
    description: 'Entrena a tu ritmo en el momento que tú elijas. Cuentas con la guía constante de instructores en sala para cuidar tu técnica y ayudarte a alcanzar tus metas.',
    highlights: [
      'Acceso libre a toda hora dentro de nuestro horario diario',
      'Mancuernas en todos los pesos, barras y circuito de máquinas',
      'Asesoría y corrección técnica permanente de los instructores',
      'Acompañamiento periódico para medir tus avances y fuerza',
      'Casilleros seguros, vestidores y duchas con agua caliente',
      'Tarifa con descuento si deseas sumarte a las clases de boxeo',
    ],
    ctaText: 'ELEGIR PLAN GENERAL',
  },
  {
    id: 'combo_boxeo',
    name: 'Plan Gym + Boxeo',
    tagline: 'Fuerza muscular completa + Escuela de Boxeo dirigida',
    monthlyPrice: 140,
    quarterlyPrice: 380,    // S/. 126.6 / mes · Ahorras S/. 40
    semiannualPrice: 690,   // S/. 115.0 / mes · Ahorras S/. 150
    annualPrice: 1250,      // S/. 104.1 / mes · Ahorras S/. 430
    isPopular: false,
    badge: 'COMBO COMPLETO',
    includesFreeEntry: true,
    includesBoxing: true,
    description: 'La experiencia deportiva más completa: entrena en el gimnasio a tu ritmo y perfecciona tu golpeo, reflejos y cardio en las clases dirigidas de boxeo.',
    highlights: [
      'Acceso completo a toda la sala de musculación y pesas',
      'Clases dirigidas de Boxeo con instructores dedicados',
      'Entrenamiento técnico en sacos pesados, manoplas y cuerda',
      'Combinación ideal para quemar grasa, ganar agilidad y desestresarte',
      'Pases de invitación para venir a entrenar con tus amigos',
    ],
    ctaText: 'ELEGIR GYM + BOXEO',
  },
];

export const BOXING_ADDON = {
  title: 'Clases de Boxeo: Desata Tu Energía',
  subtitle: 'Añade sesiones dirigidas de boxeo a tu membresía regular o tómalo como taller independiente',
  pricePerMonth: 50,
  details: [
    'Aprende técnica real: guardia, combinaciones de golpeo y desplazamientos',
    'Práctica intensa en sacos pesados de boxeo y manoplas con el instructor',
    'Excelente para ganar reflejos, confianza, coordinación y quemar calorías',
    'Ambiente dinámico y seguro, apto tanto para principiantes como avanzados',
  ],
};

export const PLAN_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    category: 'Acceso y Sala de Entrenamiento',
    features: [
      {
        name: 'Libertad de horario en sala de musculación',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Zona de mancuernas, barras olímpicas y discos',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Máquinas guiadas de poleas, piernas y dorsales',
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
        name: 'Vestidores y casilleros de uso diario',
        silver: true,
        gold: true,
        black: true,
      },
    ],
  },
  {
    category: 'Escuela de Boxeo & Clases',
    features: [
      {
        name: 'Clases dirigidas de Boxeo con instructor',
        silver: 'Adicional (+S/. 50/mes)',
        gold: 'Adicional (+S/. 45/mes)',
        black: 'Incluidas en el plan',
      },
      {
        name: 'Práctica en sacos pesados de golpeo',
        silver: 'En horario de clase',
        gold: 'En horario de clase',
        black: 'Acceso libre y en clases',
      },
      {
        name: 'Entrenamiento técnico con manoplas',
        silver: false,
        gold: false,
        black: 'Incluido en clases',
      },
    ],
  },
  {
    category: 'Acompañamiento & Beneficios',
    features: [
      {
        name: 'Orientación técnica de los instructores en sala',
        silver: 'Inicial',
        gold: 'Permanente',
        black: 'Permanente + Boxeo',
      },
      {
        name: 'Control y seguimiento de tus avances',
        silver: 'Básico',
        gold: 'Periódico',
        black: 'Continuo',
      },
      {
        name: 'Pases de cortesía para invitar amigos',
        silver: false,
        gold: '1 pase / trimestre',
        black: '2 pases / trimestre',
      },
      {
        name: 'Opción de congelamiento por viaje o salud',
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
    title: 'Boxeo: Fundamentos & Golpeo Matutino',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'lun-fuerza-0900',
    day: 'Lunes',
    time: '09:00 - 10:30',
    title: 'Musculación Guiada: Pecho y Brazos',
    category: 'Fuerza',
    coach: 'Instructor de Sala',
    intensity: 'Alta',
    spotsLeft: 8,
  },
  {
    id: 'lun-boxeo-1830',
    day: 'Lunes',
    time: '18:30 - 19:30',
    title: 'Boxeo Tarde: Sacos & Resistencia',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Extrema',
    spotsLeft: 4,
  },
  {
    id: 'lun-funcional-1945',
    day: 'Lunes',
    time: '19:45 - 20:45',
    title: 'Circuito Funcional & Quema de Calorías',
    category: 'Funcional',
    coach: 'Instructor de Acondicionamiento',
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
    coach: 'Instructor de Sala',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'mar-boxeo-1830',
    day: 'Martes',
    time: '18:30 - 19:30',
    title: 'Boxeo: Desplazamientos & Manoplas',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'mar-hiit-1945',
    day: 'Martes',
    time: '19:45 - 20:30',
    title: 'Cardio HIIT Dinámico',
    category: 'HIIT',
    coach: 'Instructor de Acondicionamiento',
    intensity: 'Extrema',
    spotsLeft: 8,
  },

  // Miércoles
  {
    id: 'mie-boxeo-0700',
    day: 'Miércoles',
    time: '07:00 - 08:00',
    title: 'Boxeo: Guardia & Combinaciones',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Alta',
    spotsLeft: 7,
  },
  {
    id: 'mie-fuerza-0900',
    day: 'Miércoles',
    time: '09:00 - 10:30',
    title: 'Musculación: Espalda y Bíceps',
    category: 'Fuerza',
    coach: 'Instructor de Sala',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'mie-boxeo-1830',
    day: 'Miércoles',
    time: '18:30 - 19:30',
    title: 'Boxeo Tarde: Ritmo & Golpeo Continuo',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Extrema',
    spotsLeft: 3,
  },

  // Jueves
  {
    id: 'jue-fuerza-0800',
    day: 'Jueves',
    time: '08:00 - 09:30',
    title: 'Musculación: Hombros y Core',
    category: 'Fuerza',
    coach: 'Instructor de Sala',
    intensity: 'Alta',
    spotsLeft: 8,
  },
  {
    id: 'jue-boxeo-1830',
    day: 'Jueves',
    time: '18:30 - 19:30',
    title: 'Boxeo: Esquivas & Contraataque',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'jue-funcional-1945',
    day: 'Jueves',
    time: '19:45 - 20:45',
    title: 'Entrenamiento Funcional Completo',
    category: 'Funcional',
    coach: 'Instructor de Acondicionamiento',
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
    coach: 'Profesor de Boxeo',
    intensity: 'Extrema',
    spotsLeft: 5,
  },
  {
    id: 'vie-fuerza-0900',
    day: 'Viernes',
    time: '09:00 - 10:30',
    title: 'Musculación: Piernas y Fuerza Base',
    category: 'Fuerza',
    coach: 'Instructor de Sala',
    intensity: 'Alta',
    spotsLeft: 7,
  },
  {
    id: 'vie-boxeo-1830',
    day: 'Viernes',
    time: '18:30 - 19:30',
    title: 'Boxeo: Práctica con Manoplas',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Extrema',
    spotsLeft: 4,
  },

  // Sábado
  {
    id: 'sab-boxeo-0830',
    day: 'Sábado',
    time: '08:30 - 09:30',
    title: 'Boxeo Fin de Semana: Técnica & Energía',
    category: 'Boxeo',
    coach: 'Profesor de Boxeo',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'sab-fuerza-1000',
    day: 'Sábado',
    time: '10:00 - 11:30',
    title: 'Full Body & Pesas Libres',
    category: 'Fuerza',
    coach: 'Instructor de Sala',
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
    coach: 'Instructor de Sala',
    intensity: 'Media',
    spotsLeft: 10,
  },
];

export const FACILITY_ZONES: FacilityZone[] = [
  {
    id: 'zona-peso-libre',
    title: 'Sala de Musculación & Peso Libre',
    badge: 'ENTRENA A TU RITMO',
    description: 'Espacio completo para hipertrofia, fuerza y tonificación. Mancuernas de todos los pesos, barras olímpicas, bancas ajustables y estaciones para sentadilla libre.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Mancuernas en amplia variedad de pesos para todos los niveles',
      'Barras olímpicas con discos de fundición y parachoques de seguridad',
      'Bancas profesionales planas e inclinadas para trabajo pectoral',
      'Racks y estaciones seguras para sentadilla libre y peso muerto',
    ],
    amenities: [
      'Pisos amortiguados de alta densidad para mayor confort',
      'Espejos amplios para vigilar tu postura y técnica',
      'Orientación y consejos de los instructores en sala',
    ],
  },
  {
    id: 'zona-maquinas-poleas',
    title: 'Circuito de Máquinas & Poleas Guiadas',
    badge: 'SEGURIDAD & AISLAMIENTO',
    description: 'Variedad de máquinas con trayectoria guiada ideales para trabajar cada grupo muscular de manera segura, tanto para quienes inician como para atletas experimentados.',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Prensa de piernas y máquina para desarrollo de cuádriceps',
      'Estaciones de poleas altas y bajas para espalda y remos',
      'Máquina Smith multipower con topes de seguridad ajustables',
      'Máquinas para aislamiento de bíceps, tríceps y hombros',
    ],
    amenities: [
      'Instrucciones claras en cada equipo',
      'Ajustes ergonómicos sencillos para tu estatura',
      'Apoyo de los profesores para regular el peso adecuado',
    ],
  },
  {
    id: 'zona-boxeo-combate',
    title: 'Área de Boxeo & Deportes de Contacto',
    badge: 'ESCUELA DE BOXEO',
    description: 'Sector acondicionado para aprender boxeo con sacos pesados de golpeo, pera de velocidad y piso acolchado para entrenamientos de combate y resistencia.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Batería de sacos pesados para golpeo y combinaciones',
      'Peras de velocidad y elásticos para reflejos y agilidad',
      'Área acolchada para desplazamientos y saltos de cuerda',
      'Manoplas y escudos para entrenamiento asistido con el profesor',
    ],
    amenities: [
      'Clases dirigidas para principiantes y practicantes avanzados',
      'Ambiente enérgico y motivador en cada clase',
      'Cronómetro de rounds para regular tus descansos',
    ],
  },
  {
    id: 'zona-cardio-funcional',
    title: 'Cardio, Calistenia & Estiramiento',
    badge: 'SALUD & VITALIDAD',
    description: 'Espacio pensado para tu calentamiento inicial, sesiones aeróbicas y estiramiento final para salir renovado de tu entrenamiento.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Caminadoras eléctricas y elípticas para resistencia aeróbica',
      'Bicicletas estáticas de spinning para intervalos de cardio',
      'Barras para dominadas, fondos y ejercicios de calistenia',
      'Colchonetas cómodas para abdominales y estiramientos',
    ],
    amenities: [
      'Música motivadora para acompañar tu sesión',
      'Casilleros diarios para guardar tus cosas bajo llave',
      'Vestidores limpios y duchas con agua caliente',
    ],
  },
];

export const MEMBERSHIP_FAQS: FaqItem[] = [
  {
    question: '¿Cómo funciona el acceso al gimnasio?',
    answer: 'Una vez inscrito, puedes venir a entrenar a la sala de musculación en el momento que mejor te convenga dentro de nuestro horario de atención (de 6:00 AM a 10:00 PM de lunes a sábado y domingos de 7:00 AM a 1:00 PM). Entrenas a tu ritmo, sin prisas ni turnos cerrados.',
    category: 'Membresías',
  },
  {
    question: '¿Qué modalidades de tiempo puedo elegir?',
    answer: 'Contamos con opciones flexibles en soles: 1 Mes, 3 Meses (Trimestral), 6 Meses (Semestral) y 1 Año (Anual). Los planes de mayor tiempo te ofrecen un ahorro mensual muy conveniente.',
    category: 'Membresías',
  },
  {
    question: '¿Puedo tomar clases de Boxeo si nunca he boxeado?',
    answer: '¡Por supuesto! Nuestras clases de boxeo son ideales tanto para quienes dan sus primeros golpes como para quienes ya tienen experiencia. El profesor te enseña desde cero la postura, la guardia y el golpeo en sacos y manoplas.',
    category: 'Boxeo',
  },
  {
    question: '¿Cómo accedo al Plan Estudiante?',
    answer: 'Es muy fácil: solo muestra tu carné universitario, de instituto o constancia de estudios al registrarte en recepción para acceder a la tarifa preferencial en soles.',
    category: 'Planes',
  },
  {
    question: '¿Hay alguien que me enseñe a usar las máquinas?',
    answer: 'Sí, siempre tenemos instructores en sala listos para orientarte, mostrarte el uso correcto de cada máquina y corregir tu postura para que entrenes con total seguridad.',
    category: 'Entrenamiento',
  },
  {
    question: '¿Dónde están ubicados en Ayacucho?',
    answer: 'Estamos ubicados en Huamanga, Ayacucho, Perú. Escríbenos directamente por WhatsApp al +51 999 787 489 para compartirte la ubicación exacta en el mapa y darte la bienvenida al club.',
    category: 'Ubicación',
  },
];
