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
  GymBenefit,
} from '../types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Planes & Tarifas', href: '/planes' },
  { label: 'Horarios & Clases', href: '/clases' },
  { label: 'Instalaciones', href: '/instalaciones' },
];

// 10 BENEFICIOS OFICIALES DE TRANKILANDIA GYM (SEGÚN VOLANTE OFICIAL)
export const OFFICIAL_BENEFITS: GymBenefit[] = [
  {
    id: 'asesoria-nutricional',
    number: '01',
    title: 'Asesoría Nutricional Personalizada',
    category: 'Nutrición',
    description: 'Orientación alimenticia adaptada a tu metabolismo y objetivos: definición, tonificación o ganancia de masa muscular.',
    iconName: 'Apple',
  },
  {
    id: 'maquinas-musculacion',
    number: '02',
    title: 'Máquinas de Musculación',
    category: 'Musculación',
    description: 'Equipamiento de alto nivel con poleas guiadas, prensa de piernas, bancos multiposición y estaciones de aislamiento.',
    iconName: 'Dumbbell',
  },
  {
    id: 'maquinas-cardiovasculares',
    number: '03',
    title: 'Máquinas Cardiovasculares',
    category: 'Cardio',
    description: 'Caminadoras eléctricas modernas, elípticas y zonas de acondicionamiento aeróbico para cuidar tu salud cardiovascular.',
    iconName: 'HeartPulse',
  },
  {
    id: 'rutinas-personalizadas',
    number: '04',
    title: 'Rutinas Personalizadas Dirigidas',
    category: 'Supervisión',
    description: 'Planes de entrenamiento elaborados a tu medida por nuestros instructores y visibles en tu app o carnet digital.',
    iconName: 'ClipboardList',
  },
  {
    id: 'aerobicos-grupal',
    number: '05',
    title: 'Aeróbicos (Clase Grupal)',
    category: 'Clases Grupales',
    description: 'Sesiones colectivas de alta energía y ritmo continuo para quemar calorías, tonificar y aumentar tu vitalidad diaria.',
    iconName: 'Flame',
  },
  {
    id: 'baile-grupal',
    number: '06',
    title: 'Baile (Clase Grupal)',
    category: 'Clases Grupales',
    description: 'Coreografías alegres de ritmo latino y fitness bailable para liberar el estrés, mejorar tu coordinación y divertirte.',
    iconName: 'Sparkles',
  },
  {
    id: 'spinning-grupal',
    number: '07',
    title: 'Spinning Grupal',
    category: 'Cardio',
    description: 'Ciclismo indoor guiado con música motivante, intervalos de potencia y subidas simuladas para quemar grasa al máximo.',
    iconName: 'Bike',
  },
  {
    id: 'funcional-grupal',
    number: '08',
    title: 'Funcional (Clase Grupal)',
    category: 'Clases Grupales',
    description: 'Circuitos atléticos multiarticulares con peso corporal, kettlebells y bandas para fuerza ágil y resistencia real.',
    iconName: 'Activity',
  },
  {
    id: 'complementos-nutricionales',
    number: '09',
    title: 'Complementos Nutricionales',
    category: 'Nutrición',
    description: 'Barra y venta de suplementos de calidad (proteínas, creatina, pre-entrenos y bebidas hidratantes) para acelerar resultados.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'control-continuo',
    number: '10',
    title: 'Control Continuo Supervisado',
    category: 'Supervisión',
    description: 'Corrección técnica permanente en sala y seguimiento periódico de tus pesos, medidas y marcas personales (PRs).',
    iconName: 'CheckCircle2',
  },
];

export const COACH_TEAM_INFO = {
  totalCoaches: 4,
  womenCoaches: 2,
  menCoaches: 2,
  badge: 'STAFF PROFESIONAL CERTIFICADO',
  headline: 'Contamos con 4 Entrenadores: 2 Mujeres y 2 Varones',
  subheadline: 'Instructores dedicados a tu acompañamiento técnico, motivación y control de progresos en cada entrenamiento.',
};

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
    description: 'Un ambiente cálido y motivador donde entrenas rodeado de compañeros y entrenadores que te impulsan en cada repetición.',
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
  badge: 'TRANKILANDIA CLUB · MÁS CERCA DE TI',
  title: 'MÁS QUE UN GIMNASIO, SOMOS FAMILIA.',
  paragraphs: [
    'En Trankilandia Gym entendemos que la constancia y la salud florecen cuando estás en un lugar donde te sientes bienvenido, respetado y respaldado.',
    'Ponemos a tu disposición máquinas modernas de musculación y cardio, complementos nutricionales y un equipo de 4 entrenadores profesionales (2 mujeres y 2 varones) dedicados a tu control continuo y rutinas guiadas.',
  ],
  imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
  stats: [
    { value: '4', label: 'Entrenadores (2 mujeres · 2 varones)' },
    { value: '2', label: 'Sedes en Huamanga' },
    { value: '10', label: 'Beneficios Completos' },
  ],
  ctaText: 'ESCRÍBENOS POR WHATSAPP',
  ctaHref: 'https://wa.me/51999787489',
};

