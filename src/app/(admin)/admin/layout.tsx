import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell
      variant="admin"
      title="Panel administrativo"
      subtitle="Control total de codigos, equipos, partidos, resultados y configuracion"
    >
      {children}
    </AppShell>
  );
}
