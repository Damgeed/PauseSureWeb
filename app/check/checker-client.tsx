"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeCheck, type WebCheckKind, type WebCheckResult } from "./checker";

const kinds: Array<{ id: WebCheckKind; label: string; description: string }> = [
  { id: "text", label: "Message", description: "Text, email or social message" },
  { id: "link", label: "Link", description: "Website or payment page" },
  { id: "phone", label: "Phone", description: "Unknown or claimed organization" },
  { id: "screenshot", label: "Screenshot", description: "Image stays in this browser" },
  { id: "qr", label: "QR code", description: "Decode locally when supported" },
];

const analyticsPreferenceKey = "pausesure_content_free_analytics";

type AnalyticsDimensions = Partial<Record<"input" | "risk" | "action" | "channel", string>>;

function track(name: string, dimensions: AnalyticsDimensions, enabled: boolean) {
  if (!enabled) return;
  const payload = JSON.stringify({
    events: [{
      schemaVersion: 1,
      name,
      day: new Date().toISOString().slice(0, 10),
      count: 1,
      dimensions: { ...dimensions, channel: "web" },
    }],
  });
  void fetch("/api/privacy-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

function inputDimension(kind: WebCheckKind) {
  return kind === "screenshot" || kind === "qr" ? kind : kind;
}

export default function CheckerClient() {
  const [kind, setKind] = useState<WebCheckKind>("text");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<WebCheckResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const selectedKind = useMemo(() => kinds.find((item) => item.id === kind) ?? kinds[0], [kind]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnalyticsEnabled(window.localStorage.getItem(analyticsPreferenceKey) === "yes");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  function chooseKind(next: WebCheckKind) {
    setKind(next);
    setValue("");
    setResult(null);
    setImageStatus(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }

  function runCheck() {
    track("web_check_started", { input: inputDimension(kind) }, analyticsEnabled);
    const next = analyzeCheck(kind, value);
    setResult(next);
    track("web_check_completed", { input: inputDimension(kind), risk: next.risk }, analyticsEnabled);
    track("result_viewed", { input: inputDimension(kind), risk: next.risk }, analyticsEnabled);
  }

  async function inspectImage(file: File | undefined) {
    setResult(null);
    setValue("");
    setImageStatus(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (!file) {
      setImageUrl(null);
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      setImageUrl(null);
      setImageStatus("Choose an image file smaller than 12 MB.");
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    setImageStatus("The image remains on this device. Paste the visible wording below for a message check.");

    if (kind !== "qr") return;
    try {
      const Detector = (globalThis as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect(source: ImageBitmap): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (!Detector) {
        setImageStatus("This browser cannot decode QR codes locally. Use the PauseSure iPhone QR scanner or paste the destination shown by your camera.");
        return;
      }
      const bitmap = await createImageBitmap(file);
      const matches = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      bitmap.close();
      if (!matches[0]?.rawValue) {
        setImageStatus("No QR destination was found. Try a sharper image or use the PauseSure iPhone QR scanner.");
        return;
      }
      setValue(matches[0].rawValue);
      setImageStatus("QR content decoded on this device. Review the destination before checking it.");
    } catch {
      setImageStatus("The QR code could not be decoded locally. Use the PauseSure iPhone QR scanner or paste the destination.");
    }
  }

  function updateAnalytics(enabled: boolean) {
    setAnalyticsEnabled(enabled);
    window.localStorage.setItem(analyticsPreferenceKey, enabled ? "yes" : "no");
  }

  const needsImage = kind === "screenshot" || kind === "qr";
  const placeholder = kind === "link"
    ? "https://example.com/account/verify"
    : kind === "phone"
      ? "+1 202 555 0123"
      : needsImage
        ? "Paste the words visible in the image, or the decoded QR destination…"
        : "Paste the message, email or conversation excerpt that concerns you…";

  return (
    <div className="checker-layout">
      <section className="checker-card" aria-labelledby="checker-title">
        <div className="checker-card-heading">
          <p className="section-kicker">Private first check</p>
          <h1 id="checker-title">What would you like to check?</h1>
          <p>Your entry is analyzed in this browser. It is not uploaded or used for analytics.</p>
        </div>

        <div className="checker-tabs" role="tablist" aria-label="Type of item to check">
          {kinds.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={kind === item.id} onClick={() => chooseKind(item.id)}>
              <strong>{item.label}</strong><span>{item.description}</span>
            </button>
          ))}
        </div>

        <div className="checker-input-panel">
          {needsImage && <div className="image-input-row">
            <label className="image-picker">
              <span>{kind === "qr" ? "Choose a QR image" : "Choose a screenshot"}</span>
              <input type="file" accept="image/*" onChange={(event) => void inspectImage(event.target.files?.[0])} />
            </label>
            {/* A user-selected blob URL never leaves this browser and is not compatible with the site image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageUrl && <img className="checker-image-preview" src={imageUrl} alt="Selected image preview" />}
          </div>}
          {imageStatus && <p className="checker-image-status" role="status">{imageStatus}</p>}
          <label htmlFor="check-content">{selectedKind.label} details</label>
          {kind === "link" || kind === "phone" ? (
            <input id="check-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} autoComplete="off" inputMode={kind === "phone" ? "tel" : "url"} />
          ) : (
            <textarea id="check-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} rows={7} />
          )}
          <div className="checker-controls">
            <button className="button button-primary checker-submit" type="button" onClick={runCheck} disabled={!value.trim()}>Check warning signals</button>
            <button className="checker-clear" type="button" onClick={() => { setValue(""); setResult(null); }}>Clear</button>
          </div>
          <p className="checker-local-note"><span aria-hidden="true">●</span> Analysis stays in this browser. Links are inspected structurally; no external reputation lookup is claimed.</p>
        </div>
      </section>

      <aside className="checker-result" aria-live="polite">
        {!result ? <div className="checker-empty">
          <span>Pause → Check → Verify</span>
          <h2>A result should explain itself.</h2>
          <p>PauseSure looks for visible pressure, secrecy, payment, credential, impersonation and link-structure signals. It never declares something safe.</p>
          <ol><li>Paste only what you choose.</li><li>Review the exact reasons.</li><li>Verify through an independent channel.</li></ol>
        </div> : <div className={`checker-result-card risk-${result.risk}`}>
          <p className="result-eyebrow">PauseSure result</p>
          <h2>{result.label}</h2>
          <p className="result-summary">{result.summary}</p>
          <div className="checker-signals">
            {result.signals.map((item) => <article key={item.code}><strong>{item.title}</strong><p>{item.detail}</p></article>)}
          </div>
          <div className="checker-next">
            <h3>Safer next steps</h3>
            <ol>{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>
          <p className="checker-limitation">{result.limitation}</p>
          <div className="checker-result-actions">
            <a href="/how-it-works" onClick={() => track("next_action_selected", { action: "verify", risk: result.risk }, analyticsEnabled)}>Verify independently</a>
            <a href="/resources" onClick={() => track("next_action_selected", { action: "recover", risk: result.risk }, analyticsEnabled)}>I already acted</a>
          </div>
        </div>}

        <label className="analytics-choice">
          <input type="checkbox" checked={analyticsEnabled} onChange={(event) => updateAnalytics(event.target.checked)} />
          <span><strong>Help improve PauseSure</strong><small>Share content-free counts such as “link check completed” and the broad result. Your entry, URL, number, image, IP, device ID and contact information are not stored in these counts.</small></span>
        </label>
      </aside>
    </div>
  );
}
