import { model, models, Schema, type Model } from "mongoose";
import type { ITeam } from "@/types/domain";

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    shortName: { type: String, required: true, trim: true, maxlength: 20 },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 10 },
    flagUrl: { type: String, trim: true, default: null },
    group: { type: String, trim: true, default: null, maxlength: 10 },
  },
  { timestamps: true },
);

TeamSchema.index({ code: 1 }, { unique: true });

export const Team: Model<ITeam> = models.Team || model<ITeam>("Team", TeamSchema);
