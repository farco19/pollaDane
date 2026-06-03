import { model, models, Schema, type Model } from "mongoose";
import type { IInviteCode } from "@/types/domain";

const InviteCodeSchema = new Schema<IInviteCode>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    status: { type: String, enum: ["available", "used", "disabled"], default: "available", required: true },
    usedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedToEmail: { type: String, trim: true, lowercase: true, default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

InviteCodeSchema.index({ code: 1 }, { unique: true });
InviteCodeSchema.index({ status: 1 });

export const InviteCode: Model<IInviteCode> = models.InviteCode || model<IInviteCode>("InviteCode", InviteCodeSchema);
