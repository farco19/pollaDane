import type { LucideIcon } from "lucide-react";
import { CalendarDays, LayoutDashboard, ListOrdered, Settings, ShieldCheck, Target, Trophy, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const participantNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partidos", label: "Partidos", icon: CalendarDays },
  { href: "/anticipados", label: "Anticipados", icon: ShieldCheck },
  { href: "/clasificacion", label: "Clasificacion", icon: Trophy },
  { href: "/mis-pronosticos", label: "Pronosticos", icon: Target },
  { href: "/tabla", label: "Tabla", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: Users },
];

export const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/codigos", label: "Codigos", icon: ShieldCheck },
  { href: "/admin/equipos", label: "Equipos", icon: Users },
  { href: "/admin/partidos", label: "Partidos", icon: CalendarDays },
  { href: "/admin/resultados", label: "Resultados", icon: Trophy },
  { href: "/admin/clasificacion-oficial", label: "Clasificacion", icon: Target },
  { href: "/admin/configuracion", label: "Configuracion", icon: Settings },
  { href: "/admin/usuarios", label: "Usuarios", icon: ListOrdered },
];
