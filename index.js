const FALLBACK_REPOSITORY_URL = "https://github.com/hardlineprivacy/hardlineprivacy";

// Ensure REPOSITORY_URL is populated before other plugins load.
if (!process.env.REPOSITORY_URL || process.env.REPOSITORY_URL.trim() === "") {
  process.env.REPOSITORY_URL = FALLBACK_REPOSITORY_URL;
}

module.exports = {};
