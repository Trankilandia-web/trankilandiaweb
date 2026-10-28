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
  { label: 'Inicio', href: '#inicio' },
  { label: 'Programas', href: '#programas' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Contacto', href: '#contacto' },
];

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'elite-equipment',
    title: 'Equipamiento de Élite',
    description: 'Maquinaria de última generación para biomecánica óptima y máximo rendimiento.',
    iconName: 'Dumbbell',
  },
  {
    id: 'certified-coaches',
    title: 'Coaches Certificados',
    description: 'Entrenadores personales dedicados a estructurar y potenciar cada una de tus sesiones.',
    iconName: 'Award',
  },
  {
    id: 'tailored-plans',
    title: 'Planes a Medida',
    description: 'Rutinas y pautas de nutrición adaptadas a tu nivel, objetivos y estilo de vida.',
    iconName: 'ClipboardList',
  },
  {
    id: 'active-community',
    title: 'Comunidad Activa',
    description: 'Ambiente motivador que impulsa tu disciplina y te acompaña en cada superación.',
    iconName: 'Users',
  },
];

export const PROGRAMS_DATA: Program[] = [
  {
    id: 'fuerza-musculacion',
    title: 'Fuerza & Musculación',
    subtitle: 'Potencia & Masa Magra',
    description: 'Construye masa muscular magra y potencia absoluta mediante principios de sobrecarga progresiva.',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Dumbbell',
    tag: 'Hipertrofia',
  },
  {
    id: 'hiit-quema-grasa',
    title: 'Pérdida de Grasa & HIIT',
    subtitle: 'Alta Intensidad Metabólica',
    description: 'Quema calorías eficientemente y eleva tu resistencia cardiovascular con circuitos dinámicos de alta intensidad.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    iconName: 'Flame',
    tag: 'Resistencia',
  },
  {
    id: 'entrenamiento-funcional',
    title: 'Entrenamiento Funcional',
    subtitle: 'Rendimiento Atlético Real',
    description: 'Mejora tu movilidad, estabilidad del core y fuerza dinámica para rendir al máximo en tu día a día.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    tag: 'Agilidad',
  },
  {
    id: 'movilidad-bienestar',
    title: 'Movilidad & Bienestar',
    subtitle: 'Recuperación & Postura',
    description: 'Equilibra cuerpo y mente previniendo lesiones mediante estiramientos guiados y movilidad articular.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    iconName: 'HeartPulse',
    tag: 'Recuperación',
  },
];

export const ABOUT_DATA: AboutData = {
  badge: 'SOBRE NOSOTROS',
  title: 'MÁS QUE UN GIMNASIO, SOMOS UNA COMUNIDAD.',
  paragraphs: [
    'En Trankilandia Gym entendemos el fitness como un estilo de vida sustentable. No importa tu punto de partida, nuestro compromiso es brindarte la guía, el espacio y la motivación para alcanzar tu mejor versión.',
    'Nuestras instalaciones combinan biomecánica de alto nivel con una atmósfera inspiradora donde la disciplina y la superación personal marcan el estándar diario.',
  ],
  imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
  stats: [
    { value: '1,500 m²', label: 'Espacio de entrenamiento' },
    { value: '15+', label: 'Coaches especializados' },
    { value: '1,200+', label: 'Miembros activos' },
  ],
  ctaText: 'FORMA PARTE DEL CLUB',
  ctaHref: '#contacto',
};

export const GYM_CONTACT: GymContactInfo = {
  address: 'Av. Principal Trankilandia, Zona Fitness',
  phone: '+525512345678',
  phoneDisplay: '+52 (55) 1234-5678',
  email: 'contacto@trankilandiagym.com',
  hours: {
    weekday: 'Lun - Sáb: 5:30 AM - 10:00 PM',
    sunday: 'Dom: 6:00 AM - 2:00 PM',
  },
  socialLinks: [
    { platform: 'Instagram', href: 'https://instagram.com' },
    { platform: 'YouTube', href: 'https://youtube.com' },
    { platform: 'TikTok', href: 'https://tiktok.com' },
  ],
};

