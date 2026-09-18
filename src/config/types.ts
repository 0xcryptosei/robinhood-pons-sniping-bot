import type { Hex } from "viem";

export type BuyConfig = {
  enabled: boolean;
  privateKey: Hex | null;
  amountEth: string;
  delayMs: number;
  resumeOnFailure: boolean;
};

export type AppConfig = {
  wssUrl: string;
  httpUrl: string;
  backfillBlocks: bigint;
  buy: BuyConfig;
};
