import { CurveBuyer } from "../buy/curve-buyer.js";
import { BuyOutcome } from "../buy/types.js";
import type { AppConfig } from "../config/types.js";
import { formatLaunch } from "../detector/launch.js";
import { LaunchDetector } from "../detector/launch-detector.js";
import type { PonsLaunch } from "../detector/types.js";
import { Logger } from "../lib/logger.js";
import { createHttpClient, createWalletClientFromKey, createWsClient } from "../rpc/clients.js";
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
    this.buyer = this.createBuyer();
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

  private createBuyer(): CurveBuyer | null {
    const { buy } = this.config;
    if (!buy.enabled || !buy.privateKey) return null;

    const { wallet, address } = createWalletClientFromKey(this.config.httpUrl, buy.privateKey);
    return new CurveBuyer(this.httpClient, wallet, address, buy, this.log);
  }

  private logStartup(): void {
    this.log.info("starting pons v2 sniping bot");

    if (!this.buyer) {
      this.log.info("buy disabled — detect-only mode");
      return;
    }

    const { buy } = this.config;
    this.log.info(
      `buy wallet=${this.buyer.address} amount=${buy.amountEth} ETH delay=${buy.delayMs}ms maxSnipeTax=${buy.maxSnipeTaxBps}bps slippage=${buy.slippageBps}bps gas=${buy.priorityFeeGwei}/${buy.maxFeeGwei}gwei`,
    );
  }

  private async handleLaunch(launch: PonsLaunch): Promise<void> {
    this.log.child("launch").info(formatLaunch(launch));

    if (!this.buyer) {
      await this.logTokenInfo(launch.token);
      this.detector.release();
      return;
    }

    this.detector.pause();
    await this.logTokenInfo(launch.token);

    const outcome = await this.buyer.buyAfterDelay(launch);

    if (this.shouldResumeDetection(outcome)) {
      this.detector.resume();
      return;
    }

    this.log.warn("buy failed — detection remains paused");
  }

  private async logTokenInfo(token: PonsLaunch["token"]): Promise<void> {
    const info = await this.tokenInfo.fetch(token);
    if (info) {
      this.log.child("token").info(formatTokenInfo(token, info));
    }
  }

  private shouldResumeDetection(outcome: BuyOutcome): boolean {
    if (outcome === BuyOutcome.Success || outcome === BuyOutcome.Skipped) {
      return true;
    }
    return this.config.buy.resumeOnFailure;
  }
}
