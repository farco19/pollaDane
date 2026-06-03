"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CalendarClock, ShieldCheck, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { loginSchema } from "@/lib/validators/auth";

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Credenciales invalidas o usuario inactivo");
      return;
    }

    toast.success("Sesion iniciada correctamente");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_0.75fr]">
        <section className="panel hidden rounded-3xl p-8 lg:block">
          <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Acceso a la plataforma
          </p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-[-0.05em] text-foreground">
            Pronostica y administra desde una interfaz deportiva mas profesional
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            Inicia sesion para cargar tus jugadas, revisar resultados oficiales o gestionar el torneo completo.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="panel-muted rounded-2xl p-5">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Acceso por rol</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Participantes y administradores en flujos separados.</p>
            </div>
            <div className="panel-muted rounded-2xl p-5">
              <CalendarClock className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Partidos al instante</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta cierres, resultados y estados sin recargar.</p>
            </div>
            <div className="panel-muted rounded-2xl p-5">
              <Trophy className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Tabla actualizada</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">El ranking refleja puntos y premio acumulado.</p>
            </div>
          </div>
        </section>

        <section className="panel mx-auto w-full max-w-xl rounded-3xl p-6 sm:p-8">
          <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Bienvenido
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">Iniciar sesion</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Accede con tu correo y contrasena para cargar pronosticos o administrar el torneo.
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <label className="field-label">Correo</label>
              <input type="email" {...form.register("email")} className="field-input" />
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.email?.message}</p>
            </div>
            <div>
              <label className="field-label">Contrasena</label>
              <input type="password" {...form.register("password")} className="field-input" />
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.password?.message}</p>
            </div>
            <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full">
              {form.formState.isSubmitting ? "Ingresando..." : "Entrar"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="panel-muted mt-6 rounded-2xl p-4 text-sm text-muted-foreground">
            <p>Admin demo: admin@pollamundial.com / Admin1234</p>
            <p className="mt-2">
              Si ya pagaste y tienes codigo,{" "}
              <Link href="/registro" className="font-medium text-primary">
                registrate aqui
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
