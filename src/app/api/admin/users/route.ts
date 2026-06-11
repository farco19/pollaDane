import { bootstrapDataLayer } from "@/lib/server/data";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { AnticipationPrediction } from "@/models/AnticipationPrediction";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requireAdminUser();
    await bootstrapDataLayer();
    const [users, matches, predictions, anticipationPredictions] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).lean(),
      Match.find({}).select({ _id: 1 }).lean(),
      Prediction.find({}).select({ userId: 1, matchId: 1 }).lean(),
      AnticipationPrediction.find({}).select({ userId: 1 }).lean(),
    ]);
    const totalMatches = matches.length;
    const predictionCountByUser = predictions.reduce<Map<string, number>>((map, prediction) => {
      const userId = String(prediction.userId);
      map.set(userId, (map.get(userId) ?? 0) + 1);
      return map;
    }, new Map());
    const anticipationUsers = new Set(anticipationPredictions.map((prediction) => String(prediction.userId)));

    return ok(users.map((user) => {
      const userId = String(user._id);
      const predictionCount = predictionCountByUser.get(userId) ?? 0;
      const isParticipant = user.role === "participant";

      return {
        _id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        predictionProgress: isParticipant
          ? {
              saved: predictionCount,
              total: totalMatches,
              completed: totalMatches > 0 && predictionCount === totalMatches,
            }
          : null,
        hasAnticipationPrediction: isParticipant ? anticipationUsers.has(userId) : false,
      };
    }));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible cargar usuarios", 403);
  }
}
