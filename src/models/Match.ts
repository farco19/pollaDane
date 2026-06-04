import { model, models, Schema, type Model } from "mongoose";
import type { IMatch } from "@/types/domain";
import "@/models/Team";

const MatchSchema = new Schema<IMatch>(
  {
    homeTeamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    awayTeamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    stage: { type: String, enum: ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"], required: true },
    group: { type: String, trim: true, default: null, maxlength: 10 },
    stadium: { type: String, required: true, trim: true, maxlength: 120 },
    matchDate: { type: Date, required: true },
    status: { type: String, enum: ["scheduled", "live", "finished"], default: "scheduled", required: true },
    homeScore: { type: Number, default: null, min: 0 },
    awayScore: { type: Number, default: null, min: 0 },
    resultLoadedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MatchSchema.index({ matchDate: 1 });

export const Match: Model<IMatch> = models.Match || model<IMatch>("Match", MatchSchema);
