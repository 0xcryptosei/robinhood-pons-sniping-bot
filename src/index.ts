import process from "process";

import { SnipingBot } from "./bot/sniping-bot.js";
import { loadConfig, validateConfig } from "./config/index.js";
import { rootLogger } from "./lib/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  validateConfig(config);

  const bot = new SnipingBot(config);

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
