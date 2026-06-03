import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from "lucide-react";

const highlights = [
  { icon: ShieldCheck, title: "Acceso controlado", description: "Solo entra quien ya pago y recibio su codigo de registro." },
  { icon: Target, title: "Pronosticos bloqueados", description: "Cada marcador queda sellado para proteger la competencia." },
  { icon: Trophy, title: "Puntaje automatico", description: "La tabla se recalcula con exactos, ganadores y empates." },
  { icon: Users, title: "Ranking en vivo", description: "Todos siguen posiciones, premio y rendimiento del torneo." },
];

const metrics = [
  { value: "100%", label: "Responsive en movil, tablet y desktop" },
  { value: "1", label: "Panel unificado para participantes y admin" },
  { value: "24/7", label: "Consulta de resultados y clasificacion" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Plataforma profesional de apuestas y resultados
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
              Una experiencia deportiva mas seria, clara y lista para competir
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:text-lg">
              Pronostica partidos, sigue resultados oficiales, revisa tu posicion y administra el torneo
              desde una interfaz minimalista, profesional y totalmente responsiva.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/registro" className="btn-primary px-5">
              Registrarme
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-5">
              Ya tengo cuenta
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.label} className="panel rounded-2xl px-5 py-4">
                <div className="text-2xl font-semibold tracking-[-0.05em] text-foreground">{item.value}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Vista de competencia</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Centro de control del torneo</h2>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-3 text-primary">
              <BarChart3 className="size-5" />
            </div>
          </div>

          <div className="grid gap-4 py-5">
            <div className="panel-muted rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarClock className="size-4 text-primary" />
                Jornada activa
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-2xl border border-border bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Local</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Argentina</p>
                  <p className="text-sm text-muted-foreground">ARG</p>
                </div>
                <div className="text-center text-lg font-semibold tracking-[0.28em] text-primary">VS</div>
                <div className="rounded-2xl border border-border bg-card px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visitante</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">Brasil</p>
                  <p className="text-sm text-muted-foreground">BRA</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">Proximo cierre</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">18:30</p>
                <p className="mt-2 text-sm text-muted-foreground">Los pronosticos se bloquean al iniciar el partido.</p>
              </div>
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">Premio acumulado</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">$1.240.000</p>
                <p className="mt-2 text-sm text-muted-foreground">Actualizado automaticamente con el numero de inscritos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="panel rounded-2xl p-5">
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
                <Icon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel rounded-3xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Para participantes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">Todo lo importante en pocos toques</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            La interfaz prioriza el marcador, el cierre del partido y la tabla. Menos ruido visual, mas foco en
            pronosticar y revisar resultados.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-foreground">Pronostica rapido</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Inputs amplios, estados claros y acciones visibles desde cualquier pantalla.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-foreground">Lee mejor los resultados</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Jerarquia tipografica limpia para ver tabla, puntos y partidos sin distracciones.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-foreground">Administra sin friccion</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Equipos, partidos, codigos y configuracion viven en un mismo sistema visual.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-foreground">Escala con orden</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Componentes y tokens listos para seguir creciendo con Tailwind y la base de shadcn.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