export const GYM_CONTACT: GymContactInfo = {
  address: 'Segunda sede Emadi: José Olaya N° 640 / Sede Pueblo Libre: Vía Libertadores',
  phone: '+51999787489',
  phoneDisplay: '+51 999 787 489',
  email: 'trankilandiagymperu@gmail.com',
  hours: {
    weekday: 'Lun - Sáb: 6:00 AM - 10:00 PM',
    sunday: 'Dom: 7:00 AM - 1:00 PM',
  },
  socialLinks: [
    { platform: 'Instagram', href: 'https://www.instagram.com/trankilandiagym/' },
    { platform: 'Facebook', href: 'https://www.facebook.com/search/top?q=Trankilandia%20Gym' },
    { platform: 'WhatsApp', href: 'https://wa.me/51999787489' },
  ],
  sedes: [
    {
      id: 'sede-pueblo-libre',
      name: 'Sede Vía Libertadores - Pueblo Libre',
      address: 'Vía Libertadores - Pueblo Libre',
      reference: 'Ref. Reservorio, bajar en la entrada Ruta 3',
      zone: 'Huamanga, Ayacucho',
    },
    {
      id: 'sede-emadi',
      name: 'Segunda Sede Emadi',
      address: 'José Olaya N° 640',
      reference: 'Al frente del Hotel Internacional',
      zone: 'Huamanga, Ayacucho',
    },
  ],
};

export const MEMBERSHIP_PLANS: PlanTier[] = [
  {
    id: 'estudiante',
    name: 'Plan Estudiante',
    tagline: 'Tarifa preferencial para universitarios y escolares con carné vigente',
    monthlyPrice: 70,
    quarterlyPrice: 180,    // S/. 60.0 / mes · Ahorras S/. 30
    semiannualPrice: 310,   // S/. 51.6 / mes · Ahorras S/. 110
    annualPrice: 400,       // S/. 33.3 / mes · Ahorras S/. 440
    isPopular: false,
    badge: 'TARIFA ESTUDIANTE',
    includesFreeEntry: true,
    description: 'Diseñado para que mantengas tu energía y salud física activa junto a tus estudios. Presenta tu carné y accede con total comodidad a nuestras instalaciones.',
    highlights: [
      'Acceso completo a sala de pesas, mancuernas y máquinas',
      'Horario libre de lunes a domingo para adaptarse a tus clases',
      'Rutina personalizada y orientación constante de los profesores',
      'Vestidores limpios, casilleros diarios y duchas con agua caliente',
      'Área de cardio para calentamiento y salud aeróbica',
    ],
    ctaText: 'ELEGIR PLAN ESTUDIANTE',
  },
  {
    id: 'general',
    name: 'Plan General Libre',
    tagline: 'La membresía más elegida para transformar tu físico en Huamanga',
    monthlyPrice: 80,
    quarterlyPrice: 190,    // S/. 63.3 / mes · Ahorras S/. 50 (Tarifa real Gym.xlsm)
    semiannualPrice: 330,   // S/. 55.0 / mes · Ahorras S/. 150 (Tarifa real Gym.xlsm)
    annualPrice: 430,       // S/. 35.8 / mes · Ahorras S/. 530 (Tarifa real Gym.xlsm)
    isPopular: true,
    badge: 'MÁS ELEGIDO',
    includesFreeEntry: true,
    description: 'Entrena a tu ritmo sin límite de horario. Cuentas con la guía constante de instructores en sala para cuidar tu técnica y ayudarte a alcanzar tus metas.',
    highlights: [
      'Acceso 100% libre a toda hora dentro de nuestro horario diario',
      'Mancuernas en todos los pesos, barras olímpicas y circuito de máquinas',
      'Asesoría técnica y corrección biomecánica de los instructores',
      'Acompañamiento periódico para medir tus marcas y progresos (PRs)',
      'Casilleros seguros, vestidores y duchas con agua caliente',
      'Opción de inscripción con pago inicial (adelanto) y saldo diferido',
    ],
    ctaText: 'ELEGIR PLAN GENERAL',
  },
  {
    id: 'combo_boxeo',
    name: 'Plan Gym + Boxeo',
    tagline: 'Fuerza muscular completa + Escuela de Boxeo dirigida',
    monthlyPrice: 130,
    quarterlyPrice: 320,    // S/. 106.6 / mes · Ahorras S/. 70
    semiannualPrice: 580,   // S/. 96.6 / mes · Ahorras S/. 200
    annualPrice: 950,       // S/. 79.1 / mes · Ahorras S/. 610
    isPopular: false,
    badge: 'COMBO COMPLETO',
    includesFreeEntry: true,
    includesBoxing: true,
    description: 'La experiencia deportiva más completa: entrena en el gimnasio a tu ritmo y perfecciona tu golpeo, reflejos y cardio en las clases dirigidas de boxeo.',
    highlights: [
      'Acceso completo a toda la sala de musculación y pesas',
      'Clases dirigidas de Boxeo con instructores dedicados en ring y sacos',
      'Entrenamiento técnico en sacos pesados, manoplas y cuerda',
      'Combinación ideal para quemar grasa, ganar agilidad y potencia',
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
    question: '¿Dónde están ubicados y cómo llegar?',
    answer: 'Estamos ubicados en Huamanga, Ayacucho, Perú. Escríbenos directamente por WhatsApp al +51 999 787 489 para compartirte la ubicación exacta en el mapa y darte la bienvenida al club.',
    category: 'Ubicación',
  },
];
