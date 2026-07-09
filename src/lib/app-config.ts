// Central config for external app-store links and app metadata.
//
// The Android app is the primary product. To flip every "Get it on Google
// Play" CTA across the site from a "Coming soon" badge to a live download
// link, set VITE_PLAY_STORE_URL (e.g. in .env.production) to your listing URL:
//
//   VITE_PLAY_STORE_URL="https://play.google.com/store/apps/details?id=com.fitplancoach.app"
//
// No code changes are required when the app goes live — the value is read here
// once and consumed by GooglePlayButton, the /download page, and schema.org.

const RAW_PLAY_STORE_URL = (
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) ?? ""
).trim();

/** Android application id used on the Play Store listing. */
export const ANDROID_PACKAGE_ID = "com.fitplancoach.app";

/** Live Google Play listing URL, or "" when the app is not yet published. */
export const PLAY_STORE_URL = RAW_PLAY_STORE_URL;

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
export const APP_VERSION = "1.0.1";

/**
 * Display-only mirror of android/app/build.gradle's `versionCode`, which is
 * what Play actually reads from the AAB (Play rejects an upload whose
 * versionCode was already used) — bump both together on each release.
 */
export const ANDROID_VERSION_CODE = 2;
