"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronRight, LogOut, Menu, ShieldCheck, Trophy, X } from "lucide-react";
import { adminNav, participantNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

interface AppShellProps {
  variant: "participant" | "admin";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AppShell({ variant, title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const { mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useUiStore();
  const navItems = variant === "admin" ? adminNav : participantNav;
  const panelLabel = variant === "admin" ? "Operacion del torneo" : "Competencia en curso";
  const panelDescription =
    variant === "admin"
      ? "Gestiona datos, jornadas y resultados con un tablero limpio y rapido."
      : "Consulta partidos, carga pronosticos y sigue la tabla desde cualquier dispositivo.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <aside className="panel sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 rounded-3xl p-6 lg:flex lg:flex-col">
          <div className="mb-8 flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Trophy className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Polla DANE</p>
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{panelLabel}</p>
            </div>
          </div>

          <div className="panel-muted mb-6 rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Vista principal
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{panelDescription}</p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    active
                      ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <ChevronRight className={cn("size-4", active ? "opacity-100 text-primary" : "opacity-0")} />
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-secondary mt-auto w-full"
          >
            <LogOut className="size-4" />
            Cerrar sesion
          </button>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="panel mb-6 rounded-3xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{title}</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{subtitle}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Plataforma clara, responsiva y enfocada en resultados, apuestas y administracion deportiva.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="inline-flex rounded-2xl border border-border bg-card p-3 shadow-sm lg:hidden"
              >
                {mobileMenuOpen ? <X className="size-5 text-foreground" /> : <Menu className="size-5 text-foreground" />}
              </button>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="panel mb-6 rounded-3xl p-4 lg:hidden">
              <div className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{panelDescription}</div>
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                        active
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      <ChevronRight className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn-secondary mt-4 w-full"
              >
                <LogOut className="size-4" />
                Cerrar sesion
              </button>
            </div>
          )}

          <main className="flex-1 pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
