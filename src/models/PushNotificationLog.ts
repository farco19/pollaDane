import { model, models, Schema, type Model } from "mongoose";

export interface IPushNotificationLog {
  _id?: string;
  userId: Schema.Types.ObjectId | string;
  type: string;
  eventKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PushNotificationLogSchema = new Schema<IPushNotificationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true },
    eventKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

PushNotificationLogSchema.index({ userId: 1, eventKey: 1 }, { unique: true });

export const PushNotificationLog: Model<IPushNotificationLog> =
  models.PushNotificationLog || model<IPushNotificationLog>("PushNotificationLog", PushNotificationLogSchema);
