const { getTrackedLink } = require("./generate_affiliate.cjs");

if (require.main === module) {
  const productUrl = process.argv[2];
  const mlAccountId = process.argv[3] || process.env.ML_ACCOUNT_ID || "1";

  if (!productUrl) {
    process.stderr.write("Use: node scripts/generate_link.cjs <productUrl> [mlAccountId]");
    process.exitCode = 1;
  } else {
    getTrackedLink(productUrl, mlAccountId)
      .then((result) => {
        process.stdout.write(JSON.stringify(result));
      })
      .catch((err) => {
        process.stderr.write(err?.stack || err?.message || String(err));
        process.exitCode = 1;
      });
  }
}

module.exports = { getTrackedLink };
