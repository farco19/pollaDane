import { model, models, Schema, type Model } from "mongoose";
import type { IAnticipationPrediction } from "@/types/domain";

const AnticipationPredictionSchema = new Schema<IAnticipationPrediction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    groupRankings: [
      {
        group: { type: String, required: true, trim: true, maxlength: 10 },
        firstTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
        secondTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      },
    ],
    stageSelections: {
      bestThirdTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      roundOf16TeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      quarterFinalTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      semiFinalTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      finalTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      championTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AnticipationPredictionSchema.index({ userId: 1 }, { unique: true });

export const AnticipationPrediction: Model<IAnticipationPrediction> =
  models.AnticipationPrediction || model<IAnticipationPrediction>("AnticipationPrediction", AnticipationPredictionSchema);
