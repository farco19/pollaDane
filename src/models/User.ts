import { model, models, Schema, type Model } from "mongoose";
import type { IUser } from "@/types/domain";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "participant"], default: "participant", required: true },
    inviteCodeId: { type: Schema.Types.ObjectId, ref: "InviteCode", default: null },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);
