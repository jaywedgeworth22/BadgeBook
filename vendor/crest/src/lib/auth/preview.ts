/**
 * Shared LIVE-PREVIEW OAuth client (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.grok-sandbox.com`
 * URL. Production injects `GROK_AUTH_*`. A local override may live in the
 * gitignored `preview.local.json` — never commit that file.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PREVIEW_CLIENT_ID = "grok_preview";

function localPreviewSecret(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const path = join(dir, "preview.local.json");
    if (!existsSync(path)) return "";
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { secret?: string };
    return parsed.secret ?? "";
  } catch {
    return "";
  }
}

export const PREVIEW_CLIENT_SECRET =
  process.env.GROK_PREVIEW_CLIENT_SECRET ??
  process.env.GROK_AUTH_CLIENT_SECRET ??
  localPreviewSecret();

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
