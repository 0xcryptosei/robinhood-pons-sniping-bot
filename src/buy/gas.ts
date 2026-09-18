import { parseGwei } from "viem";

import type { BuyConfig } from "../config/types.js";

export type TxGasParams = {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
};

export function buildTxGasParams(config: BuyConfig): TxGasParams {
  return {
    maxPriorityFeePerGas: parseGwei(config.priorityFeeGwei),
    maxFeePerGas: parseGwei(config.maxFeeGwei),
  };
}
