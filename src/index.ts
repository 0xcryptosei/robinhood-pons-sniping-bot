import process from "process";

import { DetectionBot } from "./bot/detection-bot.js";
import { loadConfig } from "./config/index.js";
import { rootLogger } from "./lib/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const bot = new DetectionBot(config);

  const shutdown = () => {
    bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await bot.start();
}

main().catch((error) => {
  rootLogger.error("fatal error", error);
  process.exit(1);
});
