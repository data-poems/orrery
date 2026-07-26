/// <reference types="vite/client" />

declare const __ORRERY_BUILD_STAMP__: string;
declare const __ORRERY_APP_VERSION__: string;

interface Window {
  /** Debug-build hook; the native plugin refuses forced requests in Release. */
  __ORRERY_FORCE_REVIEW_PROMPT__?: () => Promise<boolean>;
}
