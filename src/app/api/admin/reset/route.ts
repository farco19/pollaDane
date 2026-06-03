import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/server/api";
import { requireAdminUser } from "@/lib/server/session";
import { AnticipationPrediction } from "@/models/AnticipationPrediction";
import { InviteCode } from "@/models/InviteCode";
import { Match } from "@/models/Match";
import { Prediction } from "@/models/Prediction";
import { Team } from "@/models/Team";

export async function POST() {
  try {
    const user = await requireAdminUser();
    await connectToDatabase();

    // Remove tournament data while preserving registered users and app settings.
    const [predictions, anticipationPredictions, matches, teams, inviteCodes] = await Promise.all([
      Prediction.deleteMany({}),
      AnticipationPrediction.deleteMany({}),
      Match.deleteMany({}),
      Team.deleteMany({}),
      InviteCode.deleteMany({}),
    ]);

    return ok(
      {
        actorUserId: user.id,
        deleted: {
          predictions: predictions.deletedCount ?? 0,
          anticipationPredictions: anticipationPredictions.deletedCount ?? 0,
          matches: matches.deletedCount ?? 0,
          teams: teams.deletedCount ?? 0,
          inviteCodes: inviteCodes.deletedCount ?? 0,
        },
      },
      "Base del torneo reiniciada sin eliminar usuarios",
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No fue posible reiniciar la base del torneo", 500);
  }
}
