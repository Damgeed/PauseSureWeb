"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  parseAnalysisResponse,
  LatestCheckSequence,
  type ReputationResult,
  type WebCheckKind,
  type WebCheckResult,
} from "./analysis-response";

const kinds: Array<{ id: WebCheckKind; label: string; description: string }> = [
  { id: "text", label: "Message", description: "Text, email or social message" },
  { id: "link", label: "Link", description: "Website or payment page" },
  { id: "phone", label: "Phone", description: "Unknown or claimed organization" },
  { id: "screenshot", label: "Screenshot", description: "Saved image or message capture" },
  { id: "qr", label: "QR code", description: "Decode and inspect the destination" },
];

const analyticsPreferenceKey = "pausesure_content_free_analytics";
const allowedImageTypes = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);
const maximumImageBytes = 12 * 1024 * 1024;
const maximumImageDimension = 8_192;
const maximumImagePixels = 25_000_000;
const analysisEndpoint = "https://pausesure-production.up.railway.app/v1/analysis/check";

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

async function requestAnalysis(
  kind: WebCheckKind,
  value: string,
  controller: AbortController,
): Promise<WebCheckResult | null> {
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(analysisEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, value }),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return parseAnalysisResponse(payload, kind);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatLookupTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function ReputationEvidenceCard({
  evidence,
  index,
  total,
}: {
  evidence: ReputationResult;
  index: number;
  total: number;
}) {
  const headingID = `reputation-evidence-${index}`;
  const title = evidence.resultType === "malicious"
    ? "Known threat match"
    : evidence.resultType === "no_known_match"
      ? "No known threat match"
      : "Couldn’t verify";
  const detail = evidence.resultType === "malicious"
    ? `${evidence.source.name} identified this address on: ${evidence.threatTypes.map((type) => type.toLowerCase().replaceAll("_", " ")).join(", ")}.`
    : evidence.resultType === "no_known_match"
      ? `${evidence.source.name} did not find the checked address on the selected threat lists.`
      : "The threat-list check did not return a usable result. Try again before using this address.";
  const lookupLabel = evidence.resultType === "couldnt_verify"
    ? "Check not completed"
    : evidence.cached ? "Recent check result" : "Threat-list check";

  return <section className={`reputation-evidence reputation-${evidence.resultType}`} aria-labelledby={headingID}>
    <h3 id={headingID}>Destination evidence · Address {index + 1} of {total}</h3>
    <strong>{title}</strong>
    <p>{detail}</p>
    <small>
      Checked host: {evidence.indicator.host} · Source: {evidence.source.name} · {lookupLabel} · Checked <time dateTime={evidence.checkedAt}>{formatLookupTime(evidence.checkedAt)}</time> · Current until <time dateTime={evidence.expiresAt}>{formatLookupTime(evidence.expiresAt)}</time> · {evidence.lookupDurationMs} ms
    </small>
    <p className="reputation-disclaimer">{evidence.disclaimer}</p>
  </section>;
}

