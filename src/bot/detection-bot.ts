import type { AppConfig } from "../config/types.js";
import { formatLaunch } from "../detector/launch.js";
import { LaunchDetector } from "../detector/launch-detector.js";
import type { PonsLaunch } from "../detector/types.js";
import { Logger } from "../lib/logger.js";
import { createHttpClient } from "../rpc/http-client.js";
import { createWsClient } from "../rpc/ws-client.js";
import { TokenInfoFetcher } from "../token/fetcher.js";
import { formatTokenInfo } from "../token/format.js";

export class DetectionBot {
  private readonly log = new Logger("bot");
  private readonly wsClient;
  private readonly httpClient;
  private readonly tokenInfo: TokenInfoFetcher;
  private readonly detector: LaunchDetector;
  private running = false;

  constructor(private readonly config: AppConfig) {
    this.wsClient = createWsClient(config.wssUrl);
    this.httpClient = createHttpClient(config.httpUrl);
    this.tokenInfo = new TokenInfoFetcher(this.httpClient, this.log);

    this.detector = new LaunchDetector(
      this.wsClient,
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

  private async handleLaunch(launch: PonsLaunch): Promise<void> {
    this.log.child("launch").info(formatLaunch(launch));

    const info = await this.tokenInfo.fetch(launch.token);
    if (info) {
      this.log.child("token").info(formatTokenInfo(launch.token, info));
    }
  }
}
