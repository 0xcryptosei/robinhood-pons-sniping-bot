import type { Address, PublicClient } from "viem";

import type { BuyConfig } from "../config/types.js";
import { ponsCurveAbi } from "../contracts/pons.js";
import { Logger } from "../lib/logger.js";
import { sleep } from "../lib/sleep.js";

export type SnipeTaxWaitResult =
  | { ok: true; snipeTaxBps: bigint }
  | { ok: false; reason: "timeout"; snipeTaxBps: bigint };

export class SnipeTaxGuard {
  private readonly log: Logger;

  constructor(
    private readonly client: PublicClient,
    private readonly config: Pick<BuyConfig, "maxSnipeTaxBps" | "snipeTaxPollMs" | "snipeTaxMaxWaitMs">,
    logger: Logger,
  ) {
    this.log = logger.child("snipe-tax");
  }

  async waitUntilAcceptable(curve: Address, recipient: Address): Promise<SnipeTaxWaitResult> {
    const deadline = Date.now() + this.config.snipeTaxMaxWaitMs;

    while (true) {
      const snipeTaxBps = await this.client.readContract({
        address: curve,
        abi: ponsCurveAbi,
        functionName: "currentSnipeTaxBps",
        args: [recipient],
      });

      if (snipeTaxBps <= BigInt(this.config.maxSnipeTaxBps)) {
        this.log.info(`snipe tax acceptable: ${snipeTaxBps} bps (max ${this.config.maxSnipeTaxBps})`);
        return { ok: true, snipeTaxBps };
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        this.log.warn(`snipe tax still high: ${snipeTaxBps} bps (max ${this.config.maxSnipeTaxBps})`);
        return { ok: false, reason: "timeout", snipeTaxBps };
      }

      this.log.info(`snipe tax ${snipeTaxBps} bps — waiting (max ${this.config.maxSnipeTaxBps} bps)`);
      await sleep(Math.min(this.config.snipeTaxPollMs, remainingMs));
    }
  }
}
