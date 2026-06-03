import { model, models, Schema, type Model } from "mongoose";
import type { IPrediction } from "@/types/domain";

const PredictionSchema = new Schema<IPrediction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    predictedHomeScore: { type: Number, required: true, min: 0 },
    predictedAwayScore: { type: Number, required: true, min: 0 },
    lockedAt: { type: Date, required: true, default: () => new Date() },
    pointsAwarded: { type: Number, default: null, min: 0 },
    scoredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PredictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });
PredictionSchema.index({ userId: 1 });
PredictionSchema.index({ matchId: 1 });

export const Prediction: Model<IPrediction> = models.Prediction || model<IPrediction>("Prediction", PredictionSchema);
