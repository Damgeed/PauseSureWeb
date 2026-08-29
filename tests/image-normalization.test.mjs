import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodedImageError,
  fitImageDimensions,
  maximumNormalizedImageBase64Characters,
  maximumNormalizedImageBytes,
  sourceImageError,
} from "../app/check/image-normalization.ts";

test("accepts only bounded supported screenshot source files", () => {
  assert.equal(sourceImageError({ type: "image/jpeg", size: 1 }), null);
  assert.equal(sourceImageError({ type: "IMAGE/PNG", size: 12 * 1024 * 1024 }), null);
  assert.equal(sourceImageError({ type: "image/webp", size: 512_000 }), null);
  assert.equal(sourceImageError({ type: "image/avif", size: 512_000 }), null);
  assert.match(sourceImageError({ type: "image/svg+xml", size: 512_000 }) ?? "", /PNG, JPEG, WebP, or AVIF/u);
  assert.match(sourceImageError({ type: "image/png", size: 0 }) ?? "", /smaller than 12 MB/u);
  assert.match(sourceImageError({ type: "image/png", size: 12 * 1024 * 1024 + 1 }) ?? "", /smaller than 12 MB/u);
});

test("rejects decoded image bombs before raster normalization", () => {
  assert.equal(decodedImageError(16, 16), null);
  assert.equal(decodedImageError(5_000, 5_000), null);
  assert.match(decodedImageError(8_193, 16) ?? "", /8,192 pixels or 25 megapixels/u);
  assert.match(decodedImageError(5_001, 5_000) ?? "", /8,192 pixels or 25 megapixels/u);
  assert.match(decodedImageError(15, 100) ?? "", /at least 16 pixels/u);
  assert.match(decodedImageError(0, 100) ?? "", /at least 16 pixels/u);
  assert.match(decodedImageError(Number.NaN, 100) ?? "", /at least 16 pixels/u);
});

test("downscales screenshots without changing aspect ratio or upscaling", () => {
  assert.deepEqual(fitImageDimensions(8_192, 4_096, 2_560), { width: 2_560, height: 1_280 });
  assert.deepEqual(fitImageDimensions(1_200, 2_400, 1_600), { width: 800, height: 1_600 });
  assert.deepEqual(fitImageDimensions(800, 600, 2_560), { width: 800, height: 600 });
  assert.throws(() => fitImageDimensions(0, 600, 2_560), /positive finite numbers/u);
});

test("bounds both normalized binary and base64 representations", () => {
  assert.equal(maximumNormalizedImageBytes, 4 * 1024 * 1024);
  assert.equal(
    maximumNormalizedImageBase64Characters,
    Math.ceil(maximumNormalizedImageBytes / 3) * 4,
  );
});

test("rasterizes uploads into the two backend-allowlisted media types", async () => {
  const source = await readFile(new URL("../app/check/image-normalization.ts", import.meta.url), "utf8");
  assert.match(source, /document\.createElement\("canvas"\)/u);
  assert.match(source, /context\.drawImage\(bitmap,/u);
  assert.match(source, /canvasToBlob\(canvas, "image\/png"\)/u);
  assert.match(source, /canvasToBlob\(canvas, "image\/jpeg", quality\)/u);
  assert.match(source, /dataBase64\.length > maximumNormalizedImageBase64Characters/u);
  assert.doesNotMatch(source, /image\/svg\+xml/u);
});
