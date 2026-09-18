import type { Hex } from "viem";

export type BuyConfig = {
  enabled: boolean;
  privateKey: Hex | null;
  amountEth: string;
  delayMs: number;
  resumeOnFailure: boolean;
  /** Max acceptable snipe tax in basis points (100 = 1%). */
  maxSnipeTaxBps: number;
  snipeTaxPollMs: number;
  snipeTaxMaxWaitMs: number;
  slippageBps: number;
  priorityFeeGwei: string;
  maxFeeGwei: string;
};

export type AppConfig = {
  wssUrl: string;
  httpUrl: string;
  backfillBlocks: bigint;
  buy: BuyConfig;
};
