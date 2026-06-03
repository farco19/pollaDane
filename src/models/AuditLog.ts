import { model, models, Schema, type Model } from "mongoose";
import type { IAuditLog } from "@/types/domain";

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    entityType: { type: String, required: true, trim: true, maxlength: 80 },
    entityId: { type: String, trim: true, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entityType: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
