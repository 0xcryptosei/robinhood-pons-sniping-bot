import { CurveBuyer } from "../buy/curve-buyer.js";
import { BuyOutcome } from "../buy/types.js";
import type { AppConfig } from "../config/types.js";
import { formatLaunch } from "../detector/launch.js";
import { LaunchDetector } from "../detector/launch-detector.js";
import type { PonsLaunch } from "../detector/types.js";
import { Logger } from "../lib/logger.js";
import { createHttpClient } from "../rpc/http-client.js";
import { createWalletClientFromKey } from "../rpc/wallet-client.js";
import { createWsClient } from "../rpc/ws-client.js";
import { TokenInfoFetcher } from "../token/fetcher.js";
import { formatTokenInfo } from "../token/format.js";

export class SnipingBot {
  private readonly log = new Logger("bot");
  private readonly wsClient;
  private readonly httpClient;
  private readonly tokenInfo: TokenInfoFetcher;
  private readonly buyer: CurveBuyer | null;
  private readonly detector: LaunchDetector;
  private running = false;

  constructor(private readonly config: AppConfig) {
    this.wsClient = createWsClient(config.wssUrl);
    this.httpClient = createHttpClient(config.httpUrl);
    this.tokenInfo = new TokenInfoFetcher(this.httpClient, this.log);

    this.buyer =
      config.buy.enabled && config.buy.privateKey
        ? (() => {
            const { wallet, address } = createWalletClientFromKey(
              config.httpUrl,
              config.buy.privateKey,
            );
            return new CurveBuyer(
              this.httpClient,
              wallet,
              address,
              config.buy,
              this.log,
            );
          })()
        : null;

    this.detector = new LaunchDetector(
      this.wsClient,
      (launch) => this.handleLaunch(launch),
      this.log,
    );
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.logStartup();
    await this.detector.start(this.config.backfillBlocks);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.detector.stop();
    this.log.info("stopped");
  }

  private logStartup(): void {
    this.log.info("starting pons v2 sniping bot");

    if (this.buyer) {
      this.log.info(
        `buy enabled wallet=${this.buyer.address} amount=${this.config.buy.amountEth} ETH delay=${this.config.buy.delayMs}ms maxSnipeTax=${this.config.buy.maxSnipeTaxBps}bps slippage=${this.config.buy.slippageBps}bps gas=${this.config.buy.priorityFeeGwei}/${this.config.buy.maxFeeGwei}gwei`,
      );
      return;
    }

    this.log.info("buy disabled — detect-only mode");
  }

  private async handleLaunch(launch: PonsLaunch): Promise<void> {
    this.log.child("launch").info(formatLaunch(launch));

    if (!this.buyer) {
      const info = await this.tokenInfo.fetch(launch.token);
      if (info) {
        this.log.child("token").info(formatTokenInfo(launch.token, info));
      }
      this.detector.release();
      return;
    }

    // Pause immediately — no new launches while waiting / buying.
    this.detector.pause();

    const info = await this.tokenInfo.fetch(launch.token);
    if (info) {
      this.log.child("token").info(formatTokenInfo(launch.token, info));
    }

    const outcome = await this.buyer.buyAfterDelay(launch);

    if (this.shouldResumeDetection(outcome)) {
      this.detector.resume();
      return;
    }

    this.log.warn("buy failed — detection remains paused");
  }

  private shouldResumeDetection(outcome: BuyOutcome): boolean {
    if (outcome === BuyOutcome.Success || outcome === BuyOutcome.Skipped) {
      return true;
    }

    return this.config.buy.resumeOnFailure;
  }
}
