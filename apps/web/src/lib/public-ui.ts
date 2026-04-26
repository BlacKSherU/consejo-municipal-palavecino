/** Debe coincidir con la validación en apps/api (mergePublicUi). */

export type NewsImageKey = "short" | "medium" | "tall" | "verytall";
export type CornerKey = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type CouncilPhotoPreset = "compact" | "default" | "large";
export type ModalWidthKey = "sm" | "md" | "lg" | "xl";

export type PublicUiConfig = {
  version: number;
  news: {
    cardImage: NewsImageKey;
    cardCorner: CornerKey;
    modalImage: NewsImageKey;
    modalCorner: CornerKey;
    cardHoverLift: boolean;
  };
  council: {
    photoCorner: CornerKey;
    photoPreset: CouncilPhotoPreset;
    modalCorner: CornerKey;
    modalWidth: ModalWidthKey;
    photoGrayscale: boolean;
  };
};

export const defaultPublicUiConfig: PublicUiConfig = {
  version: 1,
  news: {
    cardImage: "tall",
    cardCorner: "lg",
    modalImage: "tall",
    modalCorner: "xl",
    cardHoverLift: true,
  },
  council: {
    photoCorner: "xl",
    photoPreset: "default",
    modalCorner: "xl",
    modalWidth: "md",
    photoGrayscale: false,
  },
};

const cornerClass: Record<CornerKey, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-3xl",
  "3xl": "rounded-[2rem]",
};

const newsCardH: Record<NewsImageKey, string> = {
  short: "h-44",
  medium: "h-52",
  tall: "h-56",
  verytall: "h-64",
};

const newsModalH: Record<NewsImageKey, string> = {
  short: "h-48 md:h-56",
  medium: "h-52 md:h-64",
  tall: "h-64 md:h-80",
  verytall: "h-72 md:h-96",
};

const councilModalMax: Record<ModalWidthKey, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/** Tres columnas escalonadas (mismo aspecto, distintos tamaños). */
const councilPhotoClasses: Record<
  CouncilPhotoPreset,
  { c1: string; c2: string; c3: string }
> = {
  compact: {
    c1: "h-[100px] w-[92px] sm:h-[118px] sm:w-[108px] md:h-[138px] md:w-[128px]",
    c2: "h-[110px] w-[102px] sm:h-[130px] sm:w-[120px] md:h-[152px] md:w-[142px]",
    c3: "h-[104px] w-[96px] sm:h-[124px] sm:w-[114px] md:h-[144px] md:w-[134px]",
  },
  default: {
    c1: "h-[120px] w-[110px] sm:h-[140px] sm:w-[130px] md:h-[165px] md:w-[155px]",
    c2: "h-[132px] w-[122px] sm:h-[155px] sm:w-[145px] md:h-[182px] md:w-[172px]",
    c3: "h-[125px] w-[115px] sm:h-[146px] sm:w-[136px] md:h-[172px] md:w-[162px]",
  },
  large: {
    c1: "h-[138px] w-[126px] sm:h-[162px] sm:w-[150px] md:h-[190px] md:w-[178px]",
    c2: "h-[152px] w-[140px] sm:h-[178px] sm:w-[166px] md:h-[208px] md:w-[196px]",
    c3: "h-[144px] w-[132px] sm:h-[168px] sm:w-[156px] md:h-[198px] md:w-[186px]",
  },
};

export type ResolvedNewsUi = {
  cardImageContainerClass: string;
  cardArticleRounded: string;
  modalShellRounded: string;
  modalImageContainerClass: string;
  cardHoverLift: boolean;
};

export type ResolvedCouncilUi = {
  photoRounded: string;
  photoCol1: string;
  photoCol2: string;
  photoCol3: string;
  modalRounded: string;
  modalMaxClass: string;
  photoGrayscale: boolean;
};

export function mergePublicUiFromApi(raw: unknown): PublicUiConfig {
  if (!raw || typeof raw !== "object") return defaultPublicUiConfig;
  const o = raw as Record<string, unknown>;
  const news = o.news && typeof o.news === "object" ? (o.news as Record<string, unknown>) : {};
  const council = o.council && typeof o.council === "object" ? (o.council as Record<string, unknown>) : {};
  const pick = <T extends string>(allowed: readonly T[], v: unknown, fb: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb;
  return {
    version: 1,
    news: {
      cardImage: pick(["short", "medium", "tall", "verytall"], news.cardImage, defaultPublicUiConfig.news.cardImage),
      cardCorner: pick(["none", "sm", "md", "lg", "xl", "2xl", "3xl"], news.cardCorner, defaultPublicUiConfig.news.cardCorner),
      modalImage: pick(["short", "medium", "tall", "verytall"], news.modalImage, defaultPublicUiConfig.news.modalImage),
      modalCorner: pick(["none", "sm", "md", "lg", "xl", "2xl", "3xl"], news.modalCorner, defaultPublicUiConfig.news.modalCorner),
      cardHoverLift:
        typeof news.cardHoverLift === "boolean" ? news.cardHoverLift : defaultPublicUiConfig.news.cardHoverLift,
    },
    council: {
      photoCorner: pick(
        ["none", "sm", "md", "lg", "xl", "2xl", "3xl"],
        council.photoCorner,
        defaultPublicUiConfig.council.photoCorner,
      ),
      photoPreset: pick(
        ["compact", "default", "large"],
        council.photoPreset,
        defaultPublicUiConfig.council.photoPreset,
      ),
      modalCorner: pick(
        ["none", "sm", "md", "lg", "xl", "2xl", "3xl"],
        council.modalCorner,
        defaultPublicUiConfig.council.modalCorner,
      ),
      modalWidth: pick(["sm", "md", "lg", "xl"], council.modalWidth, defaultPublicUiConfig.council.modalWidth),
      photoGrayscale:
        typeof council.photoGrayscale === "boolean"
          ? council.photoGrayscale
          : defaultPublicUiConfig.council.photoGrayscale,
    },
  };
}

export function resolveNewsUi(c: PublicUiConfig): ResolvedNewsUi {
  const h = newsCardH[c.news.cardImage];
  const mh = newsModalH[c.news.modalImage];
  return {
    cardImageContainerClass: j("relative overflow-hidden bg-muted", h),
    cardArticleRounded: cornerClass[c.news.cardCorner],
    modalShellRounded: cornerClass[c.news.modalCorner],
    modalImageContainerClass: j("relative", mh),
    cardHoverLift: c.news.cardHoverLift,
  };
}

export function resolveCouncilUi(c: PublicUiConfig): ResolvedCouncilUi {
  const p = councilPhotoClasses[c.council.photoPreset];
  const pr = cornerClass[c.council.photoCorner];
  return {
    photoRounded: pr,
    photoCol1: j("flex-shrink-0 cursor-pointer overflow-hidden transition-opacity", pr, p.c1),
    photoCol2: j("flex-shrink-0 cursor-pointer overflow-hidden transition-opacity", pr, p.c2),
    photoCol3: j("flex-shrink-0 cursor-pointer overflow-hidden transition-opacity", pr, p.c3),
    modalRounded: cornerClass[c.council.modalCorner],
    modalMaxClass: councilModalMax[c.council.modalWidth],
    photoGrayscale: c.council.photoGrayscale,
  };
}

function j(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}
