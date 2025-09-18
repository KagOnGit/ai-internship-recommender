// Centralized config for all API bases/keys.
// Usage:
//   import cfg from "./config";
//   fetch(`${cfg.apiBase}/health`, { headers: cfg.headers() })

const env = import.meta.env;

function pick(key: keyof ImportMetaEnv, fallback = ""): string {
  const value = env[key];
  const trimmed = (value ?? "").toString().trim();
  return trimmed || fallback;
}

const cfg = {
  // Core app API
  apiBase: pick("VITE_API_BASE", "http://localhost:8000"),

  // Google Cloud (browser)
  gcloudKey: pick("VITE_GCLOUD_API_KEY"),

  // Optional third-party bases
  ttsBase: pick("VITE_TTS_BASE", "https://texttospeech.googleapis.com/v1"),
  translateBase: pick("VITE_TRANSLATE_BASE", "https://translation.googleapis.com/language/translate/v2"),
  mapsJsKey: pick("VITE_MAPS_JS_API_KEY"),

  // Convenience flags
  hasGcloudKey(): boolean {
    return !!cfg.gcloudKey;
  },

  // Common headers builder (adds key headers if present)
  headers(extra?: Record<string, string>) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.gcloudKey) {
      headers["x-gcloud-api-key"] = cfg.gcloudKey; // custom header if you proxy via backend
    }
    return { ...headers, ...(extra || {}) };
  },
} as const;

export default cfg;
