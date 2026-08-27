export const analyticsPreferenceKey = "pausesure_content_free_analytics";

export type AnalyticsDimensions = Partial<Record<"input" | "risk" | "action" | "channel", string>>;

export type AnalyticsConsent = {
  enabled: boolean;
};

type PrivacyEventName =
  | "web_check_started"
  | "web_check_completed"
  | "result_viewed"
  | "next_action_selected";

export function trackPrivacyEvent(
  name: PrivacyEventName,
  dimensions: AnalyticsDimensions,
  consent: Readonly<AnalyticsConsent>,
  send: typeof fetch = globalThis.fetch,
) {
  // Read the stable consent gate at emission time. Async checker callbacks must
  // not rely on the boolean captured by the React render that started a check.
  if (!consent.enabled) return;
  const payload = JSON.stringify({
    events: [{
      schemaVersion: 1,
      name,
      day: new Date().toISOString().slice(0, 10),
      count: 1,
      dimensions: { ...dimensions, channel: "web" },
    }],
  });
  void send("/api/privacy-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}
