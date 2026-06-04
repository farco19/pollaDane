import { Types } from "mongoose";

export type UserRole = "admin" | "participant";
export type InviteCodeStatus = "available" | "used" | "disabled";
export type MatchStatus = "scheduled" | "live" | "finished";
export type PredictionCutoffMode = "match_start" | "first_match_start";
export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export interface IUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  inviteCodeId?: Types.ObjectId | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInviteCode {
  _id?: Types.ObjectId;
  code: string;
  status: InviteCodeStatus;
  usedByUserId?: Types.ObjectId | null;
  assignedToEmail?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  usedAt?: Date | null;
}

export interface ITeam {
  _id?: Types.ObjectId;
  name: string;
  shortName: string;
  code: string;
  flagUrl?: string | null;
  group?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMatch {
  _id?: Types.ObjectId;
  homeTeamId: Types.ObjectId;
  awayTeamId: Types.ObjectId;
  stage: MatchStage;
  group?: string | null;
  stadium: string;
  matchDate: Date;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  resultLoadedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPrediction {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  matchId: Types.ObjectId;
  predictedHomeScore: number;
  predictedAwayScore: number;
  lockedAt: Date;
  pointsAwarded?: number | null;
  scoredAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITournamentSettings {
  _id?: Types.ObjectId;
  entryFee: number;
  currency: "COP";
  prizeDistribution: {
    firstPlacePercentage: number;
    secondPlacePercentage: number;
    thirdPlacePercentage: number;
  };
  predictionCutoffMode: PredictionCutoffMode;
  matchScoring: {
    exactScorePoints: number;
    winnerPoints: number;
    drawPoints: number;
    lossPoints: number;
  };
  anticipationScoring: {
    groupQualifiedPoints: number;
    bestThirdPoints: number;
    roundOf16Points: number;
    quarterFinalPoints: number;
    semiFinalPoints: number;
    finalPoints: number;
    championPoints: number;
  };
  officialBestThirdTeamIds?: Types.ObjectId[];
  updatedBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnticipationPrediction {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  groupRankings: Array<{
    group: string;
    firstTeamId?: Types.ObjectId | null;
    secondTeamId?: Types.ObjectId | null;
  }>;
  stageSelections: {
    bestThirdTeamIds: Types.ObjectId[];
    roundOf16TeamIds: Types.ObjectId[];
    quarterFinalTeamIds: Types.ObjectId[];
    semiFinalTeamIds: Types.ObjectId[];
    finalTeamIds: Types.ObjectId[];
    championTeamId?: Types.ObjectId | null;
  };
  lockedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuditLog {
  _id?: Types.ObjectId;
  actorUserId?: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
