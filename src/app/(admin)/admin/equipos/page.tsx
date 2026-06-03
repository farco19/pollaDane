"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { flagCountries } from "@/lib/flagcdn";
import { apiFetch } from "@/lib/utils";

interface TeamListItem {
  _id: string;
  name: string;
  shortName: string;
  countryCode: string;
  group: string | null;
  flagUrl: string | null;
}

function getSuggestedShortName(countryCode: string) {
  return countryCode.toUpperCase();
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ shortName: "", countryCode: "", group: "" });
  const [searchText, setSearchText] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => apiFetch<TeamListItem[]>("/api/admin/teams"),
  });

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/teams", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Equipo creado");
      setForm({ shortName: "", countryCode: "", group: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { ids?: string[]; deleteAll?: boolean }) =>
      apiFetch<{ deletedCount: number }>("/api/admin/teams", {
        method: "DELETE",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result, payload) => {
      toast.success(payload.deleteAll ? `Se eliminaron ${result.deletedCount} equipos` : "Equipo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const teams = data ?? [];
  const selectedCountry = flagCountries.find((country) => country.code === form.countryCode);
  const usedCountryCodes = new Set(teams.map((team) => team.countryCode));
  const availableCountries = flagCountries.filter(
    (country) => !usedCountryCodes.has(country.code) || country.code === form.countryCode,
  );
  const availableGroups = Array.from(new Set(teams.map((team) => team.group?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredTeams = teams.filter((team) => {
    const matchesText =
      normalizedSearchText === "" ||
      team.name.toLowerCase().includes(normalizedSearchText) ||
      team.shortName.toLowerCase().includes(normalizedSearchText) ||
      team.countryCode.toLowerCase().includes(normalizedSearchText);
    const matchesGroup = groupFilter === "all" || (team.group ?? "") === groupFilter;

    return matchesText && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catalogo" title="Equipos" description="Crea equipos a partir del pais, evita duplicados y asigna la bandera automaticamente para usarlos en el torneo." />
      <div className="panel rounded-3xl p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            placeholder="Sigla"
            value={form.shortName}
            onChange={(e) => setForm((current) => ({ ...current, shortName: e.target.value.toUpperCase() }))}
            className="field-input"
          />
          <select
            value={form.countryCode}
            onChange={(e) =>
              setForm((current) => {
                const nextCountryCode = e.target.value;
                const previousSuggested = current.countryCode ? getSuggestedShortName(current.countryCode) : "";
                const nextSuggested = nextCountryCode ? getSuggestedShortName(nextCountryCode) : "";
                const shouldReplaceShortName =
                  current.shortName.trim() === "" || current.shortName === previousSuggested;

                return {
                  ...current,
                  countryCode: nextCountryCode,
                  shortName: shouldReplaceShortName ? nextSuggested : current.shortName,
                };
              })
            }
            className="field-select"
          >
            <option value="">Pais y bandera</option>
            {availableCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Grupo"
            value={form.group}
            onChange={(e) => setForm((current) => ({ ...current, group: e.target.value }))}
            className="field-input"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          La sigla se sugiere automaticamente segun el pais seleccionado, pero puedes editarla si lo necesitas.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="panel-muted flex min-h-12 min-w-64 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
            {selectedCountry ? (
              <>
                <Image src={selectedCountry.flagUrl} alt={selectedCountry.name} width={24} height={18} className="h-[18px] w-6 object-contain" />
                <span>{selectedCountry.name}</span>
              </>
            ) : (
              <span>Selecciona un pais para asignar la bandera automaticamente</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            className="btn-primary"
            disabled={mutation.isPending || !form.countryCode || !form.shortName.trim()}
          >
            {mutation.isPending ? "Guardando..." : "Crear equipo"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!teams.length || !window.confirm("Se eliminaran todos los equipos. Deseas continuar?")) {
                return;
              }
              deleteMutation.mutate({ deleteAll: true });
            }}
            disabled={!teams.length || deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? "Eliminando..." : "Borrar todos los equipos"}
          </button>
        </div>
      </div>
      {isLoading ? <div className="state-panel rounded-3xl p-6 text-muted-foreground">Cargando equipos...</div> : null}
      {error ? <div className="error-panel rounded-3xl p-6">{(error as Error).message}</div> : null}
      <div className="panel rounded-3xl p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            placeholder="Buscar por pais, sigla o codigo"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="field-input"
          />
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="field-select">
            <option value="all">Todos los grupos</option>
            <option value="">Sin grupo</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                Grupo {group}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Mostrando {filteredTeams.length} de {teams.length} equipos.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeams.map((team) => (
          <div key={team._id} className="panel rounded-3xl p-5 text-sm text-muted-foreground">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {team.flagUrl ? (
                  <Image
                    src={team.flagUrl}
                    alt={team.name}
                    width={32}
                    height={24}
                    className="h-6 w-8 object-contain"
                  />
                ) : null}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{team.name}</h2>
                  <p className="mt-1 font-medium text-foreground">{team.shortName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Se eliminara el equipo ${team.name}. Deseas continuar?`)) {
                    return;
                  }
                  deleteMutation.mutate({ ids: [team._id] });
                }}
                disabled={deleteMutation.isPending}
                className="btn-danger min-h-10 px-3 text-xs"
              >
                Borrar
              </button>
            </div>
            <p className="mt-4">Grupo {team.group ?? "Sin grupo"}</p>
            <p className="mt-1 uppercase tracking-[0.12em]">{team.countryCode}</p>
          </div>
        ))}
      </div>
      {!isLoading && !error && filteredTeams.length === 0 ? (
        <div className="state-panel rounded-3xl p-6 text-muted-foreground">No hay equipos que coincidan con los filtros.</div>
      ) : null}
    </div>
  );
}
