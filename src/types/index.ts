export type AccountStatus =
  | "incomplete_onboarding"
  | "active"
  | "suspended";

export type StickerStatus = "needs" | "owned" | "duplicate";

export type SectionType = "national_team" | "tournament_special" | "promotional";

export type PositionRole =
  | "badge"
  | "team_photo"
  | "player"
  | "intro"
  | "history"
  | "promo";

export type Rarity = "regular" | "gold";

export type ReleaseBatch = "original" | "coca_cola" | "update_team";

export interface User {
  id: string;
  email: string;
  emailVerified: Date | null;
  displayName: string;
  cep: string;
  whatsapp: string | null;
  whatsappOptIn: boolean;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  createdAt: Date;
}

export interface Sticker {
  id: number;
  naturalKey: string;
  sectionType: SectionType;
  teamSlug: string | null;
  groupCode: string | null;
  positionInSection: number;
  positionRole: PositionRole;
  stickerName: string;
  isOfficialAlbum: boolean;
  releaseBatch: ReleaseBatch;
  rarity: Rarity;
}

export interface UserSticker {
  userId: string;
  stickerId: number;
  status: StickerStatus;
  duplicateCount: number;
  updatedAt: Date;
}

export interface StickerWithStatus extends Sticker {
  status: StickerStatus;
  duplicateCount: number;
}

export interface AlbumSection {
  sectionType: SectionType;
  groupCode: string | null;
  teamSlug: string | null;
  stickers: StickerWithStatus[];
}

export interface Match {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  score: number;
  distanceKm: number | null;
  euDou: number;
  euRecebo: number;
  whatsappAvailable: boolean;
  previewGive: Pick<Sticker, "id" | "naturalKey" | "stickerName" | "teamSlug">[];
  previewReceive: Pick<Sticker, "id" | "naturalKey" | "stickerName" | "teamSlug">[];
}

export interface AnonymousMatch {
  anonymous: true;
  euRecebo: number;
}

export interface MatchDetail {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  score: number;
  distanceKm: number | null;
  euDou: (Pick<Sticker, "id" | "naturalKey" | "stickerName" | "teamSlug" | "positionInSection">)[];
  euRecebo: (Pick<Sticker, "id" | "naturalKey" | "stickerName" | "teamSlug" | "positionInSection">)[];
  whatsappAvailable: boolean;
  whatsappLink: string | null;
}

export interface UserStats {
  albumCompletionPct: number;
  totalDuplicates: number;
  topDemandedStickers: {
    stickerId: number;
    naturalKey: string;
    stickerName: string;
    teamSlug: string | null;
    demandCount: number;
  }[];
}

export interface PaginatedMatches {
  matches: Match[];
  anonymousCount: number;
  total: number;
  page: number;
  perPage: number;
}

export interface MatchFilters {
  maxDistanceKm?: number;
  minScore?: number;
  page?: number;
  perPage?: number;
}
