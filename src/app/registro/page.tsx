"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BadgeCheck, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { registerSchema } from "@/lib/validators/auth";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      inviteCode: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      toast.error(payload.error ?? "No fue posible completar el registro");
      return;
    }

    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    toast.success("Registro completado. Ya puedes cargar tus pronosticos.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel hidden rounded-3xl p-8 lg:block">
          <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Registro validado
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-foreground">
            Crea tu cuenta y entra listo para jugar
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            El acceso se mantiene limpio y controlado: primero se valida el codigo, luego se activa tu cuenta en la
            plataforma.
          </p>

          <div className="mt-8 grid gap-4">
            <div className="panel-muted rounded-2xl p-5">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Codigo obligatorio</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Solo se registran personas con acceso autorizado.</p>
            </div>
            <div className="panel-muted rounded-2xl p-5">
              <BadgeCheck className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Activacion inmediata</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Al terminar el proceso quedas listo para pronosticar.</p>
            </div>
            <div className="panel-muted rounded-2xl p-5">
              <UserRoundPlus className="size-5 text-primary" />
              <p className="mt-4 text-sm font-medium text-foreground">Perfil claro y simple</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Datos minimos, menos friccion y mejor experiencia en movil.</p>
            </div>
          </div>
        </section>

        <section className="panel rounded-3xl p-6 sm:p-8">
          <p className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Registro con codigo
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">Crear cuenta</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Solo puedes registrarte si ya recibiste un codigo de acceso despues de realizar tu aporte.
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">Codigo de acceso</label>
              <input {...form.register("inviteCode")} className="field-input" />
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.inviteCode?.message}</p>
            </div>
            <div>
              <label className="field-label">Nombre completo</label>
              <input {...form.register("name")} className="field-input" />
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name?.message}</p>
            </div>
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
            <div>
              <label className="field-label">Confirmar contrasena</label>
              <input type="password" {...form.register("confirmPassword")} className="field-input" />
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.confirmPassword?.message}</p>
            </div>
            <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary px-5">
                {form.formState.isSubmitting ? "Registrando..." : "Completar registro"}
                <ArrowRight className="size-4" />
              </button>
              <p className="text-sm text-muted-foreground">
                Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-primary">
                  Ingresa aqui
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
