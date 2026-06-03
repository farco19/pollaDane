/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/utils";

export default function InviteCodesPage() {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(5);
  const [prefix, setPrefix] = useState("PAGO");
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-codes"], queryFn: () => apiFetch<any[]>("/api/admin/invite-codes") });

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/invite-codes", { method: "POST", body: JSON.stringify({ quantity, prefix }) }),
    onSuccess: () => {
      toast.success("Codigos generados correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { ids?: string[]; deleteAll?: boolean }) =>
      apiFetch<{ deletedCount: number }>("/api/admin/invite-codes", {
        method: "DELETE",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result, payload) => {
      toast.success(payload.deleteAll ? `Se eliminaron ${result.deletedCount} codigos` : "Codigo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const codes = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Acceso" title="Codigos de registro" description="Genera codigos para personas que ya pagaron y revisa cuales fueron usados." />
      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="field-input" />
          <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="field-input" />
          <button type="button" onClick={() => mutation.mutate()} className="btn-primary">
            {mutation.isPending ? "Generando..." : "Generar codigos"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (!codes.length || !window.confirm("Se eliminaran todos los codigos creados. Deseas continuar?")) {
                return;
              }
              deleteMutation.mutate({ deleteAll: true });
            }}
            disabled={!codes.length || deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? "Eliminando..." : "Borrar todos los codigos"}
          </button>
        </div>
      </div>
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando codigos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="panel overflow-hidden rounded-3xl">
        <table className="min-w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Codigo</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Estado</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Uso</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((item) => (
              <tr key={item._id} className="border-t border-border">
                <td className="px-5 py-4 font-medium text-foreground">{item.code}</td>
                <td className="px-5 py-4">{item.status}</td>
                <td className="px-5 py-4">{item.usedAt ? new Date(item.usedAt).toLocaleString("es-CO") : "Disponible"}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Se eliminara el codigo ${item.code}. Deseas continuar?`)) {
                        return;
                      }
                      deleteMutation.mutate({ ids: [item._id] });
                    }}
                    disabled={deleteMutation.isPending}
                    className="btn-danger min-h-10 px-3 text-xs"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

