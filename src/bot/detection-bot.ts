import type { AppConfig } from "../config/types.js";
import { formatLaunch } from "../detector/launch.js";
import { LaunchDetector } from "../detector/launch-detector.js";
import type { PonsLaunch } from "../detector/types.js";
import { Logger } from "../lib/logger.js";
import { createWsClient } from "../rpc/ws-client.js";

export class DetectionBot {
  private readonly log = new Logger("bot");
  private readonly client;
  private readonly detector: LaunchDetector;
  private running = false;

  constructor(private readonly config: AppConfig) {
    this.client = createWsClient(config.wssUrl);

    this.detector = new LaunchDetector(
      this.client,
      (launch) => this.handleLaunch(launch),
      this.log,
    );
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.log.info("starting pons v2 launch detection");
    await this.detector.start(this.config.backfillBlocks);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.detector.stop();
    this.log.info("stopped");
  }

  private handleLaunch(launch: PonsLaunch): void {
    this.log.child("launch").info(formatLaunch(launch));
  }
}