export const MEMBERSHIP_PLANS: PlanTier[] = [
  {
    id: 'silver',
    name: 'Plata Esencial',
    tagline: 'Fundamentos y disciplina sin límites',
    monthlyPrice: 890,
    annualPricePerMonth: 710,
    isPopular: false,
    description: 'Acceso ilimitado a peso libre y cardio. La base perfecta para edificar tu disciplina diaria con la mejor infraestructura.',
    highlights: [
      'Acceso total a área de peso libre y máquinas Eleiko / Hammer',
      'Lockers de uso diario y vestidores con regaderas premium',
      'Valoración biomecánica inicial con coach de piso',
      'App móvil para tracking de rutinas y progreso',
    ],
    ctaText: 'SELECCIONAR PLAN PLATA',
  },
  {
    id: 'gold',
    name: 'Oro Performance',
    tagline: 'El estándar elegido por atletas dedicados',
    monthlyPrice: 1450,
    annualPricePerMonth: 1160,
    isPopular: true,
    badge: 'MÁS POPULAR',
    description: 'Entrenamiento integral con acceso total a clases dirigidas, zona húmeda y seguimiento biométrico continuo.',
    highlights: [
      'Todo lo incluido en el Plan Plata Esencial',
      'Acceso ilimitado a todas las clases grupales (HIIT, Boxeo, Funcional)',
      '1 Escaneo corporal InBody de grado médico al mes',
      'Acceso completo a sauna finlandés y zona húmeda',
      '2 Pases de cortesía mensuales para acompañantes',
    ],
    ctaText: 'SELECCIONAR PLAN ORO',
  },
  {
    id: 'black',
    name: 'Black VIP',
    tagline: 'La cúspide del entrenamiento y recuperación de élite',
    monthlyPrice: 2200,
    annualPricePerMonth: 1760,
    isPopular: false,
    badge: 'EXPERIENCIA DEFINITIVA',
    description: 'Atención personalizada sin concesiones: coaching dedicado, regeneración en Recovery Lounge y máxima exclusividad.',
    highlights: [
      'Todo lo incluido en el Plan Oro Performance',
      'Sesión mensual 1-a-1 con Head Coach y plan nutricional personalizado',
      'Acceso prioritario a Recovery Lounge (NormaTec, crioterapia y pistolas percusivas)',
      'Locker VIP asignado y servicio de toallas premium',
      'Kit de bienvenida Black exclusivo (shaker térmico y playera técnica)',
      'Pases ilimitados para un acompañante los fines de semana',
    ],
    ctaText: 'UNIRSE A BLACK VIP',
  },
];

