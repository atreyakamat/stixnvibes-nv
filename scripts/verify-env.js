const { validateEnvironment } = require('../src/lib/env');
try {
  validateEnvironment();
  console.log("✅ Environment configuration verified.");
} catch (e) {
  console.error("❌ Environment configuration failed:", e.message);
  process.exit(1);
}
