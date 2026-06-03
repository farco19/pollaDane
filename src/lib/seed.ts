import argon2 from "argon2";
import { defaultAnticipationScoring, defaultMatchScoring } from "@/lib/server/scoring/rules";
import { TournamentSettings } from "@/models/TournamentSettings";
import { User } from "@/models/User";

declare global {
  var __seedReady: boolean | undefined;
}

export async function ensureSeedData() {
  if (global.__seedReady) {
    return;
  }

  const adminExists = await User.exists({ email: "admin@pollamundial.com" });
  if (!adminExists) {
    const passwordHash = await argon2.hash("Admin1234");
    await User.create({
      name: "Administrador",
      email: "admin@pollamundial.com",
      passwordHash,
      role: "admin",
      isActive: true,
    });
  }

  const settingsCount = await TournamentSettings.countDocuments();
  if (!settingsCount) {
    await TournamentSettings.create({
      entryFee: 20000,
      currency: "COP",
      predictionCutoffMode: "match_start",
      matchScoring: defaultMatchScoring,
      anticipationScoring: defaultAnticipationScoring,
    });
  }

  global.__seedReady = true;
}
