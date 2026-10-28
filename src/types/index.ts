export interface NavItem {
  label: string;
  href: string;
}

export type IconName = 
  | 'Dumbbell'
  | 'Award'
  | 'ClipboardList'
  | 'Users'
  | 'Flame'
  | 'Activity'
  | 'Zap'
  | 'HeartPulse'
  | 'MapPin'
  | 'Phone'
  | 'Mail'
  | 'Clock';

export interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
}

export interface Program {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  iconName: IconName;
  tag: string;
}

export interface StatMetric {
  value: string;
  label: string;
}

export interface AboutData {
  badge: string;
  title: string;
  paragraphs: string[];
  imageUrl: string;
  stats: StatMetric[];
  ctaText: string;
  ctaHref: string;
}

export interface GymContactInfo {
  address: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: {
    weekday: string;
    sunday: string;
  };
  socialLinks: {
    platform: string;
    href: string;
  }[];
}

export type BillingPeriod = 'mes' | 'trimestral' | 'semestral' | 'anual';

export interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  semiannualPrice: number;
  annualPrice: number;
  isPopular: boolean;
  badge?: string;
  description: string;
  highlights: string[];
  ctaText: string;
  includesFreeEntry: boolean;
  includesBoxing?: boolean;
}

export interface ComparisonFeature {
  name: string;
  silver: boolean | string;
  gold: boolean | string;
  black: boolean | string;
}

export interface ComparisonCategory {
  category: string;
  features: ComparisonFeature[];
}

export interface ScheduleClass {
  id: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  time: string;
  title: string;
  category: 'Fuerza' | 'HIIT' | 'Funcional' | 'Boxeo' | 'Movilidad';
  coach: string;
  intensity: 'Media' | 'Alta' | 'Extrema';
  spotsLeft: number;
}

export interface FacilityZone {
  id: string;
  title: string;
  badge: string;
  description: string;
  imageUrl: string;
  specs: string[];
  amenities: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}
