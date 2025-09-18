/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_GCLOUD_API_KEY?: string;
  readonly VITE_TTS_BASE?: string;
  readonly VITE_TRANSLATE_BASE?: string;
  readonly VITE_MAPS_JS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