export const PLAN_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    category: 'Instalaciones & Acceso',
    features: [
      {
        name: 'Acceso ilimitado 7 días a la semana',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Zona de fuerza y racks olímpicos Eleiko IPF',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Sauna finlandés de cedro y zona térmica',
        silver: false,
        gold: true,
        black: true,
      },
      {
        name: 'Recovery Lounge (NormaTec 3 y Hypervolt 2 Pro)',
        silver: false,
        gold: false,
        black: true,
      },
      {
        name: 'Locker asignado permanente',
        silver: false,
        gold: false,
        black: 'Incluido',
      },
    ],
  },
  {
    category: 'Clases & Metodología',
    features: [
      {
        name: 'Clases dirigidas (HIIT, Funcional, Boxeo, Movilidad)',
        silver: false,
        gold: 'Ilimitadas',
        black: 'Ilimitadas con reserva VIP',
      },
      {
        name: 'Evaluación y chequeo biomecánico inicial',
        silver: 'Básica',
        gold: 'Completa',
        black: 'Avanzada 3D',
      },
      {
        name: 'Sesión presencial mensual con Head Coach',
        silver: false,
        gold: false,
        black: '1 sesión/mes',
      },
      {
        name: 'Planificación nutricional y cálculo de macronutrientes',
        silver: false,
        gold: 'Guía general',
        black: 'Revisión quincenal',
      },
    ],
  },
  {
    category: 'Monitoreo & Tecnología',
    features: [
      {
        name: 'Análisis de bioimpedancia InBody médico',
        silver: 'Solo al ingresar',
        gold: '1 al mes',
        black: 'Ilimitados',
      },
      {
        name: 'App móvil Trankilandia para registro de cargas',
        silver: true,
        gold: true,
        black: true,
      },
      {
        name: 'Monitoreo cardíaco en pantallas de estudio',
        silver: false,
        gold: true,
        black: true,
      },
    ],
  },
  {
    category: 'Comodidad & Privilegios VIP',
    features: [
      {
        name: 'Pases de cortesía para invitados',
        silver: false,
        gold: '2 pases/mes',
        black: '4 pases/mes + fin de semana libre',
      },
      {
        name: 'Congelamiento de membresía por viaje/salud',
        silver: '15 días/año',
        gold: '30 días/año',
        black: '60 días/año',
      },
      {
        name: 'Descuento en Trankilandia Bar & Suplementos',
        silver: false,
        gold: '10%',
        black: '20%',
      },
      {
        name: 'Servicio de toallas limpias en cada visita',
        silver: false,
        gold: true,
        black: 'Toallas premium ilimitadas',
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
    id: 'lun-fuerza-0630',
    day: 'Lunes',
    time: '06:30 - 07:30',
    title: 'Iron Power & Sobrecarga',
    category: 'Fuerza',
    coach: 'Carlos Méndez',
    intensity: 'Alta',
    spotsLeft: 4,
  },
  {
    id: 'lun-hiit-0800',
    day: 'Lunes',
    time: '08:00 - 08:50',
    title: 'MetaBurn HIIT 360',
    category: 'HIIT',
    coach: 'Sofía Reyes',
    intensity: 'Extrema',
    spotsLeft: 2,
  },
  {
    id: 'lun-funcional-1830',
    day: 'Lunes',
    time: '18:30 - 19:30',
    title: 'CrossFunctional Athlete',
    category: 'Funcional',
    coach: 'Marco Torres',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'lun-movilidad-2000',
    day: 'Lunes',
    time: '20:00 - 20:50',
    title: 'Mobility Flow & Fascia Release',
    category: 'Movilidad',
    coach: 'Elena Ramos',
    intensity: 'Media',
    spotsLeft: 8,
  },

  // Martes
  {
    id: 'mar-boxeo-0700',
    day: 'Martes',
    time: '07:00 - 08:00',
    title: 'Boxing Conditioning & Rounds',
    category: 'Boxeo',
    coach: 'Javier "Roca" Durán',
    intensity: 'Extrema',
    spotsLeft: 3,
  },
  {
    id: 'mar-fuerza-0930',
    day: 'Martes',
    time: '09:30 - 10:30',
    title: 'Glutes & Posterior Chain Overload',
    category: 'Fuerza',
    coach: 'Sofía Reyes',
    intensity: 'Alta',
    spotsLeft: 4,
  },
  {
    id: 'mar-funcional-1900',
    day: 'Martes',
    time: '19:00 - 20:00',
    title: 'Agility & Kettlebell Dynamics',
    category: 'Funcional',
    coach: 'Marco Torres',
    intensity: 'Alta',
    spotsLeft: 6,
  },

  // Miércoles
  {
    id: 'mie-fuerza-0630',
    day: 'Miércoles',
    time: '06:30 - 07:30',
    title: 'Strength Mechanics & Bench Press',
    category: 'Fuerza',
    coach: 'Carlos Méndez',
    intensity: 'Alta',
    spotsLeft: 3,
  },
  {
    id: 'mie-hiit-0800',
    day: 'Miércoles',
    time: '08:00 - 08:50',
    title: 'Tabata Shred Sprint Challenge',
    category: 'HIIT',
    coach: 'Sofía Reyes',
    intensity: 'Extrema',
    spotsLeft: 1,
  },
  {
    id: 'mie-boxeo-1830',
    day: 'Miércoles',
    time: '18:30 - 19:30',
    title: 'Striking & Tactical Footwork',
    category: 'Boxeo',
    coach: 'Javier "Roca" Durán',
    intensity: 'Extrema',
    spotsLeft: 5,
  },
  {
    id: 'mie-movilidad-2000',
    day: 'Miércoles',
    time: '20:00 - 20:50',
    title: 'Deep Hip & Spine Decompression',
    category: 'Movilidad',
    coach: 'Elena Ramos',
    intensity: 'Media',
    spotsLeft: 10,
  },

  // Jueves
  {
    id: 'jue-funcional-0700',
    day: 'Jueves',
    time: '07:00 - 08:00',
    title: 'Primal Movement & Core Stability',
    category: 'Funcional',
    coach: 'Marco Torres',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'jue-fuerza-0900',
    day: 'Jueves',
    time: '09:00 - 10:00',
    title: 'Upper Body Hypertrophy Focus',
    category: 'Fuerza',
    coach: 'Carlos Méndez',
    intensity: 'Alta',
    spotsLeft: 4,
  },
  {
    id: 'jue-hiit-1900',
    day: 'Jueves',
    time: '19:00 - 19:50',
    title: 'Metabolic Afterburn Assault',
    category: 'HIIT',
    coach: 'Sofía Reyes',
    intensity: 'Extrema',
    spotsLeft: 2,
  },

  // Viernes
  {
    id: 'vie-fuerza-0630',
    day: 'Viernes',
    time: '06:30 - 07:30',
    title: 'Deadlift & Olympic Cleans Clinic',
    category: 'Fuerza',
    coach: 'Carlos Méndez',
    intensity: 'Extrema',
    spotsLeft: 2,
  },
  {
    id: 'vie-boxeo-0830',
    day: 'Viernes',
    time: '08:30 - 09:30',
    title: 'Fight Camp Bags & Mitts',
    category: 'Boxeo',
    coach: 'Javier "Roca" Durán',
    intensity: 'Extrema',
    spotsLeft: 4,
  },
  {
    id: 'vie-movilidad-1800',
    day: 'Viernes',
    time: '18:00 - 19:00',
    title: 'Full Body Reset & Breathwork',
    category: 'Movilidad',
    coach: 'Elena Ramos',
    intensity: 'Media',
    spotsLeft: 12,
  },

  // Sábado
  {
    id: 'sab-funcional-0830',
    day: 'Sábado',
    time: '08:30 - 09:45',
    title: 'Spartan Team Challenge & Sleds',
    category: 'Funcional',
    coach: 'Marco Torres',
    intensity: 'Extrema',
    spotsLeft: 3,
  },
  {
    id: 'sab-boxeo-1015',
    day: 'Sábado',
    time: '10:15 - 11:15',
    title: 'Sparring Fundamentals & Power Combinations',
    category: 'Boxeo',
    coach: 'Javier "Roca" Durán',
    intensity: 'Alta',
    spotsLeft: 5,
  },
  {
    id: 'sab-movilidad-1130',
    day: 'Sábado',
    time: '11:30 - 12:30',
    title: 'Post-Workout Fascia & Joint Release',
    category: 'Movilidad',
    coach: 'Elena Ramos',
    intensity: 'Media',
    spotsLeft: 7,
  },

  // Domingo
  {
    id: 'dom-hiit-0900',
    day: 'Domingo',
    time: '09:00 - 09:50',
    title: 'Sunday Engine Builder',
    category: 'HIIT',
    coach: 'Sofía Reyes',
    intensity: 'Alta',
    spotsLeft: 6,
  },
  {
    id: 'dom-movilidad-1030',
    day: 'Domingo',
    time: '10:30 - 11:30',
    title: 'Restorative Yoga & Deep Mobility',
    category: 'Movilidad',
    coach: 'Elena Ramos',
    intensity: 'Media',
    spotsLeft: 9,
  },
];

export const FACILITY_ZONES: FacilityZone[] = [
  {
    id: 'peso-libre-biomecanica',
    title: 'Zona de Fuerza y Peso Libre',
    badge: 'MÁXIMO RENDIMIENTO',
    description: 'Espacio concebido para desarrollo de fuerza e hipertrofia sin cuellos de botella ni tiempos muertos, equipado con los estándares de la Federación Internacional de Powerlifting.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Mancuernas de uretano mecanizado desde 2.5 kg hasta 60 kg en incrementos exactos',
      '6 Racks de potencia Eleiko IPF con tarimas integradas de absorción acústica',
      'Maquinaria de palanca convergente y divergente Hammer Strength ISO-Lateral',
      'Barras olímpicas Eleiko y Texas Power Bars calibradas con rodamientos de aguja',
    ],
    amenities: [
      'Gisera magnética ecológica sin polvo ambiental',
      'Cinturones lumbares de cuero de alta densidad de libre disposición',
      'Bandas de resistencia calibradas y cadenas de sobrecarga variable',
    ],
  },
  {
    id: 'area-cardio-hiit',
    title: 'Pista Cardiovascular & Acondicionamiento',
    badge: 'ALTA EFICIENCIA',
    description: 'Equipos cardiovasculares biomecánicamente optimizados con pantallas de métricas avanzadas y conectividad directa con monitores cardíacos Garmin, Polar y Apple Watch.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Cintas de correr Matrix Performance Plus con amortiguación dinámica Ultimate Deck',
      'Remadoras y esquiadores Concept2 PM5 de resistencia por aire calibrada',
      'Bicicletas Assault AirBike Pro para sprints anaeróbicos de máxima potencia',
      'Escaladoras StairMaster 10G con selector de cadencia y programas metabólicos',
    ],
    amenities: [
      'Telemetría cardíaca proyectada en pantallas de alta definición',
      'Estaciones de hidratación con agua purificada ozonizada y electrolitos',
      'Puertos de carga inalámbrica rápida en cada consola cardiovascular',
    ],
  },
  {
    id: 'box-funcional-combate',
    title: 'Arena de Boxeo & Entrenamiento Funcional',
    badge: 'AGILIDAD & COMBATE',
    description: 'Pista de tartán de alto agarre, jaula modular para suspensión y ring reglamentario para atletas que combinan potencia de golpeo, velocidad y pliometría.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Carril de tartán de 30 metros para trineos de empuje Rogue Dog Sled y aceleración',
      'Ring de boxeo profesional elevado de 6x6 metros y 8 costales pesados Cleto Reyes',
      'Plataforma modular de calistenia Rogue Monster Lite con anillas olímpicas',
      'Colección completa de kettlebells de competición de 8 kg a 40 kg',
    ],
    amenities: [
      'Guantes y vendas higienizados por luz ultravioleta disponibles para miembros',
      'Temporizadores digitales programables para intervalos Tabata y asaltos de combate',
      'Protectores tibiales, peras de velocidad y cuerdas de salto de velocidad balística',
    ],
  },
  {
    id: 'recovery-spa-bienestar',
    title: 'Recovery Lounge & Spa Térmico',
    badge: 'RECUPERACIÓN TOTAL',
    description: 'La adaptación biológica y el crecimiento muscular suceden durante el reposo. Nuestra suite de recuperación regenera tu sistema nervioso y muscular entre sesiones.',
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
    specs: [
      'Sauna finlandés de madera de cedro aromatizado con piedras volcánicas a 85°C',
      'Tinajas de inmersión en agua helada (Cold Plunge) con control térmico a 8°C',
      'Sistemas de compresión neumática secuencial NormaTec 3 para piernas y brazos',
      'Pistolas de terapia percusiva Hyperice Hypervolt 2 Pro con cabezales térmicos',
    ],
    amenities: [
      'Servicio continuo de toallas templadas infusionadas con eucalipto silvestre',
      'Vestidores de mármol con lockers de apertura táctil digital y regaderas tipo lluvia',
      'Secadoras de pelo iónicas Dyson y dispensadores de amenidades botánicas orgánicas',
    ],
  },
];

