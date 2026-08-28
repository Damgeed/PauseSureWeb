export const allowedSourceImageTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const maximumSourceImageBytes = 12 * 1024 * 1024;
export const minimumSourceImageDimension = 16;
export const maximumSourceImageDimension = 8_192;
export const maximumSourceImagePixels = 25_000_000;
export const maximumNormalizedImageBytes = 4 * 1024 * 1024;
export const maximumNormalizedImageBase64Characters = Math.ceil(maximumNormalizedImageBytes / 3) * 4;

const outputEdgeCandidates = [2_560, 2_048, 1_600];
const jpegQualityCandidates = [0.9, 0.82, 0.74, 0.66];

export type NormalizedScreenshot = {
  mediaType: "image/jpeg" | "image/png";
  dataBase64: string;
};

export type NormalizedDimensions = {
  width: number;
  height: number;
};

export function sourceImageError(file: Pick<File, "size" | "type">): string | null {
  if (!allowedSourceImageTypes.has(file.type.toLowerCase())) {
    return "Choose a PNG, JPEG, WebP, or AVIF image.";
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > maximumSourceImageBytes) {
    return "Choose a PNG, JPEG, WebP, or AVIF image smaller than 12 MB.";
  }
  return null;
}

export function decodedImageError(width: number, height: number): string | null {
  if (
    !Number.isSafeInteger(width)
    || !Number.isSafeInteger(height)
    || width < minimumSourceImageDimension
    || height < minimumSourceImageDimension
    || width > maximumSourceImageDimension
    || height > maximumSourceImageDimension
    || width * height > maximumSourceImagePixels
  ) {
    return "Choose an image at least 16 pixels wide and tall and no larger than 8,192 pixels or 25 megapixels.";
  }
  return null;
}

export function fitImageDimensions(
  width: number,
  height: number,
  maximumEdge: number,
): NormalizedDimensions {
  if (
    !Number.isFinite(width)
    || !Number.isFinite(height)
    || !Number.isFinite(maximumEdge)
    || width <= 0
    || height <= 0
    || maximumEdge <= 0
  ) {
    throw new TypeError("Image dimensions must be positive finite numbers.");
  }
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function normalizeScreenshot(
  bitmap: ImageBitmap,
  sourceMediaType: string,
): Promise<NormalizedScreenshot | null> {
  if (decodedImageError(bitmap.width, bitmap.height)) return null;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;

  for (const maximumEdge of outputEdgeCandidates) {
    const dimensions = fitImageDimensions(bitmap.width, bitmap.height, maximumEdge);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    if (sourceMediaType.toLowerCase() === "image/png") {
      const png = await canvasToBlob(canvas, "image/png");
      if (png && png.size <= maximumNormalizedImageBytes) {
        return normalizedPayload(png, "image/png");
      }
    }

    for (const quality of jpegQualityCandidates) {
      const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
      if (jpeg && jpeg.size <= maximumNormalizedImageBytes) {
        return normalizedPayload(jpeg, "image/jpeg");
      }
    }
  }
  return null;
}

async function normalizedPayload(
  blob: Blob,
  mediaType: NormalizedScreenshot["mediaType"],
): Promise<NormalizedScreenshot | null> {
  if (blob.size < 1 || blob.size > maximumNormalizedImageBytes) return null;
  const dataBase64 = await blobToBase64(blob);
  if (
    dataBase64.length < 1
    || dataBase64.length > maximumNormalizedImageBase64Characters
    || !/^[A-Za-z\d+/]+={0,2}$/u.test(dataBase64)
  ) return null;
  return { mediaType, dataBase64 };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mediaType: NormalizedScreenshot["mediaType"],
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mediaType, quality));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image encoding failed."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Image encoding failed."));
        return;
      }
      const separator = reader.result.indexOf(",");
      if (separator < 0) {
        reject(new Error("Image encoding failed."));
        return;
      }
      resolve(reader.result.slice(separator + 1));
    };
    reader.readAsDataURL(blob);
  });
}
