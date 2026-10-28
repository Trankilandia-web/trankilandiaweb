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
