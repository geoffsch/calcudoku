// Single source of truth for the app's version number. The UI shows it in the
// footer, and the service worker derives its cache name from it (so bumping the
// version busts the offline cache and installed clients pull the new files).
// package.json's "version" mirrors this — a test keeps the two in step.

export const APP_VERSION = "1.0.0";
