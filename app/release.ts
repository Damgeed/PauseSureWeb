export type ReleaseStage = "not-listed" | "app-store";

type ReleaseConfig = {
  stage: ReleaseStage;
  platform: "iPhone";
  appStoreUrl: string | null;
};

// Release switch: after Apple approves the public listing, set stage to
// "app-store" and paste the verified apps.apple.com URL. Every public
// availability message and download action is derived from this object.
export const releaseConfig: ReleaseConfig = {
  stage: "not-listed",
  platform: "iPhone",
  appStoreUrl: null,
};

const hasVerifiedAppStoreListing =
  releaseConfig.stage === "app-store" &&
  releaseConfig.appStoreUrl?.startsWith("https://apps.apple.com/");

if (releaseConfig.stage === "app-store" && !hasVerifiedAppStoreListing) {
  throw new Error(
    "PauseSure cannot publish an App Store download action without a verified apps.apple.com URL.",
  );
}

export const releaseAction = hasVerifiedAppStoreListing
  ? {
      label: "Download on the App Store",
      href: releaseConfig.appStoreUrl as string,
    }
  : {
      label: "Check iPhone availability",
      href: "/company#availability",
    };

export const releaseMessaging = hasVerifiedAppStoreListing
  ? {
      eyebrow: "Available for iPhone",
      headline: "A calmer way to handle suspicious requests.",
      summary:
        "Download PauseSure from its verified App Store listing and keep a clearer next step close at hand.",
      availability:
        "PauseSure is available for iPhone through the verified App Store listing linked on pausesure.com.",
      statusLabel: "Current availability",
      statusValue: "Available on the App Store",
      footer: "PauseSure for iPhone.",
    }
  : {
      eyebrow: "PauseSure for iPhone",
      headline: "A calmer way to handle suspicious requests.",
      summary:
        "The official iPhone download link will appear on pausesure.com as soon as App Store distribution is verified. Return here for the verified release—not a link sent under pressure.",
      availability:
        "PauseSure is not yet listed on the App Store. The verified download link will appear only on pausesure.com when it becomes available.",
      statusLabel: "Current availability",
      statusValue: "Not yet listed on the App Store",
      footer: "PauseSure for iPhone. Official availability is verified here.",
    };
