// Central config for external app-store links and app metadata.
//
// The Android app is the primary product and is PUBLISHED on Google Play, so
// every "Get it on Google Play" CTA across the site links to the live listing
// by default — derived from ANDROID_PACKAGE_ID below, which is the same id the
// Play Console listing uses. Nothing has to be set at deploy time for the CTAs
// to be correct.
//
// VITE_PLAY_STORE_URL still overrides that default if it is set, which is only
// useful for pointing a preview build at a different listing. Note it is a Vite
// build-time value inlined into the client bundle (see the ARG in Dockerfile
// and the build args in docker-compose.yml) — changing it requires a rebuild,
// not just a restart.

const RAW_PLAY_STORE_URL = (
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) ?? ""
).trim();

/** Android application id used on the Play Store listing. */
export const ANDROID_PACKAGE_ID = "com.fitplancoach.app";

/**
 * Canonical Play Store listing URL for the published app. Kept as the default
 * so the site never regresses to a "Coming soon" badge because an env var was
 * missed on a rebuild — the app is live and that is not reversible.
 */
const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

/** Live Google Play listing URL. */
export const PLAY_STORE_URL = RAW_PLAY_STORE_URL || DEFAULT_PLAY_STORE_URL;

/** Whether the Android app is published on Google Play. */
export const isPlayStoreLive = PLAY_STORE_URL.length > 0;

/** Minimum supported Android version, surfaced in the app FAQ and schema. */
export const ANDROID_MIN_VERSION = "8.0";

/**
 * Release version name shown in-app (FAQ, schema.org) for display only.
 * android/app/build.gradle's `versionName` is what Play actually reads from
 * the AAB — bump both together on each release, this one doesn't drive the
 * native build.
 */
export const APP_VERSION = "1.0.2";

/**
 * Display-only mirror of android/app/build.gradle's `versionCode`, which is
 * what Play actually reads from the AAB (Play rejects an upload whose
 * versionCode was already used) — bump both together on each release.
 */
export const ANDROID_VERSION_CODE = 3;
