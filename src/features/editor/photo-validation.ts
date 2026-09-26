const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const types = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { extension: "webp", signature: (bytes: Uint8Array) => new TextDecoder("ascii").decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder("ascii").decode(bytes.slice(8, 12)) === "WEBP" },
} as const;

export function validatePhoto(file: { type: string; size: number }, bytes: Uint8Array): { extension: string } {
  if (!file.size || file.size !== bytes.byteLength || file.size > MAX_PHOTO_BYTES) throw new Error("Choose a JPEG, PNG, or WebP image no larger than 5 MiB.");
  const config = types[file.type as keyof typeof types];
  if (!config || !config.signature(bytes)) throw new Error("The uploaded file is not a valid JPEG, PNG, or WebP image.");
  return { extension: config.extension };
}
