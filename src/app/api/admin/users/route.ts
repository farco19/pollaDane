import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    return ok(users.map((user) => ({
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    })));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar usuarios", 403);
  }
}
