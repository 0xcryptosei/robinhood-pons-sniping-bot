import type { Address, PublicClient } from "viem";

import { ponsCurveAbi } from "../contracts/pons.js";

/** Simulate curve.buy to estimate tokensOut at current pool state. */
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
  const factor = 10_000 - slippageBps;
  return (expectedOut * BigInt(factor)) / 10_000n;
}
