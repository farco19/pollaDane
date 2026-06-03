import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user?.id) {
    throw new Error("No autorizado");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireSessionUser();

  if (user.role !== "admin") {
    throw new Error("Acceso restringido para administradores");
  }

  return user;
}
