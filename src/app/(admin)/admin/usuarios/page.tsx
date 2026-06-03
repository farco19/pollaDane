/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

export default function UsersPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => apiFetch<any[]>("/api/admin/users") });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Participantes" title="Usuarios registrados" description="Revisa todas las cuentas creadas, su rol, correo y estado general dentro de la aplicacion." />
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando usuarios...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="panel overflow-hidden rounded-3xl">
        <table className="min-w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Nombre</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Correo</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Rol</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Activo</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((user) => (
              <tr key={user._id} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-foreground">{user.name}</td>
                <td className="px-5 py-4">{user.email}</td>
                <td className="px-5 py-4">{user.role}</td>
                <td className="px-5 py-4">{user.isActive ? "Si" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

