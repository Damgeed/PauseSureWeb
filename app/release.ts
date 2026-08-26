export type ReleaseStage = "web" | "app-store";

type ReleaseConfig = {
  stage: ReleaseStage;
  platform: "iPhone";
  appStoreUrl: string | null;
};

// PauseSure always has a usable first-party route. After Apple approves the
// public listing, set stage to "app-store" and paste the verified
// apps.apple.com URL. Until then, public actions lead to the browser checker
// instead of presenting an unavailable download control.
export const releaseConfig: ReleaseConfig = {
  stage: "web",
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
      label: "Check something now",
      href: "/check",
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
      actionNote:
        "Download PauseSure only from the verified App Store link on pausesure.com. Never trust a download link supplied inside an urgent message.",
    }
  : {
      eyebrow: "Use PauseSure now",
      headline: "A calmer way to handle suspicious requests.",
      summary:
        "Check a message, link, phone number, screenshot, or QR code and get explainable warning signals, live URL intelligence, and practical next steps.",
      availability:
        "The PauseSure browser checker is available on pausesure.com. It analyzes messages and images in the browser and sends only minimized web addresses through PauseSure to Google Web Risk without opening the destination or sending the surrounding message.",
      statusLabel: "Available now",
      statusValue: "Private browser checker",
      footer: "Pause. Check. Verify. Involve. Recover.",
      actionNote:
        "Messages, phone numbers, and images stay in your browser; only minimized web addresses use Google Web Risk lookups. Optional content-free analytics are off by default and never include checked content.",
    };