export default function CheckerClient() {
  const [kind, setKind] = useState<WebCheckKind>("text");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<WebCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [checkSequence] = useState(() => new LatestCheckSequence());
  const activeCheckController = useRef<AbortController | null>(null);
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

  useEffect(() => () => {
    activeCheckController.current?.abort();
  }, []);

  function invalidatePendingCheck() {
    checkSequence.invalidate();
    activeCheckController.current?.abort();
    activeCheckController.current = null;
    setIsChecking(false);
  }

  function updateValue(next: string) {
    invalidatePendingCheck();
    setValue(next);
    setResult(null);
    setCheckError(null);
  }

  function clearCheck() {
    invalidatePendingCheck();
    setValue("");
    setResult(null);
    setCheckError(null);
  }

  function chooseKind(next: WebCheckKind) {
    if (next === kind) return;
    invalidatePendingCheck();
    setKind(next);
    setValue("");
    setResult(null);
    setCheckError(null);
    setImageStatus(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }

  function handleKindKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % kinds.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + kinds.length) % kinds.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = kinds.length - 1;
    }
    if (nextIndex === null) return;

    event.preventDefault();
    const nextKind = kinds[nextIndex];
    chooseKind(nextKind.id);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    tabs?.[nextIndex]?.focus();
  }

  async function runCheck() {
    const inputKind = kind;
    const inputValue = value;
    const requestSequence = checkSequence.begin();
    activeCheckController.current?.abort();
    const controller = new AbortController();
    activeCheckController.current = controller;

    track("web_check_started", { input: inputKind }, analyticsEnabled);
    setIsChecking(true);
    setResult(null);
    setCheckError(null);
    try {
      const next = await requestAnalysis(inputKind, inputValue, controller);
      if (!checkSequence.isCurrent(requestSequence)) return;
      if (!next) {
        setCheckError("PauseSure couldn’t complete this check. Please try again.");
        return;
      }
      setResult(next);
      track("web_check_completed", { input: inputKind, risk: next.risk }, analyticsEnabled);
      track("result_viewed", { input: inputKind, risk: next.risk }, analyticsEnabled);
    } finally {
      if (checkSequence.isCurrent(requestSequence)) {
        activeCheckController.current = null;
        setIsChecking(false);
      }
    }
  }

  async function inspectImage(file: File | undefined) {
    invalidatePendingCheck();
    setResult(null);
    setCheckError(null);
    setValue("");
    setImageStatus(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (!file) {
      setImageUrl(null);
      return;
    }
    if (!allowedImageTypes.has(file.type.toLowerCase()) || file.size > maximumImageBytes) {
      setImageUrl(null);
      setImageStatus("Choose a PNG, JPEG, WebP, or AVIF image smaller than 12 MB.");
      return;
    }

    let bitmap: ImageBitmap | null = null;
    let previewReady = false;
    try {
      bitmap = await createImageBitmap(file);
      if (
        bitmap.width > maximumImageDimension ||
        bitmap.height > maximumImageDimension ||
        bitmap.width * bitmap.height > maximumImagePixels
      ) {
        setImageUrl(null);
        setImageStatus("Choose an image with smaller pixel dimensions.");
        return;
      }

      setImageUrl(URL.createObjectURL(file));
      previewReady = true;
      setImageStatus("Image ready. Paste the visible wording below for a message check.");
      if (kind !== "qr") return;

      const Detector = (globalThis as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect(source: ImageBitmap): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (!Detector) {
        setImageStatus("QR decoding did not start. Paste the destination shown by your camera.");
        return;
      }
      const matches = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      if (!matches[0]?.rawValue) {
        setImageStatus("No QR destination was found. Try a sharper image or paste the destination.");
        return;
      }
      setValue(matches[0].rawValue);
      setImageStatus("QR content decoded. Review the destination before checking it.");
    } catch {
      if (!previewReady) setImageUrl(null);
      setImageStatus(kind === "qr"
        ? "The QR code could not be decoded. Paste the destination instead."
        : "The image could not be read safely. Try a different PNG, JPEG, WebP, or AVIF file.");
    } finally {
      bitmap?.close();
    }
  }

  function updateAnalytics(enabled: boolean) {
    setAnalyticsEnabled(enabled);
    window.localStorage.setItem(analyticsPreferenceKey, enabled ? "yes" : "no");
  }

  const needsImage = kind === "screenshot" || kind === "qr";
  const placeholder = kind === "link"
    ? "pausesure.com or https://example.com/account/verify"
    : kind === "phone"
      ? "+1 202 555 0123"
      : needsImage
        ? "Paste the words visible in the image, or the decoded QR destination…"
        : "Paste the message, email or conversation excerpt that concerns you…";

  return (
    <div className="checker-layout">
      <section className="checker-card" aria-labelledby="checker-title">
        <div className="checker-card-heading">
          <p className="section-kicker">PauseSure check</p>
          <h1 id="checker-title">What would you like to check?</h1>
          <p>PauseSure reviews the evidence you submit for pressure, impersonation, payment, credential, destination, and other fraud signals, then returns clear reasons and safer next steps.</p>
        </div>

        <div className="checker-tabs" role="tablist" aria-label="Type of item to check" aria-orientation="horizontal">
          {kinds.map((item, index) => (
            <button
              key={item.id}
              id={`checker-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={kind === item.id}
              aria-controls="checker-input-panel"
              tabIndex={kind === item.id ? 0 : -1}
              onClick={() => chooseKind(item.id)}
              onKeyDown={(event) => handleKindKeyDown(event, index)}
            >
              <strong>{item.label}</strong><span>{item.description}</span>
            </button>
          ))}
        </div>

        <div
          className="checker-input-panel"
          id="checker-input-panel"
          role="tabpanel"
          aria-labelledby={`checker-tab-${kind}`}
          tabIndex={0}
        >
          {needsImage && <div className="image-input-row">
            <label className="image-picker">
              <span>{kind === "qr" ? "Choose a QR image" : "Choose a screenshot"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => void inspectImage(event.target.files?.[0])} />
            </label>
            {/* User-selected previews use a temporary blob URL and cannot use the site image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageUrl && <img className="checker-image-preview" src={imageUrl} alt="Selected image preview" />}
          </div>}
          {imageStatus && <p className="checker-image-status" role="status">{imageStatus}</p>}
          <label htmlFor="check-content">{selectedKind.label} details</label>
          {kind === "link" && <p className="checker-field-help" id="link-format-help">No http://, https://, or www. is needed. Paste a complete address such as pausesure.com; an incomplete ending such as www.pausesure will be flagged.</p>}
          {kind === "link" || kind === "phone" ? (
            <input id="check-content" value={value} onChange={(event) => updateValue(event.target.value)} placeholder={placeholder} autoComplete="off" inputMode={kind === "phone" ? "tel" : "url"} aria-describedby={kind === "link" ? "link-format-help" : undefined} />
          ) : (
            <textarea id="check-content" value={value} onChange={(event) => updateValue(event.target.value)} placeholder={placeholder} rows={7} />
          )}
          <div className="checker-controls">
            <button className="button button-primary checker-submit" type="button" onClick={() => void runCheck()} disabled={!value.trim() || isChecking}>{isChecking ? "Checking…" : "Run full check"}</button>
            <button className="checker-clear" type="button" onClick={clearCheck}>Clear</button>
          </div>
          <p className="checker-processing-note"><span aria-hidden="true">●</span> Your submitted text or destination is sent securely to PauseSure for this check and is not retained in application data or request logs. Web addresses may also be checked against Google Web Risk.</p>
        </div>
      </section>

      <aside className="checker-result">
        <div className="checker-result-live" aria-live="polite" aria-busy={isChecking}>
          {!result && !checkError ? <div className="checker-empty">
            <span>Pause → Check → Verify</span>
            <h2>{isChecking ? "Checking…" : "A result should explain itself."}</h2>
            <p>{isChecking
              ? "PauseSure is reviewing explainable warning signals and any web addresses found in this check."
              : "PauseSure combines explainable fraud signals with configured threat-intelligence checks and returns High risk, Unclear, Likely safe, or Couldn’t verify."}</p>
            {!isChecking && <ol><li>Paste only what you choose.</li><li>Review the exact reasons.</li><li>Verify through an independent channel.</li></ol>}
          </div> : result ? <div className={`checker-result-card risk-${result.risk}`}>
            <p className="result-eyebrow">PauseSure result</p>
            <h2>{result.label}</h2>
            <p className="result-summary">{result.summary}</p>
            <div className="checker-signals">
              {result.signals.map((item) => <article key={item.code}><strong>{item.title}</strong><p>{item.detail}</p></article>)}
            </div>
            {result.reputation.map((item, index) => <ReputationEvidenceCard
              key={`${item.indicator.host}-${index}`}
              evidence={item}
              index={index}
              total={result.reputation.length}
            />)}
            <div className="checker-next">
              <h3>Safer next steps</h3>
              <ol>{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol>
            </div>
            <p className="checker-limitation">{result.limitation}</p>
            <div className="checker-result-actions">
              <a href="/how-it-works" onClick={() => track("next_action_selected", { action: "verify", risk: result.risk }, analyticsEnabled)}>Verify independently</a>
              <a href="/resources" onClick={() => track("next_action_selected", { action: "recover", risk: result.risk }, analyticsEnabled)}>I already acted</a>
            </div>
          </div> : null}
          {checkError && <div className="checker-empty" role="alert"><span>Check interrupted</span><h2>Try the check again.</h2><p>{checkError}</p></div>}
        </div>

        <label className="analytics-choice">
          <input type="checkbox" checked={analyticsEnabled} onChange={(event) => updateAnalytics(event.target.checked)} />
          <span><strong>Share product-use counts</strong><small>Share content-free counts such as “link check completed” and the broad result. These counts measure feature use and flow reliability; they cannot identify false negatives, provide labeled examples, calibrate detection accuracy, or train a classifier. Your entry, URL, number, image, IP, device ID and contact information are not stored in these counts.</small></span>
        </label>
      </aside>
    </div>
  );
}
