import type { Address, PublicClient } from "viem";

import { ponsCurveAbi } from "../contracts/pons.js";
import { sleep } from "../lib/sleep.js";
import { Logger } from "../lib/logger.js";

export type SnipeTaxConfig = {
  maxSnipeTaxBps: number;
  pollIntervalMs: number;
  maxWaitMs: number;
};

export type SnipeTaxWaitResult =
  | { ok: true; snipeTaxBps: bigint }
  | { ok: false; reason: "timeout"; snipeTaxBps: bigint };

export class SnipeTaxGuard {
  private readonly log: Logger;

  constructor(
    private readonly client: PublicClient,
    private readonly config: SnipeTaxConfig,
    logger: Logger,
  ) {
    this.log = logger.child("snipe-tax");
  }

  async readSnipeTaxBps(curve: Address, recipient: Address): Promise<bigint> {
    return this.client.readContract({
      address: curve,
      abi: ponsCurveAbi,
      functionName: "currentSnipeTaxBps",
      args: [recipient],
    });
  }

  /** Poll until snipe tax is at or below maxSnipeTaxBps, or maxWaitMs elapses. */
  async waitUntilAcceptable(curve: Address, recipient: Address): Promise<SnipeTaxWaitResult> {
    const deadline = Date.now() + this.config.maxWaitMs;

    while (true) {
      const snipeTaxBps = await this.readSnipeTaxBps(curve, recipient);

      if (snipeTaxBps <= BigInt(this.config.maxSnipeTaxBps)) {
        this.log.info(`snipe tax acceptable: ${snipeTaxBps} bps (max ${this.config.maxSnipeTaxBps})`);
        return { ok: true, snipeTaxBps };
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        this.log.warn(
          `snipe tax still high after wait: ${snipeTaxBps} bps (max ${this.config.maxSnipeTaxBps})`,
        );
        return { ok: false, reason: "timeout", snipeTaxBps };
      }

      this.log.info(`snipe tax ${snipeTaxBps} bps — waiting (max ${this.config.maxSnipeTaxBps} bps)`);
      await sleep(Math.min(this.config.pollIntervalMs, remainingMs));
    }
  }
}
