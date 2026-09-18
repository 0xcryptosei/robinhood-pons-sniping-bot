import { parseEther, type Address, type Hash, type PublicClient, type WalletClient } from "viem";

import { robinhoodChain } from "../chain/robinhood.js";
import type { BuyConfig } from "../config/types.js";
import { NATIVE_PAIR_TOKEN, ponsCurveAbi } from "../contracts/pons.js";
import { getConfirmTimeMs } from "../detector/launch.js";
import type { PonsLaunch } from "../detector/types.js";
import { sleep } from "../lib/sleep.js";
import { Logger } from "../lib/logger.js";
import { BuyOutcome } from "./types.js";

export class CurveBuyer {
  private readonly quoteIn: bigint;
  private readonly log: Logger;

  constructor(
    private readonly publicClient: PublicClient,
    private readonly walletClient: WalletClient,
    private readonly walletAddress: Address,
    private readonly config: BuyConfig,
    logger: Logger,
  ) {
    this.quoteIn = parseEther(config.amountEth);
    this.log = logger.child("buy");
  }

  get address(): Address {
    return this.walletAddress;
  }

  async buyAfterDelay(launch: PonsLaunch): Promise<BuyOutcome> {
    const skipReason = this.getSkipReason(launch);
    if (skipReason) {
      this.log.warn(`skip ${launch.token}: ${skipReason}`);
      return BuyOutcome.Skipped;
    }

    const confirmMs = getConfirmTimeMs(launch)!;
    const targetMs = confirmMs + this.config.delayMs;
    const waitMs = Math.max(0, targetMs - Date.now());

    this.log.info(
      `waiting ${waitMs}ms token=${launch.token} curve=${launch.curve} amount=${this.config.amountEth} ETH`,
    );

    await sleep(waitMs);
    return this.executeBuy(launch);
  }

  private getSkipReason(launch: PonsLaunch): string | null {
    if (launch.blockTimestamp === null) {
      return "missing blockTimestamp";
    }

    if (launch.pairToken.toLowerCase() !== NATIVE_PAIR_TOKEN) {
      return "only native ETH pairs are supported";
    }

    return null;
  }

  private async executeBuy(launch: PonsLaunch): Promise<BuyOutcome> {
    const startedAt = Date.now();

    try {
      this.log.info(`submitting token=${launch.token} curve=${launch.curve}`);

      const hash: Hash = await this.walletClient.writeContract({
        chain: robinhoodChain,
        account: this.walletAddress,
        address: launch.curve,
        abi: ponsCurveAbi,
        functionName: "buy",
        args: [this.quoteIn, 0n, this.walletAddress],
        value: this.quoteIn,
      });

      this.log.info(`submitted token=${launch.token} tx=${hash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const elapsedMs = Date.now() - startedAt;

      if (receipt.status === "success") {
        this.log.info(
          `confirmed token=${launch.token} tx=${hash} elapsed=${elapsedMs}ms block=${receipt.blockNumber}`,
        );
        return BuyOutcome.Success;
      }

      this.log.error(`reverted token=${launch.token} tx=${hash} elapsed=${elapsedMs}ms`);
      return BuyOutcome.Failed;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      this.log.error(`failed token=${launch.token} elapsed=${elapsedMs}ms`, error);
      return BuyOutcome.Failed;
    }
  }
}
