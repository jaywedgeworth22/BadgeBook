export function bytesHaveAlpha(bytes: Uint8Array, contentType: string): boolean {
  const type = contentType.toLowerCase();
  if (type.includes("svg")) return true;
  if (type.includes("jpeg") || type.includes("jpg") || type.includes("icon")) return false;
  if (type.includes("png") || isPng(bytes)) return pngHasAlpha(bytes);
  return false;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function pngHasAlpha(bytes: Uint8Array): boolean {
  if (bytes.length < 26) return false;
  const colorType = bytes[25];
  if (colorType === 4 || colorType === 6) return true;
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length =
      (bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!;
    const name = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    if (name === "tRNS") return true;
    if (name === "IEND") break;
    offset += 12 + length;
  }
  return false;
}

const BASE_SCORE: Record<string, number> = {
  upload: 100,
  preferred: 96,
  companieslogo: 86,
  simpleicons: 80,
  wikimedia: 62,
  duckduckgo: 48,
  google: 36,
};

export function computeLogoScore(input: {
  source: string;
  contentType: string;
  hasAlpha: boolean;
}): number {
  let score = BASE_SCORE[input.source] ?? 40;
  const type = input.contentType.toLowerCase();
  if (input.hasAlpha) score += 22;
  if (type.includes("svg")) score += 10;
  if (type.includes("png")) score += 6;
  if (type.includes("jpeg") || type.includes("jpg")) score -= 14;
  if (type.includes("icon") || type.includes("x-icon")) score -= 8;
  return score;
}

export function isPreferredSource(source: string): boolean {
  return source === "preferred" || source === "upload";
}
