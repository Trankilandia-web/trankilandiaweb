export type UserRole = 'admin' | 'caja' | 'entrenador' | 'cliente';

export interface RoleConfig {
  id: UserRole;
  name: string;
  badge: string;
  path: string;
  description: string;
  iconName: string;
  themeColor: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    accentBg: string;
    glow: string;
  };
}

export const ROLES_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    badge: 'GERENCIA & CONTROL TOTAL',
    path: '/admin',
    description: 'Gestión integral del gimnasio, métricas de ingresos, aforo, auditoría y control de usuarios.',
    iconName: 'ShieldCheck',
    themeColor: {
      badgeBg: 'bg-purple-500/15',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/30',
      accentBg: 'bg-purple-500',
      glow: 'shadow-purple-500/20',
    },
  },
  caja: {
    id: 'caja',
    name: 'Caja y Recepción',
    badge: 'TERMINAL DE VENTAS & COBROS',
    path: '/caja',
    description: 'Punto de cobro rápido de membresías en Soles (S/.), arqueo de caja y emisión de comprobantes.',
    iconName: 'Receipt',
    themeColor: {
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      accentBg: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20',
    },
  },
  entrenador: {
    id: 'entrenador',
    name: 'Entrenador (Coach)',
    badge: 'STAFF DEPORTIVO & BOXEO',
    path: '/entrenador',
    description: 'Control de clases de hoy, lista de asistencia en sala y seguimiento de marcas de atletas.',
    iconName: 'Activity',
    themeColor: {
      badgeBg: 'bg-orange-500/15',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      accentBg: 'bg-orange-500',
      glow: 'shadow-orange-500/20',
    },
  },
  cliente: {
    id: 'cliente',
    name: 'Cliente / Socio',
    badge: 'SOCIO TRANKILANDIA CLUB',
    path: '/cliente',
    description: 'Credencial digital QR, días activos de membresía, reserva de clases y plan de entrenamiento.',
    iconName: 'User',
    themeColor: {
      badgeBg: 'bg-amber-400/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-400/30',
      accentBg: 'bg-amber-400',
      glow: 'shadow-amber-400/20',
    },
  },
};

export const getRoleRedirectPath = (role: UserRole): string => {
  return ROLES_CONFIG[role]?.path || '/cliente';
};
