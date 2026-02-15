const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Config plugin to add android:excludeFromRecents="true" to MainActivity
 * This prevents the app from appearing in Android's recent apps list
 * for enhanced privacy.
 */
module.exports = function withExcludeFromRecents(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    const application = manifest.application?.[0];
    if (application?.activity) {
      application.activity.forEach((activity) => {
        if (activity.$["android:name"] === ".MainActivity") {
          activity.$["android:excludeFromRecents"] = "true";
        }
      });
    }

    return config;
  });
};
