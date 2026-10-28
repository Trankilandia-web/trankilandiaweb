import type {
  NavItem,
  FeatureHighlight,
  Program,
  AboutData,
  GymContactInfo,
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