export const MEMBERSHIP_FAQS: FaqItem[] = [
  {
    question: '¿Existen contratos forzosos o penalizaciones por cancelación?',
    answer: 'En nuestros planes mensuales puedes cancelar en cualquier momento con 5 días hábiles de anticipación a tu fecha de corte, sin recargos, penalizaciones ni letras pequeñas. Si optas por la modalidad anual, recibes un descuento equivalente a más de 2 meses libres a cambio de tu compromiso deportivo durante 12 meses.',
    category: 'Pagos y Cancelaciones',
  },
  {
    question: '¿Puedo congelar temporalmente mi membresía por viaje o descanso médico?',
    answer: 'Sí. Todos nuestros miembros cuentan con días de congelamiento anuales garantizados (15 días en Plan Plata, 30 días en Plan Oro y 60 días en Black VIP). Puedes activar el congelamiento de forma inmediata desde recepción o enviando un mensaje directo a nuestro concierge por WhatsApp.',
    category: 'Membresías',
  },
  {
    question: '¿Cómo funciona la política de pases de cortesía para invitados?',
    answer: 'Los miembros del Plan Oro reciben 2 pases de cortesía al mes para entrenar con quien deseen en cualquier horario. Los miembros Black VIP cuentan con 4 pases de cortesía mensuales y, adicionalmente, pueden ingresar con un acompañante sin costo durante todos los fines de semana (sábados y domingos completos).',
    category: 'Beneficios de Miembro',
  },
  {
    question: '¿Qué métodos de pago son aceptados y cómo se factura?',
    answer: 'Aceptamos tarjetas de débito y crédito (Visa, Mastercard y American Express), transferencias electrónicas SPEI y pagos en efectivo en mostrador. Ofrecemos domiciliación automática con emisión de CFDI y factura electrónica mensual de deducibilidad inmediata.',
    category: 'Pagos y Facturación',
  },
  {
    question: '¿Es necesario reservar con anticipación para acceder a las clases dirigidas?',
    answer: 'Para garantizar la atención técnica del coach y el espacio óptimo de entrenamiento, los cupos son controlados. Puedes reservar tu lugar con hasta 48 horas de anticipación desde nuestra app o en el módulo de recepción. Los miembros Black VIP cuentan con lista de espera prioritaria.',
    category: 'Clases y Horarios',
  },
  {
    question: '¿El gimnasio cuenta con estacionamiento y casilleros seguros?',
    answer: 'Sí, disponemos de 2.5 horas de estacionamiento subterráneo techado gratuito con circuito cerrado de vigilancia y valet parking para todos los miembros. Además, las instalaciones disponen de casilleros inteligentes con combinación digital personal para uso durante el entrenamiento.',
    category: 'Instalaciones y Servicios',
  },
];
