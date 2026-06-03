import { AppShell } from "@/components/layout/app-shell";

export default function ParticipantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell
      variant="participant"
      title="Panel del participante"
      subtitle="Carga tus pronosticos, sigue resultados y compite por el premio"
    >
      {children}
    </AppShell>
  );
}
