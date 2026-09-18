import type { PublicClient } from "viem";

import { PONS_V2_FACTORY, ponsFactoryAbi } from "../contracts/pons.js";
import { Logger } from "../lib/logger.js";
import { launchKey, parseLaunchFromLog, type TokenLaunchedLog } from "./launch.js";
import type { PonsLaunch } from "./types.js";

export type LaunchHandler = (launch: PonsLaunch) => void | Promise<void>;

export class LaunchDetector {
  private readonly seen = new Set<string>();
  private unwatch: (() => void) | null = null;
  private readonly log: Logger;

  constructor(
    private readonly client: PublicClient,
    private readonly onLaunch: LaunchHandler,
    logger: Logger,
  ) {
    this.log = logger.child("detector");
  }

  async start(backfillBlocks: bigint): Promise<void> {
    if (backfillBlocks > 0n) {
      await this.backfill(backfillBlocks);
    } else {
      this.log.info("skipping backfill (BACKFILL_BLOCKS=0)");
    }

    this.subscribe();
  }

  stop(): void {
    this.unsubscribe();
  }

  private subscribe(): void {
    this.log.info(`watching TokenLaunched on ${PONS_V2_FACTORY}`);

    this.unwatch = this.client.watchContractEvent({
      address: PONS_V2_FACTORY,
      abi: ponsFactoryAbi,
      eventName: "TokenLaunched",
      onLogs: (logs) => {
        void Promise.all(logs.map((log) => this.handleLog(log)));
      },
      onError: (error) => {
        this.log.error("subscription error", error);
      },
    });
  }

  private unsubscribe(): void {
    this.unwatch?.();
    this.unwatch = null;
  }

  private async handleLog(log: TokenLaunchedLog): Promise<void> {
    const launch = parseLaunchFromLog(log);
    if (!launch) return;

    const key = launchKey(launch);
    if (this.seen.has(key)) return;

    this.seen.add(key);

    try {
      await this.onLaunch(launch);
    } catch (error) {
      this.log.error("launch handler failed", error);
    }
  }

  private async backfill(blocks: bigint): Promise<void> {
    const latest = await this.client.getBlockNumber();
    const fromBlock = latest > blocks ? latest - blocks : 0n;

    this.log.info(`backfilling blocks ${fromBlock} → ${latest}`);

    try {
      const logs = await this.client.getContractEvents({
        address: PONS_V2_FACTORY,
        abi: ponsFactoryAbi,
        eventName: "TokenLaunched",
        fromBlock,
        toBlock: latest,
      });

      for (const log of logs) {
        await this.handleLog(log);
      }

      this.log.info(`backfill complete (${logs.length} events)`);
    } catch (error) {
      this.log.warn(`backfill failed, using live stream only: ${this.formatError(error)}`);
    }
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
