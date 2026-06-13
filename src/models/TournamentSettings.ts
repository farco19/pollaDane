import { model, models, Schema, type Model } from "mongoose";
import type { ITournamentSettings } from "@/types/domain";
import { defaultAnticipationScoring, defaultMatchScoring } from "@/lib/server/scoring/rules";
import { defaultPrizeDistribution } from "@/lib/server/prize";

const TournamentSettingsSchema = new Schema<ITournamentSettings>(
  {
    entryFee: { type: Number, required: true, min: 1000 },
    currency: { type: String, enum: ["COP"], default: "COP", required: true },
    prizeDistribution: {
      firstPlacePercentage: { type: Number, required: true, min: 0, max: 100, default: defaultPrizeDistribution.firstPlacePercentage },
      secondPlacePercentage: { type: Number, required: true, min: 0, max: 100, default: defaultPrizeDistribution.secondPlacePercentage },
      thirdPlacePercentage: { type: Number, required: true, min: 0, max: 100, default: defaultPrizeDistribution.thirdPlacePercentage },
    },
    predictionCutoffMode: { type: String, enum: ["match_start", "first_match_start"], default: "match_start", required: true },
    matchScoring: {
      exactScorePoints: { type: Number, required: true, min: 0, default: defaultMatchScoring.exactScorePoints },
      winnerPoints: { type: Number, required: true, min: 0, default: defaultMatchScoring.winnerPoints },
      drawPoints: { type: Number, required: true, min: 0, default: defaultMatchScoring.drawPoints },
      lossPoints: { type: Number, required: true, min: 0, default: defaultMatchScoring.lossPoints },
    },
    anticipationScoring: {
      groupQualifiedPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.groupQualifiedPoints },
      bestThirdPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.bestThirdPoints },
      roundOf16Points: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.roundOf16Points },
      quarterFinalPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.quarterFinalPoints },
      semiFinalPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.semiFinalPoints },
      finalPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.finalPoints },
      championPoints: { type: Number, required: true, min: 0, default: defaultAnticipationScoring.championPoints },
    },
    anticipationAvailabilityMode: { type: String, enum: ["scheduled", "manual_open", "manual_locked"], default: "scheduled", required: true },
    officialBestThirdTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    liveSync: {
      lastAttemptAt: { type: Date, default: null },
      lastSuccessAt: { type: Date, default: null },
      lastError: { type: String, default: null, maxlength: 500 },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const TournamentSettings: Model<ITournamentSettings> =
  models.TournamentSettings || model<ITournamentSettings>("TournamentSettings", TournamentSettingsSchema);
