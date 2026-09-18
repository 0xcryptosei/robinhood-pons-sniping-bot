import { parseGwei, type Address, type PublicClient } from "viem";

import type { BuyConfig } from "../config/types.js";
import { ponsCurveAbi } from "../contracts/pons.js";

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

export async function quoteCurveBuy(
  client: PublicClient,
  curve: Address,
  recipient: Address,
  quoteIn: bigint,
): Promise<bigint> {
  const { result } = await client.simulateContract({
    account: recipient,
    address: curve,
    abi: ponsCurveAbi,
    functionName: "buy",
    args: [quoteIn, 0n, recipient],
    value: quoteIn,
  });

  return result;
}

export function applySlippage(expectedOut: bigint, slippageBps: number): bigint {
  return (expectedOut * BigInt(10_000 - slippageBps)) / 10_000n;
}
