import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { HomePromoModal } from "@/components/marketing/home-promo-modal";
import { getPublicSettings } from "@/lib/server/data";
import { formatCurrency } from "@/lib/utils";

const highlights = [
  { icon: ShieldCheck, title: "Acceso controlado", description: "Solo entra quien ya pago y recibio su codigo de registro." },
  { icon: Target, title: "Pronosticos bloqueados", description: "Cada marcador queda sellado apenas guardas o se cierra el partido." },
  { icon: Trophy, title: "Puntaje automatico", description: "La tabla se recalcula con exactos, ganadores, empates y anticipados." },
  { icon: Users, title: "Ranking en vivo", description: "Todos siguen posiciones, premio y rendimiento del torneo." },
];

const steps = [
  {
    icon: ClipboardCheck,
    title: "1. Registrate con tu codigo",
    description: "Ingresa con el codigo del torneo, crea tu cuenta y asegura tu cupo en la competencia.",
  },
  {
    icon: Target,
    title: "2. Carga tus pronosticos",
    description: "Elige marcador por partido y completa tus anticipados antes del cierre de cada fase.",
  },
  {
    icon: CheckCircle2,
    title: "3. Espera el resultado oficial",
    description: "Cuando termina el juego, el sistema compara tu marcador con el resultado real.",
  },
  {
    icon: Medal,
    title: "4. Sube en la tabla",
    description: "Tus aciertos suman puntos y tu posicion cambia automaticamente en el ranking general.",
  },
];

export default async function HomePage() {
  const settings = await getPublicSettings();

  const metrics = [
    { value: String(settings.participants), label: "Participantes actuales compitiendo por el premio" },
    { value: formatCurrency(settings.prizePool, settings.currency), label: "Premio acumulado segun inscritos" },
    { value: formatCurrency(settings.entryFee, settings.currency), label: "Aporte individual para entrar al torneo" },
  ];

  const scoringCards = [
    {
      icon: Trophy,
      title: "Marcador exacto",
      points: settings.matchScoring.exactScorePoints + settings.matchScoring.winnerPoints,
      description: "Acertar el marcador completo te da el bono de exactitud mas los puntos por ganador.",
    },
    {
      icon: Target,
      title: "Ganador correcto",
      points: settings.matchScoring.winnerPoints,
      description: "Si no pegas el marcador pero si el ganador del partido, igual sumas puntos.",
    },
    {
      icon: CheckCircle2,
      title: "Empate correcto",
      points: settings.matchScoring.drawPoints,
      description: "Cuando pronosticas empate y el partido termina empate, el sistema te premia.",
    },
    {
      icon: Sparkles,
      title: "Campeon acertado",
      points: settings.anticipationScoring.championPoints,
      description: "Los anticipados tambien valen y pueden darte un salto fuerte en la tabla final.",
    },
  ];

  const examples = [
    {
      title: "Ejemplo 1",
      result: "Pronosticas Colombia 2 - 1 Brasil y termina 2 - 1.",
      outcome: `Ganas ${settings.matchScoring.exactScorePoints + settings.matchScoring.winnerPoints} puntos por exacto.`,
    },
    {
      title: "Ejemplo 2",
      result: "Pronosticas Argentina 1 - 0 Uruguay y termina 3 - 1.",
      outcome: `Ganas ${settings.matchScoring.winnerPoints} puntos por acertar el ganador.`,
    },
    {
      title: "Ejemplo 3",
      result: "Dejas a tu campeon correcto antes de iniciar el torneo.",
      outcome: `Ganas ${settings.anticipationScoring.championPoints} puntos cuando se confirma el titulo.`,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <HomePromoModal />

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Tu torneo privado de pronosticos
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
              Pronostica, suma puntos y compite por el primer lugar desde el primer partido
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:text-lg">
              Polla DANE te muestra como funciona la competencia, cuanto vale cada acierto y que necesitas
              para escalar en la tabla. Todo en una experiencia clara para participantes y administradores.
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Asi se gana</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Resumen rapido del sistema</h2>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/8 p-3 text-primary">
              <BarChart3 className="size-5" />
            </div>
          </div>

          <div className="grid gap-4 py-5">
            <div className="panel-muted rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarClock className="size-4 text-primary" />
                Cada fecha cuenta
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
                <p className="text-sm font-medium text-foreground">Puntos por exacto</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {settings.matchScoring.exactScorePoints + settings.matchScoring.winnerPoints}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Es la mejor forma de sumar en un solo partido.</p>
              </div>
              <div className="panel-muted rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">Premio acumulado</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {formatCurrency(settings.prizePool, settings.currency)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Actualizado automaticamente con el numero de inscritos.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {scoringCards.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="size-4 text-primary" />
                        {item.title}
                      </div>
                      <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-sm font-semibold text-primary">
                        +{item.points}
                      </span>
                    </div>
                  </div>
                );
              })}
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

      <section className="mt-10 grid gap-4 lg:grid-cols-4">
        {steps.map((item) => {
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Como se suman los puntos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">Tus aciertos valen distinto segun el tipo de pronostico</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            No todo depende del marcador exacto. Tambien sumas por acertar ganadores, empates y pronosticos
            anticipados de rondas finales y campeon.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {scoringCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="panel rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Icon className="size-5 text-primary" />
                    {item.title}
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-sm font-semibold text-primary">
                    +{item.points}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel rounded-3xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ejemplos rapidos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">Entiende el puntaje en segundos</h2>
          <div className="mt-6 space-y-4">
            {examples.map((example) => (
              <div key={example.title} className="panel-muted rounded-2xl p-4">
                <p className="text-sm font-semibold text-foreground">{example.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{example.result}</p>
                <p className="mt-3 font-medium text-primary">{example.outcome}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel rounded-2xl p-5">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <CircleDollarSign className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Premio transparente</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ves cuanto dinero se esta jugando y como cambia el acumulado a medida que entran mas participantes.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <Users className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Dashboard pensado para competir</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Al entrar encuentras tus puntos, tu posicion, la tabla general y los siguientes partidos listos para pronosticar.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Explicaciones claras</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              La plataforma no solo muestra datos: tambien te explica como funciona la competencia para que tomes mejores decisiones.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
